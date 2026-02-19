import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.firstName}!</h1>
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Regions</h3>
          <p>Manage utility regions</p>
          <a href="/regions" className="btn-secondary">View Regions</a>
        </div>
        <div className="dashboard-card">
          <h3>Consumers</h3>
          <p>View consumer information</p>
          <a href="/consumers" className="btn-secondary">View Consumers</a>
        </div>
        <div className="dashboard-card">
          <h3>Utilities</h3>
          <p>Manage utility services</p>
          <a href="/utilities" className="btn-secondary">View Utilities</a>
        </div>
        <div className="dashboard-card">
          <h3>Bills</h3>
          <p>Billing and payments</p>
          <a href="/bills" className="btn-secondary">View Bills</a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;