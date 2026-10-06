import axios from 'axios';

const devBackendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8002';

const BASE_URL = window.desktop?.isElectron
  ? window.location.origin
  : devBackendUrl;
export const API = `${BASE_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 30000 });

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err?.response?.data?.error || err?.message || 'Request failed';
    err.friendly = msg;
    return Promise.reject(err);
  }
);

// Generic resource helpers
const resource = (path) => ({
  list: (params) => http.get(path, { params }).then((r) => r.data),
  all: () => http.get(`${path}/all`).then((r) => r.data),
  get: (id) => http.get(`${path}/${id}`).then((r) => r.data),
  create: (data) => http.post(path, data).then((r) => r.data),
  update: (id, data) => http.put(`${path}/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`${path}/${id}`).then((r) => r.data),
});

export const productsApi = {
  ...resource('/products'),
  lowStock: () => http.get('/products/low-stock').then((r) => r.data),
};
export const categoriesApi = resource('/categories');
export const suppliersApi = resource('/suppliers');
export const projectsApi = resource('/projects');

export const transactionsApi = {
  list: (params) => http.get('/transactions', { params }).then((r) => r.data),
  recent: (limit = 10) => http.get('/transactions/recent', { params: { limit } }).then((r) => r.data),
  stockIn: (data) => http.post('/transactions/stock-in', data).then((r) => r.data),
  stockOut: (data) => http.post('/transactions/stock-out', data).then((r) => r.data),
};

export const reportsApi = {
  summary: () => http.get('/reports/summary').then((r) => r.data),
  monthly: (months = 6) => http.get('/reports/monthly', { params: { months } }).then((r) => r.data),
  projectUsage: () => http.get('/reports/project-usage').then((r) => r.data),
  topProducts: (limit = 10) => http.get('/reports/top-products', { params: { limit } }).then((r) => r.data),
};

export const settingsApi = {
  list: () => http.get('/settings').then((r) => r.data),
  update: (key, value) => http.put(`/settings/${key}`, { value }).then((r) => r.data),
};

export const backupApi = {
  list: () => http.get('/backup/list').then((r) => r.data),
  create: () => http.post('/backup/create').then((r) => r.data),
  downloadUrl: () => `${API}/backup/download`,
  remove: (filename) => http.delete(`/backup/${filename}`).then((r) => r.data),
  restore: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.post('/backup/restore', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
  },
};

export default http;
