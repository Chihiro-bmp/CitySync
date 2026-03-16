import React, { useState, useEffect } from 'react';
import { getRegions, createRegion, updateRegion, deleteRegion } from '../../services/api';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

const inputStyle = (t) => ({
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1px solid ${t.border}`, background: t.bgInputs,
  color: t.text, fontFamily: fonts.ui, fontSize: 13,
  boxSizing: 'border-box'
});

const RegionsManager = () => {
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];

  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ region_name: '', postal_code: '' });
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await getRegions();
      setRegions(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.region_name || !form.postal_code)
      return setError('Both fields are required');
    setError('');
    try {
      await createRegion(form);
      setForm({ region_name: '', postal_code: '' });
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create region');
    }
  };

  const handleUpdate = async (id) => {
    try {
      await updateRegion(id, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update region');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this region? This will fail if any addresses, field workers, or utilities are assigned to it.')) return;
    try {
      await deleteRegion(id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Cannot delete — region is in use');
    }
  };

  if (loading) return <div style={{ color: t.text }}>Loading regions...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: t.text, margin: 0 }}>Manage Regions</h2>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            style={{ padding: '9px 18px', background: '#3B6FFF', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            + New Region
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 14 }}>New Region</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: t.textSub, marginBottom: 5, fontWeight: 600 }}>Region Name</label>
              <input
                placeholder="e.g. North District"
                value={form.region_name}
                onChange={e => setForm({ ...form, region_name: e.target.value })}
                style={inputStyle(t)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: t.textSub, marginBottom: 5, fontWeight: 600 }}>Postal Code</label>
              <input
                placeholder="e.g. 12345"
                value={form.postal_code}
                onChange={e => setForm({ ...form, postal_code: e.target.value })}
                style={inputStyle(t)}
              />
            </div>
          </div>
          {error && (
            <div style={{ marginBottom: 12, padding: '9px 14px', background: isDark ? '#2D0C0C' : '#FEE2E2', borderRadius: 8, fontSize: 13, color: isDark ? '#F87171' : '#B91C1C' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleCreate} style={{ padding: '9px 18px', background: '#10B981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Create Region
            </button>
            <button onClick={() => { setShowCreate(false); setError(''); }} style={{ padding: '9px 16px', background: 'transparent', color: t.textSub, border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Regions table */}
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: isDark ? '#1F2937' : '#F3F4F6' }}>
            <tr>
              {['ID', 'Region Name', 'Postal Code', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 12, fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regions.map(r => (
              <tr key={r.region_id}>
                <td style={{ padding: '13px 16px', borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13 }}>
                  #{r.region_id}
                </td>
                {editingId === r.region_id ? (
                  <>
                    <td style={{ padding: '10px 16px', borderBottom: `1px solid ${t.border}` }}>
                      <input
                        value={editForm.region_name}
                        onChange={e => setEditForm({ ...editForm, region_name: e.target.value })}
                        style={{ ...inputStyle(t), width: '90%' }}
                      />
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: `1px solid ${t.border}` }}>
                      <input
                        value={editForm.postal_code}
                        onChange={e => setEditForm({ ...editForm, postal_code: e.target.value })}
                        style={{ ...inputStyle(t), width: '90%' }}
                      />
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: `1px solid ${t.border}` }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleUpdate(r.region_id)} style={{ padding: '6px 14px', background: '#10B981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', background: 'transparent', color: t.textSub, border: `1px solid ${t.border}`, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '13px 16px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14, fontWeight: 500 }}>
                      {r.region_name}
                    </td>
                    <td style={{ padding: '13px 16px', borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>
                      <span style={{ padding: '3px 8px', background: t.bgInputs, borderRadius: 6, fontSize: 13, fontFamily: fonts.mono || 'monospace' }}>
                        {r.postal_code}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', borderBottom: `1px solid ${t.border}` }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setEditingId(r.region_id); setEditForm({ region_name: r.region_name, postal_code: r.postal_code }); }}
                          style={{ padding: '6px 14px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.region_id)}
                          style={{ padding: '6px 12px', background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {regions.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: 30, textAlign: 'center', color: t.textSub }}>
                  No regions found. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegionsManager;