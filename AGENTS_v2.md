# AGENTS.md: Embroidery Business Expenditure Tracker
**Harness Engineering — Agent Execution Specification**  
**Version:** 2.0  
**Last Updated:** 2026-06-01  
**Changelog:** Added AGENT-DUES (Due Payments domain), AGENT-NOTIFY (Notification system). Updated AGENT-DATA, AGENT-UI, AGENT-REPORTS, AGENT-INFRA, AGENT-ORCH contracts and responsibilities.

---

## What Is This File?

This file defines the **agents**, their responsibilities, boundaries, and coordination protocol for building the Embroidery Expenditure Tracker. Any AI coding agent (Claude Code, Copilot Workspace, or similar) must read this file before writing a single line of code.

Harness engineering means: **each agent owns a clearly bounded vertical slice of the system. Agents do not cross boundaries. Agents communicate through defined contracts only.**

---

## Repository Structure

```
embroidery-tracker/
├── AGENTS.md              ← you are here
├── PRD.md
├── src/
│   ├── data/              ← Agent: DATA
│   │   ├── storage.js
│   │   ├── schema.js
│   │   └── migrations.js
│   ├── domain/            ← Agent: DOMAIN
│   │   ├── expenditure.js
│   │   ├── category.js
│   │   └── validators.js
│   ├── dues/              ← Agent: DUES  (NEW)
│   │   ├── duePayment.js
│   │   ├── dueValidators.js
│   │   └── dueStatus.js
│   ├── notifications/     ← Agent: NOTIFY  (NEW)
│   │   ├── notificationService.js
│   │   ├── scheduler.js
│   │   └── settings.js
│   ├── ui/                ← Agent: UI
│   │   ├── components/
│   │   ├── pages/
│   │   └── styles/
│   ├── reports/           ← Agent: REPORTS
│   │   ├── charts.js
│   │   ├── filters.js
│   │   └── export.js
│   └── app.js             ← Agent: ORCHESTRATOR
├── tests/
│   ├── data/
│   ├── domain/
│   ├── dues/
│   ├── notifications/
│   ├── reports/
│   └── integration/
└── public/
    ├── index.html
    ├── manifest.json
    └── sw.js              ← Agent: INFRA
```

---

## Agent Roster

| Agent ID | Name | Primary Responsibility |
|----------|------|------------------------|
| `AGENT-DATA` | Data Layer Agent | localStorage CRUD, schema, migrations, backup/restore |
| `AGENT-DOMAIN` | Domain Logic Agent | Business rules, validation, category management for expenditures |
| `AGENT-DUES` | Due Payments Agent | Due payment lifecycle, status computation, Mark as Paid flow |
| `AGENT-NOTIFY` | Notification Agent | Browser notification permission, scheduling, dispatch, settings |
| `AGENT-UI` | UI Agent | All React components, pages, routing, styling |
| `AGENT-REPORTS` | Reports Agent | Charts, filters, search, CSV/JSON export |
| `AGENT-INFRA` | Infrastructure Agent | Service worker, offline support, build config, periodic sync |
| `AGENT-ORCH` | Orchestrator Agent | App bootstrap, agent wiring, integration tests |

---

## Agent Specifications

---

### AGENT-DATA — Data Layer Agent

**Owns:** `src/data/`

**Mission:** Provide a clean, reliable persistence API over browser localStorage. All other agents call this API — nobody touches localStorage directly except AGENT-DATA.

**Responsibilities:**
- Implement `StorageService` with methods: `getAll()`, `getById(id)`, `create(record)`, `update(id, changes)`, `softDelete(id)`, `restore(id)`
- Enforce schema versioning (`schema.js`) and run forward-only migrations on app load
- **v2 migration**: add `duePayments` and `notificationSettings` collections to existing storage
- Implement `BackupService`: `exportJSON()` → Blob (includes expenditures + due payments + notification settings), `importJSON(file)` → parsed records with validation
- Monitor storage quota; emit a `storage:warning` event when > 80% full
- Handle all localStorage errors gracefully (QuotaExceededError, SecurityError)

**Must NOT:**
- Contain any business logic or validation rules
- Render any UI
- Know about chart data, reporting shapes, or notification scheduling

