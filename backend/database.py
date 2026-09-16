"""
Local SQLite database interface for MffConvert.
Stores project metadata, extracted transcripts, keyframes, study materials, and grounded AI chat history.
100% local, self-contained, zero cloud database needed.
"""

import json
import sqlite3
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

DB_DIR = Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parent / "data"))
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = Path(os.environ.get("DATABASE_PATH", DB_DIR / "mffconvert.db"))

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes SQLite tables and indexes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source_type TEXT NOT NULL, -- 'url' or 'upload'
        source_url TEXT,
        source_url_hash TEXT,
        video_path TEXT,
        audio_path TEXT,
        duration REAL DEFAULT 0,
        status TEXT DEFAULT 'queued', -- queued, downloading, extracting, transcribing, analyzing_visuals, reading_text, generating_notes, generating_questions, generating_flashcards, finalizing, completed, failed
        stage TEXT DEFAULT 'Initialized',
        progress_pct INTEGER DEFAULT 0,
        error TEXT,
        error_code TEXT,
        created_at TEXT NOT NULL,
        media_status TEXT DEFAULT 'video_available',
        metadata_json TEXT,
        metrics_json TEXT
    )
    """)

    # Safe column migrations for existing databases
    cursor.execute("PRAGMA table_info(projects)")
    columns = [col[1] for col in cursor.fetchall()]
    if "source_url_hash" not in columns:
        cursor.execute("ALTER TABLE projects ADD COLUMN source_url_hash TEXT")
    if "metrics_json" not in columns:
        cursor.execute("ALTER TABLE projects ADD COLUMN metrics_json TEXT")
    if "error_code" not in columns:
        cursor.execute("ALTER TABLE projects ADD COLUMN error_code TEXT")
    if "media_status" not in columns:
        cursor.execute("ALTER TABLE projects ADD COLUMN media_status TEXT DEFAULT 'video_available'")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transcripts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT UNIQUE NOT NULL,
        full_text TEXT NOT NULL,
        segments_json TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS keyframes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        timestamp REAL NOT NULL,
        image_filename TEXT NOT NULL,
        ocr_text TEXT,
        frame_type TEXT DEFAULT 'slide', -- 'slide', 'diagram', 'formula', 'code', 'board'
        visual_label TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS study_materials (
        project_id TEXT PRIMARY KEY,
        deep_notes TEXT,
        short_notes TEXT,
        chapters_json TEXT,
        questions_json TEXT,
        formulas_json TEXT,
        mindmap_json TEXT,
        flashcards_json TEXT,
        quiz_json TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user' or 'assistant'
        content TEXT NOT NULL,
        timestamps_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )
    """)

    # Indexes for fast retrieval
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_url_hash ON projects(source_url_hash)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_keyframes_project ON keyframes(project_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_project ON chat_history(project_id)")

    conn.commit()
    conn.close()

# Project helpers
def create_project(
    project_id: str,
    title: str,
    source_type: str,
    source_url: Optional[str] = None,
    source_url_hash: Optional[str] = None,
    video_path: Optional[str] = None,
    media_status: str = "video_available"
) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
    INSERT INTO projects (id, title, source_type, source_url, source_url_hash, video_path, media_status, status, stage, progress_pct, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 'Queued for processing', 0, ?)
    """, (project_id, title, source_type, source_url, source_url_hash, video_path, media_status, now))
    conn.commit()
    conn.close()
    return get_project(project_id)

def get_completed_project_by_url_hash(url_hash: str) -> Optional[Dict[str, Any]]:
    """Checks if a lecture with this canonical URL hash is already fully processed."""
    if not url_hash:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM projects 
    WHERE source_url_hash = ? AND status = 'completed'
    ORDER BY created_at DESC LIMIT 1
    """, (url_hash,))
    row = cursor.fetchone()
    conn.close()
    return _format_project_row(row) if row else None

def get_active_project_by_url_hash(url_hash: str) -> Optional[Dict[str, Any]]:
    """Checks if a lecture with this canonical URL hash is currently in progress."""
    if not url_hash:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM projects 
    WHERE source_url_hash = ? AND status NOT IN ('completed', 'failed')
    ORDER BY created_at DESC LIMIT 1
    """, (url_hash,))
    row = cursor.fetchone()
    conn.close()
    return _format_project_row(row) if row else None

def update_job_stage(
    project_id: str,
    status: str,
    stage: str,
    progress_pct: int,
    error: Optional[str] = None,
    metrics: Optional[Dict[str, Any]] = None,
    error_code: Optional[str] = None
):
    """Updates fine-grained pipeline state, error code, and timing metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    metrics_json = json.dumps(metrics) if metrics else None
    
    if metrics_json is not None and error_code is not None:
        cursor.execute("""
        UPDATE projects 
        SET status = ?, stage = ?, progress_pct = ?, error = ?, metrics_json = ?, error_code = ?
        WHERE id = ?
        """, (status, stage, progress_pct, error, metrics_json, error_code, project_id))
    elif metrics_json is not None:
        cursor.execute("""
        UPDATE projects 
        SET status = ?, stage = ?, progress_pct = ?, error = ?, metrics_json = ?
        WHERE id = ?
        """, (status, stage, progress_pct, error, metrics_json, project_id))
    elif error_code is not None:
        cursor.execute("""
        UPDATE projects 
        SET status = ?, stage = ?, progress_pct = ?, error = ?, error_code = ?
        WHERE id = ?
        """, (status, stage, progress_pct, error, error_code, project_id))
    else:
        cursor.execute("""
        UPDATE projects 
        SET status = ?, stage = ?, progress_pct = ?, error = ?
        WHERE id = ?
        """, (status, stage, progress_pct, error, project_id))
    conn.commit()
    conn.close()

