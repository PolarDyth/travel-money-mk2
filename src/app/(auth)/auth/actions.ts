'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import {
  ValidationError,
  AuthError,
  DatabaseError,
  ErrorCode,
  formatSupabaseError,
  captureError
} from "@/lib/errors"
import { createErrorResult, createSuccessResult, ActionResult } from "@/lib/types/response"

export async function login(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    const email = formData.get('email')
    const password = formData.get('password')

    if (typeof email !== 'string' || typeof password !== 'string') {
      const error = new ValidationError("Email and password must be strings")
      return createErrorResult(
        error.code,
        error.message,
        "Email and password are required"
      )
    }

    if (!email || !password) {
      const error = new ValidationError("Missing email or password")
      return createErrorResult(
        error.code,
        error.message,
        "Email and password are required"
      )
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const appError = new AuthError(
        error.message,
        "Invalid email or password. Please try again."
      )
      captureError(appError, { action: "login", email })
      return createErrorResult(
        appError.code,
        appError.message,
        appError.userMessage
      )
    }

    // Check if profile exists and is active
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('staff_profiles')
        .select('requires_new_password, is_active')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        const appError = new DatabaseError(
          profileError?.message || "Profile not found",
          "No staff profile found. Contact administrator."
        )
        captureError(appError, { action: "login", userId: data.user.id })
        await supabase.auth.signOut()
        return createErrorResult(
          appError.code,
          appError.message,
          appError.userMessage
        )
      }

      if (!profile.is_active) {
        const appError = new AuthError(
          "Account is inactive",
          "Your account is inactive. Contact your administrator."
        )
        captureError(appError, { action: "login", userId: data.user.id })
        await supabase.auth.signOut()
        return createErrorResult(
          appError.code,
          appError.message,
          appError.userMessage
        )
      }

      if (profile.requires_new_password) {
        redirect('/auth/update-password')
      }
    }

    revalidatePath('/', 'layout')
    redirect('/')
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: "login" })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred during login. Please try again.",
      { originalError: appError.message }
    )
  }
}

export async function signOut() {
  const supabase = await createClient()
  try {
    await supabase.auth.signOut()
  } catch (error) {
    // Log but don't block sign out
    captureError(error instanceof Error ? error : new Error(String(error)), {
      action: "signOut"
    })
  }
  redirect('/')
}

export async function requestPasswordReset(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const email = formData.get('email')

    if (typeof email !== 'string' || !email) {
      const error = new ValidationError("Email is required or invalid")
      return createErrorResult(
        error.code,
        error.message,
        "Valid email is required"
      )
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/update-password`,
    })

    if (error) {
      const appError = new AuthError(
        error.message,
        "Could not send reset email. Verify the address is correct."
      )
      captureError(appError, { action: "requestPasswordReset", email })
      return createErrorResult(
        appError.code,
        appError.message,
        appError.userMessage
      )
    }

    return createSuccessResult()
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: "requestPasswordReset" })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred. Please try again.",
      { originalError: appError.message }
    )
  }
}

export async function updatePassword(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if (typeof password !== 'string' || typeof confirmPassword !== 'string') {
      const error = new ValidationError("Password fields must be strings")
      return createErrorResult(
        error.code,
        error.message,
        "Password is required"
      )
    }

    if (password !== confirmPassword) {
      const error = new ValidationError("Passwords do not match")
      return createErrorResult(
        error.code,
        error.message,
        "Passwords do not match"
      )
    }

    if (password.length < 6) {
      const error = new ValidationError("Password too short")
      return createErrorResult(
        error.code,
        error.message,
        "Password must be at least 6 characters"
      )
    }

    // 1. Update Auth User Password
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      const appError = new AuthError(error.message, "Failed to update password.")
      captureError(appError, { action: "updatePassword" })
      return createErrorResult(
        appError.code,
        appError.message,
        appError.userMessage
      )
    }

    // 2. Update Profile flag (remove requirement for new password)
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (user) {
      const { error: profileError } = await supabase
        .from('staff_profiles')
        .update({ requires_new_password: false })
        .eq('id', user.id)

      if (profileError) {
        const appError = formatSupabaseError(profileError)
        const dbError = new DatabaseError(
          appError.message,
          "Password updated but failed to update profile.",
          appError.details
        )
        captureError(dbError, { action: "updatePassword", userId: user.id })
        return createErrorResult(
          dbError.code,
          dbError.message,
          dbError.userMessage,
          dbError.details
        )
      }
    }

    revalidatePath('/', 'layout')
    redirect('/')
  } catch (error) {
    const appError = error instanceof Error ? error : new Error(String(error))
    captureError(appError, { action: "updatePassword" })
    return createErrorResult(
      ErrorCode.INTERNAL_ERROR,
      appError.message,
      "An unexpected error occurred while updating password. Please try again.",
      { originalError: appError.message }
    )
  }
}
