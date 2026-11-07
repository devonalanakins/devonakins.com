import {
  AmbientLight, BufferAttribute, BufferGeometry, Color, DoubleSide,
  FogExp2, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial,
  PerspectiveCamera, PlaneGeometry, PointLight, Scene, SphereGeometry,
  WebGLRenderer,
} from "three";

// Deterministic *decorative* 3D terrain for the screenshot's lower Signal
// Field. No event is drawn or inferred from this geometry. Durable graph
// entities/evidence arrive in a separate reviewed integration slice.
const terrainAnchors = [
  [-12.8, 1.9, 0x46e4fb], [-9.5, 2.3, 0xb995ff],
  [-5.8, 2.0, 0x60e7cc], [0.0, 3.45, 0xffb979],
  [4.6, 1.9, 0xffae65], [8.2, 1.95, 0xe8bc85],
  [11.4, 1.75, 0x70baff], [14.1, 2.2, 0xfa83ed],
] as const;
const mountainHeight = (x: number, z: number) => {
  let height = -0.55 +
    0.28 * Math.sin(x * 0.8 + z * 0.3) +
    0.15 * Math.sin(x * 1.8 - z * 1.1);
  for (const [centerX, peak] of terrainAnchors) {
    const dx = x - centerX;
    const radius = 1.2 + 0.25 * Math.cos(centerX);
    const dz = z * 0.9 + Math.sin(centerX * .8) * .6;
    height += peak * Math.exp(-(dx * dx / (radius * radius * 2.9) + dz * dz / 12));
  }
  height += 0.23 * Math.cos(x * .5) * Math.exp(-Math.abs(z) / 7);
  return height;
};
const addLine = (
  group: Group,
  points: Array<[number, number, number]>,
  color: number,
  opacity: number,
) => {
  const positions = new Float32Array(points.flat());
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const line = new Line(geometry, new LineBasicMaterial({
    color, transparent: true, opacity,
    depthWrite: false,
  }));
  group.add(line);
  return line;
};
function createField(scene: Scene) {
  const field = new Group();
  const xSegments = 92;
  const zSegments = 32;
  const halfX = 17;
  const halfZ = 9;
  // Render actual triangulated surfaces with subtly lit layers; the wire
  // lines remain readable in transparent/low-power fallback screenshots.
  const geometry = new PlaneGeometry(halfX * 2, halfZ * 2, xSegments, zSegments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const z = position.getZ(index);
    position.setY(index, mountainHeight(x, z));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  const fill = new Mesh(geometry, new MeshBasicMaterial({
    color: 0x073038, opacity: .32, transparent: true,
    depthWrite: false, side: DoubleSide,
  }));
  field.add(fill);
  for (let z = 0; z <= zSegments; z++) {
    const coord = -halfZ + (2 * halfZ * z) / zSegments;
    const points: Array<[number, number, number]> = [];
    for (let x = 0; x <= xSegments; x++) {
      const xx = -halfX + (2 * halfX * x) / xSegments;
      points.push([xx, mountainHeight(xx, coord) + .025, coord]);
    }
    addLine(field, points, z % 4 === 0 ? 0x9bd9c1 : 0x38bccc, z % 4 === 0 ? .6 : .3);
  }
  for (let x = 0; x <= xSegments; x += 2) {
    const xx = -halfX + (2 * halfX * x) / xSegments;
    const points: Array<[number, number, number]> = [];
    for (let z = 0; z <= zSegments; z++) {
      const zz = -halfZ + (2 * halfZ * z) / zSegments;
      points.push([xx, mountainHeight(xx, zz) + .03, zz]);
    }
    addLine(field, points, x % 8 === 0 ? 0xf7b36f : 0x2c8d9e, x % 8 === 0 ? .54 : .28);
  }
  const dotGeo = new SphereGeometry(.09, 8, 6);
  for (const [x, _, color] of terrainAnchors) {
    const height = mountainHeight(x, 0);
    const marker = new Mesh(dotGeo, new MeshBasicMaterial({ color }));
    marker.position.set(x, height + .11, 0);
    field.add(marker);
    addLine(field, [[x, height + .08, 0], [x, height + 2.35, 0]], color, .69);
    const ring = new Group();
    const samples: Array<[number, number, number]> = [];
    for (let n = 0; n <= 80; n++) {
      const a = n / 80 * Math.PI * 2;
      const rx = x + Math.cos(a) * .6;
      const rz = Math.sin(a) * .45;
      samples.push([rx, mountainHeight(rx, rz) + .08, rz]);
    }
    addLine(ring, samples, color, .78);
    field.add(ring);
  }
  scene.add(field);
  return field;
}
export function mountDecorativeTerrain(element: HTMLElement) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let renderer: WebGLRenderer | null = null;
  let observer: ResizeObserver | null = null;
  let frame: number | null = null;
  try {
    const canvas = document.createElement("canvas");
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
    const scene = new Scene();
    scene.fog = new FogExp2(0x020b10, .027);
    scene.add(new AmbientLight(0x7dd7e8, 1));
    const light = new PointLight(0xf3bb81, 13, 25);
    light.position.set(0, 7, 4);
    scene.add(light);
    const camera = new PerspectiveCamera(39, 1, .1, 90);
    camera.position.set(0, 13, 23);
    camera.lookAt(0, 0, 0);
    createField(scene);
    const resize = () => {
      if (!renderer) return;
      const rect = element.getBoundingClientRect();
      if (rect.width < 80 || rect.height < 80) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    element.prepend(canvas);
    element.dataset.webgl = "ready";
    observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    // Geometry remains still until independently sourced activity exists.
    // This is deliberately not a mock-live waveform or fabricated event pulse.
    const onVisibility = () => {
      if (!document.hidden && frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null;
          resize();
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    const motionListener = () => { if (!document.hidden) resize(); };
    reduceMotion.addEventListener("change", motionListener);
    const onContextLoss = (event: Event) => {
      event.preventDefault();
      delete element.dataset.webgl;
      canvas.hidden = true;
    };
    canvas.addEventListener("webglcontextlost", onContextLoss);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", motionListener);
      observer?.disconnect();
      delete element.dataset.webgl;
      renderer?.dispose();
      canvas.remove();
    };
  } catch {
    observer?.disconnect();
    renderer?.dispose();
    delete element.dataset.webgl;
    element.querySelector(".v5-lock-terrain-canvas")?.remove();
    // Unsupported GPUs retain the existing, informative SVG composition.
    return () => {};
  }
}
