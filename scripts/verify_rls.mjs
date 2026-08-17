import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const anonClient = createClient(URL, ANON_KEY);
const adminClient = createClient(URL, ANON_KEY);
const nonAdminClient = createClient(URL, ANON_KEY);

async function testAnonAccess() {
  let pass = true;
  console.log('\n--- 1. TESTING ANONYMOUS ACCESS ---');
  
  const { error: readErr } = await anonClient.from('articles').select('id').limit(1);
  console.log(`Anon SELECT: ${readErr ? 'FAIL X (' + readErr.code + ')' : 'PASS OK'}`);
  if (readErr) pass = false;
  
  const { error: insErr } = await anonClient.from('articles').insert({ id: 999999, headline: 'test', slug: 'test', content: 'test', description: 'test', category_id: 1 });
  console.log(`Anon INSERT: ${insErr?.code === '42501' ? 'BLOCKED OK (RLS Active)' : 'VULNERABLE X (' + (insErr?.code || 'Allowed') + ')'}`);
  if (insErr?.code !== '42501') pass = false;

  const { data: updData } = await anonClient.from('articles').update({ headline: 'hack' }).eq('id', 1).select();
  if (updData && updData.length > 0) {
     console.log('Anon UPDATE actually succeeded! VULNERABLE X');
     pass = false;
  } else {
     console.log('Anon UPDATE: BLOCKED OK');
  }
  
  const { data: delData } = await anonClient.from('articles').delete().eq('id', 999999).select();
  if (delData && delData.length > 0) {
     console.log('Anon DELETE actually succeeded! VULNERABLE X');
     pass = false;
  } else {
     console.log('Anon DELETE: BLOCKED OK');
  }
  
  return pass;
}

async function testAdminAccess() {
  let pass = true;
  console.log('\n--- 2. TESTING ADMIN ACCESS ---');
  
  const { error: loginErr } = await adminClient.auth.signInWithPassword({
    email: 'admin@akhilgujarat.com',
    password: 'admin123'
  });

  if (loginErr) {
    console.log('Admin login failed. Cannot test admin mutations.', loginErr.message);
    return false;
  }
  
  const { error: aRead } = await adminClient.from('articles').select('id').limit(1);
  console.log(`Admin SELECT: ${aRead ? 'FAIL X' : 'PASS OK'}`);
  if (aRead) pass = false;

  // Test INSERT. Note: we omit required fields to trigger NOT NULL constraint (23502) if RLS allows it through.
  const { error: aIns } = await adminClient.from('articles').insert({ id: 999999 });
  console.log(`Admin INSERT: ${aIns?.code === '23502' ? 'ALLOWED BY RLS OK (Caught by schema)' : 'BLOCKED BY RLS X (' + (aIns?.code||'Allowed') + ')'}`);
  if (aIns?.code !== '23502') pass = false;

  return pass;
}

async function testAuthAccess() {
  let pass = true;
  console.log('\n--- 3. TESTING NON-ADMIN AUTHENTICATED ACCESS ---');
  
  // Attempt to sign up a generic user to test authenticated non-admin access.
  const { error: mockErr } = await nonAdminClient.auth.signUp({
    email: 'test_nonadmin_' + Date.now() + '@example.com',
    password: 'password123'
  });
  
  if (mockErr) {
    console.log('Generic user signup failed:', mockErr.message);
    // Don't fail the whole suite if signup is disabled, but can't proceed.
  } else {
    const { error: gIns } = await nonAdminClient.from('articles').insert({ id: 999999 });
    console.log(`Non-Admin INSERT: ${gIns?.code === '42501' ? 'BLOCKED OK (RLS Active)' : 'VULNERABLE X (' + (gIns?.code || 'Allowed') + ')'}`);
    if (gIns?.code !== '42501') pass = false;
  }
  
  return pass;
}

async function runTests() {
  const p1 = await testAnonAccess();
  const p2 = await testAdminAccess();
  const p3 = await testAuthAccess();
  const allPass = p1 && p2 && p3;
  console.log('\nVERIFICATION COMPLETE: ' + (allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'));
}

await runTests();
