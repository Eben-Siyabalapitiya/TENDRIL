// Interactive view of the printed parts.
//
// The meshes come from the STEP files, tessellated and decimated so the whole
// set is about 1.6 MB. Nothing here is required for the page to make sense: if
// the module fails to load, or WebGL is missing, the still render stays up.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.querySelector('[data-viewer]');
if (root) start(root);

// every length measured off the mesh, in millimetres
const PARTS = {
  'arm': {
    label: 'Full arm',
    files: [['media/cad/tip-half.glb', -0.09315], ['media/cad/base-half.glb', 0.08405]],
    dims: '354.4 × 33.1 × 28.8',
    note: 'Both halves joined at the seam, tip to base.'
  },
  'tip-half': {
    label: 'Tip half',
    files: [['media/cad/tip-half.glb', 0]],
    dims: '186.3 × 20.7 × 17.9',
    note: 'The thin end. Segments keep shrinking until the tip is barely printable.'
  },
  'base-half': {
    label: 'Base half',
    files: [['media/cad/base-half.glb', 0]],
    dims: '168.1 × 33.1 × 28.8',
    note: 'The end that carries the whole arm, and the end that cracked on V1.'
  },
  'rings-20': {
    label: 'Guide rings',
    files: [['media/cad/rings-20.glb', 0]],
    dims: '100.0 × 30.0 × 15.0',
    note: 'Three rings on one plate, 20 mm bore. The string runs through these.'
  },
  'handle': {
    label: 'Handle',
    files: [['media/cad/handle.glb', 0]],
    dims: '24.0 × 53.0 × 35.0',
    note: 'The manual adapter. This is what your hand pulls against.'
  }
};

