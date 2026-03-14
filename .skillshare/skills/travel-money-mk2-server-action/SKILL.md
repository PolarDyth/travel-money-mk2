name: server-action
description: Server Action pattern for travel-money-mk2 - 'use server' directives with Supabase auth, mutations, and revalidation
targets: [claude]
user-invocable: false

# Server Action Pattern

This skill implements the standard Server Action pattern for the travel-money-mk2 POS system.

## When to Use

Use this pattern whenever creating a mutation (create, update, delete) in the Next.js App Router.

## The Pattern

```typescript
'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// 1. Define input schema with Zod
const ActionSchema = z.object({
  param1: z.string().min(1),
  param2: z.number().optional(),
})

export async function someAction(input: z.infer<typeof ActionSchema>) {
  // 2. Validate input
  const parsed = ActionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error.errors }
  }

  // 3. Get authenticated user
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized' }
  }

  // 4. Get staff profile (for branch access)
  const { data: staff, error: staffError } = await supabase
    .from('staff_profiles')
    .select('id, branch_id, role')
    .eq('id', user.id)
    .single()

  if (staffError || !staff) {
    return { error: 'Staff profile not found' }
  }

  // 5. Perform mutation
  const { data, error } = await supabase
    .from('table_name')
    .insert({
      field1: parsed.data.param1,
      field2: parsed.data.param2,
      branch_id: staff.branch_id,
      operator_id: staff.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Mutation Error:', error)
    return { error: 'Operation failed' }
  }

  // 6. Revalidate affected paths
  revalidatePath('/operator')
  revalidatePath('/supervisor')

  return { success: true, data }
}
```

## File Location

Place Server Actions in `actions.ts` files within route folders:

```
src/app/(dashboard)/operator/transaction/actions.ts
src/app/(dashboard)/operator/drawer/actions.ts
src/app/(dashboard)/supervisor/actions.ts
src/app/(dashboard)/admin/actions.ts
src/app/(auth)/auth/actions.ts
```

## Key Rules

1. **Always use `'use server'` directive** at the top of the file
2. **Always validate input** with Zod before processing
3. **Always check authentication** - return early if unauthorized
4. **Always get staff profile** to access branch_id and role
5. **Always revalidate paths** after mutations to update UI
6. **Return consistent shape**: `{ success: true, data }` or `{ error: string }`

## Common Return Shapes

```typescript
// Success
return { success: true, data: result }

// Error - simple
return { error: 'Human readable error message' }

// Error - with details
return { error: 'Validation failed', details: zodErrors }
```

## Revalidation Patterns

```typescript
// Single path
revalidatePath('/operator')

// Multiple paths
revalidatePath('/operator')
revalidatePath('/supervisor')

// With query params (not directly supported - revalidate base path)
revalidatePath('/') // then rely on client-side refresh
```

## Error Handling

```typescript
// Log server-side for debugging
console.error('Operation Error:', error)

// Return user-friendly message
return { error: 'Failed to complete operation' }

// Never expose internal errors to client
// Never return raw database errors
```

## Example: Transaction Action

See `src/app/(dashboard)/operator/transaction/actions.ts` for a complete example.
