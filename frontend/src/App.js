import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './components/Layout';
import { Layout } from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth
import Login    from './components/Auth/Login';
import Register from './components/Auth/Register';

// Consumer pages
import ConsumerDashboard from './components/Consumer/ConsumerDashboard';
import MyBills           from './components/Consumer/MyBills';
import BillDetail        from './components/Consumer/BillDetail';
import UsageHistory      from './components/Consumer/UsageHistory';
import Complaints        from './components/Consumer/Complaints';

// Employee pages
import RegionList from './components/Regions/RegionList';
import RegionForm from './components/Regions/RegionForm';
import RegionEdit from './components/Regions/RegionEdit';

const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const home = {
    employee:     '/employee/dashboard',
    field_worker: '/field-worker/dashboard',
    consumer:     '/consumer/dashboard',
  };
  return <Navigate to={home[user?.role] || '/login'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/"         element={<RootRedirect />} />

            {/* ── Consumer ── */}
            <Route path="/consumer/*" element={
              <ProtectedRoute roles={['consumer']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard"  element={<ConsumerDashboard />} />
                    <Route path="bills"      element={<MyBills />} />
                    <Route path="bills/:id"  element={<BillDetail />} />
                    <Route path="usage"      element={<UsageHistory />} />
                    <Route path="complaints" element={<Complaints />} />
                    {/* TODO: payments, profile */}
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />

            {/* ── Field Worker ── */}
            <Route path="/field-worker/*" element={
              <ProtectedRoute roles={['field_worker']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard" element={<ConsumerDashboard />} />
                    {/* TODO: jobs, readings */}
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />

            {/* ── Employee ── */}
            <Route path="/employee/*" element={
              <ProtectedRoute roles={['employee']}>
                <Layout>
                  <Routes>
                    <Route path="dashboard"        element={<ConsumerDashboard />} />
                    <Route path="regions"          element={<RegionList />} />
                    <Route path="regions/new"      element={<RegionForm />} />
                    <Route path="regions/edit/:id" element={<RegionEdit />} />
                    {/* TODO: connections, consumers, tariffs, complaints, field-workers, analytics */}
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;