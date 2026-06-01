# PRD: Embroidery Business Expenditure Tracker
**Version:** 2.0  
**Status:** Draft  
**Owner:** Business Owner  
**Last Updated:** 2026-06-01  
**Changelog:** Added Due Payments module (FR-16–FR-22), Notification System (FR-23–FR-26), updated data model, user flows, and milestones.

---

## 1. Overview

### 1.1 Problem Statement
Embroidery business owners manage a diverse mix of recurring and one-time payments — thread stock, machine maintenance, fabric supplies, outsourced labor, shipping, and more. Without a centralized tracking tool, expenses get lost across receipts, spreadsheets, and memory. Additionally, upcoming dues (supplier credit, machine EMIs, vendor advances) are missed because there is no proactive reminder system, causing late fees, damaged supplier relationships, and cash-flow surprises.

### 1.2 Goal
Build a simple, focused **Expenditure Tracking App** tailored to the needs of an embroidery business. It should record every payment, track upcoming dues with deadlines, send proactive browser notifications before due dates, categorize everything meaningfully, and provide at-a-glance reporting — with zero accounting background required.

### 1.3 Success Metrics
| Metric | Target |
|--------|--------|
| Time to log a payment | < 30 seconds |
| Time to log a due payment | < 45 seconds |
| Monthly report generation | 1-click |
| Data accuracy (no lost entries) | 100% |
| User onboarding time | < 5 minutes |
| Due date notification lead time | 5 days before (configurable) |

---

## 2. Users & Context

### 2.1 Primary User
- **Solo embroidery business owner or small team (1–5 people)**
- Non-technical; comfortable with smartphones and basic web apps
- Logs expenses daily or weekly
- Needs reminders for supplier credit payments, machine EMIs, utility bills
- Needs reports for tax filing and business review

### 2.2 Secondary Users
- Accountant or bookkeeper who reviews exported reports
- Business partner who checks spending summaries

---

## 3. Scope

### 3.1 In Scope (MVP)
- Add, edit, delete expenditure records
- **Add, edit, delete due payment records with deadline tracking**
- **Mark due payments as paid (converts to expenditure record)**
- **5-day (configurable) browser push notifications for upcoming dues**
- **Due payments dashboard: overdue, due soon, upcoming**
- Categorize payments (materials, labor, equipment, shipping, utilities, misc)
- Attach notes and optional receipt reference
- View dashboard: total spend, spend by category, monthly trend
- Filter/search by date range, category, amount
- Export data to CSV

### 3.2 Out of Scope (v1)
- Invoice generation
- Income/revenue tracking
- Multi-currency support
- Bank account integration
- Mobile native app (web-first)
- Team roles/permissions
- SMS/email notifications (browser push only in MVP)
- Recurring due payment auto-generation (manual entry only in MVP)

---

## 4. Feature Requirements

### 4.1 Payment Entry

**FR-01 — Add Expenditure**
- Fields: Date, Amount (INR), Category, Vendor/Payee name, Payment Method (Cash / UPI / Bank Transfer / Card), Notes (optional), Receipt ID (optional)
- Validation: Date and Amount are required; Amount must be a positive number
- Default date: today

**FR-02 — Edit Expenditure**
- Any field editable post-save
- Changes logged with last-modified timestamp

**FR-03 — Delete Expenditure**
- Soft delete with confirmation dialog
- Recoverable within same session; permanent after session close

**FR-04 — Bulk Import**
- CSV upload with column mapping UI
- Preview before confirming import

---

### 4.2 Categories

**FR-05 — Default Categories**
Pre-loaded categories specific to embroidery:
- Thread & Yarn
- Fabric & Base Material
- Machine Maintenance & Repair
- Equipment Purchase
- Outsourced Labor / Tailoring
- Packaging & Shipping
- Utilities (electricity, water)
- Software & Subscriptions
- Marketing & Advertising
- Miscellaneous

**FR-06 — Custom Categories**
- User can add, rename, or archive custom categories
- Archived categories remain visible on historical records

