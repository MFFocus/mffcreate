"""
Educational Video Downloader & Ingest Service.
Supports YouTube, Vimeo, direct MP4/WebM URLs, and local file uploads.
Fully compliant with copyright and platform guidelines. No DRM or paywall bypass.
Uses bundled FFmpeg for seamless format merging.
Zero personal cookies or user credentials required.
"""

import os
import re
import time
import shutil
import hashlib
import logging
from urllib.parse import urlparse, parse_qs, urlencode
from pathlib import Path
from typing import Dict, Any, Optional
import yt_dlp

from services.media_processor import get_ffmpeg_executable

logger = logging.getLogger(__name__)

# Maximum video duration allowed for public web service (2.5 hours = 9000 seconds)
MAX_VIDEO_DURATION_SEC = 9000

PIPELINE_VERSION = "v2"


# =====================================================================
# Domain Exceptions & Error Classification
# =====================================================================

class MediaAcquisitionError(Exception):
    """Base exception for media acquisition failures."""
    def __init__(self, message: str, error_code: str = "DOWNLOAD_FAILED", user_message: Optional[str] = None):
        super().__init__(message)
        self.error_code = error_code
        self.user_message = user_message or "We couldn't finish downloading this video. Please try another educational video."

class YouTubeBotCheckError(MediaAcquisitionError):
    def __init__(self, message: str = "YouTube bot detection triggered"):
        super().__init__(
            message,
            error_code="YOUTUBE_BOT_CHECK",
            user_message="YouTube is temporarily limiting automated access to this video. Please try another public educational video or try again later."
        )

class VideoPrivateError(MediaAcquisitionError):
    def __init__(self, message: str = "Video is private"):
        super().__init__(
            message,
            error_code="VIDEO_PRIVATE",
            user_message="This video is set to private on YouTube and cannot be analyzed."
        )

class VideoUnavailableError(MediaAcquisitionError):
    def __init__(self, message: str = "Video is unavailable"):
        super().__init__(
            message,
            error_code="VIDEO_UNAVAILABLE",
            user_message="This video is unavailable or no longer exists on YouTube."
        )

class VideoAgeRestrictedError(MediaAcquisitionError):
    def __init__(self, message: str = "Video is age-restricted"):
        super().__init__(
            message,
            error_code="VIDEO_AGE_RESTRICTED",
            user_message="This video is age-restricted on YouTube and requires account authentication."
        )

class VideoRegionRestrictedError(MediaAcquisitionError):
    def __init__(self, message: str = "Video is region-restricted"):
        super().__init__(
            message,
            error_code="VIDEO_REGION_RESTRICTED",
            user_message="This video is region-restricted on YouTube and cannot be accessed from this server location."
        )

class VideoDurationLimitError(MediaAcquisitionError):
    def __init__(self, curr_hrs: float, max_hrs: float):
        super().__init__(
            f"Video duration ({curr_hrs} hours) exceeds limit ({max_hrs} hours)",
            error_code="DURATION_EXCEEDED",
            user_message=f"This video is {curr_hrs} hours long, which exceeds the maximum limit of {max_hrs} hours for public processing."
        )


def classify_yt_error(err_str: str) -> MediaAcquisitionError:
    """
    Inspects raw yt-dlp error output and maps to a classified domain exception
    with machine-readable error codes and consumer-friendly messaging.
    """
    lower = err_str.lower()
    if (
        "sign in to confirm you’re not a bot" in lower
        or "sign in to confirm you're not a bot" in lower
        or "confirm you’re not a bot" in lower
        or "confirm you're not a bot" in lower
        or "bot verification" in lower
        or "use --cookies" in lower
        or "failed to extract any player response" in lower
        or "all player responses are invalid" in lower
        or "ip is likely being blocked" in lower
        or "unable to download api page" in lower
        or "unable to download initial data" in lower
    ):
        return YouTubeBotCheckError(err_str)
    elif "private video" in lower or "this video is private" in lower:
        return VideoPrivateError(err_str)
    elif "video unavailable" in lower or "does not exist" in lower or "has been removed" in lower or "this video is unavailable" in lower:
        return VideoUnavailableError(err_str)
    elif "sign in to confirm your age" in lower or "age-restricted" in lower or "inappropriate for some users" in lower:
        return VideoAgeRestrictedError(err_str)
    elif "not available in your country" in lower or "blocked in your country" in lower or "geo restricted" in lower or "region" in lower:
        return VideoRegionRestrictedError(err_str)
    else:
        return MediaAcquisitionError(err_str, error_code="DOWNLOAD_FAILED")


# =====================================================================
# Canonical ID & Versioned Cache Key
# =====================================================================

