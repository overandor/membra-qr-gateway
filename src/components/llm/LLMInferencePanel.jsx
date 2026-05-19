import React, { useState, useRef, useEffect } from 'react';
import {
  Cpu, Send, Loader2, AlertTriangle, Copy, Zap, Terminal, Server,
  RotateCcw, Download, Trash2, Sparkles, BarChart3, Box, Lightbulb,
  TrendingUp, ShieldCheck, ChevronRight, X
} from 'lucide-react';
import { api } from '../../services/api';

const MODELS = [
  { id: 'openai', label: 'GPT-4o' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'llama', label: 'Llama' },
  { id: 'claude', label: 'Claude' },
  { id: 'deepseek', label: 'DeepSeek' },
];

const QUICK_ACTIONS = [
  { icon: BarChart3, label: 'Analyze Dashboard', prompt: 'Analyze my current MEMBRA dashboard. I have {{artifacts}} artifacts and {{events}} events. Give me 3 actionable insights.' },
  { icon: Box, label: 'Artifact Strategy', prompt: 'I have {{artifacts}} artifacts in my MEMBRA system. Suggest a monetization and provenance strategy for them.' },
  { icon: TrendingUp, label: 'Tokenomics Review', prompt: 'Review the MEMBRA tokenomics: bonding curve, rebase engine, and reward splits. What optimizations do you recommend?' },
  { icon: Lightbulb, label: 'Idea Validation', prompt: 'I want to turn an idea into a monetized artifact on MEMBRA. Walk me through the doctrine stages and what I need to prepare.' },
  { icon: ShieldCheck, label: 'Security Audit', prompt: 'Audit the MEMBRA security model: consent capture, redaction, notary, and settlement. What risks should I address?' },
  { icon: Sparkles, label: 'Generate Manifest', prompt: 'Generate a sample artifact manifest for a "Digital Art Piece" including all required fields for MEMBRA anchoring.' },
];

