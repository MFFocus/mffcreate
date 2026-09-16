"""
Local AI Study Synthesis & Grounded Chat Service.
Supports local Ollama LLM integration (llama3.2, mistral, qwen2.5, phi3)
AND includes a built-in deterministic local NLP/heuristic synthesis engine
so MffConvert functions immediately without requiring external downloads or GPU.
"""

import re
import json
import logging
import httpx
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434"

class AIService:
    def __init__(self, ollama_url: str = OLLAMA_URL):
        self.ollama_url = ollama_url

    async def get_ollama_status(self) -> Dict[str, Any]:
        """Checks if local Ollama daemon is reachable and lists available models."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                if res.status_code == 200:
                    models = [m.get("name") for m in res.json().get("models", [])]
                    # Select best available model
                    pref_order = ["llama3.2", "llama3.1", "qwen2.5", "mistral", "phi3", "gemma2", "deepseek-r1"]
                    selected = None
                    for pref in pref_order:
                        for m in models:
                            if pref in m.lower():
                                selected = m
                                break
                        if selected:
                            break
                    if not selected and models:
                        selected = models[0]

                    return {
                        "available": True,
                        "models": models,
                        "recommended_model": selected or "llama3.2"
                    }
        except Exception:
            pass
        return {
            "available": False,
            "models": [],
            "recommended_model": None
        }

    async def generate_study_materials(
        self,
        title: str,
        transcript_data: Dict[str, Any],
        keyframes: List[Dict[str, Any]],
        model_name: Optional[str] = None,
        stage_callback = None
    ) -> Dict[str, Any]:
        """
        Synthesizes deep notes, short notes, chapters, questions, formulas, mindmap,
        flashcards, and quizzes from transcript + OCR visual content.
        Uses local Ollama if available, otherwise seamlessly uses high-grade local NLP engine.
        """
        import time
        start_time = time.time()
        ollama_status = await self.get_ollama_status()

        result = None
        if ollama_status["available"] and (model_name or ollama_status["recommended_model"]):
            chosen_model = model_name or ollama_status["recommended_model"]
            try:
                logger.info(f"Attempting Ollama synthesis with model '{chosen_model}'...")
                if stage_callback:
                    stage_callback("generating_notes", "Generating deep study notes...", 86)
                result = await self._synthesize_with_ollama(title, transcript_data, keyframes, chosen_model)
            except Exception as e:
                logger.warning(f"Ollama synthesis failed or timed out: {e}. Falling back to local NLP engine.")

        if result is None:
            logger.info("Using built-in local NLP / heuristic synthesis engine...")
            result = self._synthesize_with_local_nlp(title, transcript_data, keyframes, stage_callback=stage_callback)

        ai_sec = round(time.time() - start_time, 2)
        result["ai_sec"] = ai_sec
        return result

    def _synthesize_with_local_nlp(
        self,
        title: str,
        transcript_data: Dict[str, Any],
        keyframes: List[Dict[str, Any]],
        stage_callback = None
    ) -> Dict[str, Any]:
        """
        Deterministic local multimodal extractor. Combines audio transcript with OCR text
        to produce high-quality structured study materials without requiring an LLM.
        """
        import time
        start_time = time.time()
        if stage_callback:
            stage_callback("generating_notes", "Generating structured notes...", 86)

        segments = transcript_data.get("segments", [])
        full_text = transcript_data.get("full_text", "")
        duration = transcript_data.get("duration", 0.0)

        # 1. Chapters generation
        chapters = []
        # Base chapters on keyframes and timestamp strides
        if keyframes:
            for idx, kf in enumerate(keyframes):
                ts = kf["timestamp"]
                label = kf.get("visual_label") or f"Section {idx+1}"
                if len(label) > 45:
                    label = label[:42] + "..."

                # Find matching transcript text around this timestamp
                nearby_text = ""
                for seg in segments:
                    if abs(seg["start"] - ts) <= 30:
                        nearby_text += seg["text"] + " "

                summary = (nearby_text.strip()[:140] + "...") if nearby_text else "Visual presentation and conceptual explanation."

                chapters.append({
                    "id": idx + 1,
                    "title": label,
                    "start_time": ts,
                    "summary": summary,
                    "frame_thumbnail": kf.get("image_filename")
                })
        else:
            # Chunk by duration
            step = max(60, int(duration / 5)) if duration > 0 else 120
            cur = 0
            idx = 1
            while cur < duration:
                chapters.append({
                    "id": idx,
                    "title": f"Chapter {idx}: Progression",
                    "start_time": float(cur),
                    "summary": f"Lecture segment from {int(cur // 60)}:{int(cur % 60):02d}",
                    "frame_thumbnail": None
                })
                cur += step
                idx += 1

        # 2. Formulas extraction from OCR & transcript
        formulas = []
        formula_id = 1
        math_regex = re.compile(r'([A-Za-z\\]+[\s]*[=><+\-*/\^][\s]*[A-Za-z0-9\(\)\\\+\-\*\/\^\.\s]{3,})')

        for kf in keyframes:
            ocr_text = kf.get("ocr_text", "")
            for line in ocr_text.splitlines():
                line = line.strip()
                if any(sym in line for sym in ['=', '∫', '∑', '√', 'lim', 'dx', '^', 'theta', 'lambda']) and len(line) > 3:
                    formulas.append({
                        "id": formula_id,
                        "name": f"Formula #{formula_id} ({kf.get('visual_label', 'Equation')[:30]})",
                        "latex": line,
                        "explanation": f"Observed in visual lecture slide at timestamp {int(kf['timestamp'])}s.",
                        "timestamp": kf["timestamp"]
                    })
                    formula_id += 1
                    if len(formulas) >= 15:
                        break

        # Also search transcript for spoken formulas
        spoken_formula_regex = re.compile(r'(formula for [a-zA-Z\s]+|equals [a-zA-Z0-9\s]+|times [a-zA-Z0-9\s]+)', re.IGNORECASE)
        for seg in segments:
            match = spoken_formula_regex.search(seg["text"])
            if match and len(formulas) < 15:
                formulas.append({
                    "id": formula_id,
                    "name": f"Spoken Relation: {match.group(0)[:30]}",
                    "latex": match.group(0),
                    "explanation": f"Spoken explanation by instructor: \"{seg['text']}\"",
                    "timestamp": seg["start"]
                })
                formula_id += 1

        # 3. Questions & Solutions extraction
        if stage_callback:
            stage_callback("generating_questions", "Formulating questions & solved problems...", 91)
        questions = []
        q_id = 1
        q_words = ["what", "why", "how", "where", "calculate", "find", "determine", "evaluate", "solve", "can we", "is it"]
        
        # Look in transcript
        for seg in segments:
            txt = seg["text"].strip()
            if any(txt.lower().startswith(qw) for qw in q_words) or txt.endswith("?"):
                # Find subsequent segment as potential solution/answer
                ans_text = "Refer to video explanation at this timestamp."
                seg_idx = seg["id"]
                if seg_idx + 1 < len(segments):
                    ans_text = segments[seg_idx + 1]["text"]
                    if seg_idx + 2 < len(segments):
                        ans_text += " " + segments[seg_idx + 2]["text"]

                questions.append({
                    "id": q_id,
                    "question": txt,
                    "solution": ans_text,
                    "timestamp": seg["start"],
                    "source": "Audio Speech"
                })
                q_id += 1
                if len(questions) >= 12:
                    break

        # Also look in OCR for problem statements
        for kf in keyframes:
            ocr = kf.get("ocr_text", "")
            for line in ocr.splitlines():
                if any(w in line.lower() for w in ["example", "problem", "exercise", "question", "find ", "calculate "]):
                    questions.append({
                        "id": q_id,
                        "question": line,
                        "solution": f"Step-by-step resolution shown on slide at timestamp {int(kf['timestamp'])}s.",
                        "timestamp": kf["timestamp"],
                        "source": "Slide OCR"
                    })
                    q_id += 1
                    if len(questions) >= 15:
                        break

        # 4. Mindmap extraction
        mindmap_nodes = [
            {"id": "root", "label": title, "type": "root", "timestamp": 0.0}
        ]
        mindmap_edges = []

        for c_idx, ch in enumerate(chapters[:8]):
            c_node_id = f"chapter_{c_idx+1}"
            mindmap_nodes.append({
                "id": c_node_id,
                "label": ch["title"],
                "type": "chapter",
                "timestamp": ch["start_time"]
            })
            mindmap_edges.append({
                "id": f"edge_root_{c_node_id}",
                "source": "root",
                "target": c_node_id,
                "label": "Topic"
            })

            # Add connected formula or question node if any
            for f in formulas:
                if abs(f["timestamp"] - ch["start_time"]) <= 60:
                    f_id = f"f_{f['id']}"
                    mindmap_nodes.append({
                        "id": f_id,
                        "label": f["name"],
                        "type": "formula",
                        "timestamp": f["timestamp"]
                    })
                    mindmap_edges.append({
                        "id": f"edge_{c_node_id}_{f_id}",
                        "source": c_node_id,
                        "target": f_id,
                        "label": "Equation"
                    })
                    break

        # 5. Flashcards extraction
        if stage_callback:
            stage_callback("generating_flashcards", "Building study flashcards & quiz...", 94)
        flashcards = []
        fc_id = 1
        for ch in chapters:
            flashcards.append({
                "id": fc_id,
                "front": f"What is the key focus of: {ch['title']}?",
                "back": ch["summary"],
                "tag": "Concept",
                "timestamp": ch["start_time"]
            })
            fc_id += 1

        for f in formulas[:6]:
            flashcards.append({
                "id": fc_id,
                "front": f"What is the formula for {f['name']}?",
                "back": f"{f['latex']}\n\n{f['explanation']}",
                "tag": "Formula",
                "timestamp": f["timestamp"]
            })
            fc_id += 1

        for q in questions[:6]:
            flashcards.append({
                "id": fc_id,
                "front": q["question"],
                "back": q["solution"],
                "tag": "Question",
                "timestamp": q["timestamp"]
            })
            fc_id += 1

        # 6. Practice Quiz generation
        quiz = []
        quiz_id = 1
        for idx, ch in enumerate(chapters[:5]):
            correct_opt = ch["summary"]
            options = [
                correct_opt,
                "A topic not covered in this lecture segment.",
                "An alternative secondary theorem unrelated to this topic.",
                "Preliminary setup without technical details."
            ]
            quiz.append({
                "id": quiz_id,
                "question": f"According to the lecture, what is discussed regarding '{ch['title']}'?",
                "options": options,
                "correct_index": 0,
                "explanation": f"Explained at timestamp {int(ch['start_time'])}s: {correct_opt}",
                "timestamp": ch["start_time"]
            })
            quiz_id += 1

        for f in formulas[:4]:
            quiz.append({
                "id": quiz_id,
                "question": f"Which mathematical expression represents {f['name']}?",
                "options": [
                    f"{f['latex']}",
                    r"f(x) = \frac{1}{\sqrt{2\pi}} e^{-x^2/2}",
                    r"\nabla \times \vec{E} = 0",
                    r"E = mc^2 + \Delta V"
                ],
                "correct_index": 0,
                "explanation": f"Observed on slide at {int(f['timestamp'])}s: {f['explanation']}",
                "timestamp": f["timestamp"]
            })
            quiz_id += 1

        # 7. Deep Notes (Structured Markdown)
        deep_notes = f"# Comprehensive Study Notes: {title}\n\n"
        deep_notes += "> **Source Classification**: 100% Free & Local Processing. Multimodal audio + visual extraction.\n\n"
        deep_notes += "## Executive Overview\n\n"
        deep_notes += f"This lecture explores **{title}**, integrating spoken explanations with visual slides and derivations. "
        deep_notes += f"The lecture spans {int(duration // 60)} minutes and {int(duration % 60)} seconds across {len(chapters)} main milestones.\n\n"

        for ch in chapters:
            min_s = int(ch["start_time"] // 60)
            sec_s = int(ch["start_time"] % 60)
            deep_notes += f"### {ch['title']} `[{min_s:02d}:{sec_s:02d}]`\n\n"
            deep_notes += f"{ch['summary']}\n\n"

            # Check if any keyframes match this timestamp range
            matched_kfs = [kf for kf in keyframes if abs(kf["timestamp"] - ch["start_time"]) <= 45]
            if matched_kfs:
                deep_notes += "**Visual & Slide Details:**\n"
                for mkf in matched_kfs:
                    if mkf.get("ocr_text"):
                        deep_notes += f"- *Slide at {int(mkf['timestamp'])}s*: {mkf['ocr_text'].replace(chr(10), ' | ')}\n"
                deep_notes += "\n"

        if formulas:
            deep_notes += "## Key Equations & Formulas\n\n"
            for f in formulas:
                deep_notes += f"- **{f['name']}** `[{int(f['timestamp'] // 60):02d}:{int(f['timestamp'] % 60):02d}]`:\n"
                deep_notes += f"  $$\n  {f['latex']}\n  $$\n"
                deep_notes += f"  *{f['explanation']}*\n\n"

        if questions:
            deep_notes += "## Solved Problems & Questions\n\n"
            for q in questions:
                deep_notes += f"#### Q: {q['question']} `[{int(q['timestamp'] // 60):02d}:{int(q['timestamp'] % 60):02d}]`\n"
                deep_notes += f"**Solution:** {q['solution']}\n\n"

        # 8. Short Notes (Cheat Sheet)
        short_notes = f"# Quick Revision Cheat Sheet: {title}\n\n"
        short_notes += "### Key Takeaways\n"
        for ch in chapters[:6]:
            short_notes += f"- **{ch['title']}** (`{int(ch['start_time'] // 60):02d}:{int(ch['start_time'] % 60):02d}`): {ch['summary'][:100]}...\n"
        short_notes += "\n### Essential Formulas at a Glance\n"
        for f in formulas[:6]:
            short_notes += f"- **{f['name']}**: `{f['latex']}`\n"

        return {
            "deep_notes": deep_notes,
            "short_notes": short_notes,
            "chapters": chapters,
            "questions": questions,
            "formulas": formulas,
            "mindmap": {"nodes": mindmap_nodes, "edges": mindmap_edges},
            "flashcards": flashcards,
            "quiz": quiz
        }

    async def _synthesize_with_ollama(
        self,
        title: str,
        transcript_data: Dict[str, Any],
        keyframes: List[Dict[str, Any]],
        model_name: str
    ) -> Dict[str, Any]:
        """Calls local Ollama instance for deep AI synthesis."""
        full_text = transcript_data.get("full_text", "")[:12000] # Fit in context window
        slides_summary = "\n".join([
            f"Timestamp {int(kf['timestamp'])}s [{kf.get('frame_type', 'slide')}]: {kf.get('ocr_text', '')[:200]}"
            for kf in keyframes[:25]
        ])

        prompt = f"""
