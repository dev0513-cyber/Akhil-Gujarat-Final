'use server'

import { createClient } from '../../src/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function loginAction(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Check if MFA is required (i.e. user has TOTP factors enrolled)
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
  
  if (factorsError) {
    return { error: factorsError.message }
  }

  const totpFactors = factorsData.totp || []
  if (totpFactors.length > 0) {
    // User has MFA enrolled, they need to verify
    const factorId = totpFactors[0].id
    
    // Create a challenge immediately
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) {
      return { error: challengeError.message }
    }
    
    return { 
      requiresMfa: true, 
      factorId: factorId, 
      challengeId: challengeData.id 
    }
  }

  return { success: true }
}

export async function verifyMfaAction(factorId: string, challengeId: string, code: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/admin', 'layout')
  redirect('/admin/login')
}
