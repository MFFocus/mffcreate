"""
Local Visual OCR Service using RapidOCR (ONNX Runtime).
Extracts printed, handwritten, and slide text without requiring external C++ Tesseract binaries.
Categorizes visual frames into slides, formulas, diagrams, or code.
"""

import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

import time
import cv2
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Global RapidOCR instance and hash cache
_SHARED_OCR = None
_OCR_CACHE: Dict[int, Dict[str, Any]] = {}

class VisualOCREngine:
    def __init__(self):
        pass

    def get_ocr(self):
        global _SHARED_OCR
        if _SHARED_OCR is None:
            logger.info("Initializing RapidOCR ONNX engine...")
            from rapidocr_onnxruntime import RapidOCR
            _SHARED_OCR = RapidOCR()
        return _SHARED_OCR

    def classify_frame(self, text: str) -> str:
        """Categorizes frame based on OCR content patterns."""
        t_lower = text.lower()
        math_signs = ['=', '+', '-', '∫', '∑', '√', 'lim', 'dx', 'dy', 'sin', 'cos', 'tan', 'theta', 'λ', 'π', '^']
        code_signs = ['def ', 'class ', 'import ', 'return ', 'void ', 'public static', '{', '}', 'console.log', 'function']

        math_count = sum(1 for sign in math_signs if sign in t_lower)
        code_count = sum(1 for sign in code_signs if sign in t_lower)

        if code_count >= 2:
            return "code"
        elif math_count >= 2 or ("formula" in t_lower or "equation" in t_lower):
            return "formula"
        elif len(text.split()) < 8 and len(text) > 0:
            return "diagram"
        else:
            return "slide"

    def has_sufficient_edges(self, img_path: str) -> bool:
        """Fast check to see if an image likely contains text or diagrams before running ONNX OCR."""
        try:
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                return True
            # Resize for fast check
            small = cv2.resize(img, (160, 90))
            var = cv2.Laplacian(small, cv2.CV_64F).var()
            return var > 15.0 # Low variance means blurry background or uniform wall
        except Exception:
            return True

    def process_keyframes(self, keyframes: List[Dict[str, Any]], progress_callback=None) -> List[Dict[str, Any]]:
        """
        Runs OCR on keyframes with hash-based memoization and edge pre-filtering.
        Populates ocr_text, frame_type, and visual_label.
        """
        start_time = time.time()
        ocr = self.get_ocr()
        total = len(keyframes)
        enriched: List[Dict[str, Any]] = []

        for idx, kf in enumerate(keyframes):
            img_path = kf.get("image_path")
            if not img_path or not Path(img_path).exists():
                continue

            frame_hash = kf.get("dhash")

            # 1. Check memoization cache
            if frame_hash is not None and frame_hash in _OCR_CACHE:
                cached = _OCR_CACHE[frame_hash]
                enriched.append({
                    "timestamp": kf["timestamp"],
                    "image_filename": kf["image_filename"],
                    "image_path": img_path,
                    "ocr_text": cached["ocr_text"],
                    "frame_type": cached["frame_type"],
                    "visual_label": cached["visual_label"]
                })
                if progress_callback and total > 0:
                    progress_callback(min(99, int(((idx + 1) / total) * 100)))
                continue

            # 2. Check edge variance
            if not self.has_sufficient_edges(img_path):
                label = f"Visual scene at {int(kf['timestamp'])}s"
                enriched.append({
                    "timestamp": kf["timestamp"],
                    "image_filename": kf["image_filename"],
                    "image_path": img_path,
                    "ocr_text": "",
                    "frame_type": "slide",
                    "visual_label": label
                })
                if progress_callback and total > 0:
                    progress_callback(min(99, int(((idx + 1) / total) * 100)))
                continue

            try:
                result, elapse = ocr(img_path)
                lines = []
                if result:
                    for line in result:
                        if len(line) >= 2:
                            text_str = line[1].strip()
                            score = float(line[2]) if len(line) >= 3 else 1.0
                            if score > 0.4 and text_str:
                                lines.append(text_str)

                ocr_text = "\n".join(lines).strip()
                frame_type = self.classify_frame(ocr_text)

                visual_label = lines[0] if lines else f"Scene at {int(kf['timestamp'])}s"
                if len(visual_label) > 60:
                    visual_label = visual_label[:57] + "..."

                kf_data = {
                    "timestamp": kf["timestamp"],
                    "image_filename": kf["image_filename"],
                    "image_path": img_path,
                    "ocr_text": ocr_text,
                    "frame_type": frame_type,
                    "visual_label": visual_label
                }

                # Cache result
                if frame_hash is not None:
                    _OCR_CACHE[frame_hash] = {
                        "ocr_text": ocr_text,
                        "frame_type": frame_type,
                        "visual_label": visual_label
                    }

                enriched.append(kf_data)

            except Exception as e:
                logger.warning(f"OCR failed for frame {img_path}: {e}")
                enriched.append({
                    "timestamp": kf["timestamp"],
                    "image_filename": kf["image_filename"],
                    "image_path": img_path,
                    "ocr_text": "",
                    "frame_type": "slide",
                    "visual_label": f"Frame at {int(kf['timestamp'])}s"
                })

            if progress_callback and total > 0:
                pct = min(99, int(((idx + 1) / total) * 100))
                progress_callback(pct)

        ocr_sec = round(time.time() - start_time, 2)
        logger.info(f"Completed OCR for {len(enriched)} frames in {ocr_sec}s")
        return enriched
