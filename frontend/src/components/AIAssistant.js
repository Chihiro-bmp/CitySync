import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// v3-style quick chips
const CONSUMER_CHIPS = [
  'Why is my bill high?',
  'Check my balance',
  'Usage this week',
  'File a complaint',
];

const EMPLOYEE_CHIPS = [
  'Which region generates the most revenue?',
  'Where are we getting the most complaints?',
  'Who is our top-performing field worker?',
  'Which utility has the highest outstanding balance?',
];

const BubbleIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="13" y2="14" />
  </svg>
);

const SunburstIcon = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const AIAssistant = ({ role }) => {
  const { authFetch } = useAuth();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    {
      role: 'assistant',
      content:
        role === 'consumer'
          ? "Hi! Ask me anything about operations, regions, complaints, or performance."
          : 'Hi! Ask me anything about operations, regions, complaints, or performance.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const wrapRef = useRef(null);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  const chips = role === 'consumer' ? CONSUMER_CHIPS : EMPLOYEE_CHIPS;
  const endpoint = role === 'consumer' ? '/api/ai/consumer' : '/api/ai/employee';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, history, loading]);

  const send = useCallback(
    async (question) => {
      const q = (question ?? input).trim();
      if (!q || loading) return;

      setInput('');
      setError('');
      setHistory((prev) => [...prev, { role: 'user', content: q }]);
      setLoading(true);

      try {
        const res = await authFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            question: q,
            history: history.slice(-6),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setHistory((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      } catch (err) {
        setError('AI unavailable right now. Please try again.');
        setHistory((prev) => prev.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [authFetch, endpoint, history, input, loading]
  );

  return (
    <div ref={wrapRef}>
      {/* Floating bubble */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[500] w-[50px] h-[50px] rounded-full flex items-center justify-center cursor-pointer backdrop-blur-xl transition-transform duration-300 border border-lime/30 shadow-[0_0_0_0_rgba(204,255,0,0)] hover:scale-[1.08] hover:border-lime/60 hover:shadow-[0_0_22px_rgba(204,255,0,0.15)]"
        style={{
          background:
            'linear-gradient(135deg,rgba(204,255,0,0.15),rgba(204,255,0,0.06))',
        }}
        title="Ask CitySync AI"
      >
        <span className="absolute -inset-1 rounded-full border border-lime/20 ai-pulse-ring" />
        <span className="text-lime w-[22px] h-[22px]">
          <BubbleIcon />
        </span>
      </button>

      {/* Panel */}
      <div
        className={`fixed bottom-[84px] right-6 z-[500] w-[320px] rounded-2xl overflow-hidden border border-white/10 backdrop-blur-2xl transition-all duration-300 origin-bottom-right ${
          open ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-2.5 scale-[0.97] pointer-events-none'
        }`}
        style={{ background: 'rgba(12,12,12,0.96)' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-lime/10 border border-lime/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lime w-[14px] h-[14px]">
              <SunburstIcon />
            </span>
          </div>
          <div className="min-w-0">
            <div className="font-rajdhani text-[15px] font-bold text-txt leading-none">CitySync AI</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-lime/60 mt-0.5 leading-none">
              ● Online · Ready
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesRef} className="px-4 pt-4 pb-2 flex flex-col gap-2 max-h-[220px] overflow-y-auto">
          {history.map((m, idx) => (
            <div key={idx} className={`flex gap-2 items-start ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`text-[12px] leading-[1.55] px-3 py-2 rounded-[10px] max-w-[80%] ${
                  m.role === 'user'
                    ? 'bg-lime/10 border border-lime/20 text-txt/80'
                    : 'bg-white/5 text-txt/70'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 items-start">
              <div className="text-[12px] leading-[1.55] px-3 py-2 rounded-[10px] max-w-[80%] bg-white/5 text-txt/50">
                Checking your account data…
              </div>
            </div>
          )}
          {error && (
            <div className="text-[11px] font-mono text-red-500/80 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Chips */}
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => send(c)}
              className="font-mono text-[8.5px] tracking-wide px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-txt/45 hover:border-lime/30 hover:text-lime/70 transition-colors"
            >
              {c}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-white/10 flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-txt outline-none placeholder:text-txt/20 focus:border-lime/30"
            placeholder="Ask anything about your utilities…"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-[30px] h-[30px] rounded-lg bg-lime/10 border border-lime/30 flex items-center justify-center text-lime disabled:opacity-40 disabled:cursor-not-allowed hover:bg-lime/20 transition-colors"
            title="Send"
          >
            <span className="w-[13px] h-[13px]">
              <SendIcon />
            </span>
          </button>
        </div>
      </div>

      <style>{`
        .ai-pulse-ring{ animation:pulse-ring 2.5s ease-out infinite; }
        @keyframes pulse-ring{
          0%{ transform:scale(1); opacity:0.6; }
          100%{ transform:scale(1.35); opacity:0; }
        }
        .ai-pulse-ring{ pointer-events:none; }
        .ai-pulse-ring{ border-width:1px; }
        .ai-pulse-ring{ border-color: rgba(204,255,0,0.18); }
        .ai-pulse-ring{ position:absolute; }
      `}</style>
    </div>
  );
};

export default AIAssistant;