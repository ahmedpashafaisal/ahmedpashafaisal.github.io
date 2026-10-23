// Car look test (step S2, dev only): the car options. Each one comes back in
// the landing car's frame (hero3d.js carModel): about 0.9 long along +x (the
// front), roof along +y, about 0.5 wide along z, centred, wheels resting at
// y = -0.31. All drawn the landing's way: toon shading in 3 steps, ink outline.
import { BackSide, Box3, BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshToonMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { gradientMap } from '../src/js/hero3d.js';

const INK = 0x1d1b18;
const INK_DARK = 0xf2ede2; // ink in dark mode
const LIME = 0xcaff00;
const SURFACE = 0xfffdf8;
const LENGTH = 0.9;
const FLOOR = -0.31;
const LINE = 0.016; // outline thickness, in car units (0.9 long)

export const COLOURS = {
  ink: INK,
  red: 0xe8473c,
  blue: 0x3d72e3,
  yellow: 0xffc81e,
  orange: 0xff7a1a,
  lime: LIME,
};

const toonOf = (color) => new MeshToonMaterial({ color: new Color(color), gradientMap });
const outlineMat = new MeshBasicMaterial({ color: INK, side: BackSide });

// One piece with its outline shell (line 0: no outline, for thin decals)
function piece(geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], line = 1.06 } = {}) {
  const g = new Group();
  if (line) {
    const hull = new Mesh(geo, outlineMat);
    hull.scale.setScalar(line);
    g.add(hull);
  }
  g.add(new Mesh(geo, mat));
  g.position.set(...pos);
  g.rotation.set(...rot);
  return g;
}

// The landing car before S3 (two boxes, four cylinders), kept here for the
// comparison now that hero3d.js draws car A. The body followed the theme.
export function today() {
  const body = toonOf(INK);
  const wheel = (x, z) => piece(new CylinderGeometry(0.13, 0.13, 0.1, 20), toonOf(0x5c5750), { pos: [x, -0.2, z], rot: [Math.PI / 2, 0, 0], line: 1 });
  const light = (z) => piece(new BoxGeometry(0.04, 0.08, 0.12), toonOf(LIME), { pos: [0.46, 0, z], line: 1 });
  const model = new Group();
  model.add(
    piece(new BoxGeometry(0.9, 0.28, 0.5), body, { pos: [0, -0.04, 0], line: 1.07 }),
    piece(new BoxGeometry(0.48, 0.24, 0.44), toonOf(SURFACE), { pos: [-0.06, 0.22, 0], line: 1.07 }),
    wheel(0.28, 0.25), wheel(-0.28, 0.25), wheel(0.28, -0.25), wheel(-0.28, -0.25),
    light(0.15), light(-0.15),
  );
  return { model, setBody: (_, dark) => body.color.set(dark ? INK_DARK : INK) };
}

// Toy car in code: rounded body, dark glass, roof and twin stripes on top
// (what you see from above), chunky tyres with cream hubs, bumpers, lime
// headlights, red tail lights. Same size as today's car.
export function codeToy() {
  const body = toonOf(INK);
  const glass = toonOf(0x2b333d);
  const cream = toonOf(SURFACE);
  const tyre = toonOf(0x2a2723);
  const grey = toonOf(0x8a847a);
  const rounded = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
  const wheel = (x, z) => {
    const geo = new CylinderGeometry(0.14, 0.14, 0.12, 24);
    const hub = new CylinderGeometry(0.07, 0.07, 0.125, 16);
    return [piece(geo, tyre, { pos: [x, -0.17, z], rot: [Math.PI / 2, 0, 0] }), piece(hub, cream, { pos: [x, -0.17, z], rot: [Math.PI / 2, 0, 0], line: 0 })];
  };
  const stripes = toonOf(SURFACE);
  const stripe = (len, x, y) => [-1, 1].map((s) => piece(new BoxGeometry(len, 0.012, 0.06), stripes, { pos: [x, y, s * 0.065], line: 0 }));
  const model = new Group();
  model.add(
    piece(rounded(0.92, 0.24, 0.52, 0.09), body, { pos: [0, -0.05, 0] }),
    piece(rounded(0.5, 0.2, 0.44, 0.08), glass, { pos: [-0.06, 0.15, 0] }),
    piece(rounded(0.4, 0.07, 0.42, 0.035), body, { pos: [-0.08, 0.26, 0] }),
    ...stripe(0.3, 0.3, 0.072),
    ...stripe(0.36, -0.08, 0.297),
    ...stripe(0.12, -0.39, 0.072),
    ...wheel(0.29, 0.24), ...wheel(-0.29, 0.24), ...wheel(0.29, -0.24), ...wheel(-0.29, -0.24),
    piece(rounded(0.07, 0.08, 0.5, 0.03), grey, { pos: [0.47, -0.13, 0] }),
    piece(rounded(0.07, 0.08, 0.5, 0.03), grey, { pos: [-0.47, -0.13, 0] }),
    ...[-1, 1].map((s) => piece(new CylinderGeometry(0.05, 0.05, 0.03, 16), toonOf(LIME), { pos: [0.465, -0.02, s * 0.16], rot: [0, 0, Math.PI / 2] })),
    ...[-1, 1].map((s) => piece(new BoxGeometry(0.02, 0.05, 0.1), toonOf(0xff5a4e), { pos: [-0.465, -0.02, s * 0.16], line: 0 })),
  );
  return {
    model,
    // Stripes: cream on dark bodies, ink on light ones (cream ink in dark mode, yellow, lime)
    setBody: (key, dark) => {
      const light = (key === 'ink' && dark) || key === 'yellow' || key === 'lime';
      body.color.set(key === 'ink' && dark ? INK_DARK : COLOURS[key]);
      stripes.color.set(light ? INK : SURFACE);
    },
  };
}

// Outline shell for a loaded mesh: pushed out along smoothed normals, so
// flat-shaded corners do not split the line
function outlineOf(thickness) {
  const m = new MeshBasicMaterial({ color: INK, side: BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${thickness.toFixed(5)};`);
  };
  m.customProgramCacheKey = () => `outline${thickness.toFixed(5)}`;
  return m;
}

const loader = new GLTFLoader();

// A Kenney model, restyled: toon material on its colour map, ink outline,
// turned to face +x and scaled to today's car length. Kenney cars face +z in
// their files (front: -1 if one faces -z); length is measured along z, since
// an open-wheel car can be wider than it is long.
export async function kenney(url, { front = 1 } = {}) {
  const { scene } = await loader.loadAsync(url);
  const box = new Box3().setFromObject(scene);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  const s = LENGTH / size.z;
  const meshes = [];
  scene.traverse((m) => m.isMesh && meshes.push(m));
  const line = outlineOf(LINE / s);
  for (const m of meshes) {
    m.material = new MeshToonMaterial({ map: m.material.map, color: m.material.color, gradientMap });
    const shell = m.geometry.clone();
    Object.keys(shell.attributes).forEach((k) => k !== 'position' && shell.deleteAttribute(k));
    const smooth = mergeVertices(shell);
    smooth.computeVertexNormals();
    m.add(new Mesh(smooth, line));
  }
  // Centre on the floor plan, wheels on the floor, then turn and scale
  scene.position.set(-centre.x, -box.min.y, -centre.z);
  const turn = new Group();
  turn.add(scene);
  turn.rotation.y = (front * Math.PI) / 2;
  turn.scale.setScalar(s);
  turn.position.y = FLOOR;
  const model = new Group();
  model.add(turn);
  return { model, setBody: () => {} };
}
