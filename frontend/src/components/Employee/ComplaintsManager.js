import React, { useState, useEffect } from 'react';
import { getComplaintsAdmin, getFieldWorkers, updateComplaintStatusAdmin, assignComplaint } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

const ComplaintsManager = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];
  
  const [complaints, setComplaints] = useState([]);
  const [fieldWorkers, setFieldWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [compRes, fwRes] = await Promise.all([
        getComplaintsAdmin(),
        getFieldWorkers()
      ]);
      setComplaints(compRes.data.data || []);
      setFieldWorkers(fwRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch complaints/workers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (complaintId, workerId) => {
    if (!workerId) return;
    try {
      await assignComplaint(complaintId, { assigned_to: workerId, assigned_by: user.userId });
      fetchData();
    } catch (err) {
      alert('Failed to assign complaint');
    }
  };

  const handleResolve = async (id) => {
    try {
      await updateComplaintStatusAdmin(id, { status: 'Resolved' });
      fetchData();
    } catch (err) {
      alert('Failed to resolve complaint');
    }
  };

  if (loading) return <div>Loading complaints...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <h2 style={{ color: t.text, marginBottom: 20 }}>Manage Complaints</h2>
      
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: isDark ? '#1F2937' : '#F3F4F6' }}>
            <tr>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>ID / Date</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Consumer</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Description</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Status</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Assigned To</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map(c => (
              <tr key={c.complaint_id}>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>
                  <div>#{c.complaint_id}</div>
                  <div style={{ fontSize: 11, color: t.textSub }}>{new Date(c.complaint_date).toLocaleDateString()}</div>
                </td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>
                  <div>{c.consumer_first_name} {c.consumer_last_name}</div>
                  <div style={{ fontSize: 11, color: t.textSub }}>{c.consumer_phone}</div>
                </td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 13, maxWidth: 200 }}>
                  <div style={{ 
                    display: '-webkit-box', 
                    WebkitLineClamp: 2, 
                    WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden' 
                  }} title={c.description}>
                    {c.description}
                  </div>
                  {c.remarks && <div style={{ fontSize: 11, color: t.primary, marginTop: 4 }}>Note: {c.remarks}</div>}
                </td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>
                  <span style={{
                    padding: '4px 8px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                    background: c.status === 'Resolved' ? (isDark ? '#0D2E1A' : '#DCFCE7') : c.status === 'In Progress' ? (isDark ? '#0F172A' : '#DBEAFE') : (isDark ? '#422006' : '#FEF3C7'),
                    color: c.status === 'Resolved' ? (isDark ? '#4ADE80' : '#16A34A') : c.status === 'In Progress' ? (isDark ? '#60A5FA' : '#2563EB') : (isDark ? '#FBBF24' : '#D97706')
                  }}>
                    {c.status}
                  </span>
                </td>
                
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}` }}>
                  {c.status === 'Pending' ? (
                    <select 
                      onChange={(e) => handleAssign(c.complaint_id, e.target.value)}
                      defaultValue=""
                      style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.bgInputs, color: t.text, fontSize: 12 }}
                    >
                      <option value="" disabled>Assign to...</option>
                      {fieldWorkers.map(fw => (
                        <option key={fw.person_id} value={fw.person_id}>
                          {fw.first_name} {fw.last_name} ({fw.region_name || 'No Region'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: 13, color: t.text }}>
                      {c.assigned_to_name || 'N/A'}
                    </div>
                  )}
                </td>
                
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}` }}>
                  {c.status !== 'Resolved' && (
                    <button onClick={() => handleResolve(c.complaint_id)} style={{ padding: '6px 12px', background: t.primary, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      Mark Resolved
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {complaints.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 20, textAlign: 'center', color: t.textSub }}>No complaints found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ComplaintsManager;
