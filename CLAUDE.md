This repository is a retail POS system for a currency exchange bureau (M&S-style).
It is used by operators in-store, so correctness, clarity, and safety matter more than clever code.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix primitives)
- **Icons**: Lucide React
- **Validation**: Zod
- **Charts**: Recharts
- **Backend/Auth**: Supabase (Postgres + RLS)
- **Key Libraries**: `@sentry/nextjs` (Error capturing)

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
- **Data Fetching**: 
  - Prefer Server Components fetching data directly via `src/lib/queries`.
  - Use **Server Actions** (`actions.ts`) for mutations (create/update).
  - **No React Query**: State is managed via Server Actions/App Router or local state.
- **Transactions**: 
  - Complex wizard flows use `use-transaction.ts` hook.
  - Final submission is a Server Action.

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
- **Sell rate**: Rate at which bureau SELLS foreign currency TO customer (higher)
- **Base currency**: GBP (British Pound Sterling)
- Transaction references auto-generated: `TXN-{BRANCH}-{YYYYMMDD}-{SEQ}`

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
- **Component Usage**: If you need a shadcn component use the CLI to download it.
- **File Placement**: 
  - Business logic → `src/lib`
  - Data queries → `src/lib/queries`
  - Reusable UI → `src/components/ui`

## UI / UX Rules
- This is a till system, not a consumer app.
- Actions must be clear and explicit.
- Large numbers must be easy to read (monospace fonts for figures often help).
- Buy and Sell flows must remain visually distinct.

## Data & Security
- Assume all input is untrusted.
- RLS is enforced at the database layer.
- Never bypass RLS logic in application code.
- All monetary amounts use DECIMAL for precision.
- All timestamps use TIMESTAMPTZ for timezone awareness.

## Behaviour
- Do NOT generate large blocks of code unless asked.
- Prefer small, incremental suggestions.
- If unsure, ask clarifying questions.
- Avoid "magic" solutions.