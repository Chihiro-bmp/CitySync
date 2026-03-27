import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getApplications, getComplaintsAdmin } from '../../services/api';
import StatusPipeline from './Shared/StatusPipeline';
import SideDrawer from './Shared/SideDrawer';

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [appsRes, complaintsRes] = await Promise.all([
        getApplications(),
        getComplaintsAdmin(),
      ]);
      setApplications(appsRes.data.data || []);
      setComplaints(complaintsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingApps        = applications.filter(a => a.status === 'Pending');
  const unassignedComplaints = complaints.filter(c => !c.assigned_to);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-card border-0.5 border-white/[0.07] rounded-2xl animate-pulse" />
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
        {/* Greeting */}
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2">
            Employee Portal
          </div>
          <h1 className="font-outfit text-2xl font-semibold text-txt tracking-tight mb-1">
            Good {getGreeting()}, {user?.firstName}
          </h1>
          <p className="font-outfit text-sm text-sub">
            Here's what needs your attention today
          </p>
        </div>

        {/* Pipeline Lanes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <StatusPipeline
            title="Pending Applications"
            count={pendingApps.length}
            items={pendingApps.map(a => ({
              id: `#APP-${a.application_id}`,
              title: `${a.consumer_first_name} ${a.consumer_last_name}`,
              subtitle: `${a.utility_type} · ${a.requested_connection_type}`,
              ...a,
            }))}
            accent="elec"
            onCardClick={(app) => setSelectedApp(app)}
            viewAllPath="/employee/applications"
          />

          <StatusPipeline
            title="Unassigned Complaints"
            count={unassignedComplaints.length}
            items={unassignedComplaints.map(c => ({
              id: `#${c.complaint_id}`,
              title: c.description
                ? c.description.slice(0, 50) + (c.description.length > 50 ? '…' : '')
                : 'No description',
              subtitle: `From ${c.consumer_first_name || 'Unknown'}`,
              ...c,
            }))}
            accent="gas"
            viewAllPath="/employee/complaints"
          />

          <StatusPipeline
            title="Quick Actions"
            count={0}
            items={[]}
            accent="water"
            viewAllPath="/employee/connections"
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {[
            { label: 'Total Applications', value: applications.length, accent: 'text-elec' },
            { label: 'Pending Review',     value: pendingApps.length,           accent: 'text-status-warning' },
            { label: 'Total Complaints',   value: complaints.length,            accent: 'text-gas' },
            { label: 'Unassigned',         value: unassignedComplaints.length,  accent: 'text-status-error' },
          ].map(({ label, value, accent }) => (
            <div key={label} className="bg-card border-0.5 border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="h-[1.5px] bg-white/10 rounded-t-2xl" />
              <div className="p-5">
                <div className={`font-barlow text-3xl font-bold ${accent} mb-1`}>{value}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-sub">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Application Review Drawer */}
      <SideDrawer open={!!selectedApp} onClose={() => setSelectedApp(null)}>
        {selectedApp && (
          <div className="p-6 pt-14">
            <div className="mb-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-elec mb-2">
                Application Review
              </div>
              <h2 className="font-outfit text-xl font-semibold text-txt">
                #{selectedApp.application_id}
              </h2>
            </div>

            <div className="bg-card2 border-0.5 border-white/[0.05] rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="font-outfit text-xs text-sub">Applicant</span>
                <span className="font-outfit text-xs text-txt font-medium">
                  {selectedApp.consumer_first_name} {selectedApp.consumer_last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-outfit text-xs text-sub">Utility</span>
                <span className="font-outfit text-xs text-txt font-medium">{selectedApp.utility_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-outfit text-xs text-sub">Type</span>
                <span className="font-outfit text-xs text-txt font-medium">{selectedApp.requested_connection_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-outfit text-xs text-sub">Priority</span>
                <span className="font-outfit text-xs text-txt font-medium">{selectedApp.priority}</span>
              </div>
            </div>

            <p className="font-outfit text-sm text-sub mt-6">
              Go to Applications to review and approve or reject.
            </p>
          </div>
        )}
      </SideDrawer>
    </div>
  );
};

export default EmployeeDashboard;