def extract_canonical_id(url: str) -> str:
    """
    Extracts a canonical identifier from video URLs to enable instant deduplication and caching.
    For YouTube, extracts the unique 11-character video ID.
    For other URLs, strips tracking/timestamp query parameters and produces a stable hash.
    """
    if not url or not isinstance(url, str):
        return ""
    
    clean_url = url.strip()
    
    # 1. Check for YouTube Video ID
    yt_patterns = [
        r'(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})',
        r'(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})',
    ]
    for pattern in yt_patterns:
        match = re.search(pattern, clean_url)
        if match:
            return f"yt:{match.group(1)}"
            
    # 2. General URL canonicalization
    try:
        parsed = urlparse(clean_url)
        query_params = parse_qs(parsed.query)
        # Strip tracking and timestamp parameters
        strip_keys = {'t', 'time_continue', 'start', 'end', 'si', 'feature', 'fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'ref'}
        filtered_params = {k: v for k, v in query_params.items() if k.lower() not in strip_keys}
        canonical_query = urlencode(filtered_params, doseq=True)
        canonical_url = f"{parsed.scheme.lower()}://{parsed.netloc.lower()}{parsed.path}"
        if canonical_query:
            canonical_url += f"?{canonical_query}"
        return f"hash:{hashlib.sha256(canonical_url.encode('utf-8')).hexdigest()[:16]}"
    except Exception:
        return f"hash:{hashlib.sha256(clean_url.encode('utf-8')).hexdigest()[:16]}"


def get_cache_key(url: str, whisper_model: str = "base", llm_model: Optional[str] = None) -> str:
    """
    Computes a deterministic, versioned cache key incorporating:
    - Canonical video identifier (YouTube ID or normalized URL hash)
    - Multimodal pipeline version
    - Selected speech model & LLM model configuration
    Ensures that when analysis pipeline changes, stale results are never returned.
    """
    canonical_id = extract_canonical_id(url)
    if not canonical_id:
        return ""
    llm_part = (llm_model or "heuristic").strip().lower()
    whisper_part = (whisper_model or "base").strip().lower()
    return f"{canonical_id}:{PIPELINE_VERSION}:{whisper_part}:{llm_part}"


# =====================================================================
# Downloader Service
# =====================================================================

class MediaDownloader:
    def __init__(self, storage_dir: Path):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.ffmpeg_exe = get_ffmpeg_executable()

    def _extract_with_fallback(self, base_opts: Dict[str, Any], url: str, download: bool = False) -> Dict[str, Any]:
        """
        Executes yt-dlp using a conservative, bounded fallback strategy:
        1. Primary: Default supported yt-dlp extraction configuration.
           Preserves standard webpage, configs, visitor data, and official default clients (visionos, web).
        2. Secondary: If primary extraction encounters a player response or access challenge,
           attempts a bounded multi-client fallback ('tv_downgraded', 'android', 'web')
           WITHOUT skipping webpage or configs.
        Never loops infinitely; retries and network timeouts are strictly bounded.
        """
        opts1 = dict(base_opts)
        try:
            with yt_dlp.YoutubeDL(opts1) as ydl:
                return ydl.extract_info(url, download=download)
        except Exception as e1:
            err_str1 = str(e1)
            # Unrecoverable errors: do not retry fallback
            if (
                "exceeds limit" in err_str1
                or "private video" in err_str1.lower()
                or "video unavailable" in err_str1.lower()
                or "does not exist" in err_str1.lower()
                or "has been removed" in err_str1.lower()
            ):
                raise

            logger.info(f"Primary yt-dlp extraction notice ({err_str1}). Trying bounded multi-client fallback...")

            opts2 = dict(base_opts)
            opts2['extractor_args'] = {
                'youtube': {
                    'player_client': ['tv_downgraded', 'android', 'web'],
                }
            }
            try:
                with yt_dlp.YoutubeDL(opts2) as ydl:
                    return ydl.extract_info(url, download=download)
            except Exception as e2:
                logger.warning(f"Fallback extraction also encountered issue: {e2}")
                raise e2

    def extract_captions(self, url: str, project_id: str) -> Dict[str, Any]:
        """
        Legitimately extracts publicly available manual subtitles or auto-captions
        without downloading the heavy binary video stream.
        Used as a resilient fallback when YouTube blocks video stream access on datacenter IPs.
        """
        start_time = time.time()
        proj_dir = self.storage_dir / project_id
        proj_dir.mkdir(parents=True, exist_ok=True)

        info_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'nocheckcertificate': True,
            'socket_timeout': 25,
            'retries': 2,
        }

        info = self._extract_with_fallback(info_opts, url, download=False)
        title = info.get('title', 'Educational Lecture')
        duration = float(info.get('duration', 0.0) or 0.0)
        uploader = info.get('uploader', 'Instructor')
        description = info.get('description', '')

        if duration > MAX_VIDEO_DURATION_SEC:
            max_hrs = MAX_VIDEO_DURATION_SEC / 3600
            curr_hrs = round(duration / 3600, 1)
            raise VideoDurationLimitError(curr_hrs, max_hrs)

        manual_subs = info.get('subtitles') or {}
        auto_subs = info.get('automatic_captions') or {}

        if not manual_subs and not auto_subs:
            raise MediaAcquisitionError(
                "No public subtitles or captions available for this video.",
                error_code="YOUTUBE_BOT_CHECK"
            )

        # Candidate language selection strategy:
        # 1. English manual subtitles ('en', 'en-US', etc.)
        # 2. Any manual subtitles
        # 3. Original auto-caption ('-orig' suffix)
        # 4. English auto-caption ('en')
        # 5. Any auto-caption
        chosen_track = None
        chosen_lang = None

        for lang_code, formats in manual_subs.items():
            if lang_code.lower().startswith('en'):
                chosen_track = formats
                chosen_lang = lang_code
                break
        if not chosen_track and manual_subs:
            chosen_lang = next(iter(manual_subs))
            chosen_track = manual_subs[chosen_lang]

        if not chosen_track:
            orig_key = next((k for k in auto_subs if 'orig' in k.lower()), None)
            if orig_key:
                chosen_track = auto_subs[orig_key]
                chosen_lang = orig_key
            elif 'en' in auto_subs:
                chosen_track = auto_subs['en']
                chosen_lang = 'en'
            elif auto_subs:
                chosen_lang = next(iter(auto_subs))
                chosen_track = auto_subs[chosen_lang]

        if not chosen_track:
            raise MediaAcquisitionError(
                "Could not identify a viable caption track.",
                error_code="YOUTUBE_BOT_CHECK"
            )

        # Prioritize WebVTT format for seamless parsing
        format_order = ['vtt', 'srt', 'srv3', 'ttml', 'json3']
        selected_fmt = None
        for fmt in format_order:
            cand = next((f for f in chosen_track if f.get('ext') == fmt), None)
            if cand and cand.get('url'):
                selected_fmt = cand
                break

        if not selected_fmt:
            selected_fmt = chosen_track[0] if chosen_track and chosen_track[0].get('url') else None

        if not selected_fmt or not selected_fmt.get('url'):
            raise MediaAcquisitionError(
                "No valid download URL found for captions.",
                error_code="YOUTUBE_BOT_CHECK"
            )

        sub_url = selected_fmt['url']
        sub_ext = selected_fmt.get('ext', 'vtt')
        dest_file = proj_dir / f"caption.{sub_ext}"

        import urllib.request
        req = urllib.request.Request(
            sub_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = resp.read()

        if len(data) == 0:
            raise MediaAcquisitionError(
                "Downloaded caption content was empty.",
                error_code="YOUTUBE_BOT_CHECK"
            )

        with open(dest_file, "wb") as f:
            f.write(data)

        download_sec = round(time.time() - start_time, 2)
        logger.info(f"Legitimate caption fallback downloaded ({len(data)} bytes, lang: {chosen_lang}) in {download_sec}s")

        return {
            "title": title,
            "duration": duration,
            "uploader": uploader,
            "description": description[:500] if description else "",
            "video_path": None,
            "subtitle_path": str(dest_file),
            "has_video": False,
            "media_status": "captions_only",
            "notice": "Video stream could not be acquired; complete study workspace generated from verified lecture captions.",
            "download_sec": download_sec
        }

    def download_url(self, url: str, project_id: str, progress_callback=None) -> Dict[str, Any]:
        """
        Downloads video and audio for educational processing using yt-dlp.
        Downloads at standard/medium resolution (<=480p) to optimize CPU/RAM/bandwidth.
        Uses a conservative fallback strategy without requiring personal cookies or credentials.
        Provides safe caption-only fallback if video streaming is restricted by YouTube.
        """
        start_time = time.time()
        proj_dir = self.storage_dir / project_id
        proj_dir.mkdir(parents=True, exist_ok=True)

        video_out = str(proj_dir / "video.%(ext)s")

        def hook(d):
            if d['status'] == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                downloaded = d.get('downloaded_bytes') or 0
                if total > 0 and progress_callback:
                    pct = int(downloaded / total * 100)
                    progress_callback(pct)

        # Pre-check duration without full download using the same reliable extraction configuration
        info_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'nocheckcertificate': True,
            'socket_timeout': 20,
            'retries': 2,
        }
        try:
            pre_info = self._extract_with_fallback(info_opts, url, download=False)
            if pre_info:
                vid_duration = float(pre_info.get('duration', 0.0) or 0.0)
                if vid_duration > MAX_VIDEO_DURATION_SEC:
                    max_hrs = MAX_VIDEO_DURATION_SEC / 3600
                    curr_hrs = round(vid_duration / 3600, 1)
                    raise VideoDurationLimitError(curr_hrs, max_hrs)
        except VideoDurationLimitError:
            raise
        except Exception as e:
            logger.warning(f"Duration pre-check notice (will verify during acquisition): {e}")

        # Main download configuration with conservative format selection
        ydl_opts = {
            # Prefer 480p or 360p progressive stream (format 18) for maximum stability
            'format': 'best[height<=480]/18/bestvideo[height<=480]+bestaudio/best',
            'outtmpl': video_out,
            'merge_output_format': 'mp4',
            'ffmpeg_location': self.ffmpeg_exe,
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'progress_hooks': [hook] if progress_callback else [],
            'noplaylist': True,
            'socket_timeout': 20,
            'retries': 2,
            'fragment_retries': 2,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en.*', 'all', '-live_chat'],
        }

        try:
            info = self._extract_with_fallback(ydl_opts, url, download=True)
            title = info.get('title', 'Educational Lecture')
            duration = float(info.get('duration', 0.0) or 0.0)
            uploader = info.get('uploader', 'Instructor')
            description = info.get('description', '')

            if duration > MAX_VIDEO_DURATION_SEC:
                max_hrs = MAX_VIDEO_DURATION_SEC / 3600
                curr_hrs = round(duration / 3600, 1)
                raise VideoDurationLimitError(curr_hrs, max_hrs)

            # Find the downloaded video file
            downloaded_file = None
            for ext in ['mp4', 'mkv', 'webm']:
                candidate = proj_dir / f"video.{ext}"
                if candidate.exists():
                    downloaded_file = str(candidate)
                    break

            if not downloaded_file:
                files = list(proj_dir.glob("video.*"))
                if files:
                    downloaded_file = str(files[0])

            if not downloaded_file:
                raise FileNotFoundError("Downloaded media file not found on disk.")

            # Check for downloaded subtitles
            subtitle_file = None
            vtt_files = list(proj_dir.glob("*.vtt"))
            if vtt_files:
                subtitle_file = str(vtt_files[0])

            download_sec = round(time.time() - start_time, 2)

            return {
                "title": title,
                "duration": duration,
                "uploader": uploader,
                "description": description[:500] if description else "",
                "video_path": downloaded_file,
                "subtitle_path": subtitle_file,
                "has_video": True,
                "media_status": "video_available",
                "download_sec": download_sec
            }

        except VideoDurationLimitError:
            raise
        except Exception as e:
            err_str = str(e)
            classified = classify_yt_error(err_str)

            # If the failure is unrecoverable (private, non-existent, age restricted, geo-restricted, duration exceeded), abort immediately
            if classified.error_code in ("VIDEO_PRIVATE", "VIDEO_UNAVAILABLE", "VIDEO_AGE_RESTRICTED", "VIDEO_REGION_RESTRICTED", "DURATION_EXCEEDED"):
                logger.error(f"Unrecoverable YouTube error [{classified.error_code}]: {classified}")
                raise classified

            logger.warning(f"Full video download encountered issue ({err_str}). Attempting legitimate caption fallback...")

            # SAFE CAPTION-ONLY FALLBACK:
            try:
                cap_res = self.extract_captions(url, project_id)
                if cap_res and cap_res.get("subtitle_path"):
                    logger.info(f"Safe caption fallback successful: {cap_res.get('subtitle_path')}")
                    return cap_res
            except VideoDurationLimitError:
                raise
            except Exception as cap_err:
                logger.warning(f"Caption fallback was not available: {cap_err}")

            # If both video download and caption fallback failed, raise classified error
            logger.error(f"Classified YouTube acquisition error [{classified.error_code}]: {classified}")
            raise classified

    def ingest_local_file(self, temp_file_path: str, filename: str, project_id: str) -> Dict[str, Any]:
        """
        Ingests a user-uploaded lecture video or audio file.
        """
        proj_dir = self.storage_dir / project_id
        proj_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(filename).suffix.lower() or ".mp4"
        dest_path = proj_dir / f"video{ext}"
        shutil.copy2(temp_file_path, dest_path)

        title = Path(filename).stem.replace("_", " ").replace("-", " ").title()

        return {
            "title": title,
            "duration": 0.0,
            "uploader": "Local User",
            "description": "User uploaded lecture file",
            "video_path": str(dest_path),
            "has_video": True,
        }
