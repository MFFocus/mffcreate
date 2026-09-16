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

def test_error_classification_and_codes():
    from services.downloader import (
        classify_yt_error, YouTubeBotCheckError, VideoPrivateError,
        VideoUnavailableError, VideoAgeRestrictedError, VideoRegionRestrictedError,
        MediaAcquisitionError, VideoDurationLimitError
    )

    # 1. Bot check classification
    err1 = classify_yt_error("ERROR: [youtube] _AhNBAjbYNI: Sign in to confirm you’re not a bot. Use --cookies-from-browser or --cookies for the authentication.")
    assert isinstance(err1, YouTubeBotCheckError)
    assert err1.error_code == "YOUTUBE_BOT_CHECK"
    assert "temporarily limiting automated access" in err1.user_message

    # 1b. Regression: Failed to extract any player response (Render failure)
    err1b = classify_yt_error("ERROR: [youtube] I8XaYkRW1tA: Failed to extract any player response")
    assert isinstance(err1b, YouTubeBotCheckError)
    assert err1b.error_code == "YOUTUBE_BOT_CHECK"

    # 1c. Regression: IP blocked / all player responses invalid
    err1c = classify_yt_error("All player responses are invalid. Your IP is likely being blocked by Youtube")
    assert isinstance(err1c, YouTubeBotCheckError)
    assert err1c.error_code == "YOUTUBE_BOT_CHECK"

    # 2. Private video
    err2 = classify_yt_error("ERROR: [youtube] 12345: This video is private.")
    assert isinstance(err2, VideoPrivateError)
    assert err2.error_code == "VIDEO_PRIVATE"
    assert "set to private" in err2.user_message

    # 3. Unavailable video
    err3 = classify_yt_error("ERROR: [youtube] abcde: Video unavailable. This video has been removed by the uploader.")
    assert isinstance(err3, VideoUnavailableError)
    assert err3.error_code == "VIDEO_UNAVAILABLE"

    # 4. Age restricted
    err4 = classify_yt_error("ERROR: [youtube] xyz: Sign in to confirm your age. This video is age-restricted.")
    assert isinstance(err4, VideoAgeRestrictedError)
    assert err4.error_code == "VIDEO_AGE_RESTRICTED"

    # 5. Region restricted
    err5 = classify_yt_error("ERROR: [youtube] 999: This video is not available in your country.")
    assert isinstance(err5, VideoRegionRestrictedError)
    assert err5.error_code == "VIDEO_REGION_RESTRICTED"

    # 6. Generic download error
    err6 = classify_yt_error("ERROR: Network socket timeout during connection")
    assert isinstance(err6, MediaAcquisitionError)
    assert err6.error_code == "DOWNLOAD_FAILED"

    # 7. Duration limit
    err7 = VideoDurationLimitError(3.5, 2.5)
    assert err7.error_code == "DURATION_EXCEEDED"
    assert "3.5 hours" in err7.user_message

    print("[PASS] test_error_classification_and_codes")

def test_database_error_code_persistence():
    from database import create_project, get_project, update_job_stage, delete_project
    p_id = "err_test_1"
    create_project(p_id, "Error Test Lecture", "url", source_url="https://youtube.com/watch?v=err123")
    
    update_job_stage(p_id, "failed", "Friendly failure message", 0, error="Detailed internal error", error_code="YOUTUBE_BOT_CHECK")
    
    proj = get_project(p_id)
    assert proj is not None
    assert proj["status"] == "failed"
    assert proj["error"] == "Detailed internal error"
    assert proj["error_code"] == "YOUTUBE_BOT_CHECK"
    assert proj["stage"] == "Friendly failure message"
    
    delete_project(p_id)
    print("[PASS] test_database_error_code_persistence")

def test_downloader_fallback_extraction():
    from services.downloader import MediaDownloader
    dl = MediaDownloader(backend_dir / "data" / "projects")
    info = dl._extract_with_fallback({
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'nocheckcertificate': True,
        'socket_timeout': 20,
        'retries': 2,
    }, 'https://www.youtube.com/watch?v=I8XaYkRW1tA', download=False)
    assert info is not None
    assert info.get('duration') == 353
    assert 'direction' in info.get('title', '').lower()
    print("[PASS] test_downloader_fallback_extraction (retrieved video metadata reliably)")

