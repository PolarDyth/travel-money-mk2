This repository is a retail POS system for a currency exchange bureau (M&S-style).
It is used by operators in-store, so correctness, clarity, and safety matter more than clever code.


## Tech Stack
- Next.js (App Router)
- TypeScript (strict)
- Tailwind CSS
- shadcn/ui
- Supabase (Postgres + RLS)
- Sentry Error capturing

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
├── types/
│   ├── database.ts         # Supabase generated types (do not edit manually)
│   └── index.ts            # Type aliases and helpers
docs/
└── database-schema-plan.md # Database design documentation
```

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
import type { Branch, Transaction, UserRole } from '@/types'
import { hasRoleOrHigher, USER_ROLES } from '@/types'
```

## General Rules
- Prefer readability over abstraction
- Avoid overly clever or compressed logic
- Do not introduce new libraries without reason
- Follow existing project patterns
- Never use any or unknown as a type, use types from `@/types`
- If you need to use a shadcn component use the CLI to download it

## UI / UX Rules
- This is a till system, not a consumer app
- Actions must be clear and explicit
- Avoid animations that slow down interactions
- Large numbers must be easy to read
- Buy and Sell flows must remain visually distinct

## Styling
- Use Tailwind utility classes
- Use design tokens (no hardcoded colors)
- Follow M&S-inspired neutral palette

## Data & Security
- Assume all input is untrusted
- RLS is enforced at the database layer
- Never bypass RLS logic in application code
- Do not generate SQL directly unless necessary
- All monetary amounts use DECIMAL for precision
- All timestamps use TIMESTAMPTZ for timezone awareness

## Behaviour
- Do NOT generate large blocks of code unless asked
- Prefer small, incremental suggestions
- If unsure, ask clarifying questions
- Avoid "magic" solutions