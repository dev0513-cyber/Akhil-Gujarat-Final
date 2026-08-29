"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { slugify, getErrorMessage, translateText } from '../../lib/format';
import { useAdminLang } from '../../contexts/AdminLangContext';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { SuccessModal } from '../SuccessModal';
import { AlertModal } from '../AlertModal';

interface TaxonomyItem {
  id?: number;
  name_en: string;
  name_gu: string;
  slug: string;
  sort_order?: number;
  description?: string | null;
}

interface TaxonomyManagerProps<T extends TaxonomyItem> {
  cacheKey: string;
  fetcher: () => Promise<T[]>;
  saver: (item: Partial<T>) => Promise<T>;
  deleter: (id: number) => Promise<void>;
  titleEn: string;
  titleGu: string;
  descriptionEn: string;
  descriptionGu: string;
  hasDescriptionField?: boolean;
  initialData?: T[];
}

export function TaxonomyManager<T extends TaxonomyItem>({
  cacheKey,
  fetcher,
  saver,
  deleter,
  titleEn,
  titleGu,
  descriptionEn,
  descriptionGu,
  hasDescriptionField = false,
  initialData = [],
}: TaxonomyManagerProps<T>) {
  const { data: items = [], error: loadError, isLoading: loading, mutate } = useSWR<T[]>(cacheKey, fetcher, { fallbackData: initialData, revalidateOnMount: false });
  const [editing, setEditing] = useState<Partial<T>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { t, lang } = useAdminLang();

  const enInputRef = useRef<HTMLInputElement>(null);
  const guInputRef = useRef<HTMLInputElement>(null);

  // Live sync: English → Gujarati (auto-fill while typing, no blur needed)
  useEffect(() => {
    const en = (editing.name_en || '').trim();
    const gu = (editing.name_gu || '').trim();
    if (!en || gu) return;

    const t = setTimeout(async () => {
      if (document.activeElement === guInputRef.current) return;
      const translated = await translateText(en, 'en', 'gu');
      if (document.activeElement === guInputRef.current) return;
      setEditing((p) => (p.name_en?.trim() === en ? { ...p, name_gu: translated } : p));
    }, 500);
    return () => clearTimeout(t);
  }, [editing.name_en, editing.name_gu]);

  // Live sync: Gujarati → English
  useEffect(() => {
    const en = (editing.name_en || '').trim();
    const gu = (editing.name_gu || '').trim();
    if (!gu || en) return;

    const t = setTimeout(async () => {
      if (document.activeElement === enInputRef.current) return;
      const translated = await translateText(gu, 'gu', 'en');
      if (document.activeElement === enInputRef.current) return;
      setEditing((p) =>
        p.name_gu?.trim() === gu ? { ...p, name_en: translated, slug: p.slug || slugify(translated) } : p
      );
    }, 500);
    return () => clearTimeout(t);
  }, [editing.name_gu, editing.name_en]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!editing.name_en?.trim() || !editing.name_gu?.trim()) {
      setError(t('અંગ્રેજી અને ગુજરાતી નામ જરૂરી છે.', 'English and Gujarati names are required.'));
      return;
    }
    setBusy(true);
    try {
      await saver({
        ...editing,
        slug: editing.slug || slugify(editing.name_en),
        sort_order: editing.id ? Number(editing.sort_order) : items.length + 1,
      });
      setEditing({});
      await mutate();
      setShowSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  const remove = (c: T) => {
    setDeleteTarget(c);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !deleteTarget.id) return;
    setBusyId(deleteTarget.id);
    try {
      await deleter(deleteTarget.id);
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setBusyId(null);
    }
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    setBusy(true);
    try {
      const current = items[index];
      const neighbor = items[newIndex];
      
      const currentOrder = current.sort_order || index + 1;
      const neighborOrder = neighbor.sort_order || newIndex + 1;
      
      const finalCurrentOrder = currentOrder === neighborOrder ? newIndex + 1 : neighborOrder;
      const finalNeighborOrder = currentOrder === neighborOrder ? index + 1 : currentOrder;

      await Promise.all([
        saver({ ...current, sort_order: finalCurrentOrder }),
        saver({ ...neighbor, sort_order: finalNeighborOrder })
      ]);

      await mutate();
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">{t(titleGu, titleEn)}</h1>
      <p className={`text-sm text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
        {t(descriptionGu, descriptionEn)}
      </p>

      <form onSubmit={onSubmit} className="mt-5 bg-white border border-rule p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          ref={enInputRef}
          placeholder="English Name"
          value={editing.name_en || ''}
          onChange={(e) => {
            const value = e.target.value;
            setEditing((p) => ({
              ...p,
              name_en: value,
              // English emptied → clear Gujarati instantly
              name_gu: value.trim() ? p.name_gu : '',
              slug: p.id ? p.slug : slugify(value),
            }));
          }}
          className="border border-rule px-3 py-2 text-sm"
        />
        <input
          ref={guInputRef}
          placeholder={t('ગુજરાતી નામ', 'Gujarati Name')}
          value={editing.name_gu || ''}
          onChange={(e) => {
            const value = e.target.value;
            setEditing((p) => ({
              ...p,
              name_gu: value,
              // Gujarati emptied → clear English + slug instantly
              name_en: value.trim() ? p.name_en : '',
              slug: p.id ? p.slug : slugify(p.name_en || ''),
            }));
          }}
          className="border border-rule px-3 py-2 text-sm font-gujarati"
        />
        {hasDescriptionField && (
          <div className="md:col-span-2">
            <textarea
              placeholder={t('વર્ણન (વૈકલ્પિક)', 'Description (Optional)')}
              value={editing.description || ''}
              onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="border border-rule px-3 py-2 text-sm w-full font-gujarati"
            />
          </div>
        )}
        <div className="md:col-span-2 flex gap-2 pt-2 border-t border-rule mt-2">
          <button type="submit" disabled={busy} className="px-5 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors shadow-sm font-bold tracking-wide disabled:opacity-50">
            {editing.id ? t('અપડેટ', 'Update') : t('ઉમેરો', 'Add')}
          </button>
          {editing.id && (
            <button type="button" onClick={() => setEditing({})} className="px-3 py-1 bg-gray-200 text-ink text-xs rounded hover:bg-gray-300 transition-colors shadow-sm font-semibold tracking-wide disabled:opacity-50">
              {t('રદ', 'Cancel')}
            </button>
          )}
        </div>
      </form>

      {loading && <p className={`mt-6 text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>{t('લોડ થઈ રહ્યું છે...', 'Loading...')}</p>}
      <ul className="mt-6 bg-white border border-rule divide-y divide-rule/60">
        {items.map((c, index) => (
          <li key={c.id} className="px-4 py-3 flex items-center justify-between gap-3 group hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <button 
                  type="button" 
                  disabled={busy || index === 0} 
                  onClick={() => moveItem(index, 'up')}
                  className="p-1 bg-gray-50 text-ink/70 border border-rule rounded hover:bg-gray-200 hover:text-ink transition-colors shadow-sm disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowUp size={14} />
                </button>
                <button 
                  type="button" 
                  disabled={busy || index === items.length - 1} 
                  onClick={() => moveItem(index, 'down')}
                  className="p-1 bg-gray-50 text-ink/70 border border-rule rounded hover:bg-gray-200 hover:text-ink transition-colors shadow-sm disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <div>
                <div className="font-display">{c.name_gu}</div>
                <div className="text-xs text-ink/45 font-sans">
                  {c.name_en} {c.slug ? `· /${c.slug}` : ''}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(c)} className="px-3 py-1 bg-ink text-white text-xs rounded hover:bg-ink/80 transition-colors shadow-sm font-semibold tracking-wide">
                {t('સંપાદન', 'Edit')}
              </button>
              <button type="button" onClick={() => remove(c)} className="px-3 py-1 bg-red-50 text-crimson border border-red-200 text-xs rounded hover:bg-red-100 transition-colors shadow-sm font-semibold tracking-wide">
                {t('ડિલીટ', 'Delete')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={t(`${titleGu} કાઢી નાખો`, `Delete ${titleEn}`)}
        message={t(
          `શું તમે ખરેખર "${deleteTarget?.name_gu}" કાઢી નાખવા માંગો છો? આ ક્રિયા ઉલટાવી શકાતી નથી.`,
          `Are you sure you want to delete "${deleteTarget?.name_en}"? This action cannot be undone.`
        )}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={busyId === deleteTarget?.id}
      />

      <SuccessModal
        isOpen={showSuccess}
        title={t('સફળતા', 'Success')}
        message={t('સફળતાપૂર્વક સાચવવામાં આવ્યું.', 'Saved successfully.')}
        onConfirm={() => setShowSuccess(false)}
      />

      <AlertModal
        isOpen={!!error || !!loadError}
        message={error || (loadError ? getErrorMessage(loadError, t) : '')}
        onConfirm={() => setError('')}
      />
    </div>
  );
}
