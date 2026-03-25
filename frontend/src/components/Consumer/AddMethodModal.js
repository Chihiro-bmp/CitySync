import React, { useState, useEffect, useCallback } from 'react';
import { fonts } from '../../theme';
import { BankTransferIcon, MobileBankingIcon, GooglePayIcon } from '../../Icons';

// ── Icons ─────────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

// const defaultMethodTypes = {
//   bank: { label: 'Bank Transfer', icon: () => <div style={{width:18,height:18,borderRadius:4,background:'#fff'}}/>, grad: 'linear-gradient(135deg,#3B6FFF,#2952D9)', glow: 'rgba(59,111,255,0.3)', providers: ['BRAC Bank','Dutch-Bangla Bank'] },
//   mobile_banking: { label: 'Mobile Banking', icon: () => <div style={{width:18,height:18,borderRadius:9,background:'#fff'}}/>, grad: 'linear-gradient(135deg,#E91E8C,#FF5C8A)', glow: 'rgba(233,30,140,0.3)', providers: ['bKash','Nagad'] },
//   google_pay: { label: 'Google Pay', icon: () => <div style={{width:18,height:18,borderRadius:4,background:'#fff'}}/>, grad: 'linear-gradient(135deg,#4285F4,#34A853)', glow: 'rgba(66,133,244,0.3)', providers: [] },
// };

// ── Method type config ────────────────────────────────────────────────────────
const METHOD_TYPES = {
  bank: {
    label: 'Bank Transfer',
    icon:  BankTransferIcon,
    grad:  'linear-gradient(135deg,#3B6FFF,#2952D9)',
    glow:  'rgba(59,111,255,0.3)',
    providers: ['BRAC Bank','Dutch-Bangla Bank','City Bank','Islami Bank','Eastern Bank','Standard Chartered'],
  },
  mobile_banking: {
    label: 'Mobile Banking',
    icon:  MobileBankingIcon,
    grad:  'linear-gradient(135deg,#E91E8C,#FF5C8A)',
    glow:  'rgba(233,30,140,0.3)',
    providers: ['bKash','Nagad','Rocket','SureCash','Upay'],
  },
  google_pay: {
    label: 'Google Pay',
    icon:  GooglePayIcon,
    grad:  'linear-gradient(135deg,#4285F4,#34A853)',
    glow:  'rgba(66,133,244,0.3)',
    providers: [],
  },
};

const AddMethodModal = ({ onClose, onAdded, t, isDark, authFetch}) => {
  const [type, setType]         = useState('mobile_banking');
  const [form, setForm]         = useState({});
  const [setDefault, setDef]    = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);
  const [bankProviders, setBankProviders] = useState([]);
  const [mobileProviders, setMobileProviders] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        authFetch('/api/public/banks'),
        authFetch('/api/public/mobile-banking-providers'),
      ]);
      const [bData, pData] = await Promise.all([bRes.json(), pRes.json()]);
      setBankProviders(Array.isArray(bData) ? bData : []);
      setMobileProviders(Array.isArray(pData) ? pData : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [authFetch]);

	useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAdd = async () => {
    setLoading(true); setError('');
    try {
      const body = { method_name: type, set_default: setDefault, ...form };
      const res  = await authFetch('/api/consumer/payment-methods', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
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
                    {(bankProviders.length ? bankProviders : METHOD_TYPES.bank.providers).map((p) => {
                      const val = typeof p === 'string' ? p : (p.name || p.bank_name || JSON.stringify(p));
                      return <option key={val} value={val}>{val}</option>;
                    })}
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
                    {(mobileProviders.length ? mobileProviders : METHOD_TYPES.mobile_banking.providers).map((p) => {
                      const name = typeof p === 'string' ? p : (p.name || p.provider_name || JSON.stringify(p));
                      return (
                        <button key={name} onClick={() => setForm(f => ({ ...f, provider_name: name }))}
                          style={{ padding: '7px 14px', borderRadius: 100, border: `1.5px solid ${form.provider_name === name ? t.primary : t.border}`, background: form.provider_name === name ? (isDark ? 'rgba(59,111,255,0.12)' : '#EEF2FF') : 'transparent', color: form.provider_name === name ? t.primary : t.textSub, fontSize: 12, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer', transition: 'all 0.15s' }}>
                          {name}
                        </button>
                      );
                    })}
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
                  <input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
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

export default AddMethodModal;
