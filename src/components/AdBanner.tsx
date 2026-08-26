import { getActiveAdsForSlot } from '../lib/server-data';
import AdBannerClient from './AdBannerClient';

export default async function AdBanner({ slot, className = 'my-8' }: Readonly<{ slot: string; className?: string }>) {
  const ads = await getActiveAdsForSlot(slot);

  if (!ads || ads.length === 0) return null;

  return <AdBannerClient ads={ads} className={className} />;
}
