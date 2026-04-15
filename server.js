/**
 * VCMS Pro v4 — Server
 * Works locally (PostgreSQL) and on Vercel (Neon)
 */
const express  = require('express');
const { Pool } = require('pg');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const cors     = require('cors');
require('dotenv').config();

const app = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'vcms-pro-secret-key';

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend from /public folder
app.use(express.static(path.join(__dirname, 'public')));

// ── DATABASE ────────────────────────────────────────────────
// Uses DATABASE_URL on Vercel (Neon), local config otherwise
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'vcms_pro',
      user:     process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'Preyansh@732007',
      max: 10,
    });

pool.query('SELECT NOW()')
  .then(() => console.log('✅ Database connected'))
  .catch(e => console.error('❌ Database error:', e.message));

// ── FILE UPLOADS ────────────────────────────────────────────
// On Render, set UPLOADS_DIR to data/uploads to use the Persistent Disk
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Uploads directory initialized at:', uploadsDir);
  }
} catch (e) {
  console.warn('⚠️ Note: Uploads directory check skipped or handles by persistent disk mount.');
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ── HELPERS ─────────────────────────────────────────────────
function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}
async function logAudit(userId, userName, action, entityType, entityId, description, ip) {
  try {
    await pool.query(
      `INSERT INTO audit_log(user_id,user_name,action,entity_type,entity_id,description,ip_address) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [userId, userName, action, entityType, entityId || null, description, ip || '127.0.0.1']
    );
  } catch (e) { /* non-blocking */ }
}
async function notify(userId, title, description, icon = '🔔', type = 'info') {
  try {
    await pool.query(
      `INSERT INTO notifications(user_id,title,description,icon,type) VALUES($1,$2,$3,$4,$5)`,
      [userId, title, description, icon, type]
    );
  } catch (e) { /* non-blocking */ }
}

// ── AUTH MIDDLEWARE ─────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token expired' });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({ error: 'Access denied' });
    next();
  };
}

// ════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const r = await pool.query('SELECT * FROM users WHERE email=$1 AND is_active=true', [email.toLowerCase().trim()]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid email or password' });
    await pool.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);
    await logAudit(user.id, `${user.first_name} ${user.last_name}`, 'LOGIN', 'user', user.id, 'User logged in', req.ip);
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: `${user.first_name} ${user.last_name}` },
      JWT_SECRET, { expiresIn: '7d' }
    );
    const { password_hash, ...safe } = user;
    res.json({ token, user: safe });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { first_name, last_name, email, password, role, department } = req.body;
  const errors = [];
  if (!first_name || first_name.trim().length < 2) errors.push('First name must be at least 2 characters');
  if (/\d/.test(first_name || '')) errors.push('First name cannot contain numbers');
  if (!last_name || last_name.trim().length < 1) errors.push('Last name is required');
  if (/\d/.test(last_name || '')) errors.push('Last name cannot contain numbers');
  if (!email || !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(email))
    errors.push('Enter a valid lowercase email address');
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[0-9]/.test(password || '')) errors.push('Password must contain at least one number');
  if (!role) errors.push('Please select a role');
  if (errors.length) return res.status(400).json({ errors });
  try {
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(400).json({ errors: ['Email already registered'] });
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users(first_name,last_name,email,password_hash,role,department) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [first_name.trim(), last_name.trim(), email.toLowerCase(), hash, role, department || null]
    );
    const user = r.rows[0];
    await notify(user.id, `Welcome, ${first_name}! 🎉`, 'Your VCMS Pro account is ready.', '🎉', 'success');
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, name: `${first_name} ${last_name}` },
      JWT_SECRET, { expiresIn: '7d' }
    );
    const { password_hash, ...safe } = user;
    res.status(201).json({ token, user: safe });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.userId]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    const { password_hash, ...safe } = r.rows[0];
    res.json(safe);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/auth/profile', auth, async (req, res) => {
  const { first_name, last_name, department, language, theme } = req.body;
  const errors = [];
  if (!first_name || first_name.trim().length < 2) errors.push('First name min 2 chars');
  if (/\d/.test(first_name || '')) errors.push('First name cannot contain numbers');
  if (!last_name) errors.push('Last name required');
  if (errors.length) return res.status(400).json({ errors });
  try {
    const r = await pool.query(
      `UPDATE users SET first_name=$1,last_name=$2,department=$3,language=$4,theme=$5,updated_at=NOW() WHERE id=$6 RETURNING *`,
      [first_name.trim(), last_name.trim(), department || null, language || 'en', theme || 'dark', req.user.userId]
    );
    const { password_hash, ...safe } = r.rows[0];
    res.json(safe);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════
//  STATS
// ════════════════════════════════════════════════════════════
app.get('/api/stats', auth, async (req, res) => {
  try {
    const [v, c, i, d, n] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM vendors'),
      pool.query(`SELECT COUNT(*) total, COUNT(*) FILTER(WHERE status='active') active, COUNT(*) FILTER(WHERE status='expired') expired FROM contracts`),
      pool.query(`SELECT COUNT(*) total, COALESCE(SUM(total_amount),0) tv, COALESCE(SUM(total_amount) FILTER(WHERE status='paid'),0) pv, COALESCE(SUM(total_amount) FILTER(WHERE status='overdue'),0) ov, COUNT(*) FILTER(WHERE status='pending') pc FROM invoices`),
      pool.query('SELECT COUNT(*) FROM documents'),
      pool.query('SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false', [req.user.userId]),
    ]);
    res.json({
      vendors: parseInt(v.rows[0].count),
      contracts: parseInt(c.rows[0].total),
      active: parseInt(c.rows[0].active),
      expired: parseInt(c.rows[0].expired),
      totalValue: parseFloat(i.rows[0].tv),
      paidValue: parseFloat(i.rows[0].pv),
      overdueVal: parseFloat(i.rows[0].ov),
      pendingCnt: parseInt(i.rows[0].pc),
      documents: parseInt(d.rows[0].count),
      unread: parseInt(n.rows[0].count),
    });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════
//  VENDORS
// ════════════════════════════════════════════════════════════
app.get('/api/vendors', auth, async (req, res) => {
  const { search, category } = req.query;
  let q = 'SELECT * FROM vendors WHERE 1=1'; const p = [];
  if (search) { p.push(`%${search}%`); q += ` AND (name ILIKE $${p.length} OR email ILIKE $${p.length})`; }
  if (category && category !== 'all') { p.push(category); q += ` AND category=$${p.length}`; }
  q += ' ORDER BY created_at DESC';
  try { res.json((await pool.query(q, p)).rows); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/vendors', auth, requireRole('admin', 'manager'), async (req, res) => {
  const { name, category, contact_name, email, phone, tax_id, address, risk_level, status, payment_terms, notes } = req.body;
  if (!name?.trim() || !category) return res.status(400).json({ errors: ['Name and category required'] });
  try {
    const colors = ['#7c3aed', '#a855f7', '#0284c7', '#059669', '#d97706', '#dc2626'];
    const r = await pool.query(
      `INSERT INTO vendors(name,category,contact_name,email,phone,tax_id,address,risk_level,status,payment_terms,notes,avatar_color,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name.trim(), category, contact_name || null, email || null, phone || null, tax_id || null, address || null,
        parseInt(risk_level) || 2, status || 'Pending', payment_terms || 'Net 30', notes || null,
        colors[Math.floor(Math.random() * colors.length)], req.user.userId]
    );
    await logAudit(req.user.userId, req.user.name, 'CREATE', 'vendor', r.rows[0].id, `Created vendor: ${name}`, req.ip);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/vendors/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  const { name, category, contact_name, email, phone, tax_id, address, risk_level, status, payment_terms, notes } = req.body;
  try {
    const r = await pool.query(
      `UPDATE vendors SET name=$1,category=$2,contact_name=$3,email=$4,phone=$5,tax_id=$6,address=$7,risk_level=$8,status=$9,payment_terms=$10,notes=$11,updated_at=NOW() WHERE id=$12 RETURNING *`,
      [name, category, contact_name || null, email || null, phone || null, tax_id || null, address || null,
        parseInt(risk_level) || 2, status || 'Pending', payment_terms || 'Net 30', notes || null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/vendors/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const v = await pool.query('SELECT name FROM vendors WHERE id=$1', [req.params.id]);
    if (!v.rows.length) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM vendors WHERE id=$1', [req.params.id]);
    await logAudit(req.user.userId, req.user.name, 'DELETE', 'vendor', req.params.id, `Deleted: ${v.rows[0].name}`, req.ip);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════
//  CONTRACTS
// ════════════════════════════════════════════════════════════
app.get('/api/contracts', auth, async (req, res) => {
  const { search, status } = req.query;
  let q = 'SELECT * FROM contracts WHERE 1=1'; const p = [];
  if (search) { p.push(`%${search}%`); q += ` AND (name ILIKE $${p.length} OR vendor_name ILIKE $${p.length})`; }
  if (status && status !== 'all') { p.push(status); q += ` AND status=$${p.length}`; }
  q += ' ORDER BY created_at DESC';
  try { res.json((await pool.query(q, p)).rows); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/contracts', auth, requireRole('admin', 'manager', 'legal'), async (req, res) => {
  const { name, vendor_id, vendor_name, value, currency, status, risk, contract_type, start_date, expiry_date, auto_renew, payment_terms, description, tags } = req.body;
  if (!name?.trim() || !vendor_name?.trim()) return res.status(400).json({ errors: ['Name and vendor required'] });
  try {
    const r = await pool.query(
      `INSERT INTO contracts(contract_number,name,vendor_id,vendor_name,value,currency,status,risk,contract_type,start_date,expiry_date,auto_renew,payment_terms,description,tags,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [makeId('CTR'), name.trim(), vendor_id || null, vendor_name.trim(), parseFloat(value) || 0, currency || 'INR',
        status || 'draft', risk || 'medium', contract_type || 'Service', start_date || null, expiry_date || null,
        auto_renew === 'true', payment_terms || 'Net 30', description || null,
        tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null, req.user.userId]
    );
    await logAudit(req.user.userId, req.user.name, 'CREATE', 'contract', r.rows[0].id, `Created: ${name}`, req.ip);
    res.status(201).json(r.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/contracts/:id', auth, requireRole('admin', 'manager', 'legal'), async (req, res) => {
  const { name, vendor_name, value, currency, status, risk, contract_type, start_date, expiry_date, description } = req.body;
  try {
    const r = await pool.query(
      `UPDATE contracts SET name=$1,vendor_name=$2,value=$3,currency=$4,status=$5,risk=$6,contract_type=$7,start_date=$8,expiry_date=$9,description=$10,updated_at=NOW() WHERE id=$11 RETURNING *`,
      [name, vendor_name, parseFloat(value) || 0, currency || 'INR', status || 'draft', risk || 'medium', contract_type || 'Service', start_date || null, expiry_date || null, description || null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/contracts/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const c = await pool.query('SELECT name FROM contracts WHERE id=$1', [req.params.id]);
    if (!c.rows.length) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM contracts WHERE id=$1', [req.params.id]);
    await logAudit(req.user.userId, req.user.name, 'DELETE', 'contract', req.params.id, `Deleted: ${c.rows[0].name}`, req.ip);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════
//  INVOICES
// ════════════════════════════════════════════════════════════
app.get('/api/invoices', auth, async (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM invoices WHERE 1=1'; const p = [];
  if (status && status !== 'all') { p.push(status); q += ` AND status=$${p.length}`; }
  q += ' ORDER BY created_at DESC';
  try { res.json((await pool.query(q, p)).rows); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/invoices', auth, requireRole('admin', 'manager', 'finance'), async (req, res) => {
  const { vendor_id, vendor_name, amount, currency, tax_rate, status, due_date, notes } = req.body;
  if (!vendor_name?.trim() || !amount) return res.status(400).json({ errors: ['Vendor and amount required'] });
  const amt = parseFloat(amount) || 0, rate = parseFloat(tax_rate) || 18;
  const taxAmt = amt * (rate / 100), total = amt + taxAmt;
  try {
    const r = await pool.query(
      `INSERT INTO invoices(invoice_number,vendor_id,vendor_name,amount,currency,tax_rate,tax_amount,total_amount,status,due_date,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [makeId('INV'), vendor_id || null, vendor_name.trim(), amt, currency || 'INR', rate, taxAmt, total, status || 'pending', due_date || null, notes || null, req.user.userId]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/invoices/:id', auth, requireRole('admin', 'manager', 'finance'), async (req, res) => {
  const { status, paid_date } = req.body;
  try {
    const r = await pool.query(
      `UPDATE invoices SET status=$1,paid_date=$2,updated_at=NOW() WHERE id=$3 RETURNING *`,
      [status, paid_date || null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/invoices/:id', auth, requireRole('admin', 'finance'), async (req, res) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════
//  DOCUMENTS
// ════════════════════════════════════════════════════════════
app.get('/api/documents', auth, async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM documents ORDER BY uploaded_at DESC')).rows); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/documents/upload', auth, upload.array('files', 20), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files' });
  try {
    const saved = [];
    for (const f of req.files) {
      const r = await pool.query(
        `INSERT INTO documents(original_name,stored_name,file_path,file_size,mime_type,uploaded_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [f.originalname, f.filename, f.path, f.size, f.mimetype, req.user.userId]
      );
      saved.push(r.rows[0]);
    }
    res.json(saved);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/documents/:id/download', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM documents WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    if (!fs.existsSync(r.rows[0].file_path)) return res.status(404).json({ error: 'File missing' });
    res.download(r.rows[0].file_path, r.rows[0].original_name);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/documents/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM documents WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    if (fs.existsSync(r.rows[0].file_path)) fs.unlinkSync(r.rows[0].file_path);
    await pool.query('DELETE FROM documents WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════════
//  AUDIT + NOTIFICATIONS
// ════════════════════════════════════════════════════════════
app.get('/api/audit', auth, async (req, res) => {
  const { action } = req.query;
  let q = 'SELECT * FROM audit_log WHERE 1=1'; const p = [];
  if (action && action !== 'all') { p.push(action); q += ` AND action=$${p.length}`; }
  q += ' ORDER BY created_at DESC LIMIT 500';
  try { res.json((await pool.query(q, p)).rows); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/notifications', auth, async (req, res) => {
  try {
    res.json((await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.userId])).rows);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [req.user.userId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ── SPA FALLBACK ────────────────────────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api'))
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  else
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 VCMS Pro running at http://localhost:${PORT}\n`);
});

module.exports = app;
