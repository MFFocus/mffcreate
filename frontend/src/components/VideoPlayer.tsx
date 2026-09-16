'use client';

import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Project, api } from '@/lib/api';

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
}

interface VideoPlayerProps {
  project: Project;
  onTimeUpdate?: (currentTime: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ project, onTimeUpdate }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(project.duration || 0);
    const [playbackRate, setPlaybackRate] = useState(1);

    // Extract YouTube ID if it is a YouTube URL
    const getYouTubeId = (url?: string): string | null => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? match[2] : null;
    };

    const youtubeId = project.source_type === 'url' ? getYouTubeId(project.source_url) : null;

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = seconds;
          videoRef.current.play().catch(() => {});
        } else if (iframeRef.current && youtubeId) {
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
            '*'
          );
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*'
          );
        }
        setCurrentTime(seconds);
        onTimeUpdate?.(seconds);
      },
    }));

    const handleTimeUpdate = () => {
      if (videoRef.current) {
        const cur = videoRef.current.currentTime;
        setCurrentTime(cur);
        onTimeUpdate?.(cur);
      }
    };

    const changeSpeed = (rate: number) => {
      setPlaybackRate(rate);
      if (videoRef.current) {
        videoRef.current.playbackRate = rate;
      }
    };

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <div className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden dark:border-slate-800 dark:bg-slate-900/60 backdrop-blur-sm transition-colors">
        {/* Video Container */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          {youtubeId ? (
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&origin=${
                typeof window !== 'undefined' ? window.location.origin : ''
              }`}
              title={project.title}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={
                project.video_path
                  ? api.getVideoStreamUrl(
                      project.id,
                      project.video_path.split(/[\\/]/).pop() || 'video.mp4'
                    )
                  : undefined
              }
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration);
              }}
              controls
              className="h-full w-full object-contain"
            />
          )}
        </div>

        {/* Video Bar Controls */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700 dark:border-slate-800/80 dark:bg-slate-950/80 dark:text-slate-300 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {formatTime(currentTime)}
            </span>
            <span className="text-slate-400 dark:text-slate-600">/</span>
            <span className="font-mono text-slate-500 dark:text-slate-400">
              {formatTime(duration)}
            </span>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl p-0.5 border border-slate-200 dark:border-slate-800">
            {[1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => changeSpeed(rate)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                  playbackRate === rate
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
