"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { Plus, Upload, Image as ImageIcon, Link2 } from 'lucide-react';
import { fetchAds, saveAd, deleteAd, uploadFile } from '../../lib/api';
import type { Ad } from '../../lib/types';
import { AD_SLOTS, AD_FRAMES, getAdFrame } from '../../lib/ads';
import { useAdminLang } from '../../contexts/AdminLangContext';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { SuccessModal } from '../SuccessModal';
import { AlertModal } from '../AlertModal';

const emptyForm = { title: '', image_url: '', link_url: '', slot: AD_SLOTS[0].key, frame: 'banner', is_active: true };

type AdForm = { title: string; image_url: string; link_url: string; slot: string; frame: string; is_active: boolean };

function useAdsData(initialAds: Ad[]) {
  const { data: ads = [], mutate } = useSWR(['ads'], fetchAds, { fallbackData: initialAds, revalidateOnMount: false });
  return { ads, mutate };
}

function useAdForm(mutate: () => Promise<unknown>, t: (g: string, e: string) => string) {
  const [form, setForm] = useState<AdForm>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const startCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const startEdit = (ad: Ad) => {
    setForm({ title: ad.title, image_url: ad.image_url, link_url: ad.link_url, slot: ad.slot, frame: ad.frame ?? 'banner', is_active: ad.is_active });
    setEditingId(ad.id);
    setImageFile(null);
    setImagePreview(ad.image_url);
    setShowForm(true);
  };

  const handleImageSelection = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      setAlertMessage(t('શીર્ષક જરૂરી છે', 'Title is required'));
      return;
    }
    setUploading(true);
    try {
      let imageUrl = form.image_url;
      if (imageFile) imageUrl = await uploadFile(imageFile);
      await saveAd({ id: editingId || undefined, title: form.title, image_url: imageUrl, link_url: form.link_url, slot: form.slot, frame: form.frame, is_active: form.is_active });
      await mutate();
      setShowForm(false);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setAlertMessage(t('સાચવવામાં નિષ્ફળ', 'Failed to save'));
    } finally {
      setUploading(false);
    }
  };

  return { form, setForm, imagePreview, setImagePreview, setImageFile, uploading, showForm, setShowForm, showSuccess, setShowSuccess, alertMessage, setAlertMessage, startCreate, startEdit, handleImageSelection, handleSubmit, editingId };
}

