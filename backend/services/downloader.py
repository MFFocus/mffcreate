"""
Educational Video Downloader & Ingest Service.
Supports YouTube, Vimeo, direct MP4/WebM URLs, and local file uploads.
Fully compliant with copyright and platform guidelines. No DRM or paywall bypass.
Uses bundled FFmpeg for seamless format merging.
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

class MediaDownloader:
    def __init__(self, storage_dir: Path):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.ffmpeg_exe = get_ffmpeg_executable()

    def download_url(self, url: str, project_id: str, progress_callback=None) -> Dict[str, Any]:
        """
        Downloads video and audio for educational processing using yt-dlp.
        Downloads at standard/medium resolution (480p) to optimize CPU/RAM/download speed.
        Passes bundled FFmpeg to yt-dlp to allow merging separate video+audio streams without system FFmpeg.
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
            'socket_timeout': 20,
        }
        try:
            with yt_dlp.YoutubeDL(info_opts) as ydl:
                pre_info = ydl.extract_info(url, download=False)
                if pre_info:
                    vid_duration = float(pre_info.get('duration', 0.0) or 0.0)
                    if vid_duration > MAX_VIDEO_DURATION_SEC:
                        max_hrs = MAX_VIDEO_DURATION_SEC / 3600
                        curr_hrs = round(vid_duration / 3600, 1)
                        raise ValueError(f"Video duration ({curr_hrs} hours) exceeds the maximum allowed limit of {max_hrs} hours for public processing.")
        except ValueError:
            raise
        except Exception as e:
            logger.warning(f"Duration pre-check skipped due to: {e}")

        ydl_opts = {
            # 480p standard is ideal: sharp enough for clear slide OCR while cutting download size by ~70-80%
            'format': 'bestvideo[height<=480]+bestaudio/best[height<=480]/best',
            'outtmpl': video_out,
            'merge_output_format': 'mp4',
            'ffmpeg_location': self.ffmpeg_exe,
            'quiet': True,
            'no_warnings': True,
            'progress_hooks': [hook] if progress_callback else [],
            'noplaylist': True,
            'socket_timeout': 25,
            'retries': 3,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en'],
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'Educational Lecture')
                duration = float(info.get('duration', 0.0) or 0.0)
                uploader = info.get('uploader', 'Instructor')
                description = info.get('description', '')

                # Find the actual downloaded file
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

                # Check for downloaded subtitles to accelerate transcription
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
                    "download_sec": download_sec
                }
        except ValueError as ve:
            raise RuntimeError(str(ve))
        except yt_dlp.utils.DownloadError as e:
            logger.error(f"Download error: {e}")
            raise RuntimeError(f"Could not access or download video: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to process URL: {e}")
            raise RuntimeError(f"Video download failed: {str(e)}")

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
        }
