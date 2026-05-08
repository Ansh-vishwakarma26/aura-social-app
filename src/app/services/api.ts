// Connected to local backend: http://localhost:3001/api
const API_URL = import.meta.env.VITE_API_URL;

function getToken() {
  return localStorage.getItem('aura_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const url = `${API_URL}${endpoint}`;

  // Abort after 15 seconds so the app never hangs indefinitely
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Please check your connection.');
    throw new Error('Network error. Is the server running?');
  } finally {
    clearTimeout(timeout);
  }

  // Auto-clear stale token on 401 (expired / invalid JWT)
  if (res.status === 401) {
    localStorage.removeItem('aura_token');
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.message || message;
    } catch {
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
