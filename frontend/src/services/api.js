import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('citysync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Regions ────────────────────────────────────────────────────────
export const getRegions    = ()         => api.get('/admin/regions');
export const createRegion  = (data)     => api.post('/admin/regions', data);
export const updateRegion  = (id, data) => api.put(`/admin/regions/${id}`, data);
export const deleteRegion  = (id)       => api.delete(`/admin/regions/${id}`);

// ── Dashboard ──────────────────────────────────────────────────────
export const getTableOverview = () => api.get('/admin/tables');

// ── Consumers ──────────────────────────────────────────────────────
export const getConsumers    = ()         => api.get('/admin/consumers');
export const updateConsumer  = (id, data) => api.put(`/admin/consumers/${id}`, data);

// ── Connections ────────────────────────────────────────────────────
export const getConnections         = ()         => api.get('/admin/connections');
export const createConnection       = (data)     => api.post('/admin/connections', data);           // NEW
export const updateConnectionStatus = (id, data) => api.put(`/admin/connections/${id}/status`, data); // CHANGED: was passing { connection_status: status }, now just pass data directly from the component

// ── Applications ───────────────────────────────────────────────────
export const getApplications         = ()         => api.get('/admin/applications');
export const updateApplicationStatus = (id, data) => api.put(`/admin/applications/${id}/status`, data);

// ── Complaints ─────────────────────────────────────────────────────
export const getComplaintsAdmin         = ()         => api.get('/admin/complaints');
export const updateComplaintStatusAdmin = (id, data) => api.put(`/admin/complaints/${id}/status`, data);
export const assignComplaint            = (id, data) => api.put(`/admin/complaints/${id}/assign`, data);

// ── Meters ─────────────────────────────────────────────────────────
export const getMeters    = () =>     api.get('/admin/meters');
export const createMeter  = (data) => api.post('/admin/meters', data);                              // NEW

// ── Utilities ──────────────────────────────────────────────────────
export const getUtilities = () => api.get('/admin/utilities');                                      // NEW

// ── Tariffs ────────────────────────────────────────────────────────
export const getTariffs   = ()         => api.get('/admin/tariffs');
export const createTariff = (data)     => api.post('/admin/tariffs', data);                         // NEW
export const updateTariff = (id, data) => api.put(`/admin/tariffs/${id}`, data);                    // NEW

// ── Tariff Slabs ───────────────────────────────────────────────────
export const getTariffSlabs   = (tariffId)                => api.get(`/admin/tariffs/${tariffId}/slabs`);                           // NEW
export const createTariffSlab = (tariffId, data)          => api.post(`/admin/tariffs/${tariffId}/slabs`, data);                    // NEW
export const updateTariffSlab = (tariffId, slabNum, data) => api.put(`/admin/tariffs/${tariffId}/slabs/${slabNum}`, data);          // NEW
export const deleteTariffSlab = (tariffId, slabNum)       => api.delete(`/admin/tariffs/${tariffId}/slabs/${slabNum}`);             // NEW

// ── Fixed Charges ──────────────────────────────────────────────────
export const getFixedCharges   = (tariffId)       => api.get(`/admin/tariffs/${tariffId}/fixed-charges`);                          // NEW
export const createFixedCharge = (tariffId, data) => api.post(`/admin/tariffs/${tariffId}/fixed-charges`, data);                   // NEW
export const deleteFixedCharge = (tariffId, fcId) => api.delete(`/admin/tariffs/${tariffId}/fixed-charges/${fcId}`);               // NEW

// ── Billing ────────────────────────────────────────────────────────
export const getBills         = ()         => api.get('/admin/bills');                              // NEW
export const generateBill     = (data)     => api.post('/admin/bills/generate', data);              // NEW
export const updateBillStatus = (id, status) => api.put(`/admin/bills/${id}/status`, { bill_status: status }); // NEW

// ── Payments ───────────────────────────────────────────────────────
export const getPayments = () => api.get('/admin/payments');                                        // NEW

// ── Employees & Field Workers ──────────────────────────────────────
export const getEmployees   = () => api.get('/admin/employees');
export const getFieldWorkers = () => api.get('/admin/field-workers');

// ── Field Worker ───────────────────────────────────────────────────
export const getMyJobs              = ()         => api.get('/fieldworker/jobs');
export const updateJobStatus        = (id, data) => api.put(`/fieldworker/jobs/${id}/status`, data); // FIXED: was pointing to wrong /admin/complaints endpoint
export const getConnectionsForReading = ()       => api.get('/fieldworker/connections');
export const submitMeterReading     = (data)     => api.post('/fieldworker/readings', data);

// ── Auth ───────────────────────────────────────────────────────────
export const login    = (credentials) => api.post('/auth/login', credentials);
export const register = (userData)    => api.post('/auth/register', userData);

export default api;