function start(root) {
  const canvas = root.querySelector('canvas');
  const stage = root.querySelector('.viewer-stage');
  const still = root.querySelector('.viewer-still');
  const dimOut = root.querySelector('[data-dims]');
  const noteOut = root.querySelector('[data-note]');
  const buttons = [...root.querySelectorAll('[data-part]')];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    return; // no WebGL, the still render stays
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

  const key = new THREE.DirectionalLight(0xfff4ea, 1.5);
  key.position.set(-0.4, 0.75, 0.9);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xf7a273, 0.55);
  rim.position.set(0.9, -0.1, -0.6);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));

  const camera = new THREE.PerspectiveCamera(32, 1, 0.005, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.75;
  controls.autoRotateSpeed = 1.1;
  // the wheel belongs to the page until someone actually grabs the model,
  // otherwise scrolling past the viewer traps you in it
  controls.enableZoom = false;

  const material = new THREE.MeshStandardMaterial({
    color: 0xd8d3cb, roughness: 0.52, metalness: 0.0, flatShading: true,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
  });
  // outlines where two faces meet at a real angle, the way a CAD viewer draws it
  const lineMat = new THREE.LineBasicMaterial({ color: 0x2b2722, transparent: true, opacity: 0.8 });
  const edges = [];
  let showEdges = true;

  const group = new THREE.Group();
  scene.add(group);
  const plate = shadowPlate();
  scene.add(plate);

  const loader = new GLTFLoader();
  const cache = new Map();
  const load = (url) => {
    if (!cache.has(url)) {
      cache.set(url, new Promise((res, rej) => loader.load(url, res, null, rej)));
    }
    return cache.get(url);
  };

  const HOME_DIR = new THREE.Vector3(0.30, 0.42, 0.86).normalize();
  let size = new THREE.Vector3(1, 1, 1);
  let homeDist = 1, dirty = true, visible = true, touched = false;
  const draw = () => { dirty = true; };
  controls.addEventListener('change', draw);
  controls.addEventListener('start', () => {
    touched = true;
    controls.enableZoom = true;
    root.classList.add('is-held');
  });

  // distance that just fits the part's box, measured along the viewing axis,
  // so a 354 mm arm fills the frame as well as a 24 mm handle does
  function fitDistance() {
    const right = new THREE.Vector3().crossVectors(HOME_DIR, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, HOME_DIR).normalize();
    const half = (a) => 0.5 * (size.x * Math.abs(a.x) + size.y * Math.abs(a.y) + size.z * Math.abs(a.z));
    const t = Math.tan((camera.fov * Math.PI / 180) / 2);
    return Math.max(half(up) / t, half(right) / (t * Math.max(camera.aspect, 0.4))) * 1.14
      + half(HOME_DIR);
  }

  async function show(id) {
    const part = PARTS[id];
    if (!part) return;
    root.classList.add('is-loading');
    buttons.forEach((b) => b.classList.toggle('is-on', b.dataset.part === id));
    if (dimOut) dimOut.textContent = part.dims + ' mm';
    if (noteOut) noteOut.textContent = part.note;

    let gltfs;
    try {
      gltfs = await Promise.all(part.files.map(([u]) => load(u)));
    } catch (e) {
      root.classList.remove('is-loading');
      root.classList.add('is-failed');
      return;
    }

    group.clear();
    edges.length = 0;
    gltfs.forEach((g, i) => {
      const node = g.scene.clone(true);
      node.traverse((o) => {
        if (!o.isMesh) return;
        o.material = material;
        if (!o.geometry.userData.edges) {
          o.geometry.userData.edges = new THREE.EdgesGeometry(o.geometry, 32);
        }
        // a child of the mesh, so it picks up exactly the same transform
        const line = new THREE.LineSegments(o.geometry.userData.edges, lineMat);
        line.visible = showEdges;
        o.add(line);
        edges.push(line);
      });
      node.position.x = part.files[i][1];
      group.add(node);
    });

    // sit the model on the origin and frame it
    const box = new THREE.Box3().setFromObject(group);
    group.position.sub(box.getCenter(new THREE.Vector3()));
    size = box.getSize(new THREE.Vector3());
    const r = box.getBoundingSphere(new THREE.Sphere()).radius;
    homeDist = fitDistance();
    controls.minDistance = r * 0.6;
    controls.maxDistance = homeDist * 3.2;
    camera.near = Math.max(r / 400, 0.0015);
    camera.far = homeDist * 12;
    plate.scale.setScalar(Math.max(size.x, size.z) * 1.6);
    plate.position.y = -size.y * 0.62;
    touched = false;
    home();

    root.classList.remove('is-loading');
    root.classList.add('is-live');
    draw();
  }

  function home() {
    camera.position.copy(HOME_DIR).multiplyScalar(homeDist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
    draw();
  }

  // a soft pool of light under the part, so it is not floating in nothing
  function shadowPlate() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d').createRadialGradient(128, 128, 4, 128, 128, 126);
    g.addColorStop(0, 'rgba(0,0,0,.42)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    const ctx = c.getContext('2d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    plate.rotation.x = -Math.PI / 2;
    return plate;
  }

  // ── controls ──────────────────────────────────────────────────────────
  buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.part)));

  const tool = (name, fn) => {
    const b = root.querySelector(`[data-tool="${name}"]`);
    if (b) b.addEventListener('click', () => fn(b));
  };
  tool('spin', (b) => {
    controls.autoRotate = !controls.autoRotate;
    b.classList.toggle('is-on', controls.autoRotate);
    b.setAttribute('aria-pressed', String(controls.autoRotate));
    draw();
  });
  tool('edges', (b) => {
    showEdges = !showEdges;
    edges.forEach((l) => { l.visible = showEdges; });
    b.classList.toggle('is-on', showEdges);
    b.setAttribute('aria-pressed', String(showEdges));
    draw();
  });
  tool('reset', () => {
    controls.autoRotate = false;
    const sb = root.querySelector('[data-tool="spin"]');
    if (sb) { sb.classList.remove('is-on'); sb.setAttribute('aria-pressed', 'false'); }
    touched = false;
    homeDist = fitDistance();
    home();
  });

  // ── sizing and the loop ───────────────────────────────────────────────
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    homeDist = fitDistance();
    controls.maxDistance = homeDist * 3.2;
    if (!touched) home();
    draw();
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  // nothing renders while the viewer is scrolled away
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; draw(); },
    { rootMargin: '200px' }).observe(root);

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const moved = controls.update();
    if (moved || controls.autoRotate || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
  });

  if (still) still.addEventListener('transitionend', () => {
    if (root.classList.contains('is-live')) still.remove();
  });

  // only start fetching meshes once the viewer is near the screen
  const kick = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    kick.disconnect();
    show('arm');
  }, { rootMargin: '400px' });
  kick.observe(root);
}
