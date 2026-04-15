/**
 * VCMS Pro v4 — Charts Engine
 * Uses Chart.js (loaded from CDN in dashboard.html)
 * All charts are role-aware and use the app's design system colors.
 */

// ── Active chart instances (destroy before recreating) ──────
const ChartRegistry = {};

function destroyChart(id) {
  if (ChartRegistry[id]) {
    ChartRegistry[id].destroy();
    delete ChartRegistry[id];
  }
}

// ── Shared theme colors (reads CSS variables) ───────────────
function cv(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartColors() {
  return {
    purple:  ['rgba(124,58,237,.85)',  'rgba(124,58,237,.15)'],
    violet:  ['rgba(168,85,247,.85)',  'rgba(168,85,247,.15)'],
    blue:    ['rgba(56,189,248,.85)',   'rgba(56,189,248,.15)'],
    green:   ['rgba(34,197,94,.85)',    'rgba(34,197,94,.15)'],
    yellow:  ['rgba(245,158,11,.85)',   'rgba(245,158,11,.15)'],
    red:     ['rgba(239,68,68,.85)',    'rgba(239,68,68,.15)'],
    indigo:  ['rgba(99,102,241,.85)',   'rgba(99,102,241,.15)'],
    pink:    ['rgba(236,72,153,.85)',   'rgba(236,72,153,.15)'],
    multi:   [
      'rgba(124,58,237,.85)', 'rgba(168,85,247,.85)', 'rgba(56,189,248,.85)',
      'rgba(34,197,94,.85)',  'rgba(245,158,11,.85)',  'rgba(239,68,68,.85)',
      'rgba(99,102,241,.85)', 'rgba(236,72,153,.85)',  'rgba(20,184,166,.85)',
    ],
    multiBg: [
      'rgba(124,58,237,.18)', 'rgba(168,85,247,.18)', 'rgba(56,189,248,.18)',
      'rgba(34,197,94,.18)',  'rgba(245,158,11,.18)',  'rgba(239,68,68,.18)',
      'rgba(99,102,241,.18)', 'rgba(236,72,153,.18)',  'rgba(20,184,166,.18)',
    ],
  };
}

// ── Default chart options (grid, font, tooltips) ────────────
function defaultOpts(dark=true) {
  const textColor = dark ? 'rgba(192,184,232,.75)' : 'rgba(60,30,100,.7)';
  const gridColor = dark ? 'rgba(168,85,247,.08)'  : 'rgba(109,40,217,.08)';
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        labels: {
          color: textColor,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          boxWidth: 12, padding: 16,
        }
      },
      tooltip: {
        backgroundColor: dark ? 'rgba(13,8,32,.92)' : 'rgba(255,255,255,.96)',
        titleColor:  dark ? '#f0ebff' : '#1e0a3c',
        bodyColor:   dark ? '#c4b8e8' : '#3b1d7a',
        borderColor: 'rgba(168,85,247,.3)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 10,
        titleFont: { family: "'Syne', sans-serif", size: 13, weight: '700' },
        bodyFont:  { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
      }
    },
    scales: {
      x: {
        ticks:  { color: textColor, font: { size: 11 } },
        grid:   { color: gridColor, drawBorder: false },
        border: { display: false },
      },
      y: {
        ticks:  { color: textColor, font: { size: 11 } },
        grid:   { color: gridColor, drawBorder: false },
        border: { display: false },
        beginAtZero: true,
      }
    }
  };
}

function isDark() {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}

// ════════════════════════════════════════════════════════════
//  CHART FACTORIES
// ════════════════════════════════════════════════════════════

/**
 * makeChart(canvasId, config)
 * Low-level wrapper — destroys old instance, creates new.
 */
function makeChart(id, config) {
  destroyChart(id);
  const canvas = document.getElementById(id);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, config);
  ChartRegistry[id] = chart;
  return chart;
}

