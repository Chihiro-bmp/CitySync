import React, { useState, useEffect } from 'react';
import { getMyJobs, updateJobStatus } from '../../services/api';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

const MyJobs = () => {
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];
  
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await getMyJobs();
      setJobs(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await updateJobStatus(id, { status: 'Resolved', remarks });
      setResolvingId(null);
      setRemarks('');
      fetchJobs();
    } catch (err) {
      alert('Failed to resolve job');
    }
  };

  if (loading) return <div>Loading jobs...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <h2 style={{ color: t.text, marginBottom: 20 }}>My Assigned Jobs</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {jobs.map(job => (
          <div key={job.complaint_id} style={{ 
            background: t.bgCard, 
            border: `1px solid ${job.status === 'Resolved' ? t.success : t.border}`, 
            borderRadius: 16, 
            padding: 24 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: t.textSub, marginBottom: 4 }}>Job #{job.complaint_id} — {new Date(job.complaint_date).toLocaleDateString()}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: t.text }}>{job.consumer_first_name} {job.consumer_last_name}</div>
                <div style={{ fontSize: 14, color: t.textMuted }}>{job.consumer_phone}</div>
              </div>
              <span style={{
                padding: '6px 12px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                background: job.status === 'Resolved' ? (isDark ? '#0D2E1A' : '#DCFCE7') : (isDark ? '#0F172A' : '#DBEAFE'),
                color: job.status === 'Resolved' ? (isDark ? '#4ADE80' : '#16A34A') : (isDark ? '#60A5FA' : '#2563EB')
              }}>
                {job.status}
              </span>
            </div>

            <div style={{ background: t.bgInputs, padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: t.textSub, marginBottom: 4 }}>Address</div>
              <div style={{ fontSize: 15, color: t.text }}>{job.house_num}, {job.street_name}, {job.landmark}</div>
              <div style={{ fontSize: 13, color: t.textMuted }}>{job.region_name}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: t.textSub, marginBottom: 4 }}>Complaint Information</div>
              <div style={{ fontSize: 15, color: t.text, lineHeight: 1.5 }}>{job.description}</div>
              {job.remarks && (
                <div style={{ marginTop: 8, padding: 12, background: isDark ? '#1a1d24' : '#f8f9fa', borderRadius: 8, borderLeft: `3px solid ${t.primary}`, fontSize: 14, color: t.textSub }}>
                  <strong>Notes:</strong> {job.remarks}
                </div>
              )}
            </div>

            {job.status !== 'Resolved' && (
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
                {resolvingId === job.complaint_id ? (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input 
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="Add resolution remarks..."
                      style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgInputs, color: t.text, fontSize: 14 }}
                    />
                    <button onClick={() => handleResolve(job.complaint_id)} style={{ padding: '10px 20px', background: t.success, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                      Confirm Resolved
                    </button>
                    <button onClick={() => setResolvingId(null)} style={{ padding: '10px 20px', background: 'transparent', color: t.textSub, border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setResolvingId(job.complaint_id)} style={{ padding: '10px 20px', background: t.primary, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, width: '100%' }}>
                    Mark as Resolved
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {jobs.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: t.textSub, background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}` }}>
            You have no assigned jobs at the moment.
          </div>
        )}
      </div>
    </div>
  );
};

export default MyJobs;
