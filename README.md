# VCMS — Vendor & Contract Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![JWT](https://img.shields.io/badge/JWT-Secure_Auth-000000?style=flat-square&logo=json-web-tokens&logoColor=white)](https://jwt.io/)
[![Chart.js](https://img.shields.io/badge/Chart.js-Analytics-FF6384?style=flat-square&logo=chart.js&logoColor=white)](https://www.chartjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

An enterprise-grade, full-stack web application engineered to streamline vendor onboarding, contract lifecycle management (CLM), multi-currency invoice tracking, document repositories, and compliance auditing. Built on an asynchronous Express REST engine and relational PostgreSQL storage, VCMS features granular Role-Based Access Control (RBAC), interactive analytics dashboards, and real-time operational notifications.

---

## Key Modules & Capabilities

- **Vendor Management**: End-to-end lifecycle tracking from onboarding to verification. Includes risk tier scoring (Levels 1–6), tax identification, customizable payment terms (Net 30/60/90), and vendor status management (`Verified`, `Pending`, `Suspended`, `Blacklisted`).
- **Contract Lifecycle Management (CLM)**: Contract drafting, value estimation, term dates, and lifecycle state management (`Draft`, `Review`, `Active`, `Expired`, `Terminated`) with automated renewal tracking.
- **Invoice & Financial Tracking**: Multi-item invoice generation linked directly to contracts, tax computation, financial approval queues, and payment lifecycle tracking (`Draft`, `Pending`, `Approved`, `Paid`, `Overdue`, `Disputed`).
- **Document Management**: Multi-file attachment engine backed by Multer for contracts, SLAs, compliance certifications, and NDAs with strict access gating.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions enforced across 6 operational roles: Admin, Manager, Legal, Finance, Auditor, and Viewer.
- **Compliance & Audit Logging**: Immutable chronological event logging tracking user actions, IP addresses, entity mutations, and operational timestamps.
- **Interactive Analytics**: Real-time KPI metrics, spend by vendor category, contract value distribution, and invoice cash-flow forecasts powered by Chart.js.
- **Internationalization & Theming**: Built-in multi-language localization engine (English, Spanish, Hindi, etc.) with dark/light visual modes.

---

## System Architecture

```
+-------------------------------------------------------------+
|                     Client Presentation                     |
|  - Landing Page     - Auth Portal     - Role Dashboard      |
|  - Chart.js Canvas  - i18n Engine     - Dynamic Theme Engine|
+------------------------------+------------------------------+
                               | HTTPS / JSON (JWT)
                               v
+-------------------------------------------------------------+
|                      Express REST API                       |
|  - Authentication & JWT Verification Middleware             |
|  - Role-Based Access Control Guard (`requireRole`)          |
|  - Multer File Attachment Engine                            |
|  - Audit Log Event Dispatcher                               |
+------------------------------+------------------------------+
                               | Connection Pooling (`pg`)
                               v
+-------------------------------------------------------------+
|                 PostgreSQL Relational DB                    |
|  - Users & Roles     - Vendors & Risk  - Contracts & Items  |
|  - Invoices & Items  - Documents       - Audit Trails       |
+-------------------------------------------------------------+
```

---

## Role-Based Access Control (RBAC)

The system enforces strict principle-of-least-privilege access across all REST endpoints:

| Feature Area | Admin | Manager | Legal | Finance | Auditor | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Vendor Onboarding & Edit** | Read / Write | Read / Write | Read | Read | Read | Read |
| **Vendor Deletion** | Full | No | No | No | No | No |
| **Contract Authoring & Edit** | Read / Write | Read / Write | Read / Write | Read | Read | Read |
| **Contract Deletion** | Full | No | No | No | No | No |
| **Invoice Processing** | Read / Write | Read / Write | Read | Read / Write | Read | Read |
| **Document Upload** | Read / Write | Read / Write | Read / Write | Read / Write | Read | Read |
| **Audit Log Inspection** | Full | No | No | No | Read | No |
| **User & Role Administration**| Full | No | No | No | No | No |

---

## Database Schema Overview

The relational PostgreSQL schema utilizes UUID primary keys (`uuid-ossp`) and secure password hashing (`pgcrypto` / bcrypt):

```
 users (id, email, password_hash, role, department, language, theme)
   │
   ├──< vendors (id, name, category, tax_id, risk_level, status, payment_terms)
   │      │
   │      └──< contracts (id, vendor_id, title, value, currency, start_date, end_date, status)
   │             │
   │             ├──< invoices (id, contract_id, vendor_id, invoice_number, amount, status)
   │             │       └──< invoice_items (id, invoice_id, description, quantity, unit_price, total)
   │             │
   │             └──< documents (id, entity_type, entity_id, file_name, file_path, uploaded_by)
   │
   ├──< notifications (id, user_id, title, message, type, is_read)
   └──< audit_log (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher (or cloud instance like [Neon](https://neon.tech))
- **npm**: v9.0.0 or higher

---

### Local Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/preyanshbhagatwala-web/VCMS.git
   cd VCMS
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the project root:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/vcms_pro
   JWT_SECRET=your_super_secret_jwt_key_here
   NODE_ENV=development
   ```

4. **Initialize database schema**:
   ```bash
   psql -U postgres -d vcms_pro -f database/schema.sql
   ```

5. **Start application server**:
   ```bash
   # Production mode
   npm start

   # Development mode (auto-reload)
   npm run dev
   ```

6. **Access dashboard**:
   Navigate to `http://localhost:3000` in your web browser.

---

## Pre-Configured Demo Accounts

For testing different permission levels, the database seed includes accounts for each operational role:

| Role | Email | Password | Primary Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@vcms.com` | `admin123` | Unrestricted system control & audit logs |
| **Manager** | `manager@vcms.com` | `admin123` | Vendor onboarding & contract creation |
| **Legal** | `legal@vcms.com` | `admin123` | Contract terms review & legal approvals |
| **Finance** | `finance@vcms.com` | `admin123` | Invoice validation & budget approval |
| **Auditor** | `auditor@vcms.com` | `admin123` | Compliance overview & audit trail review |
| **Viewer** | `viewer@vcms.com` | `admin123` | Read-only access to approved entities |

---

## REST API Specification

All protected endpoints require a valid JWT passed in the HTTP Authorization header: `Authorization: Bearer <token>`.

### Authentication
- `POST /api/auth/login` — Authenticate user and issue JWT
- `POST /api/auth/register` — Register a new account
- `GET /api/auth/me` — Retrieve active session profile
- `PUT /api/auth/profile` — Update user preferences, locale, and theme

### Dashboard & Analytics
- `GET /api/stats` — Aggregate metrics: active vendors, contract values, invoice totals, and risk distribution

### Vendors
- `GET /api/vendors` — List vendors with status and category filters
- `POST /api/vendors` — Create new vendor record *(Admin, Manager)*
- `PUT /api/vendors/:id` — Update vendor profile and risk assessment *(Admin, Manager)*
- `DELETE /api/vendors/:id` — Remove vendor record *(Admin)*

### Contracts
- `GET /api/contracts` — Query contract registry with status filtering
- `POST /api/contracts` — Draft new contract *(Admin, Manager, Legal)*
- `PUT /api/contracts/:id` — Update contract terms, value, or status *(Admin, Manager, Legal)*
- `DELETE /api/contracts/:id` — Archive/delete contract *(Admin)*

### Invoices
- `GET /api/invoices` — List invoices by contract or vendor
- `POST /api/invoices` — Issue new invoice with line items *(Admin, Manager, Finance)*
- `PUT /api/invoices/:id` — Update invoice status *(Admin, Manager, Finance)*
- `DELETE /api/invoices/:id` — Delete invoice record *(Admin, Finance)*

### Documents & Audit
- `GET /api/documents` — Query uploaded entity attachments
- `POST /api/documents/upload` — Upload multipart documents via Multer *(All authenticated)*
- `GET /api/documents/:id/download` — Stream attachment file
- `DELETE /api/documents/:id` — Delete document *(Admin, Manager)*
- `GET /api/audit` — Retrieve immutable system audit trail *(Admin, Auditor)*
- `GET /api/notifications` — Fetch user alert queue

---

## Cloud Deployment

### Deploy to Vercel + Neon Postgres

1. **Create Database**: Provision a free PostgreSQL cluster on [Neon.tech](https://neon.tech).
2. **Execute Schema**: Run `database/schema.sql` inside the Neon SQL editor to generate tables and seed data.
3. **Import Project**: In the [Vercel Dashboard](https://vercel.com), import your `VCMS` repository.
4. **Environment Configuration**:
   - `DATABASE_URL`: Your pooled connection string from Neon.
   - `JWT_SECRET`: A secure random alphanumeric string (32+ characters).
5. **Deploy**: Trigger deployment. Vercel automatically configures the Node.js serverless runtime using `vercel.json`.

---

## Repository Structure

```
vcms/
├── database/
│   └── schema.sql        # PostgreSQL DDL schema and demo seed datasets
├── public/
│   ├── css/
│   │   └── styles.css    # Responsive theme design system & layout tokens
│   ├── js/
│   │   ├── app.js        # Core client application & state router
│   │   ├── charts.js     # Chart.js visualization widgets
│   │   ├── galaxy.js     # Dynamic visual canvas effects
│   │   ├── i18n.js       # Internationalization & translation dictionary
│   │   └── utils.js      # API client wrappers and DOM helpers
│   ├── dashboard.html    # Operational application dashboard
│   ├── index.html        # Marketing portal & platform landing
│   └── login.html        # Authentication and registration interface
├── server.js             # Express application, middleware, & REST endpoints
├── package.json          # Node dependencies and execution scripts
├── vercel.json           # Serverless deployment configuration
└── README.md             # Project documentation
```

---

## Security Architecture

- **Cryptographic Password Hashing**: Passwords salted and hashed via `bcrypt` with standard cost factors.
- **Stateless Token Verification**: Secure JWT tokens containing user identity and role claims, validated per request.
- **SQL Injection Prevention**: Parameterized queries across all database drivers via `pg` pool.
- **Audit Logging**: Sensitive operations recorded with originating IP, user ID, target entity, and timestamp.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
