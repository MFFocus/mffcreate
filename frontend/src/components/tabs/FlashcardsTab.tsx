'use client';

import React, { useState } from 'react';
import { Flashcard } from '@/lib/api';
import { Layers, ChevronLeft, ChevronRight, RotateCw, CheckCircle, XCircle, Play } from 'lucide-react';

interface FlashcardsTabProps {
  flashcards: Flashcard[];
  onSeek: (seconds: number) => void;
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({ flashcards, onSeek }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<Record<number, boolean>>({});

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        No flashcards generated for this lecture.
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const knownCount = Object.values(knownIds).filter(Boolean).length;
  const progressPct = Math.round((knownCount / flashcards.length) * 100);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const markKnown = (known: boolean) => {
    setKnownIds((prev) => ({ ...prev, [currentCard.id]: known }));
    handleNext();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header & Progress */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Smart Flashcards ({flashcards.length})
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Mastered: <strong className="text-emerald-600 dark:text-emerald-400">{knownCount}</strong> / {flashcards.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
        <div
          className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 3D Flashcard Container */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative min-h-[300px] w-full rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-8 shadow-md cursor-pointer select-none flex flex-col justify-between hover:border-emerald-500/50 dark:border-slate-800 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 dark:shadow-2xl transition-all group"
      >
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="rounded-full bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 font-medium text-slate-700 dark:text-slate-300">
            {currentCard.tag || 'Concept'}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-500 dark:text-slate-400">
              {currentIndex + 1} of {flashcards.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSeek(currentCard.timestamp);
              }}
              className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
              title="Jump to cited moment"
            >
              <Play className="h-2.5 w-2.5 fill-current" />
              {formatTime(currentCard.timestamp)}
            </button>
          </div>
        </div>

        {/* Card Content */}
        <div className="my-auto py-6 text-center space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
            {isFlipped ? 'Answer & Explanation' : 'Question / Concept Prompt'}
          </div>
          <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
            {isFlipped ? currentCard.back : currentCard.front}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          <RotateCw className="h-3.5 w-3.5" />
          <span>Click to flip card</span>
        </div>
      </div>

      {/* Study Action Buttons */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          onClick={handlePrev}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => markKnown(false)}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
          >
            <XCircle className="h-4 w-4" />
            Review Again
          </button>
          <button
            onClick={() => markKnown(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
          >
            <CheckCircle className="h-4 w-4" />
            Got It!
          </button>
        </div>

        <button
          onClick={handleNext}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
