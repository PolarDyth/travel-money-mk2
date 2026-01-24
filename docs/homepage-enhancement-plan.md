# Role-Specific Homepage Enhancement Plan

## Overview
Enhance the currency exchange POS homepage system with role-specific dashboards tailored to operator, supervisor, manager, and admin responsibilities.

---

## Current State

**Existing Operator Dashboard** (`src/components/dashboard/operator-dashboard.tsx`):
- Header: Branch name, POS position, drawer balance (privacy toggle), user profile
- Primary actions: Sell Currency (F1), Buy Currency (F2), Drawer Ops, Find TXN
- Live rates: 6 currencies with buy/sell rates
- Recent activity: 3 transactions with void button
- Compliance alert section
- All data is mocked; no Supabase integration

**Entry Point** (`src/app/page.tsx`):
- Currently hardcoded to show `<OperatorDashboard />`
- Contains TODO for role-based routing

---

## Part 1: Operator Homepage Improvements

### Current Issues
1. No keyboard shortcut handling (F1/F2 labels shown but not functional)
2. Rates not showing change indicators
3. Limited transaction history (only 3 items, no pagination)
4. Drawer status lacks session context (opened time, expected balance)
5. No loading/error states for real data

### Proposed Enhancements

**A. Keyboard Navigation System**
- Implement global keyboard listener for F1-F4 shortcuts
- F1: Sell Currency, F2: Buy Currency, F3: Drawer Ops, F4: Find TXN
- Escape: Cancel/close dialogs

**B. Enhanced Drawer Status Widget**
- Show session open time and duration
- Display expected vs current balance
- Visual variance indicator (green/amber/red)
- Quick link to denomination count

**C. Improved Rates Display**
- Add up/down arrows for rate changes since last update
- Highlight top 3 most-traded currencies
- Show time until next rate refresh
- Visual pulse on rate update

**D. Transaction History Improvements**
- Show 5 transactions with "Load More" pagination
- Filter toggle: All / Buy / Sell
- Void confirmation dialog before action
- Expandable transaction details

**E. Session Context**
- Display active drawer session info
- Show transaction count for session
- Running total for the day

### Files to Modify
- `src/components/dashboard/operator-dashboard.tsx` - Refactor with real data
- Create `src/lib/hooks/use-keyboard-shortcuts.ts`
- Create `src/components/dashboard/widgets/operator/drawer-status.tsx`
- Create `src/components/dashboard/widgets/operator/rates-ticker.tsx`
- Create `src/components/dashboard/widgets/operator/recent-transactions.tsx`

---

## Part 2: Supervisor Dashboard

### Primary Focus
Branch-specific analytics and oversight of operators

### Layout (12-column grid)
```
| Header (full width) |
|---------------------|
| Till Status (4) | Branch Summary (5) | Pending Alerts (3) |
| Operator Metrics (6) | Quick Actions (3) | (continued) |
```

### Widget Specifications

**A. Till Status Grid**
- All tills for the branch with status indicators
- Open (green), Closed (gray), Suspended (amber)
- Operator name and session duration
- Click to view till details/take action

**B. Branch Summary Card**
- Today's totals: Buy volume, Sell volume (GBP)
- Transaction count by type
- Commission earned
- Comparison badge vs yesterday

**C. Pending Alerts Panel**
- Compliance alerts sorted by severity
- One-click acknowledge button
- Link to related transaction
- Count badge in header

**D. Operator Performance Table**
- Transactions per operator today
- Void rate percentage
- Average transaction value
- Color bands: Green (<2% void), Amber (2-5%), Red (>5%)

**E. Quick Actions**
- Override branch rate
- Review flagged transaction
- Force-close stuck till
- View daily reconciliation

### Data Queries
```sql
-- Till status
SELECT ds.*, sp.first_name, sp.last_name
FROM drawer_sessions ds
JOIN staff_profiles sp ON ds.operator_id = sp.id
WHERE ds.branch_id = get_current_branch_id()
  AND ds.opened_at >= CURRENT_DATE;

-- Branch summary
SELECT
  SUM(CASE WHEN transaction_type = 'buy' THEN base_amount ELSE 0 END) as total_buy,
  SUM(CASE WHEN transaction_type = 'sell' THEN base_amount ELSE 0 END) as total_sell,
  COUNT(*) as transaction_count
FROM transactions
WHERE branch_id = get_current_branch_id()
  AND created_at >= CURRENT_DATE
  AND status = 'completed';
```

