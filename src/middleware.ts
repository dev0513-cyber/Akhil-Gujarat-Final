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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let rateLimitResult: { success: boolean; limit: number; remaining: number; reset: number } | undefined;

  // Rate Limiting Logic
  if (process.env.NODE_ENV !== 'development' && (pathname.startsWith('/api') || pathname.startsWith('/auth'))) {
    const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown-ip';
    const isUpload = pathname.startsWith('/api/upload');
    const isAuth = pathname.startsWith('/auth');
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && !isUpload && !isAuth;
    const isPublicRead = request.method === 'GET' && pathname.startsWith('/api');

    if (!limiters) {
      if (isMutation || isUpload || isAuth) {
        return NextResponse.json({ error: 'Rate limiting infrastructure unavailable' }, { status: 429 });
      }
    } else {
      try {
        if (isAuth) {
          rateLimitResult = await limiters.auth.limit(`auth:${ip}`);
        } else if (isUpload) {
          rateLimitResult = await limiters.upload.limit(`upload:${ip}`);
        } else if (isMutation) {
          rateLimitResult = await limiters.mutation.limit(`mut:${ip}`);
        } else if (isPublicRead) {
          rateLimitResult = await limiters.public.limit(`pub:${ip}`);
        }

        if (rateLimitResult && !rateLimitResult.success) {
          return NextResponse.json(
            { error: 'Too many requests, please try again later.' },
            { 
              status: 429,
              headers: {
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.reset.toString(),
              }
            }
          );
        }
      } catch {
        if (isMutation || isUpload || isAuth) {
          return NextResponse.json({ error: 'Rate limiting service unavailable' }, { status: 429 });
        }
      }
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Apply Security Headers globally
  const setSecurityHeaders = (res: NextResponse) => {
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
  };

  setSecurityHeaders(supabaseResponse);

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
          setSecurityHeaders(supabaseResponse);
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

  if (user && (!isAdminRoute || isLoginRoute) && !isApiRoute) {
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.startsWith('sb-')) {
        supabaseResponse.cookies.delete(cookie.name)
      }
    })
  }

  if (isAdminRoute && !isLoginRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
