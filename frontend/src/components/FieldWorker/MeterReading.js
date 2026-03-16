import React, { useState, useEffect } from 'react';
import { getConnectionsForReading, submitMeterReading } from '../../services/api';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

const MeterReading = () => {
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];
  
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [formData, setFormData] = useState({
    time_from: '',
    time_to: new Date().toISOString().split('T')[0],
    unit_used: ''
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await getConnectionsForReading();
      setConnections(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch connections', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConnection) return;

    try {
      await submitMeterReading({
        meter_id: selectedConnection.meter_id,
        tariff_id: selectedConnection.tariff_id,
        time_from: formData.time_from,
        time_to: formData.time_to,
        unit_used: parseFloat(formData.unit_used),
      });
      alert('Meter reading processed successfully. Usage details have been recorded.');
      setSelectedConnection(null);
      setFormData({ time_from: '', time_to: new Date().toISOString().split('T')[0], unit_used: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit reading');
    }
  };

  if (loading) return <div>Loading assigned area connections...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <h2 style={{ color: t.text, marginBottom: 20 }}>Log Meter Reading</h2>
      
      {!selectedConnection ? (
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: `1px solid ${t.border}`, background: isDark ? '#1F2937' : '#F3F4F6' }}>
            <h3 style={{ margin: 0, fontSize: 15, color: t.text }}>Select Connection in Your Region</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Address</th>
                <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Consumer</th>
                <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Meter ID</th>
                <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Utility</th>
                <th style={{ padding: 12, borderBottom: `1px solid ${t.border}` }}></th>
              </tr>
            </thead>
            <tbody>
              {connections.map(c => (
                <tr key={c.connection_id}>
                  <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{c.house_num}, {c.street_name}</td>
                  <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{c.consumer_first_name} {c.consumer_last_name}</td>
                  <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{c.meter_id} ({c.meter_type})</td>
                  <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{c.utility_name}</td>
                  <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, textAlign: 'right' }}>
                    <button 
                      onClick={() => setSelectedConnection(c)}
                      style={{ padding: '6px 16px', background: t.primary, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                    >
                      Log Reading
                    </button>
                  </td>
                </tr>
              ))}
              {connections.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: 20, textAlign: 'center', color: t.textSub }}>No active connections found in your assigned region.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ maxWidth: 600, margin: '0 auto', background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: t.text }}>Input Meter Data</h3>
            <button onClick={() => setSelectedConnection(null)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 14 }}>Back to List</button>
          </div>

          <div style={{ background: t.bgInputs, padding: 16, borderRadius: 12, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: t.textSub, marginBottom: 4 }}>Connection Details</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>{selectedConnection.house_num}, {selectedConnection.street_name}</div>
            <div style={{ fontSize: 14, color: t.textMuted, marginTop: 4 }}>Meter: {selectedConnection.meter_id} | {selectedConnection.utility_name}</div>
            <div style={{ fontSize: 14, color: t.textMuted }}>Consumer: {selectedConnection.consumer_first_name} {selectedConnection.consumer_last_name}</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: t.textSub, marginBottom: 6 }}>From Date</label>
                <input 
                  type="date"
                  required
                  value={formData.time_from}
                  onChange={e => setFormData({...formData, time_from: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontFamily: fonts.ui }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: t.textSub, marginBottom: 6 }}>To Date</label>
                <input 
                  type="date"
                  required
                  value={formData.time_to}
                  onChange={e => setFormData({...formData, time_to: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${t.border}`, background: 'transparent', color: t.text, fontFamily: fonts.ui }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, color: t.textSub, marginBottom: 6 }}>Units Used</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.unit_used}
                  onChange={e => setFormData({...formData, unit_used: e.target.value})}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `2px solid ${t.primary}`, background: 'transparent', color: t.text, fontFamily: fonts.ui, fontSize: 16 }}
                />
                <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: t.textMuted, fontSize: 14 }}>
                  Units
                </div>
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '14px', background: t.primary, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 16, marginTop: 12 }}>
              Submit Reading & Generate Usage
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default MeterReading;
