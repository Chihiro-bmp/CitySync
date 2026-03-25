import React, { useState, useCallback, useEffect } from 'react';
import Select from 'react-select';
import { useAuth } from '../../context/AuthContext';
import { fonts, utilities } from '../../theme';
import { ConnectionIcon, ElectricityIcon, WaterIcon, GasIcon } from '../../Icons';

const UTIL_ICONS = { electricity: ElectricityIcon, water: WaterIcon, gas: GasIcon };

const ModalField = ({ label, t, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }}>{label}</label>
    {children}
  </div>
);

export const createReactSelectStyles = (t, isDark, fonts) => ({
  control: provided => ({
    ...provided,
    height: 44,
    borderRadius:10,
    border:`1.5px solid ${t.border}`,
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
  }),
  singleValue: provided => ({ ...provided, color: t.text, fontSize: 13, fontFamily: fonts.ui }),
  placeholder: provided => ({ ...provided, fontSize: 13, fontFamily: fonts.ui }),
  menu: provided => ({ ...provided, zIndex: 9999, background: t.bgCard, color: t.text }),
  menuList: provided => ({
    ...provided,
    maxHeight: 140,
    padding: 0,
    background: isDark ? 'rgba(59,111,255,0.03)' : '#F5F8FF',
    color: t.text,
    fontSize: 13,
    fontFamily: fonts.ui,
  }),
  option: (provided, state) => ({
    ...provided,
    background: state.isFocused || state.isSelected
      ? (isDark ? 'rgba(59,111,255,0.08)' : '#E8F0FF')
      : 'transparent',
    color: t.text,
    fontSize: 13,
    fontFamily: fonts.ui,
    cursor: 'pointer',
  }),
});

