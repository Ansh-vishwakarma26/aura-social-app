// In dev: proxied to localhost:3001 by Vite
// In prod (same host): '/api' works directly
// In prod (separate hosts): set VITE_API_URL=https://your-backend.com/api
const BASE = import.meta.env.VITE_API_URL ?? '/api';

function getToken() {
  return localStorage.getItem('aura_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.message || message;
    } catch {
      // If response is not JSON, it might be a proxy error (e.g. backend server down)
      if (res.status === 500 || res.status === 504 || res.status === 502) {
        message = 'Server connection failed. Is the backend running?';
      } else {
        message = 'Request failed (Invalid response format)';
      }
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  get: <T>(ep: string) => request<T>(ep),
  post: <T>(ep: string, data?: unknown) =>
    request<T>(ep, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: <T>(ep: string, data?: unknown) =>
    request<T>(ep, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(ep: string) => request<T>(ep, { method: 'DELETE' }),
  upload: <T>(ep: string, form: FormData) => request<T>(ep, { method: 'POST', body: form }),
  uploadPut: <T>(ep: string, form: FormData) => request<T>(ep, { method: 'PUT', body: form }),
};

export function setToken(token: string) { localStorage.setItem('aura_token', token); }
export function clearToken() { localStorage.removeItem('aura_token'); }
