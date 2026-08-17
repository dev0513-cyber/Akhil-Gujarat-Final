import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Explicitly disable localStorage to enforce strict HTTP-only cookie reliance
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      }
    }
  )
}