---

### 4.3 Dashboard & Reporting

**FR-07 — Summary Dashboard**
- Total spend: this month, last month, year-to-date
- Top 3 spending categories (current month)
- Recent 5 transactions
- **Due Payments summary widget: count of overdue + due within 7 days + total amount at risk**

**FR-08 — Category Breakdown**
- Pie/donut chart: spend by category for selected period
- Sortable table below chart

**FR-09 — Monthly Trend**
- Bar chart: month-by-month total expenditure (last 12 months)

**FR-10 — Filters**
- Date range picker (presets: This Week, This Month, Last Month, This Year, Custom)
- Category multi-select
- Payment method filter
- Amount range filter (min/max)

**FR-11 — Search**
- Full-text search across vendor name, notes, receipt ID
- **Search also covers due payment vendor names and notes**

---

### 4.4 Export

**FR-12 — CSV Export**
- Exports all filtered/visible records
- Columns: Date, Amount, Category, Vendor, Payment Method, Notes, Receipt ID, Created At
- **Separate export option for due payments: includes Due Date, Status, Days Overdue**

**FR-13 — Print / PDF View**
- Clean print stylesheet for monthly summary report
- **Print view includes pending dues section**

---

### 4.5 Data Persistence

**FR-14 — Local Storage (MVP)**
- Data stored in browser localStorage for zero-setup deployment
- Warning shown when storage > 80% of 5MB limit

**FR-15 — Data Backup**
- Manual export to JSON for full backup (includes due payments)
- Manual import/restore from JSON backup

---

### 4.6 Due Payments

**FR-16 — Add Due Payment**
- Fields:
  - **Title** (required, max 100 chars) — e.g. "Thread supplier invoice #42"
  - **Amount** (INR, required, positive)
  - **Due Date** (required) — the deadline by which payment must be made
  - **Category** (required, same category list as expenditures)
  - **Vendor/Payee** (required, max 100 chars)
  - **Payment Method** (optional, same enum as expenditures)
  - **Notes** (optional, max 500 chars)
  - **Priority** — Low / Medium / High (default: Medium)
  - **Reminder Lead Days** (default: 5, configurable per due payment, range 1–30)
- Validation: Title, Amount, Due Date, Category, Vendor are required
- Default Due Date: 7 days from today

**FR-17 — Edit Due Payment**
- All fields editable while status is Pending or Overdue
- Cannot edit a due payment that has been marked Paid

**FR-18 — Delete Due Payment**
- Soft delete with confirmation
- Recoverable within same session

**FR-19 — Mark as Paid**
- One-tap "Mark as Paid" action on any Pending/Overdue due payment
- On confirmation:
  - Creates a corresponding **Expenditure record** (pre-filled from due payment fields; user can review and adjust amount/date before confirming)
  - Updates due payment status to `paid`
  - Records `paidAt` timestamp
- Paid due payments are archived but remain visible in history

**FR-20 — Due Payment Status**
Statuses are computed automatically from due date:
| Status | Condition |
|--------|-----------|
| `upcoming` | Due date > today + reminder lead days |
| `due_soon` | Due date is within reminder lead days (default: ≤ 5 days from today) |
| `overdue` | Due date < today AND status is not paid |
| `paid` | Marked as paid by user |

**FR-21 — Due Payments Page**
- Separate page at `/dues`
- Three tabs: **Pending** (upcoming + due_soon + overdue), **Paid**, **All**
- Within Pending tab, sections:
  - 🔴 Overdue (sorted by most overdue first)
  - 🟡 Due Soon (within reminder lead days, sorted by earliest first)
  - 🔵 Upcoming (sorted by earliest first)
- Each card shows: Title, Vendor, Amount, Due Date, Days remaining/overdue, Priority badge, quick "Mark as Paid" button
- Filters: Category, Priority, Date range
- Search: vendor name, title, notes

**FR-22 — Due Payments in Dashboard**
- Dashboard widget showing:
  - Count + total ₹ of overdue payments (red)
  - Count + total ₹ of due within 7 days (amber)
  - "View All Dues" link → `/dues`

