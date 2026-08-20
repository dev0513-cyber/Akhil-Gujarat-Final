import Image from 'next/image';
import { getAdsForSlot } from '../lib/server-data';
import { getAdFrame } from '../lib/ads';

export default async function AdBanner({ slot, className = 'my-8' }: Readonly<{ slot: string; className?: string }>) {
  const ad = await getAdsForSlot(slot);
  if (!ad) return null;

  const frame = getAdFrame(ad.frame);
  const box = `block border border-rule/60 bg-white overflow-hidden ${frame.maxWidth} mx-auto`;

  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-1.5 font-medium">
        જાહેરાત / Advertisement
      </p>
      {ad.link_url ? (
        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className={box}>
          <div className={`relative w-full ${frame.aspect}`}>
            <Image src={ad.image_url} alt={ad.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 1600px" />
          </div>
        </a>
      ) : (
        <div className={box}>
          <div className={`relative w-full ${frame.aspect}`}>
            <Image src={ad.image_url} alt={ad.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 1600px" />
          </div>
        </div>
      )}
    </div>
  );
}
