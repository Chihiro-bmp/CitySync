import React, { useState, useEffect } from 'react';
import { getRegions, deleteRegion } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Regions.css';

const RegionList = () => {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      const response = await getRegions();
      setRegions(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch regions');
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this region?')) {
      try {
        await deleteRegion(id);
        fetchRegions(); // Refresh list
      } catch (err) {
        alert('Failed to delete region');
      }
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="region-list-container">
      <div className="list-header">
        <h2>Regions</h2>
        <button onClick={() => navigate('/regions/new')} className="btn-primary">
          Add New Region
        </button>
      </div>
      
      <table className="data-table">
        <thead>
  <tr>
    <th>ID</th>
    <th>Region Name</th>
    <th>Postal Code</th>
    <th>Actions</th>
  </tr>
</thead>
<tbody>
  {regions.map((region) => (
    <tr key={region.region_id}>
      <td>{region.region_id}</td>
      <td>{region.region_name}</td>
      <td>{region.postal_code}</td>
      <td>
        <button
          onClick={() => navigate(`/regions/edit/${region.region_id}`)}
          className="btn-edit"
        >
          Edit
        </button>
        <button
          onClick={() => handleDelete(region.region_id)}
          className="btn-delete"
        >
          Delete
        </button>
      </td>
    </tr>
  ))}
</tbody>
      </table>
    </div>
  );
};

export default RegionList;