"use client";
import type { SiteSetting } from '../../lib/types';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetchSettings, saveSettings } from '../../lib/api';
import { Save, AlertCircle } from 'lucide-react';
import { useAdminLang } from '../../contexts/AdminLangContext';
import { SuccessModal } from '../SuccessModal';

export default function Settings({ initialSettings }: Readonly<{ initialSettings: SiteSetting[] }>) {
  const [links, setLinks] = useState({
    facebook_url: '',
    instagram_url: '',
    youtube_url: '',
  });
  const { data: settingsData, error: loadError, isLoading: loading, mutate } = useSWR('settings', fetchSettings, { fallbackData: initialSettings, revalidateOnMount: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { t, lang } = useAdminLang();

  useEffect(() => {
    if (settingsData) {
      const newLinks = {
        facebook_url: '',
        instagram_url: '',
        youtube_url: '',
      };
      settingsData.forEach((s) => {
        if (s.key in newLinks) {
          newLinks[s.key as keyof typeof newLinks] = s.value;
        }
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinks(newLinks);
    }
  }, [settingsData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await saveSettings(links);
      await mutate();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('સેટિંગ્સ સેવ કરવામાં ભૂલ', 'Error saving settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display">{t('સેટિંગ્સ', 'Settings')}</h1>
        <p className={`text-sm text-ink/60 mt-1 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
          {t('સાઇટના સામાન્ય સેટિંગ્સ અને સોશિયલ મીડિયા લિંક્સ મેનેજ કરો.', 'Manage general site settings and social media links.')}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 flex items-center gap-3">
          <AlertCircle size={18} />
          <span className={`text-sm ${lang === 'gu' ? 'font-gujarati' : ''}`}>{error}</span>
        </div>
      )}
      
      {loadError && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 flex items-center gap-3">
          <AlertCircle size={18} />
          <span className={`text-sm ${lang === 'gu' ? 'font-gujarati' : ''}`}>{loadError instanceof Error ? loadError.message : t('લોડ ન થયું', 'Failed to load')}</span>
        </div>
      )}
      


      {loading ? (
        <div className={`py-10 text-center text-ink/40 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
          {t('લોડ થઈ રહ્યું છે...', 'Loading...')}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-rule p-6 space-y-6">
          <h2 className={`text-lg font-bold border-b border-rule pb-2 mb-4 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
            {t('સોશિયલ મીડિયા લિંક્સ', 'Social Media Links')}
          </h2>
          
          <div>
            <label htmlFor="facebook_url" className="block text-sm font-semibold mb-1">Facebook URL</label>
            <input
              id="facebook_url"
              type="url"
              className="w-full border border-rule px-3 py-2 text-sm focus:outline-none focus:border-crimson"
              value={links.facebook_url}
              onChange={(e) => setLinks({ ...links, facebook_url: e.target.value })}
              placeholder="https://facebook.com/..."
            />
          </div>

          <div>
            <label htmlFor="instagram_url" className="block text-sm font-semibold mb-1">Instagram URL</label>
            <input
              id="instagram_url"
              type="url"
              className="w-full border border-rule px-3 py-2 text-sm focus:outline-none focus:border-crimson"
              value={links.instagram_url}
              onChange={(e) => setLinks({ ...links, instagram_url: e.target.value })}
              placeholder="https://instagram.com/..."
            />
          </div>

          <div>
            <label htmlFor="youtube_url" className="block text-sm font-semibold mb-1">YouTube URL</label>
            <input
              id="youtube_url"
              type="url"
              className="w-full border border-rule px-3 py-2 text-sm focus:outline-none focus:border-crimson"
              value={links.youtube_url}
              onChange={(e) => setLinks({ ...links, youtube_url: e.target.value })}
              placeholder="https://youtube.com/..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-crimson text-white px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? t('સેવિંગ...', 'Saving...') : t('સેવ કરો', 'Save Settings')}
          </button>
        </form>
      )}

      <SuccessModal
        isOpen={success}
        title={t('સફળતા', 'Success')}
        message={t('સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવ્યા.', 'Settings saved successfully.')}
        onConfirm={() => setSuccess(false)}
      />
    </div>
  );
}
