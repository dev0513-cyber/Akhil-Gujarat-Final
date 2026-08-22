let csrfTokenCache: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;
  
  try {
    const res = await fetch('/api/csrf');
    if (res.ok) {
      const data = await res.json();
      const token = data.csrfToken;
      if (token) {
        csrfTokenCache = token;
        return token;
      }
    }
  } catch {
    // Ignore errors, will retry on next request
  }
  return '';
}

export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getCsrfToken();
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('x-csrf-token', token);
  }
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

export function clearCsrfCache() {
  csrfTokenCache = null;
}