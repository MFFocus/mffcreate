'use client';

import React from 'react';
import { Chapter, api } from '@/lib/api';
import { ListTree, Play, Clock } from 'lucide-react';

interface ChaptersTabProps {
  chapters: Chapter[];
  projectId: string;
  onSeek: (seconds: number) => void;
}

export const ChaptersTab: React.FC<ChaptersTabProps> = ({ chapters, projectId, onSeek }) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ListTree className="h-5 w-5 text-sky-500 dark:text-sky-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Lecture Milestones & Chapters ({chapters.length})
          </h2>
        </div>
      </div>

      <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 space-y-6 py-2">
        {chapters.map((ch, idx) => (
          <div key={ch.id || idx} className="relative pl-6 group">
            {/* Timeline Dot */}
            <div className="absolute -left-2 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-slate-400 group-hover:bg-emerald-500 group-hover:scale-125 dark:border-slate-900 dark:bg-slate-700 transition-all" />

            <div
              onClick={() => onSeek(ch.start_time)}
              className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-500/50 hover:shadow-sm dark:border-slate-800/90 dark:bg-slate-900/60 dark:hover:border-emerald-500/40 dark:hover:bg-slate-900 cursor-pointer transition-all flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(ch.start_time);
                    }}
                    className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    {formatTime(ch.start_time)}
                  </button>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {ch.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-1">
                  {ch.summary}
                </p>
              </div>

              {ch.frame_thumbnail && (
                <div className="relative aspect-video w-28 sm:w-36 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900">
                  <img
                    src={api.getMediaUrl(projectId, ch.frame_thumbnail)}
                    alt={ch.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
