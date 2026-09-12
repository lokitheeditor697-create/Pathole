// Automatically resolves API Base URL:
// In unified Express + Vite mode, API endpoints are served from the same server (relative root '')
export const API_BASE = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : '';
