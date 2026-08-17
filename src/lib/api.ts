import { createClient } from '../utils/supabase/client';
import type { Article, Category, City, StaticPage, SiteSetting, EPaper } from './types';

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
  const headers = params.status === 'all' ? await authHeaders() : undefined;
  const res = await fetch(`/api/articles?${qs.toString()}`, headers ? { headers } : undefined);
  return readJson<Article[]>(res);
}

export async function fetchArticle(slugOrId: { slug?: string; id?: number | string }): Promise<Article> {
  const qs = new URLSearchParams();
  if (slugOrId.id) qs.set('id', String(slugOrId.id));
  if (slugOrId.slug) qs.set('slug', slugOrId.slug);
  const res = await fetch(`/api/articles?${qs.toString()}`, { headers: await authHeaders() });
  return readJson<Article>(res);
}

export async function saveArticle(payload: Partial<Article> & Record<string, unknown>): Promise<Article> {
  const headers = await authHeaders();
  const isUpdate = Boolean(payload.id);
  const res = await fetch('/api/articles', {
    method: isUpdate ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return readJson<Article>(res);
}

export async function deleteArticle(id: number): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch('/api/articles', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories');
  return readJson<Category[]>(res);
}

export async function saveCategory(payload: Partial<Category>): Promise<Category> {
  const headers = await authHeaders();
  const res = await fetch('/api/categories', {
    method: payload.id ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return readJson<Category>(res);
}

export async function deleteCategory(id: number): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch('/api/categories', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}

export async function fetchCities(): Promise<City[]> {
  const res = await fetch('/api/cities');
  return readJson<City[]>(res);
}

export async function saveCity(payload: Partial<City>): Promise<City> {
  const headers = await authHeaders();
  const res = await fetch('/api/cities', {
    method: payload.id ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return readJson<City>(res);
}

export async function deleteCity(id: number): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch('/api/cities', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}

export async function fetchPages(): Promise<StaticPage[]> {
  const res = await fetch('/api/pages');
  return readJson<StaticPage[]>(res);
}

export async function savePage(payload: Partial<StaticPage>): Promise<StaticPage> {
  const headers = await authHeaders();
  const res = await fetch('/api/pages', {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  return readJson<StaticPage>(res);
}

export async function uploadFile(file: File): Promise<string> {
  const headers = await authHeaders();
  delete headers['Content-Type']; // Browser handles the boundary automatically for FormData

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers,
    body: formData,
  });
  
  const data = await readJson<{ url: string }>(res);
  return data.url;
}

export async function fetchSettings(): Promise<SiteSetting[]> {
  const res = await fetch('/api/settings');
  return readJson<SiteSetting[]>(res);
}

export async function saveSettings(payload: Record<string, string>): Promise<SiteSetting[]> {
  const headers = await authHeaders();
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  return readJson<SiteSetting[]>(res);
}

export async function fetchEPapers(params: { month?: number; year?: number; date?: string } = {}): Promise<EPaper[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) qs.set(k, String(v));
  });
  let url = '/api/epapers';
  if (qs.toString()) url += `?${qs.toString()}`;
  const res = await fetch(url);
  return readJson<EPaper[]>(res);
}

export async function saveEPaper(payload: Partial<EPaper>): Promise<EPaper> {
  const headers = await authHeaders();
  const res = await fetch('/api/epapers', {
    method: payload.id ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return readJson<EPaper>(res);
}

export async function deleteEPaper(id: number): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch('/api/epapers', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ id }),
  });
  await readJson(res);
}