def test_full_video_capabilities():
    from database import create_project, get_project, update_job_stage, update_project_media, delete_project
    p_id = "cap_full_vid"
    create_project(p_id, "Full Video Lecture", "url", video_path="/fake/path/video.mp4", media_status="video_available")
    update_job_stage(p_id, "completed", "Study workspace ready!", 100)
    
    proj = get_project(p_id)
    assert proj["media_status"] == "video_available"
    assert proj["capabilities"]["media_status"] == "video_available"
    assert proj["capabilities"]["video_available"] is True
    assert proj["capabilities"]["transcript_available"] is True
    assert proj["capabilities"]["visual_analysis_available"] is True
    
    delete_project(p_id)
    print("[PASS] test_full_video_capabilities")

def test_captions_only_fallback_and_capabilities():
    from database import (
        create_project, get_project, update_job_stage,
        save_transcript, save_keyframes, save_study_materials, delete_project
    )
    from services.ai_service import AIService
    p_id = "cap_only_test"
    create_project(p_id, "Captions Only Lecture", "url", media_status="captions_only")
    
    # 1. Verify capabilities before and after completion
    proj = get_project(p_id)
    assert proj["media_status"] == "captions_only"
    assert proj["capabilities"]["video_available"] is False
    assert proj["capabilities"]["visual_analysis_available"] is False

    # 2. Emulate captions-only pipeline: transcript exists, keyframes are explicitly empty
    sample_segments = [
        {"id": 0, "start": 0.0, "end": 10.0, "text": "Welcome to quantum computing fundamentals."},
        {"id": 1, "start": 11.0, "end": 25.0, "text": "A qubit can exist in superposition state alpha |0> + beta |1>."},
        {"id": 2, "start": 26.0, "end": 45.0, "text": "What is quantum entanglement? When particles cannot be described independently."}
    ]
    transcript_data = {
        "duration": 45.0,
        "full_text": " ".join(s["text"] for s in sample_segments),
        "segments": sample_segments
    }
    save_transcript(p_id, transcript_data["full_text"], sample_segments)
    save_keyframes(p_id, []) # Honest: empty keyframes in captions_only mode

    # 3. AI synthesis from transcript without fabricating visuals
    ai = AIService()
    study = ai._synthesize_with_local_nlp("Quantum Computing", transcript_data, [])
    save_study_materials(p_id, study)
    update_job_stage(p_id, "completed", "Study workspace ready!", 100)

    proj_completed = get_project(p_id)
    assert proj_completed["status"] == "completed"
    assert proj_completed["media_status"] == "captions_only"
    assert proj_completed["capabilities"] == {
        "media_status": "captions_only",
        "video_available": False,
        "transcript_available": True,
        "visual_analysis_available": False
    }
    assert len(study["chapters"]) >= 1
    assert len(study["questions"]) >= 1

    delete_project(p_id)
    print("[PASS] test_captions_only_fallback_and_capabilities")

def test_youtube_bot_check_restriction():
    from services.downloader import classify_yt_error, YouTubeBotCheckError
    from database import create_project, get_project, update_job_stage, delete_project

    err = classify_yt_error("ERROR: [youtube] 12345: Sign in to confirm you’re not a bot. Use --cookies-from-browser")
    assert isinstance(err, YouTubeBotCheckError)
    assert err.error_code == "YOUTUBE_BOT_CHECK"
    assert "temporarily limiting automated access" in err.user_message

    p_id = "bot_check_test"
    create_project(p_id, "Blocked Lecture", "url")
    update_job_stage(p_id, "failed", err.user_message, 0, error=str(err), error_code=err.error_code)

    proj = get_project(p_id)
    assert proj["status"] == "failed"
    assert proj["error_code"] == "YOUTUBE_BOT_CHECK"
    assert proj["capabilities"] == {
        "media_status": "failed",
        "video_available": False,
        "transcript_available": False,
        "visual_analysis_available": False
    }

    delete_project(p_id)
    print("[PASS] test_youtube_bot_check_restriction")

def test_private_video_error():
    from services.downloader import MediaDownloader, VideoPrivateError
    from unittest.mock import patch

    dl = MediaDownloader(backend_dir / "data" / "projects")
    with patch.object(dl, "_extract_with_fallback", side_effect=Exception("ERROR: [youtube] abc: This video is private.")):
        try:
            dl.download_url("https://www.youtube.com/watch?v=private123", "proj_priv")
            assert False, "Should have raised VideoPrivateError"
        except VideoPrivateError as e:
            assert e.error_code == "VIDEO_PRIVATE"
            assert "private" in e.user_message.lower()
    print("[PASS] test_private_video_error")

