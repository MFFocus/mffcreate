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

## Deployment to Netlify (Public Web Service)

MffConvert is fully configured for zero-setup deployment on Netlify using the Next.js App Router:

```
                  PUBLIC USERS (Mobile / Tablet / Desktop)
                                     │
                                     ▼
                ┌───────────────────────────────────────────┐
                │          NETLIFY HOSTED SERVICE           │
                │        (https://mffconvert.netlify.app)   │
                │                                           │
                │  * Responsive Next.js 14 Frontend         │
                │  * Instant YouTube TimedText Extraction   │
                │  * In-Memory Global Duplicate Cache       │
                │  * Serverless Study Generation Engine     │
                │  * KaTeX, Mind Map, Flashcards, & Quizzes │
                └───────────────────────────────────────────┘
```

### Deploying Your Own Instance:
1. Push this repository to GitHub or GitLab.
2. In Netlify, click **"Add new site" > "Import an existing project"**.
3. Select your repository. The included [`netlify.toml`](netlify.toml) will automatically configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Next.js Plugin**: `@netlify/plugin-nextjs`
4. Click **Deploy**. The site is immediately available to public users with **zero local software required**.

---

## Local Developer / Offline Mode

Developers and offline power users can also run the local Python backend with hardware-accelerated Whisper and local Ollama models:

1. Launch both services with `start.bat` (or manually run `uvicorn main:app` and `npm run dev`).
2. Press `Ctrl + Shift + D` or click **Developer Console** in the website footer to inspect engine metrics, toggle Ollama LLM, or adjust processing thresholds.

---

## Verification & Testing

To run the automated backend test suite:
```bash
python backend/tests/test_pipeline.py
```
Validates database CRUD, bundled FFmpeg detection, OCR classification, local AI synthesis, unified search, CORS, and exports.
