import React, { useState, useEffect } from 'react';
import { getConsumers, updateConsumer } from '../../services/api';
import { useTheme } from '../Layout/ThemeContext';
import { tokens, fonts } from '../../theme';

const ConsumersList = () => {
  const { isDark } = useTheme();
  const t = tokens[isDark ? 'dark' : 'light'];
  
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchConsumers();
  }, []);

  const fetchConsumers = async () => {
    try {
      const res = await getConsumers();
      setConsumers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch consumers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (consumer) => {
    setEditingId(consumer.person_id);
    setEditForm({
      first_name: consumer.first_name,
      last_name: consumer.last_name,
      phone_number: consumer.phone_number,
      email: consumer.email
    });
  };

  const handleSave = async (id) => {
    try {
      await updateConsumer(id, editForm);
      setEditingId(null);
      fetchConsumers();
    } catch (err) {
      alert('Failed to update consumer');
    }
  };

  if (loading) return <div>Loading consumers...</div>;

  return (
    <div style={{ fontFamily: fonts.ui }}>
      <h2 style={{ color: t.text, marginBottom: 20 }}>Registered Consumers</h2>
      
      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: isDark ? '#1F2937' : '#F3F4F6' }}>
            <tr>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>ID</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Name</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Phone</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Email</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Registration Date</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.textSub, fontSize: 13, fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {consumers.map(c => (
              <tr key={c.person_id}>
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{c.person_id}</td>
                
                {editingId === c.person_id ? (
                  <>
                    <td style={{ padding: 12, borderBottom: `1px solid ${t.border}` }}>
                      <input 
                        value={editForm.first_name || ''} 
                        onChange={e => setEditForm({...editForm, first_name: e.target.value})} 
                        style={{ width: '45%', marginRight: '5%', padding: '4px 8px', borderRadius: 4, border: `1px solid ${t.border}`, background: t.bgInputs, color: t.text }}
                      />
                      <input 
                        value={editForm.last_name || ''} 
                        onChange={e => setEditForm({...editForm, last_name: e.target.value})} 
                        style={{ width: '45%', padding: '4px 8px', borderRadius: 4, border: `1px solid ${t.border}`, background: t.bgInputs, color: t.text }}
                      />
                    </td>
                    <td style={{ padding: 12, borderBottom: `1px solid ${t.border}` }}>
                      <input 
                        value={editForm.phone_number || ''} 
                        onChange={e => setEditForm({...editForm, phone_number: e.target.value})} 
                        style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: `1px solid ${t.border}`, background: t.bgInputs, color: t.text }}
                      />
                    </td>
                    <td style={{ padding: 12, borderBottom: `1px solid ${t.border}` }}>
                      <input 
                        value={editForm.email || ''} 
                        onChange={e => setEditForm({...editForm, email: e.target.value})} 
                        style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: `1px solid ${t.border}`, background: t.bgInputs, color: t.text }}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{c.first_name} {c.last_name}</td>
                    <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{c.phone_number}</td>
                    <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{c.email}</td>
                  </>
                )}
                
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}`, color: t.text, fontSize: 14 }}>{new Date(c.registration_date).toLocaleDateString()}</td>
                
                <td style={{ padding: 12, borderBottom: `1px solid ${t.border}` }}>
                  {editingId === c.person_id ? (
                    <>
                      <button onClick={() => handleSave(c.person_id)} style={{ marginRight: 8, padding: '4px 10px', background: t.primary, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '4px 10px', background: t.border, color: t.text, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => handleEdit(c)} style={{ padding: '4px 10px', background: t.primary, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
            {consumers.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 20, textAlign: 'center', color: t.textSub }}>No consumers found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConsumersList;