def test_unavailable_video_error():
    from services.downloader import MediaDownloader, VideoUnavailableError
    from unittest.mock import patch

    dl = MediaDownloader(backend_dir / "data" / "projects")
    with patch.object(dl, "_extract_with_fallback", side_effect=Exception("ERROR: [youtube] abc: Video unavailable. This video has been removed.")):
        try:
            dl.download_url("https://www.youtube.com/watch?v=unavail123", "proj_unavail")
            assert False, "Should have raised VideoUnavailableError"
        except VideoUnavailableError as e:
            assert e.error_code == "VIDEO_UNAVAILABLE"
            assert "unavailable" in e.user_message.lower()
    print("[PASS] test_unavailable_video_error")

def test_no_caption_no_video_failure():
    from services.downloader import MediaDownloader, YouTubeBotCheckError
    from unittest.mock import patch

    dl = MediaDownloader(backend_dir / "data" / "projects")
    # Simulate both video download bot error AND metadata having no captions
    with patch.object(dl, "_extract_with_fallback") as mock_extract:
        # Call 1 (pre-check): basic metadata
        # Call 2 (full download): bot check failure
        # Call 3 (caption fallback): metadata without subtitles
        mock_extract.side_effect = [
            {"title": "No Captions Video", "duration": 120},
            Exception("ERROR: [youtube] test: Sign in to confirm you’re not a bot."),
            {"title": "No Captions Video", "duration": 120, "subtitles": {}, "automatic_captions": {}}
        ]
        try:
            dl.download_url("https://www.youtube.com/watch?v=nocaptions", "proj_nocap")
            assert False, "Should have raised YouTubeBotCheckError"
        except YouTubeBotCheckError as e:
            assert e.error_code == "YOUTUBE_BOT_CHECK"
            assert "temporarily limiting automated access" in e.user_message
    print("[PASS] test_no_caption_no_video_failure")

def test_failed_player_response_regression():
    from services.downloader import classify_yt_error, YouTubeBotCheckError

    err1 = classify_yt_error("ERROR: [youtube] I8XaYkRW1tA: Failed to extract any player response")
    assert isinstance(err1, YouTubeBotCheckError)
    assert err1.error_code == "YOUTUBE_BOT_CHECK"

    err2 = classify_yt_error("ERROR: [youtube] All player responses are invalid. Your IP is likely being blocked by Youtube")
    assert isinstance(err2, YouTubeBotCheckError)
    assert err2.error_code == "YOUTUBE_BOT_CHECK"

    print("[PASS] test_failed_player_response_regression")

def test_real_caption_extraction():
    from services.downloader import MediaDownloader
    import shutil

    dl = MediaDownloader(backend_dir / "data" / "projects")
    p_id = "real_cap_test"
    try:
        res = dl.extract_captions("https://www.youtube.com/watch?v=I8XaYkRW1tA", p_id)
        assert res["has_video"] is False
        assert res["media_status"] == "captions_only"
        assert res["subtitle_path"] is not None
        assert Path(res["subtitle_path"]).exists()
        assert Path(res["subtitle_path"]).stat().st_size > 100
        print(f"[PASS] test_real_caption_extraction: Successfully extracted {Path(res['subtitle_path']).stat().st_size} bytes of WebVTT captions")
    finally:
        p_dir = backend_dir / "data" / "projects" / p_id
        if p_dir.exists():
            shutil.rmtree(p_dir)

if __name__ == "__main__":
    print("\n--- RUNNING MFFCONVERT BACKEND INTEGRATION & REGRESSION TESTS ---")
    test_database_lifecycle()
    test_ffmpeg_detection()
    test_ocr_classification()
    test_local_ai_synthesis()
    test_unified_search()
    test_export_service()
    test_url_canonicalization_and_caching()
    test_perceptual_hashing()
    test_media_cleanup()
    test_error_classification_and_codes()
    test_database_error_code_persistence()
    test_downloader_fallback_extraction()
    # 7 Critical Scenarios
    test_full_video_capabilities()
    test_captions_only_fallback_and_capabilities()
    test_youtube_bot_check_restriction()
    test_private_video_error()
    test_unavailable_video_error()
    test_no_caption_no_video_failure()
    test_failed_player_response_regression()
    test_real_caption_extraction()
    print("ALL TESTS PASSED SUCCESSFULLY! [OK]\n")
