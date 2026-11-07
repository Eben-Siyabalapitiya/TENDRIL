// The curl, drawn live, in all three directions.
//
// The spiral is the same geometry as media/make_diagram.py, parameter for
// parameter, solved per frame rather than played back. What changes between
// the three directions is only which plane the fold happens in: the first
// channel folds the arm one way or the other inside its own plane, and the
// second channel folds it in a plane across that one.

(function () {
  const root = document.querySelector('[data-curl]');
  if (!root) return;

  const canvas = root.querySelector('canvas');
  const slider = root.querySelector('input[type="range"]');
  const wrapOut = root.querySelector('[data-wrap]');
  const jointOut = root.querySelector('[data-joint]');
  const planeOut = root.querySelector('[data-plane]');
  const dirButtons = [...root.querySelectorAll('[data-dir]')];
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

  // one fixed axonometric camera, so the three directions are comparable
  const PSI = 26 * Math.PI / 180, TH = 18 * Math.PI / 180;
  const SP = Math.sin(PSI), CP = Math.cos(PSI), ST = Math.sin(TH), CT = Math.cos(TH);

  const mul = (a, b) => [
    a[0] * b[0] + a[1] * b[3], a[0] * b[1] + a[1] * b[4], a[0] * b[2] + a[1] * b[5] + a[2],
    a[3] * b[0] + a[4] * b[3], a[3] * b[1] + a[4] * b[4], a[3] * b[2] + a[4] * b[5] + a[5]
  ];
  const at = (m, x, y) => [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]];
  const rot = (t) => [Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t), 0];

  // The arm always folds in a plane. (u) runs along it, (v) is the fold.
  // curl 0 = flat as printed, 1 = fully closed.
  function arm(curl) {
    let m = [1, 0, 0, 0, 1, 0];
    const segs = [];
    let prev = null;
    for (let i = 0; i < N; i++) {
      const s = Math.pow(Q, i);
      const pitch = L0 * s, hA = H0 * s, hB = H0 * Math.pow(Q, i + 1);
      const gap = pitch * NOTCH;
      const g = gap * (1 - 0.82 * curl);        // the V closes as the joint folds
      const poly = [[0, 0], [pitch, 0], [pitch - g / 2, hB], [g / 2, hA]]
        .map((p) => at(m, p[0], p[1]));
      const a = at(m, g / 2, hA * TENDON);
      const b = at(m, pitch - g / 2, hB * TENDON);
      segs.push({ poly, cord: prev ? [prev, a, b] : [a, b], depth: hA });
      prev = b;
      m = mul(m, [1, 0, pitch - (gap - g), 0, 1, 0]);
      m = mul(m, rot(DTHETA * curl));
    }
    return segs;
  }

  // Lay that plane into space at angle phi about the arm's own long axis,
  // then flatten it with the camera above. Returns screen x, y and depth.
  function place(p, phi) {
    const X = p[0], Y = p[1] * Math.sin(phi), Z = p[1] * Math.cos(phi);
    const t = X * SP + Y * CP;
    return [X * CP - Y * SP, Z * CT - t * ST, t * CT + Z * ST];
  }

  // the plate the arm is bolted to, in the same plane as the arm
  const BLOCK = [[-13, 0], [0, 0], [0, H0 * 1.05], [-13, H0 * 1.05]];

  // Tight box of one pose, on screen.
  function boxOf(curl, phi) {
    let b = [1e9, 1e9, -1e9, -1e9];
    const take = (p) => {
      const q = place(p, phi);
      if (q[0] < b[0]) b[0] = q[0]; if (q[1] < b[1]) b[1] = q[1];
      if (q[0] > b[2]) b[2] = q[0]; if (q[1] > b[3]) b[3] = q[1];
    };
    for (const s of arm(curl)) for (const p of s.poly) take(p);
    for (const p of BLOCK) take(p);
    return b;
  }

  // The view follows the arm as it closes, so it fills the frame at both ends.
  // Interpolating between just the flat and the closed box clips the poses in
  // between, which sweep wider than either, so the envelope is sampled and
  // each sample widened to cover its neighbours.
  const STEPS = 20;
  function envelope(phi, w, h) {
    const raw = [];
    for (let i = 0; i <= STEPS; i++) raw.push(boxOf(i / STEPS, phi));
    return raw.map((_, i) => {
      const b = [1e9, 1e9, -1e9, -1e9];
      for (let j = Math.max(0, i - 1); j <= Math.min(STEPS, i + 1); j++) {
        b[0] = Math.min(b[0], raw[j][0]); b[1] = Math.min(b[1], raw[j][1]);
        b[2] = Math.max(b[2], raw[j][2]); b[3] = Math.max(b[3], raw[j][3]);
      }
      const pad = H0 * 0.9;
      const x0 = b[0] - pad, y0 = b[1] - pad, x1 = b[2] + pad, y1 = b[3] + pad;
      const k = Math.min(w / (x1 - x0), h / (y1 - y0));
      return [k, (w - (x1 + x0) * k) / 2, (h + (y1 + y0) * k) / 2];
    });
  }

  // ── directions ────────────────────────────────────────────────────────
  // the first channel folds the arm inside its own plane, either way;
  // the second channel is drawn square to it
  const DIRS = {
    left:   { phi: 0,             plane: 'Channel one · 0°' },
    right:  { phi: Math.PI,       plane: 'Channel one · 180°' },
    second: { phi: Math.PI / 2,   plane: 'Channel two · 90°' }
  };
  let dir = 'left';

  let fits = null, W = 0, Hh = 0;

  function measure() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; Hh = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    refit();
    return true;
  }
  function refit() {
    if (W && Hh) fits = envelope(DIRS[dir].phi, W, Hh);
  }

  function paint(curl) {
    if (!W || !Hh || !fits) return;
    const phi = DIRS[dir].phi;
    const f = Math.max(0, Math.min(1, curl)) * STEPS;
    const i = Math.min(STEPS - 1, Math.floor(f)), u = f - i;
    const a = fits[i], b = fits[i + 1];
    const k = a[0] + (b[0] - a[0]) * u;
    const ox = a[1] + (b[1] - a[1]) * u;
    const oy = a[2] + (b[2] - a[2]) * u;
    const T = (p) => { const q = place(p, phi); return [ox + q[0] * k, oy - q[1] * k]; };
    const depth = (p) => place(p, phi)[2];

    ctx.clearRect(0, 0, W, Hh);

    // the block the arm is bolted to, flush against the first segment
    ctx.fillStyle = BASE;
    ctx.beginPath();
    BLOCK.forEach((p, n) => { const q = T(p); n ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.closePath();
    ctx.fill();

    // back to front, so the spiral overlaps itself the right way round
    const segs = arm(curl);
    segs.forEach((s) => {
      s.z = (depth(s.poly[0]) + depth(s.poly[2])) / 2;
    });
    segs.sort((a, b) => b.z - a.z);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const edgeW = Math.max(0.8, 0.9 * k);

    for (const s of segs) {
      ctx.lineWidth = edgeW;
      ctx.fillStyle = BODY;
      ctx.strokeStyle = EDGE;
      ctx.beginPath();
      s.poly.forEach((p, i) => { const q = T(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // the string, threaded off-centre, drawn with its own segment so it
      // passes behind the coils it should pass behind
      // tapering with the segment, so it does not outgrow the tip
      ctx.lineWidth = Math.max(1.1, Math.min(2.0 * k, 0.19 * s.depth * k));
      ctx.strokeStyle = TENDON_C;
      ctx.beginPath();
      s.cord.forEach((p, i) => { const q = T(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.stroke();
    }

    const deg = DTHETA * 180 / Math.PI * curl;
    if (jointOut) jointOut.textContent = deg.toFixed(1) + '°';
    if (wrapOut) wrapOut.textContent = (deg * N).toFixed(0) + '°';
    if (planeOut) planeOut.textContent = DIRS[dir].plane;
  }

  // ── the loop ──────────────────────────────────────────────────────────
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let curl = calm.matches ? 1 : 0;
  let playing = !calm.matches;
  let seen = false, t0 = 0;

  if (slider) {
    slider.value = String(Math.round(curl * 100));
    slider.addEventListener('input', () => {
      playing = false;
      root.classList.add('is-held');
      curl = Number(slider.value) / 100;
      paint(curl);
    });
  }

  dirButtons.forEach((b) => b.addEventListener('click', () => {
    dir = b.dataset.dir;
    dirButtons.forEach((o) => {
      const on = o === b;
      o.classList.toggle('is-on', on);
      o.setAttribute('aria-pressed', String(on));
    });
    refit();
    paint(curl);
  }));

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
    if (!seen || !playing) return;
    if (!t0) t0 = now;
    curl = phase(now - t0);
    if (slider) slider.value = String(Math.round(curl * 100));
    paint(curl);
  }

  new ResizeObserver(() => { if (measure()) paint(curl); }).observe(canvas);
  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    if (seen) { t0 = 0; if (measure()) paint(curl); }
  }, { rootMargin: '120px' }).observe(root);

  if (measure()) paint(curl);
  root.classList.add('is-live');
  requestAnimationFrame(frame);
})();
