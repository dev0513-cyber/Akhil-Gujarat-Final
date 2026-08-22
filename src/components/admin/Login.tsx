"use client";
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { loginAction, verifyMfaAction } from '../../../app/actions/auth';
import Seo from '../SEO';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    searchParams?.get('error') === 'SessionExpired'
      ? 'Your session has expired after 24 hours. Please log in again.'
      : ''
  );
  const [busy, setBusy] = useState(false);


  const onSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!email.trim() || password.length < 6) {
      setError('A valid email and a password of at least 6 characters are required.');
      return;
    }
    setBusy(true);
    
    if (requiresMfa) {
      if (otp.length < 6) {
        setError('Please enter a valid 6-digit code.');
        setBusy(false);
        return;
      }
      const res = await verifyMfaAction(factorId, challengeId, otp);
      if (res.error) {
        setError(res.error);
        setBusy(false);
      } else {
        router.push('/admin');
      }
      return;
    }

    const res = await loginAction(email.trim(), password);
    if (res.error) {
      setError(res.error);
      setBusy(false);
    } else if (res.requiresMfa) {
      setRequiresMfa(true);
      setFactorId(res.factorId || '');
      setChallengeId(res.challengeId || '');
      setBusy(false);
    } else {
      router.push('/admin');
    }
  };

  const fillDemo = () => {
    setEmail('admin@akhilgujarat.com');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 md:p-8 font-sans">
      <Seo title="Admin Login" description="Akhil Gujarat CMS" />
      
      {/* Main Card */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row bg-white border border-rule shadow-sm overflow-hidden">
        
        {/* LEFT COLUMN: Branding & Context (Light Editorial Block) */}
        <div className="w-full md:w-5/12 p-6 sm:p-8 md:p-12 flex flex-col justify-center bg-paper/30 border-b md:border-b-0 md:border-r border-rule text-ink relative">
          <div className="relative z-10 text-center">
            <Image src="/logo.png" alt="Akhil Gujarat Logo" width={144} height={144} className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 object-contain mb-4 sm:mb-6 drop-shadow-sm mx-auto block" priority />
            <div className="font-display text-[11px] sm:text-[12px] md:text-[14px] tracking-[0.4em] uppercase text-crimson mb-2 sm:mb-3 font-bold">Akhil Gujarat</div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none text-ink drop-shadow-sm whitespace-nowrap">અખિલ ગુજરાત</h1>
            <p className="mt-4 sm:mt-5 text-[9px] sm:text-[10px] md:text-[12px] tracking-[0.3em] uppercase font-bold text-ink/50">Unity · Culture · Progress</p>
          </div>

          <div className="relative z-10 mt-12 pt-6 border-t border-rule w-full mx-auto text-center">
            <div className="flex items-center justify-center gap-2.5 text-ink/50">
              <ShieldCheck size={18} className="text-crimson shrink-0" />
              <span className="text-xs tracking-[0.2em] uppercase font-semibold whitespace-nowrap">Secure Admin Portal</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Login Form (Solid White) */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 md:p-14 bg-white flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-8 md:mb-10 text-center md:text-left">
              <h1 className="font-display text-2xl sm:text-3xl text-ink font-bold">Sign In</h1>
              <p className="text-xs sm:text-sm text-ink/60 mt-2 font-medium">Enter your credentials to access the dashboard</p>
            </div>

            {!requiresMfa ? (
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-xs text-ink/70 uppercase tracking-widest font-bold mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@akhilgujarat.com"
                      className="w-full border border-rule bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-crimson text-ink placeholder:text-ink/30 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs text-ink/70 uppercase tracking-widest font-bold mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full border border-rule bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-crimson text-ink placeholder:text-ink/30 transition-colors"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-crimson/5 border border-crimson/20 text-sm text-crimson font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-crimson text-white py-3 text-sm tracking-[0.2em] uppercase font-bold disabled:opacity-60 transition-colors hover:bg-crimson/90 mt-4 flex items-center justify-center gap-2 group shadow-sm"
                >
                  {busy ? 'Verifying...' : 'Sign In'}
                  {!busy && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-xs text-ink/70 uppercase tracking-widest font-bold mb-2">
                    Authenticator Code (MFA)
                  </label>
                  <div className="relative">
                    <ShieldCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
                    <input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      className="w-full border border-rule bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-crimson text-ink placeholder:text-ink/30 transition-colors tracking-[0.5em] font-mono text-center"
                      required
                      minLength={6}
                      maxLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-crimson/5 border border-crimson/20 text-sm text-crimson font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-crimson text-white py-3 text-sm tracking-[0.2em] uppercase font-bold disabled:opacity-60 transition-colors hover:bg-crimson/90 mt-4 flex items-center justify-center gap-2 group shadow-sm"
                >
                  {busy ? 'Verifying...' : 'Verify MFA'}
                  {!busy && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            )}

            {!requiresMfa && (
              <div className="mt-10 pt-6 border-t border-rule text-center">
                <p className="text-[11px] text-ink/50 mb-3 uppercase tracking-widest font-semibold">Demo Access</p>
                <button
                  type="button"
                  onClick={fillDemo}
                  className="w-full border border-rule py-2.5 text-sm text-ink/75 hover:border-ink hover:text-ink transition-colors font-medium bg-paper/50"
                >
                  Load Demo Credentials
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
