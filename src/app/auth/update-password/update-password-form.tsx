'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'

const initialState = {
  error: '',
}

export function UpdatePasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-6 w-full max-w-sm">
      <div className="grid gap-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
        />
        <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
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
        {isPending ? 'Updating...' : 'Set New Password'}
      </Button>
    </form>
  )
}
