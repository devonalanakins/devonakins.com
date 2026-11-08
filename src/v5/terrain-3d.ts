import {
  AdditiveBlending, AmbientLight, BufferAttribute, BufferGeometry, Color,
  DoubleSide, FogExp2, Group, Line, LineBasicMaterial, Mesh,
  MeshBasicMaterial, MeshPhongMaterial, PerspectiveCamera, PlaneGeometry,
  PointLight, Points, PointsMaterial, Scene, SphereGeometry, TorusGeometry,
  WebGLRenderer,
} from "three";

// This is a deterministic, visual-only rendering of the *approved public*
// project names, NOT a representation of work, dependency edges, health, or
// platform usage. No activity enters this renderer before it is observed,
// consented, scoped and approved by the existing public signal projection.
const terrainAnchors = [
  [-12.8, 1.9, 0x46e4fb], [-9.5, 2.3, 0xb995ff],
  [-5.8, 2.0, 0x60e7cc], [0.0, 3.45, 0xffb979],
  [4.6, 1.9, 0xffae65], [8.2, 1.95, 0xe8bc85],
  [11.4, 1.75, 0x70baff], [14.1, 2.2, 0xfa83ed],
] as const;
type Point3 = [number, number, number];

const mountainHeight = (x: number, z: number) => {
  let height = -0.58 +
    0.29 * Math.sin(x * 0.8 + z * 0.3) +
    0.16 * Math.sin(x * 1.8 - z * 1.1);
  for (const [centerX, peak] of terrainAnchors) {
    const dx = x - centerX;
    const radius = 1.2 + 0.25 * Math.cos(centerX);
    const dz = z * .9 + Math.sin(centerX * .8) * .6;
    height += peak * Math.exp(-(dx * dx / (radius * radius * 2.9) + dz * dz / 12));
  }
  height += .23 * Math.cos(x * .5) * Math.exp(-Math.abs(z) / 7);
  return height;
};

