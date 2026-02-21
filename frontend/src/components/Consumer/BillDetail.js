import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities, statusColors } from '../../theme';
import { ElectricityIcon, WaterIcon, GasIcon, BillIcon } from '../../Icons';

const UtilIcons = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };

const Row = ({ label, value, mono, t }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 0', borderBottom:`1px solid ${t.border}` }}>
    <span style={{ fontSize:13, color:t.textSub }}>{label}</span>
    <span style={{ fontSize:13, fontWeight:500, color:t.text, fontFamily: mono ? fonts.mono : fonts.ui }}>{value}</span>
  </div>
);

const BillDetail = () => {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [bill, setBill]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchBill = useCallback(async () => {
    try {
      const res = await authFetch(`/api/consumer/bills/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBill(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => { fetchBill(); }, [fetchBill]);

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {[1,2,3].map(i => <div key={i} style={{ height:80, borderRadius:14, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ textAlign:'center', padding:'64px 0' }}>
      <div style={{ fontSize:14, color: isDark ? '#F87171' : '#B91C1C' }}>{error}</div>
      <button onClick={() => navigate(-1)} style={{ marginTop:16, padding:'9px 20px', borderRadius:9, border:`1px solid ${t.border}`, background:'transparent', color:t.text, cursor:'pointer', fontFamily:fonts.ui }}>Go Back</button>
    </div>
  );

  const util   = utilities[bill.utility_tag] || utilities.payment;
  const Icon   = UtilIcons[bill.utility_tag] || BillIcon;
  const status = statusColors[bill.status] || statusColors['Pending'];
  const isPayable = ['Pending', 'Overdue'].includes(bill.status);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : '—';

  return (
    <div style={{ fontFamily:fonts.ui, maxWidth:680, margin:'0 auto' }}>

      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:t.textSub, fontSize:13, fontFamily:fonts.ui, marginBottom:20, padding:0 }}>
        ← Back to Bills
      </button>

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
            <span style={{ fontSize:12, fontWeight:500, padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,0.2)', color:'#fff', backdropFilter:'blur(4px)' }}>
              {bill.status}
            </span>
          </div>

          <div style={{ marginTop:24, position:'relative' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Total Amount</div>
            <div style={{ fontSize:40, fontWeight:700, color:'#fff', letterSpacing:'-1px', fontFamily:fonts.ui }}>৳ {parseFloat(bill.total_amount).toLocaleString()}</div>
          </div>
        </div>

        {/* Quick stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', background:t.bgCard }}>
          {[
            { label:'Units Used',     val:`${bill.unit_consumed}`, sub: bill.unit_of_measurement || 'units' },
            { label:'Energy Charge',  val:`৳ ${parseFloat(bill.energy_amount||0).toLocaleString()}`, sub:'Excl. taxes' },
            { label:'Due Date',       val: bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—', sub:'Payment deadline' },
          ].map((s,i) => (
            <div key={s.label} style={{ padding:'16px 20px', borderRight: i < 2 ? `1px solid ${t.border}` : 'none', borderTop:`1px solid ${t.border}` }}>
              <div style={{ fontSize:10, color:t.textMuted, fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:16, fontWeight:600, color:t.text, fontFamily:fonts.ui, marginBottom:2 }}>{s.val}</div>
              <div style={{ fontSize:11, color:t.textMuted }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Details card */}
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:'4px 20px 4px', marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:600, color:t.text, padding:'16px 0 4px', borderBottom:`2px solid ${t.border}`, marginBottom:4 }}>Bill Information</div>
        <Row label="Bill ID"         value={`#${bill.bill_document_id}`}                                         mono t={t} />
        <Row label="Bill Type"       value={bill.bill_type}                                                       t={t} />
        <Row label="Tariff Plan"     value={bill.tariff_name}                                                     t={t} />
        <Row label="Billing Method"  value={bill.billing_method}                                                  t={t} />
        <Row label="Period"          value={`${fmt(bill.bill_period_start)} — ${fmt(bill.bill_period_end)}`}      t={t} />
        <Row label="Generated On"    value={fmt(bill.bill_generation_date)}                                       t={t} />
        {bill.remarks && <Row label="Remarks" value={bill.remarks} t={t} />}
      </div>

      {/* Pay button (if payable) */}
      {isPayable && (
        <button onClick={() => navigate('/consumer/bills', { state: { payBillId: bill.bill_document_id } })} style={{
          width:'100%', padding:'14px', borderRadius:12, border:'none',
          background:'linear-gradient(135deg,#3B6FFF,#2952D9)',
          color:'#fff', fontSize:15, fontWeight:600, fontFamily:fonts.ui,
          cursor:'pointer', boxShadow:'0 4px 18px rgba(59,111,255,0.35)',
          letterSpacing:'-0.1px',
        }}>
          Pay ৳ {parseFloat(bill.total_amount).toLocaleString()} Now
        </button>
      )}
      {bill.status === 'Paid' && (
        <div style={{ textAlign:'center', padding:'14px', borderRadius:12, background: isDark ? '#0D2E1A' : '#DCFCE7', border:`1px solid ${isDark ? '#4ADE8033' : '#86EFAC'}`, color: isDark ? '#4ADE80' : '#16A34A', fontSize:14, fontWeight:500 }}>
          ✓ This bill has been paid
        </div>
      )}
    </div>
  );
};

export default BillDetail;