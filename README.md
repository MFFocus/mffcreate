# MffConvert — Video to Study Workspace Web Service

> **Turn any educational video into textbook-grade notes, formulas, transcript, mind map, flashcards, and quizzes. Zero setup required.**

---

## Highlights

* **Zero Local Setup**: Ordinary users can open the website from any browser (Mac, PC, iPhone, Android, Chromebook), paste a YouTube link, and start studying immediately.
* **Watch While Processing**: The video loads and plays immediately in a responsive split-screen player while AI processes chapters and notes behind the scenes.
* **Instant Duplicate Cache**: Previously processed lectures load in milliseconds without redundant processing.
* **Sub-Second Caption Extraction**: Direct timedtext parsing provides instantaneous transcripts without waiting for audio downloads.
* **14 Study Modules**: Deep textbook notes with KaTeX math (`$$...$$`), formula catalog, solved problems, mind map, flashcards, quiz, transcript search, and grounded AI chat.
* **Export Anywhere**: Markdown, Printable HTML/PDF, and Anki Flashcard TSV exports.
* **Optional Local Engine**: Developers and power users can also run completely offline with local GPU Whisper and Ollama LLM.

---

## Multimodal Architecture: *Understand the Lecture, Not Just the Transcript*

Traditional AI transcription tools only listen to the speech track. **MffConvert fuses Audio + Speech + Keyframes + Slides + OCR + Formulas:**

```
                  Educational Video (URL or File)
                                │
                        ┌───────┴───────┐
                        ▼               ▼
                   FFmpeg Audio    OpenCV Video
                   (16kHz mono)    (Scene/Slide Changes)
                        │               │
                        ▼               ▼
                 faster-whisper     RapidOCR ONNX
                 (Speech-to-Text)   (Slide Text & Formulas)
                        │               │
                        └───────┬───────┘
                                ▼
               Multimodal Study Material Synthesis
            (Local Ollama LLM or Local Heuristic Engine)
                                │
      ┌─────────────────────────┼─────────────────────────┐
      ▼                         ▼                         ▼
Deep Notes & Math         Interactive Mind Map      Grounded AI Chat
Chapters & Timestamps     Flashcards & Quizzes      "Find Anything" Search
```

---

## Features

1. **Synchronized Video Player**: Works with YouTube URLs or uploaded lecture recordings (MP4, MKV, WebM, MP3). Clicking any timestamp anywhere in your notes seeks the video instantly.
2. **Deep Notes**: Textbook-grade Markdown study notes rendered with KaTeX mathematical typesetting (`$$...$$`), definitions, and cited lecture moments.
3. **Short Notes**: High-yield revision cheat sheet summarizing essential takeaways and formulas.
4. **Milestone Chapters**: Auto-detected lecture milestones with start times, summaries, and keyframe slide thumbnails.
5. **Word-Synchronized Transcript**: Full speech transcript with active line tracking synchronized with video playback and in-transcript search.
6. **Solved Questions & Problems**: Interrogative questions and problem statements identified with step-by-step solutions.
7. **Formula Catalog**: Mathematical and physical equations extracted from visual slides and speech, formatted with LaTeX and variable explanations.
8. **Visual Slide & Diagram Gallery**: Keyframes extracted at scene transitions, enriched with RapidOCR text and modal inspector.
9. **Interactive Mind Map**: Concept hierarchy graph with zoom, pan, and click-to-timestamp navigation.
10. **Interactive Flashcards**: 3D flip card study mode with Leitner tracking ("Got It!" vs "Review Again") and mastery progress indicator.
11. **Practice Quiz**: Multiple-choice assessment with instant grading, explanations, and review.
12. **Ask the Video (Local AI Chat)**: Grounded conversational assistant citing exact timestamps.
13. **Find Anything (Unified Search)**: Token and intent-based search across speech, slide OCR, formulas, questions, and diagrams.
14. **Multi-Format Export**: One-click export to Markdown (`.md`), Printable HTML/PDF, Anki Flashcards (`.tsv`), or JSON data package.

---

## Getting Started

### Prerequisites
- **Python 3.10+** (Tested on Python 3.14)
- **Node.js 18+** (Tested on Node.js 24)

### Quick Start (Windows)
Double-click `start.bat` or run in terminal:
```cmd
start.bat
```
This automatically launches both the FastAPI backend (`http://127.0.0.1:8000`) and the Next.js frontend (`http://localhost:3000`).

---

### Manual Launch

