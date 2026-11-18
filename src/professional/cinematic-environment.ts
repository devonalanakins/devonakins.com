/**
 * Decorative, real-time 3D environment for the cinematic portfolio hero.
 * The image underneath is a deliberate no-WebGL / reduced-capability fallback.
 * This is an original architectural sculpture, not measured neural data.
 * No telemetry, audio, network requests, or remote dependencies.
 */
import * as THREE from "three";

const hero = document.querySelector<HTMLElement>(".lab-portfolio-hero");
const canvas = hero?.querySelector<HTMLCanvasElement>("[data-lab-scene-canvas]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

if (hero && canvas) {
  try {
    mountEnvironment(hero, canvas);
  } catch {
    // Preserve the original artwork and complete HTML experience if GPU
    // initialization or a browser-specific renderer feature is unavailable.
    canvas.hidden = true;
  }
}

function mountEnvironment(host: HTMLElement, surface: HTMLCanvasElement): void {
  const renderer = new THREE.WebGLRenderer({
    canvas: surface,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 70);
  camera.position.set(0, 0, 12.5);
  scene.add(new THREE.AmbientLight(0x86bdb8, 1.15));
  const key = new THREE.PointLight(0x8cebe3, 32, 14);
  key.position.set(3, 4, 5);
  scene.add(key);
  const copperLight = new THREE.PointLight(0xe9a577, 22, 13);
  copperLight.position.set(-1, -2, 4);
  scene.add(copperLight);

  const chamber = new THREE.Group();
  scene.add(chamber);
  const sculpture = new THREE.Group();
  chamber.add(sculpture);
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  function material<T extends THREE.Material>(value: T): T {
    materials.push(value);
    return value;
  }
  function geometry<T extends THREE.BufferGeometry>(value: T): T {
    geometries.push(value);
    return value;
  }
  const glass = material(new THREE.MeshPhysicalMaterial({
    color: 0x82c9c5,
    metalness: 0.25,
    roughness: 0.16,
    transparent: true,
    opacity: 0.065,
    side: THREE.DoubleSide,
    depthWrite: false,
  }));
  const pale = material(new THREE.MeshBasicMaterial({
    color: 0xa8f3e3,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const amber = material(new THREE.MeshBasicMaterial({
    color: 0xedb083,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  const faint = material(new THREE.MeshBasicMaterial({
    color: 0x7dada7,
    transparent: true,
    opacity: 0.19,
    depthWrite: false,
  }));

  const vessel = new THREE.Mesh(
    geometry(new THREE.CylinderGeometry(1.94, 1.94, 4.3, 72, 1, true)),
    glass,
  );
  sculpture.add(vessel);
  const caps: THREE.Object3D[] = [];
  for (const y of [-2.15, 2.15]) {
    const rim = new THREE.Mesh(geometry(new THREE.TorusGeometry(1.94, 0.024, 8, 144)), pale);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    sculpture.add(rim);
    caps.push(rim);
  }
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    const strut = new THREE.Mesh(
      geometry(new THREE.CylinderGeometry(0.009, 0.009, 4.3, 5)),
      faint,
    );
    strut.position.set(Math.cos(angle) * 1.94, 0, Math.sin(angle) * 1.94);
    sculpture.add(strut);
  }
  const axial = new THREE.Mesh(
    geometry(new THREE.CylinderGeometry(0.012, 0.012, 4.55, 6)),
    faint,
  );
  sculpture.add(axial);

  // A deterministic three-dimensional fiber network, not an illustrated plane.
  let seed = 20261117;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const nodePositions: number[] = [];
  const fibers = new THREE.Group();
  sculpture.add(fibers);
  for (let i = 0; i < 35; i++) {
    const theta = random() * Math.PI * 2;
    const pitch = random() * Math.PI;
    const radius = 0.75 + random() * 1.04;
    const outer = new THREE.Vector3(
      Math.cos(theta) * Math.sin(pitch) * radius,
      Math.cos(pitch) * radius * 0.91,
      Math.sin(theta) * Math.sin(pitch) * radius,
    );
    const origin = new THREE.Vector3(
      (random() - 0.5) * 0.48,
      (random() - 0.5) * 0.65,
      (random() - 0.5) * 0.48,
    );
    const elbow = origin.clone().lerp(outer, 0.56);
    elbow.x += (random() - 0.5) * 0.55;
    elbow.z += (random() - 0.5) * 0.55;
    const curve = new THREE.CatmullRomCurve3([origin, elbow, outer]);
    const mesh = new THREE.Mesh(
      geometry(new THREE.TubeGeometry(curve, 18, 0.009 + random() * 0.013, 5, false)),
      i % 7 === 0 ? amber : pale,
    );
    fibers.add(mesh);
    nodePositions.push(outer.x, outer.y, outer.z);
  }
  const nodes = new THREE.InstancedMesh(
    geometry(new THREE.IcosahedronGeometry(0.045, 1)),
    pale,
    nodePositions.length / 3,
  );
  const tmp = new THREE.Object3D();
  for (let i = 0; i < nodePositions.length; i += 3) {
    tmp.position.set(nodePositions[i], nodePositions[i + 1], nodePositions[i + 2]);
    tmp.updateMatrix();
    nodes.setMatrixAt(i / 3, tmp.matrix);
  }
  nodes.instanceMatrix.needsUpdate = true;
  sculpture.add(nodes);

  const orbits: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const orbit = new THREE.Mesh(
      geometry(new THREE.TorusGeometry(1.5 + i * 0.2, 0.012, 5, 180)),
      i === 1 ? amber : pale,
    );
    orbit.rotation.set(0.42 + i * 0.29, 0.25 + i * 0.72, 0.38 + i * 0.3);
    sculpture.add(orbit);
    orbits.push(orbit);
  }

  const stars = geometry(new THREE.BufferGeometry());
  const positions = new Float32Array(330 * 3);
  const colors = new Float32Array(330 * 3);
  const teal = new THREE.Color(0x8ce3d7);
  const copper = new THREE.Color(0xedba8a);
  for (let i = 0; i < 330; i++) {
    positions[i * 3] = (random() - 0.5) * 14;
    positions[i * 3 + 1] = (random() - 0.5) * 8;
    positions[i * 3 + 2] = (random() - 0.5) * 6 - 1;
    const c = random() > 0.85 ? copper : teal;
    const brightness = 0.3 + random() * 0.7;
    colors[i * 3] = c.r * brightness;
    colors[i * 3 + 1] = c.g * brightness;
    colors[i * 3 + 2] = c.b * brightness;
  }
  stars.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  stars.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const dust = new THREE.Points(
    stars,
    material(new THREE.PointsMaterial({
      size: 0.037,
      transparent: true,
      opacity: 0.47,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })),
  );
  scene.add(dust);

  let mobile = false;
  let visible = true;
  let lost = false;
  let disposed = false;
  let raf = 0;
  let elapsed = 0;
  let last = 0;
  const pointer = new THREE.Vector2();
  const pointerEase = new THREE.Vector2();
  const view = host.closest<HTMLElement>("[data-one-view]");
  const canvasFallback = (): void => {
    surface.hidden = true;
    host.classList.remove("lab-cinematic-ready");
  };
  function resize(): void {
    if (disposed || lost) return;
    const rect = surface.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    mobile = rect.width <= 760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.5));
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    chamber.position.set(mobile ? 0.68 : 3.4, mobile ? 0.65 : 0.15, -1.3);
    chamber.scale.setScalar(mobile ? 0.62 : 1.08);
    render();
  }
  function render(): void {
    if (!lost && !disposed) renderer.render(scene, camera);
  }
  function shouldRun(): boolean {
    return !lost && !disposed && visible && !document.hidden && !view?.hidden &&
      !reducedMotion.matches && !document.body.classList.contains("lab-motion-paused");
  }
  function tick(time: number): void {
    raf = 0;
    if (!shouldRun()) return;
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
    last = time;
    elapsed += dt;
    pointerEase.lerp(pointer, 0.035);
    sculpture.rotation.y = Math.sin(elapsed * 0.13) * 0.17 + pointerEase.x * 0.22;
    sculpture.rotation.x = Math.sin(elapsed * 0.09) * 0.07 - pointerEase.y * 0.12;
    fibers.rotation.y = elapsed * 0.052;
    dust.rotation.y = elapsed * 0.0017;
    orbits.forEach((orbit, i) => {
      orbit.rotation.z += dt * (i % 2 ? -0.07 : 0.09);
    });
    const breathing = 1 + Math.sin(elapsed * 0.72) * 0.025;
    fibers.scale.setScalar(breathing);
    camera.position.x += (pointerEase.x * 0.16 - camera.position.x) * 0.03;
    render();
    // Limit phone work; the static fallback remains visible between frames.
    raf = window.requestAnimationFrame(tick);
  }
  function sync(): void {
    if (shouldRun()) {
      if (!raf) {
        last = 0;
        raf = window.requestAnimationFrame(tick);
      }
    } else {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      if (visible && !document.hidden && !lost) render();
    }
  }
  const onPointer = (event: PointerEvent): void => {
    if (!finePointer.matches) return;
    const rect = host.getBoundingClientRect();
    pointer.set(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      (event.clientY - rect.top) / rect.height * 2 - 1,
    );
  };
  const resetPointer = (): void => pointer.set(0, 0);
  host.addEventListener("pointermove", onPointer, { passive: true });
  host.addEventListener("pointerleave", resetPointer);
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    sync();
  }, { threshold: 0.01 });
  intersection.observe(host);
  const panelObserver = new MutationObserver(sync);
  if (view) panelObserver.observe(view, { attributes: true, attributeFilter: ["hidden"] });
  const bodyObserver = new MutationObserver(sync);
  bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  document.addEventListener("visibilitychange", sync);
  reducedMotion.addEventListener("change", sync);
  window.addEventListener("pageshow", sync);
  surface.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    lost = true;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    canvasFallback();
  });
  surface.addEventListener("webglcontextrestored", () => {
    lost = false;
    surface.hidden = false;
    resize();
    host.classList.add("lab-cinematic-ready");
    sync();
  });
  window.addEventListener("pagehide", () => {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  });
  resize();
  host.classList.add("lab-cinematic-ready");
  sync();
  // Keep assets owned by this scene, with no shared global renderer or timer.
  void material;
  void geometry;
  void geometries;
  void materials;
}
