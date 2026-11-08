import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { replayPublicGraphHistory } from "./public-graph-history.mjs";
import { projectV5Atlas } from "./atlas-layout.mjs";
import { publicAtlasVisibleSlice } from "./atlas-explorer-model.mjs";
import { projectPublicAtlasArchitecture, PUBLIC_ATLAS_ROOT_COLORS } from "./atlas-architecture.mjs";
import { fitPublicAtlasCamera } from "./atlas-camera-fit.mjs";

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
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.minDistance = 6;
  // Wide three-column layouts need more initial distance than the old fixed
  // 13.2-unit camera. Keep manual orbit/zoom available after initial framing.
  controls.maxDistance = 60;
  controls.minPolarAngle = .28;
  controls.maxPolarAngle = Math.PI - .28;
  controls.target.set(0, 0, 0);
  controls.update();
  let cameraAdjustedByUser = false;
  const markCameraAdjusted = () => { cameraAdjustedByUser = true; };
  controls.addEventListener("start", markCameraAdjusted);

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

  // Static presentation geometry. These rings and points are environmental
  // artwork, not network links, live traffic, or historical milestones.
  for (const [radius, tilt, color, opacity] of [
    [1.18, 0.38, 0x45cce6, 0.28],
    [1.42, 1.04, 0xa77bd8, 0.19],
    [1.66, -0.48, 0x61c7b7, 0.13],
  ] as const) {
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(radius, .009, 5, 104),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity, depthWrite: false,
      }),
    );
    orbit.rotation.set(tilt, tilt * .65, tilt * .38);
    scene.add(orbit);
  }
  const dustPositions: number[] = [];
  for (let i = 0; i < 90; i++) {
    const theta = i * 2.39996323;
    const spread = 1.8 + (i % 13) * .30;
    dustPositions.push(
      Math.cos(theta) * spread,
      -2.25 + (i % 11) * .35,
      Math.sin(theta) * spread * .65,
    );
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
  scene.add(new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0x80deed, size: .036, transparent: true, opacity: .44,
      depthWrite: false, sizeAttenuation: true,
    }),
  ));
  const gridVertices: number[] = [];
  for (let i = -8; i <= 8; i++) {
    const n = i * .62;
    gridVertices.push(n, -2.65, -3.6, n, -2.65, 3.6);
    gridVertices.push(-5.05, -2.65, n * .66, 5.05, -2.65, n * .66);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridVertices, 3));
  scene.add(new THREE.LineSegments(
    gridGeometry,
    new THREE.LineBasicMaterial({
      color: 0x4bb5cb, transparent: true, opacity: .085, depthWrite: false,
    }),
  ));

  const rootColors: Record<string, number> = PUBLIC_ATLAS_ROOT_COLORS;
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
  const architecturalGroups = new Map<string, THREE.Group>();
  const architecture = projectPublicAtlasArchitecture(graph);
  if (architecture.valid) {
    for (const cluster of architecture.clusters) {
      // Nine equally decorative geometric facets per approved identity:
      // never DOM nodes, source components, selectable work, or metrics.
      const group = new THREE.Group();
      group.position.set(...(cluster.position as [number, number, number]));
      const block = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({
          color: cluster.color, emissive: cluster.color,
          emissiveIntensity: .29, metalness: .42, roughness: .28,
        }),
        cluster.facets.length,
      );
      const matrix = new THREE.Matrix4();
      const orientation = new THREE.Quaternion();
      cluster.facets.forEach((facet, index) => {
        matrix.compose(
          new THREE.Vector3(...(facet.offset as [number, number, number])),
          orientation,
          new THREE.Vector3(...(facet.scale as [number, number, number])),
        );
        block.setMatrixAt(index, matrix);
      });
      block.instanceMatrix.needsUpdate = true;
      block.computeBoundingSphere();
      group.add(block);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(.70, .76, .035, 48),
        new THREE.MeshStandardMaterial({
          color: 0x0c2636, emissive: cluster.color, emissiveIntensity: .08,
          transparent: true, opacity: .64, metalness: .45, roughness: .29,
        }),
      );
      plinth.position.y = -.36;
      group.add(plinth);

      for (const [radius, thickness, opacity, elevation] of [
        [.74, .014, .50, -.34], [.86, .008, .24, -.31],
      ] as const) {
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(radius, thickness, 5, 64),
          new THREE.MeshBasicMaterial({
            color: cluster.color, transparent: true, opacity, depthWrite: false,
          }),
        );
        halo.rotation.x = Math.PI / 2;
        halo.position.y = elevation;
        group.add(halo);
      }
      scene.add(group);
      architecturalGroups.set(cluster.id, group);
    }
  }
  root.dataset.v5AtlasDecorativeClusters = String(architecturalGroups.size);
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
  let contextUnavailable = false;
  let selectedId: string | null = null;
  const render = () => {
    if (disposed || contextUnavailable || document.hidden || !root.isConnected) return;
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
  // Glow is an optional visual annotation of the already-validated public
  // evidence, never a generated edge, deployment or structural change.
  const syncEvidence = () => {
    if (disposed) return;
    const live = new Map<string, "editor" | "remote">();
    for (const element of root.querySelectorAll<HTMLElement>("[data-v5-atlas-node-id]")) {
      const id = element.dataset.v5AtlasNodeId;
      const kind = element.dataset.v5AtlasLiveKind;
      if (id && (kind === "editor" || kind === "remote") &&
          graph.nodes.some(node => node.id === id && node.parent === null && node.type === "project"))
        live.set(id, kind);
    }
    for (const [id, material] of materials) {
      material.emissiveIntensity = selectedId === id ? .83 :
        live.get(id) === "editor" ? .62 : live.get(id) === "remote" ? .52 : .14;
    }
    for (const { id, label } of annotated) {
      const kind = live.get(id);
      if (kind) label.dataset.v5AtlasLiveKind = kind;
      else delete label.dataset.v5AtlasLiveKind;
    }
    render();
  };
  const resize = () => {
    if (disposed) return;
    const width = host.clientWidth, height = host.clientHeight;
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (!cameraAdjustedByUser) {
      const fit = fitPublicAtlasCamera(graph.nodes, width, height);
      camera.position.set(0, fit.distance * fit.pitch, fit.distance);
      controls.maxDistance = Math.max(20, fit.distance * 1.8);
      controls.update();
    }
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
    for (const [id, group] of architecturalGroups) group.visible = visibleNodeIds.has(id);
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
  root.addEventListener("v5-atlas-evidence", syncEvidence);
  syncEvidence();

  const select = (id: string, reveal = false) => {
    const node = graph.nodes.find(item => item.id === id);
    if (!node || disposed || !visibleNodeIds.has(id)) return;
    selectedId = id;
    syncEvidence();
    for (const mesh of meshes) mesh.scale.setScalar(mesh.userData.nodeId === id ? 1.30 : 1);
    for (const [key, group] of architecturalGroups)
      group.scale.setScalar(key === id ? 1.08 : 1);
    const currentKind = root.querySelectorAll<HTMLElement>("[data-v5-atlas-node-id]");
    const observed = Array.from(currentKind).find(el => el.dataset.v5AtlasNodeId === id)
      ?.dataset.v5AtlasLiveKind;
    status.textContent = node.label + " selected. " +
      (node.parent ? "Public reviewed structure." : "Approved public directory identity.") +
      (observed === "editor" ? " Recent editor evidence is detailed under Observed now." :
        observed === "remote" ? " Recent participating-task evidence is detailed under Observed now." :
          " No current activity is implied.");
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
  const cameraTools = root.querySelector<HTMLElement>("[data-v5-camera-controls]");
  const onCamera = (event: Event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-v5-camera]") : null;
    const action = button?.dataset.v5Camera;
    if(!action || disposed || contextUnavailable) return;
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if(action === "reset") {
      cameraAdjustedByUser = false;
      controls.target.set(0,0,0);
      resize();
      return;
    }
    if(action === "focus") {
      const point = selectedId && visibleNodeIds.has(selectedId) ? positions.get(selectedId) : null;
      if(!point) { status.textContent = "Select a public system from the index before focusing."; return; }
      controls.target.copy(point);
      camera.position.copy(point).add(offset);
    } else {
      if(action === "left") spherical.theta -= .15;
      if(action === "right") spherical.theta += .15;
      if(action === "up") spherical.phi = Math.max(controls.minPolarAngle,spherical.phi-.15);
      if(action === "down") spherical.phi = Math.min(controls.maxPolarAngle,spherical.phi+.15);
      if(action === "in") spherical.radius = Math.max(controls.minDistance,spherical.radius*.85);
      if(action === "out") spherical.radius = Math.min(controls.maxDistance,spherical.radius/ .85);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    }
    cameraAdjustedByUser = true;
    controls.update(); render();
  };
  cameraTools?.addEventListener("click",onCamera);
  if(cameraTools) cameraTools.hidden = false;
  const visible = () => { if (!document.hidden) resize(); };
  const contextLost = (event: Event) => {
    event.preventDefault();
    contextUnavailable = true;
    canvas.hidden = true;
    if(cameraTools) cameraTools.hidden = true;
    delete root.dataset.v5AtlasReady;
    fallback();
  };
  const contextRestored = () => {
    if(disposed) return;
    contextUnavailable = false;
    canvas.hidden = false;
    delete host.dataset.v5AtlasFallback;
    root.dataset.v5AtlasReady = "true";
    if(cameraTools) cameraTools.hidden = false;
    status.textContent = "3D rendering recovered. The public index and selection are preserved.";
    resize();
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
    controls.removeEventListener("start", markCameraAdjusted);
    controls.dispose();
    root.removeEventListener("toggle", onIndex, true);
    root.removeEventListener("v5-atlas-filter", applyVisibility);
    root.removeEventListener("v5-atlas-evidence", syncEvidence);
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("webglcontextrestored", contextRestored);
    cameraTools?.removeEventListener("click",onCamera);
    if(cameraTools) cameraTools.hidden = true;
    document.removeEventListener("visibilitychange", visible);
    window.removeEventListener("pagehide", pagehide);
    window.removeEventListener("pageshow", pageshow);
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line ||
          object instanceof THREE.Points) {
        object.geometry.dispose();
        const all = Array.isArray(object.material) ? object.material : [object.material];
        all.forEach(material => material.dispose());
      }
    });
    renderer.dispose();
    canvas.remove();
    labels.replaceChildren();
    delete root.dataset.v5AtlasReady;
    delete root.dataset.v5AtlasDecorativeClusters;
  };
  document.addEventListener("visibilitychange", visible);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  window.addEventListener("pagehide", pagehide);
  window.addEventListener("pageshow", pageshow);
  root.dataset.v5AtlasReady = "true";
  status.textContent =
    "3D reviewed catalog ready. Drag to orbit, pinch or scroll to zoom, or use the accessible index. " +
    graph.revision + " approved structural change(s) in this dated view; no live source is loaded.";
  render();
  return dispose;
}
