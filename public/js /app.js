/**
 * VCMS Pro v4 — Dashboard App
 * Role-Based Dashboards: Admin, Manager, Legal, Finance, Auditor, Viewer
 * All 13 pages with full CRUD
 */
'use strict';

let currentPage = 'dashboard';
let currentUser = null;
let vendorCache = [];
let statsCache  = {};

// ════════════════════════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  Theme.init();
  initCursor();
  const token = localStorage.getItem('vcms_token');
  if (!token) { window.location.href='login.html'; return; }
  const cached = JSON.parse(localStorage.getItem('vcms_user')||'null');
  if (cached) { currentUser=cached; applyUserUI(cached); buildSidebar(cached.role); }
  Loader.show('Loading your workspace…');
  try {
    const [stats,me,notifs] = await Promise.allSettled([Api.stats(),Api.me(),Api.notifs()]);
    if (me.status==='fulfilled'&&me.value) {
      currentUser=me.value; localStorage.setItem('vcms_user',JSON.stringify(me.value));
      applyUserUI(me.value); buildSidebar(me.value.role);
      setLanguage(me.value.language||currentLang);
    }
    if (stats.status==='fulfilled'&&stats.value) statsCache=stats.value;
    if (notifs.status==='fulfilled'&&notifs.value) updateNotifBadge(notifs.value.filter(n=>!n.is_read).length);
    // Load vendors cache
    vendorCache = await Api.vendors().catch(()=>[]);
    populateVendorDataLists();
  } catch(e) { console.warn(e); }
  await renderPage('dashboard');
  Loader.hide();
  document.querySelectorAll('.nav-item[data-page]').forEach(el=>el.addEventListener('click',()=>navigateTo(el.dataset.page)));
  document.getElementById('refresh-btn')?.addEventListener('click',()=>renderPage(currentPage));
  document.getElementById('notif-btn')?.addEventListener('click',()=>navigateTo('notifications'));
  const cOpts = currencyOptions('INR');
  ['contract-currency-sel','inv-currency-sel'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=cOpts; });
});

function applyUserUI(user) {
  const initials = `${user.first_name?.[0]||''}${user.last_name?.[0]||''}`.toUpperCase()||'U';
  document.querySelectorAll('.user-avatar-initials').forEach(el=>el.textContent=initials);
  document.querySelectorAll('.user-name-display').forEach(el=>el.textContent=`${user.first_name} ${user.last_name}`);
  document.querySelectorAll('.user-role-display').forEach(el=>el.textContent=capitalise(user.role||'User'));
  const rb = document.getElementById('role-badge');
  if (rb) rb.textContent = capitalise(user.role||'User');
  document.title = `VCMS Pro — ${capitalise(user.role||'User')} Dashboard`;
}

function capitalise(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

function updateNotifBadge(count) {
  const b=document.getElementById('notif-count-badge'), d=document.querySelector('.notif-dot');
  if(count>0){ b.textContent=count>99?'99+':count; b.style.display=''; if(d) d.style.display=''; }
  else { b.style.display='none'; if(d) d.style.display='none'; }
}

function populateVendorDataLists() {
  ['contract-vendor-list','inv-vendor-list','ig-vendor-list'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.innerHTML=vendorCache.map(v=>`<option value="${v.name}">`).join('');
  });
}

// ── SIDEBAR: show only pages relevant to role ──────────────
const ROLE_PAGES = {
  admin:   ['dashboard','vendors','contracts','invoices','workflows','documents','invoice-gen','ai','analytics','compliance','audit','notifications','settings'],
  manager: ['dashboard','vendors','contracts','invoices','workflows','documents','ai','analytics','notifications','settings'],
  legal:   ['dashboard','contracts','compliance','documents','audit','notifications','settings'],
  finance: ['dashboard','invoices','invoice-gen','analytics','documents','notifications','settings'],
  auditor: ['dashboard','audit','compliance','analytics','notifications','settings'],
  viewer:  ['dashboard','contracts','vendors','notifications','settings'],
};
const PAGE_LABELS = {
  dashboard:'Dashboard',vendors:'Vendors',contracts:'Contracts',invoices:'Invoices',
  workflows:'Workflows',documents:'Documents','invoice-gen':'Invoice Generator',
  ai:'AI Assistant',analytics:'Analytics',compliance:'Compliance',audit:'Audit Log',
  notifications:'Notifications',settings:'Settings'
};
const PAGE_ICONS = {
  dashboard:'🏠',vendors:'🏢',contracts:'📄',invoices:'💰',workflows:'⚙️',
  documents:'📁','invoice-gen':'🧾',ai:'🤖',analytics:'📊',compliance:'🛡️',
  audit:'📋',notifications:'🔔',settings:'⚙️'
};
const PAGE_SECTIONS = {
  dashboard:['Overview'],vendors:['Core'],contracts:['Core'],invoices:['Core'],workflows:['Core'],
  documents:['Tools'],'invoice-gen':['Tools'],ai:['Tools'],analytics:['Insights'],
  compliance:['Insights'],audit:['Insights'],notifications:['Account'],settings:['Account']
};

function buildSidebar(role) {
  const pages = ROLE_PAGES[role] || ROLE_PAGES.viewer;
  const nav   = document.querySelector('.sb-nav'); if (!nav) return;
  const sections = {};
  pages.forEach(p => {
    const sec = PAGE_SECTIONS[p]?.[0] || 'Other';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(p);
  });
  let html = '';
  Object.entries(sections).forEach(([sec, pgs]) => {
    html += `<div class="nav-sect">${sec}</div>`;
    pgs.forEach(p => {
      html += `<div class="nav-item${p===currentPage?' active':''}" data-page="${p}">
        <span class="nav-icon">${PAGE_ICONS[p]}</span>
        <span class="nav-label">${PAGE_LABELS[p]}</span>
        ${p==='notifications'?'<span class="nav-badge" id="notif-count-badge" style="display:none">0</span>':''}
      </div>`;
    });
  });
  nav.innerHTML = html;
  nav.querySelectorAll('.nav-item[data-page]').forEach(el=>el.addEventListener('click',()=>navigateTo(el.dataset.page)));
}

async function navigateTo(page) {
  const role = currentUser?.role||'viewer';
  if (!(ROLE_PAGES[role]||ROLE_PAGES.viewer).includes(page)) { Toast.warning("You don't have access to this page"); return; }
  currentPage = page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('topbar-title').textContent = PAGE_LABELS[page]||page;
  await renderPage(page);
}

async function renderPage(page) {
  const el = document.getElementById(`page-${page}`); if (!el) return;
  const role = currentUser?.role || 'viewer';
  switch(page) {
    case 'dashboard':    await renderDashboard(el, role); break;
    case 'vendors':      await renderVendors(el, role); break;
    case 'contracts':    await renderContracts(el, role); break;
    case 'invoices':     await renderInvoices(el, role); break;
    case 'workflows':    renderWorkflows(el); break;
    case 'documents':    await renderDocuments(el, role); break;
    case 'invoice-gen':  renderInvoiceGen(el); break;
    case 'ai':           renderAI(el); break;
    case 'analytics':    await renderAnalytics(el); break;
    case 'compliance':   renderCompliance(el); break;
    case 'audit':        await renderAudit(el); break;
    case 'notifications': await renderNotifications(el); break;
    case 'settings':     renderSettings(el); break;
  }
}

// ════════════════════════════════════════════════════════════
//  ROLE-BASED DASHBOARDS
// ════════════════════════════════════════════════════════════
async function renderDashboard(el, role) {
  switch(role) {
    case 'admin':   await dashAdmin(el);   break;
    case 'manager': await dashManager(el); break;
    case 'legal':   await dashLegal(el);   break;
    case 'finance': await dashFinance(el); break;
    case 'auditor': await dashAuditor(el); break;
    case 'viewer':  await dashViewer(el);  break;
    default:        await dashViewer(el);
  }
}

// ── ADMIN DASHBOARD ────────────────────────────────────────
async function dashAdmin(el) {
  const h=new Date().getHours(), greet=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const name=currentUser?.first_name||'Admin';
  let s=statsCache; try{s=statsCache=await Api.stats();}catch(e){}
  let vendors=[],contracts=[],invoices=[];
  try{[vendors,contracts,invoices]=await Promise.all([Api.vendors(),Api.contracts(),Api.invoices()]);}catch(e){}
  el.innerHTML=`
    <div class="dash-hero" style="background:linear-gradient(135deg,rgba(76,29,149,.55),rgba(124,58,237,.3),rgba(168,85,247,.12))">
      <div class="hero-greeting">👔 Admin Dashboard — ${greet}, ${name}!</div>
      <div class="hero-title">Full System <span style="background:linear-gradient(135deg,var(--acc2),var(--acc3));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Control Centre</span></div>
      <div class="hero-sub">Complete visibility and control over all vendors, contracts, invoices, users and system settings.</div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="openModal('modal-add-vendor')">🏢 Add Vendor</button>
        <button class="btn btn-primary" onclick="openModal('modal-add-contract')">📄 New Contract</button>
        <button class="btn btn-secondary" onclick="openModal('modal-add-invoice')">💰 New Invoice</button>
        <button class="btn btn-secondary" onclick="navigateTo('analytics')">📊 Full Analytics</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-value">${s.vendors||0}</div><div class="stat-label">Total Vendors</div><div class="stat-delta up">All registered</div></div>
      <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-value">${s.contracts||0}</div><div class="stat-label">Total Contracts</div><div class="stat-delta ${s.active>0?'up':'dn'}">${s.active||0} active</div></div>
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${fmtCurrency(s.totalValue||0,'INR')}</div><div class="stat-label">Invoice Volume</div><div class="stat-delta ${s.overdueVal>0?'dn':'up'}">${s.overdueVal>0?fmtCurrency(s.overdueVal,'INR')+' overdue':'All current'}</div></div>
      <div class="stat-card"><div class="stat-icon">📁</div><div class="stat-value">${s.documents||0}</div><div class="stat-label">Documents</div><div class="stat-delta up">Stored securely</div></div>
    </div>
    <!-- ADMIN CHARTS ROW -->
    <div class="grid-3" style="margin-bottom:16px">
      ${chartCard('chart-admin-cstatus','📄 Contract Status',200)}
      ${chartCard('chart-admin-inv-monthly','💰 Monthly Invoice Volume',200)}
      ${chartCard('chart-admin-risk','⚠️ Vendor Risk Distribution',200)}
    </div>
    <div class="grid-3-2" style="gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-hdr"><div class="card-title">⚡ Quick Actions</div></div>
        <div class="qa-grid">
          <div class="qa-card" onclick="openModal('modal-add-vendor')"><div class="qa-icon">🏢</div><div class="qa-label">Add Vendor</div></div>
          <div class="qa-card" onclick="openModal('modal-add-contract')"><div class="qa-icon">📄</div><div class="qa-label">New Contract</div></div>
          <div class="qa-card" onclick="openModal('modal-add-invoice')"><div class="qa-icon">💰</div><div class="qa-label">New Invoice</div></div>
          <div class="qa-card" onclick="navigateTo('documents')"><div class="qa-icon">📁</div><div class="qa-label">Upload Doc</div></div>
          <div class="qa-card" onclick="navigateTo('analytics')"><div class="qa-icon">📊</div><div class="qa-label">Analytics</div></div>
          <div class="qa-card" onclick="navigateTo('compliance')"><div class="qa-icon">🛡️</div><div class="qa-label">Compliance</div></div>
          <div class="qa-card" onclick="navigateTo('audit')"><div class="qa-icon">📋</div><div class="qa-label">Audit Log</div></div>
          <div class="qa-card" onclick="navigateTo('ai')"><div class="qa-icon">🤖</div><div class="qa-label">AI Assistant</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">📊 System Health</div></div>
        ${[
          {label:'Active Contracts',val:s.active||0,total:Math.max(s.contracts||1,1),ok:true},
          {label:'Paid Invoices',val:Math.round((s.paidValue||0)/Math.max(s.totalValue||1,1)*100),total:100,pct:true,ok:true},
          {label:'Overdue Invoices',val:s.pendingCnt||0,total:10,ok:(s.pendingCnt||0)<3},
        ].map(r=>`
          <div style="margin-bottom:13px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:13px;color:var(--txt2)">${r.label}</span>
              <span style="font-size:13px;font-weight:600">${r.pct?r.val+'%':r.val}</span>
            </div>
            <div class="progress"><div class="progress-bar ${r.ok?'ok':'err'}" style="width:${Math.min((r.val/r.total)*100,100)}%"></div></div>
          </div>`).join('')}
        <div style="margin-top:16px;display:flex;align-items:center;gap:8px;padding:10px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:var(--rm)">
          <span style="font-size:18px">✅</span><div style="font-size:13px;color:var(--ok)">All systems operational</div>
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card" id="da-contracts"><div class="card-hdr"><div class="card-title">📄 Recent Contracts</div><button class="btn btn-secondary btn-sm" onclick="navigateTo('contracts')">View All →</button></div><div class="spinner" style="margin:20px auto;display:block"></div></div>
      <div class="card" id="da-activity"><div class="card-hdr"><div class="card-title">📋 Recent Activity</div></div><div class="spinner" style="margin:20px auto;display:block"></div></div>
    </div>`;
  loadRecentContracts('da-contracts');
  loadRecentActivity('da-activity');
  setTimeout(()=>drawAdminDashCharts(vendors,contracts,invoices),80);
}

