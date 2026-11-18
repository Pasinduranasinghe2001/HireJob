import axios from 'axios';

const rawEnvUrl = import.meta.env.VITE_API_URL?.trim();
export const API_ORIGIN = rawEnvUrl ? rawEnvUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '') : '';
const baseURL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

/** Resolve relative `/uploads/...` media paths against the configured backend origin in production. */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/uploads/') && API_ORIGIN) {
    return `${API_ORIGIN}${url}`;
  }
  return url;
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
