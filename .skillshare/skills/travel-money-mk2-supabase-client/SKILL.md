name: supabase-client
description: Supabase client initialization patterns for travel-money-mk2 - server vs client, auth state management, middleware
targets: [claude]
user-invocable: false

# Supabase Client Patterns

This skill covers Supabase client initialization for different contexts in the travel-money-mk2 POS system.

## Server-Side (Server Components & Server Actions)

```typescript
import { createClient } from "@/utils/supabase/server"

const supabase = await createClient()
```

**Use in:**
- Server Components (`async function Component()`)
- Server Actions (files with `'use server'` directive)
- Route Handlers (`app/api/*/route.ts`)

**What it provides:**
- Cookie-based auth (automatically handled)
- RLS enforcement via user session
- Access to all tables (respects RLS policies)

## Client-Side (Client Components)

```typescript
import { createClient } from "@/utils/supabase/client"

const supabase = createClient()
```

**Use in:**
- Client Components (files with `'use client'` directive)
- Custom hooks (`src/lib/hooks/`)
- Browser event handlers

**What it provides:**
- Browser-based auth (localStorage)
- Real-time subscriptions
- Direct database access (respects RLS)

## Auth State Management (use-user Hook)

```typescript
import { useUser } from "@/lib/hooks/use-user"

function MyComponent() {
  const { user, loading, refresh } = useUser()

  if (loading) return <Loader />
  if (!user) return <LoginPrompt />

  return <Dashboard user={user} />
}
```

The `use-user` hook:
- Wraps `supabase.auth.onAuthStateChange()`
- Provides `user`, `loading`, and `refresh` function
- Handles auth state changes automatically
- Only works in Client Components

## Admin Client (Bypass RLS)

```typescript
import { createAdminClient } from "@/utils/supabase/admin"

const supabase = createAdminClient()
```

**Use in:**
- Server Actions that need to bypass RLS
- Admin-only operations
- Server-side utilities

**WARNING:** NEVER expose admin client to client-side code or API routes.

## Middleware Auth Check

```typescript
// src/utils/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { request }
  )
  // ... refreshes session, handles cookies
}
```

## Common Patterns

### Server Component: Fetch Data

```typescript
async function Dashboard() {
  const supabase = await createClient()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, branches(name)')
    .order('created_at', { ascending: false })
    .limit(10)

  return <TransactionList data={transactions} />
}
```

### Server Action: Authenticated Mutation

```typescript
'use server'

import { createClient } from "@/utils/supabase/server"

export async function createTransaction(data: TransactionData) {
  const supabase = await createClient()

  // Always verify user first
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Then get staff profile
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, branch_id')
    .eq('id', user.id)
    .single()

  // Perform mutation...
}
```

### Client Component: Real-time Subscription

```typescript
'use client'

import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from 'react'

export function LiveRates() {
  const [rates, setRates] = useState([])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to changes
    const channel = supabase
      .channel('rates-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'exchange_rates'
      }, (payload) => {
        console.log('Change:', payload)
        // Handle update
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return <RatesDisplay rates={rates} />
}
```

## Key Rules

1. **Server Components** → `@/utils/supabase/server` (always await)
2. **Client Components** → `@/utils/supabase/client` (no await)
3. **Admin operations** → `@/utils/supabase/admin` (server only!)
4. **Auth state** → `useUser()` hook in client components
5. **Never mix** server and client imports

## File Locations

```
src/utils/supabase/
├── server.ts    # Server-side client (cookies)
├── client.ts    # Client-side client (localStorage)
└── admin.ts     # Admin client (service role, bypass RLS)
```
