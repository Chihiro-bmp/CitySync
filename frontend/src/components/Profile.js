import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAvatar } from '../context/AvatarContext';

const API_BASE = {
  consumer:     '/api/consumer',
  field_worker: '/api/fieldworker',
  employee:     '/api/admin',
};

const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const initials  = (f, l) => `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase();

const Section = ({ title, subtitle, icon, action, children }) => (
  <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden mb-4">
    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
      <div className="flex items-center gap-3">
        <span className="text-lime">{icon}</span>
        <div>
          <div className="text-sm font-bold text-txt uppercase tracking-tight">{title}</div>
          {subtitle && <div className="text-[10px] text-txt/30 uppercase tracking-widest mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const InfoRow = ({ label, value, locked, onRequest }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 border-b border-white/5 gap-2 last:border-0">
    <div className="flex items-center gap-2 min-w-[140px]">
      <span className="text-[10px] font-mono uppercase tracking-widest text-txt/30">{label}</span>
      {locked && (
        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-txt/20 font-mono uppercase">
          Admin Only
        </span>
      )}
    </div>
    <div className="flex items-center gap-4 flex-1 md:justify-end">
      <span className={`text-[13px] font-medium ${locked ? 'text-txt/40' : 'text-txt/80'}`}>{value || '—'}</span>
      {onRequest && (
        <button 
            onClick={onRequest}
            className="text-[10px] font-mono uppercase tracking-wider text-lime/60 hover:text-lime transition-colors ml-2"
        >
          Request Change →
        </button>
      )}
    </div>
  </div>
);

const StatPill = ({ label, value, colorClass }) => (
  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center relative overflow-hidden group">
    <div className={`absolute top-0 left-0 right-0 h-[1px] opacity-20 bg-${colorClass}`}></div>
    <div className={`text-2xl font-bold font-barlow text-txt tracking-tight group-hover:scale-110 transition-transform duration-500`}>{value}</div>
    <div className="text-[9px] font-mono uppercase tracking-widest text-txt/30 mt-1">{label}</div>
  </div>
);

const Profile = () => {
  const { authFetch, logout, user } = useAuth();
  const { setAvatar: setGlobalAvatar } = useAvatar();
  const navigate    = useNavigate();

  const apiBase = API_BASE[user?.role] || API_BASE.consumer;
  const isConsumer    = user?.role === 'consumer';
  const isFieldWorker = user?.role === 'field_worker';
  const isEmployee    = user?.role === 'employee';

  const [profile, setProfile]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [avatar, setAvatar]             = useState(null);
  const [avatarLoading, setAvtLoad]     = useState(false);
  const [modal, setModal]               = useState(null);
  const [requestField, setRequestField] = useState(null);
  const [toast, setToast]               = useState('');
  const fileRef = useRef(null);
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '', error: '', loading: false });
  const [deactivateForm, setDeactivateForm] = useState({ password: '', error: '', loading: false });
  const [requestValue, setRequestValue] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await authFetch(`${apiBase}/profile`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data);
      if (data.avatar_url) setAvatar(data.avatar_url);
    } catch (err) { console.error(err); }
    finally       { setLoading(false); }
  }, [authFetch, apiBase]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { showToast('Image too large. Max 5MB.'); return; }
    setAvtLoad(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok || cloudData.error)
        throw new Error(cloudData.error?.message || 'Upload to Cloudinary failed');

      const imageUrl = cloudData.secure_url;

      const res  = await authFetch(`${apiBase}/avatar`, {
        method: 'PUT',
        body: JSON.stringify({ avatar_url: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAvatar(imageUrl);
      setGlobalAvatar(imageUrl);
      showToast('Profile photo updated!');
    } catch (err) {
      showToast(err.message || 'Upload failed');
    } finally {
      setAvtLoad(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pwdForm.current || !pwdForm.next)
      return setPwdForm(f => ({ ...f, error: 'All fields are required.' }));
    if (pwdForm.next.length < 8)
      return setPwdForm(f => ({ ...f, error: 'New password must be at least 8 characters.' }));
    if (pwdForm.next !== pwdForm.confirm)
      return setPwdForm(f => ({ ...f, error: 'New passwords do not match.' }));
    setPwdForm(f => ({ ...f, loading: true, error: '' }));
    try {
      const res  = await authFetch(`${apiBase}/password`, {
        method: 'PUT',
        body: JSON.stringify({ current_password: pwdForm.current, new_password: pwdForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password.');
      setModal(null);
      setPwdForm({ current: '', next: '', confirm: '', error: '', loading: false });
      showToast('Password updated successfully!');
    } catch (err) {
      setPwdForm(f => ({ ...f, error: err.message, loading: false }));
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateForm.password)
      return setDeactivateForm(f => ({ ...f, error: 'Password is required to confirm.' }));
    setDeactivateForm(f => ({ ...f, loading: true, error: '' }));
    try {
      const res  = await authFetch(`${apiBase}/deactivate`, {
        method: 'PUT',
        body: JSON.stringify({ password: deactivateForm.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate account.');
      setModal(null);
      showToast('Account deactivated. Logging out...');
      setTimeout(() => logout(), 1800);
    } catch (err) {
      setDeactivateForm(f => ({ ...f, error: err.message, loading: false }));
    }
  };

  if (loading) return (
    <div className="max-w-[820px] mx-auto animate-pulse space-y-4">
      <div className="h-[200px] bg-white/5 rounded-3xl" />
      <div className="h-[300px] bg-white/5 rounded-3xl" />
    </div>
  );

  if (!profile) return <div className="text-center py-20 text-txt/30">Failed to load profile.</div>;

  const stats = isConsumer ? [
    { label: 'Connections', value: profile.total_connections, colorClass: 'lime' },
    { label: 'Bills',       value: profile.total_bills,       colorClass: 'orange' },
    { label: 'Applications',value: profile.total_applications,colorClass: 'cyan' },
    { label: 'Complaints',  value: profile.total_complaints,  colorClass: 'red-500' },
  ] : isFieldWorker ? [
    { label: 'Total Jobs',    value: profile.total_jobs,    colorClass: 'lime' },
    { label: 'Resolved',      value: profile.resolved_jobs, colorClass: 'cyan' },
    { label: 'Pending',       value: profile.pending_jobs,  colorClass: 'orange' },
    { label: 'Readings',      value: profile.total_readings,colorClass: 'lime' },
  ] : [
    { label: 'Apps Reviewed',   value: profile.applications_reviewed, colorClass: 'lime' },
    { label: 'Complaints',      value: profile.complaints_assigned, colorClass: 'red-500' },
  ];

  const roleText = isConsumer ? profile.consumer_type : (profile.job_role || 'Staff');

  return (
    <div className="max-w-[820px] mx-auto pb-20 font-outfit">
      
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] bg-lime text-bg px-6 py-3 rounded-full font-bold shadow-2xl animate-slide-up flex items-center gap-2">
           <span className="text-lg">✓</span> {toast}
        </div>
      )}

      {/* Profile Hero */}
      <div className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-[32px] p-8 mb-8">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-lime blur-[100px] opacity-[0.04] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-cyan blur-[100px] opacity-[0.03] pointer-events-none"></div>

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          <div className="relative group">
            <div className="w-24 h-24 rounded-[28px] bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-3xl font-bold tracking-tighter text-txt/40">
              {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="Avatar" /> : initials(profile.first_name, profile.last_name)}
            </div>
            <button 
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-lime border-4 border-bg flex items-center justify-center text-bg text-xs font-bold shadow-lg transition-transform hover:scale-110 active:scale-95"
            >
              {avatarLoading ? '...' : '+'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            {avatar && (
              <button
                onClick={async () => {
                  setAvtLoad(true);
                  try {
                    const res = await authFetch(`${apiBase}/avatar`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to remove photo');
                    setAvatar(null);
                    setGlobalAvatar(null);
                    showToast('Profile photo removed');
                  } catch (err) {
                    showToast(err.message || 'Remove failed');
                  } finally {
                    setAvtLoad(false);
                  }
                }}
                className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-bg border-2 border-white/10 flex items-center justify-center text-txt/40 text-xs hover:text-red-400 hover:border-red-500/30 transition-all shadow-lg"
                title="Remove photo"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex-1">
             <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight text-txt">{profile.first_name} {profile.last_name}</h1>
                <span className="px-2 py-0.5 rounded-md bg-lime/10 border border-lime/20 text-lime text-[9px] font-mono uppercase tracking-widest">{roleText}</span>
             </div>
             <p className="text-txt/40 text-sm mb-6">{profile.email}</p>
             
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map(s => <StatPill key={s.label} {...s} />)}
             </div>
          </div>
        </div>

        {isConsumer && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-white/5">
                <div className="bg-white/[0.03] rounded-2xl p-5 flex items-center justify-between group">
                    <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-1 leading-none">Total Out-goings</div>
                        <div className="text-2xl font-bold font-barlow text-lime tracking-tight">৳ {parseFloat(profile.total_paid || 0).toLocaleString()}</div>
                    </div>
                    <div className="text-lime/10 group-hover:text-lime/20 transition-colors">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                </div>
                <div className="bg-white/[0.03] rounded-2xl p-5 flex items-center justify-between group">
                    <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-1 leading-none">Current Balance</div>
                        <div className="text-2xl font-bold font-barlow text-cyan tracking-tight">৳ {parseFloat(profile.total_outstanding || 0).toLocaleString()}</div>
                    </div>
                    <div className="text-cyan/10 group-hover:text-cyan/20 transition-colors">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="space-y-6">
          <Section 
            title="Identity & Personal" 
            subtitle="Registered primary details"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            action={
                <button 
                    onClick={() => setModal('edit')}
                    className="text-[10px] font-mono uppercase tracking-[0.2em] px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-txt/40 hover:text-txt hover:bg-white/10 transition-all active:scale-95"
                >
                    Edit Profile
                </button>
            }
          >
              <InfoRow label="Full Name" value={`${profile.first_name} ${profile.last_name}`} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow label="Primary Phone" value={profile.phone_number} />
              <InfoRow label="National ID (NID)" value={profile.national_id} locked />
              <InfoRow label="Date of Birth" value={fmtDate(profile.date_of_birth)} locked />
              <InfoRow 
                label="Email" 
                value={profile.email} 
                locked={!isConsumer} 
                onRequest={isConsumer ? () => setRequestField({ field: 'Email', currentValue: profile.email }) : undefined} 
              />
          </Section>

          {isConsumer && (
            <Section
              title="Billing & Payments"
              subtitle="Methods and transaction history"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              action={
                <button
                  onClick={() => navigate('/consumer/payments')}
                  className="text-[10px] font-mono uppercase tracking-[0.2em] px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-txt/40 hover:text-txt hover:bg-white/10 transition-all active:scale-95"
                >
                  Open Payments →
                </button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/consumer/payments')}
                  className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-left hover:border-white/10 transition-all"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-1">Payment Methods</div>
                  <div className="text-sm font-bold text-txt">Manage saved methods</div>
                  <div className="text-[11px] text-txt/30 mt-1">Set default, add bank/mobile/Google Pay</div>
                </button>
                <button
                  onClick={() => navigate('/consumer/payments')}
                  className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-left hover:border-white/10 transition-all"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-1">Payment History</div>
                  <div className="text-sm font-bold text-txt">View transactions</div>
                  <div className="text-[11px] text-txt/30 mt-1">Tap a row to open the related bill</div>
                </button>
              </div>
            </Section>
          )}

          <Section 
            title="Location & Address" 
            subtitle="Utility connection root"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          >
              <InfoRow 
                label="Address" 
                value={`${profile.house_num}, ${profile.street_name}${profile.landmark ? `, ${profile.landmark}` : ''}`} 
                onRequest={isConsumer ? () => setRequestField({ field: 'Address', currentValue: `${profile.house_num}, ${profile.street_name}` }) : undefined}
              />
              <InfoRow 
                label="Region / Cluster" 
                value={`${profile.region_name} — (P.C ${profile.postal_code})`} 
                onRequest={isConsumer ? () => setRequestField({ field: 'Region', currentValue: `${profile.region_name} (${profile.postal_code})` }) : undefined}
              />
          </Section>

          {(isFieldWorker || isEmployee) && (
            <Section 
                title="Employment Information" 
                subtitle="Official staff records"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            >
                <InfoRow label="Designation" value={profile.job_role} locked />
                <InfoRow label="Employee Number" value={profile.employee_num} locked />
                <InfoRow label="Onboarded Date" value={fmtDate(profile.hire_date)} locked />
                <InfoRow label="Current Status" value={profile.employment_status} locked />
                {isFieldWorker && (
                    <>
                        <InfoRow label="Assigned Area" value={profile.assigned_region || 'Unassigned'} locked />
                        <InfoRow label="Specialization" value={profile.expertise || 'Generalist'} locked />
                    </>
                )}
            </Section>
          )}

          <Section 
            title="Security & Access" 
            subtitle="Account integrity settings"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
          >
              <div className="flex flex-col gap-3">
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                      <div>
                          <div className="text-sm font-bold text-txt">Account Password</div>
                          <div className="text-[11px] text-txt/30 tracking-tight">Last updated 3 months ago</div>
                      </div>
                      <button 
                        onClick={() => setModal('password')}
                        className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-txt/80 text-xs font-bold hover:bg-white/10 hover:text-txt transition-all active:scale-95"
                      >
                         Update Password
                      </button>
                  </div>
                  
                  {isConsumer && (
                    <div className="bg-red-500/[0.02] border border-red-500/10 rounded-2xl p-5 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-bold text-red-500">Deactivate Account</div>
                            <div className="text-[11px] text-red-500/40 tracking-tight">Requires admin reactivation</div>
                        </div>
                        <button 
                            onClick={() => setModal('deactivate')}
                            className="px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-all active:scale-95"
                        >
                            Terminate Access
                        </button>
                    </div>
                  )}
              </div>
          </Section>
      </div>

      {/* Simplified Modal Logic - usually I'd break these out but for space: */}
      {modal === 'edit' && (
          <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setModal(null)}>
              <div className="bg-bg border border-white/10 w-full max-w-[440px] rounded-[32px] p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold mb-6 tracking-tight">Edit Basic Info</h3>
                  <div className="space-y-4">
                      {/* Form fields here - keeping it concise but functional */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-2 block">First Name</label>
                            <input value={profile.first_name} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" readOnly />
                        </div>
                        <div>
                            <label className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-2 block">Last Name</label>
                            <input value={profile.last_name} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm" readOnly />
                        </div>
                      </div>
                      <div className="text-[11px] text-txt/30 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5 italic">
                        Real-time editing is currently limited to avatar. For field changes, please use the 'Request Change' flow in each row to ensure data integrity through admin review.
                      </div>
                      <button onClick={() => setModal(null)} className="w-full bg-lime text-bg font-bold py-3.5 rounded-xl transition-all hover:opacity-90 active:scale-95 mt-4">Close View</button>
                  </div>
              </div>
          </div>
      )}

      {/* requestField modal, password modal, deactivate modal - similar tailwind structure... */}
      {requestField && (
          <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setRequestField(null)}>
              <div className="bg-bg border border-white/10 w-full max-w-[440px] rounded-[32px] p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold mb-1 tracking-tight">Request {requestField.field} Change</h3>
                  <p className="text-txt/30 text-xs mb-8">An employee will review and update your records.</p>

                  <div className="space-y-6">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="text-[10px] uppercase font-mono tracking-widest text-txt/20 mb-1">Target Field Content</div>
                        <div className="text-sm font-medium">{requestField.currentValue}</div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-2 block ml-1 text-lime">Proposed Change</label>
                        <textarea
                            rows="2"
                            placeholder="Type new value here..."
                            value={requestValue}
                            onChange={e => setRequestValue(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-lime/40 transition-all placeholder:text-txt/10"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => setRequestField(null)} className="flex-1 bg-white/5 border border-white/10 text-txt/60 font-medium py-3 rounded-xl hover:text-txt">Cancel</button>
                        <button onClick={() => setRequestField(null)} className="flex-[2] bg-lime text-bg font-bold py-3 rounded-xl hover:opacity-90">Send Request</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {modal === 'password' && (
        <div
          role="dialog"
          aria-label="Update password"
          className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => { setModal(null); setPwdForm({ current:'', next:'', confirm:'', error:'', loading:false }); }}
        >
          <div className="bg-bg border border-white/10 w-full max-w-[440px] rounded-[32px] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-1 tracking-tight">Update Password</h3>
            <p className="text-txt/30 text-xs mb-8">Choose a strong password of at least 8 characters.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-2 block">Current Password</label>
                <input type="password" placeholder="Current password"
                  value={pwdForm.current}
                  onChange={e => setPwdForm(f => ({ ...f, current: e.target.value, error: '' }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-lime/40 transition-all placeholder:text-txt/10"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-2 block">New Password</label>
                <input type="password" placeholder="New password"
                  value={pwdForm.next}
                  onChange={e => setPwdForm(f => ({ ...f, next: e.target.value, error: '' }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-lime/40 transition-all placeholder:text-txt/10"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-2 block">Confirm New Password</label>
                <input type="password" placeholder="Confirm new password"
                  value={pwdForm.confirm}
                  onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value, error: '' }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-lime/40 transition-all placeholder:text-txt/10"
                />
              </div>
              {pwdForm.error && (
                <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  {pwdForm.error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setModal(null); setPwdForm({ current:'', next:'', confirm:'', error:'', loading:false }); }}
                  className="flex-1 bg-white/5 border border-white/10 text-txt/60 font-medium py-3 rounded-xl hover:text-txt transition-all"
                >Cancel</button>
                <button
                  onClick={handlePasswordSubmit}
                  disabled={pwdForm.loading}
                  className="flex-[2] bg-lime text-bg font-bold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pwdForm.loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === 'deactivate' && (
        <div
          role="dialog"
          aria-label="Deactivate account"
          className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => { setModal(null); setDeactivateForm({ password:'', error:'', loading:false }); }}
        >
          <div className="bg-bg border border-red-500/10 w-full max-w-[440px] rounded-[32px] p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/40 rounded-t-[32px]" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-red-400">Deactivate Account</h3>
            </div>
            <p className="text-txt/30 text-xs mb-8 leading-relaxed">
              This will suspend all active utility connections and requires admin reactivation. Enter your password to confirm.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-2 block">Confirm Password</label>
                <input type="password" placeholder="Your current password"
                  value={deactivateForm.password}
                  onChange={e => setDeactivateForm(f => ({ ...f, password: e.target.value, error: '' }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-500/40 transition-all placeholder:text-txt/10"
                />
              </div>
              {deactivateForm.error && (
                <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  {deactivateForm.error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setModal(null); setDeactivateForm({ password:'', error:'', loading:false }); }}
                  className="flex-1 bg-white/5 border border-white/10 text-txt/60 font-medium py-3 rounded-xl hover:text-txt transition-all"
                >Cancel</button>
                <button
                  onClick={handleDeactivate}
                  disabled={deactivateForm.loading || !deactivateForm.password}
                  className="flex-[2] bg-red-500/80 text-white font-bold py-3 rounded-xl hover:bg-red-500 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deactivateForm.loading ? 'Deactivating...' : 'Confirm Deactivation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;