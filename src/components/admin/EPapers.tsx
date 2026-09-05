/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, Upload, FileText, Trash2, Calendar as CalendarIcon, ExternalLink, ChevronDown } from 'lucide-react';
import { fetchEPapers, saveEPaper, deleteEPaper, uploadFile } from '../../lib/api';
import type { EPaper } from '../../lib/types';
import { useAdminLang } from '../../contexts/AdminLangContext';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { SuccessModal } from '../SuccessModal';
import { AlertModal } from '../AlertModal';

async function generateThumbnail(file: File): Promise<{ thumbFile: File; thumbPreview: string }> {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerPort) {
    try {
      // Self-host the worker from the bundled module (same-origin, allowed by CSP)
      pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
        new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
        { type: 'module' }
      );
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context not available');
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  await page.render({ canvasContext: context, viewport, canvas: canvas as HTMLCanvasElement }).promise;
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const thumb = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
          resolve({ thumbFile: thumb, thumbPreview: URL.createObjectURL(blob) });
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/jpeg',
      0.8
    );
  });
}

function useEPaperData(initialEpapers: EPaper[], initialMonth: number, initialYear: number) {
  const [currentMonth, setCurrentMonth] = useState(new Date(initialYear, initialMonth - 1, 1));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const { data: monthEPapers = [], mutate } = useSWR(
    ['epapers', currentMonth.getMonth() + 1, currentMonth.getFullYear()],
    ([, month, year]) => fetchEPapers({ month: Number(month), year: Number(year) }),
    { 
      fallbackData: (currentMonth.getMonth() + 1 === initialMonth && currentMonth.getFullYear() === initialYear) 
        ? initialEpapers 
        : undefined,
      revalidateOnMount: false
    }
  );

  return { currentMonth, setCurrentMonth, selectedDate, setSelectedDate, monthEPapers, mutate };
}

