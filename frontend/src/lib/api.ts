/**
 * Production-ready API client for MffConvert.
 * Connects the Netlify frontend to the public FastAPI backend.
 * Local development defaults to http://127.0.0.1:8000.
 * Production uses NEXT_PUBLIC_BACKEND_URL.
 */

import {
  SAMPLE_PROJECT_ID,
  SAMPLE_PROJECT,
  SAMPLE_STUDY,
  SAMPLE_KEYFRAMES,
  SAMPLE_TRANSCRIPT,
} from './sampleData';

const DEFAULT_PRODUCTION_BACKEND_URL = 'https://mffconvert-backend.onrender.com';
const ENV_BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim().replace(/\/+$/, '');

export function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

    // Check if developer manually set an endpoint in Developer Drawer
    const stored = localStorage.getItem('mffconvert_backend_url');
    if (stored && stored.trim()) {
      const clean = stored.trim().replace(/\/+$/, '');
      // On public domains, ignore stale localhost configurations
      if (!isLocal && (clean.includes('localhost') || clean.includes('127.0.0.1') || clean.includes('8000'))) {
        localStorage.removeItem('mffconvert_backend_url');
      } else {
        return clean;
      }
    }

    // In local development, default to local FastAPI port 8000
    if (isLocal) {
      return ENV_BACKEND_URL || 'http://127.0.0.1:8000';
    }

    // In production, return configured environment URL or Render backend default
    return ENV_BACKEND_URL || DEFAULT_PRODUCTION_BACKEND_URL;
  }
  return ENV_BACKEND_URL || DEFAULT_PRODUCTION_BACKEND_URL;
}

export function setBackendUrl(url: string): void {
  if (typeof window !== 'undefined') {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      localStorage.removeItem('mffconvert_backend_url');
    } else {
      localStorage.setItem('mffconvert_backend_url', cleanUrl);
    }
  }
}

export interface HealthStatus {
  ok: boolean;
  service?: string;
  version?: string;
  engine?: string;
}

export interface ProjectMetrics {
  download_sec?: number;
  audio_sec?: number;
  transcribe_sec?: number;
  visual_sec?: number;
  ocr_sec?: number;
  ai_sec?: number;
  total_sec?: number;
}

export type JobStatus =
  | 'queued'
  | 'preparing'
  | 'downloading'
  | 'extracting'
  | 'transcribing'
  | 'understanding_visuals'
  | 'analyzing_visuals'
  | 'reading_text'
  | 'extracting_concepts'
  | 'creating_notes'
  | 'generating_notes'
  | 'creating_questions'
  | 'generating_questions'
  | 'creating_flashcards'
  | 'generating_flashcards'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'processing';

export interface Capabilities {
  media_status: 'video_available' | 'captions_only' | 'unavailable' | 'failed';
  video_available: boolean;
  transcript_available: boolean;
  visual_analysis_available: boolean;
}

export interface Project {
  id: string;
  title: string;
  source_type: 'url' | 'upload';
  source_url?: string;
  source_url_hash?: string;
  youtube_id?: string;
  video_path?: string;
  audio_path?: string;
  duration: number;
  status: JobStatus;
  stage: string;
  progress_pct: number;
  current_timestamp?: number;
  error?: string;
  error_code?: string;
  media_status?: 'video_available' | 'captions_only' | 'unavailable' | 'failed';
  capabilities?: Capabilities;
  metrics?: ProjectMetrics;
  created_at: string;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface Keyframe {
  timestamp: number;
  image_filename: string;
  image_path?: string;
  ocr_text: string;
  frame_type: 'slide' | 'diagram' | 'formula' | 'code' | 'board';
  visual_label: string;
}

export interface Chapter {
  id: number;
  title: string;
  start_time: number;
  summary: string;
  frame_thumbnail?: string;
}

export interface Formula {
  id: number;
  name: string;
  latex: string;
  explanation: string;
  timestamp: number;
}

export interface Question {
  id: number;
  question: string;
  solution: string;
  timestamp: number;
  source?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}
export type SolvedQuestion = Question;

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  tag: string;
  timestamp: number;
  topic?: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  timestamp: number;
}

