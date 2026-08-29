import { NextResponse } from 'next/server';

// Lightweight health check endpoint for external monitoring services (e.g. UptimeRobot, BetterStack)
// Does NOT query Supabase to prevent connection exhaustion during aggressive monitoring.
export function GET() {
  return NextResponse.json(
    { 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    }, 
    { status: 200 }
  );
}
