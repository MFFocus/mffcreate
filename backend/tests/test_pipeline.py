"""
Comprehensive Integration Tests for MffConvert Backend Pipeline.
Validates:
- Database CRUD
- Bundled FFmpeg detection
- Visual OCR frame classification
- Local AI multimodal study synthesis
- Unified 'Find Anything' search engine
- Markdown, HTML, and Anki export formats
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from database import (
    create_project, get_project, update_project_progress,
    save_transcript, get_transcript,
    save_keyframes, get_keyframes,
    save_study_materials, get_study_materials,
    delete_project
)
from services.media_processor import MediaProcessor
from services.ocr_engine import VisualOCREngine
from services.ai_service import AIService
from services.search_engine import SearchEngine
from services.export_service import ExportService

def test_database_lifecycle():
    proj_id = "test1234"
    create_project(proj_id, "Calculus: Fundamentals of Integration", "url", source_url="https://youtube.com/watch?v=sample")
    proj = get_project(proj_id)
    assert proj is not None
    assert proj["title"] == "Calculus: Fundamentals of Integration"

    update_project_progress(proj_id, "processing", "Transcribing...", 50)
    proj = get_project(proj_id)
    assert proj["progress_pct"] == 50
    assert proj["status"] == "processing"

    # Test transcript
    sample_segments = [
        {"id": 0, "start": 0.0, "end": 14.5, "text": "Welcome to today's lecture on integration and the fundamental theorem of calculus."},
        {"id": 1, "start": 15.0, "end": 28.0, "text": "Can we compute the exact area under the curve using Riemann sums?"},
        {"id": 2, "start": 29.0, "end": 42.0, "text": "The formula for integration is integral of f(x) dx equals F(b) minus F(a)."}
    ]
    save_transcript(proj_id, "Full transcript text...", sample_segments)
    t_data = get_transcript(proj_id)
    assert len(t_data["segments"]) == 3

    # Clean up
    delete_project(proj_id)
    assert get_project(proj_id) is None
    print("[PASS] test_database_lifecycle")

def test_ffmpeg_detection():
    processor = MediaProcessor()
    assert processor.ffmpeg_path is not None
    assert Path(processor.ffmpeg_path).exists() or processor.ffmpeg_path == "ffmpeg"
    print(f"[PASS] test_ffmpeg_detection: FFmpeg found at {processor.ffmpeg_path}")

def test_ocr_classification():
    ocr = VisualOCREngine()
    assert ocr.classify_frame("∫ f(x) dx = F(x) + C") == "formula"
    assert ocr.classify_frame("def calculate_integral(a, b):\n    return a + b") == "code"
    assert ocr.classify_frame("Overview of Course Objectives\nWeek 1: Limits\nWeek 2: Derivatives") == "slide"
    print("[PASS] test_ocr_classification")

def test_local_ai_synthesis():
    ai = AIService()
    transcript_data = {
        "duration": 180.0,
        "full_text": "Today we discuss the velocity of a particle. What is the velocity at t = 5 seconds? The formula for velocity is v = ds/dt. We integrate acceleration to find velocity.",
        "segments": [
            {"id": 0, "start": 0.0, "end": 20.0, "text": "Today we discuss the velocity of a particle."},
            {"id": 1, "start": 21.0, "end": 45.0, "text": "What is the velocity at t = 5 seconds?"},
            {"id": 2, "start": 46.0, "end": 80.0, "text": "The formula for velocity is v = ds/dt. We integrate acceleration to find velocity."}
        ]
    }
    keyframes = [
        {"timestamp": 10.0, "image_filename": "frame_001.jpg", "ocr_text": "Kinematics: Velocity and Acceleration", "frame_type": "slide", "visual_label": "Kinematics Title Slide"},
        {"timestamp": 50.0, "image_filename": "frame_002.jpg", "ocr_text": "v = \\frac{ds}{dt} = \\lim_{\\Delta t \\to 0} \\frac{\\Delta s}{\\Delta t}", "frame_type": "formula", "visual_label": "Derivative Definition"}
    ]

    study = ai._synthesize_with_local_nlp("Physics: Kinematics", transcript_data, keyframes)

    assert "deep_notes" in study and len(study["deep_notes"]) > 100
    assert "short_notes" in study
    assert len(study["chapters"]) >= 2
    assert len(study["formulas"]) >= 1
    assert len(study["questions"]) >= 1
    assert "nodes" in study["mindmap"] and len(study["mindmap"]["nodes"]) >= 2
    assert len(study["flashcards"]) >= 2
    assert len(study["quiz"]) >= 2
    print(f"[PASS] test_local_ai_synthesis: Generated {len(study['chapters'])} chapters, {len(study['formulas'])} formulas, {len(study['questions'])} questions, {len(study['quiz'])} quiz items")

def test_unified_search():
    transcript_data = {
        "segments": [
            {"id": 0, "start": 12.0, "text": "Let us solve the problem about velocity."},
            {"id": 1, "start": 45.0, "text": "Now consider recursion in computer science."}
        ]
    }
    keyframes = [
        {"timestamp": 12.0, "image_filename": "f1.jpg", "ocr_text": "Kinematics diagram of particle motion", "frame_type": "diagram", "visual_label": "Motion Diagram"}
    ]
    study = {
        "formulas": [{"id": 1, "name": "Velocity Formula", "latex": "v = ds/dt", "explanation": "Rate of change of position", "timestamp": 14.0}],
        "questions": [{"id": 1, "question": "What is the velocity?", "solution": "Derivative of position", "timestamp": 12.0}]
    }

    # Test formula query
    res1 = SearchEngine.search("show all formulas", transcript_data, keyframes, study)
    assert len(res1) > 0
    assert any(r["source_type"] == "formula" for r in res1)

    # Test question query
    res2 = SearchEngine.search("Find every question about velocity", transcript_data, keyframes, study)
    assert len(res2) > 0
    assert any(r["source_type"] == "question" for r in res2)

    # Test diagram query
    res3 = SearchEngine.search("Find every diagram", transcript_data, keyframes, study)
    assert len(res3) > 0
    assert any(r["source_type"] == "diagram" for r in res3)

    print("[PASS] test_unified_search for formulas, questions, and diagrams")

def test_export_service():
    project = {"title": "Kinematics 101", "duration": 120.0}
    study = {
        "deep_notes": "# Kinematics Deep Notes\nDetails here...",
        "chapters": [{"title": "Introduction", "start_time": 0.0, "summary": "Intro to physics"}],
        "formulas": [{"name": "Velocity", "latex": "v = d/t", "explanation": "Speed in direction", "timestamp": 10.0}],
        "questions": [{"question": "What is velocity?", "solution": "Speed in direction", "timestamp": 10.0}],
        "flashcards": [{"front": "Velocity Definition", "back": "Displacement over time", "tag": "Physics"}]
    }

    md = ExportService.to_markdown(project, study)
    assert "# Kinematics 101" in md
    assert "Velocity" in md

    html = ExportService.to_printable_html(project, study)
    assert "<!DOCTYPE html>" in html
    assert "Kinematics 101" in html

    csv_data = ExportService.to_anki_csv(study)
    assert "Velocity Definition\tDisplacement over time\tPhysics" in csv_data

    print("[PASS] test_export_service for Markdown, HTML, and Anki CSV")

def test_url_canonicalization_and_caching():
    from services.downloader import extract_canonical_id
    from database import (
        create_project, get_completed_project_by_url_hash,
        get_active_project_by_url_hash, update_job_stage, delete_project
    )

    # 1. Canonical ID extraction
    url1 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&feature=share"
    url2 = "https://youtu.be/dQw4w9WgXcQ"
    url3 = "https://youtube.com/shorts/dQw4w9WgXcQ"
    assert extract_canonical_id(url1) == "yt:dQw4w9WgXcQ"
    assert extract_canonical_id(url2) == "yt:dQw4w9WgXcQ"
    assert extract_canonical_id(url3) == "yt:dQw4w9WgXcQ"

    # 2. Deduplication query verification
    hash_key = extract_canonical_id(url1)
    p_id = "cachetest1"
    create_project(p_id, "Rickroll Lecture", "url", source_url=url1, source_url_hash=hash_key)

    # In progress
    assert get_completed_project_by_url_hash(hash_key) is None
    active = get_active_project_by_url_hash(hash_key)
    assert active is not None
    assert active["id"] == p_id

    # Mark completed with timing metrics
    metrics = {"download_sec": 1.2, "transcribe_sec": 3.4, "visual_sec": 2.1, "total_sec": 7.5}
    update_job_stage(p_id, "completed", "Done", 100, metrics=metrics)

    completed = get_completed_project_by_url_hash(hash_key)
    assert completed is not None
    assert completed["id"] == p_id
    assert completed["metrics"] is not None
    assert completed["metrics"]["total_sec"] == 7.5

    delete_project(p_id)
    print("[PASS] test_url_canonicalization_and_caching")

def test_perceptual_hashing():
    import numpy as np
    from services.frame_extractor import compute_dhash, hamming_distance

    # Create two identical frames
    frame1 = np.zeros((90, 160), dtype=np.uint8)
    frame1[20:70, 40:120] = 200 # White rectangle

    frame2 = frame1.copy()
    # Identical hashes
    h1 = compute_dhash(frame1)
    h2 = compute_dhash(frame2)
    assert hamming_distance(h1, h2) == 0

    # Slightly modified frame (small cursor dot)
    frame3 = frame1.copy()
    frame3[5, 5] = 255
    h3 = compute_dhash(frame3)
    assert hamming_distance(h1, h3) <= 2 # Low distance

    # Completely different frame
    frame4 = np.zeros((90, 160), dtype=np.uint8)
    frame4[:, 80:] = 255
    h4 = compute_dhash(frame4)
    assert hamming_distance(h1, h4) >= 8 # Significant distance

    print("[PASS] test_perceptual_hashing (dHash & Hamming Distance)")

def test_media_cleanup():
    from services.media_processor import cleanup_temp_media
    test_dir = backend_dir / "data" / "test_cleanup"
    p_dir = test_dir / "proj_clean"
    p_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = p_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    # Create dummy video, audio, and keyframe
    vid = p_dir / "video.mp4"
    vid.write_bytes(b"0" * 1024 * 100) # 100KB dummy video
    aud = p_dir / "audio_16k.wav"
    aud.write_bytes(b"0" * 1024 * 50) # 50KB dummy audio
    kf = frames_dir / "frame_000_1s.jpg"
    kf.write_bytes(b"dummy image data")

    reclaimed = cleanup_temp_media(test_dir, "proj_clean", keep_video=False)
    assert reclaimed >= 1024 * 150
    assert not vid.exists()
    assert not aud.exists()
    assert kf.exists() # Keyframe preserved!

    # Clean up test dir
    import shutil
    shutil.rmtree(test_dir, ignore_errors=True)
    print("[PASS] test_media_cleanup (large video/audio pruned, slide images preserved)")

if __name__ == "__main__":
    print("\n--- RUNNING MFFCONVERT BACKEND INTEGRATION TESTS ---")
    test_database_lifecycle()
    test_ffmpeg_detection()
    test_ocr_classification()
    test_local_ai_synthesis()
    test_unified_search()
    test_export_service()
    test_url_canonicalization_and_caching()
    test_perceptual_hashing()
    test_media_cleanup()
    print("ALL TESTS PASSED SUCCESSFULLY! [OK]\n")