export interface MindMapNode {
  id: string;
  label: string;
  type: string;
  timestamp: number;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface StudyMaterials {
  overview?: {
    summary: string;
    key_takeaways: string[];
    difficulty_level: string;
    prerequisites: string[];
  };
  deep_notes: string;
  short_notes: string;
  chapters: Chapter[];
  questions: Question[];
  formulas: Formula[];
  mindmap: { nodes: MindMapNode[]; edges: MindMapEdge[] };
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
}

export interface SearchResult {
  id: string;
  source_type: 'speech' | 'slide' | 'formula' | 'question' | 'transcript' | 'diagram';
  title: string;
  snippet: string;
  timestamp: number;
  score: number;
  thumbnail?: string;
  frame_thumbnail?: string;
}

export interface SystemStatus {
  status: string;
  zero_cost: boolean;
  privacy_mode: string;
  ollama: {
    available: boolean;
    models: string[];
    recommended_model?: string;
  };
  default_engine: string;
}

export function sanitizeErrorMessage(err: any): string {
  const msg = (err?.message || String(err || '')).toLowerCase();

  // Log technical details only on developer side
  if (typeof window !== 'undefined') {
    console.error('[MffConvert API Error]', err);
  }

  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('connection refused') ||
    msg.includes('connectionrefused') ||
    msg.includes('load failed')
  ) {
    return "Unable to connect to the MffConvert processing service. Please check your internet connection and try again.";
  }

  if (msg.includes('connecting') || msg.includes('missing backend') || msg.includes('backend service')) {
    return "MffConvert service is currently connecting. Please try again in a few moments.";
  }

  if (msg.includes('500') || msg.includes('internal server') || msg.includes('traceback') || msg.includes('exception')) {
    return "We couldn't finish analyzing this video. Please try again or choose another video.";
  }

  // Censor any accidental IP / localhost mentions in error messages
  if (msg.includes('127.0.0.1') || msg.includes('localhost') || msg.includes('8000')) {
    return "We couldn't finish analyzing this video. Please try again.";
  }

  return err?.message || "We couldn't finish analyzing this video. Please try again.";
}

