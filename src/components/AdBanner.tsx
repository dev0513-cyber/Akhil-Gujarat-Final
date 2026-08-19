import Image from 'next/image';
import { getAdsForSlot } from '../lib/server-data';

export default async function AdBanner({ slot, className = 'my-8' }: Readonly<{ slot: string; className?: string }>) {
  const ad = await getAdsForSlot(slot);
  if (!ad) return null;

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-1.5 font-medium">
        જાહેરાત / Advertisement
      </p>
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-rule/60 bg-white overflow-hidden"
      >
        <Image
          src={ad.image_url}
          alt={ad.title}
          width={1600}
          height={400}
          className="w-full h-auto object-cover"
        />
      </a>
    </div>
  );
}
