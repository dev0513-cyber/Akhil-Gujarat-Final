import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis only if the env vars are available
const getRedis = () => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
};

const redis = getRedis();

const limiters = redis ? {
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
  }),
  mutation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
  }),
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, '1 m'),
    analytics: true,
  }),
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
  })
} : null;

type RateLimitResultType = { success: boolean; limit: number; remaining: number; reset: number };

function executeLimit(limitersObj: NonNullable<typeof limiters>, isAuth: boolean, isUpload: boolean, isMutation: boolean, ip: string) {
  if (isAuth) {
    return limitersObj.auth.limit(`auth:${ip}`);
  }
  if (isUpload) {
    return limitersObj.upload.limit(`up:${ip}`);
  }
  if (isMutation) {
    return limitersObj.mutation.limit(`mut:${ip}`);
  }
  return limitersObj.public.limit(`pub:${ip}`);
}

async function checkRateLimit(request: NextRequest, pathname: string): Promise<{ response?: NextResponse; result?: RateLimitResultType }> {
  if (process.env.NODE_ENV === 'development' || (!pathname.startsWith('/api') && !pathname.startsWith('/auth'))) {
    return {};
  }
  
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown-ip';
  const isMutation = request.method !== 'GET';
  const isUpload = pathname.startsWith('/api/upload');
  const isAuth = pathname.startsWith('/auth') || pathname.startsWith('/admin/login');

  if (!limiters) return {};

  try {
    const rateLimitResult = await executeLimit(limiters, isAuth, isUpload, isMutation, ip);

    if (rateLimitResult && !rateLimitResult.success) {
      return { 
        response: NextResponse.json(
          { error: 'Too many requests, please try again later.' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            }
          }
        ) 
      };
    }
    return { result: rateLimitResult };
  } catch {
    if (isMutation || isUpload || isAuth) {
      return { response: NextResponse.json({ error: 'Rate limiting service unavailable' }, { status: 429 }) };
    }
    return {};
  }
}

function setSecurityHeaders(res: NextResponse, rateLimitResult?: RateLimitResultType) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https:;");
  
  if (rateLimitResult) {
    res.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    res.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rate Limiting Logic
  const { response: rateLimitResponse, result: rateLimitResult } = await checkRateLimit(request, pathname);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Apply Security Headers globally
  setSecurityHeaders(supabaseResponse, rateLimitResult);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          setSecurityHeaders(supabaseResponse, rateLimitResult);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isApiRoute = pathname.startsWith('/api')
  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginRoute = pathname === '/admin/login'

  // Protect admin routes: redirect unauthenticated users to login
  if (isAdminRoute && !isLoginRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  // If already logged in and visiting /admin/login, redirect to dashboard
  if (isLoginRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  if (isAdminRoute) {
    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    supabaseResponse.headers.set('Pragma', 'no-cache')
    supabaseResponse.headers.set('Expires', '0')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    String.raw`/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`,
  ],
}
