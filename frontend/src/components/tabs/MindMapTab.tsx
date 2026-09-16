'use client';

import React, { useState } from 'react';
import { MindMapNode, MindMapEdge } from '@/lib/api';
import { Network, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MindMapTabProps {
  mindmap: { nodes: MindMapNode[]; edges: MindMapEdge[] };
  onSeek: (seconds: number) => void;
}

export const MindMapTab: React.FC<MindMapTabProps> = ({ mindmap, onSeek }) => {
  const [zoom, setZoom] = useState(1);

  const nodes = mindmap.nodes || [];
  const edges = mindmap.edges || [];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'root':
        return 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200';
      case 'chapter':
        return 'border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950/80 dark:text-sky-200';
      case 'formula':
        return 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200';
      case 'question':
        return 'border-purple-500 bg-purple-50 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200';
      default:
        return 'border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Interactive Concept Mind Map
          </h2>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 px-1 font-semibold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span>Core Subject</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span>Milestone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span>Formulas & Equations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
          <span>Solved Exercises</span>
        </div>
      </div>

      {/* Graph Visual Canvas */}
      <div className="relative min-h-[480px] rounded-3xl border border-slate-200 bg-slate-50/50 p-6 overflow-auto dark:border-slate-800 dark:bg-slate-950">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
          className="flex flex-col items-center gap-8 py-4"
        >
          {/* Root Node */}
          {nodes
            .filter((n) => n.type === 'root')
            .map((root) => (
              <div
                key={root.id}
                onClick={() => onSeek(root.timestamp)}
                className="px-6 py-3.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100 font-bold text-center shadow-lg shadow-emerald-500/10 cursor-pointer hover:scale-105 transition-transform max-w-md"
              >
                <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold mb-0.5">
                  Core Subject
                </div>
                <div className="text-sm sm:text-base">{root.label}</div>
              </div>
            ))}

          {/* Connected Children Branches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {nodes
              .filter((n) => n.type === 'chapter')
              .map((ch) => {
                const connectedEdges = edges.filter((e) => e.source === ch.id);
                const childNodes = nodes.filter((n) =>
                  connectedEdges.some((e) => e.target === n.id)
                );

                return (
                  <div
                    key={ch.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm relative"
                  >
                    {/* Chapter Parent Node */}
                    <div
                      onClick={() => onSeek(ch.timestamp)}
                      className="p-3 rounded-xl border border-sky-500/30 bg-sky-50 text-sky-950 dark:bg-sky-950/60 dark:text-sky-200 cursor-pointer hover:border-sky-400 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-sky-700 dark:text-sky-400 mb-1">
                        <span>Milestone</span>
                        <span>{formatTime(ch.timestamp)}</span>
                      </div>
                      <div className="text-xs font-bold">{ch.label}</div>
                    </div>

                    {/* Connected Sub-nodes */}
                    {childNodes.length > 0 && (
                      <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-2">
                        {childNodes.map((child) => (
                          <div
                            key={child.id}
                            onClick={() => onSeek(child.timestamp)}
                            className={`p-2.5 rounded-xl border text-[11px] cursor-pointer hover:scale-[1.02] transition-transform shadow-xs ${getNodeColor(
                              child.type
                            )}`}
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-75 mb-0.5">
                              <span className="capitalize font-semibold">{child.type}</span>
                              <span className="font-mono">{formatTime(child.timestamp)}</span>
                            </div>
                            <div className="font-medium truncate">{child.label}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
