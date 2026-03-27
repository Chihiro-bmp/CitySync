import React, { useState, useEffect } from 'react';
import { getApplications, updateApplicationStatus } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SideDrawer from './Shared/SideDrawer';

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

// ── Application Review (inside drawer) ────────────────────────────────────────
const ApplicationReview = ({ application, onApprove, onReject }) => {
  const [notes, setNotes] = useState('');

  return (
    <div className="p-6 pt-14 space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2">
          Application Review
        </div>
        <h2 className="font-outfit text-xl font-semibold text-txt">
          #{application.application_id}
        </h2>
      </div>

      {/* Applicant */}
      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Applicant</h3>
        <div className="bg-card2 border-0.5 border-white/[0.05] rounded-xl p-4">
          <p className="font-outfit text-sm text-txt font-medium mb-1">
            {application.consumer_first_name} {application.consumer_last_name}
          </p>
          <p className="font-mono text-xs text-sub">{application.consumer_phone}</p>
        </div>
      </div>

      {/* Connection Details */}
      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Details</h3>
        <div className="bg-card2 border-0.5 border-white/[0.05] rounded-xl p-4 space-y-2">
          {[
            ['Utility',  application.utility_type],
            ['Type',     application.requested_connection_type],
            ['Priority', application.priority],
            ['Address',  application.address],
          ].map(([label, val]) => val && (
            <div key={label} className="flex justify-between gap-4">
              <span className="font-outfit text-xs text-sub shrink-0">{label}</span>
              <span className="font-outfit text-xs text-txt font-medium text-right">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current status */}
      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Status</h3>
        <span className={`inline-block px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wide ${
          application.status === 'Approved' ? 'bg-status-active/10 text-status-active' :
          application.status === 'Rejected' ? 'bg-status-error/10 text-status-error' :
          'bg-white/[0.06] text-sub'
        }`}>
          {application.status}
        </span>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-sub">Review Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes..."
          className="w-full h-24 bg-card2 border-0.5 border-white/[0.05] rounded-xl p-3 font-outfit text-sm text-txt placeholder:text-sub/50 focus:outline-none focus:border-white/[0.13] resize-none"
        />
      </div>

      {/* Actions */}
      {application.status === 'Pending' && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onApprove(application.application_id, 'Approved', notes)}
            className="flex-1 font-mono text-[10px] uppercase tracking-[0.08em] px-5 py-3 rounded-lg bg-status-active text-bg hover:bg-status-active/90 transition-all active:scale-95"
          >
            Approve
          </button>
          <button
            onClick={() => onReject(application.application_id, 'Rejected', notes)}
            className="flex-1 font-mono text-[10px] uppercase tracking-[0.08em] px-5 py-3 rounded-lg bg-transparent border-0.5 border-status-error/20 text-status-error/60 hover:text-status-error hover:border-status-error/40 transition-all"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const ApplicationsManager = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchApplications(); }, []);

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

  const handleUpdateStatus = async (id, status, notes) => {
    try {
      await updateApplicationStatus(id, {
        status,
        reviewed_by: user.userId,
        review_notes: notes,
      });
      setSelectedApp(null);
      fetchApplications();
    } catch (err) {
      alert('Failed to update application status');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-14 bg-card border-0.5 border-white/[0.07] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Grain texture */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: grain }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2">
            Employee Portal
          </div>
          <h2 className="font-outfit text-2xl font-semibold text-txt tracking-tight">
            Review Applications
          </h2>
          <p className="font-outfit text-sm text-sub mt-1">
            {applications.length} total · {applications.filter(a => a.status === 'Pending').length} pending
          </p>
        </div>

        {/* Table */}
        <div className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="h-[1.5px] bg-elec/45 rounded-t-2xl" />
          <table className="w-full">
            <thead>
              <tr className="bg-card2">
                <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-sub border-b border-white/[0.05]">App ID</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-sub border-b border-white/[0.05]">Applicant</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-sub border-b border-white/[0.05]">Utility / Type</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-sub border-b border-white/[0.05] hidden md:table-cell">Address</th>
                <th className="px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[0.12em] text-sub border-b border-white/[0.05]">Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr
                  key={app.application_id}
                  onClick={() => setSelectedApp(app)}
                  className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${
                    selectedApp?.application_id === app.application_id ? 'bg-white/[0.03]' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-txt border-b border-white/[0.05]">
                    #{app.application_id}
                  </td>
                  <td className="px-4 py-3 border-b border-white/[0.05]">
                    <div className="font-outfit text-sm text-txt">
                      {app.consumer_first_name} {app.consumer_last_name}
                    </div>
                    <div className="font-mono text-[10px] text-sub">{app.consumer_phone}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-white/[0.05]">
                    <div className="font-outfit text-sm text-txt">{app.utility_type}</div>
                    <div className="font-mono text-[10px] text-sub">{app.requested_connection_type} · {app.priority}</div>
                  </td>
                  <td className="px-4 py-3 border-b border-white/[0.05] hidden md:table-cell max-w-[180px]">
                    <div className="font-outfit text-sm text-sub truncate" title={app.address}>
                      {app.address}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-white/[0.05]">
                    <span className={`inline-block px-2 py-1 rounded-full font-mono text-[10px] uppercase tracking-wide ${
                      app.status === 'Approved' ? 'bg-status-active/10 text-status-active' :
                      app.status === 'Rejected' ? 'bg-status-error/10 text-status-error' :
                      'bg-white/[0.06] text-sub'
                    }`}>
                      {app.status}
                    </span>
                    {app.reviewer_first_name && (
                      <div className="font-mono text-[9px] text-muted mt-1">
                        by {app.reviewer_first_name}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center font-outfit text-sm text-sub">
                    No applications found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Drawer */}
      <SideDrawer open={!!selectedApp} onClose={() => setSelectedApp(null)}>
        {selectedApp && (
          <ApplicationReview
            application={selectedApp}
            onApprove={handleUpdateStatus}
            onReject={handleUpdateStatus}
          />
        )}
      </SideDrawer>
    </div>
  );
};

export default ApplicationsManager;