function useAdDelete(mutate: () => Promise<unknown>, t: (g: string, e: string) => string, setAlertMessage: (m: string) => void) {
  const [deleteTarget, setDeleteTarget] = useState<Ad | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setBusyId(deleteTarget.id);
    try {
      await deleteAd(deleteTarget.id);
      await mutate();
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setAlertMessage(t('કાઢવામાં નિષ્ફળ', 'Failed to delete'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
      setBusyId(null);
    }
  };

  return { deleteTarget, setDeleteTarget, deleting, busyId, handleDelete };
}

export default function AdminAds({ initialAds }: Readonly<{ initialAds: Ad[] }>) {
  const { t, lang } = useAdminLang();
  const { ads, mutate } = useAdsData(initialAds);
  
  const { form, setForm, imagePreview, setImagePreview, setImageFile, uploading, showForm, setShowForm, showSuccess, setShowSuccess, alertMessage, setAlertMessage, startCreate, startEdit, handleImageSelection, handleSubmit, editingId } = useAdForm(mutate, t);
  const { deleteTarget, setDeleteTarget, deleting, busyId, handleDelete } = useAdDelete(mutate, t, setAlertMessage);

  const gu = lang === 'gu';

  const slotLabel = (slotKey: string) => {
    const s = AD_SLOTS.find((x) => x.key === slotKey);
    if (!s) return slotKey;
    return gu ? s.labelGu : s.labelEn;
  };

  const frameLabel = (frameKey: string) => {
    const frame = getAdFrame(frameKey);
    if (!frame) return '—';
    return gu ? frame.labelGu : frame.labelEn;
  };

  const handleToggle = async (ad: Ad) => {
    try {
      await saveAd({ ...ad, is_active: !ad.is_active });
      await mutate();
    } catch (err) {
      console.error(err);
      setAlertMessage(t('અપડેટ કરવામાં નિષ્ફળ', 'Failed to update'));
    }
  };

  const inputCls = `mt-1 w-full border border-rule px-3 py-2 text-sm outline-none focus:border-crimson bg-white ${gu ? 'font-gujarati' : ''}`;

  return (
    <div className={gu ? 'font-gujarati' : ''}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">{t('જાહેરાત મેનેજમેન્ટ', 'Manage Ads')}</h1>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-2 bg-ink text-white px-4 py-2 text-sm font-bold rounded hover:bg-ink/90 transition-colors"
        >
          <Plus size={16} /> {t('નવી જાહેરાત', 'New Ad')}
        </button>
      </div>

      {ads.length === 0 ? (
        <p className="text-ink/50 py-10 text-center">{t('હજુ કોઈ જાહેરાત નથી.', 'No ads yet.')}</p>
      ) : (
        <div className="bg-white border border-rule overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-ink/50 border-b border-rule">
                <th className="px-4 py-3">{t('ફોટો', 'Image')}</th>
                <th className="px-4 py-3">{t('શીર્ષક', 'Title')}</th>
                <th className="px-4 py-3">{t('સ્લોટ', 'Slot')}</th>
                <th className="px-4 py-3">{t('ફ્રેમ', 'Frame')}</th>
                <th className="px-4 py-3">{t('લિંક', 'Link')}</th>
                <th className="px-4 py-3">{t('સક્રિય', 'Active')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad: Ad) => (
                <tr key={ad.id} className="border-b border-rule/50 last:border-0">
                  <td className="px-4 py-2">
                    {ad.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.image_url} alt="" className="h-12 w-28 object-cover rounded border border-rule/50" />
                    ) : (
                      <span className="text-ink/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-semibold">{ad.title}</td>
                  <td className="px-4 py-2 text-ink/60">{slotLabel(ad.slot)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {frameLabel(ad.frame)}
                  </td>
                  <td className="px-4 py-2 text-ink/60 max-w-[180px] truncate">
                    {ad.link_url ? (
                      <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="hover:text-crimson">
                        {ad.link_url}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ad.is_active}
                      onClick={() => handleToggle(ad)}
                      className={`w-10 h-5 rounded-full transition-colors ${ad.is_active ? 'bg-crimson' : 'bg-ink/15'}`}
                    >
                      <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${ad.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <button type="button" onClick={() => startEdit(ad)} className="px-3 py-1 bg-ink text-white text-xs rounded hover:bg-ink/80 transition-colors shadow-sm font-semibold tracking-wide">
                        {t('સંપાદન', 'Edit')}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === ad.id}
                        onClick={() => setDeleteTarget(ad)}
                        className="px-3 py-1 bg-red-50 text-crimson border border-red-200 text-xs rounded hover:bg-red-100 transition-colors disabled:opacity-40 shadow-sm font-semibold tracking-wide"
                      >
                        {t('ડિલીટ', 'Delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10">
          <form onSubmit={handleSubmit} className="bg-white border border-rule rounded-lg shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-5">
              {editingId ? t('જાહેરાત સંપાદિત કરો', 'Edit Ad') : t('નવી જાહેરાત', 'New Ad')}
            </h2>

            <label className="block text-sm font-bold text-ink mb-4">
              {t('શીર્ષક', 'Title')}
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
                placeholder={t('જાહેરાતનું નામ (દેખાતું નથી)', 'Ad label (not shown publicly)')}
              />
            </label>

            <label className="block text-sm font-bold text-ink mb-4">
              {t('જાહેરાતનો ફોટો', 'Ad Image')}
              {imagePreview ? (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="" className="h-28 w-full object-cover rounded border border-rule mb-2" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null); setForm({ ...form, image_url: '' }); }}
                    className="px-3 py-1 text-xs font-bold text-red-500 border border-red-500 rounded hover:bg-red-50"
                  >
                    {t('ફોટો બદલો', 'Change photo')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('ad-image-upload')?.click()}
                  className="mt-2 w-full border-2 border-dashed border-rule p-6 flex flex-col items-center gap-2 hover:border-crimson transition-colors"
                >
                  <ImageIcon size={28} className="text-ink/40" />
                  <span className="text-sm text-ink/50">{t('ફોટો પસંદ કરો', 'Select image')}</span>
                </button>
              )}
              <input
                id="ad-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelection(f); }}
              />
            </label>

            <label className="block text-sm font-bold text-ink mb-4">
              {t('લિંક URL (ક્લિક કરવા પર ખુલે)', 'Link URL (opens on click)')}
              <div className="relative mt-1">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                <input
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  className={`${inputCls} pl-8`}
                  placeholder={t('વૈકલ્પિક (ખાલી = નો ક્લિક)', 'Optional (blank = no click)')}
                />
              </div>
            </label>

            <label className="block text-sm font-bold text-ink mb-4">
              {t('સ્થાન (સ્લોટ)', 'Placement (slot)')}
              <select
                value={form.slot}
                onChange={(e) => setForm({ ...form, slot: e.target.value })}
                className={inputCls}
              >
                {AD_SLOTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {gu ? s.labelGu : s.labelEn}
                  </option>
                ))}
              </select>
            </label>

            <label className="block mb-5">
              <span className="text-sm font-bold text-ink">{t('ફ્રેમ', 'Frame')}</span>
              <select
                value={form.frame}
                onChange={(e) => setForm({ ...form, frame: e.target.value })}
                className={inputCls}
              >
                {AD_FRAMES.map((f) => (
                  <option key={f.key} value={f.key}>
                    {gu ? f.labelGu : f.labelEn}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm font-bold text-ink mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              {t('સક્રિય (સાઇટ પર બતાવો)', 'Active (show on site)')}
            </label>

            <div className="flex gap-3 justify-end pt-4 border-t border-rule">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-ink/60 hover:text-ink"
              >
                {t('રદ કરો', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 bg-crimson text-white px-5 py-2 text-sm font-bold rounded hover:bg-crimson/90 disabled:opacity-50"
              >
                {uploading ? <Upload size={15} className="animate-pulse" /> : null}
                {uploading ? t('અપલોડ થઈ રહ્યું છે...', 'Uploading...') : t('સાચવો', 'Save')}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title={t('જાહેરાત કાઢી નાખો?', 'Delete this ad?')}
        message={t(
          'શું તમે ખરેખર આ જાહેરાત કાઢી નાખવા માંગો છો? આ ક્રિયા ઉલટાવી શકાતી નથી.',
          'Are you sure you want to delete this ad? This action cannot be undone.'
        )}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={deleting}
      />
      <SuccessModal
        isOpen={showSuccess}
        title={t('સફળતા', 'Success')}
        message={t('જાહેરાત સફળતાપૂર્વક સેવ થઈ.', 'Ad saved successfully.')}
        onConfirm={() => setShowSuccess(false)}
      />
      <AlertModal isOpen={!!alertMessage} message={alertMessage} onConfirm={() => setAlertMessage('')} />
    </div>
  );
}