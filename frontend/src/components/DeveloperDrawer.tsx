'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Terminal,
  Cpu,
  Server,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { api, getBackendUrl, setBackendUrl, HealthStatus, SystemStatus } from '@/lib/api';

interface DeveloperDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperDrawer: React.FC<DeveloperDrawerProps> = ({ isOpen, onClose }) => {
  const [customBackendUrl, setCustomBackendUrl] = useState('');
  const [health, setHealth] = useState<HealthStatus>({ ok: false });
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomBackendUrl(getBackendUrl());
      checkHealth();
    }
  }, [isOpen]);

  const checkHealth = async (urlToCheck?: string) => {
    setTesting(true);
    setTestResult(null);
    const h = await api.checkHealth(urlToCheck || customBackendUrl);
    setHealth(h);
    setTesting(false);
    if (h.ok) {
      setTestResult('success');
      try {
        const st = await api.getSystemStatus();
        setSystemStatus(st);
      } catch {
        setSystemStatus(null);
      }
    } else {
      setTestResult('error');
      setSystemStatus(null);
    }
  };

  const handleSave = () => {
    setBackendUrl(customBackendUrl);
    checkHealth(customBackendUrl);
    onClose();
  };

  const handleReset = () => {
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const def = process.env.NEXT_PUBLIC_BACKEND_URL || (isLocalhost ? 'http://127.0.0.1:8000' : '');
    setCustomBackendUrl(def);
    setBackendUrl(def);
    checkHealth(def);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Developer Diagnostics</h3>
              <p className="text-[11px] text-slate-500">Local engine & advanced runtime configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning Badge */}
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <p className="font-semibold">Developer-Only Area</p>
          <p className="mt-0.5 text-[11px] text-amber-600/90 dark:text-amber-300/80 leading-relaxed">
            Ordinary users do not need to configure this. These settings control the local processing daemon on your machine.
          </p>
        </div>

        {/* Status Card */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800/80 dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5" /> Engine Connectivity
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                health.ok
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${health.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {health.ok ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {health.ok ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                Connected to MffConvert backend v{health.version || '2.0.0'} ({health.service || 'api'}).
              </span>
            ) : (
              <span>
                Backend offline or unreachable. To test or connect a custom backend daemon, specify its address below.
              </span>
            )}
          </div>
        </div>

        {/* Backend URL input */}
        <div className="mt-5 space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Engine URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={customBackendUrl}
              onChange={(e) => setCustomBackendUrl(e.target.value)}
              placeholder="Leave blank for built-in cloud service"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => checkHealth(customBackendUrl)}
              disabled={testing}
              className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test'}
            </button>
          </div>

          {testResult === 'success' && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connection confirmed!
            </p>
          )}
          {testResult === 'error' && (
            <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
              <XCircle className="h-3.5 w-3.5" /> Could not reach daemon at this address.
            </p>
          )}
        </div>

        {/* LLM & Model Status */}
        {systemStatus && (
          <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Cpu className="h-3.5 w-3.5" /> Model Infrastructure
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Synthesis Engine:</span>
                <span className="font-mono text-slate-900 dark:text-slate-200 font-semibold">{systemStatus.default_engine}</span>
              </div>
              <div className="flex justify-between">
                <span>Ollama Available:</span>
                <span className="font-mono">{systemStatus.ollama?.available ? 'Yes' : 'No (Using Local NLP)'}</span>
              </div>
              {systemStatus.ollama?.models && systemStatus.ollama.models.length > 0 && (
                <div>
                  <span className="block mb-1">Detected Ollama Models:</span>
                  <div className="flex flex-wrap gap-1">
                    {systemStatus.ollama.models.map((m) => (
                      <span key={m} className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <RotateCcw className="h-3 w-3" /> Reset default
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition-colors"
            >
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