function useEPaperUpload(selectedDate: string, mutate: () => Promise<unknown>, t: (g: string, e: string) => string, setShowSuccess: (s: boolean) => void, setAlertMessage: (m: string) => void) {
  const [title, setTitle] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePdfSelection = async (file: File) => {
    const MAX_SIZE = 35 * 1024 * 1024; // 35MB
    if (file.size > MAX_SIZE) {
      setAlertMessage(t('ફાઇલની સાઇઝ 35MB કરતાં ઓછી હોવી જોઈએ.', 'File size must be less than 35MB.'));
      return;
    }
    
    setPdfFile(file);
    try {
      setUploading(true);
      const { thumbFile: tf, thumbPreview: tp } = await generateThumbnail(file);
      setThumbFile(tf);
      setThumbPreview(tp);
    } catch (err) {
      console.error(err);
      setAlertMessage(t('કવર પેજ જનરેટ કરવામાં નિષ્ફળ', 'Failed to generate cover page'));
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !pdfFile) {
      setAlertMessage(t('શીર્ષક અને PDF જરૂરી છે', 'Title and PDF are required'));
      return;
    }
    setUploading(true);
    try {
      let thumbUrl = null;
      if (thumbFile) {
        thumbUrl = await uploadFile(thumbFile);
      }
      const pdfUrl = await uploadFile(pdfFile);
      
      await saveEPaper({
        published_date: selectedDate,
        title,
        pdf_url: pdfUrl,
        thumbnail_url: thumbUrl
      });
      await mutate();
      setPdfFile(null);
      setThumbFile(null);
      setThumbPreview(null);
      setShowSuccess(true);
    } catch(err) {
      setAlertMessage((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setPdfFile(null);
    setThumbFile(null);
    setThumbPreview(null);
  };

  return { title, setTitle, pdfFile, thumbPreview, uploading, handlePdfSelection, handleUpload, resetForm };
}

function useEPaperDelete(mutate: () => Promise<unknown>, t: (g: string, e: string) => string, setAlertMessage: (m: string) => void) {
  const [deleteTarget, setDeleteTarget] = useState<EPaper | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteEPaper(deleteTarget.id);
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      setAlertMessage(err instanceof Error ? (err as Error).message : t('ડિલીટ નિષ્ફળ', 'Delete failed'));
    } finally {
      setBusyId(null);
    }
  };

  return { deleteTarget, setDeleteTarget, busyId, confirmDelete };
}

// --- Sub-components to reduce AdminEPapers cognitive complexity ---

type CalendarGridProps = Readonly<{
  currentMonth: Date;
  monthEPapers: EPaper[];
  selectedDate: string;
  weekDays: string[];
  onSelectDate: (dateStr: string, title: string) => void;
}>;

function CalendarGrid({ currentMonth, monthEPapers, selectedDate, weekDays, onSelectDate }: CalendarGridProps) {
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekDays.map(d => <div key={d} className="text-sm font-semibold text-ink/50 py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => {
          const padDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - firstDay + 1);
          return <div key={`empty-${padDate.getFullYear()}-${padDate.getMonth()}-${padDate.getDate()}`} />;
        })}
        {days.map(day => {
          const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const hasEPaper = monthEPapers.some(e => e.published_date === dateStr);
          const isSelected = selectedDate === dateStr;
          const borderCls = hasEPaper && !isSelected ? 'border-2 border-crimson/50' : '';
          const colorCls = isSelected ? 'bg-crimson text-white shadow-md' : 'hover:bg-paper text-ink';
          return (
            <button type="button" key={day}
              onClick={() => onSelectDate(dateStr, `${dateStr} E-Paper`)}
              className={`aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all ${colorCls} ${borderCls}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </>
  );
}

type EPaperViewProps = Readonly<{
  epaper: EPaper;
  lang: string;
  t: (g: string, e: string) => string;
  onDelete: (ep: EPaper) => void;
}>;

function EPaperView({ epaper, lang, t, onDelete }: EPaperViewProps) {
  return (
    <div className="max-w-md mx-auto w-full">
      <div className="bg-white shadow-xl border border-rule/50 w-full aspect-[2/3] relative mb-8 overflow-hidden group">
        {epaper.thumbnail_url ? (
          <img src={epaper.thumbnail_url} alt={epaper.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-paper flex flex-col items-center justify-center text-ink/20">
            <FileText size={64} strokeWidth={1} className="mb-4" />
            <span className={`text-sm font-semibold ${lang === 'gu' ? 'font-gujarati' : ''}`}>
              {t('કવર પેજ ઉપલબ્ધ નથી', 'Cover page not available')}
            </span>
          </div>
        )}
        <div className="absolute inset-0 shadow-[inset_10px_0_20px_rgba(0,0,0,0.05)] pointer-events-none" />
      </div>
      <div className="text-center">
        <p className={`text-ink/60 mb-6 font-mono ${lang === 'gu' ? 'font-gujarati' : ''}`} suppressHydrationWarning>
          {t('અપલોડ:', 'Uploaded:')} {new Date(epaper.created_at).toLocaleString('en-IN')}
        </p>
        <div className="flex gap-4 justify-center">
          <a href={epaper.pdf_url} target="_blank" rel="noreferrer"
            className={`flex items-center gap-2 px-6 py-2 bg-crimson text-white rounded shadow hover:bg-crimson/90 transition-colors ${lang === 'gu' ? 'font-gujarati' : ''}`}
          >
            <ExternalLink size={18} /> {t('ઓપન PDF', 'Open PDF')}
          </a>
          <button type="button" onClick={() => onDelete(epaper)}
            className={`flex items-center gap-2 px-6 py-2 border border-red-500 text-red-500 rounded shadow hover:bg-red-50 transition-colors ${lang === 'gu' ? 'font-gujarati' : ''}`}
          >
            <Trash2 size={18} /> {t('ડિલીટ', 'Delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

type EPaperUploadFormProps = Readonly<{
  title: string;
  pdfFile: File | null;
  thumbPreview: string | null;
  uploading: boolean;
  isDragging: boolean;
  lang: string;
  t: (g: string, e: string) => string;
  setTitle: (v: string) => void;
  setIsDragging: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  handlePdfSelection: (f: File) => void;
  resetForm: () => void;
  handleUpload: (e: React.FormEvent) => void;
}>;

type PdfPreviewProps = Readonly<{
  pdfFile: File;
  thumbPreview: string | null;
  lang: string;
  t: (g: string, e: string) => string;
  resetForm: () => void;
}>;

function PdfPreview({ pdfFile, thumbPreview, lang, t, resetForm }: PdfPreviewProps) {
  return (
    <div className="flex flex-col items-center">
      {thumbPreview ? (
        <div className="mb-4 relative group">
          <img src={thumbPreview} alt="Cover Preview" className="h-40 object-contain shadow-md rounded" />
          <div className={`absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded text-sm ${lang === 'gu' ? 'font-gujarati' : ''}`}>
            {t('ફાઇલ બદલો', 'Change File')}
          </div>
        </div>
      ) : (
        <FileText size={48} className="text-crimson mb-4" />
      )}
      <span className="font-semibold text-ink">{pdfFile.name}</span>
      <span className={`text-sm text-ink/60 mt-1 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
        {t('કવર પેજ આપમેળે જનરેટ થયું છે', 'Cover page automatically generated')}
      </span>
      <button type="button" onClick={(e) => { e.stopPropagation(); resetForm(); }}
        className={`mt-4 px-4 py-1.5 text-sm font-bold text-red-500 border border-red-500 rounded hover:bg-red-50 transition-colors ${lang === 'gu' ? 'font-gujarati' : ''}`}>
        {t('રદ કરો (Remove PDF)', 'Remove PDF')}
      </button>
    </div>
  );
}

type PdfDropPlaceholderProps = Readonly<{
  lang: string;
  t: (g: string, e: string) => string;
}>;

function PdfDropPlaceholder({ lang, t }: PdfDropPlaceholderProps) {
  return (
    <div className="flex flex-col items-center text-ink/60">
      <Upload size={40} className="mb-4 text-ink/40" />
      <p className={`font-semibold text-ink mb-1 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
        {t('PDF ફાઇલ અહીં ખેંચો અથવા ક્લિક કરો', 'Drag & drop PDF here or click to browse')}
      </p>
      <p className={`text-xs ${lang === 'gu' ? 'font-gujarati' : ''}`}>
        {t('અમે આપમેળે પ્રથમ પૃષ્ઠને કવર ઇમેજ તરીકે લઈશું', 'We will automatically extract the first page as the cover image')}
      </p>
    </div>
  );
}

function EPaperUploadForm({ title, pdfFile, thumbPreview, uploading, isDragging, lang, t, setTitle, setIsDragging, onDrop, handlePdfSelection, resetForm, handleUpload }: EPaperUploadFormProps) {
  return (
    <form onSubmit={handleUpload} className="space-y-6 max-w-xl mx-auto w-full">
      <div>
        <label className={`block text-sm font-semibold mb-2 ${lang === 'gu' ? 'font-gujarati' : ''}`}>{t('શીર્ષક (Title)', 'Title')}</label>
        <input required value={title} onChange={e => setTitle(e.target.value)}
          className="w-full p-3 border border-rule rounded focus:outline-none focus:border-crimson bg-paper" />
      </div>
      <div>
        <label className={`block text-sm font-semibold mb-2 ${lang === 'gu' ? 'font-gujarati' : ''}`}>{t('PDF ફાઇલ', 'PDF File')}</label>
        <div
          role="button"
          tabIndex={0}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('pdf-upload')?.click(); }}
          className={`w-full border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${isDragging ? 'border-crimson bg-red-50' : 'border-rule bg-gray-50 hover:bg-gray-100'}`}
          onClick={() => document.getElementById('pdf-upload')?.click()}
        >
          <input id="pdf-upload" type="file" accept="application/pdf" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handlePdfSelection(e.target.files[0]); }} />
          {pdfFile ? (
            <PdfPreview pdfFile={pdfFile} thumbPreview={thumbPreview} lang={lang} t={t} resetForm={resetForm} />
          ) : (
            <PdfDropPlaceholder lang={lang} t={t} />
          )}
        </div>
      </div>
      <button type="submit" disabled={uploading || !pdfFile}
        className={`flex items-center justify-center gap-2 w-full py-4 mt-8 bg-ink text-white font-bold rounded hover:bg-ink/90 transition-colors disabled:opacity-50 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
        {uploading ? t('અપલોડ થઈ રહ્યું છે...', 'Uploading...') : <><Upload size={18} /> {t('ઈ-પેપર પબ્લિશ કરો', 'Publish E-Paper')}</>}
      </button>
    </form>
  );
}

export default function AdminEPapers({ 
  initialEpapers, 
  initialMonth, 
  initialYear 
}: Readonly<{ 
  initialEpapers: EPaper[]; 
  initialMonth: number; 
  initialYear: number; 
}>) {
  const { currentMonth, setCurrentMonth, selectedDate, setSelectedDate, monthEPapers, mutate } = useEPaperData(initialEpapers, initialMonth, initialYear);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const { t, lang } = useAdminLang();

  const { title, setTitle, pdfFile, thumbPreview, uploading, handlePdfSelection, handleUpload, resetForm } = useEPaperUpload(selectedDate, mutate, t, setShowSuccess, setAlertMessage);
  const { deleteTarget, setDeleteTarget, busyId, confirmDelete } = useEPaperDelete(mutate, t, setAlertMessage);

  const selectedEPaper = monthEPapers.find(e => e.published_date === selectedDate);

  const monthNamesGu = ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઓગસ્ટ", "સપ્ટેમ્બર", "ઓક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"];
  const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekDaysGu = ["રવિ", "સોમ", "મંગળ", "બુધ", "ગુરુ", "શુક્ર", "શનિ"];
  const weekDaysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthNames = lang === 'gu' ? monthNamesGu : monthNamesEn;
  const weekDays = lang === 'gu' ? weekDaysGu : weekDaysEn;

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf') {
      await handlePdfSelection(file);
    } else {
      setAlertMessage(t('ફક્ત PDF ફાઈલ અપલોડ કરો', 'Please upload a PDF file only'));
    }
  };

  const handleSelectDate = (dateStr: string, title: string) => {
    setSelectedDate(dateStr);
    setTitle(t(`${dateStr} ઈ-પેપર`, title));
    setShowMobileCalendar(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-ink mb-6">{t('મેનેજ ઈ-પેપર', 'Manage E-Papers')}</h1>
      
      <div className="flex flex-col lg:flex-row bg-white border border-rule shadow-sm">
        
        <div className="lg:hidden p-4 border-b border-rule bg-gray-50/50">
          <button type="button"
            onClick={() => setShowMobileCalendar(!showMobileCalendar)}
            className={`w-full flex items-center justify-between p-3 border border-rule bg-white rounded shadow-sm font-bold text-ink ${lang === 'gu' ? 'font-gujarati' : ''}`}
          >
            <span>{t(`${selectedDate} નું ઈ-પેપર`, `E-Paper for ${selectedDate}`)}</span>
            <ChevronDown size={20} className={`transform transition-transform ${showMobileCalendar ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className={`${showMobileCalendar ? 'block' : 'hidden'} lg:block w-full lg:w-1/3 bg-gray-50/50 p-6 border-b lg:border-b-0 lg:border-r border-rule`}>
          <div className="flex items-center justify-between mb-6">
            <button type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="p-2 hover:bg-paper rounded-full transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className={`text-lg font-bold ${lang === 'gu' ? 'font-gujarati' : ''}`}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="p-2 hover:bg-paper rounded-full transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <CalendarGrid
            currentMonth={currentMonth}
            monthEPapers={monthEPapers}
            selectedDate={selectedDate}
            weekDays={weekDays}
            onSelectDate={handleSelectDate}
          />
        </div>

        <div className="w-full lg:w-2/3 bg-white p-6 md:p-10 flex flex-col justify-center">
          <h2 className={`text-xl font-bold mb-8 flex items-center gap-2 border-b border-rule pb-4 ${lang === 'gu' ? 'font-gujarati' : ''}`}>
            <CalendarIcon size={20} className="text-crimson" />
            {t(`${selectedDate} નું ઈ-પેપર`, `E-Paper for ${selectedDate}`)}
          </h2>

          {selectedEPaper ? (
            <EPaperView epaper={selectedEPaper} lang={lang} t={t} onDelete={setDeleteTarget} />
          ) : (
            <EPaperUploadForm
              title={title}
              pdfFile={pdfFile}
              thumbPreview={thumbPreview}
              uploading={uploading}
              isDragging={isDragging}
              lang={lang}
              t={t}
              setTitle={setTitle}
              setIsDragging={setIsDragging}
              onDrop={onDrop}
              handlePdfSelection={handlePdfSelection}
              resetForm={resetForm}
              handleUpload={handleUpload}
            />
          )}
        </div>

      </div>
      
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title={t('ઈ-પેપર કાઢી નાખો', 'Delete E-Paper')}
        message={t(
          `શું તમે ખરેખર ${deleteTarget?.published_date || ''} નું ઈ-પેપર કાઢી નાખવા માંગો છો? આ ક્રિયા ઉલટાવી શકાતી નથી.`,
          `Are you sure you want to delete the E-Paper for ${deleteTarget?.published_date}? This action cannot be undone.`
        )}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={busyId === deleteTarget?.id}
      />

      <SuccessModal
        isOpen={showSuccess}
        title={t('સફળતા', 'Success')}
        message={t('ઈ-પેપર સફળતાપૂર્વક અપલોડ કરવામાં આવ્યું.', 'E-Paper uploaded successfully.')}
        onConfirm={() => setShowSuccess(false)}
      />

      <AlertModal
        isOpen={!!alertMessage}
        message={alertMessage}
        onConfirm={() => setAlertMessage('')}
      />
    </div>
  );
}
