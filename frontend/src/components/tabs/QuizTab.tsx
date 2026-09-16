'use client';

import React, { useState } from 'react';
import { QuizQuestion } from '@/lib/api';
import { Award, CheckCircle2, XCircle, RotateCcw, Play } from 'lucide-react';

interface QuizTabProps {
  quiz: QuizQuestion[];
  onSeek: (seconds: number) => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({ quiz, onSeek }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  if (!quiz || quiz.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
        No quiz questions generated for this lecture.
      </div>
    );
  }

  const handleSelectOption = (questionId: number, optionIdx: number) => {
    if (submitted[questionId]) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    setSubmitted((prev) => ({ ...prev, [questionId]: true }));
  };

  const resetQuiz = () => {
    setSelectedAnswers({});
    setSubmitted({});
  };

  const totalAnswered = Object.keys(submitted).length;
  const correctCount = quiz.filter((q) => selectedAnswers[q.id] === q.correct_index).length;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Score Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500 dark:text-amber-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Lecture Practice Quiz ({quiz.length} Questions)
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Score: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{correctCount}</strong> / {quiz.length}
          </span>
          <button
            onClick={resetQuiz}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {quiz.map((q, qIdx) => {
          const isAnswered = !!submitted[q.id];
          const userChoice = selectedAnswers[q.id];
          const isCorrect = userChoice === q.correct_index;

          return (
            <div
              key={q.id || qIdx}
              className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  <span className="text-emerald-600 dark:text-emerald-400 mr-2 font-bold">Q{qIdx + 1}.</span>
                  {q.question}
                </h3>
                <button
                  onClick={() => onSeek(q.timestamp)}
                  className="flex items-center gap-1 shrink-0 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Play className="h-2.5 w-2.5 fill-current" />
                  {formatTime(q.timestamp)}
                </button>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  let optStyle =
                    'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-slate-700';

                  if (isAnswered) {
                    if (optIdx === q.correct_index) {
                      optStyle =
                        'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 font-semibold';
                    } else if (optIdx === userChoice) {
                      optStyle =
                        'border-red-500 bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200';
                    } else {
                      optStyle =
                        'border-slate-200/50 bg-slate-50/30 text-slate-400 dark:border-slate-800/40 dark:bg-slate-950/30 dark:text-slate-500 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(q.id, optIdx)}
                      className={`w-full text-left rounded-xl border p-3.5 text-xs transition-all flex items-center justify-between cursor-pointer ${optStyle}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>

                      {isAnswered && optIdx === q.correct_index && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      {isAnswered && optIdx === userChoice && userChoice !== q.correct_index && (
                        <XCircle className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation after answering */}
              {isAnswered && (
                <div
                  className={`rounded-xl border p-4 text-xs leading-relaxed ${
                    isCorrect
                      ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                  }`}
                >
                  <strong className="block mb-1">
                    {isCorrect ? '✓ Correct Answer!' : '✗ Explanation:'}
                  </strong>
                  <span>{q.explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
