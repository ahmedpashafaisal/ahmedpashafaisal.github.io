// Map look test, 3D version: the board as a toy town in three.js, in the
// landing's look (toon shading in 3 steps, ink outlines, same lights) with the
// landing's own car and idea bulbs (hero3d.js). Props are Kenney CC0 models
// (map-test/kenney/) restyled to the same toon look. The camera looks down at
// the board at a slant; it shows what the shared camera asks for.
import {
  BackSide, Box3, BoxGeometry, BufferGeometry, CircleGeometry, Color, CylinderGeometry, DirectionalLight, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, Group, HemisphereLight, InstancedMesh, Mesh, MeshBasicMaterial, MeshToonMaterial, Object3D, PerspectiveCamera, PlaneGeometry, PointLight, RingGeometry, Scene, Shape, SpotLight, SRGBColorSpace, TextureLoader, Vector3, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bulbModel, carModel, gradientMap } from '../src/js/hero3d.js';
import { ROAD_W } from './world.js';

const PITCH = (40 * Math.PI) / 180; // camera angle above the board
const FOV = 30;
const MODELS = {
  tree: 'forest/tree',
  'tree-round': 'town/tree-high-round',
  'tree-crooked': 'town/tree-crooked',
  rock: 'town/rock-large',
  stones: 'forest/stones',
  lantern: 'town/lantern',
  hedge: 'town/hedge',
  fence: 'town/fence',
  stall: 'town/stall-red',
  tent: 'forest/tent',
  flag: 'forest/flag',
  plant: 'forest/plant',
  cone: 'roads/construction-cone',
  fountain: 'town/fountain-round',
};
// Size of each prop's biggest side, in world units
const PROP_SIZE = { fountain: 70, hedge: 46, fence: 46, stones: 34, rock: 44, plant: 30, cone: 24, stall: 52, tent: 56, flag: 46, lantern: 46 };

const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const toonOf = (color) => new MeshToonMaterial({ color: new Color(color), gradientMap });

// A flat rounded slab lying on the board, top at yTop
function slab(l, t, w, h, r, depth, mat, yTop) {
  const s = new Shape();
  s.moveTo(l + r, t);
  s.lineTo(l + w - r, t);
  s.quadraticCurveTo(l + w, t, l + w, t + r);
  s.lineTo(l + w, t + h - r);
  s.quadraticCurveTo(l + w, t + h, l + w - r, t + h);
  s.lineTo(l + r, t + h);
  s.quadraticCurveTo(l, t + h, l, t + h - r);
  s.lineTo(l, t + r);
  s.quadraticCurveTo(l, t, l + r, t);
  const geo = new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(Math.PI / 2); // shape (x, y) → board (x, z); extrudes downward
  const m = new Mesh(geo, mat);
  m.position.y = yTop;
  return m;
}

