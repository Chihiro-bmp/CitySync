import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRegions, updateRegion } from '../../services/api';
import './Regions.css';

const RegionEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    region_name: '',
    postal_code: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRegion = async () => {
      try {
        // Fetch all regions and find the one we need
        // (no single-region GET endpoint, so we filter from the list)
        const response = await getRegions();
        const regions = response.data.data || [];
        const region = regions.find(r => r.region_id === parseInt(id));
        if (!region) {
          setError('Region not found');
        } else {
          setFormData({
            region_name: region.region_name,
            postal_code: region.postal_code,
          });
        }
      } catch (err) {
        setError('Failed to load region');
      } finally {
        setLoading(false);
      }
    };
    fetchRegion();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await updateRegion(id, formData);
      navigate('/employee/regions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update region');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="form-container">
      <h2>Edit Region</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Region Name:</label>
          <input
            type="text"
            name="region_name"
            value={formData.region_name}
            onChange={handleChange}
            placeholder="e.g., Mirpur, Dhanmondi, Gulshan"
            required
          />
        </div>
        <div className="form-group">
          <label>Postal Code:</label>
          <input
            type="text"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            placeholder="e.g., 1216"
            required
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Save Changes</button>
          <button
            type="button"
            onClick={() => navigate('/employee/regions')}
            className="btn-cancel"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegionEdit;