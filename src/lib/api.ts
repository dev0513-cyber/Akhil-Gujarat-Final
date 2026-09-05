import { createClient } from '../utils/supabase/client';
import type { Article, Category, City, StaticPage, SiteSetting, EPaper, Ad } from './types';
import { adminFetch } from './api-client';

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data?.error) || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchArticles(
  params: Record<string, string | number | undefined> = {}
): Promise<Article[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  if (params.status === 'all') {
    const headers = await authHeaders();
    const res = await adminFetch(`/api/articles?${qs.toString()}`, { headers });
    return readJson<Article[]>(res);
  }
  const res = await fetch(`/api/articles?${qs.toString()}`);
  return readJson<Article[]>(res);
}

export async function fetchArticle(slugOrId: { slug?: string; id?: number | string }): Promise<Article> {
  const qs = new URLSearchParams();
  if (slugOrId.id) qs.set('id', String(slugOrId.id));
  if (slugOrId.slug) qs.set('slug', slugOrId.slug);
  const headers = await authHeaders();
  const res = await adminFetch(`/api/articles?${qs.toString()}`, { headers });
  return readJson<Article>(res);
}

export async function saveArticle(payload: Partial<Article> & Record<string, unknown>): Promise<Article> {
  const res = await adminFetch('/api/articles', {
    method: payload.id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  return readJson<Article>(res);
}

export async function deleteArticle(id: number): Promise<void> {
  const res = await adminFetch('/api/articles', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}

export async function fetchAdminStats(): Promise<{ published: number; drafts: number; archived: number; videos: number }> {
  const headers = await authHeaders();
  const res = await adminFetch('/api/admin/stats', { headers });
  return readJson(res);
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories');
  return readJson<Category[]>(res);
}

export async function saveCategory(payload: Partial<Category>): Promise<Category> {
  const res = await adminFetch('/api/categories', {
    method: payload.id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  return readJson<Category>(res);
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await adminFetch('/api/categories', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}

export async function fetchCities(): Promise<City[]> {
  const res = await fetch('/api/cities');
  return readJson<City[]>(res);
}

export async function saveCity(payload: Partial<City>): Promise<City> {
  const res = await adminFetch('/api/cities', {
    method: payload.id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  return readJson<City>(res);
}

export async function deleteCity(id: number): Promise<void> {
  const res = await adminFetch('/api/cities', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}

export async function fetchPages(): Promise<StaticPage[]> {
  const res = await fetch('/api/pages');
  return readJson<StaticPage[]>(res);
}

export async function savePage(payload: Partial<StaticPage>): Promise<StaticPage> {
  const res = await adminFetch('/api/pages', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return readJson<StaticPage>(res);
}

export async function uploadFile(file: File): Promise<string> {
  const token = await (await import('./api-client')).getCsrfToken();
  
  if (file.type === 'application/pdf') {
    const res = await fetch('/api/upload-url', {
      method: 'POST',
      headers: {
        'x-csrf-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
    });
    const data = await readJson<{ uploadUrl: string; publicUrl: string }>(res);
    
    const putRes = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });
    
    if (!putRes.ok) {
      throw new Error(`Direct upload failed: ${putRes.statusText}`);
    }
    
    return data.publicUrl;
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'x-csrf-token': token,
    },
    body: formData,
    credentials: 'include',
  });
  
  const data = await readJson<{ url: string }>(res);
  return data.url;
}

export async function fetchSettings(): Promise<SiteSetting[]> {
  const res = await fetch('/api/settings');
  return readJson<SiteSetting[]>(res);
}

export async function saveSettings(payload: Record<string, string>): Promise<SiteSetting[]> {
  const res = await adminFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return readJson<SiteSetting[]>(res);
}

export async function fetchEPapers(params: { month?: number; year?: number; date?: string; admin?: boolean } = {}): Promise<EPaper[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && k !== 'admin') qs.set(k, String(v));
  });
  let url = '/api/epapers';
  if (qs.toString()) url += `?${qs.toString()}`;
  
  if (params.admin) {
    const res = await adminFetch(url);
    return readJson<EPaper[]>(res);
  } else {
    const res = await fetch(url);
    return readJson<EPaper[]>(res);
  }
}

export async function saveEPaper(payload: Partial<EPaper>): Promise<EPaper> {
  const res = await adminFetch('/api/epapers', {
    method: payload.id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  return readJson<EPaper>(res);
}

export async function deleteEPaper(id: number): Promise<void> {
  const res = await adminFetch('/api/epapers', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}

export async function fetchAds(params: Record<string, string | number | undefined> = {}): Promise<Ad[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  let url = '/api/ads';
  if (qs.toString()) url += `?${qs.toString()}`;
  const res = await fetch(url);
  return readJson<Ad[]>(res);
}

export async function saveAd(payload: Partial<Ad>): Promise<Ad> {
  const res = await adminFetch('/api/ads', {
    method: payload.id ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });
  return readJson<Ad>(res);
}

export async function deleteAd(id: string): Promise<void> {
  const res = await adminFetch('/api/ads', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}