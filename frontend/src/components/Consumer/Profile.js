import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAvatar } from '../../context/AvatarContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

// ── Icons ─────────────────────────────────────────────────────────────────────
const EditIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const LockIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
const TrashIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const CameraIcon  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/></svg>;
const CheckIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const WarningIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const initials = (f, l) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

// ── Section card wrapper ──────────────────────────────────────────────────────
const Section = ({ title, subtitle, icon, action, children, t, isDark }) => (
  <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
    <div style={{ padding: '16px 22px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isDark ? '#0D1525' : '#F8FAFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: t.primary }}>{icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: t.textSub, marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
    <div style={{ padding: 22 }}>{children}</div>
  </div>
);

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, locked, onRequest }) => {
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${t.border}`, gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 150, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: t.textMuted, fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {locked && (
          <span title="Only an administrator can change this field" style={{ fontSize: 9, padding: '2px 6px', borderRadius: 100, background: isDark ? '#1A2235' : '#F1F5FF', color: t.textMuted, fontFamily: fonts.mono, border: `1px solid ${t.border}`, whiteSpace: 'nowrap' }}>
            🔒 admin only
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: locked ? t.textSub : t.text, textAlign: 'right' }}>{value || '—'}</span>
        {onRequest && (
          <button onClick={onRequest}
            style={{ flexShrink: 0, fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${t.border}`, background: 'transparent', color: t.primary, fontFamily: fonts.ui, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(59,111,255,0.1)' : '#EEF2FF'; e.currentTarget.style.borderColor = t.primary; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = t.border; }}
          >
            Request Change →
          </button>
        )}
      </div>
    </div>
  );
};

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ label, value, grad, t }) => (
  <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 13, padding: '14px 18px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
    <div style={{ position: 'absolute', inset: 0, background: grad, opacity: 0.05 }} />
    <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: fonts.ui, letterSpacing: '-0.5px' }}>{value}</div>
    <div style={{ fontSize: 11, color: t.textSub, marginTop: 3 }}>{label}</div>
  </div>
);

// ── Password strength ─────────────────────────────────────────────────────────
const strength = (pw) => {
  let s = 0;
  if (pw.length >= 8)   s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};
const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', '#EF4444', '#F5A623', '#3B6FFF', '#22C55E'];

// ── Change Password Modal ─────────────────────────────────────────────────────
const PasswordModal = ({ onClose, t, isDark, authFetch }) => {
  const [form, setForm]     = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);
  const pwStrength = strength(form.next);

  const handleChange = async () => {
    if (form.next !== form.confirm) { setError('New passwords do not match'); return; }
    if (form.next.length < 8)        { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const res  = await authFetch('/api/consumer/password', { method: 'PUT', body: JSON.stringify({ current_password: form.current, new_password: form.next }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      setTimeout(onClose, 2000);
    } catch (err) { setError(err.message); }
    finally       { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF', color: t.text, fontSize: 13, fontFamily: fonts.ui, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#3B6FFF,#2952D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LockIcon />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>Change Password</div>
            <div style={{ fontSize: 12, color: t.textSub }}>Choose a strong, unique password</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 22 }}>×</button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#16A34A' }}><CheckIcon /></div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Password changed!</div>
            <div style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>Closing automatically...</div>
          </div>
        ) : (
          <>
            {[
              { label: 'Current Password',  key: 'current'  },
              { label: 'New Password',      key: 'next'     },
              { label: 'Confirm Password',  key: 'confirm'  },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>{f.label}</label>
                <input type="password" value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = t.primary}
                  onBlur={e  => e.target.style.borderColor = t.border}
                />
                {/* Strength bar for new password */}
                {f.key === 'next' && form.next && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 100, background: i <= pwStrength ? strengthColor[pwStrength] : (isDark ? '#1A2235' : '#E8ECF5'), transition: 'background 0.2s' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: strengthColor[pwStrength], marginTop: 4, fontFamily: fonts.mono }}>{strengthLabel[pwStrength]}</div>
                  </div>
                )}
              </div>
            ))}

            {error && <div style={{ fontSize: 13, color: isDark ? '#F87171' : '#B91C1C', padding: '10px 14px', borderRadius: 8, background: isDark ? '#2D0C0C' : '#FEE2E2', marginBottom: 16 }}>{error}</div>}

            <button onClick={handleChange} disabled={loading} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? t.textMuted : 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: fonts.ui, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(59,111,255,0.3)' }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Deactivate Modal ──────────────────────────────────────────────────────────