#### 1. Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend
```bash
cd frontend
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Local AI Configuration (Optional: Ollama)

MffConvert comes with a **built-in deterministic local NLP and heuristic engine** that works immediately without downloading large LLM models.

To unlock LLM synthesis and chat:
1. Download and install [Ollama](https://ollama.com).
2. Pull your preferred model:
   ```bash
   ollama run llama3.2
   ```
   *(Or `mistral`, `qwen2.5`, `phi3`)*
3. MffConvert will auto-detect Ollama running at `http://localhost:11434` and display the active model in the UI header!

## Production Deployment

MffConvert uses a decoupled, high-performance web architecture:
* **Frontend**: Next.js 14 hosted on **Netlify** (or Vercel).
* **Backend**: FastAPI + FFmpeg + OpenCV + Whisper hosted on **Render**, **Railway**, **Fly.io**, or any Docker-capable VPS.

```
                  PUBLIC USERS (Mobile / Tablet / Desktop)
                                     │
                                     ▼
                ┌───────────────────────────────────────────┐
                │             NETLIFY FRONTEND              │
                │        (https://mffconvert.netlify.app)   │
                │                                           │
                │  * Responsive YouTube Player (Watch & Wait│
                │  * Real-Time Processing Timeline & Stages │
                │  * 14 Full Study Modules                  │
                │  * Zero Local Engine Leaks                │
                └────────────────────┬──────────────────────┘
                                     │
                                     ▼ HTTPS (NEXT_PUBLIC_BACKEND_URL)
                ┌───────────────────────────────────────────┐
                │          PUBLIC FASTAPI BACKEND           │
                │     (Render / Railway / Fly.io / VPS)     │
                │                                           │
                │  * 0.0.0.0 Binding with dynamic $PORT     │
                │  * Production CORS Configuration          │
                │  * Real yt-dlp Video & Subtitle Fetch     │
                │  * Bundled FFmpeg & OpenCV Slide Extract  │
                │  * RapidOCR ONNX Formula Recognition      │
                │  * faster-whisper Speech-to-Text          │
                │  * Persistent Storage & Auto-Cleanup      │
                │  * Versioned Deduplication Cache          │
                └───────────────────────────────────────────┘
```

### Step 1: Deploy the Python Backend

You can deploy the backend using the included Dockerfile or Blueprint:

#### Option A: 1-Click Deploy with Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Blueprint**.
2. Connect your GitHub repository (`https://github.com/MFFocus/mffcreate`).
3. Render will read [`backend/render.yaml`](backend/render.yaml) automatically.
4. Render provisions a Docker web service with persistent storage mounted at `/app/data`.
5. Once deployed, copy your service URL (e.g., `https://mffconvert-backend.onrender.com`).

#### Option B: Deploy with Railway / Docker / VPS
1. Set the root directory to `backend`.
2. Build command / Dockerfile: Use the included [`backend/Dockerfile`](backend/Dockerfile).
3. Set environment variables:
   * `HOST`: `0.0.0.0`
   * `PORT`: `8000` (or leave default assigned by platform)
   * `ALLOWED_ORIGINS`: `https://mffconvert.netlify.app,http://localhost:3000`
4. Deploy and copy your public backend URL.

### Step 2: Configure Netlify Frontend

1. Go to your [Netlify Site Dashboard](https://app.netlify.com/).
2. Navigate to **Site configuration > Environment variables**.
3. Add or edit the variable:
   * **Key**: `NEXT_PUBLIC_BACKEND_URL`
   * **Value**: Your public backend URL from Step 1 (e.g., `https://mffconvert-backend.onrender.com`).
4. Trigger a redeploy:
   * Go to **Deploys > Trigger deploy > Deploy site**.
   * Netlify will build the frontend with the configured backend URL.

### Step 3: End-to-End Verification

1. Open your Netlify site URL (e.g., `https://mffconvert.netlify.app`).
2. Paste any educational YouTube URL (e.g., `https://www.youtube.com/watch?v=rfscVS0vtbw`).
3. Click **Analyze Video**.
4. The split-screen processing workspace will immediately open, streaming the YouTube video on the left while the backend processes speech, slides, OCR, and formulas on the right.
5. Once complete, click **Enter Workspace** to explore all 14 study modules!

---

## Local Development (Offline Mode)

Local development continues to work seamlessly on your computer:
1. Double-click `start.bat` (or run `run_backend.bat` and `run_frontend.bat`).
2. Backend runs at `http://127.0.0.1:8000`.
3. Frontend runs at `http://localhost:3000`.
4. The frontend automatically detects `localhost` and routes to `http://127.0.0.1:8000` without manual setup.

---

## Verification & Testing

To run the automated backend test suite:
```bash
python backend/tests/test_pipeline.py
```
Validates database CRUD, bundled FFmpeg detection, OCR classification, local AI synthesis, unified search, CORS, and exports.
