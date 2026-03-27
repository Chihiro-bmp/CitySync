import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities, statusColors } from '../../theme';
import { ElectricityIcon, WaterIcon, GasIcon, BillIcon, CheckCircle } from '../../Icons';
import PayBillModal from './PayBillModal';

const UtilIcons = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };

const Row = ({ label, value, mono, t }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:`1px solid ${t.border}` }}>
    <span style={{ fontSize:13, color:t.textSub }}>{label}</span>
    <span style={{ fontSize:13, fontWeight:500, color:t.text, fontFamily: mono ? fonts.mono : fonts.ui }}>{value}</span>
  </div>
);

const BillDetail = ({ billId, onClose, onBillPaid }) => {
  const { id: routeId } = useParams();
  const { authFetch } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

  const resolvedBillId = billId || routeId;
  const closeDetail = onClose || (() => navigate(-1));
  const overlayBg = 'rgba(0,0,0,0.55)';

  const [bill, setBill]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showPayModal, setShowPayModal] = useState(false);

  const fetchBill = useCallback(async () => {
    try {
      const res = await authFetch(`/api/consumer/bills/${resolvedBillId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBill(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, resolvedBillId]);

  useEffect(() => { fetchBill(); }, [fetchBill]);

  const handlePaySuccess = () => {
    setShowPayModal(false);
    if (onBillPaid) onBillPaid();
    closeDetail();
  };

  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:overlayBg, zIndex:190, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:760, background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:20, display:'flex', flexDirection:'column', gap:16 }}>
        {[1,2,3].map(i => <div key={i} style={{ height:80, borderRadius:14, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />)}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ position:'fixed', inset:0, background:overlayBg, zIndex:190, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:560, background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:'28px 22px', textAlign:'center' }}>
        <div style={{ fontSize:14, color: isDark ? '#F87171' : '#B91C1C' }}>{error}</div>
        <button onClick={closeDetail} style={{ marginTop:16, padding:'9px 20px', borderRadius:9, border:`1px solid ${t.border}`, background:'transparent', color:t.text, cursor:'pointer', fontFamily:fonts.ui }}>Close</button>
      </div>
    </div>
  );

  const util   = utilities[bill.utility_tag] || utilities.payment;
  const Icon   = UtilIcons[bill.utility_tag] || BillIcon;
  const isPayable = ['Pending', 'Overdue'].includes(bill.status);
  const isPostpaid = (bill?.bill_type || '').toLowerCase() === 'postpaid';
  const status = statusColors[bill.status] || statusColors['Pending'];

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : '—';

  return (
    <div
      style={{ position:'fixed', inset:0, background:overlayBg, zIndex:190, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={closeDetail}
    >
      <div
        style={{ fontFamily:fonts.ui, width:'100%', maxWidth:760, maxHeight:'92vh', overflowY:'auto', background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:20 }}
        onClick={(e) => e.stopPropagation()}
      >

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, color:t.text }}>Bill Details</div>
        <button onClick={closeDetail} style={{ background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontSize:24, lineHeight:1, padding:0 }}>×</button>
      </div>

      {/* Hero card */}
      <div style={{ borderRadius:20, overflow:'hidden', marginBottom:20, border:`1px solid ${t.border}` }}>
        {/* Gradient header */}
        <div style={{ background:util.gradient, padding:'28px 28px 24px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.1)', filter:'blur(30px)' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(0,0,0,0.15)' }}>
                <Icon size={24} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily:fonts.ui, fontSize:18, fontWeight:600, color:'#fff' }}>{bill.utility_name} Bill</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', fontFamily:fonts.mono }}>{bill.period}</div>
              </div>
            </div>
            <span style={{
              fontSize:12,
              fontWeight:500,
              padding:'4px 12px',
              borderRadius:100,
              background: isDark ? status.db : status.lb,
              color: isDark ? status.dc : status.lc,
              border: `1px solid ${isDark ? status.dc + '22' : status.lc + '22'}`,
              backdropFilter:'blur(4px)'
            }}>
              {bill.status}
            </span>
          </div>

          <div style={{ marginTop:24, position:'relative' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Total Amount</div>
            <div style={{ fontSize:40, fontWeight:700, color:'#fff', letterSpacing:'-1px', fontFamily:fonts.ui }}>৳ {parseFloat(bill.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Quick stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', background:t.bgCard }}>
          {(() => {
            const dateLabel = isPayable ? 'Due' : 'Paid';
            const dateVal = isPayable ? bill.due_date : bill.payment_date;
            const dateDisplay = dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
            const items = [
              { label:'Units Used',     val:`${bill.unit_consumed}`, sub: bill.unit_of_measurement || 'units' },
              { label:'Energy Charge',  val:`৳ ${parseFloat(bill.energy_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub:'Excl. taxes' },
              { label: dateLabel, val: dateDisplay },
            ];
  
            return items.map((s, i) => (
              <div key={s.label} style={{ padding:'16px 20px', borderRight: i < 2 ? `1px solid ${t.border}` : 'none', borderTop:`1px solid ${t.border}` }}>
                <div style={{ fontSize:10, color:t.textMuted, fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:16, fontWeight:600, color:t.text, fontFamily:fonts.ui, marginBottom:2 }}>{s.val}</div>
                <div style={{ fontSize:11, color:t.textMuted }}>{s.sub}</div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Details card */}
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:'4px 20px 4px', marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600, color:t.text, padding:'16px 0 4px', borderBottom:`2px solid ${t.border}`, marginBottom:4 }}>Bill Information</div>
        <Row label="Bill ID"         value={`#${bill.bill_document_id}`}                                         mono t={t} />
        <Row label="Bill Type"       value={bill.bill_type}                                                       t={t} />
        <Row label="Tariff Plan"     value={bill.tariff_name}                                                     t={t} />
        {/* <Row label="Billing Method"  value={bill.billing_method}                                                  t={t} /> */}
        {isPostpaid && <Row label="Period"          value={`${fmt(bill.bill_period_start)} — ${fmt(bill.bill_period_end)}`}      t={t} />}
        <Row label="Issue Date"    value={fmt(bill.bill_generation_date)}                                       t={t} />
        <Row label="Address"       value={bill.address}                                                         t={t} />
        {bill.fixed_charges && bill.fixed_charges.length > 0 && (
          bill.fixed_charges.map((fc, i) => (
            <Row
              key={i}
              label={fc.charge_name + (fc.period ? ' - ' + fc.period : '')}
              value={`৳ ${parseFloat(fc.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              t={t}
            />
          ))
        )}
        <Row label="Energy cost" value={`৳ ${parseFloat(bill.energy_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} t={t} />
        <Row label="Gross amount" value={`৳ ${parseFloat(bill.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} t={t} />
        {isPostpaid && bill.remarks && <Row label="Remarks" value={bill.remarks} t={t} />}
      </div>

      {/* Pay button (if payable) */}
      {isPayable && (
        <button onClick={() => setShowPayModal(true)} style={{
          width:'100%', padding:'14px', borderRadius:12, border:'none',
          background:'linear-gradient(135deg,#3B6FFF,#2952D9)',
          color:'#fff', fontSize:15, fontWeight:600, fontFamily:fonts.ui,
          cursor:'pointer', boxShadow:'0 4px 18px rgba(59,111,255,0.35)',
          letterSpacing:'-0.1px',
        }}>
          Pay Now
        </button>
      )}
      {bill.status === 'Paid' && (
        <div style={{ textAlign:'center', padding:'14px', borderRadius:12, background: isDark ? '#0D2E1A' : '#DCFCE7', border:`1px solid ${isDark ? '#4ADE8033' : '#86EFAC'}`, color: isDark ? '#4ADE80' : '#16A34A', fontSize:14, fontWeight:500 }}>
          <CheckCircle size={16} style={{ display:'inline', verticalAlign:'middle', marginRight:6 }} /> This bill has been paid
        </div>
      )}

        {showPayModal && bill && (
          <PayBillModal
            bill={{ ...bill, amount: bill.total_amount }}
            onClose={() => setShowPayModal(false)}
            onSuccess={handlePaySuccess}
            t={t}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
};

export default BillDetail;