**Exported API Contract:**
```javascript
// src/data/storage.js
export const StorageService = {
  getAll(collectionName: string): Record[]
  getById(collectionName: string, id: string): Record | null
  create(collectionName: string, record: object): Record        // adds id, createdAt, updatedAt
  update(collectionName: string, id: string, changes: object): Record
  softDelete(collectionName: string, id: string): void
  restore(collectionName: string, id: string): void
}

export const BackupService = {
  exportJSON(): Blob
  importJSON(file: File): Promise<ImportResult>
}
```

**Collections managed:** `expenditures`, `categories`, `duePayments`, `notificationSettings`

**Tests:** `tests/data/` — unit test every method with mocked localStorage. Add migration test: v1 schema → v2 schema preserves all existing expenditures.

---

### AGENT-DOMAIN — Domain Logic Agent

**Owns:** `src/domain/`

**Mission:** Encode all business rules for expenditures and categories. Source of truth for what a valid expenditure is, what categories exist, and how totals are computed.

**Responsibilities:**
- Define and export the `Expenditure` factory
- Define and export the `Category` factory
- Implement `validators.js`: pure functions returning `{ valid: boolean, errors: FieldError[] }`
- Implement `ExpenditureService`:
  - `createExpenditure(input)` → validates → calls `StorageService.create()`
  - `updateExpenditure(id, input)` → validates → calls `StorageService.update()`
  - `deleteExpenditure(id)` → calls `StorageService.softDelete()`
  - `listExpenditures(filters?)` → calls `StorageService.getAll()`, applies domain filters
  - **`createExpenditureFromDue(duePayment, overrides?)`** → creates an expenditure record linked to a due payment; sets `duePaymentId` field
- Implement `CategoryService`: CRUD for categories, enforce no-delete-if-in-use rule

**Business Rules to Enforce:**
- Amount must be a positive number with max 2 decimal places
- Date cannot be in the future (warn, not block)
- Category is required and must not be archived
- Vendor name max 100 characters
- Notes max 500 characters
- Receipt ID max 50 characters, alphanumeric + hyphens only
- Payment method must be one of: `cash | upi | bank_transfer | card | other`
- `duePaymentId` if provided must reference an existing due payment with status `paid`

**Must NOT:**
- Access localStorage directly
- Render any UI
- Import from `src/ui/`, `src/reports/`, `src/dues/`, or `src/notifications/`

**Exported API Contract:**
```javascript
// src/domain/expenditure.js
export const ExpenditureService = {
  createExpenditure(input: ExpenditureInput): Promise<Expenditure>
  createExpenditureFromDue(duePayment: DuePayment, overrides?: Partial<ExpenditureInput>): Promise<Expenditure>
  updateExpenditure(id: string, input: Partial<ExpenditureInput>): Promise<Expenditure>
  deleteExpenditure(id: string): Promise<void>
  listExpenditures(filters?: FilterParams): Expenditure[]
  getExpenditure(id: string): Expenditure | null
}

// src/domain/category.js
export const CategoryService = {
  listCategories(includeArchived?: boolean): Category[]
  createCategory(name: string, icon: string): Category
  updateCategory(id: string, changes: Partial<Category>): Category
  archiveCategory(id: string): void
}

// src/domain/validators.js
export const validateExpenditure(input): ValidationResult
export const validateCategory(input): ValidationResult
```

**Tests:** `tests/domain/` — 100% branch coverage on all validators and business rules.

---

### AGENT-DUES — Due Payments Agent  *(NEW)*

**Owns:** `src/dues/`

**Mission:** Own the entire due payment lifecycle — creation, editing, status computation, and the Mark as Paid flow that bridges a due payment into an expenditure record.

**Responsibilities:**

**`duePayment.js` — DuePaymentService:**
- `createDuePayment(input)` → validates → calls `StorageService.create('duePayments', ...)`
- `updateDuePayment(id, input)` → validates; throws if status is `paid`
- `deleteDuePayment(id)` → soft delete; throws if status is `paid`
- `listDuePayments(filters?)` → returns all non-deleted due payments with computed status
- `getDuePayment(id)` → single record with computed status
- `markAsPaid(id, expenditureOverrides?)`:
  1. Fetches due payment; throws if already paid
  2. Calls `ExpenditureService.createExpenditureFromDue(duePayment, overrides)`
  3. Updates due payment: `status fields` (notified flags stay), `paidAt = now`, `linkedExpenditureId = new expenditure id`
  4. Calls `NotificationService.cancelNotifications(id)` to clear pending notification flags
  5. Returns `{ duePayment, expenditure }`
