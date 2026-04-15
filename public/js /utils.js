/**
 * VCMS Pro v3 — API Client + Utilities
 */

// ── THEME ──────────────────────────────────────────────────
const Theme = {
  init() {
    const saved = localStorage.getItem('vcms_theme') || 'dark';
    this.apply(saved);
    return saved;
  },
  toggle() {
    const curr = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = curr === 'dark' ? 'light' : 'dark';
    this.apply(next);
    localStorage.setItem('vcms_theme', next);
    return next;
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vcms_theme', theme);
    // Update all theme toggle buttons
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
  }
};

// ── CURSOR ──────────────────────────────────────────────────
function initCursor() {
  const dot  = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;
  
  // Set initial position to center of screen so it's not stuck at 0,0
  let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
  let rx = tx, ry = ty;
  
  // Ensure visibility
  dot.style.display = 'block';
  ring.style.display = 'block';
  dot.style.opacity = '1';
  ring.style.opacity = '1';

  document.addEventListener('mousemove', e => { 
    tx = e.clientX; 
    ty = e.clientY; 
    dot.style.left = tx + 'px'; 
    dot.style.top = ty + 'px'; 
  });

  document.addEventListener('mousedown', () => { 
    ring.style.width = '14px'; 
    ring.style.height = '14px'; 
  });

  document.addEventListener('mouseup', () => { 
    ring.style.width = '28px'; 
    ring.style.height = '28px'; 
  });

  const raf = () => { 
    rx += (tx - rx) * 0.15; 
    ry += (ty - ry) * 0.15; 
    ring.style.left = rx + 'px'; 
    ring.style.top = ry + 'px'; 
    requestAnimationFrame(raf); 
  };
  requestAnimationFrame(raf);
}

// ── API CLIENT ──────────────────────────────────────────────
const Api = {
  base: '',
  token: () => localStorage.getItem('vcms_token'),
  headers(extra = {}) {
    return { 'Content-Type': 'application/json', ...(this.token() ? { 'Authorization': `Bearer ${this.token()}` } : {}), ...extra };
  },
  async req(method, path, body, multipart = false) {
    const opts = { method, headers: multipart ? { 'Authorization': `Bearer ${this.token()}` } : this.headers() };
    if (body && !multipart) opts.body = JSON.stringify(body);
    if (body && multipart)  opts.body = body;
    try {
      const res = await fetch(this.base + path, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw { status: res.status, ...data };
      return data;
    } catch(e) {
      if (e.status === 401) { localStorage.removeItem('vcms_token'); localStorage.removeItem('vcms_user'); window.location.href = 'login.html'; return; }
      throw e;
    }
  },
  get:    (p)    => Api.req('GET',    p),
  post:   (p, b) => Api.req('POST',   p, b),
  put:    (p, b) => Api.req('PUT',    p, b),
  delete: (p)    => Api.req('DELETE', p),
  // Auth
  login:    (b) => Api.post('/api/auth/login', b),
  register: (b) => Api.post('/api/auth/register', b),
  me:       ()  => Api.get('/api/auth/me'),
  updateProfile: (b) => Api.put('/api/auth/profile', b),
  // Resources
  stats:    () => Api.get('/api/stats'),
  vendors:  (q='') => Api.get('/api/vendors' + q),
  createVendor: (b) => Api.post('/api/vendors', b),
  updateVendor: (id, b) => Api.put(`/api/vendors/${id}`, b),
  deleteVendor: (id) => Api.delete(`/api/vendors/${id}`),
  contracts: (q='') => Api.get('/api/contracts' + q),
  createContract: (b) => Api.post('/api/contracts', b),
  updateContract: (id, b) => Api.put(`/api/contracts/${id}`, b),
  deleteContract: (id) => Api.delete(`/api/contracts/${id}`),
  invoices: (q='') => Api.get('/api/invoices' + q),
  createInvoice: (b) => Api.post('/api/invoices', b),
  updateInvoice: (id, b) => Api.put(`/api/invoices/${id}`, b),
  deleteInvoice: (id) => Api.delete(`/api/invoices/${id}`),
  documents: () => Api.get('/api/documents'),
  uploadDoc: (fd) => Api.req('POST', '/api/documents/upload', fd, true),
  downloadDoc: (id) => `${Api.base}/api/documents/${id}/download?token=${Api.token()}`,
  deleteDoc: (id) => Api.delete(`/api/documents/${id}`),
  audit: (q='') => Api.get('/api/audit' + q),
  notifs: () => Api.get('/api/notifications'),
  readAllNotifs: () => Api.put('/api/notifications/read-all'),
};

// ── TOAST ──────────────────────────────────────────────────
const Toast = {
  show(msg, type = 'info', dur = 3500) {
    let c = document.getElementById('toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
    const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]||'🔔'}</span><span class="toast-msg">${msg}</span><span class="toast-close" onclick="this.parentNode.remove()">✕</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(30px)'; t.style.transition='all .3s'; setTimeout(()=>t.remove(),300); }, dur);
  },
  success: (m) => Toast.show(m,'success'),
  error:   (m) => Toast.show(m,'error'),
  info:    (m) => Toast.show(m,'info'),
  warning: (m) => Toast.show(m,'warning'),
};

