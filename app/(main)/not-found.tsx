import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <h1 className="text-9xl font-display text-crimson opacity-10">404</h1>
      <h2 className="text-3xl font-display mt-4">પેજ મળ્યું નહીં</h2>
      <p className="mt-4 text-ink/70 font-gujarati">
        તમે જે પેજ શોધી રહ્યા છો તે ઉપલબ્ધ નથી અથવા કાઢી નાખવામાં આવ્યું છે.
      </p>
      <Link href="/" className="inline-block mt-8 bg-crimson text-white px-6 py-2 uppercase tracking-widest text-sm hover:bg-crimson/90">
        હોમ પેજ પર જાઓ
      </Link>
    </div>
  );
}
