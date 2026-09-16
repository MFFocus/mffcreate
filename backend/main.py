"""
FastAPI Backend Application for MffConvert.
100% Free, Local-First, Zero API Keys, Open-Source Video Study Assistant.
"""

import os
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, PlainTextResponse, HTMLResponse
from pydantic import BaseModel

import time
import threading
from database import (
    create_project, update_project_progress, update_project_media,
    get_project, list_projects, delete_project,
    get_completed_project_by_url_hash, get_active_project_by_url_hash,
    update_job_stage,
    save_transcript, get_transcript,
    save_keyframes, get_keyframes,
    save_study_materials, get_study_materials,
    save_chat_message, get_chat_history
)
from services.downloader import MediaDownloader, extract_canonical_id
from services.media_processor import MediaProcessor, cleanup_temp_media
from services.transcriber import SpeechTranscriber
from services.frame_extractor import KeyframeExtractor
from services.ocr_engine import VisualOCREngine
from services.ai_service import AIService
from services.search_engine import SearchEngine
from services.export_service import ExportService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mffconvert")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = DATA_DIR / "projects"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# Concurrency semaphore: max 2 active multimodal processing pipelines concurrently
JOB_SEMAPHORE = threading.Semaphore(2)

app = FastAPI(
    title="MffConvert API",
    description="Free and local-first AI educational video study tool",
    version="1.0.0"
)

# Configurable CORS for local development and Netlify deployment
allowed_origins_raw = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
)
allowed_origins = [orig.strip() for orig in allowed_origins_raw.split(",") if orig.strip() and not orig.strip().startswith("https://*")]

