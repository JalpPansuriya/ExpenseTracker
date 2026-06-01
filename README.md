# 🪡 HisabTracker

HisabTracker is a modern, lightweight, offline-first **Progressive Web App (PWA)** custom-tailored for embroidery businesses, designers, boutique merchants, and manufacturing artisans to record expenditures, schedule due payments, register vendors, and track business financial analytics in real-time.

Built with **React 19**, **Vite 8**, and **IndexedDB**, HisabTracker stores all database records securely on the client machine and functions completely offline without requiring server configurations or cloud databases.

---

## 🚀 Core Features & Functions

### 1. 📊 Financial & Analytics Reports (`/reports`)
A comprehensive dashboard equipped with interactive data visualization tools to analyze revenue patterns and expenditures.
*   **Global Baseline Filters**: A top control card to set baseline parameters across all charts simultaneously:
    *   *Date Range Presets*: This Month, Last Month, Last 3 Months, Last 6 Months, This Year, and Custom Date Range.
    *   *Flow Type Toggle*: Filter all metrics by **Incoming** (Income), **Outgoing** (Expenses), or **All Flow**.
*   **Independent Local Filters**: Tweak filters on individual charts independently without affecting others.
*   **📸 Retina-Quality PNG Export**: Every chart features an "Export PNG" button that compiles the chart's SVG, fills background layers to ensure readability in dark/light modes, scales the drawing element by `2x` for crisp high-resolution displays, and downloads the dated file.
*   **Custom Chart Library**:
    1.  **Spending by Category**: Donut chart representing expense/revenue percentage distributions, colored dynamically by category.
    2.  **Monthly Cash Flow**: Side-by-side grouped bar chart comparing monthly Incoming Revenue vs Outgoing Expenses for a selected calendar year.
    3.  **Daily Spending Trend**: Smooth timeline line chart tracing day-by-day outlays for a selected month, ensuring days with zero spend are clearly plotted to form a continuous trend.
    4.  **Top 10 Vendors**: Grouped horizontal bar chart ranking vendors by transaction size. Vendor identifiers are dynamically resolved via `VendorService` to actual names.
    5.  **Due Payments Summary**: Dual Y-axis bar chart comparing total pending counts (left axis) and rupee sums (right axis) categorized by status (*Overdue*, *Due Soon*, *Upcoming*).

### 2. 💵 Transaction Logs (`/expenses`)
An exhaustive records journal to manage daily business ledger items:
*   Add, edit, or soft-delete transactions.
*   Segment entries by Flow (Incoming / Outgoing).
*   Filter by date preset range, amount scale, payment method (Cash, UPI, Bank Transfer, Card, Other), and custom categories.
*   Filter via quick text search queries mapping vendor names, receipts, or notes.
*   **📤 Export CSV**: Package and export selected data tables directly into a `.csv` spreadsheet.

### 3. 📅 Due Payments Calendar (`/dues`)
Track and schedule upcoming business payments (e.g. materials shipments, machine service schedules, labor payrolls):
*   Classify statuses automatically relative to due dates:
    *   `🔴 Overdue` — Payments whose due date has passed.
    *   `🟡 Due Soon` — Payments within the configured lead days window.
    *   `🔵 Upcoming` — Payments due further in the future.
    *   `🟢 Paid` — Dues settled.
*   **⚡ Single-Click Payment Settlement**: Mark any due item as "Paid" to open a slide-up sheet. It validation-checks and executes an atomic database transaction that registers an expenditure entry in the ledger and closes the due record simultaneously.

### 4. 🤝 Vendor Registry (`/vendors`)
Manage supply chain partners and customer accounts in one place:
*   Profile details including name, business type (Supplier, Customer, or Both), phone, email, and description.
*   Live metric stat cards computing total spent, total received, and total transaction volumes per vendor.

### 5. 🧵 Category System (`/categories`)
*   Seed pre-loaded categories (e.g., *Thread & Yarn*, *Fabric & Base*, *Machine Maintenance*, *Labor*, *Bulk Orders*).
*   Add customizable categories tagged with custom emoji icons.
*   Archive outdated categories to keep form selections clutter-free.

### 6. 💾 Scheduled & Manual Backup Registry
Ensure your business records are never lost:
*   **⏱️ Automatic 7-Day Backups**: On application startup, the system checks the database for the last run timestamp. If 7 days have passed (or it is the first time the app is run), the app automatically triggers a JSON backup download named `HisabTracker-Backup-YYYY-MM-DD-HH-MM.json`.
*   **⚡ Manual Backup Button**: Go to settings and click **"Download Backup Now"** to instantly download your timestamped database backup and reset the scheduler timer.
*   **📥 Import & Restore**: Restore your entire categories, expenditures, vendors, and dues history from any previously exported `.json` backup file.
*   **🔔 Premium Toast Alerts**: Event-driven custom alert cards slide up at the screen's bottom layout, offset dynamically to float cleanly above the mobile nav tab bar.

---

## 🛠️ Technology Stack & Optimization

*   **Core**: React 19, ES6+ Javascript, Vanilla CSS.
*   **Bundler**: Vite 8 with Rolldown compilation engine.
*   **Offline persistence**: HTML5 IndexedDB using `idb` wrapper.
*   **Data Visualization**: Recharts library.
*   **Progressive Web App (PWA)**: Built with `vite-plugin-pwa` employing custom `injectManifest` service workers for offline caching.
*   **⚡ Performance Code Splitting**: To keep page loads instantaneous and lightweight, we configured custom compiler chunks. All chart libraries and sub-modules (`recharts`, `d3-*`, `lodash`) are isolated into a separate vendor chunk. This keeps the main application bundle size at an ultra-lean **365.81 kB**, way below standard production budgets.

---

## 📦 Local Setup & Development

Follow these steps to run HisabTracker on your local machine:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/JalpPansuriya/ExpenseTracker.git
    cd ExpenseTracker
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open your browser and navigate to the printed address (usually `http://localhost:5173`). Service workers are disabled by default in development mode to avoid localhost port caching.

4.  **Production Compilation (Build & Minify)**:
    ```bash
    npm run build
    ```
    This builds the production build inside the `/dist` directory. The main bundle size will remain below 400KB, and service worker `dist/sw.js` is generated automatically.