- `getDueSummary()` → `{ overdueCount, overdueTotal, dueSoonCount, dueSoonTotal, upcomingCount }`

**`dueStatus.js` — Status computation (pure functions):**
- `computeStatus(duePayment: DuePayment, today: string): DuePaymentStatus`
  - Returns `paid` if `paidAt` is set
  - Returns `overdue` if dueDate < today
  - Returns `due_soon` if dueDate <= today + reminderLeadDays
  - Returns `upcoming` otherwise
- `getDaysUntilDue(dueDate: string, today: string): number` — negative = overdue
- `shouldNotifyLeadDay(duePayment, today): boolean`
- `shouldNotifyDueDay(duePayment, today): boolean`
- `shouldNotifyOverdue(duePayment, today): boolean`

**`dueValidators.js`:**
- `validateDuePayment(input): ValidationResult`
  - Title required, max 100 chars
  - Amount required, positive, max 2dp
  - Due Date required, valid ISO date
  - Category required, must not be archived
  - Vendor required, max 100 chars
  - Priority must be `low | medium | high`
  - ReminderLeadDays must be 1–30

**Business Rules:**
- A paid due payment cannot be edited or deleted
- `reminderLeadDays` defaults to `NotificationSettings.defaultLeadDays` if not explicitly set
- `computeStatus` is always derived at read time — `status` is never stored

**Must NOT:**
- Access localStorage directly (use `StorageService`)
- Render UI
- Import from `src/ui/` or `src/reports/`
- Directly call `ExpenditureService` except via `markAsPaid` (to avoid circular coupling, use the injected reference pattern described in AGENT-ORCH)

**Exported API Contract:**
```javascript
// src/dues/duePayment.js
export const DuePaymentService = {
  createDuePayment(input: DuePaymentInput): Promise<DuePayment>
  updateDuePayment(id: string, input: Partial<DuePaymentInput>): Promise<DuePayment>
  deleteDuePayment(id: string): Promise<void>
  listDuePayments(filters?: DueFilterParams): DuePayment[]
  getDuePayment(id: string): DuePayment | null
  markAsPaid(id: string, expenditureOverrides?: Partial<ExpenditureInput>): Promise<{ duePayment: DuePayment, expenditure: Expenditure }>
  getDueSummary(): DueSummary
}

// src/dues/dueStatus.js
export const computeStatus(duePayment, today): DuePaymentStatus
export const getDaysUntilDue(dueDate, today): number
export const shouldNotifyLeadDay(duePayment, today): boolean
export const shouldNotifyDueDay(duePayment, today): boolean
export const shouldNotifyOverdue(duePayment, today): boolean
```

**Tests:** `tests/dues/` — test `computeStatus` exhaustively (all boundary dates), test `markAsPaid` creates expenditure and updates due payment atomically, test validation.

---

### AGENT-NOTIFY — Notification Agent  *(NEW)*

**Owns:** `src/notifications/`

**Mission:** Own all browser notification logic — permission flow, scheduling checks, dispatch, and settings management. Does not own when to notify (that logic lives in AGENT-DUES `dueStatus.js`); owns *how* to notify.

**Responsibilities:**

