import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

// ── Icons ─────────────────────────────────────────────────────────────────────
const BankIcon    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const PhoneIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>;
const GoogleIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;
const TrashIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const StarIcon    = ({ filled }) => <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const PlusIcon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>;
const CheckIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// ── Method type config ────────────────────────────────────────────────────────
const METHOD_TYPES = {
  bank: {
    label: 'Bank Transfer',
    icon:  BankIcon,
    grad:  'linear-gradient(135deg,#3B6FFF,#2952D9)',
    glow:  'rgba(59,111,255,0.3)',
    providers: ['BRAC Bank','Dutch-Bangla Bank','City Bank','Islami Bank','Eastern Bank','Standard Chartered'],
  },
  mobile_banking: {
    label: 'Mobile Banking',
    icon:  PhoneIcon,
    grad:  'linear-gradient(135deg,#E91E8C,#FF5C8A)',
    glow:  'rgba(233,30,140,0.3)',
    providers: ['bKash','Nagad','Rocket','SureCash','Upay'],
  },
  google_pay: {
    label: 'Google Pay',
    icon:  GoogleIcon,
    grad:  'linear-gradient(135deg,#4285F4,#34A853)',
    glow:  'rgba(66,133,244,0.3)',
    providers: [],
  },
};

// ── Method label helper ───────────────────────────────────────────────────────
const methodSubtitle = (m) => {
  if (m.bank_name)            return `${m.bank_name} ···· ${m.account_num?.slice(-4)}`;
  if (m.provider_name)        return `${m.provider_name} · ${m.mb_phone}`;
  if (m.google_account_email) return m.google_account_email;
  return '';
};

