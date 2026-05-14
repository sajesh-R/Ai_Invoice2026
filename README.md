# 🧾 Invoice Pro – Premium Multi-Client Invoicing Hub

Invoice Pro is a state-of-the-art, high-performance **full-stack invoicing system** engineered with **React, Tailwind CSS, Node.js, Express, and PostgreSQL**. 

This system features an automated billing and distribution pipeline: creating invoices, auto-calculating regional GST/VAT, compiling pixel-perfect PDFs using a headless browser engine, storing files securely, and sending single-click email notifications to clients with PDF attachments.

---

## 🚀 Architectural Blueprint

The codebase is organized into independent services, matching the folder alignment of your previous LMS project:

```text
invoice generator/
├── backend/                       # Node.js + Express API
│   ├── config/                    # Postgres pool & Cloudinary configurations
│   ├── controllers/               # Auth, Client, Invoice, Payment, Recurring controllers
│   ├── middleware/                # JWT verification gateways
│   ├── models/                    # SQL DB creation schema (schema.sql)
│   ├── routes/                    # Protected and public REST endpoints
│   ├── server/                    # App initialization (server.js)
│   ├── services/                  # Puppeteer, Email, Node Cron schedulers
│   ├── uploads/                   # Local folder for PDF fallbacks
│   ├── package.json
│   └── .env                       # Backend local environment keys
├── frontend/                      # React + Vite client app
│   ├── public/                    # Index.html entry
│   ├── src/                       # Components, Contexts, Pages, Styles
│   │   ├── components/            # Sidebar, Navbar, Reusable Modal
│   │   ├── context/               # AuthContext (session, Axios interceptor)
│   │   ├── pages/                 # Dashboard, Invoices, Create, Clients, Recurring, Payments
│   │   ├── index.css              # Custom styling, Scrollbars, animations
│   │   └── index.js               # React mounting point
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md                      # System Documentation
```

---

## ✨ Cutting-Edge Automation Features

1. **Self-Bootstrapping Database Pool**:
   Upon connecting to your PostgreSQL instance, the backend reads [schema.sql](file:///Users/sajesh/Documents/invoice%20generator/backend/models/schema.sql) and automatically compiles all tables and indexes.
2. **Robust Sandbox Fallback Engines**:
   - **Database**: If PostgreSQL is temporarily offline, the server gracefully boots in **In-Memory/JSON Mock Mode**, pre-seeding the directory so the UI is immediately interactive.
   - **File Storage**: If Cloudinary keys are not provided, generated PDFs are stored locally in `/backend/uploads/` and served via static Express routes.
   - **Email SMTP**: If Brevo keys are absent, outgoing emails print in a premium ASCII-art visual banner on the backend console, showing subject, recipient details, and PDF sizes.
3. **Automated Cron & Manual Schedulers**:
   Overdue invoice audits and subscription generations run daily at midnight via **Node Cron**. For visual demonstrations and QA, click **"Run Billing Engines"** on the top navigation bar to execute jobs instantly!
4. **Partial Payment Support**:
   Record partial balances on outstanding invoices. The invoice automatically transitions between `Unpaid`, `Partially Paid`, and `Paid` as settlements are entered.
5. **Pixel-Perfect PDF Generation**:
   Invoices compile dynamically into Tailwind HTML templates with modern sans-serif fonts and gradient cards, which **Puppeteer** exports into pristine high-resolution PDFs. (If headless Chromium is blocked on the server, a robust **PDFKit** secondary compiler steps in as a fail-safe!).

---

## 🛠️ Step-by-Step Installation & Booting

### Step 1: Clone and Install Dependencies
Dependencies have already been compiled for both directories. If you need to re-verify or lock them again, run:

```bash
# Verify backend packages
cd backend
npm install

# Verify frontend packages
cd ../frontend
npm install
```

### Step 2: Configure Environment Keys (`backend/.env`)
Open [backend/.env](file:///Users/sajesh/Documents/invoice%20generator/backend/.env) to add your keys. Note that default keys are supplied so the app **runs out of the box in sandbox/mock mode** without any configuration:

```ini
PORT=5002
JWT_SECRET=your_super_secret_jwt_key_123456789

# Connect to local Postgres (Optional - falls back to sandboxed in-memory mock db)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/invoice_db

# Connect to Cloudinary (Optional - falls back to disk storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Connect to Brevo Email SMTP (Optional - falls back to console logging)
BREVO_API_KEY=your_brevo_api_key
SENDER_EMAIL=billing@invoicepro.com
SENDER_NAME="Invoice Pro Billing"
```

### Step 3: Boot the Backend Service
Run the Node/Express server on **Port 5002**:

```bash
cd backend
npm run dev
```

### Step 4: Boot the React Client
Run the Vite development server on **Port 3000**:

```bash
cd frontend
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

## 👤 Development Login Credentials

For convenience, a demo administrator profile is pre-seeded into the system:

* **Email**: `demo@invoicepro.com`
* **Password**: `password`

Simply click **Sign In** with these credentials to load the stats dashboard instantly!

---

## 🧾 Core Tech Flow Integrations

* **Invoice Creation**: Multi-item rows allow setting description, quantity, rates, and independent VAT values. sequential invoice numbers (e.g., `INV-2026-0001`) are automatically tracked and generated.
* **Payment Tracking**: Record settlements directly from the Invoices ledger. It handles calculations, updates remaining balances, and appends records in the payments ledger.
* **Recurring Retainers**: Configure cycle retainers (Weekly, Monthly, Quarterly, Annually) for clients. These trigger automatically via cron or on-demand using the Navbar actions.
* **Email & Reminders**: Overdue invoices past their due dates trigger notifications, appending direct links to retrieve PDFs.
