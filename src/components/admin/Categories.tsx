"use client";
import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import type { Category } from '../../lib/types';
import { deleteCategory, fetchCategories, saveCategory } from '../../lib/api';
import { slugify, getErrorMessage, translateText } from '../../lib/format';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useAdminLang } from '../../contexts/AdminLangContext';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { SuccessModal } from '../SuccessModal';
import { AlertModal } from '../AlertModal';

export default function Categories() {
  const { data: items = [], error: loadError, isLoading: loading, mutate } = useSWR('categories', fetchCategories);
  const [editing, setEditing] = useState<Partial<Category>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { t, lang } = useAdminLang();

  const handleEnglishBlur = async () => {
    if (editing.name_en && !editing.name_gu) {
      const gu = await translateText(editing.name_en, 'en', 'gu');
      setEditing((p) => ({ ...p, name_gu: gu }));
    }
  };

  const handleGujaratiBlur = async () => {
    if (editing.name_gu && !editing.name_en) {
      const en = await translateText(editing.name_gu, 'gu', 'en');
      setEditing((p) => ({ ...p, name_en: en, slug: p.slug || slugify(en) }));
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!editing.name_en?.trim() || !editing.name_gu?.trim()) {
      setError(t('અંગ્રેજી અને ગુજરાતી નામ જરૂરી છે.', 'English and Gujarati names are required.'));
      return;
    }
    setBusy(true);
    try {
      await saveCategory({
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

  const remove = (c: Category) => {
    setDeleteTarget(c);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setBusyId(null);
    }
  };

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
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
        saveCategory({ ...current, sort_order: finalCurrentOrder }),
        saveCategory({ ...neighbor, sort_order: finalNeighborOrder })
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
      <h1 className="font-display text-3xl">{t('વિભાગો', 'Categories')}</h1>
      <p className={`text-sm text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
        {t('સમાચાર વર્ગીકરણ માટેની શ્રેણીઓ.', 'Categories for news classification.')}
      </p>

      <form onSubmit={onSubmit} className="mt-5 bg-white border border-rule p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          placeholder="English Name"
          value={editing.name_en || ''}
          onChange={(e) =>
            setEditing((p) => ({
              ...p,
              name_en: e.target.value,
              slug: p.id ? p.slug : slugify(e.target.value),
            }))
          }
          onBlur={handleEnglishBlur}
          className="border border-rule px-3 py-2 text-sm"
        />
        <input
          placeholder={t('ગુજરાતી નામ', 'Gujarati Name')}
          value={editing.name_gu || ''}
          onChange={(e) => setEditing((p) => ({ ...p, name_gu: e.target.value }))}
          onBlur={handleGujaratiBlur}
          className="border border-rule px-3 py-2 text-sm font-gujarati"
        />
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
                  onClick={() => moveCategory(index, 'up')}
                  className="p-1 bg-gray-50 text-ink/70 border border-rule rounded hover:bg-gray-200 hover:text-ink transition-colors shadow-sm disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowUp size={14} />
                </button>
                <button 
                  type="button" 
                  disabled={busy || index === items.length - 1} 
                  onClick={() => moveCategory(index, 'down')}
                  className="p-1 bg-gray-50 text-ink/70 border border-rule rounded hover:bg-gray-200 hover:text-ink transition-colors shadow-sm disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <div>
                <div className="font-display">{c.name_gu}</div>
                <div className="text-xs text-ink/45 font-sans">
                  {c.name_en} · /{c.slug}
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
        title={t('વિભાગ કાઢી નાખો', 'Delete Category')}
        message={t(
          `શું તમે ખરેખર વિભાગ "${deleteTarget?.name_gu}" કાઢી નાખવા માંગો છો? આ ક્રિયા ઉલટાવી શકાતી નથી.`,
          `Are you sure you want to delete the category "${deleteTarget?.name_en}"? This action cannot be undone.`
        )}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={busyId === deleteTarget?.id}
      />

      <SuccessModal
        isOpen={showSuccess}
        title={t('સફળતા', 'Success')}
        message={t('શ્રેણી સફળતાપૂર્વક સાચવવામાં આવી.', 'Category saved successfully.')}
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
