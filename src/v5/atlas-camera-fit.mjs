/**
 * Responsive initial camera framing for the approved public Signal Field.
 * Layout coordinates are authored presentation positions, not activity data.
 * Framing never creates or discovers graph identities.
 */
const MIN_DISTANCE = 13.2;
const MAX_DISTANCE = 60;
const FOV_DEGREES = 44;
const PITCH = 0.24;
const CLUSTER_MARGIN = 0.95;
const math = Math;

export function fitPublicAtlasCamera(nodes, width, height) {
  const fallback = Object.freeze({ distance: MIN_DISTANCE, pitch: PITCH });
  if (!Array.isArray(nodes) || nodes.length < 8 || nodes.length > 96 ||
      !Number.isFinite(width) || !Number.isFinite(height) ||
      width < 100 || height < 100 || width > 8192 || height > 8192)
    return fallback;
  let xExtent = 0, yExtent = 0, zExtent = 0;
  for (const node of nodes) {
    const p = node?.position;
    if (!Array.isArray(p) || p.length !== 3 ||
        p.some(v => !Number.isFinite(v) || Math.abs(v) > 20))
      return fallback;
    xExtent = math.max(xExtent, math.abs(p[0]) + CLUSTER_MARGIN);
    yExtent = math.max(yExtent, math.abs(p[1]) + CLUSTER_MARGIN);
    zExtent = math.max(zExtent, math.abs(p[2]) + CLUSTER_MARGIN);
  }
  const aspect = width / height;
  const halfAngle = math.tan(FOV_DEGREES * math.PI / 360);
  // Conservative near-side allowance includes the pitched camera's vertical
  // component. This prevents offscreen public nodes in narrow desktop panels.
  const nearAllowance = zExtent + PITCH * yExtent;
  const requiredWidth = xExtent / (halfAngle * aspect) + nearAllowance;
  const requiredHeight = (yExtent + PITCH * zExtent) / halfAngle + nearAllowance;
  const distance = math.max(MIN_DISTANCE,
    math.min(MAX_DISTANCE, math.max(requiredWidth, requiredHeight) * 1.08));
  return Object.freeze({ distance: Number(distance.toFixed(3)), pitch: PITCH });
}
