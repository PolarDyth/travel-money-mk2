'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

const initialState = {
  error: '',
  success: '',
}

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState)

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/30">
            <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-2">
            <h3 className="text-lg font-medium">Request Sent</h3>
            <p className="text-sm text-muted-foreground">{state.success}</p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">Return to Login</Link>
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-6 w-full max-w-sm">
      <div className="grid gap-2">
        <Label htmlFor="email">Staff Email Address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="user@example.com"
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p>{state.error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? 'Sending...' : 'Send Reset Link'}
      </Button>

      <div className="text-center">
        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline">
          Cancel & Return to Login
        </Link>
      </div>
    </form>
  )
}
