'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { VideoPlayer, VideoPlayerHandle } from '@/components/VideoPlayer';
import { ProgressWorkspace } from '@/components/ProgressWorkspace';
import { OverviewTab } from '@/components/tabs/OverviewTab';
import { DeepNotesTab } from '@/components/tabs/DeepNotesTab';
import { ShortNotesTab } from '@/components/tabs/ShortNotesTab';
import { ChaptersTab } from '@/components/tabs/ChaptersTab';
import { TranscriptTab } from '@/components/tabs/TranscriptTab';
import { QuestionsTab } from '@/components/tabs/QuestionsTab';
import { FormulasTab } from '@/components/tabs/FormulasTab';
import { DiagramsTab } from '@/components/tabs/DiagramsTab';
import { MindMapTab } from '@/components/tabs/MindMapTab';
import { FlashcardsTab } from '@/components/tabs/FlashcardsTab';
import { QuizTab } from '@/components/tabs/QuizTab';
import { ChatTab } from '@/components/tabs/ChatTab';
import { SearchTab } from '@/components/tabs/SearchTab';
import { ExportTab } from '@/components/tabs/ExportTab';
import {
  api,
  Project,
  StudyMaterials,
  Keyframe,
  TranscriptSegment,
} from '@/lib/api';
import {
  SAMPLE_PROJECT_ID,
  SAMPLE_PROJECT,
  SAMPLE_STUDY,
  SAMPLE_KEYFRAMES,
  SAMPLE_TRANSCRIPT,
} from '@/lib/sampleData';
import {
  BookOpen,
  Zap,
  ListTree,
  FileText,
  HelpCircle,
  Sigma,
  Image as ImageIcon,
  Network,
  Layers,
  Award,
  MessageSquare,
  Search,
  Download,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Compass,
  CheckCircle2,
} from 'lucide-react';

