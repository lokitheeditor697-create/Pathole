// Automatically resolves API Base URL:
// In Vite dev mode (port 5173) -> points to local FastAPI http://127.0.0.1:8000
// In Docker / Production (served by FastAPI) -> uses relative URLs ('') so it works on any domain or port
export const API_BASE = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://127.0.0.1:8000' : '');