export const api = {
  async checkHealth(customUrl?: string): Promise<HealthStatus> {
    const baseUrl = (customUrl || getBackendUrl()).replace(/\/+$/, '');
    if (!baseUrl) return { ok: false };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return { ok: true, service: data.service, version: data.version, engine: data.engine };
      }
    } catch {
      // Offline
    }
    return { ok: false };
  },

  async getSystemStatus(): Promise<SystemStatus> {
    const baseUrl = getBackendUrl();
    if (!baseUrl) {
      return {
        status: 'connecting',
        zero_cost: true,
        privacy_mode: 'Public Web Service',
        ollama: { available: false, models: [] },
        default_engine: 'Multimodal Processing Engine'
      };
    }
    try {
      const res = await fetch(`${baseUrl}/api/system/status`);
      if (!res.ok) throw new Error('Failed to fetch system status');
      return res.json();
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err));
    }
  },

  async createJob(
    url: string,
    title?: string,
    whisperModel: string = 'base',
    llmModel?: string
  ): Promise<{ job_id: string; project_id: string; status: JobStatus; cached?: boolean; title?: string }> {
    const baseUrl = getBackendUrl();
    if (!baseUrl) {
      throw new Error("MffConvert service is currently connecting. Please try again shortly.");
    }
    try {
      const res = await fetch(`${baseUrl}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, whisper_model: whisperModel, llm_model: llmModel }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Unable to start video analysis.');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err));
    }
  },

  async getJobStatus(jobId: string): Promise<Project> {
    if (jobId === SAMPLE_PROJECT_ID) {
      return SAMPLE_PROJECT;
    }
    const baseUrl = getBackendUrl();
    if (!baseUrl) {
      throw new Error("MffConvert service is currently connecting.");
    }
    try {
      const res = await fetch(`${baseUrl}/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.job_id || data.project_id || jobId,
          title: data.title || 'Educational Lecture',
          source_type: 'url',
          source_url: data.source_url,
          youtube_id: data.youtube_id,
          duration: data.duration || 0,
          status: data.status,
          stage: data.stage || 'Processing...',
          progress_pct: data.progress_pct || 0,
          current_timestamp: data.current_timestamp,
          error: data.error,
          error_code: data.error_code,
          media_status: data.media_status,
          capabilities: data.capabilities,
          metrics: data.metrics,
          created_at: data.created_at || new Date().toISOString()
        };
      }
      return this.getProject(jobId);
    } catch {
      return this.getProject(jobId);
    }
  },

  async processUrl(
    url: string,
    title?: string,
    whisperModel: string = 'base',
    llmModel?: string
  ): Promise<{ project_id: string }> {
    return this.createJob(url, title, whisperModel, llmModel);
  },

  async processUpload(formData: FormData): Promise<{ project_id: string }> {
    const baseUrl = getBackendUrl();
    if (!baseUrl) {
      throw new Error("MffConvert service is currently connecting.");
    }
    try {
      const res = await fetch(`${baseUrl}/api/process/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to upload video' }));
        throw new Error(err.detail || 'Failed to upload video');
      }
      return res.json();
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err));
    }
  },

  async getProjects(): Promise<Project[]> {
    const baseUrl = getBackendUrl();
    if (!baseUrl) return [];
    try {
      const res = await fetch(`${baseUrl}/api/projects`);
      if (!res.ok) return [];
      const list: Project[] = await res.json();
      return list || [];
    } catch {
      return [];
    }
  },

  async getProject(id: string): Promise<Project> {
    if (id === SAMPLE_PROJECT_ID) {
      return SAMPLE_PROJECT;
    }
    const baseUrl = getBackendUrl();
    if (!baseUrl) {
      throw new Error("MffConvert service is currently connecting.");
    }
    try {
      const res = await fetch(`${baseUrl}/api/projects/${id}`);
      if (!res.ok) throw new Error('Study workspace not found');
      return res.json();
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err));
    }
  },

  async deleteProject(id: string): Promise<void> {
    if (id === SAMPLE_PROJECT_ID) return;
    const baseUrl = getBackendUrl();
    if (!baseUrl) return;
    try {
      await fetch(`${baseUrl}/api/projects/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err));
    }
  },

  async getTranscript(id: string): Promise<{ full_text: string; segments: TranscriptSegment[] }> {
    if (id === SAMPLE_PROJECT_ID) {
      return SAMPLE_TRANSCRIPT;
    }
    const baseUrl = getBackendUrl();
    if (!baseUrl) {
      throw new Error("MffConvert service is currently connecting.");
    }
    try {
      const res = await fetch(`${baseUrl}/api/projects/${id}/transcript`);
      if (!res.ok) throw new Error('Transcript is still being generated');
      return res.json();
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err));
    }
  },

  async getKeyframes(id: string): Promise<Keyframe[]> {
    if (id === SAMPLE_PROJECT_ID) {
      return SAMPLE_KEYFRAMES;
    }
    const baseUrl = getBackendUrl();
    if (!baseUrl) return [];
    try {
      const res = await fetch(`${baseUrl}/api/projects/${id}/keyframes`);
      if (!res.ok) return [];
      const list = await res.json();
      return (list || []).map((kf: any) => ({
        ...kf,
        image_path: kf.image_filename ? `${baseUrl}/media/${id}/frames/${kf.image_filename}` : undefined
      }));
    } catch {
      return [];
    }
  },

  async getStudyMaterials(id: string): Promise<StudyMaterials> {
    if (id === SAMPLE_PROJECT_ID) {
      return SAMPLE_STUDY;
    }
    const baseUrl = getBackendUrl();
    if (!baseUrl) {
      throw new Error("MffConvert service is currently connecting.");
    }
    try {
      const res = await fetch(`${baseUrl}/api/projects/${id}/study`);
      if (!res.ok) throw new Error('Study materials are still being synthesized');
      return res.json();
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err));
    }
  },

  async searchLecture(id: string, q: string, filter: string = 'all'): Promise<SearchResult[]> {
    if (id === SAMPLE_PROJECT_ID) {
      const query = q.toLowerCase();
      const results: SearchResult[] = [];

      if (filter === 'all' || filter === 'formula') {
        SAMPLE_STUDY.formulas.forEach((f) => {
          if (f.name.toLowerCase().includes(query) || f.explanation.toLowerCase().includes(query) || f.latex.toLowerCase().includes(query)) {
            results.push({
              id: `formula-${f.id}`,
              source_type: 'formula',
              title: f.name,
              snippet: f.explanation,
              timestamp: f.timestamp,
              score: 1.0,
            });
          }
        });
      }

      if (filter === 'all' || filter === 'question') {
        SAMPLE_STUDY.questions.forEach((qu) => {
          if (qu.question.toLowerCase().includes(query) || qu.solution.toLowerCase().includes(query)) {
            results.push({
              id: `question-${qu.id}`,
              source_type: 'question',
              title: qu.question,
              snippet: qu.solution,
              timestamp: qu.timestamp,
              score: 0.95,
            });
          }
        });
      }

      if (filter === 'all' || filter === 'transcript') {
        SAMPLE_TRANSCRIPT.segments.forEach((seg) => {
          if (seg.text.toLowerCase().includes(query)) {
            results.push({
              id: `transcript-${seg.id}`,
              source_type: 'transcript',
              title: `Lecture Discussion at [${Math.floor(seg.start / 60)}:${Math.floor(seg.start % 60).toString().padStart(2, '0')}]`,
              snippet: seg.text,
              timestamp: seg.start,
              score: 0.9,
            });
          }
        });
      }

      return results;
    }

    const baseUrl = getBackendUrl();
    if (!baseUrl) return [];
    try {
      const params = new URLSearchParams({ q, filter });
      const res = await fetch(`${baseUrl}/api/projects/${id}/search?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err));
    }
  },

  async sendChatMessage(
    id: string,
    message: string
  ): Promise<{ answer: string; timestamps: number[]; grounded: boolean; model_used: string }> {
    if (id === SAMPLE_PROJECT_ID) {
      const lower = message.toLowerCase();
      if (lower.includes('displacement') || lower.includes('velocity') || lower.includes('particle')) {
        return {
          answer: `### From the Video\nAt [05:21], the lecture solves for the particle's displacement with velocity $v(t) = 3t^2 - 2t$ over $[1, 3]$. Integrating yields $F(t) = t^3 - t^2$, resulting in a net displacement of exactly $18\\,\\text{meters}$ at [06:36].\n\n### Additional Explanation\nDisplacement calculates the change in position between endpoints. Notice that if the particle reversed direction during the interval, the total distance traveled would require integrating $|v(t)|$, which would be strictly greater than or equal to the net displacement.`,
          timestamps: [321, 396],
          grounded: true,
          model_used: 'AI Study Partner',
        };
      } else {
        return {
          answer: `### From the Video\nAt [04:01], the instructor presents the Fundamental Theorem of Calculus: $\\int_{a}^{b} f(x) dx = F(b) - F(a)$, where $F'(x) = f(x)$. This connects instantaneous rate of change (first covered at [01:25]) with continuous accumulation.\n\n### Additional Explanation\nIn simple terms, differentiation breaks down a curve into its instantaneous slope, while integration sums continuous infinitesimals back into the total accumulated quantity.`,
          timestamps: [85, 241],
          grounded: true,
          model_used: 'AI Study Partner',
        };
      }
    }

    const baseUrl = getBackendUrl();
    if (!baseUrl) {
      throw new Error("MffConvert service is currently connecting.");
    }
    try {
      const res = await fetch(`${baseUrl}/api/projects/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Could not process your question right now.');
      return res.json();
    } catch (err: any) {
      throw new Error(sanitizeErrorMessage(err));
    }
  },

  async getChatHistory(
    id: string
  ): Promise<Array<{ id: number; role: 'user' | 'assistant'; content: string; timestamps: number[] }>> {
    if (id === SAMPLE_PROJECT_ID) return [];
    const baseUrl = getBackendUrl();
    if (!baseUrl) return [];
    try {
      const res = await fetch(`${baseUrl}/api/projects/${id}/chat/history`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  getMediaUrl(projectId: string, filename: string): string {
    const baseUrl = getBackendUrl();
    return `${baseUrl}/media/${projectId}/frames/${filename}`;
  },

  getVideoStreamUrl(projectId: string, filename: string): string {
    const baseUrl = getBackendUrl();
    return `${baseUrl}/media/${projectId}/${filename}`;
  },

  getExportUrl(projectId: string, format: 'markdown' | 'html' | 'anki'): string {
    const baseUrl = getBackendUrl();
    return `${baseUrl}/api/projects/${projectId}/export/${format}`;
  },
};
