import React, { useState, useEffect, useCallback } from 'react';
import {
  getTariffs, createTariff, updateTariff,
  getTariffSlabs, createTariffSlab, updateTariffSlab, deleteTariffSlab,
  getFixedCharges, createFixedCharge, deleteFixedCharge,
  getUtilities
} from '../../services/api';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

// ── Small helpers ────────────────────────────────────────────────────────────
const Badge = ({ active, t, isDark }) => (
  <span style={{
    padding: '4px 8px', borderRadius: 100, fontSize: 12, fontWeight: 500,
    background: active ? (isDark ? '#0D2E1A' : '#DCFCE7') : (isDark ? '#2D0C0C' : '#FEE2E2'),
    color: active ? (isDark ? '#4ADE80' : '#16A34A') : (isDark ? '#F87171' : '#B91C1C')
  }}>
    {active ? 'Active' : 'Inactive'}
  </span>
);

const inputStyle = (t) => ({
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: `1px solid ${t.border}`, background: t.bgInputs,
  color: t.text, fontFamily: fonts.ui, fontSize: 13,
  boxSizing: 'border-box'
});

const btn = (bg, color = 'white') => ({
  padding: '7px 14px', background: bg, color,
  border: 'none', borderRadius: 7, cursor: 'pointer',
  fontSize: 12, fontWeight: 600
});

