'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Zap, Copy, Check } from 'lucide-react';

interface ShortNotesTabProps {
  shortNotes: string;
  onSeek: (seconds: number) => void;
}

export const ShortNotesTab: React.FC<ShortNotesTabProps> = ({ shortNotes, onSeek }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shortNotes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Quick Revision Cheat Sheet
          </h2>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
          <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/40 shadow-sm">
        <div className="prose-light dark:prose-dark max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, className, children, ...props }) {
                const text = String(children);
                const match = text.match(/^\[?(\d{1,2}):(\d{2})\]?$/);
                if (match) {
                  const totalSecs = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
                  return (
                    <button
                      onClick={() => onSeek(totalSecs)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-mono font-semibold border border-amber-500/20 hover:bg-amber-500/25 transition-colors mx-1 cursor-pointer"
                      title={`Jump video to ${match[1]}:${match[2]}`}
                    >
                      ▶ {match[1]}:{match[2]}
                    </button>
                  );
                }
                return <code className={className} {...props}>{children}</code>;
              },
            }}
          >
            {shortNotes}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