function addLine(
  group: Group, points: Point3[], color: number, opacity: number,
) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(points.flat()), 3));
  const line = new Line(geometry, new LineBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
    blending: AdditiveBlending,
  }));
  group.add(line);
}
function coloredContour(group: Group, points: Point3[], opacity: number) {
  const positions = new Float32Array(points.flat());
  const colors = new Float32Array(points.length * 3);
  const teal = new Color(0x34b9d2);
  const gold = new Color(0xffbc7a);
  for (let i = 0; i < points.length; i++) {
    const x = points[i][0];
    const height = points[i][1];
    const warm = Math.max(0, Math.min(1,
      .45 * Math.exp(-x * x / 62) + .2 * Math.max(0, height),
    ));
    const col = teal.clone().lerp(gold, warm);
    colors.set([col.r, col.g, col.b], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  group.add(new Line(geometry, new LineBasicMaterial({
    vertexColors: true, transparent: true, opacity, depthWrite: false,
    blending: AdditiveBlending,
  })));
}

// Stable, explicitly decorative material positions: no random event traffic,
// simulated contributors, work pulses or inferred inter-project dependencies.
function addStars(field: Group) {
  const coordinates = new Float32Array(270 * 3);
  const colors = new Float32Array(270 * 3);
  for (let n = 0; n < 270; n++) {
    const x = -16.5 + ((n * 149 + 13) % 331) / 10;
    const z = -8.8 + ((n * 83 + 17) % 177) / 10;
    const h = mountainHeight(x, z) + .08 + (n % 5) * .038;
    coordinates.set([x, h, z], n * 3);
    const tint = new Color(n % 7 === 0 ? 0xffd79e : n % 4 === 0 ? 0x8cf3f0 : 0x367f97);
    colors.set([tint.r, tint.g, tint.b], n * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(coordinates, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  field.add(new Points(geometry, new PointsMaterial({
    size: .095, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: .86, depthWrite: false,
    blending: AdditiveBlending,
  })));
}
function addRings(field: Group, x: number, y: number, color: number, central: boolean) {
  const radii = central ? [.48, .84, 1.28, 1.72] : [.34, .67];
  for (let i = 0; i < radii.length; i++) {
    const radius = radii[i];
    const points: Point3[] = [];
    for (let j = 0; j <= 96; j++) {
      const a = (j / 96) * Math.PI * 2;
      const rx = x + Math.cos(a) * radius;
      const rz = Math.sin(a) * radius * .72;
      points.push([rx, mountainHeight(rx, rz) + .11, rz]);
    }
    addLine(field, points, color, central ? .7 - i * .085 : .46 - i * .08);
  }
  // Elevated orbital bands are static architectural identifiers.
  const levels = central ? [.8, 1.65, 2.5] : [1.2];
  for (const [i, level] of levels.entries()) {
    const torus = new Mesh(new TorusGeometry(
      central ? .8 + i * .16 : .44, central ? .022 : .015,
      6, 70,
    ), new MeshBasicMaterial({
      color, transparent: true, opacity: central ? .74 : .37,
      depthWrite: false, blending: AdditiveBlending,
    }));
    torus.rotation.x = Math.PI / 2;
    torus.position.set(x, y + level, 0);
    field.add(torus);
  }
}
function addStructures(field: Group) {
  const markerGeometry = new SphereGeometry(.13, 12, 8);
  const haloGeometry = new SphereGeometry(.36, 12, 8);
  for (const [x, , color] of terrainAnchors) {
    const y = mountainHeight(x, 0);
    const central = x === 0;
    const dot = new Mesh(markerGeometry, new MeshBasicMaterial({ color }));
    dot.position.set(x, y + .1, 0);
    field.add(dot);
    const glow = new Mesh(haloGeometry, new MeshBasicMaterial({
      color, transparent: true, opacity: .12,
      depthWrite: false, blending: AdditiveBlending,
    }));
    glow.position.set(x, y + .1, 0);
    field.add(glow);
    addLine(field, [[x, y + .12, 0], [x, y + (central ? 4.5 : 2.5), 0]],
      color, central ? .87 : .64);
    addRings(field, x, y, color, central);
    // Small silhouetted static structures establish the city-like depth of
    // the reference without inventing application state or relationships.
    for (let n = 0; n < (central ? 18 : 8); n++) {
      const offsetX = Math.sin(n * 2.73 + x) * (central ? 1.35 : .78);
      const offsetZ = Math.cos(n * 1.9 + x) * (central ? 1.12 : .65);
      const xx = x + offsetX;
      const baseline = mountainHeight(xx, offsetZ);
      const height = .21 + ((n * 7 + 3) % 11) * (central ? .16 : .095);
      addLine(field, [
        [xx, baseline, offsetZ], [xx, baseline + height, offsetZ],
      ], color, central ? .38 : .25);
    }
  }
}
function createField(scene: Scene) {
  const field = new Group();
  const xSegments = 112;
  const zSegments = 40;
  const halfX = 17;
  const halfZ = 9;
  // An actual volumetric mesh with spectral contour wires. No animation is
  // inferred from static decorative geometry, and no external data is fetched.
  const geometry = new PlaneGeometry(halfX * 2, halfZ * 2, xSegments, zSegments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, mountainHeight(x, z));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  field.add(new Mesh(geometry, new MeshPhongMaterial({
    color: 0x07343d, emissive: 0x02171f, specular: 0x32606b,
    shininess: 24, opacity: .67, transparent: true, side: DoubleSide,
    depthWrite: false,
  })));
  for (let z = 0; z <= zSegments; z++) {
    const zz = -halfZ + (2 * halfZ * z) / zSegments;
    const path: Point3[] = [];
    for (let x = 0; x <= xSegments; x++) {
      const xx = -halfX + (2 * halfX * x) / xSegments;
      path.push([xx, mountainHeight(xx, zz) + .035, zz]);
    }
    coloredContour(field, path, z % 4 === 0 ? .77 : .39);
  }
  for (let x = 0; x <= xSegments; x += 2) {
    const xx = -halfX + (2 * halfX * x) / xSegments;
    const path: Point3[] = [];
    for (let z = 0; z <= zSegments; z++) {
      const zz = -halfZ + (2 * halfZ * z) / zSegments;
      path.push([xx, mountainHeight(xx, zz) + .045, zz]);
    }
    coloredContour(field, path, x % 8 === 0 ? .58 : .25);
  }
  // Broad, luminous static contours echo the approved landscape's sweeping
  // ribbons; they are NOT source-event paths.
  for (const [j, baseZ, color] of [
    [0, 1.0, 0x49cdd2], [1, 3.3, 0x6cf5f5], [2, -2.5, 0xf1ae73],
  ] as const) {
    const path: Point3[] = [];
    for (let i = 0; i <= 170; i++) {
      const x = -halfX + (2 * halfX * i) / 170;
      const z = baseZ + .52 * Math.sin(x * .29 + j);
      path.push([x, mountainHeight(x, z) + .12, z]);
    }
    addLine(field, path, color, j === 1 ? .88 : .63);
  }
  addStars(field);
  addStructures(field);
  scene.add(field);
  return field;
}
function releaseGeometry(scene: Scene) {
  scene.traverse((object) => {
    if (object instanceof Mesh || object instanceof Line || object instanceof Points) {
      object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material.dispose();
    }
  });
}
export function mountDecorativeTerrain(element: HTMLElement) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let renderer: WebGLRenderer | null = null;
  let observer: ResizeObserver | null = null;
  let frame: number | null = null;
  let scene: Scene | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let visibilityListener: (() => void) | null = null;
  let motionListener: (() => void) | null = null;
  try {
    canvas = document.createElement("canvas");
    canvas.className = "v5-lock-terrain-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.tabIndex = -1;
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: true })
      || canvas.getContext("webgl", { alpha: true, antialias: true });
    if (!gl) return () => {};
    renderer = new WebGLRenderer({
      canvas, context: gl, alpha: true, antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.setClearColor(new Color(0x02090c), 0);
    scene = new Scene();
    scene.fog = new FogExp2(0x020b10, .017);
    scene.add(new AmbientLight(0x88dbe8, 1.2));
    const light = new PointLight(0xf6b87a, 15, 35);
    light.position.set(0, 7, 3);
    scene.add(light);
    const camera = new PerspectiveCamera(28, 1, .1, 90);
    camera.position.set(0, 9.8, 17);
    camera.lookAt(0, .5, 0);
    createField(scene);
    const resize = () => {
      if (!renderer || !scene) return;
      const rect = element.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 80) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      // Keep the 34-unit landscape visible at both the exact 1199x1312
      // reference and wider desktop aspect ratios; no simulated animation.
      const desiredWorldWidth = 41;
      const distance = 19.8;
      camera.fov = Math.max(18, Math.min(32,
        2 * Math.atan(desiredWorldWidth / (2 * distance * camera.aspect)) * 180 / Math.PI,
      ));
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    element.prepend(canvas);
    element.dataset.webgl = "ready";
    observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    visibilityListener = () => {
      if (!document.hidden && frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null;
          resize();
        });
      }
    };
    document.addEventListener("visibilitychange", visibilityListener);
    motionListener = () => { if (!document.hidden) resize(); };
    reducedMotion.addEventListener("change", motionListener);
    const lost = (event: Event) => {
      event.preventDefault();
      delete element.dataset.webgl;
      if (canvas) canvas.hidden = true;
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      if (visibilityListener) document.removeEventListener("visibilitychange", visibilityListener);
      if (motionListener) reducedMotion.removeEventListener("change", motionListener);
      observer?.disconnect();
      if (scene) releaseGeometry(scene);
      delete element.dataset.webgl;
      renderer?.dispose();
      canvas?.remove();
    };
  } catch {
    observer?.disconnect();
    if (scene) releaseGeometry(scene);
    renderer?.dispose();
    delete element.dataset.webgl;
    canvas?.remove();
    return () => {};
  }
}
