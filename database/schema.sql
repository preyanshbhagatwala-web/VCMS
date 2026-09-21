-- ============================================================
--  VCMS Pro v4 — PostgreSQL Schema + Rich Demo Data
--  Run: psql -U postgres -d vcms_pro -f database/schema.sql
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS audit_log      CASCADE;
DROP TABLE IF EXISTS notifications  CASCADE;
DROP TABLE IF EXISTS documents      CASCADE;
DROP TABLE IF EXISTS invoice_items  CASCADE;
DROP TABLE IF EXISTS invoices       CASCADE;
DROP TABLE IF EXISTS contracts      CASCADE;
DROP TABLE IF EXISTS vendors        CASCADE;
DROP TABLE IF EXISTS users          CASCADE;

-- ── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('admin','manager','legal','finance','auditor','viewer')),
  department    VARCHAR(100),
  avatar_color  VARCHAR(20)  DEFAULT '#7c3aed',
  language      VARCHAR(10)  DEFAULT 'en',
  theme         VARCHAR(10)  DEFAULT 'dark',
  is_active     BOOLEAN      DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ── VENDORS ─────────────────────────────────────────────────
CREATE TABLE vendors (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(255) NOT NULL,
  category       VARCHAR(100) NOT NULL,
  contact_name   VARCHAR(150),
  email          VARCHAR(255),
  phone          VARCHAR(50),
  tax_id         VARCHAR(100),
  address        TEXT,
  risk_level     INTEGER DEFAULT 2 CHECK (risk_level BETWEEN 1 AND 6),
  status         VARCHAR(50) DEFAULT 'Pending'
                 CHECK (status IN ('Verified','Pending','Suspended','Blacklisted')),
  payment_terms  VARCHAR(50) DEFAULT 'Net 30',
  notes          TEXT,
  avatar_color   VARCHAR(20) DEFAULT '#7c3aed',
  contract_count INTEGER DEFAULT 0,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONTRACTS ───────────────────────────────────────────────
CREATE TABLE contracts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number VARCHAR(50) UNIQUE,
  name            VARCHAR(255) NOT NULL,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name     VARCHAR(255) NOT NULL,
  value           NUMERIC(15,2) DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'INR',
  status          VARCHAR(50) DEFAULT 'draft'
                  CHECK (status IN ('draft','active','review','expired','terminated')),
  risk            VARCHAR(20) DEFAULT 'medium'
                  CHECK (risk IN ('low','medium','high','critical')),
  contract_type   VARCHAR(100) DEFAULT 'Service',
  start_date      DATE,
  expiry_date     DATE,
  auto_renew      BOOLEAN DEFAULT FALSE,
  payment_terms   VARCHAR(50) DEFAULT 'Net 30',
  description     TEXT,
  tags            TEXT[],
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── INVOICES ────────────────────────────────────────────────
CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE,
  vendor_id      UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name    VARCHAR(255) NOT NULL,
  contract_ref   VARCHAR(100),
  amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency       VARCHAR(10) DEFAULT 'INR',
  tax_rate       NUMERIC(5,2) DEFAULT 18,
  tax_amount     NUMERIC(15,2) DEFAULT 0,
  total_amount   NUMERIC(15,2) DEFAULT 0,
  status         VARCHAR(50) DEFAULT 'pending'
                 CHECK (status IN ('pending','paid','overdue','cancelled','disputed')),
  due_date       DATE,
  paid_date      DATE,
  notes          TEXT,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  quantity    NUMERIC(10,2) DEFAULT 1,
  unit_price  NUMERIC(15,2) DEFAULT 0,
  line_total  NUMERIC(15,2) DEFAULT 0
);

