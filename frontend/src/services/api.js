import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('citysync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Region APIs
export const getRegions = () => api.get('/regions');
export const createRegion = (data) => api.post('/regions', data);
export const updateRegion = (id, data) => api.put(`/regions/${id}`, data);
export const deleteRegion = (id) => api.delete(`/regions/${id}`);

// Consumer APIs
export const getConsumers = () => api.get('/consumers');

// Auth APIs (you'll need to create these endpoints in backend)
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);

export default api;