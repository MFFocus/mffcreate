"""
Media Processing Service using bundled FFmpeg.
Extracts 16kHz mono audio WAV for speech recognition, probes duration and metadata.
Ensures ffmpeg.exe is available and added to PATH for all subprocesses and yt-dlp.
"""

import os
import shutil
import subprocess
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def get_ffmpeg_executable() -> str:
    """
    Locates FFmpeg executable:
    1. Checks system PATH (standard in Docker / Linux deployments).
    2. Falls back to bundled FFmpeg executable from imageio_ffmpeg (standard in Windows dev).
    Ensures standard ffmpeg binary is available and added to PATH for yt-dlp.
    """
    # 1. System FFmpeg check
    sys_ffmpeg = shutil.which("ffmpeg")
    if sys_ffmpeg:
        return sys_ffmpeg

    # 2. Bundled imageio_ffmpeg fallback
    try:
        import imageio_ffmpeg
        exe_path = imageio_ffmpeg.get_ffmpeg_exe()
        bin_dir = os.path.dirname(exe_path)

        # Ensure a standard ffmpeg.exe exists in the folder for tools like yt-dlp
        standard_name = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
        standard_exe = os.path.join(bin_dir, standard_name)

        if not os.path.exists(standard_exe):
            try:
                shutil.copy2(exe_path, standard_exe)
                logger.info(f"Created standard ffmpeg binary at: {standard_exe}")
            except Exception as e:
                logger.warning(f"Could not copy ffmpeg to standard name: {e}")
                standard_exe = exe_path

        # Add binary directory to system PATH for this process and any child processes
        if bin_dir not in os.environ.get("PATH", ""):
            os.environ["PATH"] = bin_dir + os.pathsep + os.environ.get("PATH", "")

        return standard_exe
    except Exception as e:
        logger.warning(f"Could not get imageio_ffmpeg: {e}, falling back to 'ffmpeg'")
        return "ffmpeg"

FFMPEG_EXE = get_ffmpeg_executable()

class MediaProcessor:
    def __init__(self, ffmpeg_path: Optional[str] = None):
        self.ffmpeg_path = ffmpeg_path or get_ffmpeg_executable()

    def extract_audio(self, video_path: str, output_wav_path: str) -> str:
        """
        Converts any video or audio file into a 16kHz 16-bit mono PCM WAV,
        which is the optimal format for Whisper models.
        """
        Path(output_wav_path).parent.mkdir(parents=True, exist_ok=True)

        start_time = os.times().elapsed if hasattr(os, 'times') else 0

        cmd = [
            self.ffmpeg_path,
            "-y",  # Overwrite output file
            "-i", video_path,
            "-vn",  # No video
            "-acodec", "pcm_s16le",
            "-ar", "16000",  # 16kHz
            "-ac", "1",      # Mono channel
            "-threads", "2",
            output_wav_path
        ]

        logger.info(f"Extracting audio using FFmpeg: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0:
            logger.error(f"FFmpeg audio extraction error: {result.stderr}")
            raise RuntimeError(f"FFmpeg failed to extract audio: {result.stderr[-300:]}")

        if not Path(output_wav_path).exists() or Path(output_wav_path).stat().st_size == 0:
            raise RuntimeError("Extracted audio file is empty or missing.")

        return output_wav_path

    def get_duration(self, file_path: str) -> float:
        """
        Probes media duration in seconds using ffmpeg output.
        """
        cmd = [
            self.ffmpeg_path,
            "-i", file_path
        ]
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        # Search for Duration: 00:00:00.00 in stderr
        for line in result.stderr.splitlines():
            if "Duration:" in line:
                parts = line.split("Duration:")[1].split(",")[0].strip()
                try:
                    h, m, s = parts.split(":")
                    return float(h) * 3600 + float(m) * 60 + float(s)
                except Exception:
                    pass
        return 0.0

def cleanup_temp_media(storage_dir: Path, project_id: str, keep_video: bool = False) -> int:
    """
    Safely prunes bulky temporary video and raw WAV audio files post-extraction.
    Preserves keyframe slide images in frames/, thumbnails, and database records.
    Returns the total bytes reclaimed.
    """
    proj_dir = storage_dir / project_id
    if not proj_dir.exists():
        return 0

    reclaimed_bytes = 0

    # 1. Clean up audio WAV (Whisper transcript has been saved to DB)
    audio_wav = proj_dir / "audio_16k.wav"
    if audio_wav.exists():
        try:
            size = audio_wav.stat().st_size
            audio_wav.unlink()
            reclaimed_bytes += size
            logger.info(f"Pruned temporary audio for project {project_id} ({size / (1024*1024):.1f} MB reclaimed)")
        except Exception as e:
            logger.warning(f"Could not prune audio {audio_wav}: {e}")

    # 2. Clean up temporary downloaded video files if not requested to keep
    if not keep_video:
        for ext in ["mp4", "mkv", "webm", "part", "ytdl"]:
            for vid in proj_dir.glob(f"video*.{ext}"):
                try:
                    size = vid.stat().st_size
                    vid.unlink()
                    reclaimed_bytes += size
                    logger.info(f"Pruned temporary video {vid.name} for project {project_id} ({size / (1024*1024):.1f} MB reclaimed)")
                except Exception as e:
                    logger.warning(f"Could not prune video {vid}: {e}")

    return reclaimed_bytes