-- ── DOCUMENTS ───────────────────────────────────────────────
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_name VARCHAR(500) NOT NULL,
  stored_name   VARCHAR(500) NOT NULL,
  file_path     TEXT NOT NULL,
  file_size     BIGINT DEFAULT 0,
  mime_type     VARCHAR(200),
  entity_type   VARCHAR(50),
  entity_id     UUID,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  icon        VARCHAR(10) DEFAULT '🔔',
  type        VARCHAR(50) DEFAULT 'info',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(200),
  action      VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100),
  entity_id   UUID,
  description TEXT,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ─────────────────────────────────────────────────
CREATE INDEX idx_vendors_name      ON vendors(name);
CREATE INDEX idx_contracts_vendor  ON contracts(vendor_id);
CREATE INDEX idx_contracts_status  ON contracts(status);
CREATE INDEX idx_contracts_expiry  ON contracts(expiry_date);
CREATE INDEX idx_invoices_vendor   ON invoices(vendor_id);
CREATE INDEX idx_invoices_status   ON invoices(status);
CREATE INDEX idx_invoices_due      ON invoices(due_date);
CREATE INDEX idx_audit_user        ON audit_log(user_id);
CREATE INDEX idx_audit_created     ON audit_log(created_at DESC);
CREATE INDEX idx_notifs_user       ON notifications(user_id);

