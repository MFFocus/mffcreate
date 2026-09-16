"""
Intelligent Keyframe & Slide Extraction Service using OpenCV.
Detects important slide changes, diagrams, and visual transitions while skipping
redundant talking-head frames and duplicate slides to conserve CPU, RAM, and storage.
"""

import time
import cv2
import numpy as np
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def compute_dhash(gray_frame: np.ndarray) -> int:
    """
    Computes a 64-bit difference hash (dHash) for fast perceptual slide deduplication.
    Compares adjacent horizontal pixels on a 9x8 downsampled matrix.
    """
    resized = cv2.resize(gray_frame, (9, 8), interpolation=cv2.INTER_AREA)
    diff = resized[:, 1:] > resized[:, :-1]
    val = 0
    for idx, bit in enumerate(diff.flatten()):
        if bit:
            val |= (1 << idx)
    return val

def hamming_distance(hash1: int, hash2: int) -> int:
    """Returns number of differing bits between two 64-bit perceptual hashes."""
    return bin(hash1 ^ hash2).count('1')

class KeyframeExtractor:
    def __init__(self, output_dir: Path, min_interval_sec: float = 6.0, max_frames: int = 18):
        self.output_dir = output_dir
        self.min_interval_sec = min_interval_sec
        self.max_frames = max_frames

    def extract_keyframes(self, video_path: str, project_id: str, progress_callback=None) -> List[Dict[str, Any]]:
        """
        Scans video for significant visual changes (slides, diagrams, board transitions),
        rejects black/blank frames, and applies perceptual dHash to prevent duplicate slides.
        Saves clean keyframes as JPEGs.
        """
        start_time = time.time()
        frames_dir = self.output_dir / project_id / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video file with OpenCV: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = total_frames / fps if total_frames > 0 else 0.0

        # Sample at 1 frame every 2 seconds for slide change detection to drastically cut CPU usage
        sample_stride = max(1, int(fps * 2.0))

        keyframes: List[Dict[str, Any]] = []
        prev_gray_thumb = None
        prev_hash = None
        last_saved_time = -self.min_interval_sec

        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_stride == 0:
                current_time = frame_idx / fps

                if progress_callback and duration > 0:
                    pct = min(99, int((current_time / duration) * 100))
                    progress_callback(pct)

                # Create low-res thumbnail for fast similarity check
                thumb = cv2.resize(frame, (160, 90))
                gray_thumb = cv2.cvtColor(thumb, cv2.COLOR_BGR2GRAY)

                # 1. Skip black or blank/uniform frames (mean < 18 or std < 10)
                mean_val = float(np.mean(gray_thumb))
                std_val = float(np.std(gray_thumb))
                if mean_val < 18 or std_val < 10:
                    frame_idx += 1
                    continue

                curr_hash = compute_dhash(gray_thumb)
                is_keyframe = False

                if prev_gray_thumb is None or prev_hash is None:
                    # Capture first clear opening slide
                    is_keyframe = True
                elif (current_time - last_saved_time) >= self.min_interval_sec:
                    # Check perceptual hash difference
                    dist = hamming_distance(curr_hash, prev_hash)
                    
                    # Also compute structural pixel difference
                    diff = cv2.absdiff(gray_thumb, prev_gray_thumb)
                    non_zero_pct = np.count_nonzero(diff > 25) / diff.size

                    # Only capture if there is genuine perceptual change (dist >= 6 and pixel diff > 16%)
                    if dist >= 6 and non_zero_pct > 0.16:
                        is_keyframe = True

                if is_keyframe and len(keyframes) < self.max_frames:
                    ts_clean = round(current_time, 2)
                    filename = f"frame_{len(keyframes):03d}_{int(ts_clean)}s.jpg"
                    filepath = frames_dir / filename

                    # Save high-res frame with good JPEG compression
                    cv2.imwrite(str(filepath), frame, [cv2.IMWRITE_JPEG_QUALITY, 85])

                    keyframes.append({
                        "timestamp": ts_clean,
                        "image_filename": filename,
                        "image_path": str(filepath),
                        "dhash": curr_hash
                    })

                    prev_gray_thumb = gray_thumb
                    prev_hash = curr_hash
                    last_saved_time = current_time

            frame_idx += 1

        cap.release()
        visual_sec = round(time.time() - start_time, 2)
        logger.info(f"Extracted {len(keyframes)} unique keyframes in {visual_sec}s for project {project_id}")
        return keyframes
