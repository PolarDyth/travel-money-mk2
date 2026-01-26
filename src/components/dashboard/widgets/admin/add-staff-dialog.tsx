'use client'

import { startTransition, useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { createStaffMember, type CreateStaffState } from '@/app/(dashboard)/admin/actions'
import { getBranches, type BranchOption } from '@/lib/queries/admin'

const initialState: CreateStaffState = {}

function AddStaffForm({ onSuccess }: { onSuccess: () => void }) {
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [state, formAction, isPending] = useActionState(createStaffMember, initialState)

  useEffect(() => {
    getBranches().then(setBranches)
  }, [])

  useEffect(() => {
    if (state.success) {
      onSuccess()
    }
  }, [state, onSuccess])

  return (
    <form action={formAction} className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" name="firstName" required placeholder="Jane" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" name="lastName" required placeholder="Doe" />
        </div>
      </div>
          
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="jane.doe@example.com" />
      </div>

        <div className="space-y-2">
        <Label htmlFor="employeeNumber">Employee Number</Label>
        <Input id="employeeNumber" name="employeeNumber" required placeholder="EMP001" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Temporary Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select name="role" required defaultValue="operator">
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operator">Operator</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="branchId">Branch</Label>
          <Select name="branchId" required>
            <SelectTrigger>
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {state.error && (
        <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-200">
          {state.error}
        </div>
      )}

      <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </DialogFooter>
    </form>
  )
}

export function AddStaffDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <Plus className="w-4 h-4" />
          Add Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>
            Create a new user account. They will be required to change their password on first login.
          </DialogDescription>
        </DialogHeader>
        {open && <AddStaffForm onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}
