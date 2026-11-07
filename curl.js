// The curl, drawn live.
//
// The geometry is the same as media/make_diagram.py, parameter for parameter,
// so this is the real spiral rather than a drawing of one. Nothing is loaded
// and nothing is pre-rendered: every frame is solved from the numbers below.

(function () {
  const root = document.querySelector('[data-curl]');
  if (!root) return;

  const canvas = root.querySelector('canvas');
  const slider = root.querySelector('input[type="range"]');
  const wrapOut = root.querySelector('[data-wrap]');
  const jointOut = root.querySelector('[data-joint]');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return;

  // ── the arm ───────────────────────────────────────────────────────────
  const N = 18;                         // segments
  const DTHETA = 18 * Math.PI / 180;    // how far each joint folds, closed
  const B = 0.25;
  const Q = Math.exp(-B * DTHETA);      // each segment is this much of the last
  const L0 = 20.2, H0 = 12.4;           // first segment, mm
  const NOTCH = 0.42;                   // of the pitch, taken by the V gap
  const TENDON = 0.70;                  // tendon height, of the segment depth

  const BODY = '#d8d3cb', EDGE = '#6c6862', TENDON_C = '#f7a273', BASE = '#4a453e';

  const mul = (a, b) => [
    a[0] * b[0] + a[1] * b[3], a[0] * b[1] + a[1] * b[4], a[0] * b[2] + a[1] * b[5] + a[2],
    a[3] * b[0] + a[4] * b[3], a[3] * b[1] + a[4] * b[4], a[3] * b[2] + a[4] * b[5] + a[5]
  ];
  const at = (m, x, y) => [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]];
  const rot = (t) => [Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t), 0];

  // curl 0 = flat as printed, 1 = fully closed
  function arm(curl) {
    let m = [1, 0, 0, 0, 1, 0];
    const polys = [], tendon = [];
    for (let i = 0; i < N; i++) {
      const s = Math.pow(Q, i);
      const pitch = L0 * s, hA = H0 * s, hB = H0 * Math.pow(Q, i + 1);
      const gap = pitch * NOTCH;
      const g = gap * (1 - 0.82 * curl);        // the V closes as the joint folds
      polys.push([[0, 0], [pitch, 0], [pitch - g / 2, hB], [g / 2, hA]].map((p) => at(m, p[0], p[1])));
      tendon.push(at(m, g / 2, hA * TENDON));
      tendon.push(at(m, pitch - g / 2, hB * TENDON));
      m = mul(m, [1, 0, pitch - (gap - g), 0, 1, 0]);
      m = mul(m, rot(DTHETA * curl));
    }
    return { polys, tendon };
  }

  // Fit flat and fit closed, then interpolate between the two transforms.
  // Refitting every frame makes the drawing swim; this does not.
  function fitFor(curl, w, h) {
    const { polys } = arm(curl);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const poly of polys) for (const [x, y] of poly) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const pad = H0 * 1.5;
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const k = Math.min(w / (x1 - x0), h / (y1 - y0)) * 0.94;
    return [k, (w - (x1 + x0) * k) / 2, (h + (y1 + y0) * k) / 2];
  }

  let flat = [1, 0, 0], shut = [1, 0, 0], W = 0, Hh = 0;

  function measure() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; Hh = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flat = fitFor(0, W, Hh);
    shut = fitFor(1, W, Hh);
    return true;
  }

  function paint(curl) {
    const k = flat[0] + (shut[0] - flat[0]) * curl;
    const ox = flat[1] + (shut[1] - flat[1]) * curl;
    const oy = flat[2] + (shut[2] - flat[2]) * curl;
    const T = (p) => [ox + p[0] * k, oy - p[1] * k];   // y up, like the CAD

    const { polys, tendon } = arm(curl);
    ctx.clearRect(0, 0, W, Hh);

    // the block the arm is bolted to
    const [bx, by] = T([0, 0]);
    ctx.fillStyle = BASE;
    const bw = 15 * k, bh = H0 * 1.25 * k;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(bx - bw, by - bh, bw, bh, 2.4 * k);
      ctx.fill();
    } else {
      ctx.fillRect(bx - bw, by - bh, bw, bh);
    }

    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(0.8, 0.9 * k);
    ctx.fillStyle = BODY;
    ctx.strokeStyle = EDGE;
    for (const poly of polys) {
      ctx.beginPath();
      poly.forEach((p, i) => { const q = T(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // the string, threaded off-centre through every segment
    ctx.strokeStyle = TENDON_C;
    ctx.lineWidth = Math.max(1.4, 1.9 * k);
    ctx.lineCap = 'round';
    ctx.beginPath();
    tendon.forEach((p, i) => { const q = T(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.stroke();

    const deg = DTHETA * 180 / Math.PI * curl;
    if (jointOut) jointOut.textContent = deg.toFixed(1) + '°';
    if (wrapOut) wrapOut.textContent = (deg * N).toFixed(0) + '°';
  }

  // ── the loop ──────────────────────────────────────────────────────────
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let curl = calm.matches ? 1 : 0;
  let playing = !calm.matches;
  let seen = false, t0 = 0;

  if (slider) {
    slider.value = String(Math.round(curl * 100));
    const take = () => {
      playing = false;
      root.classList.add('is-held');
      curl = Number(slider.value) / 100;
      paint(curl);
    };
    slider.addEventListener('input', take);
  }

  // flat, close, hold, open, hold — then round again
  function phase(ms) {
    const t = (ms / 1000) % 9.2;
    const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * u * (u * (u * 6 - 15) + 10); };
    if (t < 3.4) return ease(t / 3.4);
    if (t < 5.0) return 1;
    if (t < 8.0) return 1 - ease((t - 5.0) / 3.0);
    return 0;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!seen) return;
    if (playing) {
      if (!t0) t0 = now;
      curl = phase(now - t0);
      if (slider) slider.value = String(Math.round(curl * 100));
      paint(curl);
    }
  }

  const ro = new ResizeObserver(() => { if (measure()) paint(curl); });
  ro.observe(canvas);

  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    if (seen) { t0 = 0; if (measure()) paint(curl); }
  }, { rootMargin: '120px' }).observe(root);

  if (measure()) paint(curl);
  root.classList.add('is-live');
  requestAnimationFrame(frame);
})();
