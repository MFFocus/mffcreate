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

# Conservative multi-client extractor arguments for YouTube.
# Uses legitimate Android and iOS mobile Innertube endpoints which avoid
# the web-only bot challenges frequently encountered on cloud datacenter IPs.
BASE_YTDL_EXTRACTOR_ARGS = {
    'youtube': {
        'player_client': ['android', 'ios', 'web'],
        'player_skip': ['webpage', 'configs'],
    }
}


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
    ):
        return YouTubeBotCheckError(err_str)
    elif "private video" in lower or "this video is private" in lower:
        return VideoPrivateError(err_str)
    elif "video unavailable" in lower or "does not exist" in lower or "has been removed" in lower:
        return VideoUnavailableError(err_str)
    elif "sign in to confirm your age" in lower or "age-restricted" in lower or "inappropriate for some users" in lower:
        return VideoAgeRestrictedError(err_str)
    elif "not available in your country" in lower or "blocked in your country" in lower or "geo restricted" in lower:
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

    def download_url(self, url: str, project_id: str, progress_callback=None) -> Dict[str, Any]:
        """
        Downloads video and audio for educational processing using yt-dlp.
        Downloads at standard/medium resolution (<=480p) to optimize CPU/RAM/bandwidth.
        Uses mobile player clients to avoid datacenter IP bot challenges without cookies.
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

        # Pre-check duration without full download
        info_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'nocheckcertificate': True,
            'socket_timeout': 20,
            'extractor_args': BASE_YTDL_EXTRACTOR_ARGS,
        }
        try:
            with yt_dlp.YoutubeDL(info_opts) as ydl:
                pre_info = ydl.extract_info(url, download=False)
                if pre_info:
                    vid_duration = float(pre_info.get('duration', 0.0) or 0.0)
                    if vid_duration > MAX_VIDEO_DURATION_SEC:
                        max_hrs = MAX_VIDEO_DURATION_SEC / 3600
                        curr_hrs = round(vid_duration / 3600, 1)
                        raise VideoDurationLimitError(curr_hrs, max_hrs)
        except VideoDurationLimitError:
            raise
        except Exception as e:
            logger.warning(f"Duration pre-check notice: {e}")

        # Main download configuration with multi-client fallback
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
            'socket_timeout': 25,
            'retries': 3,
            'fragment_retries': 3,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
            'extractor_args': BASE_YTDL_EXTRACTOR_ARGS,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'Educational Lecture')
                duration = float(info.get('duration', 0.0) or 0.0)
                uploader = info.get('uploader', 'Instructor')
                description = info.get('description', '')

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
                    "download_sec": download_sec
                }

        except VideoDurationLimitError:
            raise
        except Exception as e:
            err_str = str(e)
            logger.warning(f"Full video download encountered issue: {err_str}. Attempting legitimate caption fallback...")

            # SAFE CAPTION-ONLY FALLBACK:
            # If the video stream itself cannot be obtained, check if public or auto captions
            # can be legitimately retrieved without downloading the heavy video binary.
            caption_opts = {
                'quiet': True,
                'no_warnings': True,
                'skip_download': True,
                'nocheckcertificate': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['en'],
                'outtmpl': str(proj_dir / "caption.%(ext)s"),
                'extractor_args': BASE_YTDL_EXTRACTOR_ARGS,
                'socket_timeout': 20,
            }
            try:
                with yt_dlp.YoutubeDL(caption_opts) as ydl_cap:
                    cap_info = ydl_cap.extract_info(url, download=True)
                    vtt_files = list(proj_dir.glob("*.vtt"))
                    if vtt_files:
                        logger.info(f"Safe caption fallback successful: {vtt_files[0]}")
                        return {
                            "title": cap_info.get('title', 'Educational Lecture'),
                            "duration": float(cap_info.get('duration', 0.0) or 0.0),
                            "uploader": cap_info.get('uploader', 'Instructor'),
                            "description": cap_info.get('description', '')[:500] if cap_info.get('description') else "",
                            "video_path": None,
                            "subtitle_path": str(vtt_files[0]),
                            "has_video": False,
                            "notice": "Video visuals could not be downloaded; study workspace synthesized from verified lecture speech.",
                            "download_sec": round(time.time() - start_time, 2)
                        }
            except Exception as cap_err:
                logger.warning(f"Caption fallback was not available: {cap_err}")

            # If both video download and caption fallback failed, classify error cleanly
            classified = classify_yt_error(err_str)
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