export function LLMInferencePanel({ liveArtifacts = [], liveEvents = [], liveSales = [], health = null }) {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('membra_llm_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem('membra_llm_model') || 'openai');
  const [systemPrompt, setSystemPrompt] = useState(() => localStorage.getItem('membra_llm_system') || 'You are MEMBRA AI, an expert assistant for the MEMBRA Human Chain platform. You help with artifact analysis, tokenomics, blockchain operations, and idea monetization. Be concise, technical, and actionable.');
  const [showSettings, setShowSettings] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const [error, setError] = useState('');
  const scrollRef = useRef();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    localStorage.setItem('membra_llm_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('membra_llm_model', model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem('membra_llm_system', systemPrompt);
  }, [systemPrompt]);

  const buildContext = () => {
    const ctx = [];
    ctx.push(`Current Dashboard State:`);
    ctx.push(`- Backend: ${health ? 'Online' : 'Offline'}`);
    ctx.push(`- Artifacts: ${liveArtifacts.length}`);
    ctx.push(`- Events: ${liveEvents.length}`);
    ctx.push(`- Token Sales: ${liveSales.length}`);
    if (liveArtifacts.length > 0) {
      ctx.push(`- Latest artifact: ${liveArtifacts[0].artifact_title || liveArtifacts[0].name || 'Untitled'} (${liveArtifacts[0].artifact_type || 'unknown'})`);
    }
    return ctx.join('\n');
  };

  const sendMessage = async (text, retry = false) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setPrompt('');
    setError('');
    setShowActions(false);

    const enrichedSystem = `${systemPrompt}\n\n${buildContext()}`;

    if (!retry) {
      setHistory((h) => [...h, { role: 'user', content: userMsg, ts: Date.now() }]);
    }
    setLoading(true);

    try {
      const data = await api.llmInference({ prompt: userMsg, model, system_prompt: enrichedSystem });
      setHistory((h) => [...h, { role: 'assistant', content: data.response, ts: Date.now() }]);
    } catch (e) {
      setError(e.message);
      setHistory((h) => [...h, { role: 'assistant', content: `Error: ${e.message}. Ensure backend (app.py) is running on port 7860.`, ts: Date.now(), isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => sendMessage(prompt);

  const handleQuickAction = (action) => {
    const filled = action.prompt
      .replace('{{artifacts}}', liveArtifacts.length)
      .replace('{{events}}', liveEvents.length)
      .replace('{{sales}}', liveSales.length);
    sendMessage(filled);
  };

  const handleRetry = () => {
    const lastUser = [...history].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      setHistory((h) => h.slice(0, -1));
      sendMessage(lastUser.content, true);
    }
  };

  const handleClear = () => {
    if (confirm('Clear entire conversation?')) {
      setHistory([]);
      setShowActions(true);
      localStorage.removeItem('membra_llm_history');
    }
  };

  const handleExport = () => {
    const blob = new Blob(
      [history.map((m) => `${m.role.toUpperCase()} (${new Date(m.ts).toLocaleString()}):\n${m.content}\n`).join('\n---\n\n')],
      { type: 'text/plain' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `membra-ai-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="neo-card p-0 overflow-hidden flex flex-col" style={{ height: '65vh' }}>
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="neo-btn-primary w-9 h-9 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">MEMBRA AI Engine</h3>
            <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
              <Server className="w-3 h-3" /> {MODELS.find((m) => m.id === model)?.label || model} • {history.length} messages
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button onClick={handleRetry} title="Retry last" className="neo-btn p-2">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleExport} title="Export chat" className="neo-btn p-2">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleClear} title="Clear chat" className="neo-btn p-2 text-[var(--accent-danger)]">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={`neo-btn px-3 py-1.5 text-xs ${showSettings ? 'neo-btn-primary text-black' : ''}`}
          >
            <Terminal className="w-3.5 h-3.5 inline mr-1" /> Config
          </button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="neo-card-pressed p-4 border-b border-white/5 space-y-3">
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase-tracking mb-2 block">Select Model</label>
            <div className="flex gap-2 flex-wrap">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`neo-btn px-3 py-1.5 text-xs ${model === m.id ? 'neo-btn-primary text-black' : ''}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase-tracking mb-1 block">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
              className="neo-input w-full px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">
            Context: {liveArtifacts.length} artifacts, {liveEvents.length} events, backend {health ? 'online' : 'offline'}
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {showActions && history.length === 0 && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Zap className="w-10 h-10 text-[var(--accent-orange)] mx-auto mb-3 animate-pulse-glow rounded-full p-2" />
              <p className="text-sm text-[var(--text-muted)]">Start a conversation with MEMBRA AI</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">Or use a quick action below</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action)}
                  className="neo-card-pressed p-3 text-left hover:bg-[var(--accent-orange)]/5 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <action.icon className="w-4 h-4 text-[var(--accent-orange)]" />
                    <span className="text-xs font-medium text-[var(--text-primary)]">{action.label}</span>
                    <ChevronRight className="w-3 h-3 text-[var(--text-muted)] ml-auto group-hover:text-[var(--accent-orange)] transition-colors" />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] line-clamp-2">{action.prompt.slice(0, 80)}...</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`neo-elevated w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-[var(--accent-orange)]/10' : msg.isError ? 'bg-[var(--accent-danger)]/10' : 'bg-[var(--accent-gold)]/10'
            }`}>
              {msg.role === 'user' ? <Terminal className="w-4 h-4 text-[var(--accent-orange)]" /> : msg.isError ? <AlertTriangle className="w-4 h-4 text-[var(--accent-danger)]" /> : <Cpu className="w-4 h-4 text-[var(--accent-gold)]" />}
            </div>
            <div className={`neo-card p-3 max-w-[85%] text-sm ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'} ${msg.isError ? 'border-[var(--accent-danger)]/20' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-[var(--text-muted)]">{msg.role === 'user' ? 'You' : 'MEMBRA AI'}</span>
                <span className="text-[10px] text-[var(--text-muted)] opacity-50">{formatTime(msg.ts)}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.role === 'assistant' && !msg.isError && (
                <button
                  onClick={() => navigator.clipboard.writeText(msg.content)}
                  className="mt-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent-orange)] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="neo-elevated w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--accent-gold)]/10">
              <Cpu className="w-4 h-4 text-[var(--accent-gold)] animate-pulse" />
            </div>
            <div className="neo-card p-3 rounded-tl-none">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-orange)]" />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        {error && (
          <div className="neo-card p-2 mb-3 flex items-center justify-between text-[var(--accent-danger)] text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </div>
            <button onClick={handleRetry} className="text-[var(--accent-orange)] hover:underline">Retry</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder="Ask about artifacts, tokenomics, or strategies..."
            className="neo-input flex-1 px-4 py-3 text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !prompt.trim()}
            className="neo-btn-primary px-4 py-3 disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
