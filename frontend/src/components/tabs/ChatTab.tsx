'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, Play, Bot, User, BookOpen, Lightbulb } from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamps?: number[];
}

interface ChatTabProps {
  projectId: string;
  onSeek: (seconds: number) => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ projectId, onSeek }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "### From the Video\nI am your grounded study assistant for this lecture. Everything I cite connects directly to specific moments in the video and slides.\n\n### Additional Explanation\nAsk me to break down difficult concepts, clarify mathematical formulas, or summarize specific sections in simpler terms.",
      timestamps: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api
      .getChatHistory(projectId)
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history);
        }
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendChatMessage(projectId, q);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.answer,
        timestamps: res.timestamps,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I couldn't process that question right now. Please try again or ask about specific concepts covered in the video.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const samplePrompts = [
    'Explain this concept in simpler words...',
    'What formulas were derived in this lecture?',
    'Show me the solved problems step-by-step',
    'Give me a 2-minute quick revision summary',
  ];

  // Helper to split response into "From the Video" and "Additional Explanation"
  const renderAssistantContent = (text: string) => {
    const fromVideoRegex = /###?\s*From the Video[:\s]*([\s\S]*?)(?=###?\s*Additional Explanation|$)/i;
    const addlRegex = /###?\s*Additional Explanation[:\s]*([\s\S]*)$/i;

    const matchFrom = text.match(fromVideoRegex);
    const matchAddl = text.match(addlRegex);

    if (matchFrom || matchAddl) {
      const fromVideoText = matchFrom ? matchFrom[1].trim() : '';
      const addlText = matchAddl ? matchAddl[1].trim() : '';

      return (
        <div className="space-y-3">
          {fromVideoText && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                <BookOpen className="h-3.5 w-3.5" />
                <span>From the Video</span>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {fromVideoText}
              </div>
            </div>
          )}

          {addlText && (
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Additional Explanation</span>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {addlText}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Default formatting
    return <div className="text-xs leading-relaxed whitespace-pre-wrap">{text}</div>;
  };

  return (
    <div className="flex flex-col h-[640px] rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Ask the Video</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Grounded in lecture speech and visual slides
            </p>
          </div>
        </div>
        <span className="text-[11px] text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 dark:text-emerald-400 font-medium">
          Source Citations
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white font-medium rounded-tr-none'
                  : 'bg-slate-50 text-slate-800 border border-slate-200 dark:bg-slate-950/80 dark:text-slate-200 dark:border-slate-800/80 rounded-tl-none space-y-3'
              }`}
            >
              {m.role === 'assistant' ? renderAssistantContent(m.content) : m.content}

              {/* Timestamp Chips */}
              {m.timestamps && m.timestamps.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium">Cited moments:</span>
                  {m.timestamps.map((ts, i) => (
                    <button
                      key={i}
                      onClick={() => onSeek(ts)}
                      className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 transition-colors"
                      title="Jump video to this timestamp"
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                      {formatTime(ts)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <span>Analyzing speech & slides for answer...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-950/30 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] text-slate-400 shrink-0 font-medium">Suggestions:</span>
        {samplePrompts.map((sp, i) => (
          <button
            key={i}
            onClick={() => handleSend(sp)}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300 transition-colors"
          >
            {sp}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-950/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Explain this concept in simpler words..."
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};
