import React, { useState, useCallback, useEffect } from 'react';
import { X, Zap, Droplets, Flame } from '../../Icons';
import Select from 'react-select';
import { useAuth } from '../../context/AuthContext';

const NewApplicationModal = ({ onClose, onSuccess }) => {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({ requested_connection_type: 'Residential', region_id: '', address: '', utility_id: '', priority: 'Normal' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [myRegion, setMyRegion] = useState(null);
  const [myAddress, setMyAddress] = useState('');
  const [regions, setRegions] = useState([]);
  const [utility_type, setUtilityType] = useState('electricity');
  const [utilitiesList, setUtilitiesList] = useState([]);
  const [useMyAddress, setUseMyAddress] = useState(false);

  const handleUseMyAddress = async (checked) => {
    if (checked) {
      setForm(f => ({ ...f, region_id: myRegion || '', address: myAddress || '', utility_id: '' }));
      if (myRegion) await fetchUtilities(myRegion);
    } else {
      setForm(f => ({ ...f, region_id: '', address: '', utility_id: '' }));
      setUtilitiesList([]);
    }
  };

  const handleSubmit = async () => {
    if (!form.address.trim()) { setError('Address is required'); return; }
    if (!form.region_id) { setError('Region is required'); return; }
    if (!form.utility_id) { setError('Utility is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await authFetch('/api/consumer/applications', { method: 'POST', body: JSON.stringify(form) });
      if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
      }
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
        authFetch(`/api/consumer/profile`), // Updated to match /profile endpoint
      ]);
      const regData = await regRes.json();
      const meData = await meRes.json();
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
      setUtilitiesList(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      background: 'rgba(255, 255, 255, 0.03)',
      borderColor: state.isFocused ? 'rgba(204, 255, 0, 0.4)' : 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '4px',
      color: 'white',
      '&:hover': {
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }
    }),
    menu: (base) => ({
      ...base,
      background: '#1A1A1A',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      overflow: 'hidden'
    }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? 'rgba(204, 255, 0, 0.1)' : 'transparent',
      color: state.isFocused ? '#CCFF00' : 'rgba(255,255,255,0.6)',
      fontSize: '13px',
      padding: '12px 16px',
      cursor: 'pointer'
    }),
    singleValue: (base) => ({
      ...base,
      color: 'white',
      fontSize: '14px'
    }),
    placeholder: (base) => ({
      ...base,
      color: 'rgba(255,255,255,0.2)',
      fontSize: '14px'
    })
  };

  const regionOptions = regions.map(r => ({ value: r.region_id, label: r.region_name }));
  const utilityOptions = utilitiesList
    .filter(u => ((u.utility_type || '').toLowerCase() === utility_type))
    .map(u => ({ value: u.utility_id, label: u.utility_name }));

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in font-dm" onClick={onClose}>
      <div className="bg-bg border border-white/10 w-full max-w-[520px] rounded-[40px] p-10 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-start mb-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-txt mb-1">New Connection</h2>
                <p className="text-txt/30 text-xs font-mono uppercase tracking-widest">Application Form</p>
            </div>
            <button onClick={onClose} className="text-txt/20 hover:text-txt transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-8">
            {/* Utility Type Icons */}
            <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-4 block">1. Select Utility</label>
                <div className="grid grid-cols-3 gap-3">
                    {['Electricity', 'Water', 'Gas'].map(type => (
                        <button
                            key={type}
                            onClick={() => { setUtilityType(type.toLowerCase()); setForm(f => ({ ...f, utility_id: '' })); }}
                            className={`flex flex-col items-center gap-3 p-5 rounded-3xl border transition-all ${
                                utility_type === type.toLowerCase() 
                                ? 'bg-lime text-bg border-lime font-bold shadow-lg shadow-lime/10' 
                                : 'bg-white/5 border-white/5 text-txt/40 hover:border-white/10'
                            }`}
                        >
                            {type === 'Electricity' ? <Zap size={20} /> : type === 'Water' ? <Droplets size={20} /> : <Flame size={20} />}
                            <span className="text-[10px] uppercase font-mono tracking-wider">{type}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Connection Type */}
            <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-txt/30 mb-4 block">2. Connection Details</label>
                <div className="flex gap-3 mb-6">
                    {['Residential', 'Commercial'].map(type => (
                        <button
                            key={type}
                            onClick={() => setForm(f => ({ ...f, requested_connection_type: type }))}
                            className={`flex-1 py-3.5 rounded-2xl border text-xs font-bold transition-all ${
                                form.requested_connection_type === type 
                                ? 'bg-white/10 text-txt border-lime/40' 
                                : 'bg-white/5 border-white/5 text-txt/20'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="text-[9px] font-mono uppercase tracking-widest text-txt/20 ml-1">Region</label>
                             <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={useMyAddress} 
                                    onChange={e => { setUseMyAddress(e.target.checked); handleUseMyAddress(e.target.checked); }}
                                    className="accent-lime"
                                />
                                <span className="text-[10px] text-txt/20 group-hover:text-lime transition-colors">Use My Profile Address</span>
                             </label>
                        </div>
                        <Select
                            styles={customSelectStyles}
                            options={regionOptions}
                            value={regionOptions.find(o => o.value === form.region_id)}
                            onChange={opt => {
                                setForm(f => ({ ...f, region_id: opt?.value || '' }));
                                if (opt?.value) fetchUtilities(opt.value);
                            }}
                            isDisabled={useMyAddress}
                            placeholder="Search Region..."
                        />
                    </div>

                    <div>
                        <label className="text-[9px] font-mono uppercase tracking-widest text-txt/20 mb-2 block ml-1">Full Installation Address</label>
                        <textarea
                            value={form.address}
                            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                            disabled={useMyAddress}
                            className={`w-full bg-white/[0.03] border rounded-2xl p-4 text-sm text-txt outline-none focus:border-lime/40 transition-all ${useMyAddress ? 'opacity-50 cursor-not-allowed' : 'border-white/5'}`}
                            rows="3"
                            placeholder="House, Street, Area..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="text-[9px] font-mono uppercase tracking-widest text-txt/20 mb-2 block ml-1">Utility Provider</label>
                        <Select
                            styles={customSelectStyles}
                            options={utilityOptions}
                            value={utilityOptions.find(o => o.value === form.utility_id)}
                            onChange={opt => setForm(f => ({ ...f, utility_id: opt?.value || '' }))}
                            placeholder="Select Utility Provider..."
                        />
                    </div>

                    <div>
                        <label className="text-[9px] font-mono uppercase tracking-widest text-txt/20 mb-2 block ml-1">Urgency</label>
                        <select 
                            value={form.priority} 
                            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 text-sm text-txt outline-none appearance-none"
                        >
                            <option value="Normal">Normal Processing</option>
                            <option value="High">Priority Review</option>
                            <option value="Urgent">Emergency Setup</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && <p className="text-red-500 text-xs font-mono bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</p>}

            <div className="flex gap-4 pt-4">
                <button 
                  disabled={loading}
                  onClick={handleSubmit} 
                  className="flex-[2] bg-lime text-bg font-bold py-4 rounded-2xl transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Submit Application'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default NewApplicationModal;
