import React, { useState, useEffect } from 'react';
import { getApplications, updateApplicationStatus } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

const ApplicationsManager = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];
  
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await getApplications();
      setApplications(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateApplicationStatus(id, { status, reviewed_by: user.userId });
      fetchApplications();
    } catch (err) {
      alert('Failed to update application status');
    }
  };

  if (loading) return <div>Loading applications...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <h2 style={{ color: t.text, marginBottom: 20 }}>Review Applications</h2>
      
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: isDark ? '#1F2937' : '#F3F4F6' }}>
            <tr>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>App ID</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Applicant</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Utility / Type</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Address</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Status</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.application_id}>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{app.application_id}</td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>
                  <div>{app.consumer_first_name} {app.consumer_last_name}</div>
                  <div style={{ fontSize: 12, color: t.textSub }}>{app.consumer_phone}</div>
                </td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>
                  <div>{app.utility_type}</div>
                  <div style={{ fontSize: 12, color: t.textSub }}>{app.requested_connection_type} ({app.priority})</div>
                </td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14, maxWidth: 200 }}>
                  <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={app.address}>{app.address}</div>
                </td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>
                  <span style={{
                    padding: '4px 8px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                    background: app.status === 'Approved' ? (isDark ? '#0D2E1A' : '#DCFCE7') : app.status === 'Rejected' ? (isDark ? '#2D0C0C' : '#FEE2E2') : (isDark ? '#422006' : '#FEF3C7'),
                    color: app.status === 'Approved' ? (isDark ? '#4ADE80' : '#16A34A') : app.status === 'Rejected' ? (isDark ? '#F87171' : '#B91C1C') : (isDark ? '#FBBF24' : '#D97706')
                  }}>
                    {app.status}
                  </span>
                  {app.reviewer_first_name && <div style={{ fontSize: 10, color: t.textSub, marginTop: 4 }}>by {app.reviewer_first_name}</div>}
                </td>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}` }}>
                  {app.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleUpdateStatus(app.application_id, 'Approved')} style={{ padding: '6px 12px', background: '#10B981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        Approve
                      </button>
                      <button onClick={() => handleUpdateStatus(app.application_id, 'Rejected')} style={{ padding: '6px 12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 20, textAlign: 'center', color: t.textSub }}>No applications found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApplicationsManager;
