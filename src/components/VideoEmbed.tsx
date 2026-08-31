import { getYoutubeId } from '../lib/youtube';

const getInstagramId = (url: string) => {
  const match = url.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
};

export default function VideoEmbed({
  url,
  type,
  title,
}: Readonly<{ url?: string | null;
  type?: string | null;
  title?: string; }>) {
  if (!url) return null;
  const kind = (type || '').toLowerCase();
  
  const yt = getYoutubeId(url);
  const ig = getInstagramId(url);

  if (kind === 'youtube' || yt) {
    const id = yt;
    if (!id) return null;
    return (
      <div className="relative w-full overflow-hidden rounded-sm bg-ink aspect-video shadow-sm">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1`}
          title={title || 'વિડિયો સમાચાર'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (ig) {
    return (
      <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-sm bg-white shadow-sm flex justify-center" style={{ height: '650px' }}>
        <iframe
          className="w-full h-full"
          src={`https://www.instagram.com/p/${ig}/embed/`}
          title={title || 'Instagram Video'}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          frameBorder="0"
          scrolling="no"
        />
      </div>
    );
  }

  if (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) {
    return (
      <div className="relative w-full overflow-hidden rounded-sm bg-ink aspect-video shadow-sm">
        <video 
          className="absolute inset-0 h-full w-full object-contain"
          src={url}
          autoPlay
          muted
          playsInline
          controls
        />
      </div>
    );
  }

  if (kind === 'embed') {
    return (
      <div className="relative w-full overflow-hidden rounded-sm bg-ink aspect-video shadow-sm">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={url}
          title={title || 'વિડિયો સમાચાર'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-crimson hover:underline font-gujarati"
    >
      વિડિયો જુઓ →
    </a>
  );
}