export default function StudyWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [study, setStudy] = useState<StudyMaterials | null>(null);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [transcript, setTranscript] = useState<{
    full_text: string;
    segments: TranscriptSegment[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load project or poll
  useEffect(() => {
    if (projectId === SAMPLE_PROJECT_ID) {
      setProject(SAMPLE_PROJECT);
      setStudy(SAMPLE_STUDY);
      setKeyframes(SAMPLE_KEYFRAMES);
      setTranscript(SAMPLE_TRANSCRIPT);
      setLoading(false);
      return;
    }

    let interval: any = null;

    const checkStatus = async () => {
      try {
        const p = await api.getJobStatus(projectId);
        setProject(p);

        if (p.status === 'completed') {
          const [s, kf, tr] = await Promise.all([
            api.getStudyMaterials(projectId).catch(() => null),
            api.getKeyframes(projectId).catch(() => []),
            api.getTranscript(projectId).catch(() => null),
          ]);
          if (s) setStudy(s);
          setKeyframes(kf || []);
          if (tr) setTranscript(tr);
          setLoading(false);
          clearInterval(interval);
        } else if (p.status === 'failed') {
          setError(
            p.error || 'We encountered an issue processing this video. Please verify the video is public and try again.'
          );
          setLoading(false);
          clearInterval(interval);
        } else {
          setLoading(true);
        }
      } catch (err: any) {
        setError(
          "We couldn't connect to MffConvert right now. Please check that your local engine is running."
        );
        clearInterval(interval);
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [projectId]);

  const handleSeek = (seconds: number) => {
    videoPlayerRef.current?.seekTo(seconds);

    // Visual pulse feedback
    const container = document.getElementById('study-materials-container');
    if (container) {
      container.classList.remove('sync-active-pulse');
      void container.offsetWidth; // Trigger reflow
      container.classList.add('sync-active-pulse');
    }

    // On mobile, scroll up to video
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'deep_notes', label: 'Deep Notes', icon: BookOpen },
    { id: 'short_notes', label: 'Short Notes', icon: Zap },
    { id: 'chapters', label: 'Chapters', icon: ListTree },
    { id: 'transcript', label: 'Transcript', icon: FileText },
    { id: 'questions', label: 'Questions', icon: HelpCircle },
    { id: 'formulas', label: 'Formulas', icon: Sigma },
    { id: 'diagrams', label: 'Visuals', icon: ImageIcon },
    { id: 'mindmap', label: 'Mind Map', icon: Network },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz', label: 'Quiz', icon: Award },
    { id: 'chat', label: 'Ask Video', icon: MessageSquare },
    { id: 'search', label: 'Find Anything', icon: Search },
    { id: 'export', label: 'Export', icon: Download },
  ];

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100">
        <Navbar activeProjectId={projectId} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Unable to Load Study Workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {error}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
              <Link
                href={`/study/${SAMPLE_PROJECT_ID}`}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Explore Sample</span>
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing screen with Watch-While-Processing Experience
  if (loading || (project && project.status !== 'completed')) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100">
        <Navbar activeProjectId={projectId} />
        <ProgressWorkspace
          title={project?.title || 'Analyzing Educational Video'}
          progressPct={project?.progress_pct || 10}
          status={project?.status || 'queued'}
          stage={project?.stage}
          error={project?.status === 'failed' ? (project?.error || error || undefined) : undefined}
          sourceUrl={project?.source_url}
          youtubeId={project?.youtube_id}
          currentTimestamp={project?.current_timestamp}
          onRetry={() => router.push('/')}
          onEnterWorkspace={() => {
            setLoading(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 transition-colors">
      <Navbar activeProjectId={projectId} />

      {/* Main Study Workspace Content */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Synchronized Video Player */}
          <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-20 space-y-4">
            {project && (
              <VideoPlayer
                ref={videoPlayerRef}
                project={project}
                onTimeUpdate={setCurrentTime}
              />
            )}

            {/* Quick Title & Sync Status Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                {project?.title}
              </h2>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Synchronized Video</span>
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {Math.floor((project?.duration || 0) / 60)}m{' '}
                  {Math.floor((project?.duration || 0) % 60)}s
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Educational Material Workspace */}
          <div
            id="study-materials-container"
            className="lg:col-span-7 xl:col-span-7 space-y-4 rounded-2xl transition-all"
          >
            {/* Scrollable Tab Navigation Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-thin">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap min-h-[40px] transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Workspace Panels */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              {activeTab === 'overview' && study && project && (
                <OverviewTab
                  project={project}
                  study={study}
                  keyframes={keyframes}
                  onSeek={handleSeek}
                  onTabChange={setActiveTab}
                />
              )}

              {activeTab === 'deep_notes' && study && (
                <DeepNotesTab
                  deepNotes={study.deep_notes}
                  onSeek={handleSeek}
                  title={project?.title || 'Lecture Notes'}
                />
              )}

              {activeTab === 'short_notes' && study && (
                <ShortNotesTab
                  shortNotes={study.short_notes}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'chapters' && study && (
                <ChaptersTab
                  chapters={study.chapters || []}
                  projectId={projectId}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'transcript' && transcript && (
                <TranscriptTab
                  segments={transcript.segments || []}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'questions' && study && (
                <QuestionsTab
                  questions={study.questions || []}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'formulas' && study && (
                <FormulasTab
                  formulas={study.formulas || []}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'diagrams' && (
                <DiagramsTab
                  keyframes={keyframes}
                  projectId={projectId}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'mindmap' && study && (
                <MindMapTab
                  mindmap={study.mindmap || { nodes: [], edges: [] }}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'flashcards' && study && (
                <FlashcardsTab
                  flashcards={study.flashcards || []}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'quiz' && study && (
                <QuizTab
                  quiz={study.quiz || []}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'chat' && (
                <ChatTab
                  projectId={projectId}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'search' && (
                <SearchTab
                  projectId={projectId}
                  onSeek={handleSeek}
                />
              )}

              {activeTab === 'export' && study && project && (
                <ExportTab
                  project={project}
                  study={study}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
