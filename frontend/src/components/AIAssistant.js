import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from './Layout/ThemeContext';
import { tokens, fonts } from '../theme';

// ── Icons ─────────────────────────────────────────────────────────────────────
const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L13.09 8.26L19 6L14.74 10.91L21 12L14.74 13.09L19 18L13.09 15.74L12 22L10.91 15.74L5 18L9.26 13.09L3 12L9.26 10.91L5 6L10.91 8.26L12 2Z" fill="currentColor"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const ClearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Quick chips per role ──────────────────────────────────────────────────────
const CONSUMER_CHIPS = [
  'Which month was my highest electricity usage?',
  'Am I spending more than average on utilities?',
  'How can I reduce my water bill?',
  'Summarise my unpaid bills',
  'What are my usage trends this year?',
];

const EMPLOYEE_CHIPS = [
  'Which region generates the most revenue?',
  'Where are we getting the most complaints?',
  'Who is our top-performing field worker?',
  'Are we profitable this month?',
  'Which utility has the highest outstanding balance?',
];

// ── Message bubble ────────────────────────────────────────────────────────────
const Bubble = ({ msg, t, isDark }) => {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg,#3B6FFF,#00C4FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: 8, marginTop: 2,
          boxShadow: '0 2px 8px rgba(59,111,255,0.35)',
        }}>
          <SparkleIcon />
        </div>
      )}
      <div style={{
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser
          ? 'linear-gradient(135deg,#3B6FFF,#2952D9)'
          : isDark ? '#0D1525' : '#F1F5FF',
        color: isUser ? '#fff' : t.text,
        fontSize: 13,
        lineHeight: 1.65,
        fontFamily: fonts.ui,
        boxShadow: isUser
          ? '0 2px 8px rgba(59,111,255,0.3)'
          : `0 1px 3px rgba(0,0,0,0.08)`,
        border: !isUser ? `1px solid ${t.border}` : 'none',
        whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
      </div>
    </div>
  );
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingDots = ({ t }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
    <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#3B6FFF,#00C4FF)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <SparkleIcon />
    </div>
    <div style={{ display:'flex', gap:4, padding:'10px 14px', borderRadius:'14px 14px 14px 4px', background: t.bgCard, border:`1px solid ${t.border}` }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:6, height:6, borderRadius:'50%',
          background: t.primary,
          animation: `bounce 1.2s ease infinite`,
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
    <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AIAssistant = ({ role }) => {
  const { authFetch } = useAuth();
  const { isDark }    = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const chips = role === 'consumer' ? CONSUMER_CHIPS : EMPLOYEE_CHIPS;
  const endpoint = role === 'consumer' ? '/api/ai/consumer' : '/api/ai/employee';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const send = useCallback(async (question) => {
    const q = question || input.trim();
    if (!q || loading) return;

    setInput('');
    setError('');
    const newHistory = [...history, { role: 'user', content: q }];
    setHistory(newHistory);
    setLoading(true);

    try {
      const res  = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          question: q,
          history: history.slice(-6), // last 3 turns for context
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHistory(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setError('AI unavailable right now. Please try again.');
      setHistory(prev => prev.slice(0, -1)); // remove user msg on failure
    } finally {
      setLoading(false);
    }
  }, [input, history, loading, authFetch, endpoint]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 100,
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: 'none',
          background: open
            ? (isDark ? '#1A2235' : '#E8EDFF')
            : 'linear-gradient(135deg,#3B6FFF,#00C4FF)',
          color: open ? t.primary : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: open
            ? `0 2px 12px rgba(0,0,0,0.15)`
            : '0 4px 20px rgba(59,111,255,0.45)',
          transition: 'all 0.25s ease',
          transform: open ? 'rotate(15deg)' : 'none',
        }}
        title={open ? 'Close AI Assistant' : 'Ask AI Assistant'}
      >
        {open ? <CloseIcon /> : <SparkleIcon />}
      </button>

      {/* ── Slide-in panel ── */}
      <div style={{
        position: 'fixed',
        bottom: 92,
        right: 28,
        width: 380,
        height: 560,
        zIndex: 99,
        display: 'flex',
        flexDirection: 'column',
        background: isDark ? '#0B1120' : '#fff',
        border: `1px solid ${t.border}`,
        borderRadius: 20,
        boxShadow: isDark
          ? '0 24px 60px rgba(0,0,0,0.6)'
          : '0 24px 60px rgba(0,0,0,0.14)',
        overflow: 'hidden',
        transform: open ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
        transformOrigin: 'bottom right',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: `1px solid ${t.border}`,
          background: isDark
            ? 'linear-gradient(135deg, #0D1525 0%, #111827 100%)'
            : 'linear-gradient(135deg, #EEF2FF 0%, #F0F9FF 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: 'linear-gradient(135deg,#3B6FFF,#00C4FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(59,111,255,0.4)',
            color: '#fff', flexShrink: 0,
          }}>
            <SparkleIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: fonts.ui }}>
              AI Assistant
            </div>
            <div style={{ fontSize: 11, color: t.textSub, fontFamily: fonts.mono }}>
              {role === 'consumer' ? 'Powered by Claude · Your utility advisor' : 'Powered by Claude · Business insights'}
            </div>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => { setHistory([]); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, padding: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: fonts.ui }}
              title="Clear conversation"
            >
              <ClearIcon /> Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* Welcome + chips */}
          {history.length === 0 && !loading && (
            <div>
              <div style={{
                textAlign: 'center', padding: '8px 0 20px',
              }}>
                <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>
                  {role === 'consumer'
                    ? 'Ask me anything about your utility usage, bills, or how to save money.'
                    : 'Ask me about revenue, complaints, field worker performance, or operational insights.'
                  }
                </div>
              </div>

              <div style={{ fontSize: 11, color: t.textMuted, fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Quick questions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {chips.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => send(chip)}
                    style={{
                      textAlign: 'left',
                      padding: '9px 13px',
                      borderRadius: 10,
                      border: `1px solid ${t.border}`,
                      background: isDark ? 'rgba(59,111,255,0.05)' : '#F8FAFF',
                      color: t.text,
                      fontSize: 12,
                      fontFamily: fonts.ui,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      lineHeight: 1.4,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = t.primary;
                      e.currentTarget.style.background = isDark ? 'rgba(59,111,255,0.1)' : '#EEF2FF';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = t.border;
                      e.currentTarget.style.background = isDark ? 'rgba(59,111,255,0.05)' : '#F8FAFF';
                    }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat history */}
          {history.map((msg, i) => (
            <Bubble key={i} msg={msg} t={t} isDark={isDark} />
          ))}

          {loading && <TypingDots t={t} />}

          {error && (
            <div style={{ fontSize: 12, color: isDark ? '#F87171' : '#B91C1C', padding: '8px 12px', borderRadius: 8, background: isDark ? '#2D0C0C' : '#FEE2E2', marginBottom: 8 }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 14px',
          borderTop: `1px solid ${t.border}`,
          display: 'flex',
          gap: 8,
          flexShrink: 0,
          background: isDark ? '#080C18' : '#F8FAFF',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your data…"
            rows={1}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 10,
              border: `1.5px solid ${t.border}`,
              background: isDark ? '#0D1525' : '#fff',
              color: t.text,
              fontSize: 13,
              fontFamily: fonts.ui,
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              maxHeight: 80,
              overflowY: 'auto',
            }}
            onFocus={e => e.target.style.borderColor = t.primary}
            onBlur={e => e.target.style.borderColor = t.border}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 38, height: 38,
              borderRadius: 10,
              border: 'none',
              background: !input.trim() || loading
                ? (isDark ? '#1A2235' : '#E8ECF5')
                : 'linear-gradient(135deg,#3B6FFF,#2952D9)',
              color: !input.trim() || loading ? t.textMuted : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              boxShadow: !input.trim() || loading ? 'none' : '0 3px 10px rgba(59,111,255,0.35)',
              transition: 'all 0.2s',
              flexShrink: 0,
              alignSelf: 'flex-end',
            }}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </>
  );
};

export default AIAssistant;