const NewApplicationModal = ({ onClose, onSuccess, t, isDark }) => {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({ requested_connection_type: 'Residential', region_id: '', address: '', utility_id: '', priority: 'Normal' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myRegion, setMyRegion] = useState(null);
  const [myAddress, setMyAddress] = useState('');
  const [regions, setRegions] = useState([]);
  const [utility_type, setUtilityType] = useState('electricity');
  const [utilities, setUtilities] = useState([]);
  const [useMyAddress, setUseMyAddress] = useState(false);

  const handleUseMyAddress = async (checked) => {
    if (checked) {
      setForm(f => ({ ...f, region_id: myRegion || '', address: myAddress || '', utility_id: '' }));
      if (myRegion) await fetchUtilities(myRegion);
    } else {
      setForm(f => ({ ...f, region_id: '', address: '', utility_id: '' }));
      setUtilities([]);
    }
  };

  const handleSubmit = async () => {
    if (!form.address.trim()) { setError('Address is required'); return; }
    if (!form.region_id) { setError('Region is required'); return; }
    if (!form.utility_id) { setError('Utility is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await authFetch('/api/consumer/applications', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

	const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [regRes, meRes] = await Promise.all([
        authFetch(`/api/public/regions`),
        authFetch(`/api/profile/me`),
      ]);
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error);
      const meData = await meRes.json();
      if (!meRes.ok) throw new Error(meData.error);
      setRegions(regData);
      setMyRegion(meData.region_id);
      setMyAddress(meData.house_num + ', ' + meData.street_name + (meData.landmark ? `, ${meData.landmark}` : ''));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
	}, [authFetch]);

  const fetchUtilities = useCallback(async (reg_id) => {
    setLoading(true);
    try {
    const res  = await authFetch(`/api/public/utility-names/${reg_id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setUtilities(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
	}, [authFetch]);

	useEffect(() => { fetchAll(); }, [fetchAll]);

  const selectStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1.5px solid ${t.border}`,
    background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF',
    color: t.text, fontSize: 13, fontFamily: fonts.ui, outline: 'none', cursor: 'pointer',
  };

  const regionOptions = regions.map(r => ({ value: r.region_id, label: r.region_name }));
  const utilityOptions = utilities
    .filter(u => ((u.utility_type || '').toLowerCase() === utility_type))
    .map(u => ({ value: u.utility_id, label: `${u.utility_name}` }));
  const selectStyles = createReactSelectStyles(t, isDark, fonts);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 460 }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#3B6FFF,#00C4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,111,255,0.35)' }}>
            <ConnectionIcon size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>New Connection Application</div>
            <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>Submit a request for a new utility connection</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <ModalField label="Utility Type" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {['Electricity', 'Water', 'Gas'].map(u => {
              const key = u.toLowerCase();
              const col = utilities[key];
              const Icon = UTIL_ICONS[key];
              const active = utility_type === key;
              return (
                <button key={u} onClick={() => { setUtilityType(key); setForm(f => ({ ...f, utility_id: '' })); }} style={{ padding: '12px 8px', borderRadius: 12, border: `1.5px solid ${active ? 'transparent' : t.border}`, background: active ? col.gradient : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.15s', boxShadow: active ? `0 4px 14px ${col.glow}` : 'none' }}>
                  <Icon size={18} color={active ? '#fff' : t.textSub} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: active ? '#fff' : t.textSub }}>{u}</span>
                </button>
              );
            })}
          </div>
        </ModalField>

        <ModalField label="Connection Type" t={t}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['Residential', 'Commercial'].map(type => (
              <button key={type} onClick={() => setForm(f => ({ ...f, requested_connection_type: type }))} style={{ padding: '10px', borderRadius: 10, border: `1.5px solid ${form.requested_connection_type === type ? t.primary : t.border}`, background: form.requested_connection_type === type ? (isDark ? 'rgba(59,111,255,0.12)' : '#EEF2FF') : 'transparent', color: form.requested_connection_type === type ? t.primary : t.textSub, fontSize: 13, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer', transition: 'all 0.15s' }}>
                {type}
              </button>
            ))}
          </div>
        </ModalField>

        <ModalField label="Region" t={t}>
          <Select
            options={regionOptions}
            value={regionOptions.find(o => o.value === form.region_id) || null}
            onChange={opt => {
              const val = opt ? opt.value : '';
              setForm(f => ({ ...f, region_id: val }));
              if (val) fetchUtilities(val);
            }}
            isDisabled={useMyAddress}
            isClearable
            styles={{ ...selectStyles, background: useMyAddress ? (isDark ? 'rgba(255,255,255,0.02)' : '#F3F4F6') : selectStyle.background }}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            placeholder="Select region"
          />
        </ModalField>

        <ModalField label="Installation Address" t={t}>
          <textarea
            rows={3}
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            disabled={useMyAddress}
            placeholder="House number, street, landmark..."
            style={{ ...selectStyle, resize: 'none', lineHeight: 1.5, background: useMyAddress ? (isDark ? 'rgba(255,255,255,0.02)' : '#F3F4F6') : selectStyle.background }}
          />
        </ModalField>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: t.textSub, display: 'block', marginBottom: 7 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useMyAddress}
              onChange={e => {
                const checked = e.target.checked;
                setUseMyAddress(checked);
                handleUseMyAddress(checked);
              }}
            />
            <span style={{ fontSize: 13, color: t.text, userSelect: 'none' }}>Use my address</span>
          </label>
        </div>

        <ModalField label="Utility" t={t}>
          <Select
            options={utilityOptions}
            value={utilityOptions.find(o => o.value === form.utility_id) || null}
            onChange={opt => {
              const val = opt ? opt.value : '';
              setForm(f => ({ ...f, utility_id: val }));
            }}
            isClearable
            styles={selectStyles}
            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
            placeholder="Select utility"
          />
        </ModalField>

        <ModalField label="Priority" t={t}>
          <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={selectStyle}>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </ModalField>

        {error && (
          <div style={{ fontSize: 13, color: isDark ? '#F87171' : '#B91C1C', marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: isDark ? '#2D0C0C' : '#FEE2E2' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${t.border}`, background: 'transparent', color: t.text, fontSize: 14, fontWeight: 500, fontFamily: fonts.ui, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: loading ? t.textMuted : 'linear-gradient(135deg,#3B6FFF,#2952D9)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: fonts.ui, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 16px rgba(59,111,255,0.3)' }}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewApplicationModal;