// ── MANAGER DASHBOARD ──────────────────────────────────────
async function dashManager(el) {
  const name=currentUser?.first_name||'Manager';
  let s=statsCache; try{s=statsCache=await Api.stats();}catch(e){}
  let vendors=[],contracts=[];
  try{[vendors,contracts]=await Promise.all([Api.vendors(),Api.contracts()]);}catch(e){}
  const review=contracts.filter(c=>c.status==='review');
  el.innerHTML=`
    <div class="dash-hero" style="background:linear-gradient(135deg,rgba(30,58,138,.55),rgba(37,99,235,.3),rgba(96,165,250,.12))">
      <div class="hero-greeting">📋 Manager Dashboard — Welcome, ${name}!</div>
      <div class="hero-title">Operations <span style="background:linear-gradient(135deg,#60a5fa,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Control Hub</span></div>
      <div class="hero-sub">Manage vendor relationships, oversee contract approvals, and track operational KPIs across your team.</div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="openModal('modal-add-vendor')">🏢 Add Vendor</button>
        <button class="btn btn-primary" onclick="openModal('modal-add-contract')">📄 New Contract</button>
        <button class="btn btn-secondary" onclick="navigateTo('workflows')">⚙️ Approvals</button>
        <button class="btn btn-secondary" onclick="navigateTo('analytics')">📊 Analytics</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-value">${s.vendors||0}</div><div class="stat-label">Active Vendors</div><div class="stat-delta up">Total registered</div></div>
      <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-value">${s.active||0}</div><div class="stat-label">Active Contracts</div><div class="stat-delta up">Currently running</div></div>
      <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-value">${review.length}</div><div class="stat-label">Pending Approval</div><div class="stat-delta ${review.length>0?'dn':'up'}">${review.length>0?'Needs attention':'All approved'}</div></div>
      <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-value">${s.expired||0}</div><div class="stat-label">Expiring Soon</div><div class="stat-delta ${s.expired>0?'dn':'up'}">${s.expired>0?'Renewal needed':'All current'}</div></div>
    </div>
    <!-- MANAGER CHARTS -->
    <div class="grid-2" style="margin-bottom:16px">
      ${chartCard('chart-mgr-pipeline','📋 Contract Lifecycle Status',220)}
      ${chartCard('chart-mgr-vendors','🏢 Vendor Portfolio by Category',220)}
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-hdr"><div class="card-title">📋 Approval Pipeline</div><button class="btn btn-secondary btn-sm" onclick="navigateTo('workflows')">View All</button></div>
        <div class="pipeline">
          <div class="pipe-stage"><div><div class="pipe-node done">✓</div><div class="pipe-label">Submitted</div></div></div>
          <div class="pipe-conn done"></div>
          <div class="pipe-stage"><div><div class="pipe-node done">✓</div><div class="pipe-label">Legal Review</div></div></div>
          <div class="pipe-conn done"></div>
          <div class="pipe-stage"><div><div class="pipe-node current">3</div><div class="pipe-label">Manager</div></div></div>
          <div class="pipe-conn"></div>
          <div class="pipe-stage"><div><div class="pipe-node">4</div><div class="pipe-label">Finance</div></div></div>
          <div class="pipe-conn"></div>
          <div class="pipe-stage"><div><div class="pipe-node">5</div><div class="pipe-label">Signed</div></div></div>
        </div>
        <div style="margin-top:12px;font-size:13px;color:var(--txt3)">${review.length} contract(s) awaiting your approval</div>
        ${review.length?`<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="navigateTo('contracts')">Review Now →</button>`:''}
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">⚡ Quick Actions</div></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-secondary" onclick="openModal('modal-add-vendor')" style="justify-content:flex-start">🏢 Onboard New Vendor</button>
          <button class="btn btn-secondary" onclick="openModal('modal-add-contract')" style="justify-content:flex-start">📄 Draft New Contract</button>
          <button class="btn btn-secondary" onclick="navigateTo('contracts')" style="justify-content:flex-start">👀 Review Pending Contracts</button>
          <button class="btn btn-secondary" onclick="navigateTo('analytics')" style="justify-content:flex-start">📊 View Analytics</button>
          <button class="btn btn-secondary" onclick="navigateTo('documents')" style="justify-content:flex-start">📁 Manage Documents</button>
          <button class="btn btn-secondary" onclick="navigateTo('ai')" style="justify-content:flex-start">🤖 AI Assistant</button>
        </div>
      </div>
    </div>
    <div class="card" id="dm-contracts"><div class="card-hdr"><div class="card-title">📄 Contracts Needing Review</div><button class="btn btn-secondary btn-sm" onclick="navigateTo('contracts')">View All</button></div><div class="spinner" style="margin:20px auto;display:block"></div></div>`;
  loadRecentContracts('dm-contracts');
  setTimeout(()=>drawManagerDashCharts(vendors,contracts),80);
}

// ── LEGAL DASHBOARD ────────────────────────────────────────
async function dashLegal(el) {
  const name=currentUser?.first_name||'Counsel';
  let contracts=[],docs=[];
  try{ [contracts,docs]=await Promise.all([Api.contracts(),Api.documents()]); }catch(e){}
  const active=contracts.filter(c=>c.status==='active').length;
  const review=contracts.filter(c=>c.status==='review').length;
  const expiring=contracts.filter(c=>{if(!c.expiry_date)return false;const d=(new Date(c.expiry_date)-new Date())/86400000;return d>0&&d<=30;}).length;
  el.innerHTML=`
    <div class="dash-hero" style="background:linear-gradient(135deg,rgba(6,78,59,.55),rgba(5,150,105,.3),rgba(52,211,153,.12))">
      <div class="hero-greeting">⚖️ Legal Dashboard — Good day, ${name}!</div>
      <div class="hero-title">Contract & Compliance <span style="background:linear-gradient(135deg,#34d399,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Intelligence</span></div>
      <div class="hero-sub">Review contracts, monitor compliance frameworks, manage legal documents and track risk across all agreements.</div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="openModal('modal-add-contract')">📄 Draft Contract</button>
        <button class="btn btn-secondary" onclick="navigateTo('compliance')">🛡️ Compliance</button>
        <button class="btn btn-secondary" onclick="navigateTo('documents')">📁 Documents</button>
        <button class="btn btn-secondary" onclick="navigateTo('audit')">📋 Audit Log</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-value">${contracts.length}</div><div class="stat-label">Total Contracts</div><div class="stat-delta up">${active} active</div></div>
      <div class="stat-card"><div class="stat-icon">⏰</div><div class="stat-value">${review}</div><div class="stat-label">Pending Review</div><div class="stat-delta ${review>0?'dn':'up'}">${review>0?'Action needed':'All reviewed'}</div></div>
      <div class="stat-card"><div class="stat-icon">⚠️</div><div class="stat-value">${expiring}</div><div class="stat-label">Expiring in 30d</div><div class="stat-delta ${expiring>0?'dn':'up'}">${expiring>0?'Renew soon':'None expiring'}</div></div>
      <div class="stat-card"><div class="stat-icon">📁</div><div class="stat-value">${docs.length}</div><div class="stat-label">Legal Documents</div><div class="stat-delta up">On file</div></div>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-hdr"><div class="card-title">⚠️ Contracts Requiring Attention</div></div>
        ${[
          {label:'Under Review',count:review,color:'var(--warn)',icon:'⏰',action:'review'},
          {label:'Expiring in 30 days',count:expiring,color:'var(--err)',icon:'📅',action:'active'},
          {label:'High Risk',count:contracts.filter(c=>c.risk==='high'||c.risk==='critical').length,color:'var(--err)',icon:'🔴',action:'active'},
          {label:'Active & Healthy',count:active,color:'var(--ok)',icon:'✅',action:'active'},
        ].map(r=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bdr)">
            <span style="font-size:20px">${r.icon}</span>
            <div style="flex:1"><div style="font-size:13px;font-weight:600">${r.label}</div></div>
            <div style="font-size:18px;font-weight:800;color:${r.color}">${r.count}</div>
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('contracts')">View</button>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">🛡️ Compliance Overview</div><button class="btn btn-secondary btn-sm" onclick="navigateTo('compliance')">Full Report</button></div>
        ${[
          {name:'GDPR',score:88,color:'#22c55e'},
          {name:'ISO 27001',score:76,color:'#f59e0b'},
          {name:'SOC 2',score:91,color:'#22c55e'},
          {name:'PCI DSS',score:62,color:'#ef4444'},
        ].map(f=>`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="width:70px;font-size:12px;font-weight:600;color:var(--txt2)">${f.name}</span>
            <div class="progress" style="flex:1"><div class="progress-bar" style="width:${f.score}%;background:${f.color}"></div></div>
            <span style="width:36px;text-align:right;font-size:13px;font-weight:700;color:${f.color}">${f.score}%</span>
          </div>`).join('')}
      </div>
    </div>
    <!-- LEGAL CHARTS -->
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card"><div class="card-hdr"><div class="card-title">⚠️ Contract Risk Distribution</div></div><div style="position:relative;height:220px"><canvas id="chart-legal-risk"></canvas></div></div>
      <div class="card"><div class="card-hdr"><div class="card-title">📄 Contracts Created (6 Months)</div></div><div style="position:relative;height:220px"><canvas id="chart-legal-activity"></canvas></div></div>
    </div>
    <div class="card" id="dl-contracts"><div class="card-hdr"><div class="card-title">📄 All Contracts</div><button class="btn btn-primary btn-sm" onclick="openModal('modal-add-contract')">+ New</button></div><div class="spinner" style="margin:20px auto;display:block"></div></div>`;
  loadRecentContracts('dl-contracts', 8);
  setTimeout(()=>drawLegalDashCharts(contracts),80);
}