// ── DONUT CHART ─────────────────────────────────────────────
function donutChart(id, labels, data, title='') {
  const c = chartColors();
  const dark = isDark();
  const textColor = dark ? 'rgba(192,184,232,.75)' : 'rgba(60,30,100,.7)';
  return makeChart(id, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: c.multi, borderColor: 'transparent', hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }, boxWidth: 12, padding: 14 }
        },
        tooltip: {
          backgroundColor: dark ? 'rgba(13,8,32,.92)' : 'rgba(255,255,255,.96)',
          titleColor: dark ? '#f0ebff' : '#1e0a3c',
          bodyColor:  dark ? '#c4b8e8' : '#3b1d7a',
          borderColor: 'rgba(168,85,247,.3)', borderWidth: 1,
          padding: 10, cornerRadius: 10,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed/ctx.dataset.data.reduce((a,b)=>a+b,0)*100)}%)` }
        }
      }
    }
  });
}

// ── BAR CHART ───────────────────────────────────────────────
function barChart(id, labels, datasets, opts={}) {
  const c = chartColors();
  const dark = isDark();
  const base = defaultOpts(dark);
  const ds = datasets.map((d,i)=>({
    label: d.label,
    data:  d.data,
    backgroundColor: d.color || c.multi[i % c.multi.length],
    borderRadius: 6,
    borderSkipped: false,
    ...d.extra
  }));
  return makeChart(id, {
    type: opts.horizontal ? 'bar' : 'bar',
    data: { labels, datasets: ds },
    options: {
      ...base,
      indexAxis: opts.horizontal ? 'y' : 'x',
      plugins: { ...base.plugins, legend: { ...base.plugins.legend, display: ds.length > 1 } },
      scales: {
        ...base.scales,
        ...(opts.stacked ? { x: { ...base.scales.x, stacked: true }, y: { ...base.scales.y, stacked: true } } : {}),
      }
    }
  });
}

// ── LINE CHART ──────────────────────────────────────────────
function lineChart(id, labels, datasets, opts={}) {
  const c = chartColors();
  const dark = isDark();
  const base = defaultOpts(dark);
  const ds = datasets.map((d,i)=>{
    const col = d.color || c.multi[i % c.multi.length];
    const bg  = col.replace('.85)','.15)');
    return {
      label: d.label,
      data:  d.data,
      borderColor: col,
      backgroundColor: opts.fill !== false ? bg : 'transparent',
      fill: opts.fill !== false,
      tension: 0.4,
      pointBackgroundColor: col,
      pointBorderColor: dark ? '#06030f' : '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 7,
      ...d.extra
    };
  });
  return makeChart(id, {
    type: 'line',
    data: { labels, datasets: ds },
    options: { ...base, plugins: { ...base.plugins, legend: { ...base.plugins.legend, display: ds.length > 1 } } }
  });
}

// ── PIE CHART ───────────────────────────────────────────────
function pieChart(id, labels, data) {
  const c = chartColors();
  const dark = isDark();
  const textColor = dark ? 'rgba(192,184,232,.75)' : 'rgba(60,30,100,.7)';
  return makeChart(id, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: c.multi, borderColor: 'transparent', hoverOffset: 5 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }, boxWidth: 12, padding: 12 } },
        tooltip: {
          backgroundColor: dark ? 'rgba(13,8,32,.92)' : 'rgba(255,255,255,.96)',
          titleColor: dark ? '#f0ebff' : '#1e0a3c',
          bodyColor:  dark ? '#c4b8e8' : '#3b1d7a',
          borderColor: 'rgba(168,85,247,.3)', borderWidth: 1, padding: 10, cornerRadius: 10,
        }
      }
    }
  });
}

// ── GAUGE (single metric, custom SVG-based) ─────────────────
function svgGauge(pct, color, label) {
  const r=48, cx=60, cy=60;
  const angle = (pct/100)*180;
  const rad = (angle-180)*Math.PI/180;
  const x = cx + r*Math.cos(rad), y = cy + r*Math.sin(rad);
  const circ = Math.PI*r;
  const dash = (pct/100)*circ;
  return `
    <div style="text-align:center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M12,60 A48,48 0 0,1 108,60" fill="none" stroke="var(--surf2)" stroke-width="10" stroke-linecap="round"/>
        <path d="M12,60 A48,48 0 0,1 108,60" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
          stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
          style="transition:stroke-dasharray 1s cubic-bezier(.4,0,.2,1)"/>
        <text x="60" y="56" text-anchor="middle" font-family="Syne,sans-serif" font-size="18" font-weight="800" fill="${color}">${pct}%</text>
      </svg>
      <div style="font-size:12px;color:var(--txt3);margin-top:2px">${label}</div>
    </div>`;
}

// ── CHART CARD WRAPPER ──────────────────────────────────────
function chartCard(id, title, height=220, extraClass='') {
  return `<div class="card ${extraClass}">
    <div class="card-hdr"><div class="card-title">${title}</div></div>
    <div style="position:relative;height:${height}px"><canvas id="${id}"></canvas></div>
  </div>`;
}

// ── LAST N MONTHS LABELS ────────────────────────────────────
function lastNMonths(n=6) {
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labels=[];
  const now=new Date();
  for(let i=n-1;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    labels.push(months[d.getMonth()]+' '+String(d.getFullYear()).slice(2));
  }
  return labels;
}

// ── GROUP ITEMS BY MONTH ────────────────────────────────────
function countByMonth(items, dateField, n=6) {
  const now=new Date();
  return Array.from({length:n},(_,i)=>{
    const target=new Date(now.getFullYear(),now.getMonth()-(n-1-i),1);
    return items.filter(it=>{
      const d=new Date(it[dateField]);
      return d.getFullYear()===target.getFullYear()&&d.getMonth()===target.getMonth();
    }).length;
  });
}

function sumByMonth(items, dateField, valueField, n=6) {
  const now=new Date();
  return Array.from({length:n},(_,i)=>{
    const target=new Date(now.getFullYear(),now.getMonth()-(n-1-i),1);
    return items.filter(it=>{
      const d=new Date(it[dateField]);
      return d.getFullYear()===target.getFullYear()&&d.getMonth()===target.getMonth();
    }).reduce((s,it)=>s+parseFloat(it[valueField]||0),0);
  });
}

// ════════════════════════════════════════════════════════════
//  ROLE-SPECIFIC CHART SECTIONS
//  Called AFTER the HTML is rendered (canvas elements exist)
// ════════════════════════════════════════════════════════════

// ── ADMIN: 3 mini charts on dashboard ──────────────────────
async function drawAdminDashCharts(vendors, contracts, invoices) {
  const months = lastNMonths(6);

  // 1. Contract status donut
  const cStatus = {};
  contracts.forEach(c=>{cStatus[c.status]=(cStatus[c.status]||0)+1;});
  if(Object.keys(cStatus).length){
    donutChart('chart-admin-cstatus', Object.keys(cStatus).map(s=>s.charAt(0).toUpperCase()+s.slice(1)), Object.values(cStatus));
  }

  // 2. Invoice amounts per month (bar)
  const invMonthly = sumByMonth(invoices,'created_at','total_amount',6);
  barChart('chart-admin-inv-monthly', months, [{
    label:'Invoice Total (₹)',
    data: invMonthly,
    color:'rgba(168,85,247,.8)'
  }]);

  // 3. Vendor risk distribution (horizontal bar)
  const risk={Low:0,Medium:0,High:0};
  vendors.forEach(v=>{const l=v.risk_level||2;if(l<=2)risk.Low++;else if(l<=4)risk.Medium++;else risk.High++;});
  barChart('chart-admin-risk', Object.keys(risk), [{
    label:'Vendors',
    data: Object.values(risk),
    color:['rgba(34,197,94,.8)','rgba(245,158,11,.8)','rgba(239,68,68,.8)'],
  }], { horizontal:true });
}

// ── MANAGER: pipeline + vendor category ────────────────────
async function drawManagerDashCharts(vendors, contracts) {
  const months = lastNMonths(6);

  // Contract lifecycle bar
  const statuses=['draft','review','active','expired','terminated'];
  const counts=statuses.map(s=>contracts.filter(c=>c.status===s).length);
  barChart('chart-mgr-pipeline', statuses.map(s=>s.charAt(0).toUpperCase()+s.slice(1)), [{
    label:'Contracts',
    data:counts,
    color:['rgba(99,102,241,.8)','rgba(245,158,11,.8)','rgba(34,197,94,.8)','rgba(239,68,68,.8)','rgba(168,85,247,.8)']
  }]);

  // Vendor categories donut
  const cats={};
  vendors.forEach(v=>{cats[v.category]=(cats[v.category]||0)+1;});
  if(Object.keys(cats).length){
    donutChart('chart-mgr-vendors', Object.keys(cats), Object.values(cats));
  }
}

// ── LEGAL: contract risk + expiry timeline ──────────────────
async function drawLegalDashCharts(contracts) {
  const months = lastNMonths(6);

  // Risk distribution donut
  const riskCount={Low:0,Medium:0,High:0,Critical:0};
  contracts.forEach(c=>{
    const k=c.risk?c.risk.charAt(0).toUpperCase()+c.risk.slice(1):'Medium';
    riskCount[k]=(riskCount[k]||0)+1;
  });
  const riskCols=['rgba(34,197,94,.85)','rgba(245,158,11,.85)','rgba(239,68,68,.85)','rgba(168,85,247,.85)'];
  makeChart('chart-legal-risk',{
    type:'doughnut',
    data:{labels:Object.keys(riskCount),datasets:[{data:Object.values(riskCount),backgroundColor:riskCols,borderColor:'transparent',hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'65%',animation:{duration:700},
      plugins:{legend:{position:'right',labels:{color:isDark()?'rgba(192,184,232,.75)':'rgba(60,30,100,.7)',font:{size:12},boxWidth:12,padding:12}},
      tooltip:{backgroundColor:isDark()?'rgba(13,8,32,.92)':'rgba(255,255,255,.96)',titleColor:isDark()?'#f0ebff':'#1e0a3c',bodyColor:isDark()?'#c4b8e8':'#3b1d7a',borderColor:'rgba(168,85,247,.3)',borderWidth:1,padding:10,cornerRadius:10}}}
  });

  // Contracts created per month (line)
  const contractMonthly = countByMonth(contracts,'created_at',6);
  lineChart('chart-legal-activity', months, [{
    label:'Contracts Created', data:contractMonthly, color:'rgba(52,211,153,.85)'
  }]);
}

// ── FINANCE: invoice trends + payment donut ──────────────────
async function drawFinanceDashCharts(invoices) {
  const months = lastNMonths(6);

  // Monthly invoice amounts (line)
  const allMonthly  = sumByMonth(invoices,'created_at','total_amount',6);
  const paidMonthly = sumByMonth(invoices.filter(i=>i.status==='paid'),'created_at','total_amount',6);
  lineChart('chart-fin-trend', months, [
    { label:'Total Invoiced', data:allMonthly,  color:'rgba(168,85,247,.85)' },
    { label:'Collected',      data:paidMonthly, color:'rgba(34,197,94,.85)'  },
  ]);

  // Payment status donut
  const pst={Paid:0,Pending:0,Overdue:0,Disputed:0};
  invoices.forEach(i=>{
    if(i.status==='paid')      pst.Paid++;
    else if(i.status==='pending') pst.Pending++;
    else if(i.status==='overdue') pst.Overdue++;
    else if(i.status==='disputed') pst.Disputed++;
  });
  makeChart('chart-fin-status',{
    type:'doughnut',
    data:{labels:Object.keys(pst),datasets:[{data:Object.values(pst),backgroundColor:['rgba(34,197,94,.85)','rgba(245,158,11,.85)','rgba(239,68,68,.85)','rgba(99,102,241,.85)'],borderColor:'transparent',hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'65%',animation:{duration:700},
      plugins:{legend:{position:'right',labels:{color:isDark()?'rgba(192,184,232,.75)':'rgba(60,30,100,.7)',font:{size:12},boxWidth:12,padding:12}},
      tooltip:{backgroundColor:isDark()?'rgba(13,8,32,.92)':'rgba(255,255,255,.96)',titleColor:isDark()?'#f0ebff':'#1e0a3c',bodyColor:isDark()?'#c4b8e8':'#3b1d7a',borderColor:'rgba(168,85,247,.3)',borderWidth:1,padding:10,cornerRadius:10}}}
  });

  // Monthly invoice count bar
  const cntMonthly = countByMonth(invoices,'created_at',6);
  barChart('chart-fin-count', months, [{
    label:'Invoices Raised', data:cntMonthly, color:'rgba(56,189,248,.8)'
  }]);
}

// ── AUDITOR: action distribution + daily activity ───────────
async function drawAuditorDashCharts(auditRows) {
  const months = lastNMonths(6);

  // Actions bar
  const actions=['LOGIN','CREATE','UPDATE','DELETE','UPLOAD'];
  const actCounts = actions.map(a=>auditRows.filter(r=>r.action===a).length);
  barChart('chart-aud-actions', actions, [{
    label:'Occurrences', data:actCounts,
    color:['rgba(56,189,248,.8)','rgba(34,197,94,.8)','rgba(245,158,11,.8)','rgba(239,68,68,.8)','rgba(168,85,247,.8)']
  }]);

  // Activity per month (line)
  const monthly = countByMonth(auditRows,'created_at',6);
  lineChart('chart-aud-trend', months, [{
    label:'Audit Events', data:monthly, color:'rgba(99,102,241,.85)'
  }]);
}

// ════════════════════════════════════════════════════════════
//  FULL ANALYTICS PAGE — role-aware
// ════════════════════════════════════════════════════════════
async function drawAnalyticsCharts(vendors, contracts, invoices, auditRows, role) {
  const months = lastNMonths(6);
  const c = chartColors();

  // ── Charts all roles see ──
  // 1. Contract status donut
  const cStatus={};
  contracts.forEach(c2=>{cStatus[c2.status]=(cStatus[c2.status]||0)+1;});
  if(Object.keys(cStatus).length) {
    donutChart('ac-contract-status',
      Object.keys(cStatus).map(s=>s.charAt(0).toUpperCase()+s.slice(1)),
      Object.values(cStatus)
    );
  }

  // 2. Vendor category bar
  const cats={};
  vendors.forEach(v=>{cats[v.category]=(cats[v.category]||0)+1;});
  if(Object.keys(cats).length) {
    barChart('ac-vendor-cats',
      Object.keys(cats),
      [{label:'Vendors',data:Object.values(cats),color:c.multi}]
    );
  }

  // ── Finance / Admin / Manager ──
  if(['admin','manager','finance'].includes(role)){
    // 3. Invoice trend line
    const allM  = sumByMonth(invoices,'created_at','total_amount',6);
    const paidM = sumByMonth(invoices.filter(i=>i.status==='paid'),'created_at','total_amount',6);
    lineChart('ac-invoice-trend', months,[
      {label:'Total Invoiced',data:allM, color:'rgba(168,85,247,.85)'},
      {label:'Collected',     data:paidM,color:'rgba(34,197,94,.85)'},
    ]);

    // 4. Payment breakdown donut
    const pst={Paid:0,Pending:0,Overdue:0};
    invoices.forEach(i=>{
      if(i.status==='paid')pst.Paid++;
      else if(i.status==='pending')pst.Pending++;
      else if(i.status==='overdue')pst.Overdue++;
    });
    makeChart('ac-payment-status',{
      type:'pie',
      data:{labels:Object.keys(pst),datasets:[{data:Object.values(pst),backgroundColor:['rgba(34,197,94,.85)','rgba(245,158,11,.85)','rgba(239,68,68,.85)'],borderColor:'transparent',hoverOffset:5}]},
      options:{responsive:true,maintainAspectRatio:false,animation:{duration:700},
        plugins:{legend:{position:'bottom',labels:{color:isDark()?'rgba(192,184,232,.75)':'rgba(60,30,100,.7)',font:{size:12},boxWidth:12,padding:12}},
        tooltip:{backgroundColor:isDark()?'rgba(13,8,32,.92)':'rgba(255,255,255,.96)',titleColor:isDark()?'#f0ebff':'#1e0a3c',bodyColor:isDark()?'#c4b8e8':'#3b1d7a',borderColor:'rgba(168,85,247,.3)',borderWidth:1,padding:10,cornerRadius:10}}}
    });
  }

  // ── Admin / Auditor / Legal ──
  if(['admin','auditor','legal'].includes(role)){
    // 5. Risk distribution bar
    const risk={Low:0,Medium:0,High:0,Critical:0};
    contracts.forEach(c2=>{const k=c2.risk?c2.risk.charAt(0).toUpperCase()+c2.risk.slice(1):'Medium';risk[k]=(risk[k]||0)+1;});
    barChart('ac-risk-dist', Object.keys(risk),[{
      label:'Contracts',
      data:Object.values(risk),
      color:['rgba(34,197,94,.8)','rgba(245,158,11,.8)','rgba(239,68,68,.8)','rgba(168,85,247,.8)']
    }]);
  }

  // ── Admin / Auditor ──
  if(['admin','auditor'].includes(role)){
    // 6. Audit activity per month
    const audM = countByMonth(auditRows,'created_at',6);
    lineChart('ac-audit-trend', months,[{
      label:'System Events', data:audM, color:'rgba(99,102,241,.85)'
    }]);
  }

  // ── Legal only ──
  if(role==='legal'){
    // Contracts by type
    const types={};
    contracts.forEach(c2=>{types[c2.contract_type||'Other']=(types[c2.contract_type||'Other']||0)+1;});
    if(Object.keys(types).length){
      donutChart('ac-contract-types', Object.keys(types), Object.values(types));
    }
  }
}
