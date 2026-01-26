'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || typeof password !== 'string') {
    return { error: 'Email and password are required' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Invalid credentials' }
  }

  // Check if profile exists and is active
  if (data.user) {
    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('requires_new_password, is_active')
      .eq('id', data.user.id)
      .single()

    if (!profile) {
      await supabase.auth.signOut()
      return { error: 'No staff profile found. Contact administrator.' }
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      return { error: 'Account is inactive. Contact administrator.' }
    }

    if (profile.requires_new_password) {
      redirect('/auth/update-password')
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
  return { error: '' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function requestPasswordReset(prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email')

  if (typeof email !== 'string' || !email) {
    return { error: 'Valid email is required' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/update-password`,
  })

  if (error) {
    return { error: 'Could not send reset email. Verify the address is correct.' }
  }

  return { success: 'Check your email for the reset link.', error: '' }
}

export async function updatePassword(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password')
  const confirmPassword = formData.get('confirmPassword')

  if (typeof password !== 'string' || typeof confirmPassword !== 'string') {
    return { error: 'Password is required' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters' }
  }

  // 1. Update Auth User Password
  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    return { error: 'Failed to update password' }
  }

  // 2. Update Profile flag (remove requirement for new password)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
     await supabase
      .from('staff_profiles')
      .update({ requires_new_password: false })
      .eq('id', user.id)
  }

  revalidatePath('/', 'layout')
  redirect('/')
  return { error: '' }
}