// ── Slab Panel ───────────────────────────────────────────────────────────────
const SlabPanel = ({ tariff, t, isDark }) => {
  const [slabs, setSlabs] = useState([]);
  const [newSlab, setNewSlab] = useState({ charge_type: 'FLAT', unit_from: '', unit_to: '', rate_per_unit: '' });
  const [editingNum, setEditingNum] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await getTariffSlabs(tariff.tariff_id);
      setSlabs(res.data.data || []);
    } catch { /* silent */ }
  }, [tariff.tariff_id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newSlab.unit_from || !newSlab.rate_per_unit) return alert('unit_from and rate_per_unit are required');
    try {
      await createTariffSlab(tariff.tariff_id, newSlab);
      setNewSlab({ charge_type: 'FLAT', unit_from: '', unit_to: '', rate_per_unit: '' });
      load();
    } catch { alert('Failed to add slab'); }
  };

  const handleEdit = async (slab_num) => {
    try {
      await updateTariffSlab(tariff.tariff_id, slab_num, editForm);
      setEditingNum(null);
      load();
    } catch { alert('Failed to update slab'); }
  };

  const handleDelete = async (slab_num) => {
    if (!window.confirm('Delete this slab?')) return;
    try {
      await deleteTariffSlab(tariff.tariff_id, slab_num);
      load();
    } catch (e) { alert(e.response?.data?.error || 'Cannot delete slab'); }
  };

  const rowStyle = { display: 'grid', gridTemplateColumns: '60px 90px 1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid ${t.border}` };

  return (
    <div style={{ marginTop: 12 }}>
      {/* Header */}
      <div style={{ ...rowStyle, background: isDark ? '#1F2937' : '#F3F4F6', borderRadius: '8px 8px 0 0' }}>
        {['Slab #', 'Type', 'Unit From', 'Unit To', 'Rate/Unit', `Rate (${tariff.unit_of_measurement || 'unit'})`, ''].map((h, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 700, color: t.textSub, textTransform: 'uppercase' }}>{h}</div>
        ))}
      </div>

      {slabs.map(s => (
        <div key={s.slab_num} style={{ ...rowStyle, background: t.bgCard }}>
          {editingNum === s.slab_num ? (
            <>
              <div style={{ color: t.textSub, fontSize: 13 }}>#{s.slab_num}</div>
              <select value={editForm.charge_type} onChange={e => setEditForm({ ...editForm, charge_type: e.target.value })} style={{ ...inputStyle(t), padding: '6px 8px' }}>
                {['FLAT', 'PEAK', 'OFF-PEAK'].map(o => <option key={o}>{o}</option>)}
              </select>
              <input type="number" value={editForm.unit_from} onChange={e => setEditForm({ ...editForm, unit_from: e.target.value })} style={inputStyle(t)} />
              <input type="number" value={editForm.unit_to ?? ''} onChange={e => setEditForm({ ...editForm, unit_to: e.target.value })} placeholder="∞" style={inputStyle(t)} />
              <input type="number" step="0.0001" value={editForm.rate_per_unit} onChange={e => setEditForm({ ...editForm, rate_per_unit: e.target.value })} style={inputStyle(t)} />
              <div style={{ fontSize: 12, color: t.textSub }}>editing</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => handleEdit(s.slab_num)} style={btn('#10B981')}>Save</button>
                <button onClick={() => setEditingNum(null)} style={btn(t.border, t.text)}>✕</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: t.textSub }}>#{s.slab_num}</div>
              <span style={{ padding: '3px 7px', borderRadius: 100, background: isDark ? '#1e293b' : '#e0e7ff', color: isDark ? '#818cf8' : '#4338ca', fontSize: 11, fontWeight: 600 }}>{s.charge_type}</span>
              <div style={{ fontSize: 13, color: t.text }}>{s.unit_from}</div>
              <div style={{ fontSize: 13, color: t.text }}>{s.unit_to ?? '∞'}</div>
              <div style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>{parseFloat(s.rate_per_unit).toFixed(4)}</div>
              <div style={{ fontSize: 12, color: t.textSub }}>per {tariff.unit_of_measurement || 'unit'}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { setEditingNum(s.slab_num); setEditForm({ charge_type: s.charge_type, unit_from: s.unit_from, unit_to: s.unit_to, rate_per_unit: s.rate_per_unit }); }} style={btn('#6366f1')}>Edit</button>
                <button onClick={() => handleDelete(s.slab_num)} style={btn('#EF4444')}>✕</button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* Add new slab row */}
      <div style={{ ...rowStyle, background: isDark ? '#0f172a' : '#f8fafc', borderRadius: '0 0 8px 8px' }}>
        <div style={{ fontSize: 12, color: t.textSub }}>New</div>
        <select value={newSlab.charge_type} onChange={e => setNewSlab({ ...newSlab, charge_type: e.target.value })} style={{ ...inputStyle(t), padding: '6px 8px' }}>
          {['FLAT', 'PEAK', 'OFF-PEAK'].map(o => <option key={o}>{o}</option>)}
        </select>
        <input type="number" placeholder="From" value={newSlab.unit_from} onChange={e => setNewSlab({ ...newSlab, unit_from: e.target.value })} style={inputStyle(t)} />
        <input type="number" placeholder="To (blank = ∞)" value={newSlab.unit_to} onChange={e => setNewSlab({ ...newSlab, unit_to: e.target.value })} style={inputStyle(t)} />
        <input type="number" step="0.0001" placeholder="Rate" value={newSlab.rate_per_unit} onChange={e => setNewSlab({ ...newSlab, rate_per_unit: e.target.value })} style={inputStyle(t)} />
        <div style={{ fontSize: 12, color: t.textSub }}>per {tariff.unit_of_measurement || 'unit'}</div>
        <button onClick={handleAdd} style={btn('#10B981')}>+ Add</button>
      </div>
    </div>
  );
};