# Support Netlify subdomain deployments via regex (e.g., https://*.netlify.app)
origin_regex = os.environ.get("CORS_ORIGIN_REGEX", r"^https://([a-zA-Z0-9_-]+\.)*netlify\.app$")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Health check endpoint for frontend connection status."""
    return {
        "status": "ok",
        "service": "mffconvert-backend",
        "version": "1.0.0",
        "engine": "local"
    }

# Static files for keyframe images and local videos
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

# Services
downloader = MediaDownloader(MEDIA_DIR)
processor = MediaProcessor()
transcriber = SpeechTranscriber(model_size="base")
frame_extractor = KeyframeExtractor(MEDIA_DIR)
ocr_engine = VisualOCREngine()
ai_service = AIService()

# Request schemas
class URLProcessRequest(BaseModel):
    url: str
    title: Optional[str] = None
    whisper_model: Optional[str] = "base"
    llm_model: Optional[str] = None

class JobCreateRequest(BaseModel):
    url: str
    title: Optional[str] = None
    whisper_model: Optional[str] = "base"
    llm_model: Optional[str] = None

class ChatRequest(BaseModel):
    message: str

def parse_vtt_subtitles(vtt_path: str) -> Optional[Dict[str, Any]]:
    """Parses downloaded YouTube VTT subtitles to accelerate speech transcription by 100x."""
    try:
        import re
        segments = []
        full_text_parts = []
        with open(vtt_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        ts_regex = re.compile(r'(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})')
        cur_start = None
        cur_end = None
        cur_text = []
        seg_id = 0

        for line in lines:
            line_str = line.strip()
            match = ts_regex.search(line_str)
            if match:
                if cur_start is not None and cur_text:
                    txt = " ".join(cur_text).strip()
                    if txt:
                        segments.append({"id": seg_id, "start": cur_start, "end": cur_end, "text": txt, "confidence": 0.98})
                        full_text_parts.append(txt)
                        seg_id += 1
                    cur_text = []
                h1, m1, s1, ms1 = map(int, match.groups()[:4])
                h2, m2, s2, ms2 = map(int, match.groups()[4:])
                cur_start = round(h1 * 3600 + m1 * 60 + s1 + ms1 / 1000.0, 2)
                cur_end = round(h2 * 3600 + m2 * 60 + s2 + ms2 / 1000.0, 2)
            elif cur_start is not None and line_str and not line_str.startswith("WEBVTT") and not line_str.isdigit():
                clean = re.sub(r'<[^>]+>', '', line_str)
                if clean and clean not in cur_text:
                    cur_text.append(clean)

        if cur_start is not None and cur_text:
            txt = " ".join(cur_text).strip()
            if txt:
                segments.append({"id": seg_id, "start": cur_start, "end": cur_end, "text": txt, "confidence": 0.98})
                full_text_parts.append(txt)

        if segments:
            logger.info(f"Successfully extracted {len(segments)} timestamped segments from YouTube subtitles.")
            return {
                "language": "en",
                "duration": segments[-1]["end"],
                "segments": segments,
                "full_text": " ".join(full_text_parts),
                "transcribe_sec": 0.1
            }
    except Exception as e:
        logger.warning(f"Failed to parse VTT subtitles: {e}")
    return None

def run_processing_pipeline(project_id: str, source_type: str, source_val: str, whisper_model: str = "base", llm_model: Optional[str] = None):
    """
    Background worker that runs all multimodal stages with concurrency control & timing metrics:
    queued -> downloading -> extracting -> transcribing -> analyzing_visuals -> reading_text
    -> generating_notes -> generating_questions -> generating_flashcards -> finalizing -> completed
    """
    acquired = False
    pipeline_start = time.time()
    metrics = {
        "download_sec": 0.0,
        "audio_sec": 0.0,
        "transcribe_sec": 0.0,
        "visual_sec": 0.0,
        "ocr_sec": 0.0,
        "ai_sec": 0.0,
        "total_sec": 0.0
    }

    try:
        update_job_stage(project_id, "queued", "Queued for processing...", 2)
        JOB_SEMAPHORE.acquire()
        acquired = True

        # Phase 1: Downloading
        update_job_stage(project_id, "downloading", "Acquiring video stream...", 8)
        subtitle_path = None
        if source_type == "url":
            media_info = downloader.download_url(
                source_val,
                project_id,
                progress_callback=lambda pct: update_job_stage(project_id, "downloading", f"Acquiring video ({pct}%)...", int(8 + pct * 0.12))
            )
            video_path = media_info["video_path"]
            title = media_info["title"]
            duration = media_info["duration"]
            subtitle_path = media_info.get("subtitle_path")
            metrics["download_sec"] = media_info.get("download_sec", 0.0)
        else: # local file
            video_path = source_val
            duration = processor.get_duration(video_path)
            title = Path(video_path).stem.replace("_", " ").title()

        update_project_media(project_id, title=title, duration=duration, video_path=video_path)

        # Phase 2: Audio Extraction
        audio_start = time.time()
        update_job_stage(project_id, "extracting", "Extracting high-clarity audio...", 22)
        audio_wav = str(MEDIA_DIR / project_id / "audio_16k.wav")
        processor.extract_audio(video_path, audio_wav)
        update_project_media(project_id, audio_path=audio_wav)
        metrics["audio_sec"] = round(time.time() - audio_start, 2)

        # Phase 3: Speech Recognition & Alignment
        update_job_stage(project_id, "transcribing", "Understanding speech & timestamps...", 28)
        trans_result = None
        if subtitle_path and Path(subtitle_path).exists():
            trans_result = parse_vtt_subtitles(subtitle_path)

        if not trans_result:
            local_transcriber = SpeechTranscriber(model_size=whisper_model)
            trans_result = local_transcriber.transcribe(
                audio_wav,
                progress_callback=lambda pct: update_job_stage(project_id, "transcribing", f"Understanding speech ({pct}%)...", int(28 + pct * 0.26))
            )

        save_transcript(project_id, trans_result["full_text"], trans_result["segments"])
        metrics["transcribe_sec"] = trans_result.get("transcribe_sec", 0.0)

        # Phase 4: Keyframe scene & visual detection
        v_start = time.time()
        update_job_stage(project_id, "analyzing_visuals", "Reading slides & visual transitions...", 56)
        keyframes = frame_extractor.extract_keyframes(
            video_path,
            project_id,
            progress_callback=lambda pct: update_job_stage(project_id, "analyzing_visuals", f"Reading slides ({pct}%)...", int(56 + pct * 0.16))
        )
        metrics["visual_sec"] = round(time.time() - v_start, 2)

        # Phase 5: Visual content & formula detection (OCR)
        ocr_start = time.time()
        update_job_stage(project_id, "reading_text", "Recognizing formulas & slide text...", 72)
        enriched_keyframes = ocr_engine.process_keyframes(
            keyframes,
            progress_callback=lambda pct: update_job_stage(project_id, "reading_text", f"Recognizing slide text ({pct}%)...", int(72 + pct * 0.12))
        )
        save_keyframes(project_id, enriched_keyframes)
        metrics["ocr_sec"] = round(time.time() - ocr_start, 2)

        # Phase 6: Study workspace synthesis
        update_job_stage(project_id, "generating_notes", "Synthesizing deep notes with LaTeX...", 85)

        def stage_callback(stage_name, stage_label, pct):
            update_job_stage(project_id, stage_name, stage_label, pct)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        study_materials = loop.run_until_complete(
            ai_service.generate_study_materials(
                title,
                trans_result,
                enriched_keyframes,
                model_name=llm_model,
                stage_callback=stage_callback
            )
        )
        loop.close()

        save_study_materials(project_id, study_materials)
        metrics["ai_sec"] = study_materials.get("ai_sec", 0.0)

        # Phase 7: Finalizing & Media Cleanup
        update_job_stage(project_id, "finalizing", "Finalizing study workspace...", 98)
        cleanup_temp_media(MEDIA_DIR, project_id, keep_video=(source_type == "upload"))

        # Finished!
        metrics["total_sec"] = round(time.time() - pipeline_start, 2)
        update_job_stage(project_id, "completed", "Study workspace ready!", 100, metrics=metrics)
        logger.info(f"Pipeline successfully completed for project {project_id} in {metrics['total_sec']}s (Metrics: {metrics})")

    except Exception as e:
        logger.exception(f"Pipeline failed for project {project_id}: {e}")
        # Clean user-facing error message without internal traces
        err_msg = str(e)
        if "exceeds the maximum allowed limit" in err_msg:
            friendly_err = err_msg
        elif "Could not access or download" in err_msg:
            friendly_err = "The video could not be accessed. Please check if the video is public and available."
        else:
            friendly_err = f"Unable to process video: {err_msg}"
        update_job_stage(project_id, "failed", friendly_err, 0, error=err_msg, metrics=metrics)

    finally:
        if acquired:
            JOB_SEMAPHORE.release()

@app.get("/api/system/status")
async def get_system_status():
    """Returns local AI availability and runtime status."""
    ollama_info = await ai_service.get_ollama_status()
    return {
        "status": "online",
        "zero_cost": True,
        "privacy_mode": "100% Local Machine",
        "ollama": ollama_info,
        "default_engine": "Ollama LLM" if ollama_info["available"] else "Local Multimodal Heuristic Engine"
    }

@app.post("/api/jobs")
def create_job(req: JobCreateRequest, background_tasks: BackgroundTasks):
    """
    Submits a video URL for processing.
    Includes instant deduplication: if this video has already been processed, returns immediately!
    """
    url_clean = req.url.strip()
    url_hash = extract_canonical_id(url_clean)

    # 1. Check if already completed -> Return immediately!
    if url_hash:
        completed = get_completed_project_by_url_hash(url_hash)
        if completed:
            logger.info(f"Cache hit for URL hash {url_hash}: returning completed project {completed['id']}")
            return {
                "job_id": completed["id"],
                "project_id": completed["id"],
                "status": "completed",
                "cached": True,
                "title": completed["title"]
            }

        # 2. Check if currently active/processing -> Attach to existing job
        active = get_active_project_by_url_hash(url_hash)
        if active:
            logger.info(f"Attaching to active job {active['id']} for URL hash {url_hash}")
            return {
                "job_id": active["id"],
                "project_id": active["id"],
                "status": active["status"],
                "cached": False,
                "title": active["title"]
            }

    # 3. Create new job
    project_id = str(uuid.uuid4())[:8]
    title = req.title or "Processing Lecture..."
    create_project(project_id, title, "url", source_url=url_clean, source_url_hash=url_hash)

    background_tasks.add_task(
        run_processing_pipeline,
        project_id,
        "url",
        url_clean,
        whisper_model=req.whisper_model or "base",
        llm_model=req.llm_model
    )
    return {
        "job_id": project_id,
        "project_id": project_id,
        "status": "queued",
        "cached": False
    }

@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str):
    """Retrieves status, fine-grained stage, progress %, and timing metrics for a job."""
    proj = get_project(job_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": proj["id"],
        "project_id": proj["id"],
        "title": proj["title"],
        "status": proj["status"],
        "stage": proj["stage"],
        "progress_pct": proj["progress_pct"],
        "error": proj.get("error"),
        "duration": proj.get("duration", 0),
        "metrics": proj.get("metrics"),
        "created_at": proj["created_at"]
    }

@app.post("/api/process/url")
def process_url(req: URLProcessRequest, background_tasks: BackgroundTasks):
    """Backwards-compatible video URL submission with deduplication."""
    return create_job(JobCreateRequest(
        url=req.url,
        title=req.title,
        whisper_model=req.whisper_model,
        llm_model=req.llm_model
    ), background_tasks)

@app.post("/api/process/upload")
async def process_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    whisper_model: str = Form("base"),
    llm_model: Optional[str] = Form(None)
):
    """Uploads a local educational lecture file."""
    project_id = str(uuid.uuid4())[:8]
    proj_dir = MEDIA_DIR / project_id
    proj_dir.mkdir(parents=True, exist_ok=True)

    dest_file = proj_dir / file.filename
    with open(dest_file, "wb") as f:
        content = await file.read()
        f.write(content)

    title = Path(file.filename).stem.replace("_", " ").title()
    create_project(project_id, title, "upload", video_path=str(dest_file))

    background_tasks.add_task(
        run_processing_pipeline,
        project_id,
        "upload",
        str(dest_file),
        whisper_model=whisper_model,
        llm_model=llm_model
    )
    return {"project_id": project_id, "job_id": project_id, "status": "queued"}

@app.get("/api/projects")
def get_all_projects():
    """Lists all stored lectures."""
    return list_projects()

@app.get("/api/projects/{project_id}")
def get_project_details(project_id: str):
    """Retrieves current progress and status for a project."""
    proj = get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return proj

@app.delete("/api/projects/{project_id}")
def delete_lecture(project_id: str):
    """Deletes a lecture project and its files."""
    proj = get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Lecture not found")
    delete_project(project_id)
    proj_dir = MEDIA_DIR / project_id
    if proj_dir.exists():
        import shutil
        shutil.rmtree(proj_dir, ignore_errors=True)
    return {"deleted": True}

@app.get("/api/projects/{project_id}/transcript")
def get_project_transcript(project_id: str):
    data = get_transcript(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Transcript not ready yet")
    return data

@app.get("/api/projects/{project_id}/keyframes")
def get_project_keyframes(project_id: str):
    return get_keyframes(project_id)

@app.get("/api/projects/{project_id}/study")
def get_project_study(project_id: str):
    data = get_study_materials(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Study materials not generated yet")
    return data

@app.post("/api/projects/{project_id}/chat")
async def chat_with_lecture(project_id: str, req: ChatRequest):
    """Grounded AI study chat."""
    trans_data = get_transcript(project_id) or {"segments": []}
    kfs = get_keyframes(project_id)
    study = get_study_materials(project_id) or {}

    save_chat_message(project_id, "user", req.message, [])
    response = await ai_service.answer_question(
        req.message,
        trans_data,
        kfs,
        study.get("deep_notes", "")
    )
    save_chat_message(project_id, "assistant", response["answer"], response["timestamps"])
    return response

@app.get("/api/projects/{project_id}/chat/history")
def get_lecture_chat_history(project_id: str):
    return get_chat_history(project_id)

@app.get("/api/projects/{project_id}/search")
def search_lecture(
    project_id: str,
    q: str = Query(..., min_length=1),
    filter: Optional[str] = Query("all")
):
    """Unified 'Find Anything' across speech, slides, formulas, questions."""
    trans_data = get_transcript(project_id)
    kfs = get_keyframes(project_id)
    study = get_study_materials(project_id)
    return SearchEngine.search(q, trans_data, kfs, study, source_filter=filter)

@app.get("/api/projects/{project_id}/export/{export_format}")
def export_materials(project_id: str, export_format: str):
    proj = get_project(project_id)
    study = get_study_materials(project_id)
    if not proj or not study:
        raise HTTPException(status_code=404, detail="Study material not ready for export")

    if export_format == "markdown":
        md = ExportService.to_markdown(proj, study)
        return PlainTextResponse(md, media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename=study_notes_{project_id}.md"})
    elif export_format == "html":
        html = ExportService.to_printable_html(proj, study)
        return HTMLResponse(html)
    elif export_format == "anki":
        csv_data = ExportService.to_anki_csv(study)
        return PlainTextResponse(csv_data, media_type="text/tab-separated-values", headers={"Content-Disposition": f"attachment; filename=flashcards_{project_id}.tsv"})
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format. Use 'markdown', 'html', or 'anki'.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
