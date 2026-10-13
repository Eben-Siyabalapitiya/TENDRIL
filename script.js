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

// ── TKS mark: fall back to type if no logo file is present ───────
document.querySelectorAll('.tks-logo img').forEach((img) => {
  // try svg, then png, then fall back to the type lockup
  const tries = ['media/tks-logo.svg', 'media/tks-logo.png'];
  let i = 0;
  const next = () => {
    i += 1;
    if (i < tries.length) { img.src = tries[i]; return; }
    img.setAttribute('data-missing', '');
  };
  img.addEventListener('error', next);
  img.addEventListener('load', () => { if (!img.naturalWidth) next(); });
  if (img.complete && img.naturalWidth === 0) next();
});
