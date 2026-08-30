import { NextResponse } from 'next/server';
import { createClient } from '../../src/utils/supabase/server';
import { handleApiError, requireAdminMutation } from './utils';


export function withApi(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: Request, supabase: any) => Promise<NextResponse>
) {
  return async (req: Request) => {
    const supabase = await createClient();
    try {
      return await handler(req, supabase);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

export function withAdminApi(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: Request, supabase: any) => Promise<NextResponse>
) {
  return async (req: Request) => {
    const supabase = await createClient();
    try {
      const adminError = await requireAdminMutation(req);
      if (adminError) return adminError;
      return await handler(req, supabase);
    } catch (err) {
      return handleApiError(err);
    }
  };
}
