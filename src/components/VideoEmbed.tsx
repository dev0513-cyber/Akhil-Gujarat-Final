import { getYoutubeId } from '../lib/youtube';

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

  if (kind === 'youtube' || yt) {
    const id = yt;
    if (!id) return null;
    return (
      <div className="relative w-full overflow-hidden rounded-sm bg-ink aspect-video shadow-sm">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${id}`}
          title={title || 'વિડિયો સમાચાર'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
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