**`notificationService.js`:**
- `requestPermission()` → calls `Notification.requestPermission()`, stores result in `NotificationSettings`
- `getPermissionState()` → returns current `Notification.permission`
- `sendNotification(payload: NotificationPayload)` → dispatches browser notification via `ServiceWorkerRegistration.showNotification()`
- `cancelNotifications(duePaymentId: string)` → no-op in MVP (browser notifications can't be cancelled programmatically after dispatch; this resets the `notified*` flags on the due payment record so no future notifications fire)
- `sendTestNotification()` → sends a sample notification for user to verify

**`scheduler.js`:**
- `runDailyCheck()` — called on app open and by SW periodic sync:
  1. Loads all non-deleted, non-paid due payments via `DuePaymentService.listDuePayments()`
  2. For each, calls `shouldNotifyLeadDay / shouldNotifyDueDay / shouldNotifyOverdue` (from AGENT-DUES `dueStatus.js`)
  3. For any that return true: calls `sendNotification(buildPayload(duePayment, type))`
  4. Updates `notifiedLeadDay / notifiedDueDay / notifiedOverdue` flags on the record via `StorageService.update()`
  5. Skips if `NotificationSettings.enabled === false` or permission not granted
- `buildPayload(duePayment, type)` → returns `NotificationPayload`

**`settings.js`:**
- `getSettings()` → returns `NotificationSettings` singleton from storage
- `updateSettings(changes)` → updates and persists settings
- `initSettings()` → creates default settings record if none exists

**Notification Payload Shape:**
```javascript
NotificationPayload {
  title: string       // "Payment Due in 5 Days" | "Payment Due Today!" | "Payment Overdue!"
  body:  string       // "[Vendor] — ₹[Amount] — [Category]"
  icon:  string       // '/icons/icon-192.png'
  tag:   string       // `due-${duePaymentId}-${type}` — prevents duplicate OS notifications
  data:  { url: '/dues', duePaymentId: string }
}
```

**Must NOT:**
- Contain due-date logic (that belongs to AGENT-DUES `dueStatus.js`)
- Render UI components
- Import from `src/ui/` or `src/reports/`
- Call `ExpenditureService` or modify expenditure records

**Exported API Contract:**
```javascript
// src/notifications/notificationService.js
export const NotificationService = {
  requestPermission(): Promise<NotificationPermission>
  getPermissionState(): NotificationPermission
  sendNotification(payload: NotificationPayload): Promise<void>
  cancelNotifications(duePaymentId: string): void
  sendTestNotification(): Promise<void>
}

// src/notifications/scheduler.js
export const runDailyCheck(): Promise<void>

// src/notifications/settings.js
export const NotificationSettingsService = {
  getSettings(): NotificationSettings
  updateSettings(changes: Partial<NotificationSettings>): NotificationSettings
  initSettings(): void
}
```

**Tests:** `tests/notifications/` — mock `Notification` API. Test: `runDailyCheck` fires notification for a due payment due in exactly `reminderLeadDays` days; does not double-fire if `notifiedLeadDay` is already true; skips paid payments; skips if disabled.

---

### AGENT-UI — UI Agent

**Owns:** `src/ui/`

**Mission:** Build every visual component and page. Own the entire user experience.

**Responsibilities:**

**Pages:**
- `DashboardPage` — summary cards + recent transactions + charts + **DuePaymentWidget**
- `ExpensesPage` — full filterable/searchable table of all expenditures
- `AddEditPage` — form for creating or editing an expenditure
- `DuesPage` — **NEW** — tabbed Pending/Paid/All view of due payments
- `AddEditDuePage` — **NEW** — form for creating or editing a due payment
- `CategoriesPage` — manage custom categories
- `SettingsPage` — backup/restore, storage usage, **notification settings**

**Shared Components:**
- `ExpenseForm` — controlled form with all fields, validation display
- `ExpenseTable` — sortable table with pagination
- `ExpenseCard` — mobile-optimized single record view
- `CategoryPill` — colored label showing category name + icon
- `AmountDisplay` — formats numbers as ₹ with Indian numbering (1,00,000)
- `DatePicker` — minimal date input with presets
- `ConfirmDialog` — reusable confirmation modal
- `EmptyState` — illustrated empty state for zero-record views
- `StorageWarning` — banner shown when storage > 80%
- **`DuePaymentCard`** — card showing title, vendor, amount, due date, days remaining, priority badge, "Mark as Paid" button
- **`DuePaymentWidget`** — dashboard widget: overdue count/total (red), due soon count/total (amber)
- **`MarkAsPaidSheet`** — bottom sheet / modal with pre-filled expenditure fields for review before confirming payment
- **`NotificationPermissionBanner`** — non-intrusive banner shown when permission not yet granted
- **`PriorityBadge`** — Low / Medium / High colored badge
- **`DaysRemainingPill`** — shows "in 3 days", "today", "2 days overdue" with appropriate color

**Design System:**
- CSS custom properties in `styles/tokens.css`
- Color palette: warm neutrals, deep teal accent, red for overdue, amber for due soon, green for paid
- Typography: `Sora` (headings) + `DM Sans` (body)
- Mobile-first breakpoints: 360px / 768px / 1200px
- All interactive elements must have `:focus-visible` styles

**Must NOT:**
- Call `StorageService` directly — go through domain services
- Contain business or validation logic
- Import from `src/data/` or `src/reports/` internals

**Dependency Rule:** AGENT-UI imports from `src/domain/`, `src/dues/`, `src/notifications/` only.

**Accessibility Requirements:**
- All form inputs have visible labels
- Color is never the sole indicator of meaning (overdue items also have icon + text label)
- Keyboard navigable throughout
- Screen reader announcements on save/delete/mark-as-paid

**Tests:** Component tests for `ExpenseForm`, `DuePaymentCard` (status rendering), `MarkAsPaidSheet` (pre-fill and confirm), `ConfirmDialog`.

---

### AGENT-REPORTS — Reports Agent

**Owns:** `src/reports/`

**Mission:** All data transformation for charts, filters, search, and exports.

**Responsibilities:**

**Charts (`charts.js`):**
- `CategoryDonutChart` — spend by category for a date range
- `MonthlyBarChart` — last 12 months total spend
- `SparklineTrend` — small inline trend for dashboard summary cards
- **`DuesByStatusChart`** — simple summary bar: overdue / due soon / upcoming counts

**Filters (`filters.js`):**
- `FilterPanel` — composable filter component
- `applyFilters(expenditures, filterState)` — pure function
- `useDatePresets()` — hook returning named presets
- **`applyDueFilters(duePayments, filterState)`** — filters due payments by category, priority, date range, status

**Search (`filters.js`):**
- `searchExpenditures(expenditures, query)` — searches vendor, notes, receiptId
- **`searchDuePayments(duePayments, query)`** — searches title, vendor, notes

**Export (`export.js`):**
- `exportToCSV(expenditures)` — existing CSV export
- **`exportDuesToCSV(duePayments)`** — CSV with columns: Title, Vendor, Amount (₹), Due Date, Status, Priority, Category, Payment Method, Paid At, Notes
- `exportToJSON(expenditures)` — full data backup (update to also include due payments)

**Must NOT:**
- Write to storage
- Contain routing or page-level layout
- Import from `src/ui/`

**Updated Exported API Contract:**
```javascript
// src/reports/filters.js
export const applyFilters(expenditures: Expenditure[], filters: FilterState): Expenditure[]
export const applyDueFilters(duePayments: DuePayment[], filters: DueFilterState): DuePayment[]
export const searchExpenditures(expenditures: Expenditure[], query: string): Expenditure[]
export const searchDuePayments(duePayments: DuePayment[], query: string): DuePayment[]

// src/reports/export.js
export const exportToCSV(expenditures: Expenditure[], filename?: string): void
export const exportDuesToCSV(duePayments: DuePayment[], filename?: string): void
export const exportToJSON(data: { expenditures: Expenditure[], duePayments: DuePayment[] }): void
```

**Tests:** Add tests for `applyDueFilters`, `searchDuePayments`, `exportDuesToCSV`.

---

### AGENT-INFRA — Infrastructure Agent

**Owns:** `public/sw.js`, `vite.config.js`, `.env` files, `public/manifest.json`

**Mission:** Make the app deployable, fast, offline-capable, and notification-ready.

**Responsibilities:**
- Configure build tooling (Vite recommended)
- Implement service worker with cache-first strategy for app shell assets
- Ensure offline fallback for all static assets
- Configure PWA manifest for "Add to Home Screen"
- Set up `index.html` with correct meta tags, font preloads, and viewport config
- **Implement SW `notificationclick` handler**: on notification click, open/focus app at `event.notification.data.url`
- **Implement SW `periodicsync` handler** (where supported): calls `runDailyCheck()` imported from `src/notifications/scheduler.js` so notifications fire even when app tab is closed
- **Implement SW `push` handler** as no-op stub (server push not in MVP, but SW must handle the event to avoid errors)
- Configure production build output to `dist/`

**Must NOT:**
- Contain business logic, UI components, or data logic
- Modify anything in `src/` except importing from `src/notifications/scheduler.js` for the periodic sync handler

**Checklist:**
- [ ] App shell cached on first load
- [ ] Works fully offline after first visit
- [ ] Lighthouse PWA score ≥ 90
- [ ] Build output < 250KB gzipped
- [ ] `notificationclick` opens correct URL
- [ ] `periodicsync` calls `runDailyCheck()` (graceful no-op if API unsupported)

**Tests:** Manual verification checklist; no unit tests for SW (integration tested via AGENT-ORCH).

---

### AGENT-ORCH — Orchestrator Agent

**Owns:** `src/app.js`, `tests/integration/`

**Mission:** Wire all agents together. Write integration tests that verify the full system works end-to-end.

**Responsibilities:**
- Bootstrap the React app: initialize storage → run migrations → init notification settings → load categories → render router
- Define client-side routes:
  - `/` → DashboardPage
  - `/expenses` → ExpensesPage
  - `/expenses/new` → AddEditPage
  - `/expenses/:id/edit` → AddEditPage
  - `/dues` → DuesPage
  - `/dues/new` → AddEditDuePage
  - `/dues/:id/edit` → AddEditDuePage
  - `/categories` → CategoriesPage
  - `/settings` → SettingsPage
- Run `StorageService` migrations on startup
- Call `NotificationSettingsService.initSettings()` on startup
- Call `runDailyCheck()` on app open (after permission check)
- Listen for `storage:warning` events and show `<StorageWarning />`
- **Dependency injection for AGENT-DUES**: inject `ExpenditureService.createExpenditureFromDue` into `DuePaymentService.markAsPaid` at bootstrap to avoid circular imports between `src/domain/` and `src/dues/`

**Integration Tests (add to existing):**
- Add due payment → verify appears in `/dues` list with correct status
- Mark due payment as paid → verify expenditure created + due payment status = paid + dashboard totals updated
- Notification check: due payment due in exactly 5 days → `runDailyCheck()` → verify `showNotification` called with correct payload
- Notification idempotency: run `runDailyCheck()` twice → notification fires only once
- Due payment overdue → verify dashboard widget shows red badge with correct count and total
- Export dues CSV → verify correct columns and paid status

**Must NOT:**
- Contain business logic
- Directly touch localStorage
- Duplicate logic from any other agent

---

## Inter-Agent Dependency Graph

```
AGENT-INFRA
    └── (provides runtime environment + SW notification handlers)
         └── AGENT-ORCH
              ├── AGENT-UI
              │    ├── AGENT-DOMAIN
              │    │    └── AGENT-DATA
              │    ├── AGENT-DUES
              │    │    ├── AGENT-DATA
              │    │    └── (ExpenditureService injected by AGENT-ORCH)
              │    └── AGENT-NOTIFY
              │         ├── AGENT-DATA
              │         └── AGENT-DUES (dueStatus.js only)
              └── AGENT-REPORTS
                   ├── AGENT-DOMAIN
                   │    └── AGENT-DATA
                   └── AGENT-DUES (read-only list access)
```

**Rules:**
1. Dependencies only flow **downward** in this graph
2. No circular imports — ever
3. AGENT-UI and AGENT-REPORTS are siblings — they must not import from each other
4. AGENT-DUES and AGENT-DOMAIN are siblings — AGENT-DUES must not import from `src/domain/expenditure.js` directly; use injected reference
5. AGENT-NOTIFY imports `dueStatus.js` from AGENT-DUES for `shouldNotify*` functions — no other AGENT-DUES imports
6. All cross-agent communication through exported function calls, not shared mutable state

---

## Shared Types

All agents share these type definitions (use JSDoc in plain JS). Lives in `src/domain/schema.js` (owned by AGENT-DOMAIN):

```javascript
/**
 * @typedef {Object} Expenditure
 * @property {string} id
 * @property {string} date
 * @property {number} amount
 * @property {string} categoryId
 * @property {string} vendor
 * @property {'cash'|'upi'|'bank_transfer'|'card'|'other'} paymentMethod
 * @property {string} [notes]
 * @property {string} [receiptId]
 * @property {string|null} duePaymentId
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {boolean} deleted
 */

/**
 * @typedef {Object} DuePayment
 * @property {string} id
 * @property {string} title
 * @property {number} amount
 * @property {string} dueDate
 * @property {string} categoryId
 * @property {string} vendor
 * @property {'cash'|'upi'|'bank_transfer'|'card'|'other'|null} paymentMethod
 * @property {string} [notes]
 * @property {'low'|'medium'|'high'} priority
 * @property {number} reminderLeadDays
 * @property {string|null} paidAt
 * @property {string|null} linkedExpenditureId
 * @property {boolean} notifiedLeadDay
 * @property {boolean} notifiedDueDay
 * @property {boolean} notifiedOverdue
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {boolean} deleted
 */

/**
 * @typedef {'upcoming'|'due_soon'|'overdue'|'paid'} DuePaymentStatus
 * Note: status is computed at read time via computeStatus(), never stored.
 */

/**
 * @typedef {Object} NotificationSettings
 * @property {'singleton'} id
 * @property {boolean} enabled
 * @property {number} defaultLeadDays
 * @property {'default'|'granted'|'denied'} permissionState
 */

/**
 * @typedef {Object} DueSummary
 * @property {number} overdueCount
 * @property {number} overdueTotal
 * @property {number} dueSoonCount
 * @property {number} dueSoonTotal
 * @property {number} upcomingCount
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {boolean} isCustom
 * @property {boolean} archived
 */

/**
 * @typedef {Object} FilterState
 * @property {string} [dateFrom]
 * @property {string} [dateTo]
 * @property {string[]} [categoryIds]
 * @property {string[]} [paymentMethods]
 * @property {number} [amountMin]
 * @property {number} [amountMax]
 * @property {string} [searchQuery]
 */

/**
 * @typedef {Object} DueFilterState
 * @property {string[]} [categoryIds]
 * @property {('low'|'medium'|'high')[]} [priorities]
 * @property {string} [dateFrom]
 * @property {string} [dateTo]
 * @property {DuePaymentStatus[]} [statuses]
 * @property {string} [searchQuery]
 */
```

---

## Coding Standards

| Rule | Rationale |
|------|-----------|
| ES Modules only (`import`/`export`) | Consistent module system |
| No default exports except React components | Explicit imports aid refactoring |
| Pure functions preferred; side effects isolated | Easier testing |
| All monetary amounts stored as integers (paise) internally | Avoid floating-point errors |
| Dates stored as `YYYY-MM-DD` strings | Timezone-safe |
| `status` on DuePayment is always computed, never stored | Single source of truth |
| Notification flags (`notifiedLeadDay` etc.) are stored booleans | Prevent duplicate notifications |
| No `console.log` in production code | Use a thin logger wrapper |
| All user-facing strings in `strings.js` | Prep for i18n |

---

## Testing Protocol

```
Unit tests:    Co-located or in tests/<agent-folder>/
Integration:   tests/integration/ (owned by AGENT-ORCH)
Coverage goal: 80% minimum; 100% on validators, business rules, status computation, notification trigger logic
Test runner:   Vitest (preferred) or Jest
```

No agent ships code with failing tests.

---

## Definition of Done (Per Agent)

An agent's work is complete when:
- [ ] All features listed in its **Responsibilities** are implemented
- [ ] All exported API contracts match the spec in this file
- [ ] Unit tests pass with ≥ 80% coverage
- [ ] No imports from out-of-bounds modules
- [ ] Code reviewed against the PRD v2 feature list
- [ ] AGENT-ORCH integration tests pass for this agent's slice

---

## Orchestration Sequence (Build Order)

```
Phase 1 (Parallel):  AGENT-DATA + AGENT-INFRA
Phase 2 (Parallel):  AGENT-DOMAIN + AGENT-DUES   (both depend on AGENT-DATA)
Phase 3:             AGENT-NOTIFY   (depends on AGENT-DUES dueStatus.js)
Phase 4 (Parallel):  AGENT-UI + AGENT-REPORTS   (both depend on Phase 2+3)
Phase 5:             AGENT-ORCH   (integrates everything)
```

---

*Any agent that cannot fulfill its responsibilities due to an unclear spec must raise a question in a `QUESTIONS.md` file at the repo root — not make assumptions silently.*
