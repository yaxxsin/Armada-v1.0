const BASE = '/api';

type ApiOptions = RequestInit & {
  headers?: HeadersInit;
};

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]+)/);
  return match ? match[1] : '';
}

export async function api(path: string, options: ApiOptions = {}): Promise<any> {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('X-CSRF-Token', getCsrfToken());
  }

  const requestOptions: RequestInit = { ...options };
  delete requestOptions.headers;
  const response = await fetch(BASE + path, {
    ...requestOptions,
    credentials: 'include',
    headers,
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Sesi berakhir. Silakan login kembali.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(data.details)
      ? data.details.map((item) => `${item.field || 'data'}: ${item.message || 'tidak valid'}`).join(' · ')
      : '';
    throw new Error([data.error || 'Permintaan gagal.', details].filter(Boolean).join(' — '));
  }
  return data;
}

export const apiPost = (path: string, body?: unknown) =>
  api(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPut = (path: string, body?: unknown) =>
  api(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = (path: string) => api(path, { method: 'DELETE' });
