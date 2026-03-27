import React, { useState, useEffect, useCallback, use } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities, statusColors } from '../../theme';
import { ElectricityIcon, WaterIcon, GasIcon, BillIcon, Check, FileText } from '../../Icons';
import { DonutChart, ChartLegend } from '../Charts';
import PayBillModal from './PayBillModal';
import BillDetail from './BillDetail';

const UtilIcons = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };
const FILTERS   = ['All', 'Overdue', 'Pending', 'Paid'];
const BILL_TYPES = ['All', 'Prepaid', 'Postpaid'];

// ── Bill Card ─────────────────────────────────────────────────────────────────
const BillCard = ({ bill, onPay, onOpenDetail, t, isDark }) => {
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
            <div style={{ fontSize:14, fontWeight:600, color:t.text }}>{bill.connection_name}</div>
            <div style={{ fontSize:11, color:t.textSub, fontFamily:fonts.mono }}>{bill.period}</div>
          </div>
        </div>
        <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:100, background: isDark ? status.db : status.lb, color: isDark ? status.dc : status.lc, border:`1px solid ${isDark ? status.dc+'22' : status.lc+'22'}`, whiteSpace:'nowrap' }}>
          {bill.status}
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14, padding:'12px 0', borderTop:`1px solid ${t.border}`, borderBottom:`1px solid ${t.border}` }}>
        {(() => {
          const unitsVal = (bill.bill_type?.toLowerCase() === 'prepaid') ? (bill.energy_amount || '—') : (bill.unit_consumed || '—');
          const dateLabel = isPayable ? 'Due' : 'Paid';
          const dateVal = isPayable ? bill.due_date : bill.payment_date;
          const dateDisplay = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';
          const items = [
            { label: 'Amount', val: `৳ ${parseFloat(bill.amount).toLocaleString()}` },
            { label: 'Units',  val: unitsVal },
            { label: dateLabel, val: dateDisplay },
          ];

          return items.map(item => (
            <div key={item.label}>
              <div style={{ fontSize:10, color:t.textMuted, fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>{item.label}</div>
              <div style={{ fontSize:14, fontWeight:600, color:t.text }}>{item.val}</div>
            </div>
          ));
        })()}
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={() => onOpenDetail(bill.bill_document_id)} style={{ flex:1, padding:'9px', borderRadius:9, border:`1.5px solid ${t.border}`, background:'transparent', color:t.text, fontSize:13, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer' }}>Details</button>
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
  const [connections, setConnections] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [connectionFilter, setConnectionFilter] = useState('All');
  const [payingBill, setPayingBill] = useState(null);
  const [detailBillId, setDetailBillId] = useState(null);
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

  // derive connections list from bills for connection tabs
  // const connections = React.useMemo(() => {
  //   const m = new Map();
  //   bills.forEach(b => {
  //     const id = b.connection_id ?? b.connection_name;
  //     if (!m.has(id)) m.set(id, { id, name: b.connection_name, utility: b.utility_tag });
  //   });
  //   return Array.from(m.values());
  // }, [bills]);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/consumer/connections');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Keep only id, name and optional utility type to avoid passing large payload into state
          const mapped = data.map(c => ({ id: c.connection_id, name: c.connection_name, utility: c.utility_tag, unit: c.unit_of_measurement }));
          setConnections(mapped);
          return;
        }
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch connections');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const filteredByConnection = connectionFilter === 'All' ? bills : bills.filter(b => (b.connection_id ?? b.connection_name) === connectionFilter);
  const filteredByType = typeFilter === 'All' ? filteredByConnection : filteredByConnection.filter(b => (b.bill_type && b.bill_type.toLowerCase() === typeFilter.toLowerCase()));
  const filtered    = filter === 'All' ? filteredByType : filteredByType.filter(b => b.status === filter);
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
          <Check size={14} style={{ display:'inline', verticalAlign:'middle', marginRight:6 }} /> Payment successful! Bill updated.
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
              <DonutChart segments={statusSegments} size={130} thickness={8} label={bills.length} sublabel="total bills" t={t} />
              <ChartLegend segments={statusSegments} t={t} />
            </div>
          </div>

          {/* Spending by utility donut */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
            <div style={{ fontSize:14, fontWeight:600, color:t.text, marginBottom:4 }}>Spending by Utility</div>
            <div style={{ fontSize:12, color:t.textSub, marginBottom:16 }}>Total ৳ {Math.round(totalAmount).toLocaleString()}</div>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <DonutChart segments={utilitySpend} size={130} thickness={10} label={`৳${Math.round(totalAmount/1000)}k`} sublabel="total spent" t={t} />
              <ChartLegend segments={utilitySpend.map(u=>({...u, value:`৳${u.value.toLocaleString()}`}))} t={t} />
            </div>
          </div>

          {/* Bills per utility donut */}
          <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:22 }}>
            <div style={{ fontSize:14, fontWeight:600, color:t.text, marginBottom:4 }}>Bills by Utility</div>
            <div style={{ fontSize:12, color:t.textSub, marginBottom:16 }}>Count of bills per service</div>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <DonutChart segments={utilityCount} size={130} thickness={10} label={bills.length} sublabel="total bills" t={t} />
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

      {/* Connection tabs (copied style from UsageHistory) */}
      <div style={{ display:'flex', gap:10, marginBottom:10, flexWrap:'wrap' }}>
        {[{ id: 'All', name: 'All' }, ...(connections || [])].map(tab => {
          const active = connectionFilter === tab.id;
          const u = utilities[tab.utility] || utilities.payment;
          const Ic = UtilIcons[tab.utility] || BillIcon;
          return (
            <button key={tab.id} onClick={() => setConnectionFilter(tab.id)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:12, border:`1.5px solid ${active ? 'transparent' : t.border}`, background: active ? u.gradient : (isDark ? t.bgCard : '#fff'), cursor:'pointer', transition:'all 0.2s', boxShadow: active ? `0 4px 14px ${u.glow}` : 'none' }}>
              <Ic size={15} color={active ? '#fff' : t.textSub} />
              <span style={{ fontSize:13, fontWeight:500, color: active ? '#fff' : t.textSub, textTransform:'capitalize' }}>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Type tabs (Prepaid / Postpaid) */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        {BILL_TYPES.map(bt => (
          <button key={bt} onClick={() => setTypeFilter(bt)} style={{ padding:'6px 14px', borderRadius:100, border:`1.5px solid ${typeFilter===bt ? t.primary : t.border}`, background: typeFilter===bt ? 'rgba(204,255,0,0.08)' : 'transparent', color: typeFilter===bt ? t.primary : t.textSub, fontSize:13, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer', transition:'all 0.15s' }}>
            {bt}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'7px 16px', borderRadius:100, border:`1.5px solid ${filter===f ? t.primary : t.border}`, background: filter===f ? 'rgba(204,255,0,0.08)' : 'transparent', color: filter===f ? t.primary : t.textSub, fontSize:13, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer', transition:'all 0.15s' }}>
            {f} {f !== 'All' && <span style={{ marginLeft:5, fontSize:11, opacity:0.7 }}>{bills.filter(b=> (connectionFilter==='All' || ((b.connection_id ?? b.connection_name) === connectionFilter)) && (typeFilter==='All' || (b.bill_type && b.bill_type.toLowerCase()===typeFilter.toLowerCase())) && b.status===f).length}</span>}
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
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12, opacity:0.3 }}><FileText size={40} /></div>
          <div style={{ fontSize:14, fontWeight:500, color:t.textSub, marginBottom:6 }}>No {filter !== 'All' ? filter.toLowerCase() : ''} bills</div>
          <div style={{ fontSize:13 }}>Bills appear here once generated by the system</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {filtered.map(bill => <BillCard key={bill.bill_document_id} bill={bill} onPay={setPayingBill} onOpenDetail={setDetailBillId} t={t} isDark={isDark} />)}
        </div>
      )}

      {payingBill && <PayBillModal bill={payingBill} onClose={() => setPayingBill(null)} onSuccess={handlePaySuccess} t={t} isDark={isDark} />}
      {detailBillId && <BillDetail billId={detailBillId} onClose={() => setDetailBillId(null)} onBillPaid={handlePaySuccess} />}
    </div>
  );
};

export default MyBills;