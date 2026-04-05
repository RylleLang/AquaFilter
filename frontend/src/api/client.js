import axios from 'axios';
import { storage } from '../utils/storage';

const BASE_URL = 'http://192.168.68.61:5000/api';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
client.interceptors.request.use(async (config) => {
  const token = await storage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handler
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.deleteItem('authToken');
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authAPI = {
  login: (email, password) => client.post('/auth/login', { email, password }),
  register: (name, email, password) => client.post('/auth/register', { name, email, password }),
  me: () => client.get('/auth/me'),
};

// --- Sensor / Telemetry ---
export const sensorAPI = {
  getLatest: () => client.get('/sensor/latest'),
  getHistory: (params) => client.get('/sensor/history', { params }),
  getStats: (range) => client.get('/sensor/stats', { params: { range } }),
};

// --- Device Control ---
export const deviceAPI = {
  getState: () => client.get('/device/state'),
  toggle: (on) => client.post('/device/toggle', { on }),
  startCycle: () => client.post('/device/cycle/start'),
  pauseCycle: () => client.post('/device/cycle/pause'),
};

// --- Maintenance ---
export const maintenanceAPI = {
  getAll: () => client.get('/maintenance'),
  create: (record) => client.post('/maintenance', record),
  acknowledge: (id) => client.patch(`/maintenance/${id}/acknowledge`),
};

export default client;
