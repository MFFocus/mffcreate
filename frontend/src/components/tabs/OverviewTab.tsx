'use client';

import React from 'react';
import { Project, StudyMaterials, Keyframe, api } from '@/lib/api';
import {
  BookOpen,
  ListTree,
  HelpCircle,
  Sigma,
  Image as ImageIcon,
  Sparkles,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

interface OverviewTabProps {
  project: Project;
  study: StudyMaterials;
  keyframes: Keyframe[];
  onSeek: (seconds: number) => void;
  onTabChange: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  project,
  study,
  keyframes,
  onSeek,
  onTabChange,
}) => {
  const durationMin = Math.floor(project.duration / 60);
  const durationSec = Math.floor(project.duration % 60);

  const stats = [
    {
      label: 'Chapters',
      count: study.chapters?.length || 0,
      icon: ListTree,
      color: 'text-sky-500 dark:text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
      tab: 'chapters',
    },
    {
      label: 'Key Formulas',
      count: study.formulas?.length || 0,
      icon: Sigma,
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      tab: 'formulas',
    },
    {
      label: 'Solved Problems',
      count: study.questions?.length || 0,
      icon: HelpCircle,
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      tab: 'questions',
    },
    {
      label: 'Visual Slides',
      count: keyframes?.length || 0,
      icon: ImageIcon,
      color: 'text-purple-500 dark:text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      tab: 'diagrams',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Study Workspace Ready
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              {project.title}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              {durationMin}m {durationSec}s Total Duration
            </span>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Your video has been transformed into a complete, interconnected study experience.
          Spoken explanations and visual slides are indexed together so you can review chapters,
          equations, problem solutions, and smart flashcards with synchronized video playback.
        </p>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => onTabChange(item.tab)}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center hover:border-emerald-500/40 hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700 dark:hover:bg-slate-900/50 transition-all group cursor-pointer"
              >
                <div className={`p-2 rounded-xl border ${item.bg} mb-2 group-hover:scale-105 transition-transform`}>
                  <Icon className={`h-4.5 w-4.5 ${item.color}`} />
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-white">{item.count}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chapters Preview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListTree className="h-5 w-5 text-sky-500 dark:text-sky-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Lecture Milestones</h2>
          </div>
          <button
            onClick={() => onTabChange('chapters')}
            className="text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-medium flex items-center gap-1"
          >
            <span>View all chapters</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {study.chapters?.slice(0, 4).map((ch, idx) => (
            <div
              key={ch.id || idx}
              onClick={() => onSeek(ch.start_time)}
              className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 hover:border-emerald-500/50 hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-emerald-500/40 dark:hover:bg-slate-900/60 cursor-pointer transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {Math.floor(ch.start_time / 60)}:
                    {Math.floor(ch.start_time % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{ch.title}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{ch.summary}</p>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0 pt-0.5">
                Seek →
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
