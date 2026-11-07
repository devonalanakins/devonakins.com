import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FIELD_CATALOG } from "../signal-field-model.mjs";

/**
 * Accessible, request-free V5 3D public catalog.
 *
 * Geometric links mean "part of this curated public project index" ONLY.
 * They are not inferred code dependencies, integrations, telemetry or work.
 * A single frame renders on interaction/resize; no permanent GPU loop.
 */
export function mountV5Atlas() {
  const root = document.querySelector<HTMLElement>("[data-v5-atlas]");
  const host = root?.querySelector<HTMLElement>("[data-v5-atlas-host]");
  const status = root?.querySelector<HTMLElement>("[data-v5-atlas-status]");
  if (!root || !host || !status) return;

  const fallback = () => {
    status.textContent =
      "3D rendering unavailable. The complete public project index below remains accessible.";
    host.setAttribute("data-v5-atlas-fallback", "true");
  };

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
  } catch {
    fallback();
    return;
  }

  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.tabIndex = -1;
  host.append(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x06111d, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 4.1, 9.2);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.minDistance = 3.5;
  controls.maxDistance = 14;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = Math.PI - 0.3;
  controls.target.set(0, 0, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0xafddec, 1.5));
  const key = new THREE.PointLight(0x70e6f6, 28, 18);
  key.position.set(1, 5, 4);
  scene.add(key);
  const fill = new THREE.PointLight(0x8267cb, 15, 16);
  fill.position.set(-5, -1, -4);
  scene.add(fill);

  const nucleus = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.6, 2),
    new THREE.MeshStandardMaterial({
      color: 0x125f71,
      emissive: 0x2b9eac,
      emissiveIntensity: 0.55,
      roughness: 0.32,
      metalness: 0.2,
      flatShading: true,
    }),
  );
  scene.add(nucleus);

  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(0.89, 0.008, 3, 96),
    new THREE.MeshBasicMaterial({ color: 0x6cd5df, transparent: true, opacity: 0.62 }),
  );
  orbit.rotation.x = 0.6;
  scene.add(orbit);

  const palette: Record<string, number> = {
    merit: 0x8bc9f9,
    rhen: 0xc59afb,
    mizvo: 0x4ee9de,
    devonstation: 0x6cb3fe,
    squelch: 0xefb67a,
    anevum: 0xebba80,
    brandicade: 0x64dcae,
    vesper: 0xddb778,
    knowledge: 0x9aa7ed,
    "devonakins-com": 0x7ce5ec,
  };
  const meshes: THREE.Mesh[] = [];
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  for (const node of FIELD_CATALOG) {
    const position = new THREE.Vector3(
      node.position[0], node.position[1], node.position[2],
    );
    const color = palette[node.slug] ?? 0x9bc7d8;
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.22,
      metalness: 0.32,
      roughness: 0.36,
    });
    materials.set(node.slug, material);
    // Shape varies by catalog identity only; it does not encode source health.
    const shape = node.slug === "anevum" || node.slug === "rhen"
      ? new THREE.DodecahedronGeometry(0.27)
      : node.slug === "devonstation" || node.slug === "knowledge"
        ? new THREE.BoxGeometry(0.39, 0.39, 0.39)
        : new THREE.OctahedronGeometry(0.29);
    const mesh = new THREE.Mesh(shape, material);
    mesh.position.copy(position);
    mesh.userData.projectSlug = node.slug;
    scene.add(mesh);
    meshes.push(mesh);

    // Membership edge, not an implementation relationship or activity trace.
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), position]),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
      }),
    );
    scene.add(line);
  }

  const render = () => {
    if (!document.hidden && root.isConnected) renderer.render(scene, camera);
  };
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  controls.addEventListener("change", render);
  resize();

  let selected: string | null = null;
  const select = (slug: string, reveal = false) => {
    const node = FIELD_CATALOG.find((entry) => entry.slug === slug);
    if (!node || selected === slug && !reveal) return;
    selected = slug;
    for (const [id, material] of materials) {
      material.emissiveIntensity = id === slug ? 0.8 : 0.16;
    }
    status.textContent =
      node.label + " selected. Catalog identity only; no verified active source or software dependency implied.";
    if (reveal) {
      const detail = Array.from(
        root.querySelectorAll<HTMLDetailsElement>("[data-v5-atlas-node]"),
      ).find((item) => item.dataset.v5AtlasNode === slug);
      if (detail) {
        detail.open = true;
        detail.querySelector("summary")?.focus();
      }
    }
    render();
  };

  const onIndexFocus = (event: Event) => {
    const source = event.target;
    if (!(source instanceof Element)) return;
    const detail = source.closest<HTMLDetailsElement>("[data-v5-atlas-node]");
    if (detail?.dataset.v5AtlasNode) select(detail.dataset.v5AtlasNode);
  };
  root.addEventListener("focusin", onIndexFocus);
  root.addEventListener("toggle", onIndexFocus, true);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let start: { x: number; y: number } | null = null;
  const onDown = (event: PointerEvent) => {
    if (event.isPrimary) start = { x: event.clientX, y: event.clientY };
  };
  const onUp = (event: PointerEvent) => {
    const began = start;
    start = null;
    if (!began || Math.hypot(event.clientX - began.x, event.clientY - began.y) > 5) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.x = (2 * (event.clientX - bounds.left)) / bounds.width - 1;
    pointer.y = 1 - (2 * (event.clientY - bounds.top)) / bounds.height;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0]?.object;
    const slug = hit?.userData?.projectSlug;
    if (typeof slug === "string") select(slug, true);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    controls.removeEventListener("change", render);
    controls.dispose();
    root.removeEventListener("focusin", onIndexFocus);
    root.removeEventListener("toggle", onIndexFocus, true);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    });
    renderer.dispose();
    canvas.remove();
  };
  const onVisibility = () => {
    if (!document.hidden && !disposed) resize();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    dispose();
    fallback();
  };
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);
  window.addEventListener("pagehide", dispose, { once: true });
  status.textContent =
    "3D catalog available. Drag to orbit, scroll or pinch to zoom; inspect projects using the accessible index. No live sources are loaded.";
  return dispose;
}
