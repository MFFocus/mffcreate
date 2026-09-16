"""
Speech Recognition Service using local faster-whisper.
Runs 100% on local CPU, produces timestamped segments and full transcripts.
"""

import os
import time
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

# Persistent model cache so faster-whisper is not re-initialized on every single job
_MODEL_CACHE: Dict[str, Any] = {}

class SpeechTranscriber:
    def __init__(self, model_size: str = "base", device: str = "cpu", compute_type: str = "default"):
        """
        model_size: 'tiny', 'base', 'small', etc. 'base' is fast on modern CPUs and accurate for English.
        """
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type

    def get_model(self):
        cache_key = f"{self.model_size}_{self.device}_{self.compute_type}"
        if cache_key not in _MODEL_CACHE:
            logger.info(f"Loading cached faster-whisper model '{self.model_size}' on {self.device}...")
            from faster_whisper import WhisperModel
            num_threads = min(4, os.cpu_count() or 4)
            _MODEL_CACHE[cache_key] = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
                cpu_threads=num_threads
            )
        return _MODEL_CACHE[cache_key]

    def transcribe(self, audio_wav_path: str, language: Optional[str] = None, progress_callback=None) -> Dict[str, Any]:
        """
        Transcribes the given WAV audio file and returns timestamped segments.
        Optimized with greedy decoding (beam_size=1) and VAD filtering for maximum CPU speed.
        """
        if not Path(audio_wav_path).exists():
            raise FileNotFoundError(f"Audio file not found: {audio_wav_path}")

        start_time = time.time()
        model = self.get_model()
        logger.info(f"Starting speech transcription on {audio_wav_path}...")

        segments_out: List[Dict[str, Any]] = []
        full_text_parts: List[str] = []

        segments, info = model.transcribe(
            audio_wav_path,
            language=language,
            beam_size=1, # Greedy search is 3-4x faster than beam_size=5 with virtually identical English accuracy
            best_of=1,
            vad_filter=True, # Voice activity detection to skip silence
            vad_parameters=dict(min_silence_duration_ms=500),
            word_timestamps=False
        )

        detected_lang = info.language
        duration = info.duration

        seg_idx = 0
        for seg in segments:
            text = seg.text.strip()
            if text:
                segments_out.append({
                    "id": seg_idx,
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                    "text": text,
                    "confidence": round(seg.avg_logprob, 3) if hasattr(seg, 'avg_logprob') else 0.0
                })
                full_text_parts.append(text)
                seg_idx += 1

                if progress_callback and duration > 0:
                    pct = min(99, int((seg.end / duration) * 100))
                    progress_callback(pct)

        full_text = " ".join(full_text_parts)
        transcribe_sec = round(time.time() - start_time, 2)

        return {
            "language": detected_lang,
            "duration": round(duration, 2),
            "segments": segments_out,
            "full_text": full_text,
            "transcribe_sec": transcribe_sec
        }
