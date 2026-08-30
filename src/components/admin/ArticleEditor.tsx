/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertModal } from '../AlertModal';
import { Image as ImageIcon, Plus } from 'lucide-react';
import type { Article, Category, City } from '../../lib/types';
import { fetchArticle, fetchCategories, fetchCities, saveArticle, uploadFile, deleteArticle } from '../../lib/api';
import { slugify, getErrorMessage } from '../../lib/format';
import { useAdminLang } from '../../contexts/AdminLangContext';
import { SuccessModal } from '../SuccessModal';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

type FormState = {
  headline: string;
  description: string;
  content: string;
  image_url: string;
  extra_images: string[];
  category_id: string;
  city_id: string;
  tags: string;
  source: string;
  seo_title: string;
  seo_description: string;
  slug: string;
  video_url: string;
  status: string;
  is_trending: boolean;
  author: string;
  published_at: string;
};

const empty: FormState = {
  headline: '',
  description: '',
  content: '',
  image_url: '',
  extra_images: [],
  category_id: '',
  city_id: '',
  tags: '',
  source: 'અખિલ ગુજરાત',
  seo_title: '',
  seo_description: '',
  slug: '',
  video_url: '',
  status: 'draft',
  is_trending: false,
  author: 'Shailesh Parmar',
  published_at: '',
};

function fromArticle(a: Article): FormState {
  return {
    headline: a.headline || '',
    description: a.description || '',
    content: a.content || '',
    image_url: a.image_url || '',
    extra_images: a.extra_images || [],
    category_id: a.category_id ? String(a.category_id) : '',
    city_id: a.city_id ? String(a.city_id) : '',
    tags: a.tags || '',
    source: a.source || 'અખિલ ગુજરાત',
    seo_title: a.seo_title || '',
    seo_description: a.seo_description || '',
    slug: a.slug || '',
    video_url: a.video_url || '',
    status: a.status || 'draft',
    is_trending: Boolean(a.is_trending),
    author: a.author || 'Shailesh Parmar',
    published_at: a.published_at || '',
  };
}

