'use client';

import React, { useState, useEffect } from 'react';
import { SearchResult, api } from '@/lib/api';
import { Search, Play, Sigma, HelpCircle, Image as ImageIcon, FileText } from 'lucide-react';

interface SearchTabProps {
  projectId: string;
  onSeek: (seconds: number) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({ projectId, onSeek }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const sampleQueries = [
    'Show all formulas',
    'Find every question',
    'Find every diagram',
    'Where is the main concept explained?',
  ];

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.searchLecture(projectId, q, filter);
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.trim()) {
      handleSearch();
    }
  }, [filter]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getSourceBadge = (type: string) => {
    switch (type) {
      case 'formula':
        return (
          <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Sigma className="h-3 w-3" /> Formula
          </span>
        );
      case 'question':
        return (
          <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <HelpCircle className="h-3 w-3" /> Question
          </span>
        );
      case 'diagram':
        return (
          <span className="flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-400 border border-purple-500/20">
            <ImageIcon className="h-3 w-3" /> Diagram
          </span>
        );
      case 'slide':
        return (
          <span className="flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400 border border-sky-500/20">
            <ImageIcon className="h-3 w-3" /> Slide
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
            <FileText className="h-3 w-3" /> Transcript
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar Input */}
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center"
        >
          <Search className="absolute left-4 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search concepts, words, formulas, questions, transcript, slides..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-12 pr-28 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-white dark:placeholder-slate-500 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Quick query chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-medium">Quick searches:</span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-white transition-colors"
            >
              {sq}
            </button>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto scrollbar-none">
          {['all', 'formula', 'question', 'diagram', 'slide', 'transcript'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3 py-1 text-xs capitalize transition-colors ${
                filter === f
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
            Searching speech, slides, and notes...
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 bg-slate-50/50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            {query.trim()
              ? 'No matching results found. Try alternative keywords or broader search terms.'
              : 'Enter a query above to search across lecture speech, visual blackboard slides, formulas, and questions.'}
          </div>
        ) : (
          results.map((r) => (
            <div
              key={r.id}
              onClick={() => onSeek(r.timestamp)}
              className="group rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-500/50 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-500/40 dark:hover:bg-slate-900 cursor-pointer transition-all flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(r.timestamp);
                    }}
                    className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    title="Jump video to this timestamp"
                  >
                    <Play className="h-2.5 w-2.5 fill-current" />
                    {formatTime(r.timestamp)}
                  </button>
                  {getSourceBadge(r.source_type)}
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {r.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {r.snippet}
                </p>
              </div>

              {r.thumbnail && (
                <div className="aspect-video w-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900">
                  <img
                    src={api.getMediaUrl(projectId, r.thumbnail)}
                    alt={r.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
