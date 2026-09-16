'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { DeveloperDrawer } from '@/components/DeveloperDrawer';
import { api, Project } from '@/lib/api';
import { SAMPLE_PROJECT_ID } from '@/lib/sampleData';
import {
  Sparkles,
  ArrowRight,
  Play,
  CheckCircle2,
  BookOpen,
  Sigma,
  HelpCircle,
  Network,
  Layers,
  Award,
  FileText,
  ShieldCheck,
  Clock,
  Trash2,
  UploadCloud,
  ChevronRight,
  Compass,
  AlertCircle,
  ExternalLink,
  Laptop,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showDevDrawer, setShowDevDrawer] = useState(false);

  // Showcase interactive tab
  const [showcaseTab, setShowcaseTab] = useState<
    'notes' | 'formulas' | 'flashcards' | 'mindmap' | 'quiz'
  >('notes');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const list = await api.getProjects();
      setProjects(list);
    } catch {
      // Offline fallback
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.createJob(url.trim());
      const targetId = res.job_id || res.project_id;
      router.push(`/study/${targetId}`);
    } catch (err: any) {
      setError(err.message || 'Unable to analyze video. Please verify your connection.');
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.processUpload(formData);
      router.push(`/study/${res.project_id}`);
    } catch (err: any) {
      setError(err.message || 'Unable to upload video file. Please verify your connection.');
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this study workspace?')) {
      await api.deleteProject(id);
      loadProjects();
    }
  };

  const scrollToInput = () => {
    const el = document.getElementById('analyze-section');
    el?.scrollIntoView({ behavior: 'smooth' });
    const input = document.getElementById('video-url-input');
    input?.focus();
  };

  const scrollToShowcase = () => {
    const el = document.getElementById('showcase');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-400">
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 w-full space-y-24 sm:space-y-32 pb-24">
        {/* HERO SECTION */}
        <section className="relative pt-12 sm:pt-20 lg:pt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center space-y-8">
          {/* Subtle Glow Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl rounded-full pointer-events-none -z-10" />

          {/* Value Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Turn any educational video into a complete study workspace</span>
          </div>

          {/* Primary Headline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              Watch less.{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 bg-clip-text text-transparent">
                Understand more.
              </span>
            </h1>
            <p className="text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
              Paste a YouTube video and transform it into notes, chapters, formulas, flashcards, quizzes, and an interactive mind map.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={scrollToInput}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-emerald-500/30 transition-all duration-200 cursor-pointer"
            >
              <span>Start Learning</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={scrollToShowcase}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800/80 transition-all duration-200 cursor-pointer"
            >
              <span>See How It Works</span>
            </button>

            <Link
              href={`/study/${SAMPLE_PROJECT_ID}`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 px-5 py-3.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60 transition-all duration-200"
            >
              <Compass className="h-4 w-4" />
              <span>Explore Sample Workspace</span>
            </Link>
          </div>

          {/* Hero Visual Workspace Mockup */}
          <div className="pt-8 max-w-5xl mx-auto">
            <div className="relative rounded-3xl border border-slate-200/80 bg-white/90 p-2 sm:p-3 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-2xl dark:shadow-black/60 backdrop-blur-xl">
              {/* Window Controls Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
                <span className="font-mono text-[11px] text-slate-400">MffConvert Study Room</span>
                <span className="text-[11px] text-emerald-500 font-medium">Synchronized</span>
              </div>

              {/* Mockup Body Preview */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 text-left">
                {/* Left Side: Mock Video */}
                <div className="md:col-span-5 rounded-2xl bg-slate-900 text-white p-4 flex flex-col justify-between aspect-video relative overflow-hidden border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-white truncate pr-2">Calculus: Fundamental Theorem</span>
                    <span className="font-mono text-emerald-400 text-[11px]">04:01</span>
                  </div>
                  <div className="flex items-center justify-center my-auto">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[45%]" />
                  </div>
                </div>

                {/* Right Side: Mock Study Notes */}
                <div className="md:col-span-7 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/60 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ▶ [04:01]
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Fundamental Theorem of Calculus (FTC Part II)
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center font-serif text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-amber-200">
                      {"$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$"}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      Integration reverses differentiation, accumulating continuous rates of change into net total displacement.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-400">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Deep Notes</span>
                    <span>•</span>
                    <span>✓ 5 Milestones</span>
                    <span>•</span>
                    <span>✓ 3 Formulas</span>
                    <span>•</span>
                    <span>✓ 4 Flashcards</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PUBLIC VIDEO INPUT SECTION */}
        <section id="analyze-section" className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto scroll-mt-24">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/80 backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Start a Study Workspace</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Paste any YouTube lecture or upload your recorded class audio/video.
                </p>
              </div>

              {/* Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setInputMode('url')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    inputMode === 'url'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-emerald-600 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  YouTube URL
                </button>
                <button
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    inputMode === 'upload'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-emerald-600 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-50 p-4 text-xs text-amber-800 dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-red-400" />
                <div className="space-y-1">
                  <p className="font-semibold">Unable to process video</p>
                  <p className="text-[11px] leading-relaxed opacity-90">{error}</p>
                </div>
              </div>
            )}

            {inputMode === 'url' ? (
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="video-url-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Paste YouTube Link
                  </label>
                  <div className="relative">
                    <input
                      id="video-url-input"
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 py-3.5 pl-4 pr-24 sm:pr-36 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500 dark:focus:border-emerald-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={loading || !url.trim()}
                      className="absolute right-2 top-2 bottom-2 rounded-xl bg-emerald-600 px-3 sm:px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 animate-spin" />
                          <span className="hidden sm:inline">Analyzing...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Analyze Video</span>
                          <span className="sm:hidden">Analyze</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Private by design. Your learning content stays under your control.</span>
                  </span>
                  <Link
                    href={`/study/${SAMPLE_PROJECT_ID}`}
                    className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1"
                  >
                    Or try our sample workspace →
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div
                  onClick={() => document.getElementById('file-upload-picker')?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-emerald-50/20 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-emerald-500/50 transition-colors cursor-pointer"
                >
                  <UploadCloud className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {file ? file.name : 'Click to choose or drag & drop lecture recording'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Supports MP4, WebM, MKV, MP3, WAV, M4A
                  </p>
                  <input
                    id="file-upload-picker"
                    type="file"
                    accept="video/*,audio/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !file}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>Preparing Workspace...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      <span>Analyze Lecture File</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* CINEMATIC PRODUCT DEMONSTRATION SHOWCASE */}
        <section id="showcase" className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12 scroll-mt-24">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              One Video.{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 bg-clip-text text-transparent">
                Every Study Tool You Need.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              MffConvert synthesizes audio lectures and visual slides together to create interconnected study materials.
            </p>
          </div>

          {/* Transformation Diagram */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <Play className="h-3.5 w-3.5 text-red-500" />
              <span>YouTube Video</span>
            </div>
            <div className="text-emerald-500 text-sm">↓</div>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-emerald-700 dark:text-emerald-300 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>MffConvert Synthesis</span>
            </div>
            <div className="text-emerald-500 text-sm">↓</div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
              <span>Complete Study Workspace</span>
            </div>
          </div>

          {/* Interactive Showcase Tabs */}
          <div className="rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 sm:p-8 shadow-xl space-y-6">
            {/* Tab Switcher Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100 dark:border-slate-800/80">
              {[
                { id: 'notes', label: 'Deep Notes', icon: BookOpen },
                { id: 'formulas', label: 'Formula Catalog', icon: Sigma },
                { id: 'flashcards', label: 'Smart Flashcards', icon: Layers },
                { id: 'mindmap', label: 'Concept Mind Map', icon: Network },
                { id: 'quiz', label: 'Practice Quiz', icon: Award },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = showcaseTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setShowcaseTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Showcase Preview Display */}
            <div className="min-h-[260px] rounded-2xl border border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800/60 dark:bg-slate-950/40 flex flex-col justify-center">
              {showcaseTab === 'notes' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ▶ [01:25]
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      The Fundamental Theorem of Calculus (FTC)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    The Fundamental Theorem links differentiation with integration. It establishes that if a function $f$ is continuous on $[a, b]$, then evaluating the definite integral equals the difference in any antiderivative $F(b) - F(a)$.
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Includes cited timestamps</span>
                    <span>•</span>
                    <span>KaTeX mathematical typesetting</span>
                    <span>•</span>
                    <span>Markdown exportable</span>
                  </div>
                </div>
              )}

              {showcaseTab === 'formulas' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Definite Integral via Antiderivative
                    </h3>
                    <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      ▶ [04:01]
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-center font-serif text-base text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-amber-200">
                    {"$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$"}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Extracted automatically from blackboard slides and speech, complete with LaTeX code and variable definitions.
                  </p>
                </div>
              )}

              {showcaseTab === 'flashcards' && (
                <div className="max-w-md mx-auto w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 text-center space-y-4">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold">
                    Concept Flashcard (1 of 12)
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">
                    What is the physical interpretation of integrating instantaneous velocity $v(t)$ over time?
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <span className="text-[11px] text-slate-400">Flip card to see solution & Leitner mastery</span>
                  </div>
                </div>
              )}

              {showcaseTab === 'mindmap' && (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-emerald-500 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Fundamental Theorem of Calculus
                  </div>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg text-center">
                    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-900">
                      Differential Rates
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-900">
                      Area Accumulation
                    </div>
                    <div className="col-span-2 sm:col-span-1 rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium dark:border-slate-800 dark:bg-slate-900">
                      Kinematics Application
                    </div>
                  </div>
                </div>
              )}

              {showcaseTab === 'quiz' && (
                <div className="space-y-3 max-w-lg mx-auto w-full">
                  <div className="text-xs font-bold text-slate-800 dark:text-white">
                    Q1. What mathematical condition on $f(x)$ is required for FTC Part 2 to apply?
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="rounded-xl border border-emerald-500 bg-emerald-500/10 p-2.5 font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                      <span>A. $f(x)$ must be continuous on $[a, b]$</span>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                      B. $f(x)$ must have positive slopes everywhere
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* PERSONAL STUDY LIBRARY SECTION */}
        <section id="library" className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6 scroll-mt-24">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Study Library</h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Active workspaces
            </span>
          </div>

          {/* Sample Workspace Banner */}
          <div
            onClick={() => router.push(`/study/${SAMPLE_PROJECT_ID}`)}
            className="group rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 hover:bg-emerald-500/10 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Featured Sample
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">8 min lecture</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Calculus: The Fundamental Theorem & Particle Motion
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Explore a fully populated study workspace with notes, formulas, transcript, flashcards, and quizzes.
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white group-hover:bg-emerald-500 transition-colors shrink-0">
              <span>Open Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* User's Recent Projects */}
          {projects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {projects.map((p) => {
                const isCompleted = p.status === 'completed';
                const isFailed = p.status === 'failed';

                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/study/${p.id}`)}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-500/40 dark:hover:bg-slate-900/90 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : isFailed
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 animate-pulse'
                          }`}
                        >
                          {isCompleted ? 'Ready' : isFailed ? 'Failed' : 'Processing'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteProject(p.id, e)}
                          className="text-slate-400 hover:text-red-500 p-1"
                          title="Delete Workspace"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {p.title}
                      </h3>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        <span>
                          {Math.floor(p.duration / 60)}m {Math.floor(p.duration % 60)}s
                        </span>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Open Room <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">MffConvert</span>
            <span>•</span>
            <span>Private educational video study workspace</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDevDrawer(true)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline text-[11px]"
              title="Configure local backend connection or inspect model diagnostics"
            >
              Developer Console
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-[11px] text-slate-400">Zero Cloud API Keys Required</span>
          </div>
        </div>
      </footer>

      {/* Developer Drawer */}
      <DeveloperDrawer
        isOpen={showDevDrawer}
        onClose={() => setShowDevDrawer(false)}
      />
    </div>
  );
}