---

### 4.7 Notifications

**FR-23 — Browser Notification Permission**
- On first app load (or first time navigating to Settings), prompt user to enable browser notifications
- Show clear explanation: "Get reminders 5 days before a payment is due"
- If denied, show non-intrusive in-app banner as fallback reminder instead
- Store permission state; do not re-prompt if already granted or permanently denied

**FR-24 — Notification Trigger Rules**
- Notifications are checked and dispatched by a **service worker background sync** (runs when app is open OR when browser wakes the SW)
- Check schedule: once per day (on app open, plus SW periodic sync if available)
- A notification is sent when:
  - A due payment's due date is exactly **N days away** (N = `reminderLeadDays` for that record; default 5)
  - AND the due payment status is `pending` or `due_soon` (not paid, not already notified for this lead day)
- Additionally, a **day-of reminder** is sent on the actual due date if still unpaid
- **Overdue escalation**: if payment is overdue by 1 day, send one overdue notification
- Notifications are not repeated for the same trigger event (tracked via `notifiedAt` flags on the record)

**FR-25 — Notification Content**
Each notification includes:
- **Title**: "Payment Due in [N] Days" or "Payment Overdue!"
- **Body**: "[Vendor] — ₹[Amount] — [Category]"
- **Icon**: App icon
- **Actions** (where browser supports): "Mark as Paid", "View"
- Clicking notification opens the app at `/dues`

**FR-26 — Notification Settings**
In the Settings page:
- Toggle: Enable/Disable all notifications
- Global default reminder lead days (1–30, default 5)
- Option to test notifications ("Send a test notification")
- List of due payments with individual reminder lead day overrides

---

## 5. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | App loads in < 2 seconds on a standard mobile connection |
| NFR-02 | Works offline after first load (service worker caching) |
| NFR-03 | Responsive: usable on mobile (360px+) and desktop |
| NFR-04 | No login required for MVP (single-user local app) |
| NFR-05 | All monetary values stored and displayed in INR (₹) |
| NFR-06 | WCAG 2.1 AA accessibility minimum |
| NFR-07 | Notifications must not fire more than once per trigger event per due payment |
| NFR-08 | Notification permission request must not block app usage |

---

## 6. Data Model

```
Expenditure {
  id:              UUID (auto)
  date:            ISO 8601 date string
  amount:          number (positive, 2 decimal places)
  category:        string (FK → Category.id)
  vendor:          string (max 100 chars)
  paymentMethod:   enum [cash, upi, bank_transfer, card, other]
  notes:           string (optional, max 500 chars)
  receiptId:       string (optional, max 50 chars)
  duePaymentId:    string | null   ← set if created from a due payment via "Mark as Paid"
  createdAt:       ISO 8601 datetime
  updatedAt:       ISO 8601 datetime
  deleted:         boolean (default false)
}

Category {
  id:       UUID
  name:     string
  icon:     emoji string
  isCustom: boolean
  archived: boolean
}

DuePayment {
  id:               UUID (auto)
  title:            string (max 100 chars)
  amount:           number (positive, 2 decimal places)
  dueDate:          ISO 8601 date string
  categoryId:       string (FK → Category.id)
  vendor:           string (max 100 chars)
  paymentMethod:    enum [cash, upi, bank_transfer, card, other] | null
  notes:            string (optional, max 500 chars)
  priority:         enum [low, medium, high] (default: medium)
  status:           enum [upcoming, due_soon, overdue, paid]  ← computed, not stored
  reminderLeadDays: number (1–30, default: 5)
  paidAt:           ISO 8601 datetime | null
  linkedExpenditureId: string | null   ← set after Mark as Paid
  notifiedLeadDay:  boolean (default false)  ← true once lead-day notification sent
  notifiedDueDay:   boolean (default false)  ← true once due-day notification sent
  notifiedOverdue:  boolean (default false)  ← true once overdue notification sent
  createdAt:        ISO 8601 datetime
  updatedAt:        ISO 8601 datetime
  deleted:          boolean (default false)
}

NotificationSettings {
  id:                  'singleton'   ← only one record
  enabled:             boolean (default true)
  defaultLeadDays:     number (default 5)
  permissionState:     enum [default, granted, denied]
}
```

