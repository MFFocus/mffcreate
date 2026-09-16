'use client';

import React, { useState } from 'react';
import { TranscriptSegment } from '@/lib/api';
import { FileText, Search, Play } from 'lucide-react';

interface TranscriptTabProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (seconds: number) => void;
}

export const TranscriptTab: React.FC<TranscriptTabProps> = ({ segments, currentTime, onSeek }) => {
  const [filterQuery, setFilterQuery] = useState('');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filtered = segments.filter((seg) =>
    seg.text.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Spoken Transcript ({segments.length} segments)
          </h2>
        </div>

        {/* Quick in-transcript search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter transcript..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-white dark:placeholder-slate-500"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 divide-y divide-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:divide-slate-800/60 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No spoken segments matching &ldquo;{filterQuery}&rdquo;
          </div>
        ) : (
          filtered.map((seg) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            return (
              <div
                key={seg.id}
                onClick={() => onSeek(seg.start)}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 border border-emerald-500/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(seg.start);
                  }}
                  className={`flex items-center gap-1 shrink-0 rounded-md px-2 py-0.5 text-xs font-mono font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white font-bold dark:bg-emerald-500 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-600 hover:text-emerald-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-700'
                  }`}
                >
                  <Play className="h-2.5 w-2.5 fill-current" />
                  {formatTime(seg.start)}
                </button>

                <p
                  className={`text-xs leading-relaxed ${
                    isActive
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {seg.text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