function Field({ label, children, lang }: Readonly<{ label: string; children: ReactNode; lang: string }>) {
  return (
    <label className={`block text-xs text-ink/55 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
      {label}
      {children}
    </label>
  );
}

function updateFormState(prev: FormState, key: keyof FormState, value: FormState[keyof FormState], isNew: boolean): FormState {
  const next = { ...prev, [key]: value };
  if (key === 'headline' && !(!isNew)) {
    const s = slugify(String(value));
    next.slug = s || `news-${Date.now()}`;
  }
  if (key === 'headline' && !prev.seo_title) next.seo_title = String(value);
  if (key === 'description' && !prev.seo_description) next.seo_description = String(value);
  return next;
}

function validateArticleForm(form: FormState, t: (gu: string, en: string) => string): Record<string, string> {
  const next: Record<string, string> = {};
  if (!form.headline.trim()) next.headline = t('શીર્ષક જરૂરી છે', 'Headline is required');
  if (!form.description.trim()) next.description = t('વર્ણન જરૂરી છે', 'Description is required');
  if (!form.content.trim()) next.content = t('સમાચાર જરૂરી છે', 'Content is required');
  if (!form.slug.trim()) next.slug = t('SEO URL / slug જરૂરી છે', 'SEO URL / slug is required');
  if (!form.image_url) next.image_url = t('કવર ફોટો જરૂરી છે', 'Cover photo is required');
  if (!form.category_id) next.category_id = t('વિભાગ પસંદ કરો', 'Please select a category');
  return next;
}

function prepareArticlePayload(form: FormState, cats: Category[], id: string | undefined, isNew: boolean, status: string): Partial<Article> {
  const autoTags = form.headline.split(' ').slice(0, 5).join(', ') + ', ' + (cats.find(c => String(c.id) === form.category_id)?.name_gu || '');
  
  const payload: Partial<Article> & Record<string, unknown> = {
    ...form,
    status,
    image_url: form.image_url || null,
    extra_images: form.extra_images,
    video_url: form.video_url || null,
    seo_title: form.seo_title || null,
    seo_description: form.seo_description || null,
    source: form.source || 'અખિલ ગુજરાત',
    tags: form.tags || autoTags,
    category_id: Number(form.category_id),
    city_id: form.city_id ? Number(form.city_id) : null,
  };
  delete payload.published_at; // server controls publish time
  if (!isNew && id) payload.id = Number(id);
  return payload;
}

function loadDraft(key: string): FormState | null {
  const localDraft = localStorage.getItem(key);
  if (localDraft) {
    try {
      return JSON.parse(localDraft);
    } catch {
      return null;
    }
  }
  return null;
}

function useArticleEditorData(id: string | undefined, isNew: boolean) {
  const [form, setForm] = useState<FormState>(empty);
  const [cats, setCats] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [articleError, setArticleError] = useState<unknown>(null);
  const [catsError, setCatsError] = useState<unknown>(null);
  const [citiesError, setCitiesError] = useState<unknown>(null);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    fetchCategories().then(setCats).catch(setCatsError);
    fetchCities().then(setCities).catch(setCitiesError);

    const draftKey = `article_draft_${id || 'new'}`;
    const draft = loadDraft(draftKey);

    if (!isNew && id) {
      fetchArticle({ id })
        .then((a) => {
          const apiForm = fromArticle(a);
          setTimeout(() => {
            if (draft) {
              setForm(draft);
              setIsDraftRestored(true);
            } else {
              setForm(apiForm);
            }
          }, 0);
        })
        .catch(setArticleError)
        .finally(() => setLoading(false));
    } else {
      setTimeout(() => {
        if (draft) {
          setForm(draft);
          setIsDraftRestored(true);
        }
        setLoading(false);
      }, 0);
    }
  }, [id, isNew]);

  useEffect(() => {
    if (!loading && JSON.stringify(form) !== JSON.stringify(empty)) {
      localStorage.setItem(`article_draft_${id || 'new'}`, JSON.stringify(form));
    }
  }, [form, loading, id]);

  return { form, setForm, cats, cities, loading, articleError, catsError, citiesError, isDraftRestored };
}

export default function ArticleEditor() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const isNew = !id;
  
  const { form, setForm, cats, cities, loading, articleError, catsError, citiesError, isDraftRestored } = useArticleEditorData(id, isNew);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const { t, lang } = useAdminLang();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => updateFormState(prev, key, value, isNew));
  };

  const onUpload = async (file: File, isExtra = false) => {
    setUploading(true);
    setError('');
    try {
      const url = await uploadFile(file);
      if (isExtra) {
        setForm((prev) => ({ ...prev, extra_images: [...prev.extra_images, url] }));
      } else {
        set('image_url', url);
      }
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const next = validateArticleForm(form, t);
    if (Object.keys(next).length > 0) {
      const errList = Object.values(next).join(' \n• ');
      setError(t('કૃપા કરીને નીચેની ભૂલો સુધારો', 'Please correct the following errors') + ':\n\n• ' + errList);
      return false;
    }
    return true;
  };

  const submit = async (status: string) => {
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = prepareArticlePayload(form, cats, id, isNew, status);
      await saveArticle(payload);
      localStorage.removeItem(`article_draft_${id || 'new'}`);
      setShowSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(form.status || 'draft');
  };

  const handleDelete = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await deleteArticle(Number(id));
      localStorage.removeItem(`article_draft_${id || 'new'}`);
      router.push('/admin/articles');
    } catch (err) {
      setError(getErrorMessage(err, t));
      setBusy(false);
      setShowDeleteConfirm(false);
    }
  };

  const loadError = articleError || catsError || citiesError;

  if (loading) return <p className={`p-5 text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>{t('લોડ થઈ રહ્યું છે...', 'Loading...')}</p>;
  if (loadError) return <p className="p-5 text-crimson">{getErrorMessage(loadError, t)}</p>;

  return (
    <form onSubmit={onSubmit} className="max-w-4xl">
      <SuccessModal isOpen={showSuccess} title={t('સફળતા', 'Success')} message={t('સમાચાર સેવ થઈ ગયા', 'Article saved successfully')} onConfirm={() => router.push('/admin/articles')} />
      <AlertModal isOpen={!!error} message={error} onConfirm={() => setError('')} />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{isNew ? t('નવી રિપોર્ટ', 'New Report') : t('સમાચાર સંપાદન', 'Edit News')}</h1>
        {isDraftRestored && (
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(`article_draft_${id || 'new'}`);
              window.location.reload();
            }}
            className={`text-xs bg-red-100 text-crimson px-3 py-1.5 rounded font-bold hover:bg-red-200 transition-colors shadow-sm ${lang === 'gu' ? 'font-gujarati' : ''}`}
          >
            {t('ડ્રાફ્ટ કાઢી નાખો', 'Discard Unsaved Draft')}
          </button>
        )}
      </div>
      <p className={`text-sm text-ink/50 mt-1 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
        {t('ગુજરાતી શીર્ષક, વર્ણન, ફોટો, અને પ્રકાશન સ્થિતિ.', 'Gujarati headline, description, photo, and publishing status.')}
      </p>

      <fieldset className="mt-6 space-y-4 bg-white border border-rule p-5">
        <legend className="px-3 py-1 text-sm font-bold tracking-wider uppercase text-ink bg-gray-50 border border-rule rounded shadow-sm">{t('મૂળ સમાચાર', 'Core Content')}</legend>
        <Field label={t('ગુજરાતી શીર્ષક', 'Gujarati Headline')} lang={lang}>
          <input
            value={form.headline}
            onChange={(e) => set('headline', e.target.value)}
            className="mt-1 w-full border border-rule px-3 py-2 text-sm outline-none focus:border-crimson bg-white font-gujarati"
          />
        </Field>
        <Field label={t('સંક્ષિપ્ત વર્ણન', 'Short Description')} lang={lang}>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            className="mt-1 w-full border border-rule px-3 py-2 text-sm outline-none focus:border-crimson bg-white font-gujarati"
          />
        </Field>
        <Field label={t('સંપૂર્ણ સમાચાર', 'Full News Content')} lang={lang}>
          <textarea
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            rows={10}
            className="mt-1 w-full border border-rule px-3 py-2 text-sm outline-none focus:border-crimson bg-white font-gujarati"
          />
        </Field>
      </fieldset>

      <fieldset className="mt-5 space-y-6 bg-white border border-rule p-6">
        <legend className="px-3 py-1 text-sm font-bold tracking-wider uppercase text-ink bg-gray-50 border border-rule rounded shadow-sm">{t('મીડિયા', 'Media')}</legend>
        
        <div>
          <label htmlFor="main-photo-upload" className={`block font-bold text-ink mb-3 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
            {t('મુખ્ય ફોટો', 'Main Photo')}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
            {/* Upload Box */}
            <button
              type="button"
              onDragOver={e => { e.preventDefault(); setIsDraggingPhoto(true); }}
              onDragLeave={() => setIsDraggingPhoto(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDraggingPhoto(false);
                if (e.dataTransfer.files?.[0]) {
                  const file = e.dataTransfer.files[0];
                  if (file.type.startsWith('image/')) onUpload(file);
                }
              }}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer relative min-h-[160px] flex flex-col justify-center items-center w-full
                ${isDraggingPhoto ? 'border-crimson bg-red-50' : 'border-rule bg-gray-50 hover:bg-gray-100'}
              `}
              onClick={() => document.getElementById('main-photo-upload')?.click()}
            >
              <input 
                id="main-photo-upload"
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={e => {
                  if (e.target.files?.[0]) onUpload(e.target.files[0]);
                }}
              />
              
              {form.image_url?.includes('supabase') ? (
                <div className="flex flex-col items-center">
                  <img src={form.image_url} alt="Article main preview" className="h-24 object-cover rounded shadow mb-3" />
                  <span className="font-semibold text-ink text-sm max-w-full truncate px-2">{t('ફોટો અપલોડ થયો', 'Photo uploaded')}</span>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); set('image_url', ''); }}
                    className={`mt-3 px-4 py-1.5 text-xs font-bold text-red-500 border border-red-500 rounded hover:bg-red-50 transition-colors ${lang === 'gu' ? 'font-gujarati' : ''}`}
                  >
                    {t('રદ કરો (Remove Photo)', 'Remove Photo')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-ink/60">
                  {uploading ? (
                    <span className={`text-ink/60 font-bold ${lang === 'gu' ? 'font-gujarati' : ''}`}>
                      {t('અપલોડ થઈ રહ્યું છે...', 'Uploading...')}
                    </span>
                  ) : (
                    <>
                      <ImageIcon size={32} className="mb-3 text-ink/40" />
                      <p className={`font-semibold text-ink text-sm mb-1 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
                        {t('ફોટો અહીં ખેંચો અથવા ક્લિક કરો', 'Drag & drop image here or click to browse')}
                      </p>
                    </>
                  )}
                </div>
              )}
            </button>

            {/* Divider */}
            <div className="hidden md:flex flex-col items-center justify-center">
              <div className="h-10 w-px bg-rule/80"></div>
              <div className="py-2 text-xs font-bold text-ink/40">OR</div>
              <div className="h-10 w-px bg-rule/80"></div>
            </div>

            {/* URL Box */}
            <div className="bg-gray-50 border border-rule border-dashed p-6 rounded flex flex-col justify-center relative min-h-[160px] group transition-colors hover:border-crimson/50">
              {form.image_url && !form.image_url.includes('supabase') ? (
                <div className="flex flex-col items-center">
                  <img src={form.image_url} alt="Article main preview" className="h-32 object-cover rounded shadow mb-2" />
                  <button type="button" onClick={() => set('image_url', '')} className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold shadow opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">×</button>
                </div>
              ) : (
                <div className="w-full">
                  <label className={`block text-sm font-bold text-ink/60 mb-2 text-center ${lang === 'gu' ? 'font-gujarati' : ''}`}>{t('ઇમેજ URL દાખલ કરો', 'Enter Image URL')}</label>
                  <input value={(!form.image_url || form.image_url.includes('supabase')) ? '' : form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://..." className="w-full border border-rule px-4 py-3 outline-none focus:border-crimson bg-white text-center rounded" />
                </div>
              )}
            </div>
          </div>

          {/* Extra Photos Gallery - Locked until main photo is uploaded */}
          <div className="mt-8 pt-6 border-t border-rule/50">
            <label className={`block font-bold text-ink mb-3 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
              {t('વધારાના ફોટા (ગેલેરી)', 'Extra Photos (Gallery)')}
            </label>
            {!form.image_url ? (
              <div className={`p-4 bg-gray-50 border border-rule border-dashed rounded text-center text-ink/60 text-sm ${lang === 'gu' ? 'font-gujarati' : ''}`}>
                {t('વધારાના ફોટા ઉમેરવા પહેલાં મુખ્ય કવર ફોટો અપલોડ કરો.', 'Please upload the main cover photo first before adding extra photos.')}
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap gap-3 mb-4">
                  {form.extra_images.map((src) => (
                    <div key={src} className="relative group">
                      <img src={src} alt="" className="h-20 w-32 object-cover rounded shadow-sm border border-rule" />
                      <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-sm font-bold shadow opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10" onClick={() => setForm((p) => ({ ...p, extra_images: p.extra_images.filter((x) => x !== src) }))}>×</button>
                    </div>
                  ))}
                </div>
                <div className="relative inline-block">
                  <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], true)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="Upload extra photo" />
                  <div className={`px-5 py-2 text-sm font-bold bg-white text-ink/80 border border-rule rounded shadow-sm hover:bg-gray-50 hover:border-ink/30 transition-colors cursor-pointer ${lang === 'gu' ? 'font-gujarati' : ''}`}>
                    + {t('વધુ ફોટા ઉમેરો', 'Add Extra Photos (Max 3MB)')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-rule/50 pt-6">
          <label className={`block font-bold text-ink mb-3 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
            {t('વિડિયો લિંક (વૈકલ્પિક)', 'Video Link (Optional)')}
          </label>
          <input
            value={form.video_url}
            onChange={(e) => set('video_url', e.target.value)}
            placeholder="https://youtube.com/... or any link"
            className="w-full border border-rule px-4 py-3 outline-none focus:border-crimson bg-white rounded"
          />
        </div>
      </fieldset>

      <fieldset className="mt-5 space-y-4 bg-white border border-rule p-5">
        <legend className="px-3 py-1 text-sm font-bold tracking-wider uppercase text-ink bg-gray-50 border border-rule rounded shadow-sm">{t('વર્ગીકરણ', 'Categorization')}</legend>
        
        <Field label={t('વિભાગ', 'Category')} lang={lang}>
          <div className="mt-3 flex flex-wrap gap-2">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => set('category_id', String(c.id))}
                className={`px-4 py-2 text-sm rounded-full border transition-colors font-bold shadow-sm ${form.category_id === String(c.id) ? 'bg-crimson text-white border-crimson' : 'bg-white text-ink/70 border-rule hover:bg-gray-50'}`}
              >
                {lang === 'gu' ? c.name_gu : c.name_en}
              </button>
            ))}
            <Link
              href="/admin/categories"
              className={`px-4 py-2 text-sm rounded-full border border-dashed border-ink/30 text-ink/60 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1 ${lang === 'gu' ? 'font-gujarati' : ''}`}
            >
              <Plus size={14} /> {t('વધુ ઉમેરો', 'Add more')}
            </Link>
          </div>
        </Field>

        <div className="pt-4 mt-4 border-t border-rule/50">
          <Field label={t('શહેર (વૈકલ્પિક)', 'City (Optional)')} lang={lang}>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => set('city_id', '')}
                className={`px-4 py-2 text-sm rounded-full border transition-colors font-bold shadow-sm ${!form.city_id ? 'bg-ink text-white border-ink' : 'bg-white text-ink/70 border-rule hover:bg-gray-50'}`}
              >
                {t('કોઈ નહીં', 'None')}
              </button>
              {cities.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set('city_id', String(c.id))}
                  className={`px-4 py-2 text-sm rounded-full border transition-colors font-bold shadow-sm ${form.city_id === String(c.id) ? 'bg-ink text-white border-ink' : 'bg-white text-ink/70 border-rule hover:bg-gray-50'}`}
                >
                  {lang === 'gu' ? c.name_gu : c.name_en}
                </button>
              ))}
              <Link
                href="/admin/cities"
                className={`px-4 py-2 text-sm rounded-full border border-dashed border-ink/30 text-ink/60 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1 ${lang === 'gu' ? 'font-gujarati' : ''}`}
              >
                <Plus size={14} /> {t('વધુ ઉમેરો', 'Add more')}
              </Link>
            </div>
          </Field>
        </div>

        <div className="pt-2 mt-5">
          <button 
            type="button" 
            role="switch"
            aria-checked={form.is_trending}
            className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${form.is_trending ? 'bg-red-50 border-crimson/30 shadow-sm' : 'bg-gray-50 border-rule/60 hover:bg-gray-100'}`} 
            onClick={() => set('is_trending', !form.is_trending)}
          >
            <div className="text-left">
              <div className={`font-bold flex items-center gap-2 ${form.is_trending ? 'text-crimson' : 'text-ink/70'} ${lang === 'gu' ? 'font-gujarati' : ''}`}>
                <span className="text-lg">{form.is_trending ? '⭐' : '☆'}</span> 
                {t('ટ્રેન્ડિંગ / ટોપ ન્યૂઝ', 'Trending / Top News')}
              </div>
              <div className={`text-xs mt-1 ${form.is_trending ? 'text-crimson/70' : 'text-ink/50'} ${lang === 'gu' ? 'font-gujarati' : ''}`}>
                {t('આ સમાચારને હોમપેજ પર હાઇલાઇટ કરો', 'Highlight this news on the homepage')}
              </div>
            </div>
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_trending ? 'bg-crimson' : 'bg-ink/20'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${form.is_trending ? 'translate-x-5' : 'translate-x-1'}`} style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
            </div>
          </button>
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('draft')}
          className={`border border-rule bg-white px-4 py-2 text-sm disabled:opacity-50 ${lang === 'gu' ? 'font-gujarati' : ''}`}
        >
          {t('ડ્રાફ્ટ સેવ કરો', 'Save Draft')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('published')}
          className={`bg-crimson text-white px-4 py-2 text-sm disabled:opacity-50 ${lang === 'gu' ? 'font-gujarati' : ''}`}
        >
          {t('પ્રકાશિત કરો', 'Publish')}
        </button>
        {!isNew && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => submit('archived')}
              className={`border border-rule px-4 py-2 text-sm text-ink/60 disabled:opacity-50 ${lang === 'gu' ? 'font-gujarati' : ''}`}
            >
              {t('આર્કાઇવ', 'Archive')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowDeleteConfirm(true)}
              className={`bg-red-500 text-white px-4 py-2 text-sm hover:bg-red-600 transition-colors disabled:opacity-50 ${lang === 'gu' ? 'font-gujarati' : ''}`}
            >
              {t('ડિલીટ', 'Delete')}
            </button>
          </>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        title={t('સમાચાર કાઢી નાખો', 'Delete Article')}
        message={t(
          `શું તમે ખરેખર આ સમાચાર કાઢી નાખવા માંગો છો? આ ક્રિયા ઉલટાવી શકાતી નથી.`,
          `Are you sure you want to delete this article? This action cannot be undone.`
        )}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDeleting={busy}
      />
    </form>
  );
}
