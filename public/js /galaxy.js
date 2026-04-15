/**
 * VCMS Pro v4 — Background Engine
 * Dark: Vivid galaxy with bright stars, shooting stars, auroras
 * Light: Animated floating orbs with soft sparkles and mesh
 */
(function () {
  const canvas = document.getElementById('galaxy-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const stars = [], nebulas = [], shooters = [], ripples = [], auroras = [], orbs = [];
  let mx = 0, my = 0, frame = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildScene();
  }

  const rnd = (a, b) => a + Math.random() * (b - a);

  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function buildScene() {
    const dark = isDark();
    stars.length = nebulas.length = auroras.length = orbs.length = 0;
    shooters.length = ripples.length = 0;

    if (dark) {
      // ── DARK MODE: vivid space ──────────────────────────────

      // Stars — 3 depth layers, much brighter
      [320, 160, 80].forEach((n, layer) => {
        for (let i = 0; i < n; i++) {
          stars.push({
            x: rnd(0, W), y: rnd(0, H),
            r: rnd(.3, layer === 2 ? 2.2 : layer === 1 ? 1.4 : .8),
            a: rnd(.5, 1.0),
            tw: rnd(0, Math.PI * 2),
            tws: rnd(.006, .022),
            sp: rnd(.01, .06) * (layer + 1),
            layer
          });
        }
      });

      // Nebula blobs — brighter and more vivid
      const nc = [
        'rgba(124,58,237,', 'rgba(139,92,246,', 'rgba(168,85,247,',
        'rgba(88,28,135,',  'rgba(196,132,252,','rgba(67,20,160,'
      ];
      for (let i = 0; i < 8; i++) {
        nebulas.push({
          x: rnd(0, W), y: rnd(0, H),
          rx: rnd(W * .16, W * .40), ry: rnd(H * .13, H * .35),
          rot: rnd(0, Math.PI), color: nc[i % nc.length],
          alpha: rnd(.08, .28),   // much brighter than before
          drift: rnd(-.0003, .0003),
          pulse: rnd(0, Math.PI * 2), ps: rnd(.002, .007)
        });
      }

      // Aurora bands — more vivid
      for (let i = 0; i < 4; i++) {
        auroras.push({
          y: rnd(H * .02, H * .45), w: rnd(W * .45, W * .95),
          h: rnd(65, 140), x: rnd(0, W),
          hue: rnd(250, 300), alpha: rnd(.07, .16),  // brighter
          speed: rnd(-.3, .3), wo: rnd(0, Math.PI * 2), ws: rnd(.003, .009)
        });
      }

    } else {
      // ── LIGHT MODE: animated soft orbs ─────────────────────

      const orbColors = [
        'rgba(167,139,250,', 'rgba(196,181,253,', 'rgba(124,58,237,',
        'rgba(139,92,246,',  'rgba(221,214,254,', 'rgba(147,51,234,',
        'rgba(216,180,254,', 'rgba(192,132,252,'
      ];

      // Large soft background orbs
      for (let i = 0; i < 6; i++) {
        orbs.push({
          x: rnd(0, W), y: rnd(0, H),
          r: rnd(W * .12, W * .30),
          color: orbColors[i % orbColors.length],
          alpha: rnd(.10, .22),
          vx: rnd(-.18, .18), vy: rnd(-.12, .12),
          pulse: rnd(0, Math.PI * 2), ps: rnd(.003, .008),
          type: 'large'
        });
      }

      // Medium orbs
      for (let i = 0; i < 8; i++) {
        orbs.push({
          x: rnd(0, W), y: rnd(0, H),
          r: rnd(W * .04, W * .10),
          color: orbColors[i % orbColors.length],
          alpha: rnd(.12, .26),
          vx: rnd(-.25, .25), vy: rnd(-.2, .2),
          pulse: rnd(0, Math.PI * 2), ps: rnd(.005, .012),
          type: 'medium'
        });
      }

      // Small sparkle particles for light mode
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: rnd(0, W), y: rnd(0, H),
          r: rnd(.3, 1.4),
          a: rnd(.2, .6),
          tw: rnd(0, Math.PI * 2),
          tws: rnd(.01, .03),
          sp: rnd(.005, .025),
          layer: Math.floor(rnd(0, 3))
        });
      }
    }
  }

  // Shooting stars (dark only)
  let shooterTimer = 0;
  function spawnShooter() {
    const fromLeft = Math.random() > .5;
    shooters.push({
      x: fromLeft ? rnd(-80, 0) : rnd(W, W + 80),
      y: rnd(0, H * .55),
      vx: fromLeft ? rnd(8, 18) : rnd(-18, -8),
      vy: rnd(1.5, 5.5),
      len: rnd(120, 260),
      r: rnd(.6, 1.3),
      life: 1
    });
  }

  window.addEventListener('click', e => {
    ripples.push({ x: e.clientX, y: e.clientY, r: 0, alpha: .6, life: 1 });
  });
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const dark = isDark();
    frame++;

    if (dark) {
      // ── DARK: deep space background ─────────────────────────
      const bg = ctx.createRadialGradient(W * .5, H * .35, 0, W * .5, H * .5, Math.hypot(W, H) * .7);
      bg.addColorStop(0,   '#120830');
      bg.addColorStop(.3,  '#0a041e');
      bg.addColorStop(.65, '#060215');
      bg.addColorStop(1,   '#03010a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Extra center glow
      const cg = ctx.createRadialGradient(W * .5, H * .3, 0, W * .5, H * .3, W * .5);
      cg.addColorStop(0,   'rgba(124,58,237,.12)');
      cg.addColorStop(.5,  'rgba(88,28,135,.06)');
      cg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

      // Nebulas
      nebulas.forEach(n => {
        n.pulse += n.ps; n.rot += n.drift;
        const a = n.alpha * (1 + Math.sin(n.pulse) * .08);
        ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.rot);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, n.rx);
        g.addColorStop(0,   n.color + a + ')');
        g.addColorStop(.40, n.color + (a * .55) + ')');
        g.addColorStop(1,   n.color + '0)');
        ctx.scale(1, n.ry / n.rx);
        ctx.beginPath(); ctx.arc(0, 0, n.rx, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill(); ctx.restore();
      });

      // Auroras
      auroras.forEach(a => {
        a.x += a.speed; a.wo += a.ws;
        if (a.x > W + a.w / 2) a.x = -a.w / 2;
        if (a.x < -a.w / 2) a.x = W + a.w / 2;
        ctx.save(); ctx.translate(a.x, a.y);
        for (let i = 0; i < 12; i++) {
          const t = i / 12;
          const wave = Math.sin(a.wo + t * Math.PI * 3) * 25;
          const x = (t - .5) * a.w;
          const sg = ctx.createLinearGradient(0, wave - a.h / 2, 0, wave + a.h / 2);
          const c = `hsla(${a.hue + t * 22},85%,72%,`;
          sg.addColorStop(0,   c + '0)');
          sg.addColorStop(.30, c + (a.alpha * 1.2) + ')');
          sg.addColorStop(.65, c + a.alpha + ')');
          sg.addColorStop(1,   c + '0)');
          ctx.fillStyle = sg;
          ctx.fillRect(x, wave - a.h / 2, a.w / 12 + 2, a.h);
        }
        ctx.restore();
      });

      // Stars with parallax — brighter
      const px = (mx / W - .5) * 2, py = (my / H - .5) * 2;
      stars.forEach(s => {
        s.tw += s.tws; s.y -= s.sp;
        if (s.y < -2) { s.y = H + 2; s.x = rnd(0, W); }
        const ox = px * (s.layer + 1) * .7;
        const oy = py * (s.layer + 1) * .7;
        const tx = s.x + ox, ty = s.y + oy;
        const flicker = .55 + .45 * Math.sin(s.tw);
        // Much brighter stars
        const alpha = (.65 + s.layer * .22) * flicker;
        const r = s.r * (.8 + .4 * Math.sin(s.tw * .7));

        // Glow for brighter stars
        if (s.layer >= 1 && s.r > .6) {
          const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 6);
          glow.addColorStop(0, `hsla(270,80%,90%,${alpha * .50})`);
          glow.addColorStop(.5, `hsla(280,70%,80%,${alpha * .18})`);
          glow.addColorStop(1, 'hsla(270,70%,80%,0)');
          ctx.beginPath(); ctx.arc(tx, ty, r * 6, 0, Math.PI * 2);
          ctx.fillStyle = glow; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235,220,255,${alpha})`;
        ctx.fill();
      });

      // Shooting stars
      shooterTimer++;
      if (shooterTimer > 180) { spawnShooter(); shooterTimer = 0; }
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.x += s.vx; s.y += s.vy; s.life -= .016;
        if (s.life <= 0 || s.x < -200 || s.x > W + 200) { shooters.splice(i, 1); continue; }
        const ang = Math.atan2(s.vy, s.vx);
        const tx = s.x - Math.cos(ang) * s.len, ty = s.y - Math.sin(ang) * s.len;
        const sg = ctx.createLinearGradient(tx, ty, s.x, s.y);
        sg.addColorStop(0, 'rgba(196,132,252,0)');
        sg.addColorStop(.55, `rgba(216,180,254,${s.life * .5})`);
        sg.addColorStop(1, `rgba(255,255,255,${s.life})`);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = sg; ctx.lineWidth = s.r * 1.5; ctx.lineCap = 'round'; ctx.stroke();
        const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 7);
        hg.addColorStop(0, `rgba(255,255,255,${s.life * .9})`);
        hg.addColorStop(.4, `rgba(216,180,254,${s.life * .5})`);
        hg.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 7, 0, Math.PI * 2);
        ctx.fillStyle = hg; ctx.fill();
      }

    } else {
      // ── LIGHT MODE: animated orb mesh ──────────────────────

      // White/lavender base
      ctx.fillStyle = '#f8f5ff';
      ctx.fillRect(0, 0, W, H);

      // Animated orbs
      orbs.forEach(o => {
        o.pulse += o.ps;
        o.x += o.vx; o.y += o.vy;
        // Bounce off edges
        if (o.x < -o.r * .5) o.x = W + o.r * .5;
        if (o.x > W + o.r * .5) o.x = -o.r * .5;
        if (o.y < -o.r * .5) o.y = H + o.r * .5;
        if (o.y > H + o.r * .5) o.y = -o.r * .5;
        const a = o.alpha * (1 + Math.sin(o.pulse) * .15);
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0,   o.color + a + ')');
        g.addColorStop(.45, o.color + (a * .5) + ')');
        g.addColorStop(1,   o.color + '0)');
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });

      // Soft sparkles in light mode
      const px = (mx / W - .5) * 2, py = (my / H - .5) * 2;
      stars.forEach(s => {
        s.tw += s.tws; s.y -= s.sp;
        if (s.y < -2) { s.y = H + 2; s.x = rnd(0, W); }
        const ox = px * (s.layer + 1) * .4;
        const oy = py * (s.layer + 1) * .4;
        const tx = s.x + ox, ty = s.y + oy;
        const flicker = .4 + .6 * Math.abs(Math.sin(s.tw));
        const alpha = (.25 + s.layer * .12) * flicker;
        const r = s.r * (.8 + .3 * Math.sin(s.tw * .7));
        if (s.r > .7) {
          const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, r * 5);
          glow.addColorStop(0, `rgba(124,58,237,${alpha * .40})`);
          glow.addColorStop(1, 'rgba(124,58,237,0)');
          ctx.beginPath(); ctx.arc(tx, ty, r * 5, 0, Math.PI * 2);
          ctx.fillStyle = glow; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(tx, ty, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(109,40,217,${alpha})`;
        ctx.fill();
      });

      // Grid mesh lines (very subtle) for light mode depth
      if (frame % 2 === 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(167,139,250,.04)';
        ctx.lineWidth = 1;
        const spacing = 60;
        const offsetX = (frame * .08) % spacing;
        const offsetY = (frame * .05) % spacing;
        for (let x = -spacing + offsetX; x < W + spacing; x += spacing) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H * .3, H);
          ctx.stroke();
        }
        for (let y = -spacing + offsetY; y < H + spacing; y += spacing) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + W * .05);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Click ripples (both modes)
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 4; rp.alpha -= .018; rp.life -= .018;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = dark
        ? `rgba(168,85,247,${rp.alpha})`
        : `rgba(124,58,237,${rp.alpha * .7})`;
      ctx.lineWidth = 1.5; ctx.stroke();
      if (rp.r > 20) {
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r * .55, 0, Math.PI * 2);
        ctx.strokeStyle = dark
          ? `rgba(196,132,252,${rp.alpha * .5})`
          : `rgba(167,139,250,${rp.alpha * .4})`;
        ctx.lineWidth = 1; ctx.stroke();
      }
    }

    requestAnimationFrame(draw);
  }

  // Rebuild on theme change
  const mo = new MutationObserver(() => { buildScene(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
