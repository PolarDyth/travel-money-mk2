'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { login } from '../auth/actions'
import type { ActionResult } from '@/lib/types/response'
import { getErrorMessage } from '@/lib/types/response'

const initialState: ActionResult = {
  success: false,
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-6 w-full max-w-sm mx-auto">
      <div className="grid gap-2">
        <Label htmlFor="email">Staff Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          autoComplete="email"
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      {state?.error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p>{getErrorMessage(state.error)}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  )
}
