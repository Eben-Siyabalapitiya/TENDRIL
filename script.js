const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── scroll progress bar ──────────────────────────────────────────
if (!reduced) {
  const bar = document.createElement('div');
  bar.className = 'progress';
  document.body.appendChild(bar);
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = `scaleX(${pct})`;
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

// ── nav hairline once you leave the top ──────────────────────────
const nav = document.querySelector('.nav');
if (nav) {
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => {
    nav.classList.toggle('is-stuck', !e.isIntersecting);
  }).observe(sentinel);
}

// ── staggered reveal on scroll ───────────────────────────────────
const revealables = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduced) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // siblings revealed together get a small cascade
      const group = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains('reveal')) : [el];
      const idx = Math.max(0, group.indexOf(el));
      el.style.transitionDelay = `${Math.min(idx, 5) * 90}ms`;
      el.classList.add('in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add('in'));
}

// ── gentle parallax on the hero spiral ───────────────────────────
const spiral = document.querySelector('.hero-bg');
if (spiral && !reduced) {
  let raf = false;
  addEventListener('scroll', () => {
    if (raf) return;
    raf = true;
    requestAnimationFrame(() => {
      const y = Math.min(window.scrollY, 900);
      spiral.style.transform = `translate3d(0, ${y * 0.12}px, 0) rotate(${y * 0.02}deg)`;
      raf = false;
    });
  }, { passive: true });
}

// ── pause a video when it scrolls out of view ────────────────────
const videos = document.querySelectorAll('video');
if ('IntersectionObserver' in window) {
  const vo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting && !entry.target.paused) entry.target.pause();
    });
  }, { threshold: 0.15 });
  videos.forEach((v) => vo.observe(v));
}

// ── placeholders: show the slot until a real file is dropped in ──
document.querySelectorAll('.shot').forEach((figure) => {
  const img = figure.querySelector('img');
  if (!img) return;
  const markEmpty = () => figure.classList.add('is-empty');
  if (img.complete && img.naturalWidth === 0) markEmpty();
  img.addEventListener('error', markEmpty);
  img.addEventListener('load', () => { if (img.naturalWidth === 0) markEmpty(); });
});

document.querySelectorAll('[data-video]').forEach((frame) => {
  const video = frame.querySelector('video');
  if (!video) return;
  const markEmpty = () => frame.classList.add('is-empty');
  video.addEventListener('error', markEmpty, true);
  const source = video.querySelector('source');
  if (source) source.addEventListener('error', markEmpty);
  setTimeout(() => { if (!video.videoWidth) markEmpty(); }, 1500);
});

// ── build log: highlight the step you are reading ────────────────
const logItems = [...document.querySelectorAll('.log li')];
const railSteps = [...document.querySelectorAll('.rail-steps li')];
if (logItems.length && railSteps.length && 'IntersectionObserver' in window) {
  const mark = (i) => {
    railSteps.forEach((step, n) => {
      step.classList.toggle('is-active', n === i);
      step.classList.toggle('is-done', n < i);
    });
  };
  const seen = new Set();
  const lo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const i = logItems.indexOf(e.target);
      if (e.isIntersecting) seen.add(i); else seen.delete(i);
    });
    if (seen.size) mark(Math.min(...seen));
  }, { rootMargin: '-35% 0px -45% 0px' });
  logItems.forEach((li) => lo.observe(li));
}

// ── slow drift on photos as they pass through the viewport ───────
if (!reduced) {
  const drifters = [...document.querySelectorAll('.shot img')]; // frames that clip their contents
  let pending = false;
  const drift = () => {
    const h = window.innerHeight;
    drifters.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > h + 200) return;
      const mid = r.top + r.height / 2;
      const off = ((mid - h / 2) / h) * -18; // px
      img.style.transform = `translate3d(0, ${off.toFixed(2)}px, 0) scale(1.08)`;
    });
    pending = false;
  };
  addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(drift); }
  }, { passive: true });
  addEventListener('resize', drift, { passive: true });
  drift();
}

// ── eased page scrolling ────────────────────────────────────────
(() => {
  const smooth = !reduced && matchMedia('(pointer: fine)').matches;
  const max = () => document.documentElement.scrollHeight - window.innerHeight;
  const clamp = (v) => Math.max(0, Math.min(v, max()));

  let target = window.scrollY;
  let running = false;

  const tick = () => {
    const current = window.scrollY;
    const diff = target - current;
    if (Math.abs(diff) < 0.5) {
      window.scrollTo(0, Math.round(target));
      running = false;
      return;
    }
    window.scrollTo(0, current + diff * 0.09);
    requestAnimationFrame(tick);
  };
  const run = () => { if (!running) { running = true; requestAnimationFrame(tick); } };

  if (smooth) {
    addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.deltaMode === 1) return;
      e.preventDefault();
      target = clamp(target + e.deltaY);
      run();
    }, { passive: false });

    addEventListener('scroll', () => { if (!running) target = window.scrollY; }, { passive: true });
    addEventListener('resize', () => { target = clamp(target); }, { passive: true });
    ['keydown', 'touchstart', 'mousedown'].forEach((evt) =>
      addEventListener(evt, () => { running = false; target = window.scrollY; }, { passive: true }));
  }

  // anchor links glide instead of jumping
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id === '#' || id === '#top') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const header = document.querySelector('.nav');
      const offset = (header ? header.getBoundingClientRect().height : 0) + 16;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      if (!smooth) { window.scrollTo({ top, behavior: 'smooth' }); return; }
      target = clamp(top);
      run();
    });
  });
})();

// ── entrance sequence on first paint ─────────────────────────────
requestAnimationFrame(() => document.body.classList.add('is-ready'));
