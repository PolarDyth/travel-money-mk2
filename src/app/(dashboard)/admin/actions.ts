'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  employeeNumber: z.string().min(3, 'Employee number is required'),
  role: z.enum(['operator', 'supervisor', 'manager', 'admin']),
  branchId: z.string().uuid('Invalid branch selection'),
})

export type CreateStaffState = {
  error?: string
  success?: boolean
}

export async function createStaffMember(prevState: CreateStaffState, formData: FormData): Promise<CreateStaffState> {
  const supabase = createAdminClient()

  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    employeeNumber: formData.get('employeeNumber'),
    role: formData.get('role'),
    branchId: formData.get('branchId'),
  }

  const validatedFields = createStaffSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.issues[0].message
    }
  }

  const { email, password, firstName, lastName, employeeNumber, role, branchId } = validatedFields.data

  // 1. Create Auth User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm for admin-created users
    user_metadata: {
      first_name: firstName,
      last_name: lastName
    }
  })

  if (authError) {
    console.error('Auth error:', authError)
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  // 2. Create Staff Profile
  const { error: profileError } = await supabase
    .from('staff_profiles')
    .insert({
      id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      employee_number: employeeNumber,
      role: role,
      branch_id: branchId,
      is_active: true,
      requires_new_password: true // Force them to change it
    })

  // Wait, I recall from the type fix that `email` column was removed/missing from `staff_profiles` type definition.
  // The database-schema-plan.md says staff_profiles *extends* auth.users.
  // Let's re-read src/types/database.ts to be absolutely sure about columns.
  
  if (profileError) {
    console.error('Profile error:', profileError)
    // Cleanup auth user to prevent "ghost" users without profiles
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: 'Failed to create staff profile: ' + profileError.message }
  }

  revalidatePath('/admin')
  return { success: true }
}