// ── FINANCE DASHBOARD ──────────────────────────────────────
async function dashFinance(el) {
  const name=currentUser?.first_name||'Finance';
  let s=statsCache; try{s=statsCache=await Api.stats();}catch(e){}
  let invoices=[]; try{invoices=await Api.invoices();}catch(e){}
  const paid=invoices.filter(i=>i.status==='paid');
  const overdue=invoices.filter(i=>i.status==='overdue');
  const pending=invoices.filter(i=>i.status==='pending');
  el.innerHTML=`
    <div class="dash-hero" style="background:linear-gradient(135deg,rgba(120,53,15,.55),rgba(217,119,6,.3),rgba(252,211,77,.12))">
      <div class="hero-greeting">💰 Finance Dashboard — Welcome, ${name}!</div>
      <div class="hero-title">Payment & Invoice <span style="background:linear-gradient(135deg,#fcd34d,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Command Centre</span></div>
      <div class="hero-sub">Track all payments, manage invoices, monitor cash flow and generate financial reports across all vendors.</div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="openModal('modal-add-invoice')">💰 New Invoice</button>
        <button class="btn btn-primary" onclick="navigateTo('invoice-gen')">🧾 Invoice Generator</button>
        <button class="btn btn-secondary" onclick="navigateTo('analytics')">📊 Financial Analytics</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${fmtCurrency(s.totalValue||0,'INR')}</div><div class="stat-label">Total Invoice Volume</div><div class="stat-delta up">All time</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${fmtCurrency(s.paidValue||0,'INR')}</div><div class="stat-label">Total Paid</div><div class="stat-delta up">${paid.length} invoices</div></div>
      <div class="stat-card"><div class="stat-icon">⚠️</div><div class="stat-value">${fmtCurrency(s.overdueVal||0,'INR')}</div><div class="stat-label">Overdue Amount</div><div class="stat-delta ${s.overdueVal>0?'dn':'up'}">${overdue.length} invoices</div></div>
      <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-value">${pending.length}</div><div class="stat-label">Pending Invoices</div><div class="stat-delta ${pending.length>0?'dn':'up'}">${pending.length>0?'Awaiting payment':'All settled'}</div></div>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-hdr"><div class="card-title">💸 Payment Status Breakdown</div></div>
        ${[
          {label:'Paid',count:paid.length,amount:s.paidValue||0,color:'var(--ok)',pct:invoices.length?Math.round(paid.length/invoices.length*100):0},
          {label:'Pending',count:pending.length,amount:invoices.filter(i=>i.status==='pending').reduce((a,i)=>a+parseFloat(i.total_amount||0),0),color:'var(--warn)',pct:invoices.length?Math.round(pending.length/invoices.length*100):0},
          {label:'Overdue',count:overdue.length,amount:s.overdueVal||0,color:'var(--err)',pct:invoices.length?Math.round(overdue.length/invoices.length*100):0},
        ].map(r=>`
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;align-items:center">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:10px;height:10px;border-radius:50%;background:${r.color}"></div>
                <span style="font-size:13px;font-weight:600">${r.label}</span>
                <span class="badge" style="font-size:11px">${r.count}</span>
              </div>
              <span style="font-size:13px;font-weight:700;color:${r.color}">${fmtCurrency(r.amount,'INR')}</span>
            </div>
            <div class="progress"><div class="progress-bar" style="width:${r.pct}%;background:${r.color}"></div></div>
          </div>`).join('')}
        <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="navigateTo('invoices')">View All Invoices →</button>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">⚡ Finance Actions</div></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-secondary" onclick="openModal('modal-add-invoice')" style="justify-content:flex-start">💰 Create New Invoice</button>
          <button class="btn btn-secondary" onclick="navigateTo('invoice-gen')" style="justify-content:flex-start">🧾 Professional Invoice Generator</button>
          <button class="btn btn-secondary" onclick="navigateTo('invoices')" style="justify-content:flex-start">📋 Review All Invoices</button>
          <button class="btn btn-secondary" onclick="navigateTo('analytics')" style="justify-content:flex-start">📊 Financial Analytics</button>
          <button class="btn btn-secondary" onclick="navigateTo('documents')" style="justify-content:flex-start">📁 Financial Documents</button>
        </div>
        ${overdue.length?`
        <div style="margin-top:12px;padding:10px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:var(--rm)">
          <div style="font-size:12px;color:var(--err);font-weight:600">⚠️ ${overdue.length} overdue invoice(s) need attention</div>
          <button class="btn btn-danger btn-sm" style="margin-top:8px" onclick="navigateTo('invoices')">Review Overdue</button>
        </div>`:''}
      </div>
    </div>
    <div class="card" id="df-invoices"><div class="card-hdr"><div class="card-title">💰 Recent Invoices</div><button class="btn btn-primary btn-sm" onclick="openModal('modal-add-invoice')">+ New</button></div><div class="spinner" style="margin:20px auto;display:block"></div></div>
    <!-- FINANCE CHARTS -->
    <div class="grid-3" style="margin-top:16px">
      <div class="card" style="grid-column:span 2"><div class="card-hdr"><div class="card-title">📈 Invoice Trend — Total vs Collected (6 Months)</div></div><div style="position:relative;height:220px"><canvas id="chart-fin-trend"></canvas></div></div>
      <div class="card"><div class="card-hdr"><div class="card-title">💰 Payment Status</div></div><div style="position:relative;height:220px"><canvas id="chart-fin-status"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-hdr"><div class="card-title">📊 Invoices Raised Per Month</div></div><div style="position:relative;height:180px"><canvas id="chart-fin-count"></canvas></div></div>`;
  loadRecentInvoices('df-invoices', 6);
  setTimeout(()=>drawFinanceDashCharts(invoices),80);
}

// ── AUDITOR DASHBOARD ──────────────────────────────────────
async function dashAuditor(el) {
  const name=currentUser?.first_name||'Auditor';
  let auditRows=[]; try{auditRows=await Api.audit();}catch(e){}
  let s=statsCache; try{s=statsCache=await Api.stats();}catch(e){}
  const todayLogs=auditRows.filter(a=>new Date(a.created_at).toDateString()===new Date().toDateString()).length;
  el.innerHTML=`
    <div class="dash-hero" style="background:linear-gradient(135deg,rgba(88,28,135,.55),rgba(126,34,206,.3),rgba(192,132,252,.12))">
      <div class="hero-greeting">🔍 Auditor Dashboard — Welcome, ${name}!</div>
      <div class="hero-title">Audit & Compliance <span style="background:linear-gradient(135deg,#c084fc,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Monitor</span></div>
      <div class="hero-sub">Read-only access to all audit trails, compliance reports, and system analytics for governance and oversight.</div>
      <div class="hero-actions">
        <button class="btn btn-primary" onclick="navigateTo('audit')">📋 Full Audit Log</button>
        <button class="btn btn-secondary" onclick="navigateTo('compliance')">🛡️ Compliance Report</button>
        <button class="btn btn-secondary" onclick="navigateTo('analytics')">📊 Analytics</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-value">${auditRows.length}</div><div class="stat-label">Audit Log Entries</div><div class="stat-delta up">Total recorded</div></div>
      <div class="stat-card"><div class="stat-icon">📅</div><div class="stat-value">${todayLogs}</div><div class="stat-label">Activity Today</div><div class="stat-delta up">Logged today</div></div>
      <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-value">${s.contracts||0}</div><div class="stat-label">Contracts</div><div class="stat-delta up">${s.active||0} active</div></div>
      <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-value">${s.vendors||0}</div><div class="stat-label">Vendors</div><div class="stat-delta up">On record</div></div>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-hdr"><div class="card-title">🛡️ Compliance Framework Status</div><button class="btn btn-secondary btn-sm" onclick="navigateTo('compliance')">Full Report</button></div>
        ${[
          {name:'GDPR',score:88,issues:2,color:'#22c55e'},
          {name:'ISO 27001',score:76,issues:4,color:'#f59e0b'},
          {name:'SOC 2',score:91,issues:1,color:'#22c55e'},
          {name:'PCI DSS',score:62,issues:7,color:'#ef4444'},
          {name:'HIPAA',score:84,issues:3,color:'#38bdf8'},
        ].map(f=>`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
            <span style="width:72px;font-size:12px;font-weight:600;color:var(--txt2)">${f.name}</span>
            <div class="progress" style="flex:1"><div class="progress-bar" style="width:${f.score}%;background:${f.color}"></div></div>
            <span style="width:32px;font-size:12px;font-weight:700;color:${f.color}">${f.score}%</span>
            <span style="width:60px;font-size:11px;color:${f.issues>5?'var(--err)':f.issues>2?'var(--warn)':'var(--ok)'}">${f.issues} issue${f.issues!==1?'s':''}</span>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">📊 Audit Activity Summary</div></div>
        ${['CREATE','UPDATE','DELETE','LOGIN','UPLOAD'].map(action=>{
          const cnt=auditRows.filter(a=>a.action===action).length;
          return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
            <span class="badge ${action==='DELETE'?'badge-danger':action==='CREATE'?'badge-success':'badge-info'}" style="width:70px;justify-content:center">${action}</span>
            <div class="progress" style="flex:1"><div class="analytics-bar-fill" style="width:${Math.min(cnt/Math.max(auditRows.length,1)*100*5,100)}%;height:7px;background:linear-gradient(90deg,var(--p5),var(--p7));border-radius:4px;transition:width 1s"></div></div>
            <span style="font-size:13px;font-weight:600;width:30px;text-align:right">${cnt}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card" id="dau-audit"><div class="card-hdr"><div class="card-title">📋 Recent Audit Entries</div><button class="btn btn-secondary btn-sm" onclick="navigateTo('audit')">Full Log →</button></div><div class="spinner" style="margin:20px auto;display:block"></div></div>
    <!-- AUDITOR CHARTS -->
    <div class="grid-2" style="margin-top:16px">
      <div class="card"><div class="card-hdr"><div class="card-title">📊 Audit Actions Breakdown</div></div><div style="position:relative;height:220px"><canvas id="chart-aud-actions"></canvas></div></div>
      <div class="card"><div class="card-hdr"><div class="card-title">📈 System Activity Trend (6 Months)</div></div><div style="position:relative;height:220px"><canvas id="chart-aud-trend"></canvas></div></div>
    </div>`;
  loadRecentAudit('dau-audit', 10);
  setTimeout(()=>drawAuditorDashCharts(auditRows),80);
}

// ── VIEWER DASHBOARD ───────────────────────────────────────
async function dashViewer(el) {
  const name=currentUser?.first_name||'Guest';
  let s=statsCache; try{s=statsCache=await Api.stats();}catch(e){}
  el.innerHTML=`
    <div class="dash-hero" style="background:linear-gradient(135deg,rgba(15,23,42,.65),rgba(30,41,59,.4),rgba(71,85,105,.12))">
      <div class="hero-greeting">👁️ Viewer Dashboard — Welcome, ${name}!</div>
      <div class="hero-title">Company <span style="background:linear-gradient(135deg,#94a3b8,#64748b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">Overview</span></div>
      <div class="hero-sub">Read-only access to company contracts, vendor information and key metrics. Contact your admin for editing permissions.</div>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-value">${s.contracts||0}</div><div class="stat-label">Total Contracts</div><div class="stat-delta up">${s.active||0} active</div></div>
      <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-value">${s.vendors||0}</div><div class="stat-label">Vendors</div><div class="stat-delta up">Registered</div></div>
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${fmtCurrency(s.totalValue||0,'INR')}</div><div class="stat-label">Contract Value</div><div class="stat-delta up">Total portfolio</div></div>
      <div class="stat-card"><div class="stat-icon">📁</div><div class="stat-value">${s.documents||0}</div><div class="stat-label">Documents</div><div class="stat-delta up">Available</div></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-hdr"><div class="card-title">ℹ️ Your Access Level</div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        ${[
          {icon:'✅',label:'View Contracts',has:true},
          {icon:'✅',label:'View Vendors',has:true},
          {icon:'✅',label:'View Notifications',has:true},
          {icon:'❌',label:'Edit Contracts',has:false},
          {icon:'❌',label:'Create Invoices',has:false},
          {icon:'❌',label:'Manage Vendors',has:false},
        ].map(a=>`
          <div style="display:flex;align-items:center;gap:8px;padding:10px;background:var(--surf2);border:1px solid var(--bdr);border-radius:var(--rm)">
            <span style="font-size:16px">${a.icon}</span>
            <span style="font-size:13px;color:${a.has?'var(--txt)':'var(--txt3)'}">${a.label}</span>
          </div>`).join('')}
      </div>
      <div style="margin-top:14px;padding:11px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);border-radius:var(--rm);font-size:13px;color:var(--info)">
        ℹ️ Need more access? Contact your system administrator to upgrade your role.
      </div>
    </div>
    <div class="card" id="dv-contracts"><div class="card-hdr"><div class="card-title">📄 Recent Contracts</div></div><div class="spinner" style="margin:20px auto;display:block"></div></div>`;
  loadRecentContracts('dv-contracts', 5);
}

// ── Shared loaders ──────────────────────────────────────────
async function loadRecentContracts(containerId, limit=5) {
  const c=document.getElementById(containerId); if(!c) return;
  try {
    const data=await Api.contracts(); const items=data.slice(0,limit);
    const tbody=c.querySelector('table tbody');
    if (!items.length) { const inner=c.querySelector('.card-hdr')?c:c; inner.insertAdjacentHTML('beforeend',`<div class="empty-state"><div class="ei">📄</div><h3>No contracts yet</h3><p>Create your first contract to get started</p></div>`); return; }
    const html=`<table><thead><tr><th>Contract</th><th>Vendor</th><th>Value</th><th>Status</th><th>Risk</th></tr></thead><tbody>${items.map(r=>`<tr><td><div style="font-weight:600;font-size:13px">${r.name}</div><div class="text-muted">${r.contract_number||''}</div></td><td style="font-size:13px">${r.vendor_name}</td><td style="font-weight:600;font-size:13px">${fmtCurrency(r.value,r.currency)}</td><td>${badge(r.status)}</td><td>${badge(r.risk,'badge-'+r.risk)}</td></tr>`).join('')}</tbody></table>`;
    const existing=c.querySelector('.spinner'); if(existing) existing.remove();
    c.insertAdjacentHTML('beforeend', html);
  } catch(e) {}
}

async function loadRecentInvoices(containerId, limit=5) {
  const c=document.getElementById(containerId); if(!c) return;
  try {
    const data=await Api.invoices(); const items=data.slice(0,limit);
    if (!items.length) { const sp=c.querySelector('.spinner');if(sp)sp.outerHTML=`<div class="empty-state"><div class="ei">💰</div><h3>No invoices yet</h3></div>`; return; }
    const html=`<table><thead><tr><th>Invoice</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Due</th><th>Action</th></tr></thead><tbody>${items.map(r=>`<tr><td><div style="font-weight:600;font-size:13px">${r.invoice_number}</div></td><td style="font-size:13px">${r.vendor_name}</td><td style="font-weight:600;font-size:13px">${fmtCurrency(r.total_amount,r.currency)}</td><td>${badge(r.status)}</td><td style="font-size:12px">${fmtDate(r.due_date)}</td><td>${r.status==='pending'?`<button class="btn btn-success btn-sm" onclick="markInvoicePaid('${r.id}')">✓ Paid</button>`:''}</td></tr>`).join('')}</tbody></table>`;
    const sp=c.querySelector('.spinner'); if(sp) sp.remove();
    c.insertAdjacentHTML('beforeend', html);
  } catch(e) {}
}

async function loadRecentActivity(containerId, limit=8) {
  const c=document.getElementById(containerId); if(!c) return;
  try {
    const data=await Api.audit(); const items=data.slice(0,limit);
    const sp=c.querySelector('.spinner'); if(sp) sp.remove();
    if (!items.length) { c.insertAdjacentHTML('beforeend',`<div class="empty-state"><div class="ei">📋</div><p>No activity yet</p></div>`); return; }
    c.insertAdjacentHTML('beforeend', items.map(a=>`<div style="display:flex;align-items:flex-start;gap:9px;padding:7px 0;border-bottom:1px solid var(--bdr)"><div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--p5),var(--p7));display:grid;place-items:center;font-size:11px;color:#fff;font-weight:700;flex-shrink:0">${a.action[0]}</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500">${a.description||a.action}</div><div class="text-muted">${timeAgo(a.created_at)} · ${a.user_name||'System'}</div></div></div>`).join(''));
  } catch(e) {}
}

