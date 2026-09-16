'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Video, BookOpen, Compass, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DeveloperDrawer } from '@/components/DeveloperDrawer';
import { SAMPLE_PROJECT_ID } from '@/lib/sampleData';

export const Navbar: React.FC<{ activeProjectId?: string }> = ({ activeProjectId }) => {
  const router = useRouter();
  const [showDevDrawer, setShowDevDrawer] = useState(false);

  // Hidden developer shortcut: Ctrl+Shift+D or Cmd+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDevDrawer((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-[#090d16]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                    MffConvert
                  </span>
                  <span className="hidden sm:inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Workspace
                  </span>
                </div>
                <span className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5">
                  Watch less. Understand more.
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 pl-4">
              <Link
                href="/#showcase"
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60 transition-colors"
              >
                Features
              </Link>
              <Link
                href={`/study/${SAMPLE_PROJECT_ID}`}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Sample Workspace</span>
              </Link>
              <Link
                href="/#library"
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>My Library</span>
              </Link>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Start Learning / New Video CTA */}
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-all duration-200"
            >
              <Video className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Video</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Developer Drawer (Hidden unless triggered via shortcut or footer) */}
      <DeveloperDrawer
        isOpen={showDevDrawer}
        onClose={() => setShowDevDrawer(false)}
      />
    </>
  );
};