### Files to Create
- `src/components/dashboard/supervisor-dashboard.tsx`
- `src/components/dashboard/widgets/supervisor/till-status-grid.tsx`
- `src/components/dashboard/widgets/supervisor/branch-summary.tsx`
- `src/components/dashboard/widgets/supervisor/operator-metrics.tsx`
- `src/components/dashboard/widgets/supervisor/pending-alerts.tsx`
- `src/lib/queries/supervisor.ts`

---

## Part 3: Manager Dashboard

### Primary Focus
Multi-branch analytics and rate/staff management

### Layout (Sidebar + Main Content)
```
| Header (full width) |
|---------------------|
| Branch Cards (8) | Reconciliation Queue (4) |
| Trend Charts (8) | Rate Management (4) |
| Staff Performance Table (12) |
```

### Widget Specifications

**A. Branch Comparison Cards**
- Card per branch with key metrics
- Revenue, Transaction Volume, Variance
- Red/green indicators vs targets
- Click to drill into branch

**B. Reconciliation Queue**
- Branches pending manager approval
- Variance amount highlighted (amber if >threshold)
- One-click approve (if within threshold)
- Flag for investigation button

**C. Trend Charts** (requires recharts library)
- Toggle: Daily / Weekly / Monthly
- Line chart: Revenue over time
- Bar chart: Volume by currency
- Area chart: Commission tracking

**D. Rate Management Panel**
- Current global rates
- Branch override status badges
- Quick override form (currency, buy/sell rates)
- Link to full rate history

**E. Staff Performance Table**
- All staff across managed branches
- Sortable columns: Name, Branch, Transactions, Volume, Void Rate
- Filter by branch dropdown
- Export to CSV capability

### Data Queries
```sql
-- Multi-branch summary
SELECT
  b.id, b.name, b.code,
  SUM(t.base_amount) as total_volume,
  COUNT(*) as transaction_count
FROM branches b
LEFT JOIN transactions t ON t.branch_id = b.id
  AND t.created_at >= CURRENT_DATE
WHERE b.is_active = true
GROUP BY b.id, b.name, b.code;

-- Pending reconciliations
SELECT dr.*, b.name as branch_name
FROM daily_reconciliation dr
JOIN branches b ON dr.branch_id = b.id
WHERE dr.manager_approved_at IS NULL
  AND dr.reconciled_at IS NOT NULL;
```

### Files to Create
- `src/components/dashboard/manager-dashboard.tsx`
- `src/components/dashboard/widgets/manager/branch-comparison.tsx`
- `src/components/dashboard/widgets/manager/reconciliation-queue.tsx`
- `src/components/dashboard/widgets/manager/trend-charts.tsx`
- `src/components/dashboard/widgets/manager/rate-management.tsx`
- `src/components/dashboard/widgets/manager/staff-performance.tsx`
- `src/lib/queries/manager.ts`

---

## Part 4: Admin Dashboard

### Primary Focus
System health monitoring and audit trail

### Layout (4-quadrant with status bar)
```
| Status Bar: Active Tills | Pending Alerts | Last Sync |
|--------------------------------------------------------|
| System Health (6) | Audit Trail (6) |
| Compliance Overview (6) | Staff Directory (6) |
```

### Widget Specifications

**A. Status Bar**
- Active drawer sessions count (system-wide)
- Pending compliance alerts count
- Last rate feed sync timestamp
- System error count (24h)

**B. System Health Dashboard**
- Total active tills across all branches
- Reconciliation status by branch
- Rate feed connection status
- Database performance indicator

**C. Audit Trail Viewer**
- Recent system changes (paginated)
- Filter by: Action type, Staff member, Date range
- Expandable row with full details
- Action types: Rate change, Void, Refund, Setting update

**D. Compliance Overview**
- Alert count by severity (Critical/High/Medium/Low)
- Alert count by type (pie chart)
- Unresolved alerts by branch (bar chart)
- Average resolution time metric

**E. Staff Directory**
- Staff count by role (operator/supervisor/manager/admin)
- Active vs inactive users
- Recent logins (last 24h)
- Quick search by name/employee number