async function loadRecentAudit(containerId, limit=10) {
  const c=document.getElementById(containerId); if(!c) return;
  try {
    const data=await Api.audit(); const items=data.slice(0,limit);
    const sp=c.querySelector('.spinner'); if(sp) sp.remove();
    if (!items.length) { c.insertAdjacentHTML('beforeend',`<div class="empty-state"><div class="ei">📋</div><p>No audit entries yet</p></div>`); return; }
    c.insertAdjacentHTML('beforeend', `<table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Description</th></tr></thead><tbody>${items.map(r=>`<tr><td class="text-muted" style="white-space:nowrap">${fmtDateTime(r.created_at)}</td><td style="font-size:13px;font-weight:500">${r.user_name||'System'}</td><td><span class="badge ${r.action==='DELETE'?'badge-danger':r.action==='CREATE'?'badge-success':'badge-info'}">${r.action}</span></td><td style="font-size:13px">${r.description||'—'}</td></tr>`).join('')}</tbody></table>`);
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════
//  VENDORS PAGE
// ════════════════════════════════════════════════════════════
async function renderVendors(el, role) {
  const canEdit = ['admin','manager'].includes(role);
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">🏢 Vendors</div><div class="page-sub">Manage your supplier relationships and risk profiles</div></div>
      ${canEdit?`<button class="btn btn-primary" onclick="openModal('modal-add-vendor')">➕ Add Vendor</button>`:''}
    </div>
    <div class="filter-bar">
      <input type="text" placeholder="🔍 Search vendors…" id="vendor-search" oninput="filterVendors(this.value)">
      <select id="vendor-cat" onchange="filterVendors(document.getElementById('vendor-search').value)">
        <option value="all">All Categories</option>
        <option>Technology</option><option>Legal</option><option>Finance</option>
        <option>Logistics</option><option>Marketing</option><option>HR</option><option>Operations</option>
      </select>
      <select id="vendor-status" onchange="filterVendors(document.getElementById('vendor-search').value)">
        <option value="all">All Status</option><option>Verified</option><option>Pending</option><option>Suspended</option>
      </select>
    </div>
    <div id="vendor-grid" class="vendor-grid"><div class="empty-state"><span class="spinner"></span></div></div>`;
  await loadVendors(canEdit);
}

async function loadVendors(canEdit=true) {
  try { vendorCache=await Api.vendors(); renderVendorCards(vendorCache, canEdit); } catch(e) {}
}

function filterVendors(search) {
  const cat=document.getElementById('vendor-cat')?.value||'all';
  const status=document.getElementById('vendor-status')?.value||'all';
  const s=search.toLowerCase();
  const canEdit=['admin','manager'].includes(currentUser?.role);
  renderVendorCards(vendorCache.filter(v=>{
    return (!s||(v.name.toLowerCase().includes(s)||(v.email||'').toLowerCase().includes(s)))
      && (cat==='all'||v.category===cat)
      && (status==='all'||v.status===status);
  }), canEdit);
}

function renderVendorCards(vendors, canEdit=true) {
  const g=document.getElementById('vendor-grid'); if(!g) return;
  if (!vendors.length) { g.innerHTML=`<div class="empty-state"><div class="ei">🏢</div><h3>No vendors found</h3><p>Try a different search or add your first vendor</p>${canEdit?`<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="openModal('modal-add-vendor')">Add Vendor</button>`:''}</div>`; return; }
  g.innerHTML=vendors.map(v=>`
    <div class="vendor-card">
      <div class="vc-hdr" style="background:linear-gradient(135deg,${v.avatar_color||'#7c3aed'}22,transparent)">
        <div class="vc-avatar" style="background:${v.avatar_color||'#7c3aed'}">${v.name[0].toUpperCase()}</div>
        <div><div class="vc-name">${v.name}</div>${badge(v.status||'Pending')}</div>
      </div>
      <div class="vc-body">
        <div class="vc-meta">
          <span>📦 ${v.category}</span>
          ${v.email?`<span>📧 ${v.email}</span>`:''}
          ${v.phone?`<span>📞 ${v.phone}</span>`:''}
        </div>
        <div style="margin-top:9px;display:flex;align-items:center;justify-content:space-between">
          <div><div class="text-muted" style="font-size:11px;margin-bottom:3px">RISK LEVEL</div>${riskPips(v.risk_level||2)}</div>
          <div style="text-align:right"><div class="text-muted" style="font-size:11px">CONTRACTS</div><div style="font-weight:700;font-size:15px">${v.contract_count||0}</div></div>
        </div>
      </div>
      <div class="vc-foot">
        <span style="font-size:12px;color:var(--txt3)">${v.payment_terms||'Net 30'}</span>
        ${canEdit?`<div style="display:flex;gap:5px">
          <button class="btn btn-secondary btn-sm btn-icon" onclick="editVendor('${v.id}')" title="Edit">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteVendor('${v.id}','${v.name.replace(/'/g,"\\'")}')" title="Delete">🗑️</button>
        </div>`:'<span class="text-muted">Read only</span>'}
      </div>
    </div>`).join('');
}

let editingVendorId=null;
function resetVendorForm(){editingVendorId=null;document.getElementById('form-vendor')?.reset();document.getElementById('modal-vendor-title').textContent='Add Vendor';}
async function editVendor(id) {
  const v=vendorCache.find(x=>x.id===id); if(!v) return;
  editingVendorId=id;
  document.getElementById('modal-vendor-title').textContent='Edit Vendor';
  const f=document.getElementById('form-vendor');
  ['name','category','contact_name','email','phone','tax_id','address','risk_level','payment_terms','status','notes'].forEach(k=>{
    const el=f.querySelector(`[name="${k}"]`); if(el&&v[k]!=null) el.value=v[k];
  });
  openModal('modal-add-vendor');
}
async function submitVendor(e) {
  e.preventDefault();
  const form=document.getElementById('form-vendor');
  const body=Object.fromEntries(new FormData(form));
  clearAllErrors(form);
  try {
    if(editingVendorId) await Api.updateVendor(editingVendorId,body); else await Api.createVendor(body);
    Toast.success(editingVendorId?'Vendor updated!':'Vendor created!');
    closeModal('modal-add-vendor'); form.reset(); editingVendorId=null;
    vendorCache=await Api.vendors(); renderVendorCards(vendorCache,true);
  } catch(e) { showFormErrors(form, e.errors||[e.error||'Failed to save vendor']); }
}
async function deleteVendor(id,name) {
  if(!confirm(`Delete vendor "${name}"? This cannot be undone.`)) return;
  try { await Api.deleteVendor(id); Toast.success('Vendor deleted'); vendorCache=await Api.vendors(); renderVendorCards(vendorCache,true); }
  catch(e) { Toast.error('Failed to delete: '+(e.error||'Check if vendor has active contracts')); }
}

// ════════════════════════════════════════════════════════════
//  CONTRACTS PAGE
// ════════════════════════════════════════════════════════════
async function renderContracts(el, role) {
  const canEdit=['admin','manager','legal'].includes(role);
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">📄 Contracts</div><div class="page-sub">Full lifecycle contract management</div></div>
      ${canEdit?`<button class="btn btn-primary" onclick="openModal('modal-add-contract')">➕ New Contract</button>`:''}
    </div>
    <div class="filter-bar">
      <input type="text" placeholder="🔍 Search contracts…" id="contract-search" oninput="loadContractsList()">
      <select id="contract-status-filter" onchange="loadContractsList()">
        <option value="all">All Status</option><option value="active">Active</option><option value="draft">Draft</option>
        <option value="review">Under Review</option><option value="expired">Expired</option>
      </select>
    </div>
    <div class="card"><div class="table-wrap">
      <table><thead><tr><th>Contract</th><th>Vendor</th><th>Value</th><th>Status</th><th>Risk</th><th>Type</th><th>Expiry</th>${canEdit?'<th>Actions</th>':''}</tr></thead>
      <tbody id="contracts-tbody"><tr><td colspan="8" style="text-align:center;padding:24px"><span class="spinner"></span></td></tr></tbody>
      </table></div></div>`;
  await loadContractsList(canEdit);
}

async function loadContractsList(canEdit) {
  const ce=canEdit!==undefined?canEdit:['admin','manager','legal'].includes(currentUser?.role);
  const search=document.getElementById('contract-search')?.value||'';
  const status=document.getElementById('contract-status-filter')?.value||'all';
  let q='?'; if(search) q+=`search=${encodeURIComponent(search)}&`; if(status!=='all') q+=`status=${status}`;
  try {
    const data=await Api.contracts(q);
    const tb=document.getElementById('contracts-tbody'); if(!tb) return;
    if(!data.length){tb.innerHTML=`<tr><td colspan="8"><div class="empty-state"><div class="ei">📄</div><h3>No contracts found</h3></div></td></tr>`;return;}
    tb.innerHTML=data.map(c=>`<tr>
      <td><div style="font-weight:600;font-size:13px">${c.name}</div><div class="text-muted">${c.contract_number||''}</div></td>
      <td style="font-size:13px">${c.vendor_name}</td>
      <td style="font-weight:600;font-size:13px">${fmtCurrency(c.value,c.currency)}</td>
      <td>${badge(c.status)}</td>
      <td>${badge(c.risk,'badge-'+c.risk)}</td>
      <td style="font-size:12px;color:var(--txt3)">${c.contract_type||'Service'}</td>
      <td style="font-size:12px">${c.expiry_date?fmtDate(c.expiry_date):'<span class="text-muted">—</span>'}</td>
      ${ce?`<td><button class="btn btn-danger btn-sm btn-icon" onclick="deleteContract('${c.id}','${c.name.replace(/'/g,"\\'")}')">🗑️</button></td>`:''}
    </tr>`).join('');
  } catch(e) {}
}

async function submitContract(e) {
  e.preventDefault();
  const form=document.getElementById('form-contract');
  const body=Object.fromEntries(new FormData(form));
  const vendor=vendorCache.find(v=>v.name.toLowerCase()===(body.vendor_name||'').toLowerCase());
  if(vendor) body.vendor_id=vendor.id;
  clearAllErrors(form);
  try {
    await Api.createContract(body);
    Toast.success(`Contract "${body.name}" created!`);
    closeModal('modal-add-contract'); form.reset();
    if(currentPage==='contracts') await loadContractsList();
    statsCache=await Api.stats().catch(()=>statsCache);
  } catch(e) { showFormErrors(form, e.errors||[e.error||'Failed to create contract']); }
}

async function deleteContract(id,name) {
  if(!confirm(`Delete contract "${name}"?`)) return;
  try { await Api.deleteContract(id); Toast.success('Contract deleted'); await loadContractsList(); }
  catch(e) { Toast.error('Failed to delete'); }
}

// ════════════════════════════════════════════════════════════
//  INVOICES PAGE
// ════════════════════════════════════════════════════════════
async function renderInvoices(el, role) {
  const canEdit=['admin','manager','finance'].includes(role);
  let s={}; try{s=await Api.stats();}catch(e){}
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">💰 Invoices</div><div class="page-sub">Track all vendor payments and billing</div></div>
      ${canEdit?`<button class="btn btn-primary" onclick="openModal('modal-add-invoice')">➕ New Invoice</button>`:''}
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${fmtCurrency(s.totalValue||0,'INR')}</div><div class="stat-label">Total Volume</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${fmtCurrency(s.paidValue||0,'INR')}</div><div class="stat-label">Paid</div></div>
      <div class="stat-card"><div class="stat-icon">⚠️</div><div class="stat-value">${fmtCurrency(s.overdueVal||0,'INR')}</div><div class="stat-label">Overdue</div></div>
      <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-value">${s.pendingCnt||0}</div><div class="stat-label">Pending</div></div>
    </div>
    <div class="filter-bar">
      <select id="inv-status-filter" onchange="loadInvoicesList(${canEdit})">
        <option value="all">All</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
      </select>
    </div>
    <div class="card"><div class="table-wrap">
      <table><thead><tr><th>Invoice #</th><th>Vendor</th><th>Amount</th><th>Tax</th><th>Total</th><th>Status</th><th>Due</th>${canEdit?'<th>Actions</th>':''}</tr></thead>
      <tbody id="invoices-tbody"><tr><td colspan="8" style="text-align:center;padding:24px"><span class="spinner"></span></td></tr></tbody>
      </table></div></div>`;
  await loadInvoicesList(canEdit);
}

async function loadInvoicesList(canEdit) {
  const ce=canEdit!==undefined?canEdit:['admin','manager','finance'].includes(currentUser?.role);
  const status=document.getElementById('inv-status-filter')?.value||'all';
  try {
    const data=await Api.invoices(status!=='all'?`?status=${status}`:'');
    const tb=document.getElementById('invoices-tbody'); if(!tb) return;
    if(!data.length){tb.innerHTML=`<tr><td colspan="8"><div class="empty-state"><div class="ei">💰</div><h3>No invoices</h3></div></td></tr>`;return;}
    tb.innerHTML=data.map(i=>`<tr>
      <td><div style="font-weight:600;font-size:13px">${i.invoice_number}</div></td>
      <td style="font-size:13px">${i.vendor_name}</td>
      <td style="font-size:13px">${fmtCurrency(i.amount,i.currency)}</td>
      <td style="font-size:12px;color:var(--txt3)">${i.tax_rate}%</td>
      <td style="font-weight:600;font-size:13px">${fmtCurrency(i.total_amount,i.currency)}</td>
      <td>${badge(i.status)}</td>
      <td style="font-size:12px">${i.due_date?fmtDate(i.due_date):'—'}</td>
      ${ce?`<td><div style="display:flex;gap:4px">
        ${i.status==='pending'?`<button class="btn btn-success btn-sm" onclick="markInvoicePaid('${i.id}')">✓ Paid</button>`:''}
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteInvoice('${i.id}','${i.invoice_number}')">🗑️</button>
      </div></td>`:''}
    </tr>`).join('');
  } catch(e) {}
}

async function markInvoicePaid(id) {
  try {
    await Api.updateInvoice(id,{status:'paid',paid_date:new Date().toISOString().split('T')[0]});
    Toast.success('Invoice marked as paid!');
    await loadInvoicesList();
  } catch(e) { Toast.error('Failed to update invoice'); }
}

async function submitInvoice(e) {
  e.preventDefault();
  const form=document.getElementById('form-invoice');
  const body=Object.fromEntries(new FormData(form));
  const vendor=vendorCache.find(v=>v.name.toLowerCase()===(body.vendor_name||'').toLowerCase());
  if(vendor) body.vendor_id=vendor.id;
  clearAllErrors(form);
  try {
    await Api.createInvoice(body);
    Toast.success('Invoice created!');
    closeModal('modal-add-invoice'); form.reset();
    if(currentPage==='invoices') await loadInvoicesList();
  } catch(e) { showFormErrors(form, e.errors||[e.error||'Failed to create invoice']); }
}

async function deleteInvoice(id,num) {
  if(!confirm(`Delete invoice ${num}?`)) return;
  try { await Api.deleteInvoice(id); Toast.success('Invoice deleted'); await loadInvoicesList(); }
  catch(e) { Toast.error('Failed to delete'); }
}

// ════════════════════════════════════════════════════════════
//  WORKFLOWS
// ════════════════════════════════════════════════════════════
function renderWorkflows(el) {
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">⚙️ Workflows</div><div class="page-sub">Contract approval pipelines and automation rules</div></div></div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-hdr"><div class="card-title">📋 Contract Approval Pipeline</div></div>
        <div class="pipeline">
          <div class="pipe-stage"><div><div class="pipe-node done">✓</div><div class="pipe-label">Draft</div></div></div>
          <div class="pipe-conn done"></div>
          <div class="pipe-stage"><div><div class="pipe-node done">✓</div><div class="pipe-label">Legal Review</div></div></div>
          <div class="pipe-conn done"></div>
          <div class="pipe-stage"><div><div class="pipe-node current">3</div><div class="pipe-label">Finance Approval</div></div></div>
          <div class="pipe-conn"></div>
          <div class="pipe-stage"><div><div class="pipe-node">4</div><div class="pipe-label">Exec Sign-off</div></div></div>
          <div class="pipe-conn"></div>
          <div class="pipe-stage"><div><div class="pipe-node">5</div><div class="pipe-label">Active</div></div></div>
        </div>
        <div style="margin-top:12px;font-size:13px;color:var(--txt3)">Currently at Stage 3 — awaiting Finance approval</div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">📋 Invoice Approval</div></div>
        <div class="pipeline">
          <div class="pipe-stage"><div><div class="pipe-node done">✓</div><div class="pipe-label">Submitted</div></div></div>
          <div class="pipe-conn done"></div>
          <div class="pipe-stage"><div><div class="pipe-node current">2</div><div class="pipe-label">Review</div></div></div>
          <div class="pipe-conn"></div>
          <div class="pipe-stage"><div><div class="pipe-node">3</div><div class="pipe-label">Approved</div></div></div>
          <div class="pipe-conn"></div>
          <div class="pipe-stage"><div><div class="pipe-node">4</div><div class="pipe-label">Paid</div></div></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-hdr"><div class="card-title">⚡ Automation Rules</div></div>
      ${['Auto-alert 30 days before contract expiry','Flag invoices overdue by more than 14 days','Notify legal team on new vendor onboarding','Escalate high-risk contracts to management','Auto-renew active contracts if enabled'].map((rule,i)=>`
        <div class="toggle-row">
          <div><div class="toggle-label">${rule}</div><div class="toggle-sub">Automation rule #${i+1}</div></div>
          <label class="toggle"><input type="checkbox" ${i<3?'checked':''}><span class="toggle-slider"></span></label>
        </div>`).join('')}
    </div>`;
}

// ════════════════════════════════════════════════════════════
//  DOCUMENTS
// ════════════════════════════════════════════════════════════
async function renderDocuments(el, role) {
  const canUpload=['admin','manager','legal','finance'].includes(role);
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">📁 Documents</div><div class="page-sub">Secure file storage and management</div></div></div>
    ${canUpload?`
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:12px">📤 Upload Documents</div>
      <div class="upload-zone" id="upload-zone" onclick="document.getElementById('file-input-hidden').click()">
        <div class="upload-icon">📁</div>
        <div class="upload-text">Click to browse files</div>
        <div class="upload-hint">or drag and drop here · PDF, DOCX, XLSX, images · Max 50MB</div>
      </div>
      <input type="file" id="file-input-hidden" multiple accept="*/*" style="display:none" onchange="handleFileUpload(this.files)">
      <div id="upload-progress"></div>
    </div>`:''}
    <div class="card">
      <div class="card-hdr"><div class="card-title">📋 All Documents</div><span id="doc-count" class="text-muted"></span></div>
      <div id="docs-list"><div class="empty-state"><span class="spinner"></span></div></div>
    </div>`;
  if (canUpload) {
    const z=document.getElementById('upload-zone');
    z.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();z.classList.add('drag-over');});
    z.addEventListener('dragleave',e=>{e.preventDefault();z.classList.remove('drag-over');});
    z.addEventListener('drop',e=>{
      e.preventDefault();e.stopPropagation();
      z.classList.remove('drag-over');
      handleFileUpload(e.dataTransfer.files);
    });
  }
  await loadDocuments(['admin','manager'].includes(role));
}

async function handleFileUpload(files) {
  if(!files||!files.length) return;
  const prog=document.getElementById('upload-progress');
  prog.innerHTML=`<div style="margin-top:10px;font-size:13px;color:var(--txt2)">Uploading ${files.length} file(s)…<span class="spinner" style="margin-left:8px"></span></div>`;
  const fd=new FormData();
  for(const f of files) fd.append('files',f);
  try { await Api.uploadDoc(fd); Toast.success(`${files.length} file(s) uploaded!`); prog.innerHTML=''; await loadDocuments(true); }
  catch(e) { prog.innerHTML=''; Toast.error('Upload failed: '+(e.error||'Server error')); }
}

async function loadDocuments(canDelete=false) {
  try {
    const docs=await Api.documents();
    const list=document.getElementById('docs-list');
    const cnt=document.getElementById('doc-count');
    if(cnt) cnt.textContent=`${docs.length} file${docs.length!==1?'s':''}`;
    if(!docs.length){list.innerHTML=`<div class="empty-state"><div class="ei">📁</div><h3>No documents yet</h3><p>Upload your first document above</p></div>`;return;}
    const fmtSize=b=>b<1024?`${b}B`:b<1048576?`${(b/1024).toFixed(1)}KB`:`${(b/1048576).toFixed(1)}MB`;
    list.innerHTML=`<table><thead><tr><th>File Name</th><th>Size</th><th>Type</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>${docs.map(d=>`<tr>
      <td><div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">${getFileIcon(d.mime_type)}</span><span style="font-weight:500;font-size:13px">${d.original_name}</span></div></td>
      <td style="font-size:12px;color:var(--txt3)">${fmtSize(d.file_size||0)}</td>
      <td style="font-size:12px;color:var(--txt3)">${d.mime_type||'—'}</td>
      <td style="font-size:12px;color:var(--txt3)">${fmtDate(d.uploaded_at)}</td>
      <td><div style="display:flex;gap:4px">
        <a href="${Api.downloadUrl(d.id)}" class="btn btn-secondary btn-sm" target="_blank">⬇️ Download</a>
        ${canDelete?`<button class="btn btn-danger btn-sm btn-icon" onclick="deleteDoc('${d.id}','${d.original_name.replace(/'/g,"\\'")}')" title="Delete">🗑️</button>`:''}
      </div></td>
    </tr>`).join('')}</tbody></table>`;
  } catch(e) {}
}

async function deleteDoc(id,name) {
  if(!confirm(`Delete "${name}"?`)) return;
  try { await Api.deleteDoc(id); Toast.success('File deleted'); await loadDocuments(true); }
  catch(e) { Toast.error('Failed to delete'); }
}

// ════════════════════════════════════════════════════════════
//  INVOICE GENERATOR
// ════════════════════════════════════════════════════════════
let igItems=[];
function renderInvoiceGen(el) {
  igItems=[{desc:'',qty:1,price:0},{desc:'',qty:1,price:0}];
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">🧾 Invoice Generator</div><div class="page-sub">Create professional invoices with live preview</div></div></div>
    <div class="inv-gen-wrap">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:14px">📋 Invoice Details</div>
          <div class="form-row">
            <div class="form-group"><label>From Company</label><input type="text" id="ig-from" placeholder="Your company name" oninput="updatePreview()"></div>
            <div class="form-group"><label>Invoice Number</label><input type="text" id="ig-num" value="INV-${new Date().getFullYear()}-001" oninput="updatePreview()"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Bill To</label><input type="text" id="ig-to" placeholder="Client / vendor name" list="ig-vendor-list" oninput="updatePreview()"><datalist id="ig-vendor-list">${vendorCache.map(v=>`<option value="${v.name}">`).join('')}</datalist></div>
            <div class="form-group"><label>Currency</label><select id="ig-curr" onchange="updatePreview()">${currencyOptions('INR')}</select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Issue Date</label><input type="date" id="ig-date" value="${new Date().toISOString().split('T')[0]}" oninput="updatePreview()"></div>
            <div class="form-group"><label>Due Date</label><input type="date" id="ig-due" oninput="updatePreview()"></div>
          </div>
          <div class="form-group"><label>Tax Rate (%)</label><input type="number" id="ig-tax" value="18" min="0" max="100" oninput="updatePreview()"></div>
        </div>
        <div class="card">
          <div class="card-hdr"><div class="card-title">📝 Line Items</div><button class="btn btn-secondary btn-sm" onclick="addIgItem()">+ Add Item</button></div>
          <div id="ig-items-wrap"></div>
          <div style="display:flex;gap:9px;margin-top:14px">
            <button class="btn btn-primary" onclick="saveInvoiceToDb()">💾 Save to System</button>
            <button class="btn btn-secondary" onclick="printInvoice()">🖨️ Download / Print PDF</button>
          </div>
        </div>
      </div>
      <div class="inv-preview" id="inv-preview"><div style="text-align:center;padding:24px;color:var(--txt3)">Add details to see preview</div></div>
    </div>`;
  renderIgItems(); updatePreview();
}

function addIgItem(){igItems.push({desc:'',qty:1,price:0});renderIgItems();}
function removeIgItem(i){igItems.splice(i,1);renderIgItems();}
function renderIgItems(){
  const c=document.getElementById('ig-items-wrap'); if(!c) return;
  c.innerHTML=`<div style="display:grid;grid-template-columns:1fr 80px 110px 30px;gap:7px;margin-bottom:7px;font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;font-weight:600"><span>Description</span><span>Qty</span><span>Unit Price</span><span></span></div>`+
  igItems.map((it,i)=>`<div style="display:grid;grid-template-columns:1fr 80px 110px 30px;gap:7px;margin-bottom:6px;align-items:center">
    <input type="text" value="${it.desc}" placeholder="Item description" oninput="igItems[${i}].desc=this.value;updatePreview()" style="font-size:13px">
    <input type="number" value="${it.qty}" min="0" step="0.1" oninput="igItems[${i}].qty=parseFloat(this.value)||0;updatePreview()" style="font-size:13px">
    <input type="number" value="${it.price}" min="0" step="0.01" oninput="igItems[${i}].price=parseFloat(this.value)||0;updatePreview()" style="font-size:13px">
    <button onclick="removeIgItem(${i})" style="color:var(--err);font-size:16px;background:none;border:none;cursor:pointer;width:30px;height:30px">✕</button>
  </div>`).join('');
  updatePreview();
}
function updatePreview(){
  const b=document.getElementById('inv-preview'); if(!b) return;
  const curr=document.getElementById('ig-curr')?.value||'INR';
  const tax=parseFloat(document.getElementById('ig-tax')?.value)||0;
  const sub=igItems.reduce((s,i)=>s+(i.qty*i.price),0);
  const taxAmt=sub*tax/100, total=sub+taxAmt;
  const sym=CURRENCIES[curr]?.sym||curr;
  const fmt=v=>`${sym}${parseFloat(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  b.innerHTML=`
    <div style="border-bottom:2px solid var(--acc);padding-bottom:14px;margin-bottom:14px">
      <div class="inv-preview-title">INVOICE</div>
      <div style="font-size:12px;color:var(--txt3);margin-top:3px">${document.getElementById('ig-num')?.value||'INV-001'}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;font-size:13px">
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--txt3);margin-bottom:2px">From</div><div style="font-weight:600">${document.getElementById('ig-from')?.value||'Your Company'}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--txt3);margin-bottom:2px">To</div><div style="font-weight:600">${document.getElementById('ig-to')?.value||'Client'}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--txt3);margin-bottom:2px">Date</div><div>${document.getElementById('ig-date')?.value||'—'}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;color:var(--txt3);margin-bottom:2px">Due</div><div>${document.getElementById('ig-due')?.value||'—'}</div></div>
    </div>
    ${igItems.filter(i=>i.desc).map(i=>`<div class="inv-line"><span>${i.desc} × ${i.qty}</span><span>${fmt(i.qty*i.price)}</span></div>`).join('')}
    <div class="inv-line" style="margin-top:6px"><span>Subtotal</span><span>${fmt(sub)}</span></div>
    <div class="inv-line"><span>Tax (${tax}%)</span><span>${fmt(taxAmt)}</span></div>
    <div class="inv-line inv-total" style="border-top:2px solid var(--acc);margin-top:5px;padding-top:8px"><span>TOTAL DUE</span><span>${fmt(total)}</span></div>`;
}
async function saveInvoiceToDb(){
  const vn=document.getElementById('ig-to')?.value; if(!vn){Toast.warning('Enter a vendor/client name');return;}
  const sub=igItems.reduce((s,i)=>s+(i.qty*i.price),0);
  if(sub<=0){Toast.warning('Add at least one line item with a price');return;}
  const curr=document.getElementById('ig-curr')?.value||'INR';
  const tax=parseFloat(document.getElementById('ig-tax')?.value)||0;
  const due=document.getElementById('ig-due')?.value||null;
  try { await Api.createInvoice({vendor_name:vn,amount:sub,currency:curr,tax_rate:tax,due_date:due,status:'pending'}); Toast.success('Invoice saved to system!'); }
  catch(e) { Toast.error('Failed: '+(e.error||'Server error')); }
}

function printInvoice() {
  const preview = document.getElementById('inv-preview');
  if (!preview || !preview.innerHTML.trim() || preview.innerHTML.includes('Add details')) {
    Toast.warning('Please fill in invoice details first'); return;
  }
  const from   = document.getElementById('ig-from')?.value || 'Your Company';
  const to     = document.getElementById('ig-to')?.value   || 'Client';
  const num    = document.getElementById('ig-num')?.value  || 'INV-001';
  const date   = document.getElementById('ig-date')?.value || '';
  const due    = document.getElementById('ig-due')?.value  || '';
  const curr   = document.getElementById('ig-curr')?.value || 'INR';
  const taxRate= parseFloat(document.getElementById('ig-tax')?.value) || 0;
  const sym    = CURRENCIES[curr]?.sym || curr;
  const fmt    = v => `${sym}${parseFloat(v).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const sub    = igItems.reduce((s,i)=>s+(i.qty*i.price),0);
  const taxAmt = sub * taxRate / 100;
  const total  = sub + taxAmt;

  const rows = igItems.filter(i=>i.desc).map(i=>`
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${i.desc}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${i.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(i.price)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(i.qty*i.price)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Invoice ${num}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#fff;padding:40px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:3px solid #7c3aed;}
  .logo{font-size:28px;font-weight:900;color:#7c3aed;letter-spacing:-1px;}
  .logo span{color:#a855f7;}
  .inv-label{font-size:32px;font-weight:900;color:#7c3aed;text-align:right;}
  .inv-num{font-size:13px;color:#6b7280;margin-top:4px;text-align:right;}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;}
  .party-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#9ca3af;margin-bottom:6px;}
  .party-name{font-size:16px;font-weight:700;color:#1a1a2e;}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;padding:16px;background:#f9fafb;border-radius:8px;}
  .meta-label{font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
  .meta-val{font-size:13px;font-weight:600;color:#1a1a2e;}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;}
  thead th{background:#7c3aed;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;}
  thead th:nth-child(2),thead th:nth-child(3),thead th:nth-child(4){text-align:right;}
  .totals{margin-left:auto;width:280px;}
  .total-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:13px;}
  .total-row:last-child{border-bottom:none;font-size:16px;font-weight:800;color:#7c3aed;margin-top:4px;}
  .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;}
  @media print{body{padding:20px;}@page{margin:15mm;}}
</style>
</head><body>
  <div class="header">
    <div>
      <div class="logo">VCMS<span>Pro</span></div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">Vendor Contract Management</div>
    </div>
    <div>
      <div class="inv-label">INVOICE</div>
      <div class="inv-num">${num}</div>
    </div>
  </div>
  <div class="parties">
    <div><div class="party-label">From</div><div class="party-name">${from}</div></div>
    <div><div class="party-label">Bill To</div><div class="party-name">${to}</div></div>
  </div>
  <div class="meta">
    <div><div class="meta-label">Issue Date</div><div class="meta-val">${date||'—'}</div></div>
    <div><div class="meta-label">Due Date</div><div class="meta-val">${due||'—'}</div></div>
    <div><div class="meta-label">Currency</div><div class="meta-val">${curr}</div></div>
    <div><div class="meta-label">Tax Rate</div><div class="meta-val">${taxRate}%</div></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${fmt(sub)}</span></div>
    <div class="total-row"><span>Tax (${taxRate}%)</span><span>${fmt(taxAmt)}</span></div>
    <div class="total-row"><span>TOTAL DUE</span><span>${fmt(total)}</span></div>
  </div>
  <div class="footer">Generated by VCMS Pro · ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</div>
  <script>
    window.onload = () => {
      // Give the browser a moment to process the styles and layout
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body></html>`;

  const w = window.open('','_blank','width=850,height=900');
  if (!w) { Toast.error('Please allow pop-ups to print invoices'); return; }
  w.document.write(html);
  w.document.close();
}

// ════════════════════════════════════════════════════════════
//  AI ASSISTANT
// ════════════════════════════════════════════════════════════
let chatHistory=[];
function renderAI(el){
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">🤖 AI Assistant</div><div class="page-sub">Powered by Claude — analyse contracts, vendors, compliance and more</div></div></div>
    <div class="grid-3-2">
      <div class="chat-container" style="height:580px">
        <div class="chat-messages" id="chat-msgs">
          <div class="chat-msg ai"><div class="ch-av ai">🤖</div><div class="ch-bubble">Hello! I'm your VCMS Pro AI Assistant powered by Claude. I can help you analyse contracts, assess vendor risks, review compliance gaps, and answer questions about your data. What would you like to explore?</div></div>
        </div>
        <div class="chat-quick-btns">
          ${['Analyse contract risks','Check compliance gaps','Summarise vendor portfolio','Invoice payment trends','Draft contract clauses'].map(q=>`<button class="quick-btn" onclick="sendChat('${q}')">${q}</button>`).join('')}
        </div>
        <div class="chat-input-row">
          <input type="text" id="chat-input" placeholder="Ask about contracts, vendors, compliance…" onkeydown="if(event.key==='Enter')sendChat()">
          <button class="chat-send" onclick="sendChat()">➤</button>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:13px">
          <div class="card-title" style="margin-bottom:12px">⚡ Live Data Context</div>
          ${[
            {icon:'📄',label:'Total Contracts',val:statsCache.contracts||0,color:'var(--acc2)'},
            {icon:'🏢',label:'Active Vendors',val:statsCache.vendors||0,color:'var(--ok)'},
            {icon:'💰',label:'Invoice Volume',val:fmtCurrency(statsCache.totalValue||0,'INR'),color:'var(--info)'},
            {icon:'⚠️',label:'Overdue Amount',val:fmtCurrency(statsCache.overdueVal||0,'INR'),color:'var(--err)'},
          ].map(s=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bdr)"><span style="font-size:18px">${s.icon}</span><div style="flex:1;font-size:13px;color:var(--txt2)">${s.label}</div><div style="font-weight:700;font-size:13px;color:${s.color}">${s.val}</div></div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:10px">🔧 AI Capabilities</div>
          ${['Contract risk scoring & analysis','Vendor performance assessment','Clause detection & red flags','Compliance gap identification','Invoice anomaly detection','Payment trend analysis','Negotiation recommendations','Regulatory risk mapping'].map(f=>`<div style="display:flex;align-items:center;gap:7px;padding:5px 0;font-size:13px"><span style="color:var(--ok)">✓</span><span>${f}</span></div>`).join('')}
          <div style="margin-top:12px;padding:10px;background:rgba(124,58,237,.07);border:1px solid var(--bdr);border-radius:var(--rm);font-size:12px;color:var(--txt3)">⚙️ Add your Anthropic API key in Settings to enable full AI responses.</div>
        </div>
      </div>
    </div>`;
}

async function sendChat(preset){
  const input=document.getElementById('chat-input');
  const msg=preset||(input?.value?.trim()); if(!msg) return;
  if(input) input.value='';
  const msgs=document.getElementById('chat-msgs');
  msgs.innerHTML+=`<div class="chat-msg user"><div class="ch-av user">👤</div><div class="ch-bubble">${msg}</div></div>`;
  msgs.innerHTML+=`<div class="chat-msg ai" id="ai-typing"><div class="ch-av ai">🤖</div><div class="ch-bubble"><span class="spinner"></span> Thinking…</div></div>`;
  msgs.scrollTop=msgs.scrollHeight;
  chatHistory.push({role:'user',content:msg});
  const apiKey=localStorage.getItem('vcms_ai_key');
  if(!apiKey){document.getElementById('ai-typing').innerHTML=`<div class="ch-av ai">🤖</div><div class="ch-bubble">Please add your Anthropic API key in <strong>Settings → AI Configuration</strong> to enable AI responses.</div>`;msgs.scrollTop=msgs.scrollHeight;return;}
  try{
    const sys=`You are VCMS Pro's expert AI assistant for vendor contract management. Workspace data: ${JSON.stringify({vendors:statsCache.vendors,contracts:statsCache.contracts,active:statsCache.active,invoiceVolume:statsCache.totalValue,overdue:statsCache.overdueVal})}. Be concise, professional and actionable. Use bullet points for lists.`;
    const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:700,system:sys,messages:chatHistory})});
    const data=await res.json();
    const reply=data.content?.[0]?.text||'Unable to process.';
    chatHistory.push({role:'assistant',content:reply});
    document.getElementById('ai-typing').innerHTML=`<div class="ch-av ai">🤖</div><div class="ch-bubble">${reply.replace(/\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}</div>`;
  }catch(e){document.getElementById('ai-typing').innerHTML=`<div class="ch-av ai">🤖</div><div class="ch-bubble">Error: ${e.message}. Check your API key in Settings.</div>`;}
  msgs.scrollTop=msgs.scrollHeight;
}

// ════════════════════════════════════════════════════════════
//  ANALYTICS
// ════════════════════════════════════════════════════════════
async function renderAnalytics(el){
  const role = currentUser?.role || 'viewer';
  let vendors=[],contracts=[],invoices=[],auditRows=[];
  try{[vendors,contracts,invoices,auditRows]=await Promise.all([Api.vendors(),Api.contracts(),Api.invoices(),Api.audit()]);}catch(e){}

  const totalInv = invoices.reduce((s,i)=>s+parseFloat(i.total_amount||0),0);
  const paidInv  = invoices.filter(i=>i.status==='paid').length;

  // Build role-specific chart grid HTML
  const showFinance  = ['admin','manager','finance'].includes(role);
  const showRisk     = ['admin','auditor','legal'].includes(role);
  const showAudit    = ['admin','auditor'].includes(role);
  const showLegalType= role==='legal';

  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">📊 Analytics</div><div class="page-sub">Role-filtered data insights for your work — ${capitalise(role)} view</div></div>
    </div>
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-icon">🏢</div><div class="stat-value">${vendors.length}</div><div class="stat-label">Total Vendors</div><div class="stat-delta up">Registered</div></div>
      <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-value">${contracts.length}</div><div class="stat-label">Total Contracts</div><div class="stat-delta up">${contracts.filter(c=>c.status==='active').length} active</div></div>
      <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-value">${fmtCurrency(totalInv,'INR')}</div><div class="stat-label">Invoice Value</div><div class="stat-delta up">All time</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${paidInv}</div><div class="stat-label">Paid Invoices</div><div class="stat-delta up">Settled</div></div>
    </div>

    <!-- ROW 1: Contract Status + Vendor Categories (all roles) -->
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-hdr"><div class="card-title">📄 Contract Status Breakdown</div></div>
        <div style="position:relative;height:240px"><canvas id="ac-contract-status"></canvas></div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">🏢 Vendors by Category</div></div>
        <div style="position:relative;height:240px"><canvas id="ac-vendor-cats"></canvas></div>
      </div>
    </div>

    <!-- ROW 2: Finance charts (admin/manager/finance) -->
    ${showFinance ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-hdr"><div class="card-title">📈 Invoice Trend — Total Invoiced vs Collected (Last 6 Months)</div></div>
      <div style="position:relative;height:240px"><canvas id="ac-invoice-trend"></canvas></div>
    </div>
    <div class="grid-2" style="margin-bottom:16px">
      <div class="card">
        <div class="card-hdr"><div class="card-title">💰 Payment Status Distribution</div></div>
        <div style="position:relative;height:220px"><canvas id="ac-payment-status"></canvas></div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">📊 Contract Value by Risk Level</div></div>
        <div style="position:relative;height:220px"><canvas id="ac-risk-value"></canvas></div>
      </div>
    </div>` : ''}

    <!-- ROW 3: Risk distribution (admin/auditor/legal) -->
    ${showRisk ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-hdr"><div class="card-title">⚠️ Contract Risk Distribution</div></div>
      <div style="position:relative;height:200px"><canvas id="ac-risk-dist"></canvas></div>
    </div>` : ''}

    <!-- ROW 4: Legal contract types donut -->
    ${showLegalType ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-hdr"><div class="card-title">📋 Contracts by Type</div></div>
      <div style="position:relative;height:220px"><canvas id="ac-contract-types"></canvas></div>
    </div>` : ''}

    <!-- ROW 5: Audit trend (admin/auditor) -->
    ${showAudit ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-hdr"><div class="card-title">📋 System Audit Activity (Last 6 Months)</div></div>
      <div style="position:relative;height:200px"><canvas id="ac-audit-trend"></canvas></div>
    </div>` : ''}

    <!-- Always: Vendor risk summary bar -->
    <div class="grid-2">
      <div class="card">
        <div class="card-hdr"><div class="card-title">🔴 Vendor Risk Summary</div></div>
        <div style="position:relative;height:200px"><canvas id="ac-vendor-risk-bar"></canvas></div>
      </div>
      <div class="card">
        <div class="card-hdr"><div class="card-title">📅 Contracts Created Per Month (6M)</div></div>
        <div style="position:relative;height:200px"><canvas id="ac-contracts-monthly"></canvas></div>
      </div>
    </div>`;

  // Draw all charts after DOM is ready
  setTimeout(()=>{
    drawAnalyticsCharts(vendors, contracts, invoices, auditRows, role);
    // Extra charts always visible
    const risk={Low:0,Medium:0,High:0};
    vendors.forEach(v=>{const l=v.risk_level||2;if(l<=2)risk.Low++;else if(l<=4)risk.Medium++;else risk.High++;});
    barChart('ac-vendor-risk-bar',Object.keys(risk),[{label:'Vendors',data:Object.values(risk),color:['rgba(34,197,94,.8)','rgba(245,158,11,.8)','rgba(239,68,68,.8)']}]);
    const months=lastNMonths(6);
    const contractMonthly=countByMonth(contracts,'created_at',6);
    lineChart('ac-contracts-monthly',months,[{label:'Contracts Created',data:contractMonthly,color:'rgba(124,58,237,.85)'}]);
    // Risk value bar (finance row)
    if(showFinance){
      const rv={Low:0,Medium:0,High:0,Critical:0};
      contracts.forEach(c=>{const k=c.risk?c.risk.charAt(0).toUpperCase()+c.risk.slice(1):'Medium';rv[k]=(rv[k]||0)+parseFloat(c.value||0);});
      barChart('ac-risk-value',Object.keys(rv),[{label:'Contract Value (₹)',data:Object.values(rv),color:['rgba(34,197,94,.8)','rgba(245,158,11,.8)','rgba(239,68,68,.8)','rgba(168,85,247,.8)']}]);
    }
  }, 80);
}

// ════════════════════════════════════════════════════════════
//  COMPLIANCE
// ════════════════════════════════════════════════════════════
function renderCompliance(el){
  const fw=[{name:'GDPR',score:88,color:'#22c55e',issues:2},{name:'ISO 27001',score:76,color:'#f59e0b',issues:4},{name:'SOC 2',score:91,color:'#22c55e',issues:1},{name:'PCI DSS',score:62,color:'#ef4444',issues:7},{name:'HIPAA',score:84,color:'#38bdf8',issues:3}];
  function ring(score,color){const r=32,circ=2*Math.PI*r,dash=(score/100)*circ;return `<svg width="80" height="80"><circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--surf2)" stroke-width="7"/><circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 40 40)"/></svg><div class="ring-text" style="color:${color}">${score}%</div>`;}
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">🛡️ Compliance</div><div class="page-sub">Regulatory framework monitoring and issue tracking</div></div></div>
    <div class="compliance-grid">
      ${fw.map(f=>`<div class="comp-card"><div class="ring-wrap">${ring(f.score,f.color)}</div><div style="font-weight:700;font-size:15px;margin-bottom:4px">${f.name}</div><div style="font-size:12px;color:${f.issues>5?'var(--err)':f.issues>2?'var(--warn)':'var(--ok)'}">${f.issues} open issue${f.issues!==1?'s':''}</div><div class="progress" style="margin-top:8px"><div class="progress-bar" style="width:${f.score}%;background:${f.color}"></div></div></div>`).join('')}
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-hdr"><div class="card-title">⚠️ Open Compliance Issues</div><span class="badge badge-warning">${fw.reduce((s,f)=>s+f.issues,0)} total</span></div>
      <table><thead><tr><th>Issue</th><th>Framework</th><th>Severity</th><th>Action</th></tr></thead><tbody>
        ${[['Vendor DPA agreements missing for 3 vendors','GDPR','high','Review'],['ISO encryption policy not documented','ISO 27001','medium','Update'],['SOC 2 access logs need quarterly review','SOC 2','low','Schedule'],['PCI DSS cardholder data mapping incomplete','PCI DSS','high','Audit'],['HIPAA BAA agreements pending for 2 vendors','HIPAA','medium','Send']].map(([issue,fw,sev,act])=>`<tr><td style="font-size:13px">${issue}</td><td>${badge(fw,'badge-info')}</td><td>${badge(sev,'badge-'+sev)}</td><td><button class="btn btn-primary btn-sm">${act}</button></td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

// ════════════════════════════════════════════════════════════
//  AUDIT LOG
// ════════════════════════════════════════════════════════════
async function renderAudit(el){
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">📋 Audit Log</div><div class="page-sub">Immutable trail of all system activity</div></div></div>
    <div class="filter-bar">
      <select id="audit-action-filter" onchange="loadAuditList()">
        <option value="all">All Actions</option><option value="LOGIN">Login</option><option value="CREATE">Create</option>
        <option value="UPDATE">Update</option><option value="DELETE">Delete</option><option value="UPLOAD">Upload</option>
      </select>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>Description</th></tr></thead>
      <tbody id="audit-tbody"><tr><td colspan="5" style="text-align:center;padding:24px"><span class="spinner"></span></td></tr></tbody>
    </table></div></div>`;
  await loadAuditList();
}

async function loadAuditList(){
  const action=document.getElementById('audit-action-filter')?.value||'all';
  try{
    const data=await Api.audit(action!=='all'?`?action=${action}`:'');
    const tb=document.getElementById('audit-tbody'); if(!tb) return;
    if(!data.length){tb.innerHTML=`<tr><td colspan="5"><div class="empty-state"><div class="ei">📋</div><p>No audit entries yet</p></div></td></tr>`;return;}
    tb.innerHTML=data.map(r=>`<tr>
      <td style="font-size:12px;white-space:nowrap;color:var(--txt3)">${fmtDateTime(r.created_at)}</td>
      <td style="font-size:13px;font-weight:500">${r.user_name||'System'}</td>
      <td><span class="badge ${r.action==='DELETE'?'badge-danger':r.action==='CREATE'?'badge-success':'badge-info'}">${r.action}</span></td>
      <td style="font-size:12px;color:var(--txt3)">${r.entity_type||'—'}</td>
      <td style="font-size:13px">${r.description||'—'}</td>
    </tr>`).join('');
  }catch(e){}
}

// ════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════
async function renderNotifications(el){
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">🔔 Notifications</div><div class="page-sub">Your alerts and system messages</div></div><button class="btn btn-secondary" onclick="markAllRead()">✓ Mark All Read</button></div>
    <div id="notifs-list"><div class="empty-state"><span class="spinner"></span></div></div>`;
  await loadNotifications();
}

async function loadNotifications(){
  try{
    const data=await Api.notifs();
    const list=document.getElementById('notifs-list'); if(!list) return;
    updateNotifBadge(data.filter(n=>!n.is_read).length);
    if(!data.length){list.innerHTML=`<div class="empty-state"><div class="ei">🔔</div><h3>No notifications</h3><p>You're all caught up!</p></div>`;return;}
    list.innerHTML=data.map(n=>`<div class="notif-item ${n.is_read?'':'unread'}"><div class="notif-icon">${n.icon||'🔔'}</div><div style="flex:1"><div class="notif-title">${n.title}</div>${n.description?`<div class="notif-desc">${n.description}</div>`:''}<div class="notif-time">${timeAgo(n.created_at)}</div></div>${!n.is_read?'<div style="width:8px;height:8px;border-radius:50%;background:var(--acc);flex-shrink:0;margin-top:6px"></div>':''}</div>`).join('');
  }catch(e){}
}

async function markAllRead(){
  try{await Api.readAllNotifs();Toast.info('All marked as read');await loadNotifications();}catch(e){Toast.error('Failed');}
}

// ════════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════════
function renderSettings(el){
  const u=currentUser||{};
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">⚙️ Settings</div><div class="page-sub">Manage your profile, preferences and integrations</div></div></div>
    <div class="grid-2">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:14px">👤 Profile Information</div>
          <form id="profile-form" onsubmit="saveProfile(event)" novalidate>
            <div id="profile-errs"></div>
            <div class="form-row">
              <div class="form-group"><label>First Name <span class="req">*</span></label><input type="text" name="first_name" value="${u.first_name||''}" oninput="this.value=this.value.replace(/[^a-zA-Z\\s\\-\\']/g,'')"><div class="input-hint" style="font-size:11px;color:var(--txt3)">Letters only</div></div>
              <div class="form-group"><label>Last Name <span class="req">*</span></label><input type="text" name="last_name" value="${u.last_name||''}" oninput="this.value=this.value.replace(/[^a-zA-Z\\s\\-\\']/g,'')"><div class="input-hint" style="font-size:11px;color:var(--txt3)">Letters only</div></div>
            </div>
            <div class="form-group"><label>Email</label><input type="email" value="${u.email||''}" disabled style="opacity:.6"></div>
            <div class="form-group"><label>Department</label><input type="text" name="department" value="${u.department||''}" placeholder="e.g. Legal, Finance, Operations"></div>
            <div class="form-group"><label>Role</label><input type="text" value="${capitalise(u.role||'viewer')}" disabled style="opacity:.6"></div>
            <button type="submit" class="btn btn-primary">💾 Save Profile</button>
          </form>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:14px">🤖 AI Configuration</div>
          <div class="form-group"><label>Anthropic API Key</label><input type="password" id="ai-key-input" placeholder="sk-ant-…" value="${localStorage.getItem('vcms_ai_key')||''}"></div>
          <div style="font-size:12px;color:var(--txt3);margin-bottom:12px">Stored locally in your browser only. Get a key at console.anthropic.com</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" onclick="saveAiKey()">🔑 Save Key</button>
            <button class="btn btn-danger btn-sm" onclick="localStorage.removeItem('vcms_ai_key');document.getElementById('ai-key-input').value='';Toast.info('Key removed')">🗑️ Remove</button>
          </div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:14px">🎨 Appearance</div>
          <div class="toggle-row">
            <div><div class="toggle-label">Dark Mode</div><div class="toggle-sub">Toggle between dark and light theme</div></div>
            <label class="toggle"><input type="checkbox" id="theme-chk" ${document.documentElement.getAttribute('data-theme')==='dark'?'checked':''} onchange="Theme.apply(this.checked?'dark':'light')"><span class="toggle-slider"></span></label>
          </div>
        </div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-title" style="margin-bottom:14px">🔔 Notification Preferences</div>
          ${['Contract expiry alerts','New vendor onboarding','Invoice due date reminders','Compliance issue alerts','Approval workflow updates'].map(p=>`<div class="toggle-row"><div><div class="toggle-label">${p}</div></div><label class="toggle"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">ℹ️ About VCMS Pro</div>
          <div style="font-size:13px;color:var(--txt2);line-height:2">
            <div><strong>Version</strong> 4.0.0</div>
            <div><strong>Your Role</strong> ${capitalise(u.role||'viewer')}</div>
            <div><strong>Database</strong> PostgreSQL</div>
            <div><strong>AI Engine</strong> Claude (Anthropic)</div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="doLogout()" style="margin-top:14px">🚪 Sign Out</button>
        </div>
      </div>
    </div>`;
}

async function saveProfile(e){
  e.preventDefault();
  const form=document.getElementById('profile-form');
  const data=Object.fromEntries(new FormData(form));
  clearAllErrors(form);
  const errors=[];
  const fn=Validate.name(data.first_name,'First name'); if(fn) errors.push(fn);
  const ln=Validate.name(data.last_name,'Last name');   if(ln) errors.push(ln);
  if(errors.length){showFormErrors(form,errors);return;}
  try{
    const updated=await Api.updateProfile(data);
    currentUser=updated; localStorage.setItem('vcms_user',JSON.stringify(updated));
    applyUserUI(updated); Toast.success('Profile saved!');
  }catch(e){showFormErrors(form,e.errors||[e.error||'Failed to save']);}
}

function saveAiKey(){
  const k=document.getElementById('ai-key-input')?.value?.trim();
  if(!k||!k.startsWith('sk-ant')){Toast.error('Enter a valid Anthropic API key (starts with sk-ant-)');return;}
  localStorage.setItem('vcms_ai_key',k); Toast.success('API key saved!');
}

async function saveLangPref(lang){
  setLanguage(lang);
  const ls=document.getElementById('lang-selector'); if(ls) ls.value=lang;
  try{await Api.updateProfile({language:lang,first_name:currentUser.first_name,last_name:currentUser.last_name});}catch(e){}
  Toast.info(`Language: ${TRANSLATIONS[lang]?.name}`);
}

function doLogout(){localStorage.removeItem('vcms_token');localStorage.removeItem('vcms_user');window.location.href='login.html';}

// ── Global Search ───────────────────────────────────────────
const globalSearch=debounce((q)=>{
  if(!q||q.length<2) return;
  const s=q.toLowerCase();
  const matches=vendorCache.filter(v=>v.name.toLowerCase().includes(s)||(v.category||'').toLowerCase().includes(s));
  if(matches.length){Toast.info(`Found ${matches.length} vendor(s)`);navigateTo('vendors');setTimeout(()=>{const si=document.getElementById('vendor-search');if(si){si.value=q;filterVendors(q);}},400);}
},400);
