import { NextResponse } from 'next/server';
import { getCsrfToken } from '../../../src/lib/csrf';

export async function GET() {
  const token = await getCsrfToken();
  return NextResponse.json({ csrfToken: token });
}