### Data Queries
```sql
-- System health
SELECT
  (SELECT COUNT(*) FROM drawer_sessions WHERE status = 'open') as active_tills,
  (SELECT COUNT(*) FROM compliance_alerts WHERE resolved_at IS NULL) as pending_alerts,
  (SELECT COUNT(*) FROM daily_reconciliation
   WHERE reconciliation_date = CURRENT_DATE
   AND manager_approved_at IS NULL) as pending_reconciliations;

-- Audit trail
SELECT tal.*, sp.first_name, sp.last_name
FROM transaction_audit_log tal
JOIN staff_profiles sp ON tal.performed_by = sp.id
ORDER BY tal.performed_at DESC
LIMIT 50;
```

### Files to Create
- `src/components/dashboard/admin-dashboard.tsx`
- `src/components/dashboard/widgets/admin/system-health.tsx`
- `src/components/dashboard/widgets/admin/audit-trail.tsx`
- `src/components/dashboard/widgets/admin/compliance-overview.tsx`
- `src/components/dashboard/widgets/admin/staff-directory.tsx`
- `src/lib/queries/admin.ts`

---

## Part 5: Shared Infrastructure

### A. Role-Based Routing (`src/app/page.tsx`)
```typescript
// Server component that redirects based on role
async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  switch (profile?.role) {
    case 'admin': redirect('/admin')
    case 'manager': redirect('/manager')
    case 'supervisor': redirect('/supervisor')
    default: redirect('/operator')
  }
}
```

### B. User Context Hook (`src/lib/hooks/use-user.ts`)
- Fetch and cache current user's staff profile
- Provide role, branch, and permissions
- `hasRole(required)` helper function

### C. Dashboard Shell (`src/components/dashboard/shared/dashboard-shell.tsx`)
- Consistent layout wrapper for all dashboards
- Keyboard shortcut handler
- Loading state handling
- Error boundary

### D. Shared Header (`src/components/dashboard/shared/dashboard-header.tsx`)
- Branch name and location
- User profile with role badge
- Drawer balance (for operator/supervisor)
- Clock/timestamp

### E. Reusable Widgets
- `stat-card.tsx` - Numeric KPI display
- `alert-card.tsx` - Compliance alert display
- `data-table.tsx` - Sortable/filterable table

---

## Implementation Phases

### Phase 1: Foundation
1. Create user context hook
2. Create dashboard shell and shared header
3. Implement role-based routing in page.tsx
4. Set up route structure: /operator, /supervisor, /manager, /admin

### Phase 2: Operator Enhancements
1. Refactor operator-dashboard to use real Supabase data
2. Add keyboard shortcut handling
3. Implement enhanced drawer status widget
4. Add transaction pagination and void confirmation

### Phase 3: Supervisor Dashboard
1. Create supervisor-dashboard.tsx
2. Implement till status grid
3. Add branch summary and operator metrics
4. Create pending alerts panel

### Phase 4: Manager Dashboard
1. Create manager-dashboard.tsx
2. Install recharts for trend visualization
3. Implement branch comparison and reconciliation queue
4. Add rate management interface

### Phase 5: Admin Dashboard
1. Create admin-dashboard.tsx
2. Implement system health monitoring
3. Add audit trail viewer
4. Create compliance overview

---

## Additional shadcn Components Required
```bash
npx shadcn@latest add badge dialog dropdown-menu table tabs skeleton alert separator tooltip progress select
```

For charts (manager dashboard):
```bash
pnpm add recharts
```

---

## Verification Plan

1. **Role Routing**: Log in as each role type and verify correct dashboard loads
2. **Operator**: Test keyboard shortcuts (F1-F4), verify transaction list pagination
3. **Supervisor**: Verify till status reflects actual drawer_sessions data
4. **Manager**: Verify multi-branch data aggregation, test rate override
5. **Admin**: Verify audit trail shows recent changes, test alert resolution
6. **RLS**: Confirm each role only sees data permitted by RLS policies
7. **Responsive**: Test all dashboards on tablet (1024px) and desktop (1440px)

---

## Critical Files Summary

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Role-based routing entry point |
| `src/lib/hooks/use-user.ts` | User context and permissions |
| `src/components/dashboard/shared/dashboard-shell.tsx` | Layout wrapper |
| `src/components/dashboard/operator-dashboard.tsx` | Refactor with real data |
| `src/components/dashboard/supervisor-dashboard.tsx` | New dashboard |
| `src/components/dashboard/manager-dashboard.tsx` | New dashboard |
| `src/components/dashboard/admin-dashboard.tsx` | New dashboard |