// The road as a ribbon of half width hw, y up
function ribbon(pts, hw, y) {
  const pos = [];
  const nor = [];
  const list = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
  for (let i = 0; i < list.length - 1; i++) {
    const [p, q] = [list[i], list[i + 1]];
    const side = (o) => [-Math.sin(o.a) * hw, Math.cos(o.a) * hw];
    const [px, pz] = side(p);
    const [qx, qz] = side(q);
    const quad = [
      [p.x + px, p.y + pz], [p.x - px, p.y - pz], [q.x + qx, q.y + qz],
      [q.x + qx, q.y + qz], [p.x - px, p.y - pz], [q.x - qx, q.y - qz],
    ];
    for (const [x, z] of quad) {
      pos.push(x, y, z);
      nor.push(0, 1, 0);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  return geo;
}

export async function make3d(world) {
  const canvas = document.createElement('canvas');
  canvas.className = 'map3d';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 10, 30000);
  const hemi = new HemisphereLight(0xffffff, 0xd9d2c3, 2.2);
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(world.W / 2 + 300, 900, world.H / 2 + 600);
  sun.target.position.set(world.W / 2, 0, world.H / 2);
  const spot = new SpotLight(0xfff6dc, 0, 0, 0.42, 0.7, 0);
  const lampLight = new PointLight(0xcaff00, 0, 260, 1.2);
  scene.add(hemi, sun, sun.target, spot, spot.target, lampLight);

  const INK = css('--ink', '#1d1b18');
  const inkMat = new MeshBasicMaterial({ color: new Color(INK) });
  const inkToon = toonOf(INK);

  // Board: cream slab with an ink rim
  scene.add(slab(-6, -6, world.W + 12, world.H + 12, 40, 34, inkMat, -0.5));
  scene.add(slab(0, 0, world.W, world.H, 36, 30, toonOf(css('--surface', '#fffdf8')), 0));
  // Regions: tinted patches
  for (const p of world.patches) scene.add(slab(p.l, p.t, p.r - p.l, p.b - p.t, 28, 2, toonOf(css(`--cat-${p.cat}`, '#ddd')), 2));
  // Road: ink edge, cream top, ink dashes along the middle
  const roadTop = toonOf('#ece4d4');
  roadTop.side = DoubleSide;
  scene.add(new Mesh(ribbon(world.pts, ROAD_W / 2 + 4, 4.2), new MeshBasicMaterial({ color: new Color(INK), side: DoubleSide })));
  scene.add(new Mesh(ribbon(world.pts, ROAD_W / 2, 4.6), roadTop));
  const dashGeo = new BoxGeometry(12, 1, 2.6);
  const count = Math.floor(world.length / 26);
  const dashes = new InstancedMesh(dashGeo, new MeshBasicMaterial({ color: new Color(INK), transparent: true, opacity: 0.55 }), count);
  const o = new Object3D();
  for (let k = 0; k < count; k++) {
    const p = world.at(k * 26 + 13);
    o.position.set(p.x, 5, p.y);
    o.rotation.set(0, -p.a, 0);
    o.updateMatrix();
    dashes.setMatrixAt(k, o.matrix);
  }
  scene.add(dashes);

  // Props: load each Kenney model once, restyle to toon + ink outline, clone
  const loader = new GLTFLoader();
  const used = [...new Set(world.props.map((p) => p.type))];
  const loaded = Object.fromEntries(
    await Promise.all(
      used.map(async (type) => {
        const gltf = await loader.loadAsync(`/map-test/kenney/${MODELS[type]}.glb`);
        const root = gltf.scene;
        const outline = new MeshBasicMaterial({ color: new Color(INK), side: BackSide });
        const meshes = [];
        root.traverse((m) => m.isMesh && meshes.push(m));
        for (const m of meshes) {
          m.material = new MeshToonMaterial({ map: m.material.map, color: m.material.color, gradientMap });
          const hull = new Mesh(m.geometry, outline);
          hull.scale.setScalar(1.05);
          m.add(hull);
        }
        const size = new Box3().setFromObject(root).getSize(new Vector3());
        return [type, { root, top: Math.max(size.x, size.y, size.z) || 1 }];
      }),
    ),
  );
  world.props.forEach((p, k) => {
    const { root, top } = loaded[p.type];
    const g = root.clone(true);
    g.scale.setScalar(((PROP_SIZE[p.type] ?? 62) * p.s) / top);
    g.position.set(p.x, 3, p.y - 14);
    g.rotation.y = ((k * 37) % 7) * 0.3 - 0.9;
    scene.add(g);
  });

  // Stops: billboard on two posts (picture in an ink frame, hard shadow
  // plate), tipped toward the camera, and a lamp with an idea-bulb head
  const tex = new TextureLoader();
  const stops = await Promise.all(
    world.stops.map(async (s) => {
      const map = await tex.loadAsync(s.g.media.card);
      map.colorSpace = SRGBColorSpace;
      const g = new Group();
      g.position.set(s.x, 3, s.y - 30);
      const board = new Group();
      board.rotation.x = 0.28;
      const post = new BoxGeometry(4, 30, 4);
      for (const sx of [-0.3, 0.3]) {
        const m = new Mesh(post, inkToon);
        m.position.set(sx * s.w, 15, 0);
        board.add(m);
      }
      const shadow = new Mesh(new BoxGeometry(s.w + 8, s.h + 8, 2), inkMat);
      shadow.position.set(6, 30 + s.h / 2 + 4 - 6, -4);
      const frame = new Mesh(new BoxGeometry(s.w + 8, s.h + 8, 5), inkToon);
      frame.position.set(0, 30 + s.h / 2 + 4, 0);
      const picMat = new MeshBasicMaterial({ map });
      const pic = new Mesh(new PlaneGeometry(s.w, s.h), picMat);
      pic.position.set(0, 30 + s.h / 2 + 4, 2.6);
      board.add(shadow, frame, pic);
      g.add(board);
      // Lamp: ink post with an idea bulb on top (own materials, so it can light up alone)
      const lamp = new Group();
      lamp.position.set(s.w / 2 + 18, 0, 6);
      const pole = new Mesh(new CylinderGeometry(1.8, 2.4, 64, 10), inkToon);
      pole.position.y = 32;
      const head = bulbModel();
      head.scale.setScalar(22);
      head.position.y = 64 + 9;
      const glass = [];
      let glow = null;
      head.traverse((m) => {
        if (!m.isMesh) return;
        if (m.material.transparent) {
          m.material = m.material.clone();
          glow = m;
        } else if (m.material.isMeshToonMaterial && m.material.color.getHex() === 0xcaff00) {
          m.material = m.material.clone();
          glass.push(m.material);
        }
      });
      lamp.add(pole, head);
      g.add(lamp);
      const ring = new Mesh(new RingGeometry(0.82, 1, 48), new MeshBasicMaterial({ color: 0xcaff00, transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 3, 18);
      ring.scale.setScalar(s.w * 0.62);
      g.add(ring);
      scene.add(g);
      return { s, g, picMat, glass, glow, ring, lamp };
    }),
  );

  // Car: the landing's car, a soft shadow under it
  const car = new Group();
  const model = carModel();
  model.scale.setScalar(52 / 0.9);
  model.position.y = 0.33 * (52 / 0.9);
  const carShadow = new Mesh(new CircleGeometry(0.42, 24), new MeshBasicMaterial({ color: new Color(INK), transparent: true, opacity: 0.14, depthWrite: false }));
  carShadow.rotation.x = -Math.PI / 2;
  carShadow.scale.set(1.25 * 58, 0.8 * 58, 1);
  carShadow.position.y = 5.2;
  car.add(carShadow, model);
  scene.add(car);

  let W = 0;
  let H = 0;
  const v = new Vector3();
  const off = new Color('#bab3a6');
  const on = new Color('#caff00');
  const grey = new Color('#5a5650');
  const white = new Color('#ffffff');
  return {
    el: canvas,
    project(x, y, h) {
      v.set(x, h, y).project(camera);
      return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
    },
    frame({ now, car: c, lit, max, current, light, cam, w, h }) {
      if (w !== W || h !== H) {
        W = w;
        H = h;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
      }
      // Camera: what the shared camera shows, seen at a slant
      // A bit further back than flat: the near edge looks wider in perspective
      const d = (h / cam.scale / (2 * Math.tan(((FOV / 2) * Math.PI) / 180))) * 1.16;
      camera.position.set(cam.cx, Math.sin(PITCH) * d, cam.cy + Math.cos(PITCH) * d);
      camera.lookAt(cam.cx, 0, cam.cy);
      camera.near = d * 0.2;
      camera.far = d * 4;
      camera.updateProjectionMatrix();

      car.position.set(c.x, 0, c.y);
      car.rotation.y = -c.a;

      stops.forEach((p, i) => {
        const k = lit[i];
        p.glass.forEach((m) => m.color.copy(off).lerp(on, k));
        if (p.glow) p.glow.material.opacity = 0.5 * k;
        const pop = light === 'pop' ? 1 + 0.25 * k : 1;
        p.g.scale.setScalar(pop);
        p.ring.material.opacity = light === 'pop' ? k : 0;
        p.ring.rotation.z = now / 1600;
        p.picMat.color.copy(white).lerp(grey, light === 'dim' ? max * (1 - k) : 0);
      });
      const s = stops[current] ?? stops[0];
      const lampAt = s.lamp.getWorldPosition(v.set(0, 0, 0));
      lampLight.position.set(lampAt.x, 80, lampAt.z + 10);
      lampLight.intensity = 400 * max;
      const spotOn = light === 'spot' ? max : 0;
      hemi.intensity = 2.2 * (1 - 0.45 * spotOn);
      sun.intensity = 2.2 * (1 - 0.6 * spotOn);
      spot.position.set(s.s.x, 520, s.s.y + 160);
      spot.target.position.set(s.s.x, 0, s.s.y - 50);
      spot.intensity = 7 * spotOn;
      renderer.render(scene, camera);
    },
    destroy() {
      renderer.dispose();
    },
  };
}
