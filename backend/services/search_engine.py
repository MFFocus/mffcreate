"""
Unified Local Search Engine for MffConvert ("Find Anything").
Performs intelligent token and intent matching across speech transcripts,
visual OCR frames, formulas, questions, and chapter concepts.
"""

import re
import math
from typing import List, Dict, Any, Optional

class SearchEngine:
    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return [w.lower() for w in re.findall(r'\w+', text) if len(w) > 1]

    @classmethod
    def search(
        cls,
        query: str,
        transcript_data: Optional[Dict[str, Any]],
        keyframes: List[Dict[str, Any]],
        study_materials: Optional[Dict[str, Any]],
        source_filter: Optional[str] = "all"
    ) -> List[Dict[str, Any]]:
        """
        Searches all multimodal artifacts for a given query.
        Returns scored results with timestamps and source types.
        """
        q_clean = query.strip().lower()
        if not q_clean:
            return []

        # Intent detection
        wants_formulas = "formula" in q_clean or "equation" in q_clean
        wants_questions = "question" in q_clean or "example" in q_clean or "problem" in q_clean or "calculate" in q_clean
        wants_diagrams = "diagram" in q_clean or "chart" in q_clean or "slide" in q_clean

        # Filter out intent keywords to get topical query
        stopwords = {"find", "show", "all", "every", "where", "is", "about", "the", "in", "explained", "of"}
        q_tokens = [t for t in cls._tokenize(q_clean) if t not in stopwords]
        if not q_tokens:
            q_tokens = cls._tokenize(q_clean)

        results: List[Dict[str, Any]] = []

        # 1. Search Formulas
        if (source_filter in ["all", "formula"] or wants_formulas) and study_materials:
            formulas = study_materials.get("formulas", [])
            for f in formulas:
                search_corpus = f"{f.get('name', '')} {f.get('latex', '')} {f.get('explanation', '')}".lower()
                score = sum(2.0 for t in q_tokens if t in search_corpus)
                if wants_formulas and not q_tokens:
                    score = 1.0 # Return all formulas if query was "show all formulas"
                if score > 0 or (wants_formulas and len(q_tokens) <= 1):
                    results.append({
                        "id": f"formula_{f.get('id')}",
                        "source_type": "formula",
                        "title": f.get("name", "Equation"),
                        "snippet": f"Formula: {f.get('latex')} — {f.get('explanation')}",
                        "timestamp": float(f.get("timestamp", 0.0)),
                        "score": score + (1.5 if wants_formulas else 0.5)
                    })

        # 2. Search Questions
        if (source_filter in ["all", "question"] or wants_questions) and study_materials:
            questions = study_materials.get("questions", [])
            for q in questions:
                search_corpus = f"{q.get('question', '')} {q.get('solution', '')}".lower()
                score = sum(2.0 for t in q_tokens if t in search_corpus)
                if wants_questions and not q_tokens:
                    score = 1.0
                if score > 0 or (wants_questions and len(q_tokens) <= 1):
                    results.append({
                        "id": f"question_{q.get('id')}",
                        "source_type": "question",
                        "title": q.get("question", "Problem Statement"),
                        "snippet": f"Solution: {q.get('solution')}",
                        "timestamp": float(q.get("timestamp", 0.0)),
                        "score": score + (1.5 if wants_questions else 0.5)
                    })

        # 3. Search Keyframes / Diagrams / Slides
        if source_filter in ["all", "diagram", "slide"] or wants_diagrams:
            for idx, kf in enumerate(keyframes):
                ocr = kf.get("ocr_text", "").lower()
                label = kf.get("visual_label", "").lower()
                f_type = kf.get("frame_type", "slide")
                score = sum(1.5 for t in q_tokens if t in ocr or t in label)
                if wants_diagrams and f_type == "diagram":
                    score += 2.0
                if score > 0 or (wants_diagrams and f_type in ["diagram", "slide"] and len(q_tokens) <= 1):
                    results.append({
                        "id": f"keyframe_{idx}",
                        "source_type": "diagram" if f_type == "diagram" else "slide",
                        "title": kf.get("visual_label", f"Visual Frame at {int(kf['timestamp'])}s"),
                        "snippet": kf.get("ocr_text", "")[:180] or "Visual illustration / slide content",
                        "timestamp": float(kf.get("timestamp", 0.0)),
                        "thumbnail": kf.get("image_filename"),
                        "score": score + (1.0 if wants_diagrams else 0.0)
                    })

        # 4. Search Transcript Segments
        if (source_filter in ["all", "transcript"] and not wants_formulas and not wants_questions) or not results:
            if transcript_data:
                segments = transcript_data.get("segments", [])
                for seg in segments:
                    seg_text = seg.get("text", "").lower()
                    score = sum(1.0 for t in q_tokens if t in seg_text)
                    if score > 0:
                        results.append({
                            "id": f"seg_{seg.get('id')}",
                            "source_type": "transcript",
                            "title": f"Spoken Lecture `[{int(seg['start']//60):02d}:{int(seg['start']%60):02d}]`",
                            "snippet": seg.get("text", ""),
                            "timestamp": float(seg.get("start", 0.0)),
                            "score": score
                        })

        # Sort by relevance score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:30]
