import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities, statusColors } from '../../theme';
import { ElectricityIcon, WaterIcon, GasIcon, ConnectionIcon } from '../../Icons';
import RechargeModal from './RechargeModal';
import BillDetail from './BillDetail';

const UTIL_ICONS = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };

const InfoRow = ({ label, value, t, mono }) => (
  <div style={{ display:'flex', justifyContent:'space-between', gap:14, alignItems:'center', padding:'11px 0', borderBottom:`1px solid ${t.border}` }}>
    <span style={{ fontSize:13, color:t.textSub }}>{label}</span>
    <span style={{ fontSize:13, color:t.text, fontWeight:500, fontFamily:mono ? fonts.mono : fonts.ui, textAlign:'right' }}>{value || '-'}</span>
  </div>
);

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
};

const ConnectionDetail = () => {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [openedBillId, setOpenedBillId] = useState(null);

  const fetchConnection = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`/api/consumer/connections/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch connection');
      setConnection(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch connection');
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const util = useMemo(() => {
    if (!connection) return utilities.electricity;
    return utilities[connection.utility_tag] || utilities.electricity;
  }, [connection]);

  const Icon = useMemo(() => {
    if (!connection) return ConnectionIcon;
    return UTIL_ICONS[connection.utility_tag] || ConnectionIcon;
  }, [connection]);

  const statusColor = useMemo(() => {
    if (!connection) return statusColors.Inactive;
    return statusColors[connection.connection_status] || statusColors.Inactive;
  }, [connection]);

  const usageText = connection
    ? `${parseFloat(connection.units_used || 0).toFixed(1)} ${connection.unit_of_measurement || ''}`
    : '-';

  if (loading) {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
        {[1, 2, 3].map((k) => (
          <div key={k} style={{ height:160, borderRadius:14, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />
        ))}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth:700, margin:'0 auto', background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, padding:20 }}>
        <div style={{ fontSize:15, color:isDark ? '#F87171' : '#B91C1C', marginBottom:12 }}>{error}</div>
        <div style={{ display:'flex', gap:10 }}>
          <button
            onClick={() => navigate('/consumer/connections')}
            style={{ padding:'9px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#3B6FFF,#2952D9)', color:'#fff', cursor:'pointer', fontFamily:fonts.ui, fontWeight:600 }}
          >
            Back to Connections
          </button>
          <button
            onClick={fetchConnection}
            style={{ padding:'9px 16px', borderRadius:10, border:`1px solid ${t.border}`, background:'transparent', color:t.text, cursor:'pointer', fontFamily:fonts.ui }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const connectionName = connection.connection_name || connection.utility_name;

  return (
    <div style={{ fontFamily:fonts.ui }}>
      {/* Page header (title + actions) */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:11, color:t.primary, fontFamily:fonts.mono, fontWeight:600, letterSpacing:'0.11em', textTransform:'uppercase', marginBottom:4 }}>
            Utilities
          </div>
          <h1 style={{ fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.4px', marginBottom:3 }}>Connection Details</h1>
          <div style={{ fontSize:13, color:t.textSub }}>Detailed information for connection ID #{connection.connection_id}</div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button
            onClick={() => navigate('/consumer/connections')}
            style={{ padding:'10px 16px', borderRadius:10, border:`1px solid ${t.border}`, background:t.bgCard, color:t.text, cursor:'pointer', fontSize:13, fontFamily:fonts.ui }}
          >
            Back
          </button>
        </div>
      </div>

      {/* Header / Summary area: left column (bordered box containing gradient + quick facts) and right prepaid panel */}
      <div style={{ marginBottom:18 }}>
        <div style={{ display:'flex', gap:14, alignItems:'stretch', padding:12, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:280 }}>
            <div style={{ borderRadius:18, overflow:'hidden', border:`1px solid ${t.border}`, display:'flex', flexDirection:'column' }}>
              <div style={{ background:util.gradient, padding:'24px 24px 20px', position:'relative', overflow:'hidden' }}>
								<div style={{ position:'absolute', width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.11)', top:-70, right:-30, filter:'blur(18px)' }} />
									<div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, position:'relative' }}>
											<div style={{ display:'flex', alignItems:'center', gap:12 }}>
											<div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
													<Icon size={24} color="#fff" />
											</div>
											<div>
													<div style={{ fontSize:18, color:'#fff', fontWeight:600, textTransform:'capitalize' }}>{connectionName}</div>
													<div style={{ fontSize:12, color:'rgba(255,255,255,0.72)', fontFamily:fonts.mono }}>{connection.utility_name}</div>
											</div>
											</div>

											<span style={{ fontSize:14, fontWeight:600, borderRadius:100, padding:'5px 11px', background:isDark ? statusColor.db : statusColor.lb, color:isDark ? statusColor.dc : statusColor.lc }}>
											{connection.connection_status}
											</span>
									</div>

									<div style={{ marginTop:20 }}>
											<div style={{ fontSize:10, color:'rgba(255,255,255,0.72)', fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
											Current Month Usage
											</div>
											<div style={{ fontSize:34, lineHeight:1.1, fontWeight:700, color:'#fff' }}>{usageText}</div>
									</div>
              </div>
          
							{/* Header quick facts (type, payment, tariff, billing) - placed under gradient in left column */}
							<div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', borderTop:`1px solid ${t.border}`, background:t.bgCard }}>
								{[
									{ label:'Connection Type', value:connection.connection_type },
									{ label:'Payment Type', value:connection.payment_type },
									{ label:'Tariff', value:connection.tariff_name },
									{ label:'Billing Method', value:connection.billing_method },
								].map((item, idx) => (
									<div key={item.label} style={{ padding:'14px 16px', borderRight:idx < 3 ? `1px solid ${t.border}` : 'none' }}>
										<div style={{ fontSize:10, color:t.textMuted, fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
											{item.label}
										</div>
										<div style={{ fontSize:14, color:t.text, fontWeight:600 }}>{item.value || '-'}</div>
									</div>
								))}
							</div>
						</div>
					</div>

          {/* Prepaid summary box (right column styled like other detail cards) */}
					{connection && connection.payment_type && connection.payment_type.toLowerCase() === 'prepaid' && (
	          <div style={{ width:380, display:'flex', alignItems:'stretch', justifyContent:'center' }}>
              <div style={{ width:'100%', height:'100%', background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:'4px 18px', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'flex-start' }}>
                <div style={{ fontSize:20, fontWeight:600, color:t.text, padding:'14px 0 6px', borderBottom:`2px solid ${t.border}` }}>
                  Prepaid Account
                </div>
                <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'stretch', gap:10 }}>
                  <InfoRow label="Account ID" value={connection.prepaid_account_id ? `#${connection.prepaid_account_id}` : '-'} t={t} mono />

                  <div style={{ marginTop:6, textAlign:'center' }}>
                    <div style={{ fontSize:28, color:t.text, fontWeight:800, fontFamily:fonts.mono }}>{typeof connection.prepaid_balance !== 'undefined' && connection.prepaid_balance !== null ? `৳${parseFloat(connection.prepaid_balance).toFixed(2)}` : '-'}</div>
                    <div style={{ fontSize:12, color:t.textSub, marginTop:4 }}>Balance</div>
                  </div>

                  <button
                    onClick={() => setShowRechargeModal(true)}
                    style={{ padding:'10px 12px', marginTop:8, borderRadius:10, border:'none', background:'linear-gradient(135deg,#3B6FFF,#2952D9)', color:'#fff', cursor:'pointer', fontFamily:fonts.ui, fontWeight:600, width:'100%' }}
                  >
                    Recharge
                  </button>
                </div>
              </div>
          	</div>
          )}
        </div>
      </div>

      {/* Detail cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14 }}>
        {/* Connection Information card */}
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:'4px 18px' }}>
          <div style={{ fontSize:20, fontWeight:600, color:t.text, padding:'14px 0 6px', borderBottom:`2px solid ${t.border}` }}>
            Connection Information
          </div>
          <InfoRow label="Connection ID" value={`#${connection.connection_id}`} t={t} mono />
          <InfoRow label="Connection Name" value={connection.connection_name || '-'} t={t} />
          {/* <InfoRow label="Status" value={connection.connection_status} t={t} /> */}
          <InfoRow label="Connected Type" value={connection.connection_type} t={t} />
          <InfoRow label="Connected Since" value={formatDate(connection.connection_date)} t={t} />
          <InfoRow label="Utility Type" value={connection.utility_type} t={t} />
          {/* <InfoRow label="Utility Name" value={connection.utility_name} t={t} /> */}
          {/* <InfoRow label="Utility Unit" value={connection.unit_of_measurement} t={t} /> */}
        </div>
        {/* Billing and Address card */}
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:'4px 18px' }}>
          <div style={{ fontSize:20, fontWeight:600, color:t.text, padding:'14px 0 6px', borderBottom:`2px solid ${t.border}` }}>
            Billing and Address
          </div>
          <InfoRow label="Tariff Plan" value={connection.tariff_name} t={t} />
          {/* <InfoRow label="Billing Method" value={connection.billing_method} t={t} /> */}
          <InfoRow label="Payment Type" value={connection.payment_type} t={t} />
          <InfoRow label="Current Month Usage" value={usageText} t={t} />
          <InfoRow
            label="Address"
            value={`${connection.house_num || '-'}, ${connection.street_name || '-'}, ${connection.region_name || '-'}`}
            t={t}
          />
          <div style={{ marginTop:14, marginBottom:10, borderRadius:12, padding:'12px 14px', background:isDark ? statusColor.db : statusColor.lb, color:isDark ? statusColor.dc : statusColor.lc, fontSize:12, fontWeight:600 }}>
            Current Status: {connection.connection_status}
          </div>
        </div>
        
        {/* Utility Details card */}
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:'4px 18px' }}>
          <div style={{ fontSize:20, fontWeight:600, color:t.text, padding:'14px 0 6px', borderBottom:`2px solid ${t.border}` }}>
            Utility Details
          </div>
          <InfoRow label="Utility Type" value={connection.utility_type || '-'} t={t} />
          <InfoRow label="Utility Name" value={connection.utility_name || '-'} t={t} />
          <InfoRow label="Unit" value={connection.unit_of_measurement || '-'} t={t} />
          {/* <InfoRow label="Tariff" value={connection.tariff_name || '-'} t={t} /> */}

          {/* Utility-specific details (populated by backend joins) */}
          {connection.utility_tag === 'electricity' && (
            <>
              <InfoRow label="Voltage Level" value={connection.electricity_voltage_level || '-'} t={t} />
              <InfoRow label="Phase Type" value={connection.electricity_phase_type || '-'} t={t} />
            </>
          )}
          {connection.utility_tag === 'water' && (
            <>
              <InfoRow label="Pressure Level" value={connection.water_pressure_level || '-'} t={t} />
              <InfoRow label="Water Source" value={connection.water_source || '-'} t={t} />
              <InfoRow label="Quality Grade" value={connection.water_quality_grade || '-'} t={t} />
            </>
          )}
          {connection.utility_tag === 'gas' && (
            <>
              <InfoRow label="Gas Type" value={connection.gas_type || '-'} t={t} />
              <InfoRow label="Pressure Category" value={connection.gas_pressure_category || '-'} t={t} />
            </>
          )}
        </div>

        {/* Meter Information card */}
        <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:14, padding:'4px 18px' }}>
          <div style={{ fontSize:20, fontWeight:600, color:t.text, padding:'14px 0 6px', borderBottom:`2px solid ${t.border}` }}>
            Meter Information
          </div>
          <InfoRow label="Meter ID" value={connection.meter_id ? `#${connection.meter_id}` : '-'} t={t} mono />
          <InfoRow label="Meter Type" value={connection.meter_type || '-'} t={t} />
          {/* Meter status (styled like billing status) */}
          <div style={{ marginTop:10, marginBottom:10 }}>
            <div style={{ marginTop:6 }} />
            <div style={{ marginTop:6, marginBottom:0, borderRadius:12, padding:'12px 14px', background: (() => {
                const m = connection && typeof connection.meter_active !== 'undefined' ? (connection.meter_active ? statusColors.Active : statusColors.Inactive) : statusColors.Inactive;
                return isDark ? m.db : m.lb;
              })(), color: (() => {
                const m = connection && typeof connection.meter_active !== 'undefined' ? (connection.meter_active ? statusColors.Active : statusColors.Inactive) : statusColors.Inactive;
                return isDark ? m.dc : m.lc;
              })(), fontSize:12, fontWeight:600 }}>
              Meter Status: {typeof connection.meter_active !== 'undefined' ? (connection.meter_active ? 'Active' : 'Inactive') : '-'}
            </div>
          </div>
        </div>
      </div>

      {showRechargeModal && connection && (
        <RechargeModal
          connection={connection}
          onClose={() => setShowRechargeModal(false)}
          onSuccess={(data) => {
            setShowRechargeModal(false);
            fetchConnection();
            const id = data && (data.bill_document_id || data.bill_document_id === 0 ? data.bill_document_id : data.bill_document_id);
            if (id) {
              setOpenedBillId(id);
              setShowBillModal(true);
            }
          }}
          t={t}
          isDark={isDark}
        />
      )}

      {showBillModal && openedBillId && (
        <BillDetail
          billId={openedBillId}
          onClose={() => setShowBillModal(false)}
          onBillPaid={() => { setShowBillModal(false); fetchConnection(); }}
        />
      )}
    </div>
  );
};

export default ConnectionDetail;
