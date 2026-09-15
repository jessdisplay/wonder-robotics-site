// The home hero robot as a real mesh (models/w1.glb, Hunyuan3D from the W-1
// front / three-quarter / back references, see the brand kit's SOURCE.txt).
//
// Why a mesh and not the plate: a flat 16:9 photo cannot fill a 3.2:1 window
// without cropping his head, and cannot fill a phone without cropping his
// sides. A scene has no edge to run out of, so he is sized to the viewport
// height and the background is the plate's own vignette rebuilt as CSS.
//
// The bake gets two things wrong that the references get right: the visor
// comes out near-black (canon: deep purple gloss) and the boots come out
// chrome (canon: white). Both are fixed here by splitting those triangles
// into their own material groups, so the file in the brand kit stays the
// untouched generator output. The same split gives him a separate head to
// turn: he is a sphere on a barrel, so a plane through the neck is a clean
// rigid cut and needs no skeleton.
//
// Runs only where it earns its bytes: pointer devices wider than 600px,
// no reduced-motion preference, WebGL present. Everywhere else the plate
// stays exactly as it was. Any failure or a slow fetch (4s) puts the plate
// back, so the worst case is the page as it shipped before this file.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const hero = document.querySelector('.pop.light');
const canvas = hero && hero.querySelector('canvas.stage');
if (!hero || !canvas) throw new Error('hero: no stage');

const wants3d =
  matchMedia('(min-width: 601px)').matches &&
  matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

if (wants3d && hasWebGL()) start(); else canvas.remove();

// Cut lines, as fractions of his height, measured off the mesh's width
// profile (the neck is the narrowest slice between helmet and torso; the
// boot tops sit under the hands, so boots also need the width guard).
const NECK = 0.47, BOOT_TOP = 0.125, BOOT_HALF_W = 0.19, ANTENNA_FROM = 0.88;
const VISOR_BAND = [0.50, 0.85], VISOR_LUM = 0.25;

