// Automatically resolves API Base URL:
// In unified Express + Vite mode, API endpoints are served from relative root ''
// In dual-host mode (e.g. Vercel frontend + Render backend), VITE_API_BASE_URL points to the backend URL.
const rawBase = import.meta.env.VITE_API_BASE_URL;
export const API_BASE = rawBase ? rawBase.replace(/\/+$/, '') : '';
