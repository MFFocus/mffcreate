'use client';

import React from 'react';
import { Project, StudyMaterials, api } from '@/lib/api';
import { Download, Printer, FileText, Layers, Archive } from 'lucide-react';

interface ExportTabProps {
  project: Project;
  study: StudyMaterials;
}

export const ExportTab: React.FC<ExportTabProps> = ({ project, study }) => {
  const downloadFile = (dataOrUrl: string, filename: string, isRawData = false) => {
    const a = document.createElement('a');
    if (isRawData) {
      const blob = new Blob([dataOrUrl], { type: 'text/plain;charset=utf-8' });
      a.href = URL.createObjectURL(blob);
    } else {
      a.href = dataOrUrl;
    }
    a.download = filename;
    a.target = '_blank';
    a.click();
  };

  const handleExportMarkdown = () => {
    if (project.id === 'demo-calculus') {
      let md = `# ${project.title}\n\n`;
      md += `> Duration: ${Math.floor(project.duration / 60)}m ${Math.floor(project.duration % 60)}s\n\n`;
      md += `## Deep Study Notes\n\n${study.deep_notes}\n\n`;
      md += `## Formulas\n\n`;
      study.formulas.forEach((f) => {
        md += `### ${f.name}\n$$${f.latex}$$\n${f.explanation}\n\n`;
      });
      downloadFile(md, `${project.title.replace(/\s+/g, '_')}_notes.md`, true);
    } else {
      downloadFile(api.getExportUrl(project.id, 'markdown'), `${project.title}_notes.md`);
    }
  };

  const handleExportAnki = () => {
    let tsv = '';
    study.flashcards.forEach((fc) => {
      tsv += `${fc.front.replace(/\t/g, ' ')}\t${fc.back.replace(/\t/g, ' ')}\t${fc.tag || 'Concept'}\n`;
    });
    downloadFile(tsv, `${project.title.replace(/\s+/g, '_')}_anki_deck.tsv`, true);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ project, study }, null, 2);
    downloadFile(dataStr, `${project.title.replace(/\s+/g, '_')}_study_package.json`, true);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Export & Study Anywhere
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Save notes, flashcards, and formulas to your computer. 100% private and compatible with Obsidian, Notion, and Anki.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Markdown Export */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Markdown Study Notes (.md)
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Complete study guide with chapters, deep notes, LaTeX formulas, and solved problems formatted for Obsidian, Logseq, or Notion.
            </p>
          </div>
          <button
            onClick={handleExportMarkdown}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download Markdown</span>
          </button>
        </div>

        {/* Printable View */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <Printer className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Printable Study Guide / PDF
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Clean, printer-friendly view rendered with KaTeX. Print from your browser or save directly as a PDF document.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-900/50 transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print or Save as PDF</span>
          </button>
        </div>

        {/* Anki Flashcards Deck */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Layers className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Anki Flashcard Deck (.tsv)
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Import directly into Anki or Quizlet. Contains all questions, formulas, and definitions categorized by concept tag.
            </p>
          </div>
          <button
            onClick={handleExportAnki}
            className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-50 px-4 py-2.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-200 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download Anki Deck</span>
          </button>
        </div>

        {/* Complete JSON Archive */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Archive className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Full JSON Study Package
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Self-contained raw JSON archive containing all extracted notes, mind map nodes, quiz questions, and formula metadata.
            </p>
          </div>
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download JSON Package</span>
          </button>
        </div>
      </div>
    </div>
  );
};
