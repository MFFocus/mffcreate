'use client';

import React, { useState } from 'react';
import { Question } from '@/lib/api';
import { HelpCircle, ChevronDown, ChevronUp, Play, CheckCircle2 } from 'lucide-react';

interface QuestionsTabProps {
  questions: Question[];
  onSeek: (seconds: number) => void;
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({ questions, onSeek }) => {
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});

  const toggleOpen = (id: number) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Solved Problems & Questions ({questions.length})
          </h2>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q) => {
          const isOpen = !!openIds[q.id];
          return (
            <div
              key={q.id}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-emerald-500/50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 transition-colors"
            >
              <div
                onClick={() => toggleOpen(q.id)}
                className="flex items-start justify-between gap-3 p-5 cursor-pointer select-none"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek(q.timestamp);
                      }}
                      className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                      {formatTime(q.timestamp)}
                    </button>
                    {q.source && (
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                        {q.source}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {q.question}
                  </h3>
                </div>

                <div className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 p-5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Solution & Step-by-Step Explanation:</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap pl-1">
                    {q.solution}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
