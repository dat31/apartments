/* ============================================================
   Virtual tour math — pure, three.js-free.

   Everything the viewer needs to turn a direction into a pixel, and a
   pixel back into a direction. Kept out of the viewer component (and
   free of any `three` import) so it unit-tests in Node and so the owner
   editor can reuse it later without pulling in a renderer.

   Conventions, fixed once here:
   - A direction is a `yaw`/`pitch` pair in radians. Yaw turns around the
     vertical axis — *rightward on screen* — and pitch looks up (+) and
     down (−).
   - The unit vector for a direction is
       x = −cos(pitch)·sin(yaw), y = sin(pitch), z = cos(pitch)·cos(yaw)
     Yaw 0 points at +z, and the x is negated so that increasing yaw moves
     right on screen: three.js cameras look down their local −z, which puts
     world +x on the *left*. Getting this sign wrong is invisible in a
     screenshot — the panorama and the marker overlay mirror together — and
     only shows up as hotspots landing on the wrong wall.
   - Equirectangular texture coordinates are `u` (0 = left edge, 1 = right)
     and `v` (0 = top, 1 = bottom), so yaw 0 sits at u 0.5 and the horizon
     at v 0.5.
   ============================================================ */

export type Vec3 = { x: number; y: number; z: number };

/** How far the camera (and any hotspot) may look up or down: 85°. At the
    poles an equirectangular projection degenerates and the horizon rolls,
    so both the controls and the authored data stop short of them. */
export const MAX_PITCH = (85 * Math.PI) / 180;

/** Field-of-view bounds for wheel/pinch zoom, in degrees. Narrower than 40°
    magnifies texture blur; wider than 100° looks like a fisheye. */
export const MIN_FOV = 40;
export const MAX_FOV = 100;
export const DEFAULT_FOV = 75;

const TAU = Math.PI * 2;

export const clamp = (n: number, min: number, max: number): number =>
  n < min ? min : n > max ? max : n;

/** Wrap a yaw into (−π, π] so two directions can be compared. */
export function wrapYaw(yaw: number): number {
  const wrapped = ((yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
  // −π and π are the same direction; normalise on the positive end so the
  // round-trip through vectorToYawPitch is stable.
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

/** Keep a pitch inside the range the viewer can actually look at. */
export const clampPitch = (pitch: number): number =>
  clamp(pitch, -MAX_PITCH, MAX_PITCH);

export const clampFov = (fov: number): number => clamp(fov, MIN_FOV, MAX_FOV);

/** The signed, shortest turn from one yaw to another — the direction the
    camera should ease toward, never the long way round. */
export const shortestYawDelta = (from: number, to: number): number =>
  wrapYaw(to - from);

export function yawPitchToVector(yaw: number, pitch: number): Vec3 {
  const cosPitch = Math.cos(pitch);
  return {
    x: -cosPitch * Math.sin(yaw),
    y: Math.sin(pitch),
    z: cosPitch * Math.cos(yaw),
  };
}

export function vectorToYawPitch(v: Vec3): { yaw: number; pitch: number } {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return {
    yaw: wrapYaw(Math.atan2(-v.x / len, v.z / len)),
    pitch: Math.asin(clamp(v.y / len, -1, 1)),
  };
}

/** Texture coordinate → direction. This is how hotspots are authored: pick
    the spot on the flat panorama, get the direction to look at it. */
export const uvToYawPitch = (u: number, v: number) => ({
  yaw: wrapYaw((u - 0.5) * TAU),
  pitch: (0.5 - v) * Math.PI,
});

/** Direction → texture coordinate. The inverse of uvToYawPitch, used by the
    room rail to mark where in the flat preview a hotspot sits. */
export const yawPitchToUv = (yaw: number, pitch: number) => ({
  u: wrapYaw(yaw) / TAU + 0.5,
  v: 0.5 - pitch / Math.PI,
});

export type Camera = {
  yaw: number;
  pitch: number;
  /** Vertical field of view, degrees. */
  fov: number;
};

export type Projection = { x: number; y: number; visible: boolean };

/* How far outside the viewport a marker may sit and still be rendered.
   A little slack keeps a marker whose label overhangs the edge from
   popping in and out as the user drags. */
const VISIBLE_MARGIN = 1.15;

/** Project a direction onto the canvas, in CSS pixels from its top-left.

    `visible` is false when the direction is behind the camera or well off
    screen — the overlay skips those markers entirely rather than parking
    them at the edge (a marker at x = −4000 still costs a layout). */
export function projectToScreen(
  dir: { yaw: number; pitch: number },
  camera: Camera,
  size: { width: number; height: number }
): Projection {
  const forward = yawPitchToVector(camera.yaw, camera.pitch);
  const point = yawPitchToVector(dir.yaw, dir.pitch);

  // Camera basis, matching what three.js builds for a camera looking along
  // `forward` with world up: right = up × (−forward), flattened to the
  // horizontal plane so the horizon never rolls. Pitch is clamped away from
  // the poles, so the basis never collapses.
  const right = normalize({ x: -forward.z, y: 0, z: forward.x });
  const up = cross(right, forward);

  const depth = dot(point, forward);
  const horizontal = dot(point, right);
  const vertical = dot(point, up);

  if (depth <= 1e-6) return { x: 0, y: 0, visible: false };

  const aspect = size.height === 0 ? 1 : size.width / size.height;
  const tanHalf = Math.tan((clampFov(camera.fov) * Math.PI) / 360);
  const ndcX = horizontal / depth / (tanHalf * aspect);
  const ndcY = vertical / depth / tanHalf;

  return {
    x: ((ndcX + 1) / 2) * size.width,
    y: ((1 - ndcY) / 2) * size.height,
    visible: Math.abs(ndcX) <= VISIBLE_MARGIN && Math.abs(ndcY) <= VISIBLE_MARGIN,
  };
}

/** Screen point → direction. The reverse of projectToScreen: what the user
    clicked. Phase 3's hotspot placement is the caller; the viewer uses it to
    keep a drag anchored under the pointer. */
export function screenToYawPitch(
  point: { x: number; y: number },
  camera: Camera,
  size: { width: number; height: number }
): { yaw: number; pitch: number } {
  const aspect = size.height === 0 ? 1 : size.width / size.height;
  const tanHalf = Math.tan((clampFov(camera.fov) * Math.PI) / 360);
  const ndcX = size.width === 0 ? 0 : (point.x / size.width) * 2 - 1;
  const ndcY = size.height === 0 ? 0 : 1 - (point.y / size.height) * 2;

  const forward = yawPitchToVector(camera.yaw, camera.pitch);
  const right = normalize({ x: -forward.z, y: 0, z: forward.x });
  const up = cross(right, forward);

  const scaleX = ndcX * tanHalf * aspect;
  const scaleY = ndcY * tanHalf;
  return vectorToYawPitch({
    x: forward.x + right.x * scaleX + up.x * scaleY,
    y: forward.y + right.y * scaleX + up.y * scaleY,
    z: forward.z + right.z * scaleX + up.z * scaleY,
  });
}

/** Radians of rotation per pixel dragged, at the given field of view. Drag
    tracks the image: at a narrow FOV the same pixel moves less of the world,
    which is what makes zoomed-in aiming feel precise. */
export const dragSensitivity = (fov: number, height: number): number =>
  height === 0 ? 0 : ((clampFov(fov) * Math.PI) / 180) / height;

/* ---- small vector helpers (not exported: the viewer speaks yaw/pitch) ---- */

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len === 0) return { x: 1, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