function start() {
  hero.classList.add('is-3d');
  const plateBack = setTimeout(fail, 4000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  // The plate is lit from the upper left with a soft cream fill, so he is too.
  scene.add(new THREE.HemisphereLight(0xfff7ee, 0xd8ccbf, 0.9));
  const key = new THREE.DirectionalLight(0xfff4e8, 1.7); key.position.set(-2.2, 4, 3.2); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5); rim.position.set(2.5, 2, -2); scene.add(rim);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
  const rig = new THREE.Group(); scene.add(rig);
  let body = null, head = null, headPivot = null, H = 1, ready = false;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load('models/w1.glb', gltf => {
    try { build(gltf); } catch (e) { console.warn('hero: build failed', e); fail(); }
  }, undefined, err => { console.warn('hero: load failed', err); fail(); });

  function fail() {
    clearTimeout(plateBack);
    hero.classList.remove('is-3d', 'is-live');
    try { renderer.dispose(); } catch (e) {}
    canvas.remove();
  }

  function build(gltf) {
    let src = null;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => { if (o.isMesh && !src) src = o; });
    if (!src) throw new Error('no mesh');
    // Bake the node transform (Blender Z-up export) so every cut below is in
    // world space, Y up, and the split meshes can sit directly under the rig.
    // The file is meshopt-quantised: int16 positions, with the dequantise
    // scale living in that same node matrix. Baking a matrix into a
    // normalised int array wraps the values (the first build shredded him),
    // so the attributes go to float first.
    const toFloat = attr => {
      const n = attr.count, s = attr.itemSize, out = new Float32Array(n * s);
      const get = [i => attr.getX(i), i => attr.getY(i), i => attr.getZ(i), i => attr.getW(i)];
      for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) out[i * s + k] = get[k](i);
      return new THREE.BufferAttribute(out, s);
    };
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', toFloat(src.geometry.attributes.position));
    geom.setAttribute('normal', toFloat(src.geometry.attributes.normal));
    geom.setAttribute('uv', toFloat(src.geometry.attributes.uv));
    geom.setIndex(src.geometry.index);
    geom.applyMatrix4(src.matrixWorld);
    geom.computeBoundingBox();
    const bb = geom.boundingBox, minY = bb.min.y;
    H = bb.max.y - bb.min.y;
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;

    const baked = src.material;
    baked.side = THREE.FrontSide;
    const lum = sampleLuminance(baked.map);
    // The bake's metallic map turns the satin silver helmet into dark chrome
    // and lacquers the wood (Jesse: "he is all shiny", and the old viewer hit
    // the same thing). The master is satin everywhere: no metalness, a fixed
    // mid roughness, the room reflection pulled well back. Normal map stays.
    baked.metalness = 0; baked.metalnessMap = null;
    baked.roughness = 0.5; baked.roughnessMap = null;
    baked.envMapIntensity = 0.45;

    const pos = geom.attributes.position.array, nrm = geom.attributes.normal.array, uv = geom.attributes.uv.array;
    const idx = geom.index.array;
    const headVisor = [], headRest = [], boots = [], bodyRest = [];
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const y = (pos[a * 3 + 1] + pos[b * 3 + 1] + pos[c * 3 + 1]) / 3;
      const x = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3;
      const nz = (nrm[a * 3 + 2] + nrm[b * 3 + 2] + nrm[c * 3 + 2]) / 3;
      const h = (y - minY) / H;
      if (h > NECK) {
        let visor = false;
        if (h > VISOR_BAND[0] && h < VISOR_BAND[1] && nz > 0.25 && Math.abs(x - cx) < 0.22 * H) {
          const u = (uv[a * 2] + uv[b * 2] + uv[c * 2]) / 3, v = (uv[a * 2 + 1] + uv[b * 2 + 1] + uv[c * 2 + 1]) / 3;
          visor = lum(u, v) < VISOR_LUM;
        }
        (visor ? headVisor : headRest).push(a, b, c);
      } else if (h < BOOT_TOP && Math.abs(x - cx) < BOOT_HALF_W * H) {
        boots.push(a, b, c);
      } else {
        bodyRest.push(a, b, c);
      }
    }

    // Master visor: near-black purple that only reads purple where the light
    // hits, one big soft highlight, not a blue glass ball throwing the room.
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x160a2e, emissive: 0x0a0418, roughness: 0.22, metalness: 0,
      clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 0.7
    });
    const bootMat = baked.clone();
    bootMat.roughness = 0.42;
    bootMat.color = new THREE.Color(0xffffff);

    const part = (lists, mats) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', geom.attributes.position);
      g.setAttribute('normal', geom.attributes.normal);
      g.setAttribute('uv', geom.attributes.uv);
      // 300k indices: a typed copy, never a spread (that overflows the stack).
      const all = new Uint32Array(lists.reduce((n, l) => n + l.length, 0));
      let off = 0;
      lists.forEach((l, i) => { all.set(l, off); g.addGroup(off, l.length, i); off += l.length; });
      g.setIndex(new THREE.BufferAttribute(all, 1));
      return new THREE.Mesh(g, mats);
    };
    body = part([boots, bodyRest], [bootMat, baked]);
    head = part([headVisor, headRest], [visorMat, baked]);

    // Pivot at the helmet's own centre (antenna excluded, it would pull the
    // box up), so a turn reads as the sphere rotating in its collar.
    const hb = new THREE.Box3();
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.length; i += 3) {
      const h = (pos[i + 1] - minY) / H;
      if (h > NECK && h < ANTENNA_FROM) hb.expandByPoint(p.set(pos[i], pos[i + 1], pos[i + 2]));
    }
    const hc = hb.getCenter(new THREE.Vector3());
    headPivot = new THREE.Group();
    headPivot.position.copy(hc);
    head.position.copy(hc).negate();
    headPivot.add(head);

    // Stand him on the origin, centred.
    const stand = new THREE.Group();
    stand.position.set(-cx, -minY, -cz);
    stand.add(body, headPivot);
    rig.add(stand);
    rig.add(groundShadow(H));

    clearTimeout(plateBack);
    ready = true;
    resize();
    hero.classList.add('is-live');
  }

  // Reads the baked base colour once so the visor can be found by what it
  // looks like (near-black in the bake) rather than by guessing its outline.
  function sampleLuminance(tex) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    let data = null;
    try { ctx.drawImage(tex.image, 0, 0, S, S); data = ctx.getImageData(0, 0, S, S).data; } catch (e) { data = null; }
    return (u, v) => {
      if (!data) return 1;
      const x = Math.min(S - 1, Math.max(0, Math.floor((u % 1 + 1) % 1 * S)));
      const y = Math.min(S - 1, Math.max(0, Math.floor((v % 1 + 1) % 1 * S)));
      const i = (y * S + x) * 4;
      return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    };
  }

  function groundShadow(H) {
    const S = 256, c = document.createElement('canvas'); c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(60,40,30,0.42)'); g.addColorStop(0.45, 'rgba(60,40,30,0.16)'); g.addColorStop(1, 'rgba(60,40,30,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(H * 0.62, H * 0.30), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.002; m.renderOrder = -1;
    return m;
  }

  // Frame: he takes 84% of the hero's height, boots on a ground line a
  // little above the bottom edge, standing in the plate's old spot at 22%
  // of the width so the type's grid to his right is untouched.
  // The type starts at column 5 (a third of the width). His right hand must
  // stay left of 31%: on narrower windows he first slides left to 16%, then
  // shrinks. He is 0.53 as wide as he is tall, so his half-width as a
  // fraction of the window width is 0.265 * fill / aspect.
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = camera.aspect = w / h;
    const ground = 0.06, limit = 0.31, home = 0.22, leftmost = 0.16;
    const fill = Math.min(0.82, (limit - leftmost) / 0.265 * aspect);
    const cxFrac = Math.max(leftmost, Math.min(home, limit - 0.265 * fill / aspect));
    const visH = H / fill;
    const dist = (visH / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const visW = visH * aspect;
    const cy = H / 2 - (0.5 - ground - fill / 2) * visH;
    camera.position.set(0, cy, dist);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
    rig.position.x = (cxFrac - 0.5) * visW;
  }
  new ResizeObserver(resize).observe(hero);

  // Pointer: he looks at the cursor. Left alone, he looks around slowly on
  // his own. Both are targets that the head eases toward, never snaps.
  let px = 0, py = 0, lastMove = -1e9;
  addEventListener('pointermove', e => {
    px = (e.clientX / innerWidth - 0.5) * 2;
    py = (e.clientY / innerHeight - 0.5) * 2;
    lastMove = performance.now();
  }, { passive: true });

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  let yaw = 0, pitch = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!ready || !visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const idle = performance.now() - lastMove > 2500;
    const tyaw = idle ? Math.sin(t * 0.33) * 0.16 + Math.sin(t * 0.11) * 0.06 : px * 0.26;
    const tpit = idle ? Math.sin(t * 0.21 + 1.3) * 0.05 : py * 0.11;
    const k = 1 - Math.exp(-dt * (idle ? 1.6 : 5));
    yaw += (tyaw - yaw) * k; pitch += (tpit - pitch) * k;
    headPivot.rotation.set(pitch, yaw, -yaw * 0.12);
    rig.position.y = Math.sin(t * 1.05) * H * 0.006;
    rig.rotation.y = Math.sin(t * 0.7) * 0.02;
    renderer.render(scene, camera);
  }
  frame();
}
