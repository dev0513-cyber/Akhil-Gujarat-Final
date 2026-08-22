"use client";

import { useState, useEffect } from 'react';

import useSWR from 'swr';
import Link from 'next/link';
import { FileText, Newspaper, Video, Plus } from 'lucide-react';

import { fetchArticles } from '../../lib/api';
import { formatDateTimeGu, getErrorMessage } from '../../lib/format';
import { useAdminLang } from '../../contexts/AdminLangContext';

import { AlertModal } from '../AlertModal';

export default function Dashboard() {
  const { t, lang } = useAdminLang();
  const [dismissedError, setDismissedError] = useState(false);
  
  const { data: articles = [], error, isLoading: loading } = useSWR(
    ['articles', 'all', 100],
    ([, status, limit]) => fetchArticles({ status, limit: Number(limit) })
  );

  const published = articles.filter((a) => a.status === 'published');
  const drafts = articles.filter((a) => a.status === 'draft');
  const archived = articles.filter((a) => a.status === 'archived');
  const videos = articles.filter((a) => a.video_url);

  useEffect(() => {
    if (error) setDismissedError(false);
  }, [error]);

  return (
    <div>
      <h1 className="font-display text-3xl">{t('ડેશબોર્ડ', 'Dashboard')}</h1>
      <p className={`text-sm text-ink/50 mb-6 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
        {t('અહીં તમને તમારી વેબસાઇટનો સંક્ષિપ્ત અહેવાલ મળશે.', 'Here you will find a brief report of your website.')}
      </p>
      {loading && <p className={`mt-8 text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>{t('લોડ થઈ રહ્યું છે...', 'Loading...')}</p>}

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat icon={Newspaper} label={t('પ્રકાશિત', 'Published')} value={published.length} lang={lang} />
        <Stat icon={FileText} label={t('ડ્રાફ્ટ', 'Draft')} value={drafts.length} lang={lang} />
        <Stat icon={Video} label={t('વિડિયો', 'Videos')} value={videos.length} lang={lang} />
      </div>

      <div className="mt-8 flex gap-3">
        <Link href="/admin/articles/new" className="bg-crimson text-white px-4 py-2 text-sm flex items-center gap-2">
          <Plus size={16} />
          {t('નવી રિપોર્ટ', 'New Report')}
        </Link>
        <Link href="/admin/articles" className="border border-rule bg-white px-4 py-2 text-sm">
          {t('બધા સમાચાર', 'All News')}
        </Link>
      </div>

      <h2 className="font-display text-xl mt-10 mb-3">{t('તાજેતરની એન્ટ્રીઓ', 'Recent Entries')}</h2>
      <div className="bg-white border border-rule overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-paper-dark text-left text-xs uppercase tracking-wider text-ink/55">
            <tr>
              <th className="px-3 py-2">{t('શીર્ષક', 'Title')}</th>
              <th className="px-3 py-2">{t('સ્થિતિ', 'Status')}</th>
              <th className="px-3 py-2">{t('તારીખ', 'Date')}</th>
            </tr>
          </thead>
          <tbody>
            {articles.slice(0, 8).map((a) => (
              <tr key={a.id} className="border-t border-rule/60">
                <td className="px-3 py-2 font-gujarati">
                  <Link href={`/admin/articles/${a.id}`} className="hover:text-crimson">
                    {a.headline}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={a.status} t={t} />
                </td>
                <td className="px-3 py-2 text-ink/50 whitespace-nowrap font-gujarati">
                  {formatDateTimeGu(a.published_at || a.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink/40">{archived.length} {t('આર્કાઇવ્ડ આઇટમ', 'Archived Items')}</p>
      <AlertModal
        isOpen={!!error && !dismissedError}
        message={error ? getErrorMessage(error, t) : ''}
        onConfirm={() => setDismissedError(true)}
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  lang,
}: Readonly<{
  icon: typeof Newspaper;
  label: string;
  value: number;
  lang: string;
}>) {
  return (
    <div className="bg-white border border-rule p-4">
      <Icon size={16} className="text-crimson" />
      <div className="font-display text-3xl mt-2">{value}</div>
      <div className={`text-xs text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>{label}</div>
    </div>
  );
}

function StatusPill({ status, t }: Readonly<{ status: string; t: (gu: string, en: string) => string }>) {
  const map: Record<string, string> = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-amber-100 text-amber-800',
    archived: 'bg-stone-200 text-stone-700',
  };
  const label: Record<string, string> = {
    published: t('પ્રકાશિત', 'Published'),
    draft: t('ડ્રાફ્ટ', 'Draft'),
    archived: t('આર્કાઇવ', 'Archived'),
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 ${map[status] || 'bg-stone-100'}`}>
      {label[status] || status}
    </span>
  );
}