// ── LOADER ─────────────────────────────────────────────────
const Loader = {
  show(msg) {
    const el = document.getElementById('loading-overlay');
    if (el) { const sub = el.querySelector('.loading-sub'); if (sub && msg) sub.textContent = msg; el.classList.remove('hidden'); }
  },
  hide() { const el = document.getElementById('loading-overlay'); if (el) el.classList.add('hidden'); }
};

// ── MODAL ──────────────────────────────────────────────────
function openModal(id)  { const m = document.getElementById(id); if (m) m.classList.add('open'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }
document.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open'); });

// ── FORM HELPERS ───────────────────────────────────────────
function showFieldError(input, msg) {
  input.classList.add('err');
  const existing = input.parentNode.querySelector('.field-err');
  if (existing) existing.remove();
  if (msg) { const d = document.createElement('div'); d.className='field-err'; d.textContent='⚠ '+msg; input.parentNode.appendChild(d); }
}
function clearAllErrors(form) {
  form.querySelectorAll('.err').forEach(el => el.classList.remove('err'));
  form.querySelectorAll('.field-err').forEach(el => el.remove());
  const b = form.querySelector('.form-err-banner'); if (b) b.remove();
}
function showFormErrors(form, errors) {
  const old = form.querySelector('.form-err-banner'); if (old) old.remove();
  if (!errors?.length) return;
  const d = document.createElement('div');
  d.className = 'form-err-banner';
  d.innerHTML = `<strong>Please fix:</strong><ul>${errors.map(e=>`<li>${e}</li>`).join('')}</ul>`;
  form.insertBefore(d, form.firstChild);
}

// ── CURRENCY ───────────────────────────────────────────────
const CURRENCIES = {
  INR:{sym:'₹',name:'Indian Rupee'}, USD:{sym:'$',name:'US Dollar'}, EUR:{sym:'€',name:'Euro'},
  GBP:{sym:'£',name:'British Pound'}, AED:{sym:'د.إ',name:'UAE Dirham'},
  SGD:{sym:'S$',name:'Singapore Dollar'}, JPY:{sym:'¥',name:'Japanese Yen'},
  CAD:{sym:'C$',name:'Canadian Dollar'}, AUD:{sym:'A$',name:'Australian Dollar'},
  CHF:{sym:'Fr.',name:'Swiss Franc'},
};
function fmtCurrency(n, c='INR') {
  const s = CURRENCIES[c]?.sym || c;
  const v = Number(n)||0;
  if (v>=1e7) return `${s}${(v/1e7).toFixed(2)}Cr`;
  if (v>=1e5) return `${s}${(v/1e5).toFixed(2)}L`;
  if (v>=1000) return `${s}${(v/1000).toFixed(1)}K`;
  return `${s}${v.toFixed(0)}`;
}
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function timeAgo(d) {
  if (!d) return '—';
  const m = Math.floor((Date.now()-new Date(d).getTime())/60000);
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`;
  const h=Math.floor(m/60); if (h<24) return `${h}h ago`; return `${Math.floor(h/24)}d ago`;
}
function badge(label, type) { const c=type||label.toLowerCase().replace(/\s+/g,'-'); return `<span class="badge badge-${c}">${label}</span>`; }
function riskPips(level) {
  const l=Number(level)||1; const cls=l<=2?'low':l<=4?'medium':'high';
  return `<div class="risk-bar">${Array.from({length:6},(_,i)=>`<div class="risk-pip ${i<l?'filled '+cls:''}"></div>`).join('')}</div>`;
}
function debounce(fn, ms=300) { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function currencyOptions(sel='INR') { return Object.entries(CURRENCIES).map(([k,v])=>`<option value="${k}" ${k===sel?'selected':''}>${v.sym} ${k}</option>`).join(''); }
function requireAuth() {
  const token = localStorage.getItem('vcms_token');
  if (!token) { window.location.href='/login.html'; return null; }
  return JSON.parse(localStorage.getItem('vcms_user')||'null');
}

function getFileIcon(mime) {
  if (!mime) return '📄';
  const m = mime.toLowerCase();
  if (m.includes('pdf')) return '📕';
  if (m.includes('word') || m.includes('officedocument.word') || m.includes('text')) return '📘';
  if (m.includes('excel') || m.includes('sheet')) return '📗';
  if (m.includes('image')) return '🖼️';
  if (m.includes('zip') || m.includes('compressed')) return '📦';
  return '📄';
}