You are MffConvert, a local-first educational synthesis engine.
Analyze this educational lecture:
Title: {title}

Transcript:
{full_text}

Visual Slides / Keyframe OCR:
{slides_summary}

Generate a comprehensive study package. Output ONLY a valid JSON object matching this exact schema:
{{
  "deep_notes": "Textbook-grade Markdown notes with LaTeX math formulas ($$...$$) and timestamp citations like [04:15]",
  "short_notes": "Bulleted high-yield revision cheat sheet",
  "chapters": [
    {{"id": 1, "title": "Chapter Title", "start_time": 0.0, "summary": "Detailed summary", "frame_thumbnail": null}}
  ],
  "questions": [
    {{"id": 1, "question": "Question text?", "solution": "Step by step solution", "timestamp": 12.0, "source": "Audio Speech"}}
  ],
  "formulas": [
    {{"id": 1, "name": "Formula Name", "latex": "E = mc^2", "explanation": "Description", "timestamp": 15.0}}
  ],
  "flashcards": [
    {{"id": 1, "front": "Concept / Prompt", "back": "Definition / Answer", "tag": "Concept", "timestamp": 0.0}}
  ],
  "quiz": [
    {{"id": 1, "question": "Practice question?", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_index": 0, "explanation": "Reasoning", "timestamp": 10.0}}
  ]
}}
Do not hallucinate. Do not include markdown code fences around the JSON. Return only the JSON object.
"""

        async with httpx.AsyncClient(timeout=180.0) as client:
            resp = await client.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": model_name,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False
                }
            )
            if resp.status_code == 200:
                body = resp.json().get("response", "{}")
                data = json.loads(body)
                # Ensure mindmap exists
                if "mindmap" not in data or not data["mindmap"].get("nodes"):
                    local_res = self._synthesize_with_local_nlp(title, transcript_data, keyframes)
                    data["mindmap"] = local_res["mindmap"]
                return data

        raise RuntimeError("Ollama returned non-200 response")

    async def answer_question(
        self,
        question: str,
        transcript_data: Dict[str, Any],
        keyframes: List[Dict[str, Any]],
        notes: str
    ) -> Dict[str, Any]:
        """
        Answers a student's question grounded strictly in the lecture's audio and visual content.
        Includes timestamp citations.
        """
        q_lower = question.lower()
        segments = transcript_data.get("segments", [])

        # Find matching segments by keyword overlap
        matched_segs = []
        q_words = [w for w in re.findall(r'\w+', q_lower) if len(w) > 2]
        for seg in segments:
            score = sum(1 for w in q_words if w in seg["text"].lower())
            if score > 0:
                matched_segs.append((score, seg))

        matched_segs.sort(key=lambda x: x[0], reverse=True)
        top_segs = [s[1] for s in matched_segs[:5]]
        timestamps = [s["start"] for s in top_segs]

        # Check keyframe OCR text matches
        matched_kfs = []
        for kf in keyframes:
            ocr = kf.get("ocr_text", "").lower()
            if any(w in ocr for w in q_words):
                matched_kfs.append(kf)
                if kf["timestamp"] not in timestamps:
                    timestamps.append(kf["timestamp"])

        timestamps.sort()

        # Check if Ollama is available for natural generation
        ollama_status = await self.get_ollama_status()
        if ollama_status["available"] and ollama_status["recommended_model"]:
            try:
                context_str = "Relevant Transcript Segments:\n"
                for s in top_segs:
                    context_str += f"[{int(s['start'])}s]: {s['text']}\n"
                context_str += "\nRelevant Visual Slides:\n"
                for k in matched_kfs[:3]:
                    context_str += f"[{int(k['timestamp'])}s]: {k.get('ocr_text', '')}\n"

                llm_prompt = f"""You are MffConvert's grounded study assistant.
Answer the user's question using ONLY the provided lecture context.
Structure your answer with two explicit sections:
### From the Video
(Direct facts, citations, and exact timestamps from the lecture speech and visual slides)

### Additional Explanation
(Clear educational explanation in simpler words, without pretending it was directly stated in the video)

Always include specific timestamp references like [01:23] for any fact or step mentioned.

Lecture Context:
{context_str}

User Question: {question}
Answer:"""

                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(
                        f"{self.ollama_url}/api/generate",
                        json={
                            "model": ollama_status["recommended_model"],
                            "prompt": llm_prompt,
                            "stream": False
                        }
                    )
                    if resp.status_code == 200:
                        ans_text = resp.json().get("response", "").strip()
                        return {
                            "answer": ans_text,
                            "timestamps": timestamps[:4],
                            "grounded": True,
                            "model_used": ollama_status["recommended_model"]
                        }
            except Exception as e:
                logger.warning(f"Ollama chat generation failed: {e}")

        # High-grade deterministic grounded fallback answer
        if top_segs or matched_kfs:
            video_citations = []
            for s in top_segs[:3]:
                min_s = int(s["start"] // 60)
                sec_s = int(s["start"] % 60)
                video_citations.append(f"- At `[{min_s:02d}:{sec_s:02d}]`, the instructor states: *\"{s['text']}\"*")
            for k in matched_kfs[:2]:
                video_citations.append(f"- At visual timestamp `[{int(k['timestamp'])}s]`, the slide presents: *{k.get('ocr_text', '').replace(chr(10), ' ')}*")

            ans_text = "### From the Video\n" + "\n".join(video_citations) + "\n\n### Additional Explanation\nThis section addresses your question based on the synthesized lecture notes and visual formulas. Click any timestamp pill above to jump the synchronized video to the exact lecture moment."
        else:
            ans_text = "### From the Video\nThis specific question was not confidently detected in the lecture audio or visual slides.\n\n### Additional Explanation\nTry searching for specific keywords or concepts mentioned by the instructor in the Find Anything tab."

        return {
            "answer": ans_text,
            "timestamps": timestamps[:4],
            "grounded": len(top_segs) > 0 or len(matched_kfs) > 0,
            "model_used": "Local Heuristic Engine"
        }
