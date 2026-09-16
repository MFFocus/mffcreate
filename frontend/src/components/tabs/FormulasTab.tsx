'use client';

import React from 'react';
import { Formula } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Sigma, Play, Copy, Check } from 'lucide-react';

interface FormulasTabProps {
  formulas: Formula[];
  onSeek: (seconds: number) => void;
}

export const FormulasTab: React.FC<FormulasTabProps> = ({ formulas, onSeek }) => {
  const [copiedId, setCopiedId] = React.useState<number | null>(null);

  const copyFormula = (f: Formula) => {
    navigator.clipboard.writeText(f.latex);
    setCopiedId(f.id);
    setTimeout(() => setCopiedId(null), 2000);
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
          <Sigma className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Mathematical & Scientific Formulas ({formulas.length})
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formulas.map((f) => (
          <div
            key={f.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-amber-500/50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-amber-500/40 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                  {f.name}
                </span>
                <button
                  onClick={() => onSeek(f.timestamp)}
                  className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                >
                  <Play className="h-2.5 w-2.5 fill-current" />
                  {formatTime(f.timestamp)}
                </button>
              </div>

              {/* Equation Box */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/80 p-4 mb-3 text-center overflow-x-auto">
                <div className="text-sm sm:text-base font-serif text-slate-900 dark:text-amber-200">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {`$$ ${f.latex} $$`}
                  </ReactMarkdown>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {f.explanation}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Timestamp: {formatTime(f.timestamp)}</span>
              <button
                onClick={() => copyFormula(f)}
                className="flex items-center gap-1 text-slate-600 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
              >
                {copiedId === f.id ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copiedId === f.id ? 'Copied' : 'Copy LaTeX'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
