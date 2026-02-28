import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities, statusColors } from '../../theme';
import { ElectricityIcon, WaterIcon, GasIcon, BillIcon } from '../../Icons';
import { DonutChart, ChartLegend } from '../Charts';

const UtilIcons = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };
const FILTERS   = ['All', 'Overdue', 'Pending', 'Paid'];

// ── Payment Modal ─────────────────────────────────────────────────────────────
// ── Method type display helpers (mirrors Payments.js) ────────────────────────
const METHOD_LABELS = { bank:'Bank Transfer', mobile_banking:'Mobile Banking', google_pay:'Google Pay' };
const METHOD_GRADS  = { bank:'linear-gradient(135deg,#3B6FFF,#2952D9)', mobile_banking:'linear-gradient(135deg,#E91E8C,#FF5C8A)', google_pay:'linear-gradient(135deg,#4285F4,#34A853)' };
const methodSub = (m) => {
  if (m.bank_name)            return `${m.bank_name} ···· ${m.account_num?.slice(-4)}`;
  if (m.provider_name)        return `${m.provider_name} · ${m.mb_phone}`;
  if (m.google_account_email) return m.google_account_email;
  return '';
};

const PayModal = ({ bill, onClose, onSuccess, t, isDark }) => {
  const { authFetch } = useAuth();
  const [methods, setMethods]     = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    authFetch('/api/consumer/payment-methods').then(r => r.json()).then(data => {
      const list = Array.isArray(data) ? data : [];
      setMethods(list);
      // Auto-select default or first
      const def = list.find(m => m.is_default) || list[0];
      if (def) setSelectedId(def.method_id);
    }).catch(() => {}).finally(() => setLoadingMethods(false));
  }, [authFetch]);

  const handlePay = async () => {
    if (!selectedId) { setError('Please select a payment method'); return; }
    setLoading(true); setError('');
    try {
      const res  = await authFetch('/api/consumer/payments', { method:'POST', body: JSON.stringify({ bill_document_id: bill.bill_document_id, payment_amount: bill.amount, method_id: selectedId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err) { setError(err.message || 'Payment failed'); }
    finally       { setLoading(false); }
  };

  const util = utilities[bill.utility_tag] || utilities.payment;
  const Icon = UtilIcons[bill.utility_tag] || BillIcon;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:28, width:'100%', maxWidth:440 }} onClick={e => e.stopPropagation()}>

        {/* Bill header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:util.gradient, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 12px ${util.glow}` }}>
            <Icon size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:t.text }}>{bill.utility_name} Bill</div>
            <div style={{ fontSize:12, color:t.textSub, fontFamily:fonts.mono }}>{bill.period}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontSize:22, lineHeight:1 }}>×</button>
        </div>

        {/* Amount */}
        <div style={{ background: isDark ? '#0A1020' : '#F8FAFF', borderRadius:12, padding:'16px 20px', marginBottom:22, textAlign:'center' }}>
          <div style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Amount Due</div>
          <div style={{ fontSize:32, fontWeight:700, color:t.text, letterSpacing:'-0.5px' }}>৳ {parseFloat(bill.amount).toLocaleString()}</div>
        </div>

        {/* Payment method picker */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:12, fontWeight:500, color:t.textSub, marginBottom:10 }}>Pay With</div>
          {loadingMethods ? (
            <div style={{ height:60, borderRadius:12, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />
          ) : methods.length === 0 ? (
            <div style={{ padding:'16px', borderRadius:12, border:`1.5px dashed ${t.border}`, textAlign:'center' }}>
              <div style={{ fontSize:13, color:t.textSub, marginBottom:8 }}>No saved payment methods</div>
              <a href="/consumer/payments" style={{ fontSize:12, color:t.primary, fontWeight:500 }}>Add a payment method →</a>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {methods.map(m => (
                <button key={m.method_id} onClick={() => setSelectedId(m.method_id)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, border:`1.5px solid ${selectedId === m.method_id ? t.primary : t.border}`, background: selectedId === m.method_id ? (isDark ? 'rgba(59,111,255,0.1)' : '#EEF2FF') : 'transparent', cursor:'pointer', transition:'all 0.15s', textAlign:'left' }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:METHOD_GRADS[m.method_name], display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', background:'rgba(255,255,255,0.8)' }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:t.text }}>{METHOD_LABELS[m.method_name] || m.method_name}</div>
                    <div style={{ fontSize:11, color:t.textSub, fontFamily:fonts.mono }}>{methodSub(m)}</div>
                  </div>
                  {m.is_default && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:isDark?'rgba(59,111,255,0.15)':'#EEF2FF', color:t.primary, fontFamily:fonts.mono, flexShrink:0 }}>Default</span>}
                  <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${selectedId===m.method_id ? t.primary : t.border}`, background:selectedId===m.method_id ? t.primary : 'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {selectedId===m.method_id && <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }} />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        {error && <div style={{ fontSize:13, color: isDark ? '#F87171' : '#B91C1C', marginBottom:14, padding:'10px 14px', borderRadius:8, background: isDark ? '#2D0C0C' : '#FEE2E2' }}>{error}</div>}

        <button onClick={handlePay} disabled={loading || !selectedId || methods.length === 0}
          style={{ width:'100%', padding:'13px', borderRadius:10, border:'none', background: loading || !selectedId ? t.textMuted : 'linear-gradient(135deg,#3B6FFF,#2952D9)', color:'#fff', fontSize:15, fontWeight:600, fontFamily:fonts.ui, cursor: loading || !selectedId ? 'not-allowed' : 'pointer', boxShadow: loading || !selectedId ? 'none' : '0 4px 16px rgba(59,111,255,0.3)' }}>
          {loading ? 'Processing...' : `Pay ৳ ${parseFloat(bill.amount).toLocaleString()}`}
        </button>
      </div>
    </div>
  );
};

// ── Bill Card ─────────────────────────────────────────────────────────────────
const BillCard = ({ bill, onPay, t, isDark }) => {
  const navigate = useNavigate();
  const util     = utilities[bill.utility_tag] || utilities.payment;
  const Icon     = UtilIcons[bill.utility_tag] || BillIcon;
  const status   = statusColors[bill.status]   || statusColors['Pending'];
  const isPayable= ['Pending','Overdue'].includes(bill.status);

  return (
    <div style={{ background:t.bgCard, border:`1px solid ${bill.status==='Overdue' ? (isDark?'#F8717144':'#FCA5A5') : t.border}`, borderRadius:16, padding:20, transition:'box-shadow 0.18s', borderLeft: bill.status==='Overdue' ? `3px solid ${isDark?'#F87171':'#EF4444'}` : `3px solid transparent` }}
      onMouseEnter={e => e.currentTarget.style.boxShadow=`0 4px 20px ${util.glow}`}
      onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:util.gradient, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 3px 10px ${util.glow}`, flexShrink:0 }}>
            <Icon size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:t.text }}>{bill.utility_name}</div>
            <div style={{ fontSize:11, color:t.textSub, fontFamily:fonts.mono }}>{bill.period}</div>
          </div>
        </div>
        <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:100, background: isDark ? status.db : status.lb, color: isDark ? status.dc : status.lc, border:`1px solid ${isDark ? status.dc+'22' : status.lc+'22'}`, whiteSpace:'nowrap' }}>
          {bill.status}
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14, padding:'12px 0', borderTop:`1px solid ${t.border}`, borderBottom:`1px solid ${t.border}` }}>
        {[
          { label:'Amount',   val:`৳ ${parseFloat(bill.amount).toLocaleString()}` },
          { label:'Units',    val:`${bill.unit_consumed||'—'}` },
          { label:'Due',      val: bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—' },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize:10, color:t.textMuted, fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>{item.label}</div>
            <div style={{ fontSize:14, fontWeight:600, color:t.text }}>{item.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => navigate(`/consumer/bills/${bill.bill_document_id}`)} style={{ flex:1, padding:'9px', borderRadius:9, border:`1.5px solid ${t.border}`, background:'transparent', color:t.text, fontSize:13, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer' }}>Details</button>
        {isPayable && <button onClick={() => onPay(bill)} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#3B6FFF,#2952D9)', color:'#fff', fontSize:13, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer', boxShadow:'0 3px 10px rgba(59,111,255,0.3)' }}>Pay Now</button>}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const MyBills = () => {
  const { authFetch }               = useAuth();
  const { isDark }                  = useTheme();
  const t                           = tokens[isDark ? 'dark' : 'light'];

  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('All');
  const [payingBill, setPayingBill] = useState(null);
  const [success, setSuccess]       = useState(false);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/consumer/bills');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBills(data);
    } catch (err) { console.error(err); }
    finally       { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const handlePaySuccess = () => {
    setPayingBill(null);
    setSuccess(true);
    fetchBills();
    setTimeout(() => setSuccess(false), 4000);
  };

  // ── Chart data ──────────────────────────────────────────────────────────────
  const statusSegments = [
    { label:'Paid',    value: bills.filter(b=>b.status==='Paid').length,    color:'#22C55E', pct:0 },
    { label:'Pending', value: bills.filter(b=>b.status==='Pending').length, color:'#F5A623', pct:0 },
    { label:'Overdue', value: bills.filter(b=>b.status==='Overdue').length, color:'#EF4444', pct:0 },
  ].filter(s => s.value > 0).map(s => ({ ...s, pct: s.value / (bills.length||1) }));

  // Spending by utility
  const utilitySpend = Object.values(utilities).map(u => {
    const total = bills.filter(b => b.utility_tag === u.tag).reduce((s,b) => s + parseFloat(b.amount||0), 0);
    const color = u.gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] || '#3B6FFF';
    return { label: u.label, value: Math.round(total), color, pct: 0 };
  }).filter(u => u.value > 0).map(u => ({ ...u, pct: u.value / bills.reduce((s,b) => s + parseFloat(b.amount||0), 0.001) }));

  // Connections by utility (count of bills per utility)
  const utilityCount = Object.values(utilities).map(u => {
    const count = bills.filter(b => b.utility_tag === u.tag).length;
    const color = u.gradient.match(/#[A-Fa-f0-9]{6}/)?.[0] || '#3B6FFF';
    return { label: u.label, value: count, color, pct: 0 };
  }).filter(u => u.value > 0).map(u => ({ ...u, pct: u.value / (bills.length||1) }));

  const filtered    = filter === 'All' ? bills : bills.filter(b => b.status === filter);
  const totalDue    = bills.filter(b=>['Pending','Overdue'].includes(b.status)).reduce((s,b)=>s+parseFloat(b.amount||0),0);
  const totalAmount = bills.reduce((s,b)=>s+parseFloat(b.amount||0),0);

  return (
    <div style={{ fontFamily:fonts.ui }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, color:t.primary, fontFamily:fonts.mono, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Billing</div>
        <h1 style={{ fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.4px', marginBottom:4 }}>My Bills</h1>
        <p style={{ fontSize:14, color:t.textSub }}>Track, analyse and pay your utility bills</p>
      </div>

      {success && (
        <div style={{ padding:'13px 18px', borderRadius:12, marginBottom:20, background: isDark?'#0D2E1A':'#DCFCE7', border:`1px solid ${isDark?'#4ADE8033':'#86EFAC'}`, color: isDark?'#4ADE80':'#16A34A', fontSize:13, fontWeight:500 }}>
          ✓ Payment successful! Bill updated.
        </div>
      )}

      {/* ── Charts row ── */}
      {!loading && bills.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:24 }}>

          {/* Bill status donut */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
            <div style={{ fontSize:14, fontWeight:600, color:t.text, marginBottom:4 }}>Bill Status</div>
            <div style={{ fontSize:12, color:t.textSub, marginBottom:16 }}>Distribution of all bills</div>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <DonutChart segments={statusSegments} size={130} thickness={28} label={bills.length} sublabel="total bills" t={t} />
              <ChartLegend segments={statusSegments} t={t} />
            </div>
          </div>

          {/* Spending by utility donut */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
            <div style={{ fontSize:14, fontWeight:600, color:t.text, marginBottom:4 }}>Spending by Utility</div>
            <div style={{ fontSize:12, color:t.textSub, marginBottom:16 }}>Total ৳ {Math.round(totalAmount).toLocaleString()}</div>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <DonutChart segments={utilitySpend} size={130} thickness={28} label={`৳${Math.round(totalAmount/1000)}k`} sublabel="total spent" t={t} />
              <ChartLegend segments={utilitySpend.map(u=>({...u, value:`৳${u.value.toLocaleString()}`}))} t={t} />
            </div>
          </div>

          {/* Bills per utility donut */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
            <div style={{ fontSize:14, fontWeight:600, color:t.text, marginBottom:4 }}>Bills by Utility</div>
            <div style={{ fontSize:12, color:t.textSub, marginBottom:16 }}>Count of bills per service</div>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <DonutChart segments={utilityCount} size={130} thickness={28} label={bills.length} sublabel="total bills" t={t} />
              <ChartLegend segments={utilityCount} t={t} />
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:22 }}>
        {[
          { label:'Total Due',  val:`৳ ${totalDue.toLocaleString()}`,                         grad:'linear-gradient(135deg,#7C5CFC,#3B6FFF)', glow:'rgba(124,92,252,0.25)' },
          { label:'Overdue',    val:bills.filter(b=>b.status==='Overdue').length,              grad:'linear-gradient(135deg,#FF4E6A,#C2003F)', glow:'rgba(255,78,106,0.25)' },
          { label:'Total Bills',val:bills.length,                                              grad:'linear-gradient(135deg,#3B6FFF,#00C4FF)', glow:'rgba(59,111,255,0.25)' },
          { label:'Paid',       val:bills.filter(b=>b.status==='Paid').length,                grad:'linear-gradient(135deg,#22C55E,#16A34A)', glow:'rgba(34,197,94,0.25)'  },
        ].map(card => (
          <div key={card.label} style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:13, padding:16, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-16, right:-16, width:60, height:60, borderRadius:'50%', background:card.grad, opacity:0.12, filter:'blur(12px)' }} />
            <div style={{ fontSize:22, fontWeight:700, color:t.text, letterSpacing:'-0.4px', marginBottom:2 }}>{card.val}</div>
            <div style={{ fontSize:12, color:t.textSub }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'7px 16px', borderRadius:100, border:`1.5px solid ${filter===f ? t.primary : t.border}`, background: filter===f ? (isDark?'rgba(59,111,255,0.15)':'#EEF2FF') : 'transparent', color: filter===f ? t.primary : t.textSub, fontSize:13, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer', transition:'all 0.15s' }}>
            {f} {f !== 'All' && <span style={{ marginLeft:5, fontSize:11, opacity:0.7 }}>{bills.filter(b=>b.status===f).length}</span>}
          </button>
        ))}
      </div>

      {/* Bills grid */}
      {loading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:180, borderRadius:16, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />)}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'56px 0', color:t.textMuted }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:14, fontWeight:500, color:t.textSub, marginBottom:6 }}>No {filter !== 'All' ? filter.toLowerCase() : ''} bills</div>
          <div style={{ fontSize:13 }}>Bills appear here once generated by the system</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {filtered.map(bill => <BillCard key={bill.bill_document_id} bill={bill} onPay={setPayingBill} t={t} isDark={isDark} />)}
        </div>
      )}

      {payingBill && <PayModal bill={payingBill} onClose={() => setPayingBill(null)} onSuccess={handlePaySuccess} t={t} isDark={isDark} />}
    </div>
  );
};

export default MyBills;