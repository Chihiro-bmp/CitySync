import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts, utilities, statusColors } from '../../theme';
import { ComplaintIcon, ElectricityIcon, WaterIcon, GasIcon } from '../../Icons';

const UtilIcons = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };

// ── File Complaint Modal ───────────────────────────────────────────────────────
const FileModal = ({ connections, onClose, onSuccess, t, isDark }) => {
  const { authFetch } = useAuth();
  const [connId, setConnId]   = useState('');
  const [desc, setDesc]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    if (!desc.trim()) { setError('Please describe your complaint'); return; }
    setLoading(true); setError('');
    try {
      const res = await authFetch('/api/consumer/complaints', {
        method: 'POST',
        body: JSON.stringify({ connection_id: connId || null, description: desc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:20, padding:28, width:'100%', maxWidth:460 }} onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#FF9A3C,#FFD93D)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 10px rgba(255,154,60,0.3)' }}>
              <ComplaintIcon size={19} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:600, color:t.text }}>File a Complaint</div>
              <div style={{ fontSize:12, color:t.textSub }}>We'll assign it to a field worker</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:t.textMuted, fontSize:22, lineHeight:1, padding:4 }}>×</button>
        </div>

        {/* Connection select */}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:500, color:t.textSub, marginBottom:7 }}>Related Connection (optional)</label>
          <select value={connId} onChange={e => setConnId(e.target.value)} style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF', color:t.text, fontSize:14, fontFamily:fonts.ui, outline:'none', boxSizing:'border-box', cursor:'pointer' }}>
            <option value="">General complaint</option>
            {connections.map(c => (
              <option key={c.connection_id} value={c.connection_id}>
                {c.utility_name} — ID #{c.connection_id}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:500, color:t.textSub, marginBottom:7 }}>
            Describe your issue <span style={{ color: isDark ? '#F87171' : '#EF4444' }}>*</span>
          </label>
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="e.g. My electricity has been cut off since yesterday despite the bill being paid..."
            rows={4}
            style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF', color:t.text, fontSize:14, fontFamily:fonts.ui, outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }}
          />
          <div style={{ fontSize:11, color:t.textMuted, marginTop:5, textAlign:'right' }}>{desc.length} / 200</div>
        </div>

        {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, background: isDark ? '#2D0C0C' : '#FEE2E2', color: isDark ? '#F87171' : '#B91C1C', fontSize:13 }}>{error}</div>}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${t.border}`, background:'transparent', color:t.text, fontSize:14, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background: loading ? t.textMuted : 'linear-gradient(135deg,#FF9A3C,#FFD93D)', color:'#fff', fontSize:14, fontWeight:600, fontFamily:fonts.ui, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(255,154,60,0.35)' }}>
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Complaint Card ─────────────────────────────────────────────────────────────
const ComplaintCard = ({ complaint, t, isDark }) => {
  const [expanded, setExpanded] = useState(false);
  const util   = utilities[complaint.utility_tag] || null;
  const Icon   = UtilIcons[complaint.utility_tag] || null;
  const status = statusColors[complaint.status] || statusColors['Pending'];

  const timelineSteps = [
    { label:'Filed',      done: true,                                      date: complaint.complaint_date  },
    { label:'Assigned',   done: !!complaint.assignment_date,               date: complaint.assignment_date },
    { label:'In Progress',done: complaint.status === 'In Progress' || complaint.status === 'Resolved', date: complaint.assignment_date },
    { label:'Resolved',   done: complaint.status === 'Resolved',           date: complaint.resolution_date },
  ];

  return (
    <div style={{ background:t.bgCard, border:`1px solid ${t.border}`, borderRadius:16, overflow:'hidden', transition:'box-shadow 0.18s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 20px rgba(255,154,60,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
    >
      {/* Card header */}
      <div style={{ padding:'18px 20px', display:'flex', alignItems:'flex-start', gap:14 }}>
        <div style={{ width:38, height:38, borderRadius:11, background: util ? util.gradient : 'linear-gradient(135deg,#FF9A3C,#FFD93D)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {Icon ? <Icon size={18} color="#fff" /> : <ComplaintIcon size={18} color="#fff" />}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:4 }}>
            <div style={{ fontSize:13, fontWeight:600, color:t.text }}>
              {complaint.utility_name ? `${complaint.utility_name} Complaint` : 'General Complaint'}
            </div>
            <span style={{ fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:100, background: isDark ? status.db : status.lb, color: isDark ? status.dc : status.lc, flexShrink:0 }}>
              {complaint.status}
            </span>
          </div>
          <div style={{ fontSize:13, color:t.textSub, lineHeight:1.5, marginBottom:6 }}>
            {expanded ? complaint.description : complaint.description?.slice(0, 100) + (complaint.description?.length > 100 ? '...' : '')}
            {complaint.description?.length > 100 && (
              <button onClick={() => setExpanded(e => !e)} style={{ background:'none', border:'none', color:t.primary, cursor:'pointer', fontSize:12, fontFamily:fonts.ui, marginLeft:4, padding:0 }}>
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
          <div style={{ fontSize:11, color:t.textMuted, fontFamily:fonts.mono }}>
            #{complaint.complaint_id} · Filed {new Date(complaint.complaint_date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding:'14px 20px', borderTop:`1px solid ${t.border}`, background: isDark ? 'rgba(255,255,255,0.015)' : '#FAFBFF' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:0, position:'relative' }}>
          {timelineSteps.map((step, i) => (
            <div key={step.label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>
              {/* Connector line */}
              {i < timelineSteps.length - 1 && (
                <div style={{ position:'absolute', top:9, left:'50%', right:'-50%', height:2, background: timelineSteps[i+1].done ? 'linear-gradient(90deg,#3B6FFF,#3B6FFF)' : (isDark ? '#1A2235' : '#E4E8F0'), zIndex:0 }} />
              )}
              {/* Dot */}
              <div style={{ width:20, height:20, borderRadius:'50%', background: step.done ? 'linear-gradient(135deg,#3B6FFF,#00C4FF)' : (isDark ? '#1A2235' : '#E4E8F0'), border:`2px solid ${step.done ? '#3B6FFF' : (isDark ? '#2A3550' : '#D1D5DB')}`, display:'flex', alignItems:'center', justifyContent:'center', zIndex:1, position:'relative', boxShadow: step.done ? '0 0 8px rgba(59,111,255,0.4)' : 'none', flexShrink:0 }}>
                {step.done && <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }} />}
              </div>
              <div style={{ fontSize:10, color: step.done ? t.primary : t.textMuted, fontFamily:fonts.mono, textAlign:'center', marginTop:5, letterSpacing:'0.02em' }}>{step.label}</div>
              {step.date && <div style={{ fontSize:9, color:t.textMuted, fontFamily:fonts.mono, textAlign:'center' }}>{new Date(step.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Remarks */}
      {complaint.remarks && (
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${t.border}`, display:'flex', gap:8 }}>
          <div style={{ fontSize:11, color:t.textMuted, fontWeight:600, fontFamily:fonts.mono, textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap', paddingTop:1 }}>Note:</div>
          <div style={{ fontSize:13, color:t.textSub, lineHeight:1.5 }}>{complaint.remarks}</div>
        </div>
      )}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Complaints = () => {
  const { authFetch } = useAuth();
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [complaints, setComplaints]   = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [filter, setFilter]           = useState('All');
  const [success, setSuccess]         = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, conRes] = await Promise.all([
        authFetch('/api/consumer/complaints'),
        authFetch('/api/consumer/connections'),
      ]);
      const cData   = await cRes.json();
      const conData = await conRes.json();
      if (!cRes.ok)   throw new Error(cData.error);
      if (!conRes.ok) throw new Error(conData.error);
      setComplaints(cData);
      setConnections(conData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSuccess = () => {
    setShowModal(false);
    setSuccess(true);
    fetchData();
    setTimeout(() => setSuccess(false), 4000);
  };

  const STATUSES = ['All', 'Pending', 'Assigned', 'In Progress', 'Resolved'];
  const filtered = filter === 'All' ? complaints : complaints.filter(c => c.status === filter);
  const open     = complaints.filter(c => c.status !== 'Resolved').length;

  return (
    <div style={{ fontFamily:fonts.ui }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontSize:11, color:t.primary, fontFamily:fonts.mono, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>Support</div>
          <h1 style={{ fontFamily:fonts.ui, fontSize:24, fontWeight:600, color:t.text, letterSpacing:'-0.4px', marginBottom:4 }}>My Complaints</h1>
          <p style={{ fontSize:14, color:t.textSub }}>Track your utility complaints and their resolution status</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#FF9A3C,#FFD93D)', color:'#fff', fontSize:14, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer', boxShadow:'0 4px 14px rgba(255,154,60,0.35)', whiteSpace:'nowrap' }}>
          <ComplaintIcon size={17} color="#fff" /> File Complaint
        </button>
      </div>

      {/* Success toast */}
      {success && (
        <div style={{ padding:'13px 18px', borderRadius:12, marginBottom:20, background: isDark ? '#0D2E1A' : '#DCFCE7', border:`1px solid ${isDark ? '#4ADE8033' : '#86EFAC'}`, color: isDark ? '#4ADE80' : '#16A34A', fontSize:13, fontWeight:500 }}>
          ✓ Complaint submitted successfully. We'll look into it shortly.
        </div>
      )}

      {/* Summary strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        {[
          { label:'Total',       val:complaints.length,                                   },
          { label:'Open',        val:open,               warn: open > 0                   },
          { label:'Resolved',    val:complaints.filter(c=>c.status==='Resolved').length,  },
          { label:'Pending',     val:complaints.filter(c=>c.status==='Pending').length,   },
        ].map(s => (
          <div key={s.label} style={{ background:t.bgCard, border:`1px solid ${t.warn ? (isDark ? '#F8717133' : '#FCA5A5') : t.border}`, borderRadius:13, padding:'14px 16px' }}>
            <div style={{ fontSize:22, fontWeight:700, color: s.warn ? (isDark ? '#F87171' : '#EF4444') : t.text, letterSpacing:'-0.4px' }}>{s.val}</div>
            <div style={{ fontSize:12, color:t.textSub, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding:'7px 16px', borderRadius:100,
            border:`1.5px solid ${filter === s ? t.primary : t.border}`,
            background: filter === s ? (isDark ? 'rgba(59,111,255,0.15)' : '#EEF2FF') : 'transparent',
            color: filter === s ? t.primary : t.textSub,
            fontSize:13, fontWeight:500, fontFamily:fonts.ui, cursor:'pointer', transition:'all 0.15s',
          }}>
            {s}
            {s !== 'All' && <span style={{ marginLeft:6, fontSize:11, opacity:0.7 }}>{complaints.filter(c => c.status === s).length}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:150, borderRadius:16, background:t.bgCard, border:`1px solid ${t.border}`, animation:'pulse 1.5s infinite' }} />)}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 0', color:t.textMuted }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#FF9A3C,#FFD93D)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 4px 16px rgba(255,154,60,0.3)' }}>
            <ComplaintIcon size={28} color="#fff" />
          </div>
          <div style={{ fontSize:15, fontWeight:500, color:t.textSub, marginBottom:6 }}>
            {filter === 'All' ? 'No complaints yet' : `No ${filter.toLowerCase()} complaints`}
          </div>
          <div style={{ fontSize:13, color:t.textMuted, marginBottom:20 }}>
            {filter === 'All' ? 'File a complaint if you have an issue with any utility.' : 'Try a different filter.'}
          </div>
          {filter === 'All' && (
            <button onClick={() => setShowModal(true)} style={{ padding:'10px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#FF9A3C,#FFD93D)', color:'#fff', fontSize:13, fontWeight:600, fontFamily:fonts.ui, cursor:'pointer' }}>
              File First Complaint
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {filtered.map(c => <ComplaintCard key={c.complaint_id} complaint={c} t={t} isDark={isDark} />)}
        </div>
      )}

      {/* Modal */}
      {showModal && <FileModal connections={connections} onClose={() => setShowModal(false)} onSuccess={handleSuccess} t={t} isDark={isDark} />}
    </div>
  );
};

export default Complaints;