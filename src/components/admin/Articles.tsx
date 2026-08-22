"use client";
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import type { Article } from '../../lib/types';
import { deleteArticle, fetchArticles, saveArticle, fetchArticle } from '../../lib/api';
import { formatDateTime, getErrorMessage } from '../../lib/format';
import { useAdminLang } from '../../contexts/AdminLangContext';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { AlertModal } from '../AlertModal';
import { SuccessModal } from '../SuccessModal';

export default function Articles() {
  const { data: items = [], error, isLoading: loading, mutate } = useSWR(
    ['articles', 'all', 100],
    ([, status, limit]) => fetchArticles({ status, limit: Number(limit) })
  );
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [dismissedError, setDismissedError] = useState(false);
  const { t, lang } = useAdminLang();

  const FILTERS = [
    { id: 'all', label: t('બધા', 'All') },
    { id: 'published', label: t('પ્રકાશિત', 'Published') },
    { id: 'draft', label: t('ડ્રાફ્ટ', 'Draft') },
    { id: 'archived', label: t('આર્કાઇવ', 'Archived') },
  ];



  const visible = useMemo(() => {
    return items.filter((a) => {
      if (filter !== 'all' && a.status !== filter) return false;
      if (q && !`${a.headline} ${a.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, q]);

  // Reset dismissedError when SWR error changes
  useMemo(() => {
    if (error) setDismissedError(false);
  }, [error]);

  const setStatus = async (article: Article, status: string) => {
    setBusyId(article.id);
    try {
      const fullArticle = await fetchArticle({ id: article.id });
      await saveArticle({
        ...fullArticle,
        status,
      });
      await mutate();
      setSuccessMessage(
        status === 'published' 
          ? t('આર્ટિકલ સફળતાપૂર્વક પ્રકાશિત કરવામાં આવ્યો.', 'Article published successfully.') 
          : status === 'archived'
            ? t('આર્ટિકલ આર્કાઇવ કરવામાં આવ્યો.', 'Article archived successfully.')
            : t('આર્ટિકલ ડ્રાફ્ટમાં ખસેડવામાં આવ્યો.', 'Article moved to draft.')
      );
      setShowSuccess(true);
    } catch (err) {
      setAlertMessage(getErrorMessage(err, t));
    } finally {
      setBusyId(null);
    }
  };

  const remove = (article: Article) => {
    setDeleteTarget(article);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteArticle(deleteTarget.id);
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      setAlertMessage(getErrorMessage(err, t));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">{t('સમાચાર વ્યવસ્થાપન', 'Article Management')}</h1>
          <p className={`text-sm text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
            {t('સંપાદન, પ્રકાશન, અનપબ્લિશ અને આર્કાઇવ', 'Edit, publish, unpublish, and archive')}
          </p>
        </div>
        <Link href="/admin/articles/new" className="bg-crimson text-white px-4 py-2 text-sm">
          + {t('નવી રિપોર્ટ', 'New Report')}
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 items-center">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-sm border ${filter === f.id ? 'bg-ink text-white border-ink' : 'bg-white border-rule'}`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('શોધો...', 'Search...')}
          className="ml-auto border border-rule bg-white px-3 py-1.5 text-sm"
        />
      </div>

      {loading && <p className={`mt-8 text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>{t('લોડ થઈ રહ્યું છે...', 'Loading...')}</p>}

      <div className="mt-4 bg-white border border-rule overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-paper-dark text-left text-xs uppercase tracking-wider text-ink/55">
            <tr>
              <th className="px-3 py-2">{t('શીર્ષક', 'Title')}</th>
              <th className="px-3 py-2">{t('વિભાગ', 'Category')}</th>
              <th className="px-3 py-2 text-center">{t('પ્રકાશિત', 'Publish')}</th>
              <th className="px-3 py-2 text-center">{t('આર્કાઇવ', 'Archive')}</th>
              <th className="px-3 py-2">{t('તારીખ', 'Date')}</th>
              <th className="px-3 py-2 text-right">{t('ક્રિયા', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={a.id} className="border-t border-rule/60 align-top">
                <td className="px-3 py-3 font-gujarati">
                  <Link href={`/admin/articles/${a.id}`} className="hover:text-crimson font-medium">
                    {a.headline}
                  </Link>
                  <div className="text-[11px] text-ink/40 mt-0.5 font-sans">/{a.slug}</div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap font-gujarati">
                  {lang === 'en' ? (a.category?.slug || '—') : (a.category?.name_gu || '—')}
                </td>
                <td className="px-3 py-3 text-center align-middle">
                  <Toggle 
                    checked={a.status === 'published'} 
                    onChange={() => setStatus(a, a.status === 'published' ? 'draft' : 'published')} 
                    disabled={busyId === a.id || a.status === 'archived'} 
                    colorClass="bg-green-500"
                  />
                </td>
                <td className="px-3 py-3 text-center align-middle">
                  <Toggle 
                    checked={a.status === 'archived'} 
                    onChange={() => setStatus(a, a.status === 'archived' ? 'draft' : 'archived')} 
                    disabled={busyId === a.id} 
                    colorClass="bg-stone-500"
                  />
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-ink/50 font-sans">
                  {formatDateTime(a.published_at || a.created_at, lang)}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Link href={`/admin/articles/${a.id}`} className="px-3 py-1 bg-ink text-white text-xs rounded hover:bg-ink/80 transition-colors shadow-sm font-semibold tracking-wide">
                      {t('સંપાદન', 'Edit')}
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => remove(a)}
                      className="px-3 py-1 bg-red-50 text-crimson border border-red-200 text-xs rounded hover:bg-red-100 transition-colors disabled:opacity-40 shadow-sm font-semibold tracking-wide"
                    >
                      {t('ડિલીટ', 'Delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-ink/45 font-gujarati">
                  {t('કોઈ સમાચાર નથી.', 'No articles found.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={t('સમાચાર કાઢી નાખો', 'Delete Article')}
        message={t(
          `શું તમે ખરેખર "${deleteTarget?.headline}" કાઢી નાખવા માંગો છો? આ ક્રિયા ઉલટાવી શકાતી નથી.`,
          `Are you sure you want to delete "${deleteTarget?.headline}"? This action cannot be undone.`
        )}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={busyId === deleteTarget?.id}
      />

      <AlertModal
        isOpen={!!alertMessage || (!!error && !dismissedError)}
        message={alertMessage || (error ? getErrorMessage(error, t) : '')}
        onConfirm={() => {
          setAlertMessage('');
          if (error) setDismissedError(true);
        }}
      />

      <SuccessModal
        isOpen={showSuccess}
        title={t('સફળતા', 'Success')}
        message={successMessage}
        onConfirm={() => setShowSuccess(false)}
      />
    </div>
  );
}

function Toggle({ checked, onChange, disabled, colorClass = 'bg-green-500' }: Readonly<{ checked: boolean, onChange: () => void, disabled: boolean, colorClass?: string }>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? colorClass : 'bg-ink/20'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
    </button>
  );
}
