import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRegion } from '../../services/api';
import './Regions.css';

const RegionForm = () => {
    const [formData, setFormData] = useState({
    region_name: '',
    postal_code: '',
    });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await createRegion(formData);
      navigate('/regions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create region');
    }
  };

  return (
    <div className="form-container">
      <h2>Add New Region</h2>
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
          <button type="submit" className="btn-primary">Create</button>
          <button
            type="button"
            onClick={() => navigate('/regions')}
            className="btn-cancel"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegionForm;