'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Play,
  RotateCcw,
} from 'lucide-react';

interface ProgressWorkspaceProps {
  title: string;
  progressPct: number;
  status?: string;
  stage?: string;
  error?: string;
  sourceUrl?: string;
  youtubeId?: string;
  currentTimestamp?: number;
  onRetry?: () => void;
  onEnterWorkspace?: () => void;
}

const STAGES = [
  { id: 1, label: 'Video ready', statuses: ['queued', 'preparing', 'downloading'] },
  { id: 2, label: 'Speech analyzed', statuses: ['extracting', 'transcribing'] },
  { id: 3, label: 'Understanding important moments', statuses: ['understanding_visuals', 'analyzing_visuals'] },
  { id: 4, label: 'Reading visual information', statuses: ['reading_text'] },
  { id: 5, label: 'Creating study notes', statuses: ['extracting_concepts', 'creating_notes', 'generating_notes'] },
  { id: 6, label: 'Building questions', statuses: ['creating_questions', 'generating_questions'] },
  { id: 7, label: 'Preparing flashcards & quiz', statuses: ['creating_flashcards', 'generating_flashcards', 'finalizing', 'completed'] },
];

export const ProgressWorkspace: React.FC<ProgressWorkspaceProps> = ({
  title,
  progressPct,
  status = 'queued',
  stage,
  error,
  sourceUrl,
  youtubeId: propYoutubeId,
  currentTimestamp,
  onRetry,
  onEnterWorkspace,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Extract YouTube ID if not directly provided
  const extractYtId = (url?: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.trim().match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const youtubeId = propYoutubeId || extractYtId(sourceUrl);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const seekVideo = (seconds: number) => {
    if (iframeRef.current && youtubeId) {
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        '*'
      );
    }
  };

  const isCompleted = status === 'completed' || progressPct >= 100;
  const isFailed = status === 'failed' || !!error;

  // Determine stage active index
  let activeStageIdx = STAGES.findIndex((s) => s.statuses.includes(status));
  if (activeStageIdx === -1) {
    activeStageIdx = Math.min(
      STAGES.length - 1,
      Math.floor((progressPct / 100) * STAGES.length)
    );
  }
  if (isCompleted) {
    activeStageIdx = STAGES.length - 1;
  }

  const formatTimestamp = (secs?: number) => {
    if (secs === undefined || secs === null || secs <= 0) return '01:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 my-auto flex flex-col justify-center">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>Interactive Live Workspace Creation</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isCompleted
            ? 'Your study workspace is ready'
            : isFailed
            ? 'Unable to Finish Processing'
            : 'Your study workspace is being created'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          {isCompleted
            ? 'All notes, interactive chapters, formulas, flashcards, and quizzes have been generated.'
            : isFailed
            ? 'We encountered difficulty processing this lecture. You can try again or choose another video.'
            : 'Watch the video while MffConvert builds your notes, concepts, and practice material.'}
        </p>
      </div>

      {/* Main Content Area: Split Layout (Desktop) / Stacked Layout (Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Interactive YouTube Video Player */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-3">
          <div className="rounded-3xl border border-slate-200 bg-black shadow-2xl overflow-hidden dark:border-slate-800 aspect-video relative flex items-center justify-center">
            {youtubeId ? (
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&origin=${
                  typeof window !== 'undefined' ? window.location.origin : ''
                }`}
                title={title || 'Educational Lecture'}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center text-emerald-400">
                  <Play className="h-8 w-8 ml-1" />
                </div>
                <p className="text-sm font-medium">Educational Video Playback</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Your lecture is being analyzed in the background while keeping resources secure.
                </p>
              </div>
            )}
          </div>

          {/* Active Timestamp Banner */}
          {currentTimestamp && currentTimestamp > 0 && !isCompleted && !isFailed && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-950/40 text-xs transition-all">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <Clock className="h-4 w-4 animate-spin shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Currently analyzing around{' '}
                  <span className="font-mono font-semibold">
                    {formatTimestamp(currentTimestamp)}
                  </span>
                </span>
              </div>
              <button
                onClick={() => seekVideo(currentTimestamp)}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
              >
                <span>Jump to this moment</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Processing Timeline Card */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 sm:p-7 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 transition-all duration-300 space-y-6">
            {/* Stage Title and Progress Counter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {!isCompleted && !isFailed && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  )}
                  {isCompleted
                    ? 'Processing Finished'
                    : isFailed
                    ? 'Processing Error'
                    : stage || 'Analyzing lecture...'}
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  {Math.min(100, Math.max(0, Math.round(progressPct)))}%
                </span>
              </div>

              {/* Progress Line */}
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, Math.max(8, progressPct))}%` }}
                />
              </div>
            </div>

            {/* Error View */}
            {isFailed ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-center dark:border-rose-900/40 dark:bg-rose-950/30 space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                    We couldn't finish analyzing this video.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {error || 'Please verify that the video is public, accessible, and try again.'}
                  </p>
                </div>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-lg"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Choose Another Video</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 7 Human-Readable Stages */}
                <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800/60 dark:bg-slate-950/50">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                    Understanding your video
                  </div>

                  <div className="space-y-2">
                    {STAGES.map((st, idx) => {
                      const isPast = idx < activeStageIdx || isCompleted;
                      const isCurrent = idx === activeStageIdx && !isPast && !isCompleted;

                      return (
                        <div
                          key={st.id}
                          className={`flex items-center gap-3 text-xs transition-all duration-300 py-0.5 ${
                            isPast
                              ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                              : isCurrent
                              ? 'text-slate-900 dark:text-slate-100 font-semibold'
                              : 'text-slate-400 dark:text-slate-600'
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] transition-colors ${
                              isPast
                                ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm shadow-emerald-500/20'
                                : isCurrent
                                ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'border border-slate-300 bg-transparent text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            {isPast ? (
                              <Check className="h-3 w-3 stroke-[3]" />
                            ) : isCurrent ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <span>○</span>
                            )}
                          </div>

                          <span className="flex-1">{st.label}</span>

                          {isCurrent && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal animate-pulse">
                              In progress...
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* If Taking Longer: Friendly Reassurance */}
                {elapsedSeconds > 25 && !isCompleted && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-50/70 p-3.5 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/40 dark:text-amber-200 transition-all">
                    <p className="font-semibold mb-0.5">Still working on it</p>
                    <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80">
                      We're carefully analyzing the video's speech and visual content. You can keep watching while we finish.
                    </p>
                  </div>
                )}

                {/* Completed Action State */}
                {isCompleted ? (
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={onEnterWorkspace}
                      className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
                    >
                      <span>Enter Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                      Your complete study workspace is ready to explore.
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                    Your workspace will appear automatically when it's ready.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