// ── Method Card ───────────────────────────────────────────────────────────────
const MethodCard = ({ method, onDelete, onSetDefault, t, isDark }) => {
  const cfg  = METHOD_TYPES[method.method_name] || METHOD_TYPES.bank;
  const Icon = cfg.icon;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${method.is_default ? t.primary : t.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Glow blob */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: cfg.grad, opacity: 0.08, filter: 'blur(16px)', pointerEvents: 'none' }} />

      {/* Icon */}
      <div style={{ width: 42, height: 42, borderRadius: 12, background: cfg.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${cfg.glow}`, flexShrink: 0, color: '#fff' }}>
        <Icon />
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{cfg.label}</div>
          {method.is_default && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: isDark ? 'rgba(59,111,255,0.15)' : '#EEF2FF', color: t.primary, fontFamily: fonts.mono }}>
              Default
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: t.textSub, marginTop: 2, fontFamily: fonts.mono }}>{methodSubtitle(method)}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {!method.is_default && (
          <button onClick={() => onSetDefault(method.method_id)} title="Set as default"
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F5A623'; e.currentTarget.style.color = '#F5A623'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted; }}
          >
            <StarIcon filled={false} />
          </button>
        )}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} title="Delete"
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textMuted; }}
          >
            <TrashIcon />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => onDelete(method.method_id)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontFamily: fonts.ui, fontWeight: 600 }}>
              Confirm
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: `1px solid ${t.border}`, background: 'transparent', color: t.textSub, cursor: 'pointer', fontFamily: fonts.ui }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Add Method Modal ──────────────────────────────────────────────────────────
const AddMethodModal = ({ onClose, onAdded, t, isDark, authFetch }) => {
  const [type, setType]         = useState('mobile_banking');
  const [form, setForm]         = useState({});
  const [setDefault, setDef]    = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  const handleAdd = async () => {
    setLoading(true); setError('');
    try {
      const body = { method_name: type, set_default: setDefault, ...form };
      const res  = await authFetch('/api/consumer/payment-methods', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      setTimeout(() => { onAdded(); onClose(); }, 1500);
    } catch (err) { setError(err.message); }
    finally       { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF', color: t.text, fontSize: 13, fontFamily: fonts.ui, outline: 'none', boxSizing: 'border-box' };
  const cfg = METHOD_TYPES[type];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>Add Payment Method</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 22 }}>×</button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#16A34A' }}><CheckIcon /></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Method added!</div>
          </div>
        ) : (
          <>
            {/* Type selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 10 }}>Method Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {Object.entries(METHOD_TYPES).map(([key, c]) => {
                  const I = c.icon;
                  const active = type === key;
                  return (
                    <button key={key} onClick={() => { setType(key); setForm({}); }}
                      style={{ padding: '12px 8px', borderRadius: 12, border: `1.5px solid ${active ? 'transparent' : t.border}`, background: active ? c.grad : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, transition: 'all 0.15s', boxShadow: active ? `0 4px 14px ${c.glow}` : 'none' }}>
                      <span style={{ color: active ? '#fff' : t.textSub }}><I /></span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: active ? '#fff' : t.textSub, textAlign: 'center', lineHeight: 1.3 }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic fields */}
            {type === 'bank' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>Bank Name</label>
                  <select value={form.bank_name || ''} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Select bank...</option>
                    {METHOD_TYPES.bank.providers.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>Account Number</label>
                  <input value={form.account_num || ''} onChange={e => setForm(f => ({ ...f, account_num: e.target.value }))}
                    placeholder="e.g. 12345678901234" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = t.primary} onBlur={e => e.target.style.borderColor = t.border} />
                </div>
              </>
            )}

            {type === 'mobile_banking' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>Provider</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {METHOD_TYPES.mobile_banking.providers.map(p => (
                      <button key={p} onClick={() => setForm(f => ({ ...f, provider_name: p }))}
                        style={{ padding: '7px 14px', borderRadius: 100, border: `1.5px solid ${form.provider_name === p ? t.primary : t.border}`, background: form.provider_name === p ? (isDark ? 'rgba(59,111,255,0.12)' : '#EEF2FF') : 'transparent', color: form.provider_name === p ? t.primary : t.textSub, fontSize: 12, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>Phone Number</label>
                  <input value={form.phone_num || ''} onChange={e => setForm(f => ({ ...f, phone_num: e.target.value }))}
                    placeholder="01XXXXXXXXX" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = t.primary} onBlur={e => e.target.style.borderColor = t.border} />
                </div>
              </>
            )}

            {type === 'google_pay' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>Google Account Email</label>
                  <input type="email" value={form.google_account_email || ''} onChange={e => setForm(f => ({ ...f, google_account_email: e.target.value }))}
                    placeholder="you@gmail.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = t.primary} onBlur={e => e.target.style.borderColor = t.border} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>Phone Number <span style={{ color: t.textMuted }}>(optional)</span></label>
                  <input value={form.phone_num || ''} onChange={e => setForm(f => ({ ...f, phone_num: e.target.value }))}
                    placeholder="01XXXXXXXXX" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = t.primary} onBlur={e => e.target.style.borderColor = t.border} />
                </div>
              </>
            )}

            {/* Set as default */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={setDefault} onChange={e => setDef(e.target.checked)} style={{ accentColor: t.primary, width: 15, height: 15 }} />
              <span style={{ fontSize: 13, color: t.textSub }}>Set as default payment method</span>
            </label>

            {error && <div style={{ fontSize: 13, color: isDark ? '#F87171' : '#B91C1C', padding: '10px 14px', borderRadius: 8, background: isDark ? '#2D0C0C' : '#FEE2E2', marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: 13, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} disabled={loading}
                style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: loading ? t.textMuted : cfg.grad, color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: fonts.ui, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : `0 4px 14px ${cfg.glow}` }}>
                {loading ? 'Adding...' : 'Add Method'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Payment History Row ───────────────────────────────────────────────────────
const HistoryRow = ({ p, t, isDark }) => {
  const cfg  = METHOD_TYPES[p.method_name] || METHOD_TYPES.bank;
  const Icon = cfg.icon;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: `1px solid ${t.border}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: cfg.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${cfg.glow}`, flexShrink: 0, color: '#fff' }}>
        <Icon />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: t.text, textTransform: 'capitalize' }}>{p.utility_name} Bill</div>
        <div style={{ fontSize: 11, color: t.textSub, fontFamily: fonts.mono }}>{cfg.label} · {methodSubtitle(p)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>৳ {parseFloat(p.payment_amount).toLocaleString()}</div>
        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: fonts.mono }}>{new Date(p.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Payments = () => {
  const { authFetch } = useAuth();
  const { isDark }    = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [methods, setMethods]   = useState([]);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [tab, setTab]           = useState('methods'); // 'methods' | 'history'
  const [toast, setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, hRes] = await Promise.all([
        authFetch('/api/consumer/payment-methods'),
        authFetch('/api/consumer/payment-history'),
      ]);
      const [mData, hData] = await Promise.all([mRes.json(), hRes.json()]);
      setMethods(Array.isArray(mData) ? mData : []);
      setHistory(Array.isArray(hData) ? hData : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (id) => {
    try {
      const res = await authFetch(`/api/consumer/payment-methods/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setMethods(m => m.filter(x => x.method_id !== id));
      showToast('Payment method removed');
    } catch { showToast('Failed to delete'); }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await authFetch(`/api/consumer/payment-methods/${id}/default`, { method: 'PUT' });
      if (!res.ok) throw new Error();
      setMethods(m => m.map(x => ({ ...x, is_default: x.method_id === id })));
      showToast('Default method updated');
    } catch { showToast('Failed to update default'); }
  };

  const totalSpent = history.reduce((s, p) => s + parseFloat(p.payment_amount || 0), 0);

  return (
    <div style={{ fontFamily: fonts.ui, maxWidth: 700 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 300, padding: '12px 20px', borderRadius: 12, background: isDark ? '#0D2E1A' : '#DCFCE7', border: `1px solid ${isDark ? '#4ADE8033' : '#86EFAC'}`, color: isDark ? '#4ADE80' : '#16A34A', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: t.primary, fontFamily: fonts.mono, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Billing</div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: t.text, letterSpacing: '-0.4px', marginBottom: 4 }}>Payments</h1>
          <p style={{ fontSize: 14, color: t.textSub }}>Manage payment methods and view transaction history</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: fonts.ui, cursor: 'pointer', boxShadow: '0 4px 16px rgba(59,111,255,0.3)', whiteSpace: 'nowrap' }}>
          <PlusIcon /> Add Method
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 22 }}>
        {[
          { label: 'Saved Methods', val: methods.length,                   grad: 'linear-gradient(135deg,#3B6FFF,#00C4FF)' },
          { label: 'Total Payments', val: history.length,                  grad: 'linear-gradient(135deg,#22C55E,#16A34A)' },
          { label: 'Total Spent',   val: `৳${totalSpent.toLocaleString()}`, grad: 'linear-gradient(135deg,#F5A623,#FF6B00)' },
        ].map(c => (
          <div key={c.label} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 13, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -16, right: -16, width: 60, height: 60, borderRadius: '50%', background: c.grad, opacity: 0.1, filter: 'blur(12px)' }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: '-0.4px', marginBottom: 2 }}>{c.val}</div>
            <div style={{ fontSize: 12, color: t.textSub }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: isDark ? '#0D1525' : '#F1F5FF', borderRadius: 12, padding: 4 }}>
        {[['methods','Saved Methods'],['history','Payment History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', background: tab === key ? (isDark ? '#1A2A45' : '#fff') : 'transparent', color: tab === key ? t.text : t.textMuted, fontSize: 13, fontWeight: tab === key ? 600 : 400, fontFamily: fonts.ui, cursor: 'pointer', boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`, animation: 'pulse 1.5s infinite' }} />)}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : tab === 'methods' ? (
        methods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 0', color: t.textMuted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.textSub, marginBottom: 6 }}>No payment methods saved</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Add a method to pay bills faster</div>
            <button onClick={() => setShowAdd(true)}
              style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: fonts.ui, cursor: 'pointer' }}>
              Add First Method
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {methods.map(m => (
              <MethodCard key={m.method_id} method={m} onDelete={handleDelete} onSetDefault={handleSetDefault} t={t} isDark={isDark} />
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 0', color: t.textMuted, fontSize: 13 }}>No payment history yet</div>
        ) : (
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: '4px 20px' }}>
            {history.map((p, i) => <HistoryRow key={i} p={p} t={t} isDark={isDark} />)}
          </div>
        )
      )}

      {showAdd && <AddMethodModal onClose={() => setShowAdd(false)} onAdded={fetchAll} t={t} isDark={isDark} authFetch={authFetch} />}
    </div>
  );
};

export default Payments;