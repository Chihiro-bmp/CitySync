import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fonts, utilities } from '../../theme';
import { ElectricityIcon, WaterIcon, GasIcon, ConnectionIcon } from '../../Icons';

const UTIL_ICONS = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };

const RechargeModal = ({ connection, onClose, onSuccess, t, isDark }) => {
  const { authFetch } = useAuth();
  const [amount, setAmount] = useState('');
  const [preset, setPreset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const Icon = UTIL_ICONS[connection.utility_tag] || ConnectionIcon;
  const util = utilities[connection.utility_tag] || utilities.payment;

  const presets = [500, 1000, 1500, 2000];

  const handlePreset = (v) => {
    setPreset(v);
    setAmount(String(v));
  };

  const handleRecharge = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!connection.prepaid_account_id) {
      setError('No prepaid account configured');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/consumer/recharge', {
        method: 'POST',
        body: JSON.stringify({ id: connection.prepaid_account_id, amount: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Recharge failed');
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setError(err.message || 'Recharge failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 22, width: '100%', maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width:44, height:44, borderRadius:13, background: util.gradient, display:'flex',alignItems:'center',justifyContent:'center', boxShadow:`0 4px 12px ${util.glow}` }}>
            <Icon size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:t.text }}>Recharge Prepaid Account</div>
            <div style={{ fontSize:12, color:t.textSub, fontFamily:fonts.mono }}>{connection.utility_name}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontSize:22, lineHeight:1 }}>
            ×
          </button>
        </div>

        <div style={{ background: isDark ? '#0A1020' : '#F8FAFF', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Account Balance</div>
          <div style={{ fontSize:20, fontWeight:700, color:t.text, fontFamily:fonts.mono }}>{typeof connection.prepaid_balance !== 'undefined' && connection.prepaid_balance !== null ? `৳${parseFloat(connection.prepaid_balance).toFixed(2)}` : '-'}</div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:12, color:t.textSub, marginBottom:8 }}>Amount</div>
          <input
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setPreset(null); }}
            placeholder="Enter amount"
            type="number"
            style={{ width:'100%', padding:'12px', borderRadius:10, border:`1px solid ${t.border}`, background:'transparent', color:t.text, boxSizing:'border-box', fontFamily:fonts.ui }}
          />
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, color:t.textSub, marginBottom:8 }}>Quick amounts</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {presets.map((p) => (
              <button key={p} onClick={() => handlePreset(p)} style={{ padding:'8px 12px', borderRadius:10, border: `1px solid ${preset===p ? t.primary : t.border}`, background: preset===p ? (isDark ? 'rgba(59,111,255,0.08)' : '#EEF2FF') : 'transparent', color:t.text, cursor:'pointer' }}>{p}</button>
            ))}
          </div>
        </div>

        {error && <div style={{ fontSize:13, color:isDark ? '#F87171' : '#B91C1C', marginBottom:12, padding:'8px 10px', borderRadius:8, background:isDark ? '#2D0C0C' : '#FEE2E2' }}>{error}</div>}

        <button onClick={handleRecharge} disabled={loading} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background: loading ? t.textMuted : 'linear-gradient(135deg,#3B6FFF,#2952D9)', color:'#fff', fontSize:15, fontWeight:600, fontFamily:fonts.ui, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Processing...' : `Recharge`}
        </button>
      </div>
    </div>
  );
};

export default RechargeModal;