const DeactivateModal = ({ onClose, t, isDark, authFetch, logout }) => {
  const [password, setPassword]   = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleDeactivate = async () => {
    setLoading(true); setError('');
    try {
      const res  = await authFetch('/api/consumer/deactivate', { method: 'PUT', body: JSON.stringify({ password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTimeout(logout, 1500);
    } catch (err) { setError(err.message); }
    finally       { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: t.bgCard, border: `2px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>

        {/* Warning header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: isDark ? '#2D0C0C' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: isDark ? '#F87171' : '#B91C1C' }}>
            <WarningIcon />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: isDark ? '#F87171' : '#B91C1C', marginBottom: 6 }}>Deactivate Account</div>
          <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>This will disable your account immediately. You will be logged out and won't be able to access CitySync until an administrator reactivates it.</div>
        </div>

        {/* Consequences */}
        <div style={{ background: isDark ? '#1A0808' : '#FFF5F5', border: `1px solid ${isDark ? '#5C1A1A' : '#FCA5A5'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#F87171' : '#B91C1C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>What happens when you deactivate:</div>
          {[
            'You will be immediately logged out',
            'All active connections remain in place (bills continue)',
            'Pending applications will be paused',
            'Contact support to reactivate your account',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
              <span style={{ color: isDark ? '#F87171' : '#EF4444', flexShrink: 0, marginTop: 1 }}>•</span>
              <span style={{ fontSize: 12, color: t.textSub }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Confirmation checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            style={{ marginTop: 2, accentColor: '#EF4444', width: 15, height: 15, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: t.textSub, lineHeight: 1.5 }}>I understand the consequences and want to deactivate my account</span>
        </label>

        {/* Password confirm */}
        {confirmed && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>Confirm with your password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your current password"
              style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`, background: isDark ? '#1A0808' : '#FFF5F5', color: t.text, fontSize: 13, fontFamily: fonts.ui, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        )}

        {error && <div style={{ fontSize: 13, color: isDark ? '#F87171' : '#B91C1C', padding: '10px 14px', borderRadius: 8, background: isDark ? '#2D0C0C' : '#FEE2E2', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: 13, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleDeactivate} disabled={!confirmed || !password || loading}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: !confirmed || !password || loading ? t.textMuted : 'linear-gradient(135deg,#EF4444,#B91C1C)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: fonts.ui, cursor: !confirmed || !password || loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Deactivating...' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
};


// ── Request Change Modal ──────────────────────────────────────────────────────
// Files a complaint/support ticket for field changes that need admin approval
const RequestChangeModal = ({ field, currentValue, onClose, t, isDark, authFetch }) => {
  const [newValue, setNewValue]   = useState('');
  const [reason, setReason]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);

  const handleSubmit = async () => {
    if (!newValue.trim()) { setError('Please provide the new value'); return; }
    if (!reason.trim())   { setError('Please provide a reason for the change'); return; }
    setLoading(true); setError('');
    try {
      const description = `CHANGE REQUEST — ${field}\nCurrent: ${currentValue}\nRequested: ${newValue}\nReason: ${reason}`;
      const res  = await authFetch('/api/consumer/complaints', {
        method: 'POST',
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      setTimeout(onClose, 2500);
    } catch (err) { setError(err.message); }
    finally       { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF', color: t.text, fontSize: 13, fontFamily: fonts.ui, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#3B6FFF,#00C4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <EditIcon />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Request {field} Change</div>
            <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>An employee will review and apply this change</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 22 }}>×</button>
        </div>

        {/* Notice banner */}
        <div style={{ padding: '11px 14px', borderRadius: 10, background: isDark ? 'rgba(59,111,255,0.08)' : '#EEF2FF', border: `1px solid ${isDark ? 'rgba(59,111,255,0.2)' : '#C7D7FE'}`, marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.6 }}>
            <strong style={{ color: t.primary }}>Current {field}:</strong> {currentValue}
            <br />This request will be sent to our support team. Changes are typically processed within 1–3 business days.
          </div>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#16A34A' }}>✓</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>Request submitted!</div>
            <div style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>You can track it in the Complaints section.</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>New {field}</label>
              <input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder={`Enter new ${field.toLowerCase()}...`} style={inputStyle}
                onFocus={e => e.target.style.borderColor = t.primary}
                onBlur={e  => e.target.style.borderColor = t.border}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>Reason for change</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="e.g. I have moved to a new address..." style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = t.primary}
                onBlur={e  => e.target.style.borderColor = t.border}
              />
            </div>

            {error && <div style={{ fontSize: 13, color: isDark ? '#F87171' : '#B91C1C', padding: '10px 14px', borderRadius: 8, background: isDark ? '#2D0C0C' : '#FEE2E2', marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: 13, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: loading ? t.textMuted : 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: fonts.ui, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(59,111,255,0.3)' }}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Edit Profile Modal ────────────────────────────────────────────────────────
const EditModal = ({ profile, onClose, onSaved, t, isDark, authFetch }) => {
  const [form, setForm]     = useState({ first_name: profile.first_name, last_name: profile.last_name, phone_number: profile.phone_number, gender: profile.gender || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      const res  = await authFetch('/api/consumer/profile', { method: 'PUT', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved(form);
    } catch (err) { setError(err.message); }
    finally       { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '10px 13px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF', color: t.text, fontSize: 13, fontFamily: fonts.ui, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>Edit Profile</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 22 }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: t.textSub, marginBottom: 20, padding: '10px 13px', borderRadius: 9, background: isDark ? 'rgba(59,111,255,0.06)' : '#F0F4FF', border: `1px solid ${isDark ? 'rgba(59,111,255,0.15)' : '#C7D7FE'}` }}>
          You can update your <strong style={{ color: t.text }}>name, phone, and gender</strong>. To change your email, address, or identity fields, use the <em>Request Change</em> option on the profile page.
        </div>

        {[
          { label: 'First Name',    key: 'first_name',    type: 'text' },
          { label: 'Last Name',     key: 'last_name',     type: 'text' },
          { label: 'Phone Number',  key: 'phone_number',  type: 'tel'  },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle}
              onFocus={e => e.target.style.borderColor = t.primary}
              onBlur={e  => e.target.style.borderColor = t.border}
            />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>Gender</label>
          <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {error && <div style={{ fontSize: 13, color: isDark ? '#F87171' : '#B91C1C', padding: '10px 14px', borderRadius: 8, background: isDark ? '#2D0C0C' : '#FEE2E2', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1.5px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: 13, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: loading ? t.textMuted : 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: fonts.ui, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(59,111,255,0.3)' }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Profile = () => {
  const { authFetch, logout } = useAuth();
  const { setAvatar: setGlobalAvatar } = useAvatar();
  const { isDark }            = useTheme();
  const navigate              = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [avatar, setAvatar]         = useState(null);
  const [avatarLoading, setAvtLoad] = useState(false);
  const [modal, setModal]           = useState(null); // 'edit' | 'password' | 'deactivate'
  const [requestField, setRequestField] = useState(null); // { field, currentValue }
  const [toast, setToast]           = useState('');
  const fileRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authFetch('/api/consumer/profile');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data);
      if (data.avatar_b64) setAvatar(data.avatar_b64);
    } catch (err) { console.error(err); }
    finally       { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Avatar upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) { showToast('Image too large. Max 2MB.'); return; }

    setAvtLoad(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result; // data:image/...;base64,...
      try {
        const res  = await authFetch('/api/consumer/avatar', { method: 'PUT', body: JSON.stringify({ avatar_b64: b64 }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setAvatar(b64);
        setGlobalAvatar(b64);
        showToast('Profile photo updated!');
      } catch (err) { showToast(err.message || 'Upload failed'); }
      finally       { setAvtLoad(false); }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 160, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}`, animation: 'pulse 1.5s infinite' }} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );

  if (!profile) return <div style={{ color: t.textMuted, padding: 40, textAlign: 'center' }}>Failed to load profile.</div>;

  const stats = [
    { label: 'Connections', value: profile.total_connections,  grad: 'linear-gradient(135deg,#3B6FFF,#00C4FF)' },
    { label: 'Bills',       value: profile.total_bills,        grad: 'linear-gradient(135deg,#F5A623,#FF6B00)' },
    { label: 'Applications',value: profile.total_applications, grad: 'linear-gradient(135deg,#7C5CFC,#3B6FFF)' },
    { label: 'Complaints',  value: profile.total_complaints,   grad: 'linear-gradient(135deg,#FF4E6A,#C2003F)' },
  ];

  return (
    <div style={{ fontFamily: fonts.ui, maxWidth: 800, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 300, padding: '12px 20px', borderRadius: 12, background: isDark ? '#0D2E1A' : '#DCFCE7', border: `1px solid ${isDark ? '#4ADE8033' : '#86EFAC'}`, color: isDark ? '#4ADE80' : '#16A34A', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', animation: 'slideIn 0.3s ease' }}>
          ✓ {toast}
          <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:none;opacity:1}}`}</style>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: t.primary, fontFamily: fonts.mono, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Account</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: t.text, letterSpacing: '-0.4px', marginBottom: 4 }}>My Profile</h1>
        <p style={{ fontSize: 14, color: t.textSub }}>Manage your personal information and account settings</p>
      </div>

      {/* ── Hero card: avatar + name + stats ── */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        {/* Background gradient blob */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'linear-gradient(135deg,#3B6FFF,#00C4FF)', opacity: 0.06, filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 88, height: 88, borderRadius: 24, overflow: 'hidden', background: 'linear-gradient(135deg,#3B6FFF,#00C4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${t.border}`, boxShadow: '0 4px 20px rgba(59,111,255,0.25)', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}>
              {avatar
                ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 30, fontWeight: 700, color: '#fff', fontFamily: fonts.ui }}>{initials(profile.first_name, profile.last_name)}</span>
              }
              {avatarLoading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}
            </div>
            {/* Camera badge */}
            <button onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', border: `2px solid ${t.bgCard}`, background: 'linear-gradient(135deg,#3B6FFF,#2952D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', boxShadow: '0 2px 8px rgba(59,111,255,0.4)' }} title="Change photo">
              <CameraIcon />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: t.text, letterSpacing: '-0.4px' }}>{profile.first_name} {profile.last_name}</div>
            <div style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>{profile.email}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: isDark ? 'rgba(59,111,255,0.15)' : '#EEF2FF', color: t.primary, fontFamily: fonts.mono }}>
                {profile.consumer_type}
              </span>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: isDark ? '#0D2E1A' : '#DCFCE7', color: isDark ? '#4ADE80' : '#16A34A', fontFamily: fonts.mono }}>
                Active
              </span>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: isDark ? '#1A2235' : '#F1F5FF', color: t.textSub, fontFamily: fonts.mono }}>
                Member since {new Date(profile.registration_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12, marginTop: 24 }}>
          {stats.map(s => <StatPill key={s.label} {...s} t={t} />)}
        </div>

        {/* Financial summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div style={{ background: isDark ? '#0D2E1A' : '#DCFCE7', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: isDark ? '#4ADE80' : '#16A34A', fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Total Paid</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#4ADE80' : '#16A34A' }}>৳ {parseFloat(profile.total_paid || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: isDark ? '#2D1F07' : '#FEF9C3', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: isDark ? '#FBBF24' : '#B45309', fontFamily: fonts.mono, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Outstanding</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: isDark ? '#FBBF24' : '#B45309' }}>৳ {parseFloat(profile.total_outstanding || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ── Personal Info ── */}
      <Section title="Personal Information" subtitle="Your registered details" icon={<EditIcon />} t={t} isDark={isDark}
        action={
          <button onClick={() => setModal('edit')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: 12, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer' }}>
            <EditIcon /> Edit
          </button>
        }
      >
        {/* Editable — name, gender, phone */}
        <InfoRow label="Full Name"     value={`${profile.first_name} ${profile.last_name}`} />
        <InfoRow label="Gender"        value={profile.gender} />
        <InfoRow label="Phone"         value={profile.phone_number} />

        {/* Locked — identity fields, admin-only */}
        <InfoRow label="National ID"   value={profile.national_id}        locked />
        <InfoRow label="Date of Birth" value={fmtDate(profile.date_of_birth)} locked />
        <InfoRow label="Email"         value={profile.email}              locked
          onRequest={() => setRequestField({ field: 'Email', currentValue: profile.email })}
        />

        {/* Address — requestable change */}
        <InfoRow label="Address"
          value={`${profile.house_num}, ${profile.street_name}${profile.landmark ? `, ${profile.landmark}` : ''}`}
          onRequest={() => setRequestField({ field: 'Address', currentValue: `${profile.house_num}, ${profile.street_name}, ${profile.region_name}` })}
        />
        <InfoRow label="Region"
          value={`${profile.region_name} — ${profile.postal_code}`}
          onRequest={() => setRequestField({ field: 'Region', currentValue: `${profile.region_name} (${profile.postal_code})` })}
        />
        <div style={{ paddingTop: 4 }}>
          <InfoRow label="Registered"  value={fmtDate(profile.registration_date)} locked />
        </div>
      </Section>

      {/* ── Account Settings ── */}
      <Section title="Account Settings" subtitle="Security and account management" icon={<LockIcon />} t={t} isDark={isDark}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, border: `1px solid ${t.border}`, background: isDark ? '#0D1525' : '#F8FAFF' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>Change Password</div>
              <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>Update your login password</div>
            </div>
            <button onClick={() => setModal('password')} style={{ padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: 13, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <LockIcon /> Change
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 12, border: `1px solid ${isDark ? '#5C1A1A' : '#FCA5A5'}`, background: isDark ? '#1A0808' : '#FFF5F5' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: isDark ? '#F87171' : '#B91C1C' }}>Deactivate Account</div>
              <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>Disable your account — requires admin to reactivate</div>
            </div>
            <button onClick={() => setModal('deactivate')} style={{ padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${isDark ? '#7F1D1D' : '#FCA5A5'}`, background: isDark ? '#2D0C0C' : '#FEE2E2', color: isDark ? '#F87171' : '#B91C1C', fontSize: 13, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrashIcon /> Deactivate
            </button>
          </div>

        </div>
      </Section>

      {/* Modals */}
      {requestField && (
        <RequestChangeModal
          field={requestField.field}
          currentValue={requestField.currentValue}
          onClose={() => setRequestField(null)}
          t={t} isDark={isDark} authFetch={authFetch}
        />
      )}
      {modal === 'edit'       && <EditModal       profile={profile} onClose={() => setModal(null)} onSaved={(upd) => { setProfile(p => ({ ...p, ...upd })); setModal(null); showToast('Profile updated!'); }} t={t} isDark={isDark} authFetch={authFetch} />}
      {modal === 'password'   && <PasswordModal   onClose={() => setModal(null)} t={t} isDark={isDark} authFetch={authFetch} />}
      {modal === 'deactivate' && <DeactivateModal onClose={() => setModal(null)} t={t} isDark={isDark} authFetch={authFetch} logout={logout} />}
    </div>
  );
};

export default Profile;