---

## 7. User Flows

### 7.1 Log a Payment (Happy Path)
1. User opens app → lands on Dashboard
2. Taps **+ Add Expense** button
3. Fills: Amount → Category → Vendor → Date (auto-filled) → Payment Method
4. Taps **Save**
5. Entry appears in Recent Transactions; totals update instantly

### 7.2 Monthly Review
1. User selects **This Month** filter on Dashboard
2. Views category breakdown chart and total
3. Taps **Export CSV** → downloads file
4. Shares with accountant

### 7.3 Find a Specific Payment
1. User taps search bar, types vendor name or amount
2. Filtered list appears in real time
3. User taps entry to view/edit details

### 7.4 Add a Due Payment
1. User navigates to `/dues` or taps **+ Add Due** from dashboard widget
2. Fills: Title → Amount → Due Date → Category → Vendor → Priority → Reminder Lead Days
3. Taps **Save**
4. Due payment appears in Pending list under correct section (Upcoming / Due Soon / Overdue)
5. Notification is scheduled for N days before due date

### 7.5 Mark a Due Payment as Paid
1. User taps **Mark as Paid** on a due payment card
2. A confirmation sheet appears showing pre-filled expenditure fields (amount, category, vendor)
3. User can adjust date and payment method, then taps **Confirm Payment**
4. Expenditure record is created; due payment moves to Paid tab
5. Dashboard totals update; notification for this due payment is cancelled

### 7.6 Receive a Due Date Notification
1. Browser/service worker fires notification: "Payment Due in 5 Days — Stitchworld Supplies — ₹4,500 — Thread & Yarn"
2. User taps notification → app opens at `/dues`
3. User sees the highlighted due payment, taps **Mark as Paid** or dismisses

### 7.7 Handle Overdue Payment
1. User opens app; dashboard widget shows red badge: "2 Overdue — ₹12,400"
2. User navigates to `/dues` → Overdue section
3. User either marks as paid or edits due date to reschedule

---

## 8. UI/UX Principles

- **Speed first**: The add-expense flow must be completable in under 30 seconds
- **Embroidery-native**: Default categories, icons, and language should feel natural to the craft
- **No jargon**: Use plain language — "Payment" not "Ledger Entry", "Vendor" not "Counterparty"
- **Mobile-first layout**: Primary actions reachable with one thumb
- **Immediate feedback**: Totals and charts update the moment a record is saved
- **Urgency at a glance**: Overdue items are always visually distinct (red) and surfaced prominently

---

## 9. Milestones

| Milestone | Deliverable | Target |
|-----------|-------------|--------|
| M1 — Foundation | Data model (expenditures + due payments + notification settings), storage layer, add/edit/delete flows for both | Week 1 |
| M2 — Dashboard | Summary cards, category chart, trend chart, due payments widget | Week 2 |
| M3 — Due Payments Page | Pending/Paid tabs, status sections, Mark as Paid flow | Week 2 |
| M4 — Notifications | Service worker notification dispatch, permission UI, settings page | Week 3 |
| M5 — Filters & Search | All filter/search functionality (expenditures + dues) | Week 3 |
| M6 — Export | CSV export (both types), JSON backup/restore | Week 3 |
| M7 — Polish | Responsive design, offline support, accessibility | Week 4 |

---

## 10. Open Questions

- [ ] Should the app eventually support income tracking to compute net profit?
- [ ] Is GST tracking needed (input tax credit on supplies)?
- [ ] Should recurring due payments (e.g., monthly machine rental) be auto-generated?
- [ ] Future: cloud sync / multi-device support?
- [ ] Should overdue payments accrue a configurable late-fee field?

---

*This PRD is a living document. Update version number and status with each revision.*
