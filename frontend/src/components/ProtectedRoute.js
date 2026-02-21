import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_HOME = {
  employee:     '/employee/dashboard',
  field_worker: '/field-worker/dashboard',
  consumer:     '/consumer/dashboard',
};

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wrong role → send them to their correct home
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;