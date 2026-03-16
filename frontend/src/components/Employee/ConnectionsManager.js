import React, { useState, useEffect } from 'react';
import {
  getConnections, updateConnectionStatus, createConnection,
  getConsumers, getTariffs, getMeters
} from '../../services/api';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

const inputStyle = (t) => ({
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1px solid ${t.border}`, background: t.bgInputs,
  color: t.text, fontFamily: fonts.ui, fontSize: 13,
  boxSizing: 'border-box'
});

const StatusBadge = ({ status, isDark }) => {
  const cfg = {
    Active:       { bg: isDark ? '#0D2E1A' : '#DCFCE7', c: isDark ? '#4ADE80' : '#16A34A' },
    Suspended:    { bg: isDark ? '#2D0C0C' : '#FEE2E2', c: isDark ? '#F87171' : '#B91C1C' },
    Disconnected: { bg: isDark ? '#2D0C0C' : '#FEE2E2', c: isDark ? '#F87171' : '#B91C1C' },
    Pending:      { bg: isDark ? '#422006' : '#FEF3C7', c: isDark ? '#FBBF24' : '#D97706' },
  }[status] || { bg: '#eee', c: '#333' };
  return (
    <span style={{ padding: '4px 8px', borderRadius: 100, fontSize: 12, fontWeight: 500, background: cfg.bg, color: cfg.c }}>
      {status}
    </span>
  );
};

// ── Create Connection Modal ───────────────────────────────────────────────────
const CreateConnectionModal = ({ t, isDark, onClose, onSuccess }) => {
  const [consumers, setConsumers] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [meters, setMeters] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    consumer_id: '',
    tariff_id: '',
    meter_id: '',
    payment_type: 'Postpaid',
    connection_type: 'Residential',
    load_requirement: '',
    // Residential
    property_type: '',
    is_subsidized: false,
    // Commercial
    business_name: '',
    operating_hours: '',
    tax_id: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cr, tr, mr] = await Promise.all([getConsumers(), getTariffs(), getMeters()]);
        setConsumers(cr.data.data || []);
        setTariffs(tr.data.data || []);
        // Only show meters not yet attached to a connection
        setMeters((mr.data.data || []).filter(m => !m.connection_id));
      } catch { /* silent */ }
      finally { setLoadingData(false); }
    };
    fetchData();
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!form.consumer_id || !form.tariff_id || !form.meter_id)
      return setError('Consumer, tariff and meter are required');
    setSubmitting(true);
    try {
      await createConnection(form);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create connection');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label, content, span = 1) => (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={{ display: 'block', fontSize: 12, color: t.textSub, marginBottom: 5, fontWeight: 600 }}>{label}</label>
      {content}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: t.bgCard, borderRadius: 16, padding: 28, width: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: t.text, fontSize: 17 }}>New Utility Connection</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textSub, cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {loadingData ? (
          <div style={{ color: t.textSub, textAlign: 'center', padding: 30 }}>Loading data...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {field('Consumer', (
              <select value={form.consumer_id} onChange={e => setForm({ ...form, consumer_id: e.target.value })} style={{ ...inputStyle(t), padding: '9px 10px' }}>
                <option value="">Select consumer...</option>
                {consumers.map(c => (
                  <option key={c.person_id} value={c.person_id}>
                    {c.first_name} {c.last_name} (#{c.person_id})
                  </option>
                ))}
              </select>
            ), 2)}

            {field('Tariff', (
              <select value={form.tariff_id} onChange={e => setForm({ ...form, tariff_id: e.target.value })} style={{ ...inputStyle(t), padding: '9px 10px' }}>
                <option value="">Select tariff...</option>
                {tariffs.filter(tf => tf.is_active).map(tf => (
                  <option key={tf.tariff_id} value={tf.tariff_id}>
                    {tf.tariff_name} — {tf.utility_name} ({tf.consumer_category})
                  </option>
                ))}
              </select>
            ), 2)}

            {field('Meter (unassigned)', (
              <select value={form.meter_id} onChange={e => setForm({ ...form, meter_id: e.target.value })} style={{ ...inputStyle(t), padding: '9px 10px' }}>
                <option value="">Select meter...</option>
                {meters.map(m => (
                  <option key={m.meter_id} value={m.meter_id}>
                    #{m.meter_id} · {m.meter_type} — {m.house_num}, {m.street_name} ({m.region_name})
                  </option>
                ))}
              </select>
            ), 2)}

            {field('Payment Type', (
              <select value={form.payment_type} onChange={e => setForm({ ...form, payment_type: e.target.value })} style={{ ...inputStyle(t), padding: '9px 10px' }}>
                <option>Postpaid</option>
                <option>Prepaid</option>
              </select>
            ))}

            {field('Connection Type', (
              <select value={form.connection_type} onChange={e => setForm({ ...form, connection_type: e.target.value })} style={{ ...inputStyle(t), padding: '9px 10px' }}>
                <option>Residential</option>
                <option>Commercial</option>
              </select>
            ))}

            {field('Load Requirement (kW)', (
              <input type="number" step="0.01" placeholder="Optional" value={form.load_requirement} onChange={e => setForm({ ...form, load_requirement: e.target.value })} style={inputStyle(t)} />
            ), 2)}

            {/* Conditional sub-type fields */}
            {form.connection_type === 'Residential' ? (
              <>
                {field('Property Type', (
                  <select value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })} style={{ ...inputStyle(t), padding: '9px 10px' }}>
                    <option value="">Select...</option>
                    {['Apartment', 'House', 'Villa', 'Studio', 'Townhouse'].map(p => <option key={p}>{p}</option>)}
                  </select>
                ))}
                {field('Subsidized?', (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, fontSize: 13, color: t.text }}>
                    <input type="checkbox" checked={form.is_subsidized} onChange={e => setForm({ ...form, is_subsidized: e.target.checked })} style={{ width: 16, height: 16 }} />
                    Subsidized connection
                  </label>
                ))}
              </>
            ) : (
              <>
                {field('Business Name', (
                  <input placeholder="e.g. Acme Corp" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} style={inputStyle(t)} />
                ))}
                {field('Tax ID', (
                  <input placeholder="Optional" value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} style={inputStyle(t)} />
                ))}
                {field('Operating Hours', (
                  <input placeholder="e.g. 9AM-6PM Mon-Sat" value={form.operating_hours} onChange={e => setForm({ ...form, operating_hours: e.target.value })} style={inputStyle(t)} />
                ), 2)}
              </>
            )}

            {error && (
              <div style={{ gridColumn: 'span 2', padding: '10px 14px', background: isDark ? '#2D0C0C' : '#FEE2E2', borderRadius: 8, fontSize: 13, color: isDark ? '#F87171' : '#B91C1C' }}>
                {error}
              </div>
            )}

            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ flex: 1, padding: '11px', background: submitting ? t.border : '#3B6FFF', color: 'white', border: 'none', borderRadius: 8, cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                {submitting ? 'Creating...' : 'Create Connection'}
              </button>
              <button onClick={onClose} style={{ padding: '11px 20px', background: 'transparent', color: t.textSub, border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const ConnectionsManager = () => {
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  const load = async () => {
    try {
      const res = await getConnections();
      setConnections(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateConnectionStatus(id, { connection_status: status });
      load();
    } catch { alert('Failed to update status'); }
  };

  const statuses = ['ALL', 'Active', 'Suspended', 'Pending', 'Disconnected'];
  const filtered = filterStatus === 'ALL' ? connections : connections.filter(c => c.connection_status === filterStatus);

  if (loading) return <div style={{ color: t.text }}>Loading connections...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: t.text, margin: 0 }}>Manage Connections</h2>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '9px 18px', background: '#3B6FFF', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          + New Connection
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${t.border}`,
              background: filterStatus === s ? '#3B6FFF' : 'transparent',
              color: filterStatus === s ? 'white' : t.textSub,
              cursor: 'pointer', fontSize: 12, fontWeight: 500
            }}
          >
            {s} {s !== 'ALL' && <span style={{ opacity: 0.7 }}>({connections.filter(c => c.connection_status === s).length})</span>}
          </button>
        ))}
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: isDark ? '#1F2937' : '#F3F4F6' }}>
            <tr>
              {['ID', 'Consumer', 'Utility / Tariff', 'Address', 'Type', 'Payment', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 12px', borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 12, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.connection_id}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? '#1a1d24' : '#f8f9fa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{ transition: 'background 0.1s' }}
              >
                <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13 }}>#{c.connection_id}</td>
                <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 13 }}>
                  <div style={{ fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
                </td>
                <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, fontSize: 13, color: t.text }}>
                  <div>{c.utility_name}</div>
                  <div style={{ fontSize: 11, color: t.textSub }}>{c.tariff_name}</div>
                </td>
                <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, fontSize: 13, color: t.text }}>
                  <div>{c.house_num}, {c.street_name}</div>
                  <div style={{ fontSize: 11, color: t.textSub }}>{c.region_name}</div>
                </td>
                <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, fontSize: 12, color: t.textSub }}>
                  {c.connection_type}
                </td>
                <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}`, fontSize: 12, color: t.textSub }}>
                  {c.payment_type}
                </td>
                <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}` }}>
                  <StatusBadge status={c.connection_status} isDark={isDark} />
                </td>
                <td style={{ padding: '12px', borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.connection_status !== 'Active' && (
                      <button onClick={() => handleUpdateStatus(c.connection_id, 'Active')}
                        style={{ padding: '5px 10px', background: '#10B981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                        Activate
                      </button>
                    )}
                    {c.connection_status !== 'Suspended' && (
                      <button onClick={() => handleUpdateStatus(c.connection_id, 'Suspended')}
                        style={{ padding: '5px 10px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                        Suspend
                      </button>
                    )}
                    {c.connection_status !== 'Disconnected' && (
                      <button onClick={() => handleUpdateStatus(c.connection_id, 'Disconnected')}
                        style={{ padding: '5px 10px', background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                        Disconnect
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: 30, textAlign: 'center', color: t.textSub }}>
                  No connections found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateConnectionModal
          t={t}
          isDark={isDark}
          onClose={() => setShowCreate(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
};

export default ConnectionsManager;