// ── Fixed Charges Panel ──────────────────────────────────────────────────────
const FixedChargesPanel = ({ tariff, t, isDark }) => {
  const [charges, setCharges] = useState([]);
  const [form, setForm] = useState({ charge_name: '', charge_amount: '', charge_frequency: 'Monthly', is_mandatory: true });

  const load = useCallback(async () => {
    try {
      const res = await getFixedCharges(tariff.tariff_id);
      setCharges(res.data.data || []);
    } catch { /* silent */ }
  }, [tariff.tariff_id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.charge_amount || !form.charge_frequency) return alert('Amount and frequency are required');
    try {
      await createFixedCharge(tariff.tariff_id, form);
      setForm({ charge_name: '', charge_amount: '', charge_frequency: 'Monthly', is_mandatory: true });
      load();
    } catch { alert('Failed to add charge'); }
  };

  const handleDelete = async (fc_id) => {
    if (!window.confirm('Delete this charge?')) return;
    try {
      await deleteFixedCharge(tariff.tariff_id, fc_id);
      load();
    } catch (e) { alert(e.response?.data?.error || 'Cannot delete'); }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: t.textSub, textTransform: 'uppercase', marginBottom: 8 }}>Fixed Charges</div>
      <div style={{ background: t.bgInputs, borderRadius: 8, overflow: 'hidden', border: `1px solid ${t.border}` }}>
        {charges.map(fc => (
          <div key={fc.fixed_charge_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: `1px solid ${t.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{fc.charge_name || 'Unnamed Charge'}</div>
              <div style={{ fontSize: 12, color: t.textSub }}>{fc.charge_frequency} · {fc.is_mandatory ? '⚠ Mandatory' : 'Optional'}</div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>${parseFloat(fc.charge_amount).toFixed(2)}</div>
            <button onClick={() => handleDelete(fc.fixed_charge_id)} style={btn('#EF4444')}>Remove</button>
          </div>
        ))}
        {charges.length === 0 && (
          <div style={{ padding: '12px 14px', fontSize: 13, color: t.textSub }}>No fixed charges yet</div>
        )}
        {/* Add form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 8, padding: '10px 14px', background: isDark ? '#0f172a' : '#f8fafc' }}>
          <input placeholder="Name (e.g. Service Fee)" value={form.charge_name} onChange={e => setForm({ ...form, charge_name: e.target.value })} style={inputStyle(t)} />
          <input type="number" step="0.01" placeholder="Amount" value={form.charge_amount} onChange={e => setForm({ ...form, charge_amount: e.target.value })} style={inputStyle(t)} />
          <select value={form.charge_frequency} onChange={e => setForm({ ...form, charge_frequency: e.target.value })} style={{ ...inputStyle(t), padding: '6px 8px' }}>
            {['Monthly', 'Quarterly', 'Annually', 'One-time'].map(f => <option key={f}>{f}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: t.textSub, whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={form.is_mandatory} onChange={e => setForm({ ...form, is_mandatory: e.target.checked })} />
            Mandatory
          </label>
          <button onClick={handleAdd} style={btn('#10B981')}>+ Add</button>
        </div>
      </div>
    </div>
  );
};

// ── Tariff Form (create / edit) ───────────────────────────────────────────────
const TariffForm = ({ utilities, onSave, onCancel, t, isDark, initial }) => {
  const [form, setForm] = useState(initial || {
    tariff_name: '', utility_id: '', consumer_category: 'Residential',
    billing_method: 'Slab', effective_from: '', effective_to: '', is_active: true
  });

  const handleSubmit = async () => {
    if (!form.tariff_name || !form.utility_id || !form.effective_from)
      return alert('Name, utility and effective date are required');
    await onSave(form);
  };

  const field = (label, content) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: t.textSub, marginBottom: 5, fontWeight: 600 }}>{label}</label>
      {content}
    </div>
  );

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 16 }}>
        {initial ? 'Edit Tariff' : 'New Tariff'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {field('Tariff Name', <input value={form.tariff_name} onChange={e => setForm({ ...form, tariff_name: e.target.value })} style={inputStyle(t)} />)}
        {field('Utility', (
          <select value={form.utility_id} onChange={e => setForm({ ...form, utility_id: e.target.value })} style={{ ...inputStyle(t), padding: '8px 10px' }}>
            <option value="">Select utility...</option>
            {utilities.map(u => <option key={u.utility_id} value={u.utility_id}>{u.utility_name} ({u.utility_type})</option>)}
          </select>
        ))}
        {field('Consumer Category', (
          <select value={form.consumer_category} onChange={e => setForm({ ...form, consumer_category: e.target.value })} style={{ ...inputStyle(t), padding: '8px 10px' }}>
            {['Residential', 'Commercial', 'Industrial', 'Agricultural'].map(c => <option key={c}>{c}</option>)}
          </select>
        ))}
        {field('Billing Method', (
          <select value={form.billing_method} onChange={e => setForm({ ...form, billing_method: e.target.value })} style={{ ...inputStyle(t), padding: '8px 10px' }}>
            {['Slab', 'Flat Rate', 'Time-of-Use', 'Tiered'].map(m => <option key={m}>{m}</option>)}
          </select>
        ))}
        {field('Effective From', <input type="date" value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })} style={inputStyle(t)} />)}
        {field('Effective To (blank = ongoing)', <input type="date" value={form.effective_to} onChange={e => setForm({ ...form, effective_to: e.target.value })} style={inputStyle(t)} />)}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: t.text, marginBottom: 16 }}>
        <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
        Active
      </label>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSubmit} style={btn('#10B981')}>
          {initial ? 'Save Changes' : 'Create Tariff'}
        </button>
        <button onClick={onCancel} style={btn(t.border, t.text)}>Cancel</button>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const TariffsManager = () => {
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [tariffs, setTariffs] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try {
      const [tr, ut] = await Promise.all([getTariffs(), getUtilities()]);
      setTariffs(tr.data.data || []);
      setUtilities(ut.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    try {
      await createTariff(form);
      setShowCreate(false);
      load();
    } catch { alert('Failed to create tariff'); }
  };

  const handleUpdate = async (form) => {
    try {
      await updateTariff(editingTariff.tariff_id, form);
      setEditingTariff(null);
      load();
    } catch { alert('Failed to update tariff'); }
  };

  if (loading) return <div style={{ color: t.text }}>Loading tariffs...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: t.text, margin: 0 }}>Tariff Configuration</h2>
        {!showCreate && !editingTariff && (
          <button onClick={() => setShowCreate(true)} style={btn('#3B6FFF')}>+ New Tariff</button>
        )}
      </div>

      {showCreate && (
        <TariffForm utilities={utilities} onSave={handleCreate} onCancel={() => setShowCreate(false)} t={t} isDark={isDark} />
      )}
      {editingTariff && (
        <TariffForm utilities={utilities} initial={editingTariff} onSave={handleUpdate} onCancel={() => setEditingTariff(null)} t={t} isDark={isDark} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tariffs.map(tf => {
          const isExpanded = expandedId === tf.tariff_id;
          return (
            <div key={tf.tariff_id} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* Tariff header row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : tf.tariff_id)}
                style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 130px 160px 80px 100px', gap: 12, alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 14, color: t.textSub, fontWeight: 500 }}>#{tf.tariff_id}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{tf.tariff_name}</div>
                  <div style={{ fontSize: 12, color: t.textSub }}>{tf.utility_name} · {tf.consumer_category}</div>
                </div>
                <div style={{ fontSize: 13, color: t.text }}>{tf.billing_method}</div>
                <div>
                  <div style={{ fontSize: 12, color: t.textSub }}>From: {new Date(tf.effective_from).toLocaleDateString()}</div>
                  <div style={{ fontSize: 12, color: t.textSub }}>To: {tf.effective_to ? new Date(tf.effective_to).toLocaleDateString() : 'Ongoing'}</div>
                </div>
                <div style={{ fontSize: 12, color: t.textSub }}>{tf.unit_of_measurement || '—'}</div>
                <Badge active={tf.is_active} t={t} isDark={isDark} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setEditingTariff(tf); setShowCreate(false); }}
                    style={btn('#6366f1')}
                  >Edit</button>
                  <span style={{ color: t.textSub, fontSize: 16, lineHeight: 1, alignSelf: 'center' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded: slabs + fixed charges */}
              {isExpanded && (
                <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${t.border}` }}>
                  <div style={{ paddingTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.textSub, textTransform: 'uppercase', marginBottom: 8 }}>
                      Rate Slabs
                    </div>
                    <SlabPanel tariff={tf} t={t} isDark={isDark} />
                  </div>
                  <FixedChargesPanel tariff={tf} t={t} isDark={isDark} />
                </div>
              )}
            </div>
          );
        })}
        {tariffs.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: t.textSub, background: t.bgCard, borderRadius: 12, border: `1px solid ${t.border}` }}>
            No tariffs found. Create one above.
          </div>
        )}
      </div>
    </div>
  );
};

export default TariffsManager;