def update_project_progress(project_id: str, status: str, stage: str, progress_pct: int, error: Optional[str] = None):
    update_job_stage(project_id, status, stage, progress_pct, error=error)

def update_project_media(
    project_id: str,
    title: Optional[str] = None,
    duration: Optional[float] = None,
    audio_path: Optional[str] = None,
    video_path: Optional[str] = None,
    media_status: Optional[str] = None
):
    conn = get_db_connection()
    cursor = conn.cursor()
    updates = []
    params = []
    if title:
        updates.append("title = ?")
        params.append(title)
    if duration is not None:
        updates.append("duration = ?")
        params.append(duration)
    if audio_path:
        updates.append("audio_path = ?")
        params.append(audio_path)
    if video_path:
        updates.append("video_path = ?")
        params.append(video_path)
    if media_status:
        updates.append("media_status = ?")
        params.append(media_status)
    if updates:
        params.append(project_id)
        cursor.execute(f"UPDATE projects SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    conn.close()

def _format_project_row(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    if "metrics_json" in d and d["metrics_json"]:
        try:
            d["metrics"] = json.loads(d["metrics_json"])
        except Exception:
            d["metrics"] = None
    else:
        d["metrics"] = None

    status = d.get("status")
    stored_media_status = d.get("media_status")
    has_video_path = bool(d.get("video_path"))

    if status == "failed":
        effective_media_status = "failed"
        video_avail = False
        trans_avail = False
        vis_avail = False
    elif stored_media_status == "captions_only" or (status == "completed" and not has_video_path):
        effective_media_status = "captions_only"
        video_avail = False
        trans_avail = True
        vis_avail = False
    else:
        effective_media_status = "video_available"
        video_avail = True
        trans_avail = True
        vis_avail = True

    d["media_status"] = effective_media_status
    d["capabilities"] = {
        "media_status": effective_media_status,
        "video_available": video_avail,
        "transcript_available": trans_avail,
        "visual_analysis_available": vis_avail
    }
    return d

def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()
    return _format_project_row(row) if row else None

def list_projects() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [_format_project_row(r) for r in rows]

def delete_project(project_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    conn.close()
    return True

# Transcript helpers
def save_transcript(project_id: str, full_text: str, segments: List[Dict[str, Any]]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO transcripts (project_id, full_text, segments_json)
    VALUES (?, ?, ?)
    """, (project_id, full_text, json.dumps(segments)))
    conn.commit()
    conn.close()

def get_transcript(project_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transcripts WHERE project_id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    data["segments"] = json.loads(data["segments_json"])
    return data

# Keyframe helpers
def save_keyframes(project_id: str, keyframes_data: List[Dict[str, Any]]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM keyframes WHERE project_id = ?", (project_id,))
    for kf in keyframes_data:
        cursor.execute("""
        INSERT INTO keyframes (project_id, timestamp, image_filename, ocr_text, frame_type, visual_label)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            project_id,
            kf.get("timestamp", 0.0),
            kf.get("image_filename", ""),
            kf.get("ocr_text", ""),
            kf.get("frame_type", "slide"),
            kf.get("visual_label", "")
        ))
    conn.commit()
    conn.close()

def get_keyframes(project_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM keyframes WHERE project_id = ? ORDER BY timestamp ASC", (project_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Study materials helpers
def save_study_materials(project_id: str, materials: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO study_materials (
        project_id, deep_notes, short_notes, chapters_json, questions_json, formulas_json, mindmap_json, flashcards_json, quiz_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        project_id,
        materials.get("deep_notes", ""),
        materials.get("short_notes", ""),
        json.dumps(materials.get("chapters", [])),
        json.dumps(materials.get("questions", [])),
        json.dumps(materials.get("formulas", [])),
        json.dumps(materials.get("mindmap", {"nodes": [], "edges": []})),
        json.dumps(materials.get("flashcards", [])),
        json.dumps(materials.get("quiz", []))
    ))
    conn.commit()
    conn.close()

def get_study_materials(project_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM study_materials WHERE project_id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    r = dict(row)
    return {
        "deep_notes": r.get("deep_notes", ""),
        "short_notes": r.get("short_notes", ""),
        "chapters": json.loads(r.get("chapters_json") or "[]"),
        "questions": json.loads(r.get("questions_json") or "[]"),
        "formulas": json.loads(r.get("formulas_json") or "[]"),
        "mindmap": json.loads(r.get("mindmap_json") or '{"nodes":[],"edges":[]}'),
        "flashcards": json.loads(r.get("flashcards_json") or "[]"),
        "quiz": json.loads(r.get("quiz_json") or "[]"),
    }

# Chat history helpers
def save_chat_message(project_id: str, role: str, content: str, timestamps: List[float]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
    INSERT INTO chat_history (project_id, role, content, timestamps_json, created_at)
    VALUES (?, ?, ?, ?, ?)
    """, (project_id, role, content, json.dumps(timestamps), now))
    msg_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return msg_id

def get_chat_history(project_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chat_history WHERE project_id = ? ORDER BY id ASC", (project_id,))
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["timestamps"] = json.loads(d.get("timestamps_json") or "[]")
        result.append(d)
    return result

# Initialize on module load
init_db()
