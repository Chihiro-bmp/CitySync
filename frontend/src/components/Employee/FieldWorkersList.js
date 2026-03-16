import React, { useState, useEffect } from 'react';
import { getFieldWorkers } from '../../services/api';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

const FieldWorkersList = () => {
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];
  
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await getFieldWorkers();
      setWorkers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch field workers', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading field workers...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <h2 style={{ color: t.text, marginBottom: 20 }}>Field Workers Directory</h2>
      
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: isDark ? '#1F2937' : '#F3F4F6' }}>
            <tr>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>ID</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Name</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Phone</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Region Assigned</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Expertise</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(w => (
              <tr key={w.person_id}>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{w.person_id}</td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{w.first_name} {w.last_name}</td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{w.phone_number}</td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>
                  {w.region_name ? (
                    <span style={{ padding: '4px 8px', borderRadius: 100, fontSize: 12, fontWeight: 500, background: t.bgInputs, color: t.primary }}>
                      {w.region_name}
                    </span>
                  ) : (
                    <span style={{ color: t.textMuted }}>Unassigned</span>
                  )}
                </td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{w.expertise || 'General'}</td>
              </tr>
            ))}
            {workers.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: 20, textAlign: 'center', color: t.textSub }}>No field workers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FieldWorkersList;
