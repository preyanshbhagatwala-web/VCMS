VCMS Pro v4
Vendor Contract Management System — Express + PostgreSQL + Chart.js + Claude AI
Run Locally
```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your PostgreSQL password
cp .env.example .env

# 3. Apply database schema (run once)
psql -U postgres -d vcms_pro -f database/schema.sql

# 4. Start server
npm start

# Open: http://localhost:3000
```
Demo accounts (password: `admin123`)
admin@vcms.com — Admin
manager@vcms.com — Manager
legal@vcms.com — Legal
finance@vcms.com — Finance
auditor@vcms.com — Auditor
viewer@vcms.com — Viewer
Deploy to Vercel
Create free database at neon.tech
Run `database/schema.sql` against your Neon database
Push this folder to GitHub
Import repo on vercel.com
Add environment variable `DATABASE_URL` = your Neon connection string
Add `JWT_SECRET` = any random string
Click Deploy ✅
Project Structure
```
vcms-pro/
├── server.js          ← Express backend (all API routes)
├── vercel.json        ← Vercel deployment config
├── package.json
├── .env.example       ← Copy to .env for local use
├── public/            ← All frontend files
│   ├── index.html     ← Landing page
│   ├── login.html     ← Auth page
│   ├── dashboard.html ← Main app
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js
│       ├── charts.js
│       ├── utils.js
│       ├── i18n.js
│       └── galaxy.js
└── database/
    └── schema.sql     ← PostgreSQL schema + demo data
```
