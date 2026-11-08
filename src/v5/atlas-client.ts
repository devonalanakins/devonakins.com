import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { replayPublicGraphHistory } from "./public-graph-history.mjs";
import { projectV5Atlas } from "./atlas-layout.mjs";
import { publicAtlasVisibleSlice } from "./atlas-explorer-model.mjs";

/**
 * Reconciled from PR #68's progressive public Three.js catalog.
 * R17 reads the SAME reviewed as-of history used by the semantic archive.
 * No network, autoplay, fabricated work, dependency inference, or private data.
 * All scene links are either public-catalog spokes or reviewed milestones.
 */
export function mountV5Atlas() {
  const root = document.querySelector<HTMLElement>("[data-v5-atlas]");
  const host = root?.querySelector<HTMLElement>("[data-v5-atlas-host]");
  const status = root?.querySelector<HTMLElement>("[data-v5-atlas-status]");
  const labels = root?.querySelector<HTMLElement>("[data-v5-atlas-label-layer]");
  if (!root || !host || !status || !labels) return;
  const instant = Date.parse(root.dataset.v5AtlasAt || "");
  const graph = projectV5Atlas(replayPublicGraphHistory(undefined, instant));
  if (!graph.valid ||
      graph.revision !== Number(root.dataset.v5AtlasRevision) ||
      graph.version !== Number(root.dataset.v5AtlasVersion) ||
      graph.nodes.length !== root.querySelectorAll("[data-v5-atlas-node-id]").length) {
    status.textContent = "The selected archive revision cannot be verified. Use the public index below.";
    host.dataset.v5AtlasFallback = "true";
    return;
  }
  const fallback = () => {
    status.textContent = "3D rendering unavailable. The reviewed public index remains accessible.";
    host.dataset.v5AtlasFallback = "true";
  };
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true, antialias: true,
      powerPreference: "low-power", preserveDrawingBuffer: false,
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
  const camera = new THREE.PerspectiveCamera(44, 1, .1, 100);
  camera.position.set(0, 3.2, 13.2);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.minDistance = 6;
  controls.maxDistance = 20;
  controls.minPolarAngle = .28;
  controls.maxPolarAngle = Math.PI - .28;
  controls.target.set(0, 0, 0);
  controls.update();

  scene.add(new THREE.AmbientLight(0xa8dced, 1.15));
  const cyan = new THREE.PointLight(0x70e6f6, 36, 22);
  cyan.position.set(-2, 5, 5);
  scene.add(cyan);
  const violet = new THREE.PointLight(0xa17ed9, 20, 18);
  violet.position.set(5, 1, -3);
  scene.add(violet);
  const nucleus = new THREE.Mesh(
    new THREE.IcosahedronGeometry(.60, 2),
    new THREE.MeshStandardMaterial({
      color: 0x12596b, emissive: 0x339bae, emissiveIntensity: .52,
      roughness: .3, metalness: .15, flatShading: true,
    }),
  );
  scene.add(nucleus);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(.91, .01, 4, 84),
    new THREE.MeshBasicMaterial({
      color: 0x6ce8e1, transparent: true, opacity: .55,
    }),
  );
  ring.rotation.x = .68;
  scene.add(ring);

  const rootColors: Record<string, number> = {
    "project:devonstation": 0x70baff,
    "project:mizvo": 0x46e4fb,
    "section:knowledge-overview": 0xa9a4fa,
    "project:anevum": 0xffb979,
    "project:rhen-language": 0xb995ff,
    "project:merit": 0x78e8d3,
    "project:vesper": 0xe8bc85,
    "project:squelch": 0xfa83ed,
  };
  const colors: Record<string, number> = {
    feature: 0x6ce8e1, component: 0x8db7e5,
    integration: 0xd0a9f2, publication: 0xf3c286,
  };
  const positions = new Map(graph.nodes.map(node => [
    node.id, new THREE.Vector3(...(node.position as [number, number, number])),
  ]));
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const meshes: THREE.Mesh[] = [];
  const rootSpokes: { id: string; line: THREE.Line }[] = [];
  const reviewedLines: { index: number; line: THREE.Line }[] = [];
  const annotated: { id: string; point: THREE.Vector3; label: HTMLElement }[] = [];
  let visibleNodeIds = new Set(graph.nodes.map(node => node.id));
  for (const node of graph.nodes) {
    const color = rootColors[node.id] ?? colors[node.type] ?? 0x9bc7d8;
    const material = new THREE.MeshStandardMaterial({
      color, emissive: color,
      emissiveIntensity: node.state === "retired" ? .06 : .20,
      transparent: node.state === "retired",
      opacity: node.state === "retired" ? .48 : 1,
      metalness: .32, roughness: .37,
    });
    materials.set(node.id, material);
    const shape = node.type === "section" || node.type === "component"
      ? new THREE.BoxGeometry(.37, .37, .37)
      : node.id === "project:anevum" || node.id === "project:rhen-language"
        ? new THREE.DodecahedronGeometry(.29)
        : node.type === "integration"
          ? new THREE.TorusKnotGeometry(.19, .06, 48, 5)
          : new THREE.OctahedronGeometry(node.parent ? .20 : .29);
    const mesh = new THREE.Mesh(shape, material);
    mesh.position.copy(positions.get(node.id)!);
    mesh.userData.nodeId = node.id;
    scene.add(mesh);
    meshes.push(mesh);
    if (!node.parent) {
      // A faint spoke means membership in the approved public catalog,
      // never dependency, uptime, a deployment or evidence of current work.
      const spoke = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), mesh.position]),
        new THREE.LineBasicMaterial({
          color, transparent: true, opacity: .17, depthWrite: false,
        }),
      );
      scene.add(spoke);
      rootSpokes.push({ id: node.id, line: spoke });
    }
    if (!node.parent || node.state === "published") {
      const tag = document.createElement("span");
      tag.className = "v5-atlas-node-label";
      tag.textContent = node.label;
      labels.append(tag);
      annotated.push({ id: node.id, point: mesh.position, label: tag });
    }
  }
  // Nondecorative lines exist ONLY if the reviewed history explicitly
  // published a parent-child membership or a typed relationship.
  for (const [index, edge] of graph.links.entries()) {
    const start = positions.get(edge.from), end = positions.get(edge.to);
    if (!start || !end) continue;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([start, end]),
      new THREE.LineBasicMaterial({
        color: edge.type === "published-membership" ? 0x79bde0 : 0x6df0ce,
        transparent: true, opacity: .8, depthWrite: false,
      }),
    );
    scene.add(line);
    reviewedLines.push({ index, line });
  }
  let disposed = false;
  const render = () => {
    if (disposed || document.hidden || !root.isConnected) return;
    renderer.render(scene, camera);
    const bounds = host.getBoundingClientRect();
    for (const { id, point, label } of annotated) {
      const p = point.clone().project(camera);
      const visible = visibleNodeIds.has(id) && p.z >= -1 && p.z <= 1 &&
        p.x >= -1 && p.x <= 1 && p.y >= -1 && p.y <= 1;
      label.hidden = !visible;
      if (visible) {
        label.style.left = ((p.x + 1) * 50) + "%";
        label.style.top = ((1 - p.y) * 50) + "%";
      }
    }
  };
  const resize = () => {
    if (disposed) return;
    const width = host.clientWidth, height = host.clientHeight;
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  // Read actual controls instead of trusting a synthetic event payload.
  // A search only changes visibility, never graph membership or evidence.
  const applyVisibility = () => {
    const search = root.querySelector<HTMLInputElement>("[data-v5-atlas-search]")?.value ?? "";
    const checkboxes = Array.from(root.querySelectorAll<HTMLInputElement>("[data-v5-atlas-layer]"));
    const enabled = Object.fromEntries(checkboxes.map(item => [
      item.dataset.v5AtlasLayer, item.checked,
    ]));
    const slice = publicAtlasVisibleSlice(graph, { search, ...enabled });
    visibleNodeIds = new Set(slice.nodeIds);
    const visibleLinks = new Set(slice.linkIndexes);
    for (const mesh of meshes) mesh.visible = visibleNodeIds.has(mesh.userData.nodeId);
    for (const spoke of rootSpokes) spoke.line.visible = visibleNodeIds.has(spoke.id);
    for (const entry of reviewedLines) entry.line.visible = visibleLinks.has(entry.index);
    render();
  };
  root.addEventListener("v5-atlas-filter", applyVisibility);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  controls.addEventListener("change", render);
  resize();
  applyVisibility();

  const select = (id: string, reveal = false) => {
    const node = graph.nodes.find(item => item.id === id);
    if (!node || disposed || !visibleNodeIds.has(id)) return;
    for (const [key, material] of materials) {
      material.emissiveIntensity = key === id ? .83 : .14;
    }
    for (const mesh of meshes) mesh.scale.setScalar(mesh.userData.nodeId === id ? 1.30 : 1);
    status.textContent = node.label + " selected. " +
      (node.parent ? "Public reviewed structure." : "Approved public directory identity.") +
      " No active reporter or unverified dependency is implied.";
    if (reveal) {
      const detail = Array.from(root.querySelectorAll<HTMLDetailsElement>(
        "[data-v5-atlas-node-id]",
      )).find(item => item.dataset.v5AtlasNodeId === id);
      if (detail) {
        detail.open = true;
        detail.querySelector("summary")?.focus();
      }
    }
    root.dispatchEvent(new CustomEvent("v5-atlas-selected", { detail: { id } }));
    render();
  };
  // Selecting on focusin changed the status text while a pointer was still
  // pressing the summary. The resulting layout shift could cancel the native
  // click before <details> opened. Only select AFTER the browser toggles it;
  // keyboard Enter/Space, pointer, touch and no-JS remain native.
  const onIndex = (event: Event) => {
    const from = event.target;
    if (!(from instanceof Element)) return;
    const detail = from.closest<HTMLDetailsElement>("[data-v5-atlas-node-id]");
    const id = detail?.dataset.v5AtlasNodeId;
    if (id && detail?.open) select(id);
  };
  root.addEventListener("toggle", onIndex, true);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let start: { x: number; y: number } | null = null;
  const down = (event: PointerEvent) => {
    if (event.isPrimary) start = { x: event.clientX, y: event.clientY };
  };
  const up = (event: PointerEvent) => {
    const before = start;
    start = null;
    if (!before || Math.hypot(event.clientX - before.x, event.clientY - before.y) > 5) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.x = (2 * (event.clientX - bounds.left)) / bounds.width - 1;
    pointer.y = 1 - (2 * (event.clientY - bounds.top)) / bounds.height;
    raycaster.setFromCamera(pointer, camera);
    const picked = raycaster.intersectObjects(meshes, false)[0]?.object;
    const id = picked?.userData?.nodeId;
    if (typeof id === "string") select(id, true);
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointerup", up);
  const visible = () => { if (!document.hidden) resize(); };
  const contextLost = (event: Event) => {
    event.preventDefault();
    dispose();
    fallback();
  };
  const pagehide = (event: PageTransitionEvent) => {
    if (!event.persisted) dispose();
  };
  const pageshow = (event: PageTransitionEvent) => {
    if (event.persisted) resize();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    controls.removeEventListener("change", render);
    controls.dispose();
    root.removeEventListener("toggle", onIndex, true);
    root.removeEventListener("v5-atlas-filter", applyVisibility);
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("webglcontextlost", contextLost);
    document.removeEventListener("visibilitychange", visible);
    window.removeEventListener("pagehide", pagehide);
    window.removeEventListener("pageshow", pageshow);
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const all = Array.isArray(object.material) ? object.material : [object.material];
        all.forEach(material => material.dispose());
      }
    });
    renderer.dispose();
    canvas.remove();
    labels.replaceChildren();
    delete root.dataset.v5AtlasReady;
  };
  document.addEventListener("visibilitychange", visible);
  canvas.addEventListener("webglcontextlost", contextLost);
  window.addEventListener("pagehide", pagehide);
  window.addEventListener("pageshow", pageshow);
  root.dataset.v5AtlasReady = "true";
  status.textContent =
    "3D reviewed catalog ready. Drag to orbit, pinch or scroll to zoom, or use the accessible index. " +
    graph.revision + " approved structural change(s) in this dated view; no live source is loaded.";
  render();
  return dispose;
}
