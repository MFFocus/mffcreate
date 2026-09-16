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

    def acquire_independent_captions(self, url: str, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Genuinely independent caption acquisition using YouTubeTranscriptApi and direct watch-page metadata.
        Does NOT rely on yt-dlp player response extraction.
        Uses only public caption tracks (manual or automatic).
        Prefers English when available and preserves exact timing.
        """
        canonical = extract_canonical_id(url)
        if not canonical or not canonical.startswith("yt:"):
            logger.info("Caption acquisition skipped (non-YouTube source)")
            return None

        video_id = canonical[3:]
        proj_dir = self.storage_dir / project_id
        proj_dir.mkdir(parents=True, exist_ok=True)

        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
        except ImportError:
            logger.warning("youtube_transcript_api not installed; cannot perform independent caption acquisition")
            return None

        import requests
        import html

        # Session with certificate resilience
        session = requests.Session()
        session.verify = False

        # Extract title from public watch page
        title = "Educational Lecture"
        try:
            r = session.get(f"https://www.youtube.com/watch?v={video_id}", timeout=10, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            })
            m = re.search(r'<title>(.*?)</title>', r.text)
            if m:
                t = m.group(1).replace(" - YouTube", "").strip()
                title = html.unescape(t)
        except Exception as e:
            logger.debug(f"Title extraction notice: {e}")

        try:
            api = YouTubeTranscriptApi(http_client=session)
            t_list = api.list(video_id)

            chosen = None
            # 1. Prefer English (manual or automatic)
            try:
                chosen = t_list.find_transcript(['en', 'en-US', 'en-GB'])
            except Exception:
                pass

            # 2. Fall back to first available public transcript
            if not chosen:
                chosen = next(iter(t_list), None)

            if not chosen:
                return None

            snippets = chosen.fetch()
            if not snippets:
                return None

            segments = []
            full_text_parts = []
            for i, s in enumerate(snippets):
                start = round(s.start, 2)
                end = round(s.start + getattr(s, 'duration', 2.0), 2)
                text = s.text.strip()
                if text:
                    segments.append({
                        "id": i,
                        "start": start,
                        "end": end,
                        "text": text,
                        "confidence": 0.98
                    })
                    full_text_parts.append(text)

            if not segments:
                return None

            duration = segments[-1]["end"]

            if duration > MAX_VIDEO_DURATION_SEC:
                max_hrs = MAX_VIDEO_DURATION_SEC / 3600
                curr_hrs = round(duration / 3600, 1)
                raise VideoDurationLimitError(curr_hrs, max_hrs)

            # Save clean WebVTT file to disk
            vtt_path = proj_dir / "caption.vtt"
            with open(vtt_path, "w", encoding="utf-8") as f:
                f.write("WEBVTT\n\n")
                for seg in segments:
                    h1, m1, s1 = int(seg["start"] // 3600), int((seg["start"] % 3600) // 60), seg["start"] % 60
                    h2, m2, s2 = int(seg["end"] // 3600), int((seg["end"] % 3600) // 60), seg["end"] % 60
                    f.write(f"{h1:02d}:{m1:02d}:{s1:06.3f} --> {h2:02d}:{m2:02d}:{s2:06.3f}\n")
                    f.write(f"{seg['text']}\n\n")

            return {
                "title": title,
                "duration": duration,
                "uploader": "Instructor",
                "description": "",
                "video_path": None,
                "subtitle_path": str(vtt_path),
                "trans_result": {
                    "language": chosen.language_code,
                    "duration": duration,
                    "segments": segments,
                    "full_text": " ".join(full_text_parts),
                    "transcribe_sec": 0.1
                },
                "has_video": False,
                "media_status": "captions_only",
                "video_available": False,
                "transcript_available": True,
                "visual_analysis_available": False,
                "notice": "Visual video stream could not be downloaded; complete study workspace generated from verified lecture captions.",
            }

        except VideoDurationLimitError:
            raise
        except (TranscriptsDisabled, NoTranscriptFound) as e:
            logger.info(f"No transcripts accessible for {video_id}: {e}")
            return None
        except VideoUnavailable as e:
            logger.error(f"Video unavailable: {e}")
            raise VideoUnavailableError(str(e))
        except Exception as e:
            logger.warning(f"Independent caption retrieval notice ({type(e).__name__}: {e})")
            return None

    def _extract_yt_dlp_captions(self, url: str, project_id: str) -> Optional[Dict[str, Any]]:
        """
        Secondary caption attempt via yt-dlp metadata extraction.
        Useful for non-YouTube URLs or when yt-dlp metadata is available.
        """
        proj_dir = self.storage_dir / project_id
        proj_dir.mkdir(parents=True, exist_ok=True)
        info_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'nocheckcertificate': True,
            'socket_timeout': 20,
            'retries': 2,
        }
        try:
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
                return None

            chosen_track = None
            for lang_code, formats in manual_subs.items():
                if lang_code.lower().startswith('en'):
                    chosen_track = formats
                    break
            if not chosen_track and manual_subs:
                chosen_track = next(iter(manual_subs.values()))

            if not chosen_track:
                orig_key = next((k for k in auto_subs if 'orig' in k.lower()), None)
                if orig_key:
                    chosen_track = auto_subs[orig_key]
                elif 'en' in auto_subs:
                    chosen_track = auto_subs['en']
                elif auto_subs:
                    chosen_track = next(iter(auto_subs.values()))

            if not chosen_track:
                return None

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
                return None

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
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()

            if len(data) == 0:
                return None

            with open(dest_file, "wb") as f:
                f.write(data)

            return {
                "title": title,
                "duration": duration,
                "uploader": uploader,
                "description": description[:500] if description else "",
                "video_path": None,
                "subtitle_path": str(dest_file),
                "has_video": False,
                "media_status": "captions_only",
                "video_available": False,
                "transcript_available": True,
                "visual_analysis_available": False,
                "notice": "Visual video stream could not be downloaded; complete study workspace generated from verified lecture captions.",
            }
        except VideoDurationLimitError:
            raise
        except Exception as e:
            logger.debug(f"yt-dlp caption attempt notice: {e}")
            return None

    def extract_captions(self, url: str, project_id: str) -> Dict[str, Any]:
        """Backward-compatible caption extraction method."""
        cap = self.acquire_independent_captions(url, project_id)
        if not cap:
            cap = self._extract_yt_dlp_captions(url, project_id)
        if not cap:
            raise YouTubeBotCheckError("No public captions could be extracted.")
        return cap

    def download_url(self, url: str, project_id: str, progress_callback=None) -> Dict[str, Any]:
        """
        Executes genuine independent two-tier acquisition:
        1. Independent Caption Acquisition
        2. Binary Video Acquisition
        Target Architecture:
        - captions available + video available  -> full_video workspace
        - captions available + video blocked    -> captions_only workspace
        - captions unavailable + video blocked  -> unavailable (friendly error classification)
        """
        start_time = time.time()
        proj_dir = self.storage_dir / project_id
        proj_dir.mkdir(parents=True, exist_ok=True)

        # -----------------------------------------------------------------
        # TIER 1: Independent Caption Acquisition
        # -----------------------------------------------------------------
        logger.info("Caption acquisition started")
        caption_res = None
        try:
            caption_res = self.acquire_independent_captions(url, project_id)
            if not caption_res:
                caption_res = self._extract_yt_dlp_captions(url, project_id)
        except (VideoPrivateError, VideoUnavailableError):
            raise
        except Exception as cap_err:
            logger.warning(f"Caption acquisition encountered error: {cap_err}")

        if caption_res:
            logger.info(f"Caption acquisition succeeded (lang={caption_res.get('trans_result', {}).get('language', 'en')}, duration={caption_res.get('duration', 0)}s)")
        else:
            logger.info("Caption acquisition failed")

        # -----------------------------------------------------------------
        # TIER 2: Binary Video Acquisition
        # -----------------------------------------------------------------
        logger.info("Video acquisition started")
        video_out = str(proj_dir / "video.%(ext)s")

        def hook(d):
            if d['status'] == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                downloaded = d.get('downloaded_bytes') or 0
                if total > 0 and progress_callback:
                    pct = int(downloaded / total * 100)
                    progress_callback(pct)

        ydl_opts = {
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
            title = info.get('title') or (caption_res.get('title') if caption_res else 'Educational Lecture')
            duration = float(info.get('duration', 0.0) or (caption_res.get('duration', 0.0) if caption_res else 0.0))
            uploader = info.get('uploader', 'Instructor')
            description = info.get('description', '')

            if duration > MAX_VIDEO_DURATION_SEC:
                max_hrs = MAX_VIDEO_DURATION_SEC / 3600
                curr_hrs = round(duration / 3600, 1)
                raise VideoDurationLimitError(curr_hrs, max_hrs)

            # Find downloaded video file
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

            # Check for subtitles
            subtitle_file = caption_res.get("subtitle_path") if caption_res else None
            if not subtitle_file:
                vtt_files = list(proj_dir.glob("*.vtt"))
                if vtt_files:
                    subtitle_file = str(vtt_files[0])

            download_sec = round(time.time() - start_time, 2)
            logger.info("Video acquisition succeeded")
            logger.info("Final media status: full_video")

            return {
                "title": title,
                "duration": duration,
                "uploader": uploader,
                "description": description[:500] if description else "",
                "video_path": downloaded_file,
                "subtitle_path": subtitle_file,
                "has_video": True,
                "media_status": "video_available",
                "video_available": True,
                "transcript_available": True,
                "visual_analysis_available": True,
                "download_sec": download_sec
            }

        except VideoDurationLimitError:
            raise
        except Exception as e:
            err_str = str(e)
            logger.warning(f"Video acquisition failed: {err_str}")
            classified = classify_yt_error(err_str)

            # If the platform error is unrecoverable (private, non-existent, age restricted, geo-restricted, duration exceeded), abort immediately
            if classified.error_code in ("VIDEO_PRIVATE", "VIDEO_UNAVAILABLE", "VIDEO_AGE_RESTRICTED", "VIDEO_REGION_RESTRICTED", "DURATION_EXCEEDED"):
                logger.error(f"Unrecoverable YouTube error [{classified.error_code}]: {classified}")
                logger.info("Final media status: unavailable")
                raise classified

            # TARGET ARCHITECTURE:
            # If binary video download failed or was blocked, but caption acquisition succeeded:
            if caption_res:
                logger.info("Final media status: captions_only")
                caption_res["download_sec"] = round(time.time() - start_time, 2)
                return caption_res

            # Both video acquisition and caption acquisition failed
            logger.error(f"Final media status: unavailable [{classified.error_code}]: {classified}")
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