-- ════════════════════════════════════════════════════════════
--  SEED: USERS  (all password = admin123)
-- ════════════════════════════════════════════════════════════
INSERT INTO users (first_name,last_name,email,password_hash,role,department,avatar_color) VALUES
('Arjun',  'Sharma',   'admin@vcms.com',   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','admin',   'Administration','#7c3aed'),
('Priya',  'Menon',    'manager@vcms.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','manager', 'Operations',    '#0284c7'),
('Rahul',  'Verma',    'legal@vcms.com',   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','legal',   'Legal',         '#059669'),
('Sneha',  'Kapoor',   'finance@vcms.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','finance', 'Finance',       '#d97706'),
('Vikram', 'Nair',     'auditor@vcms.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','auditor', 'Internal Audit','#6d28d9'),
('Kavya',  'Iyer',     'viewer@vcms.com',  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy','viewer',  'General',       '#0e7490');

-- ════════════════════════════════════════════════════════════
--  SEED: VENDORS
-- ════════════════════════════════════════════════════════════
WITH u AS (SELECT id FROM users WHERE role='admin' LIMIT 1)
INSERT INTO vendors (name,category,contact_name,email,phone,tax_id,risk_level,status,payment_terms,avatar_color,contract_count,created_by,created_at) VALUES
('Tata Consultancy Services','Technology','Ramesh Iyer','tcs@tcs.com','+91 22 6778 9999','27AAACT2727Q1ZW',2,'Verified','Net 45','#0284c7',4,(SELECT id FROM u),NOW()-INTERVAL '8 months'),
('Infosys Limited','Technology','Deepa Nair','deepa@infosys.com','+91 80 2852 0261','29AAACI0183M1Z4',2,'Verified','Net 30','#7c3aed',3,(SELECT id FROM u),NOW()-INTERVAL '7 months'),
('Khaitan & Co','Legal','Anand Khaitan','anand@khaitan.com','+91 11 4151 5151','07AAACK2534P1ZQ',3,'Verified','Net 30','#059669',2,(SELECT id FROM u),NOW()-INTERVAL '6 months'),
('HDFC Bank Ltd','Finance','Sanjay Mehta','sanjay@hdfc.com','+91 22 6652 6652','26AAACH1619K1Z7',1,'Verified','Net 15','#d97706',2,(SELECT id FROM u),NOW()-INTERVAL '10 months'),
('Blue Dart Express','Logistics','Kavya Singh','kavya@bluedart.com','+91 22 2839 6444','27AAACB0553F1ZP',3,'Verified','Net 30','#dc2626',2,(SELECT id FROM u),NOW()-INTERVAL '5 months'),
('Ogilvy India','Marketing','Rohit Das','rohit@ogilvy.com','+91 22 6661 0000','27AABCO8132B1Z2',4,'Pending','Net 45','#8b5cf6',1,(SELECT id FROM u),NOW()-INTERVAL '3 months'),
('Randstad India','HR','Neha Bose','neha@randstad.com','+91 80 4123 4567','29AAACR1234H1Z5',2,'Verified','Net 30','#0891b2',1,(SELECT id FROM u),NOW()-INTERVAL '4 months'),
('Siemens India','Operations','Arun Kumar','arun@siemens.com','+91 22 3967 7000','27AAACS1256B1Z8',3,'Verified','Net 60','#7c3aed',2,(SELECT id FROM u),NOW()-INTERVAL '9 months'),
('Wipro Limited','Technology','Pooja Reddy','pooja@wipro.com','+91 80 2844 0011','29AAACW0024F1ZA',2,'Verified','Net 30','#a855f7',2,(SELECT id FROM u),NOW()-INTERVAL '6 months'),
('Cyril Amarchand Mangaldas','Legal','Cyril Shroff','cyril@cam.com','+91 22 2496 4455','27AAACM9876K1Z3',2,'Verified','Net 30','#16a34a',1,(SELECT id FROM u),NOW()-INTERVAL '2 months'),
('Deloitte India','Finance','Ravi Kant','ravi@deloitte.com','+91 22 6185 4000','27AAACD1234F1Z6',2,'Verified','Net 45','#f59e0b',2,(SELECT id FROM u),NOW()-INTERVAL '7 months'),
('Amazon Web Services','Technology','Suresh Pillai','suresh@aws.com','+91 80 4032 4699','29AAACA1234S1Z9',3,'Verified','Net 30','#f97316',1,(SELECT id FROM u),NOW()-INTERVAL '1 month');

-- ════════════════════════════════════════════════════════════
--  SEED: CONTRACTS
-- ════════════════════════════════════════════════════════════
WITH
  v1  AS (SELECT id FROM vendors WHERE name='Tata Consultancy Services'),
  v2  AS (SELECT id FROM vendors WHERE name='Infosys Limited'),
  v3  AS (SELECT id FROM vendors WHERE name='Khaitan & Co'),
  v4  AS (SELECT id FROM vendors WHERE name='HDFC Bank Ltd'),
  v5  AS (SELECT id FROM vendors WHERE name='Blue Dart Express'),
  v6  AS (SELECT id FROM vendors WHERE name='Ogilvy India'),
  v7  AS (SELECT id FROM vendors WHERE name='Randstad India'),
  v8  AS (SELECT id FROM vendors WHERE name='Siemens India'),
  v9  AS (SELECT id FROM vendors WHERE name='Wipro Limited'),
  v10 AS (SELECT id FROM vendors WHERE name='Deloitte India'),
  v11 AS (SELECT id FROM vendors WHERE name='Amazon Web Services'),
  u   AS (SELECT id FROM users WHERE role='admin' LIMIT 1)
INSERT INTO contracts(contract_number,name,vendor_id,vendor_name,value,currency,status,risk,contract_type,start_date,expiry_date,auto_renew,payment_terms,description,created_by,created_at) VALUES
('CTR-JAN001','TCS Digital Transformation Suite',(SELECT id FROM v1),'Tata Consultancy Services',45000000,'INR','active','medium','SaaS','2024-01-15','2025-01-14',true,'Net 45','Enterprise ERP and digital transformation platform license',(SELECT id FROM u),NOW()-INTERVAL '7 months'),
('CTR-FEB001','Infosys AI Analytics Platform',(SELECT id FROM v2),'Infosys Limited',28000000,'INR','active','low','SaaS','2024-02-01','2025-01-31',true,'Net 30','AI-powered business analytics and reporting platform',(SELECT id FROM u),NOW()-INTERVAL '6 months'),
('CTR-FEB002','Khaitan Legal Retainer FY24',(SELECT id FROM v3),'Khaitan & Co',8500000,'INR','active','low','Consulting','2024-04-01','2025-03-31',true,'Net 30','Annual legal counsel retainer for corporate affairs',(SELECT id FROM u),NOW()-INTERVAL '5 months'),
('CTR-MAR001','HDFC Treasury Banking Services',(SELECT id FROM v4),'HDFC Bank Ltd',12000000,'INR','active','low','Service','2024-01-01','2024-12-31',true,'Net 15','Corporate banking and treasury management services',(SELECT id FROM u),NOW()-INTERVAL '8 months'),
('CTR-MAR002','Blue Dart Pan-India Logistics',(SELECT id FROM v5),'Blue Dart Express',6800000,'INR','active','medium','Supply','2024-03-01','2025-02-28',false,'Net 30','Pan-India express delivery and courier services',(SELECT id FROM u),NOW()-INTERVAL '4 months'),
('CTR-APR001','Ogilvy Brand Campaign Q3',(SELECT id FROM v6),'Ogilvy India',15000000,'INR','review','high','Consulting','2024-07-01','2024-12-31',false,'Net 45','Brand strategy and marketing campaign management',(SELECT id FROM u),NOW()-INTERVAL '2 months'),
('CTR-APR002','Randstad Staffing Solution',(SELECT id FROM v7),'Randstad India',9200000,'INR','active','low','Service','2024-04-01','2025-03-31',true,'Net 30','Contract staffing and HR services agreement',(SELECT id FROM u),NOW()-INTERVAL '3 months'),
('CTR-MAY001','Siemens Industrial Automation',(SELECT id FROM v8),'Siemens India',32000000,'INR','active','medium','License','2024-05-01','2026-04-30',true,'Net 60','Industrial automation systems and maintenance',(SELECT id FROM u),NOW()-INTERVAL '4 months'),
('CTR-MAY002','Wipro Cloud Migration',(SELECT id FROM v9),'Wipro Limited',18500000,'INR','draft','medium','SaaS','2024-08-01','2025-07-31',false,'Net 30','Cloud infrastructure migration and managed services',(SELECT id FROM u),NOW()-INTERVAL '1 month'),
('CTR-JUN001','Deloitte Tax Advisory FY25',(SELECT id FROM v10),'Deloitte India',11000000,'INR','active','low','Consulting','2024-04-01','2025-03-31',true,'Net 45','Tax advisory and regulatory compliance services',(SELECT id FROM u),NOW()-INTERVAL '3 months'),
('CTR-JUN002','AWS Cloud Infrastructure',(SELECT id FROM v11),'Amazon Web Services',22000000,'INR','active','medium','SaaS','2024-06-01','2025-05-31',true,'Net 30','AWS enterprise cloud infrastructure and support',(SELECT id FROM u),NOW()-INTERVAL '2 months'),
('CTR-JUL001','TCS Legacy System Maintenance',(SELECT id FROM v1),'Tata Consultancy Services',8000000,'INR','expired','low','Service','2023-07-01','2024-06-30',false,'Net 45','Maintenance and support for legacy ERP systems',(SELECT id FROM u),NOW()-INTERVAL '5 months'),
('CTR-JUL002','Infosys Data Security Audit',(SELECT id FROM v2),'Infosys Limited',4500000,'INR','review','high','Consulting','2024-07-15','2024-12-31',false,'Net 30','Comprehensive data security audit and compliance review',(SELECT id FROM u),NOW()-INTERVAL '1 month'),
('CTR-AUG001','HDFC FX Risk Management',(SELECT id FROM v4),'HDFC Bank Ltd',5500000,'INR','active','low','Service','2024-08-01','2025-07-31',true,'Net 15','Foreign exchange risk management and hedging services',(SELECT id FROM u),NOW()-INTERVAL '1 month');

-- ════════════════════════════════════════════════════════════
--  SEED: INVOICES (spread over 6 months for nice charts)
-- ════════════════════════════════════════════════════════════
WITH
  v1 AS (SELECT id FROM vendors WHERE name='Tata Consultancy Services'),
  v2 AS (SELECT id FROM vendors WHERE name='Infosys Limited'),
  v3 AS (SELECT id FROM vendors WHERE name='Khaitan & Co'),
  v4 AS (SELECT id FROM vendors WHERE name='HDFC Bank Ltd'),
  v5 AS (SELECT id FROM vendors WHERE name='Blue Dart Express'),
  v6 AS (SELECT id FROM vendors WHERE name='Ogilvy India'),
  v7 AS (SELECT id FROM vendors WHERE name='Wipro Limited'),
  v8 AS (SELECT id FROM vendors WHERE name='Deloitte India'),
  v9 AS (SELECT id FROM vendors WHERE name='Amazon Web Services'),
  u  AS (SELECT id FROM users WHERE role='finance' LIMIT 1)
INSERT INTO invoices(invoice_number,vendor_id,vendor_name,amount,currency,tax_rate,tax_amount,total_amount,status,due_date,paid_date,notes,created_by,created_at) VALUES
-- Month 1 (6 months ago)
('INV-001',(SELECT id FROM v1),'Tata Consultancy Services',3750000,'INR',18,675000,4425000,'paid',NOW()-INTERVAL '5 months 15 days',NOW()-INTERVAL '5 months 10 days','Q1 monthly instalment',(SELECT id FROM u),NOW()-INTERVAL '6 months'),
('INV-002',(SELECT id FROM v2),'Infosys Limited',2333333,'INR',18,420000,2753333,'paid',NOW()-INTERVAL '5 months 20 days',NOW()-INTERVAL '5 months 12 days','Platform access fee M1',(SELECT id FROM u),NOW()-INTERVAL '6 months'),
('INV-003',(SELECT id FROM v4),'HDFC Bank Ltd',1000000,'INR',0,0,1000000,'paid',NOW()-INTERVAL '5 months 25 days',NOW()-INTERVAL '5 months 20 days','Banking service charges Jan',(SELECT id FROM u),NOW()-INTERVAL '6 months'),
-- Month 2 (5 months ago)
('INV-004',(SELECT id FROM v1),'Tata Consultancy Services',3750000,'INR',18,675000,4425000,'paid',NOW()-INTERVAL '4 months 15 days',NOW()-INTERVAL '4 months 10 days','Q1 monthly instalment',(SELECT id FROM u),NOW()-INTERVAL '5 months'),
('INV-005',(SELECT id FROM v3),'Khaitan & Co',708333,'INR',18,127500,835833,'paid',NOW()-INTERVAL '4 months 20 days',NOW()-INTERVAL '4 months 14 days','Legal retainer M2',(SELECT id FROM u),NOW()-INTERVAL '5 months'),
('INV-006',(SELECT id FROM v5),'Blue Dart Express',566666,'INR',18,102000,668666,'paid',NOW()-INTERVAL '4 months 18 days',NOW()-INTERVAL '4 months 10 days','Logistics Feb',(SELECT id FROM u),NOW()-INTERVAL '5 months'),
('INV-007',(SELECT id FROM v8),'Deloitte India',916666,'INR',18,165000,1081666,'paid',NOW()-INTERVAL '4 months 22 days',NOW()-INTERVAL '4 months 15 days','Tax advisory M2',(SELECT id FROM u),NOW()-INTERVAL '5 months'),
-- Month 3 (4 months ago)
('INV-008',(SELECT id FROM v1),'Tata Consultancy Services',3750000,'INR',18,675000,4425000,'paid',NOW()-INTERVAL '3 months 15 days',NOW()-INTERVAL '3 months 8 days','Q2 monthly instalment',(SELECT id FROM u),NOW()-INTERVAL '4 months'),
('INV-009',(SELECT id FROM v2),'Infosys Limited',2333333,'INR',18,420000,2753333,'paid',NOW()-INTERVAL '3 months 20 days',NOW()-INTERVAL '3 months 12 days','Platform access fee M3',(SELECT id FROM u),NOW()-INTERVAL '4 months'),
('INV-010',(SELECT id FROM v7),'Wipro Limited',1541666,'INR',18,277500,1819166,'paid',NOW()-INTERVAL '3 months 18 days',NOW()-INTERVAL '3 months 10 days','Cloud migration phase 1',(SELECT id FROM u),NOW()-INTERVAL '4 months'),
('INV-011',(SELECT id FROM v9),'Amazon Web Services',1833333,'INR',18,330000,2163333,'paid',NOW()-INTERVAL '3 months 25 days',NOW()-INTERVAL '3 months 18 days','AWS infrastructure M3',(SELECT id FROM u),NOW()-INTERVAL '4 months'),
-- Month 4 (3 months ago)
('INV-012',(SELECT id FROM v1),'Tata Consultancy Services',3750000,'INR',18,675000,4425000,'paid',NOW()-INTERVAL '2 months 15 days',NOW()-INTERVAL '2 months 8 days','Q2 monthly instalment',(SELECT id FROM u),NOW()-INTERVAL '3 months'),
('INV-013',(SELECT id FROM v4),'HDFC Bank Ltd',1000000,'INR',0,0,1000000,'paid',NOW()-INTERVAL '2 months 20 days',NOW()-INTERVAL '2 months 14 days','Banking charges Apr',(SELECT id FROM u),NOW()-INTERVAL '3 months'),
('INV-014',(SELECT id FROM v5),'Blue Dart Express',566666,'INR',18,102000,668666,'paid',NOW()-INTERVAL '2 months 18 days',NOW()-INTERVAL '2 months 12 days','Logistics Apr',(SELECT id FROM u),NOW()-INTERVAL '3 months'),
('INV-015',(SELECT id FROM v6),'Ogilvy India',1250000,'INR',18,225000,1475000,'paid',NOW()-INTERVAL '2 months 22 days',NOW()-INTERVAL '2 months 15 days','Brand campaign milestone 1',(SELECT id FROM u),NOW()-INTERVAL '3 months'),
-- Month 5 (2 months ago)
('INV-016',(SELECT id FROM v2),'Infosys Limited',2333333,'INR',18,420000,2753333,'paid',NOW()-INTERVAL '1 month 20 days',NOW()-INTERVAL '1 month 12 days','Platform access fee M5',(SELECT id FROM u),NOW()-INTERVAL '2 months'),
('INV-017',(SELECT id FROM v9),'Amazon Web Services',1833333,'INR',18,330000,2163333,'paid',NOW()-INTERVAL '1 month 22 days',NOW()-INTERVAL '1 month 15 days','AWS infrastructure M5',(SELECT id FROM u),NOW()-INTERVAL '2 months'),
('INV-018',(SELECT id FROM v3),'Khaitan & Co',708333,'INR',18,127500,835833,'paid',NOW()-INTERVAL '1 month 25 days',NOW()-INTERVAL '1 month 18 days','Legal retainer M5',(SELECT id FROM u),NOW()-INTERVAL '2 months'),
('INV-019',(SELECT id FROM v8),'Deloitte India',916666,'INR',18,165000,1081666,'overdue',NOW()-INTERVAL '25 days',NULL,'Tax advisory M5 — OVERDUE',(SELECT id FROM u),NOW()-INTERVAL '2 months'),
-- Month 6 (current month - mixed statuses for good charts)
('INV-020',(SELECT id FROM v1),'Tata Consultancy Services',3750000,'INR',18,675000,4425000,'pending',NOW()+INTERVAL '15 days',NULL,'Current month instalment',(SELECT id FROM u),NOW()-INTERVAL '10 days'),
('INV-021',(SELECT id FROM v7),'Wipro Limited',1541666,'INR',18,277500,1819166,'pending',NOW()+INTERVAL '20 days',NULL,'Cloud migration phase 2',(SELECT id FROM u),NOW()-INTERVAL '8 days'),
('INV-022',(SELECT id FROM v6),'Ogilvy India',1250000,'INR',18,225000,1475000,'pending',NOW()+INTERVAL '12 days',NULL,'Brand campaign milestone 2',(SELECT id FROM u),NOW()-INTERVAL '6 days'),
('INV-023',(SELECT id FROM v5),'Blue Dart Express',566666,'INR',18,102000,668666,'overdue',NOW()-INTERVAL '5 days',NULL,'Logistics — OVERDUE',(SELECT id FROM u),NOW()-INTERVAL '15 days'),
('INV-024',(SELECT id FROM v4),'HDFC Bank Ltd',1000000,'INR',0,0,1000000,'pending',NOW()+INTERVAL '10 days',NULL,'Banking charges current month',(SELECT id FROM u),NOW()-INTERVAL '5 days');

-- ════════════════════════════════════════════════════════════
--  SEED: AUDIT LOG (spread over 6 months)
-- ════════════════════════════════════════════════════════════
WITH u AS (SELECT id FROM users WHERE role='admin' LIMIT 1)
INSERT INTO audit_log(user_id,user_name,action,entity_type,description,ip_address,created_at) VALUES
((SELECT id FROM u),'Arjun Sharma','LOGIN','user','Admin logged in','192.168.1.1',NOW()-INTERVAL '6 months'),
((SELECT id FROM u),'Arjun Sharma','CREATE','vendor','Created vendor: TCS','192.168.1.1',NOW()-INTERVAL '6 months'+INTERVAL '1 day'),
((SELECT id FROM u),'Arjun Sharma','CREATE','vendor','Created vendor: Infosys Limited','192.168.1.1',NOW()-INTERVAL '5 months 29 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','contract','Created contract: TCS Digital Transformation Suite','192.168.1.1',NOW()-INTERVAL '5 months 28 days'),
((SELECT id FROM u),'Priya Menon','LOGIN','user','Manager logged in','192.168.1.2',NOW()-INTERVAL '5 months 20 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','invoice','Created invoice: INV-001','192.168.1.1',NOW()-INTERVAL '5 months 15 days'),
((SELECT id FROM u),'Rahul Verma','LOGIN','user','Legal logged in','192.168.1.3',NOW()-INTERVAL '5 months 10 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','vendor','Created vendor: Khaitan & Co','192.168.1.1',NOW()-INTERVAL '5 months 5 days'),
((SELECT id FROM u),'Sneha Kapoor','LOGIN','user','Finance logged in','192.168.1.4',NOW()-INTERVAL '4 months 25 days'),
((SELECT id FROM u),'Arjun Sharma','UPDATE','contract','Updated contract status to active','192.168.1.1',NOW()-INTERVAL '4 months 20 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','invoice','Created invoice: INV-004','192.168.1.1',NOW()-INTERVAL '4 months 15 days'),
((SELECT id FROM u),'Priya Menon','CREATE','vendor','Created vendor: Blue Dart Express','192.168.1.2',NOW()-INTERVAL '4 months 10 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','contract','Created: Ogilvy Brand Campaign Q3','192.168.1.1',NOW()-INTERVAL '4 months 5 days'),
((SELECT id FROM u),'Rahul Verma','UPDATE','contract','Legal review completed for contract','192.168.1.3',NOW()-INTERVAL '3 months 28 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','invoice','Created invoice: INV-008','192.168.1.1',NOW()-INTERVAL '3 months 20 days'),
((SELECT id FROM u),'Sneha Kapoor','UPDATE','invoice','Marked INV-005 as paid','192.168.1.4',NOW()-INTERVAL '3 months 15 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','vendor','Created vendor: Amazon Web Services','192.168.1.1',NOW()-INTERVAL '3 months 10 days'),
((SELECT id FROM u),'Vikram Nair','LOGIN','user','Auditor logged in','192.168.1.5',NOW()-INTERVAL '3 months 5 days'),
((SELECT id FROM u),'Priya Menon','UPDATE','vendor','Updated vendor risk level','192.168.1.2',NOW()-INTERVAL '2 months 25 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','invoice','Created invoice: INV-012','192.168.1.1',NOW()-INTERVAL '2 months 20 days'),
((SELECT id FROM u),'Sneha Kapoor','UPDATE','invoice','Marked INV-010 as paid','192.168.1.4',NOW()-INTERVAL '2 months 15 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','contract','Created contract: AWS Cloud Infrastructure','192.168.1.1',NOW()-INTERVAL '2 months 10 days'),
((SELECT id FROM u),'Rahul Verma','CREATE','contract','Drafted: Wipro Cloud Migration','192.168.1.3',NOW()-INTERVAL '2 months 5 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','invoice','Created invoice: INV-016','192.168.1.1',NOW()-INTERVAL '1 month 25 days'),
((SELECT id FROM u),'Sneha Kapoor','UPDATE','invoice','Marked INV-015 as paid','192.168.1.4',NOW()-INTERVAL '1 month 20 days'),
((SELECT id FROM u),'Priya Menon','LOGIN','user','Manager logged in','192.168.1.2',NOW()-INTERVAL '1 month 15 days'),
((SELECT id FROM u),'Arjun Sharma','CREATE','invoice','Created invoice: INV-020','192.168.1.1',NOW()-INTERVAL '10 days'),
((SELECT id FROM u),'Sneha Kapoor','LOGIN','user','Finance logged in','192.168.1.4',NOW()-INTERVAL '8 days'),
((SELECT id FROM u),'Arjun Sharma','UPDATE','contract','Updated Ogilvy contract to review','192.168.1.1',NOW()-INTERVAL '5 days'),
((SELECT id FROM u),'Rahul Verma','LOGIN','user','Legal logged in','192.168.1.3',NOW()-INTERVAL '3 days'),
((SELECT id FROM u),'Vikram Nair','LOGIN','user','Auditor logged in','192.168.1.5',NOW()-INTERVAL '2 days'),
((SELECT id FROM u),'Arjun Sharma','LOGIN','user','Admin logged in','192.168.1.1',NOW()-INTERVAL '1 day'),
((SELECT id FROM u),'Priya Menon','UPDATE','contract','Approved vendor onboarding','192.168.1.2',NOW()-INTERVAL '12 hours'),
((SELECT id FROM u),'Arjun Sharma','CREATE','invoice','Created invoice: INV-024','192.168.1.1',NOW()-INTERVAL '5 hours');

-- ════════════════════════════════════════════════════════════
--  SEED: NOTIFICATIONS
-- ════════════════════════════════════════════════════════════
INSERT INTO notifications(user_id,title,description,icon,type,is_read,created_at)
SELECT u.id,'Welcome to VCMS Pro',
'Your dashboard is loaded with demo data. Explore analytics and reports.',
'info','info',false,NOW()
FROM users u;

INSERT INTO notifications(user_id,title,description,icon,type,is_read,created_at)
SELECT u.id,'Invoice Overdue',
'INV-019 from Deloitte India is 25 days overdue (10.8L)',
'warning','warning',false,NOW()
FROM users u WHERE u.role IN ('admin','finance');

INSERT INTO notifications(user_id,title,description,icon,type,is_read,created_at)
SELECT u.id,'Contract Under Review',
'Ogilvy Brand Campaign Q3 has been flagged for high risk review',
'file','alert',false,NOW()
FROM users u WHERE u.role IN ('admin','manager','legal');

INSERT INTO notifications(user_id,title,description,icon,type,is_read,created_at)
SELECT u.id,'New Vendor Added',
'Amazon Web Services has been verified and onboarded',
'check','success',false,NOW()
FROM users u WHERE u.role IN ('admin','manager');


