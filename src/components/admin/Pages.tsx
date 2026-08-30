"use client";
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { StaticPage } from '../../lib/types';
import { fetchPages, savePage } from '../../lib/api';
import { getErrorMessage } from '../../lib/format';
import { useAdminLang } from '../../contexts/AdminLangContext';
import { SuccessModal } from '../SuccessModal';
import { AlertModal } from '../AlertModal';

export default function Pages({ initialPages }: Readonly<{ initialPages: StaticPage[] }>) {
  const { data: items = [], error: loadError, isLoading: loading, mutate } = useSWR('pages', fetchPages, { fallbackData: initialPages, revalidateOnMount: false });
  const [active, setActive] = useState<StaticPage | null>(null);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const { t, lang } = useAdminLang();

  useEffect(() => {
    if (items.length > 0 && !active) {
      setTimeout(() => setActive(items[0]), 0);
    }
  }, [items, active]);

  const persist = async () => {
    if (!active) return;
    setError('');
    if (!active.title_gu.trim() || !active.content.trim()) {
      setError(t('શીર્ષક અને લખાણ જરૂરી છે.', 'Title and content are required.'));
      return;
    }
    setBusy(true);
    try {
      const updated = await savePage(active);
      setActive(updated);
      await mutate();
      setShowSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className={`text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>{t('લોડ થઈ રહ્યું છે...', 'Loading...')}</p>;

  return (
    <div className="max-w-4xl h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex-shrink-0">
        <h1 className="font-display text-3xl">{t('સ્ટેટિક પેજીસ', 'Static Pages')}</h1>
        <p className={`text-sm text-ink/50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
          {t('અમારા વિશે, ગોપનીયતા, નિયમો અને અસ્વીકરણ.', 'About Us, Privacy, Terms and Disclaimer.')}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {items.filter(p => p.slug !== 'contact').map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setActive(p);
                setError('');
              }}
              className={`px-3 py-1.5 text-sm border ${lang === 'gu' ? 'font-gujarati' : ''} ${active?.id === p.id ? 'bg-ink text-white border-ink' : 'bg-white border-rule'}`}
            >
              {lang === 'gu' ? p.title_gu : (p.title_en || p.title_gu)}
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div className="mt-5 bg-white border border-rule p-5 flex flex-col flex-1 min-h-0">
          <p className="text-xs text-ink/40 font-sans flex-shrink-0">/{active.slug}</p>
          <div className="pb-4 mb-4 border-b border-rule flex-shrink-0">
            <h2 className={`text-xl font-bold text-ink ${lang === 'gu' ? 'font-gujarati' : ''}`}>
              {active.title_gu} {active.title_en ? <span className="text-base text-ink/50 font-sans ml-2">({active.title_en})</span> : null}
            </h2>
          </div>
          <label className="flex flex-col flex-1 min-h-0 text-sm font-bold text-ink mb-2">
            <span className="flex-shrink-0">{t('લખાણ (Content)', 'Content')}</span>
            <textarea
              value={active.content}
              onChange={(e) => setActive({ ...active, content: e.target.value })}
              className="mt-2 w-full flex-1 min-h-0 border border-rule p-4 text-base font-gujarati leading-relaxed focus:outline-none focus:border-ink/30 rounded resize-none"
            />
          </label>
          <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-rule flex-shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={persist}
              className="bg-ink text-white px-4 py-2 text-sm font-semibold rounded hover:bg-ink/90 disabled:opacity-50"
            >
              {t('સેવ કરો', 'Save Page')}
            </button>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={showSuccess}
        title={t('સફળતા', 'Success')}
        message={t('પેજ સફળતાપૂર્વક સાચવવામાં આવ્યું.', 'Page saved successfully.')}
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
