# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This repository is a retail POS system for a currency exchange bureau (M&S-style).
It is used by operators in-store, so correctness, clarity, and safety matter more than clever code.

## Common Commands

```bash
# Development
pnpm dev              # Start dev server on port 3000
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database / Seeding
npx tsx scripts/seed-admin.ts <email> <password>    # Create admin user
npx tsx scripts/seed-rates.ts                       # Seed exchange rates

# Database Migrations (via Supabase CLI or direct SQL)
# Migrations are in scripts/*.sql files
```

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix primitives)
- **Icons**: Lucide React
- **Validation**: Zod
- **Charts**: Recharts
- **Backend/Auth**: Supabase (Postgres + RLS)
- **Error Tracking**: `@sentry/nextjs`
- **Package Manager**: pnpm (preferred)

## Project Structure
```
src/
├── app/                    # Next.js App Router pages & actions
│   ├── admin/              # Role-based route groups
│   ├── api/                # Route Handlers
│   ├── auth/               # Authentication flows
│   ├── operator/           # Core transaction flows
│   └── ...
├── components/
│   ├── dashboard/          # Role-specific dashboard views
│   ├── ui/                 # shadcn/ui components
│   └── ...
├── lib/
│   ├── hooks/              # Custom React hooks
│   ├── queries/            # Data fetching logic (Server & Client)
│   ├── transaction-utils.ts # Core business logic
│   └── utils.ts            # UI helpers
├── types/
│   ├── database.ts         # Supabase generated types (do not edit manually)
│   └── index.ts            # Domain types & helpers (use this)
├── utils/
│   └── supabase/           # Auth & Client initialization
scripts/                    # Seeding & utility scripts
docs/                       # Documentation
```

## Architecture & Patterns

### Request Flow & Authentication
1. All requests go through `src/utils/supabase/middleware.ts` for auth checks
2. Protected routes require: authenticated Supabase user + active `staff_profiles` record
3. Role-based access enforced via `ROLE_HIERARCHY` in `src/types/index.ts`

### Data Layer Patterns
- **Server Components**: Fetch data directly via `src/lib/queries/*.ts`
- **Mutations**: Always use Server Actions (`actions.ts` files co-located with routes)
- **No React Query**: State managed via Server Actions or local React state
- **Error Handling**: All Server Actions return `ActionResult<T>` type from `src/lib/types/response.ts`

### Server Action Structure
Every `actions.ts` file follows this pattern:
```typescript
'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { createErrorResult, createSuccessResult, ActionResult } from "@/lib/types/response"

export async function someAction(params: Params): Promise<ActionResult<ReturnType>> {
  try {
    const supabase = await createClient()
    // 1. Validate input (Zod)
    // 2. Get user & verify permissions
    // 3. Perform business logic
    // 4. Database operations
    // 5. revalidatePath()
    return createSuccessResult(data)
  } catch (error) {
    // captureError() sends to Sentry
    return createErrorResult(...)
  }
}
```

### Transaction Wizard Pattern
- Multi-step transaction flows use `use-transaction.ts` hook
- State managed in `TransactionState` interface
- Steps: currency → customer → denominations → review → success
- Final submission via `submitTransaction()` Server Action

### Error Handling Architecture
- All custom errors extend `AppErrorClass` in `src/lib/errors.ts`
- Error codes in `ErrorCode` enum (UNAUTHORIZED, VALIDATION_ERROR, DRAWER_NOT_OPEN, etc.)
- `captureError()` sends to Sentry with context
- Server Actions return standardized `ActionResult<T>`

## Database Schema

### Tables (13 total)
| Table | Purpose |
|-------|---------|
| `branches` | Store locations |
| `staff_profiles` | Extends auth.users with employee data |
| `currencies` | Supported currencies (GBP base + 20 foreign) |
| `currency_denominations` | Notes/coins for cash counting |
| `exchange_rates` | Current rates with branch overrides |
| `exchange_rate_history` | Immutable rate audit log |
| `drawer_sessions` | Till sessions with float tracking |
| `drawer_denomination_counts` | Cash counts at open/close |
| `transactions` | Exchange records |
| `transaction_audit_log` | Full transaction audit trail |
| `daily_reconciliation` | End-of-day summaries |
| `compliance_alerts` | Regulatory alerts |
| `system_settings` | Key-value config store |

### Enums
- `user_role`: operator, supervisor, manager, admin
- `transaction_type`: buy, sell (from bureau's perspective)
- `transaction_status`: completed, voided, refunded
- `drawer_session_status`: open, closed, suspended
- `denomination_type`: note, coin
- `rate_source`: manual, feed, override

### Key Concepts
- **Buy rate**: Rate at which bureau BUYS foreign currency FROM customer (lower)
  - Customer gives foreign_amount, bureau gives base_amount
  - Calculation: `base_amount = foreign_amount / buy_rate`
- **Sell rate**: Rate at which bureau SELLS foreign currency TO customer (higher)
  - Customer gives base_amount, bureau gives foreign_amount
  - Calculation: `foreign_amount = base_amount * sell_rate`
- **Base currency**: GBP (British Pound Sterling)
- Transaction references auto-generated: `TXN-{BRANCH}-{YYYYMMDD}-{UUID8}`
- **Drawer sessions**: Till float tracking with denomination-level cash counts

### RLS Security Model
1. Must be authenticated via Supabase Auth
2. Must have active `staff_profiles` record (`is_active = true`)
3. Role-based access: operator → supervisor → manager → admin

### Type Usage
```typescript
// ALWAYS import from @/types, never @types/database directly
import type { Branch, Transaction, UserRole } from '@/types'
import { hasRoleOrHigher, USER_ROLES } from '@/types'
```

## General Rules
- **Correctness First**: This handles money. Logic must be airtight.
- **Readability**: Prefer obvious code.
- **Type Safety**: Strictly typed. No `any`. Use `zod` for input validation.
- **Component Usage**: If you need a shadcn component, use the CLI: `npx shadcn@latest add <component>`
- **File Placement**:
  - Business logic → `src/lib`
  - Data queries → `src/lib/queries`
  - Reusable UI → `src/components/ui`
- **Environment**: Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## UI / UX Rules
- This is a till system, not a consumer app.
- Actions must be clear and explicit.
- Large numbers must be easy to read (monospace fonts for figures often help).
- Buy and Sell flows must remain visually distinct.

## Data & Security
- Assume all input is untrusted. Validate with Zod schemas.
- RLS is enforced at the database layer. Never bypass RLS logic.
- All monetary amounts use DECIMAL for precision.
- All timestamps use TIMESTAMPTZ for timezone awareness.
- Supabase client created via `createClient()` from `@/utils/supabase/server`
- For admin operations requiring elevated permissions, use `SUPABASE_SERVICE_ROLE_KEY` (scripts only)

## Key Business Logic Files
- `src/lib/transaction-utils.ts`: Core exchange calculations (calculateExchangeAmount, calculateOptimalDenominations)
- `src/lib/errors.ts`: Error class hierarchy and Sentry integration
- `src/lib/types/response.ts`: ActionResult<T> type for Server Action returns
- `src/utils/supabase/middleware.ts`: Auth middleware for route protection
- `src/components/operator/transaction/use-transaction.ts`: Transaction wizard state management

## Behaviour
- Do NOT generate large blocks of code unless asked.
- Prefer small, incremental suggestions.
- If unsure, ask clarifying questions.
- Avoid "magic" solutions.