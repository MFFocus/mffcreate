'use client';

import React, { useState } from 'react';
import { Keyframe, api } from '@/lib/api';
import { Image as ImageIcon, Play, Eye, X } from 'lucide-react';

interface DiagramsTabProps {
  keyframes: Keyframe[];
  projectId: string;
  onSeek: (seconds: number) => void;
}

export const DiagramsTab: React.FC<DiagramsTabProps> = ({ keyframes, projectId, onSeek }) => {
  const [selectedFrame, setSelectedFrame] = useState<Keyframe | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filtered = keyframes.filter((kf) =>
    filterType === 'all' ? true : kf.frame_type === filterType
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-purple-500 dark:text-purple-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Visual Frames & Slides ({keyframes.length})
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {['all', 'slide', 'diagram', 'formula', 'code'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-xl px-3 py-1 text-xs font-medium capitalize transition-colors ${
                filterType === t
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Frame Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((kf, i) => (
          <div
            key={i}
            className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-purple-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-purple-500/40 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Image Container */}
              <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
                <img
                  src={api.getMediaUrl(projectId, kf.image_filename)}
                  alt={kf.visual_label}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => onSeek(kf.timestamp)}
                    className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Seek</span>
                  </button>
                  <button
                    onClick={() => setSelectedFrame(kf)}
                    className="flex items-center gap-1 rounded-xl bg-white/20 text-white backdrop-blur-md px-3 py-1.5 text-xs font-semibold hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>

              {/* Info Bar */}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <button
                    onClick={() => onSeek(kf.timestamp)}
                    className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    ▶ {formatTime(kf.timestamp)}
                  </button>
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400 capitalize">
                    {kf.frame_type}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {kf.visual_label}
                </h3>
                {kf.ocr_text && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 font-mono bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
                    {kf.ocr_text}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Modal Viewer */}
      {selectedFrame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setSelectedFrame(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">
                {formatTime(selectedFrame.timestamp)}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {selectedFrame.visual_label}
              </h2>
              <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300 capitalize font-medium">
                {selectedFrame.frame_type}
              </span>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black mb-4">
              <img
                src={api.getMediaUrl(projectId, selectedFrame.image_filename)}
                alt={selectedFrame.visual_label}
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Extracted Visual Content:
              </h4>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 max-h-36 overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
                <pre className="text-xs text-slate-700 dark:text-slate-200 font-mono whitespace-pre-wrap">
                  {selectedFrame.ocr_text || 'No text detected on this visual frame.'}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  onSeek(selectedFrame.timestamp);
                  setSelectedFrame(null);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Play from this timestamp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
