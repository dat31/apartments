import * as THREE from "three";
import {
  clampFov,
  clampPitch,
  DEFAULT_FOV,
  dragSensitivity,
  wrapYaw,
  yawPitchToVector,
  type Camera,
} from "@/lib/virtual-tour/math";
import type { Scene } from "@/schemas/virtual-tour";

/* ============================================================
   The panorama engine: everything three.js, with no React in it.

   Kept in its own module so the component above stays a thin shell —
   mount, hand it scenes, tear it down — and so the WebGL lifecycle
   (contexts, textures, the animation frame) is managed in one place
   rather than spread across effects.

   Orientation: SphereGeometry's u axis runs the opposite way round from
   lib/virtual-tour/math's yaw, so the sphere carries one fixed
   quarter-turn (SPHERE_YAW) to line the two up. With it, the direction
   yaw = 2π(u − 0.5) looks exactly at texture coordinate u — which is what
   makes a hotspot authored at u 0.36 land on the doorway at u 0.36.
   e2e/virtual-tour.spec.ts pins this: it clicks a door marker and expects
   to arrive in that room.
   ============================================================ */

const SPHERE_RADIUS = 500;
const SPHERE_YAW = Math.PI / 2;

/** Decoded full-resolution panoramas kept in GPU memory. Six 4K rooms would
    sit at roughly 380 MB, which mobile Safari answers by killing the tab. */
const FULL_TEXTURE_BUDGET = 3;

const FADE_MS = 450;
/** How far the field of view dips while walking through a door, so the
    transition reads as movement rather than a dissolve. */
const DOLLY_FOV = 12;

const INERTIA_DECAY = 0.92;
const INERTIA_CUTOFF = 1e-4;

export type EngineOptions = {
  /** Called every rendered frame so the DOM hotspot overlay can reposition
      itself. Deliberately not React state: this runs at 60 Hz. */
  onFrame: (camera: Camera, size: { width: number; height: number }) => void;
  /** Camera motion, crossfades and inertia are all suppressed when the
      visitor asked for reduced motion. */
  reducedMotion: boolean;
};

type Layer = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
};

export type Engine = ReturnType<typeof createEngine>;

/** Build the renderer and take over `host`. Throws if WebGL is unavailable —
    the caller catches and shows the static fallback. */
export function createEngine(host: HTMLElement, options: EngineOptions) {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.className = "block h-full w-full touch-none select-none";
  host.appendChild(renderer.domElement);

  const world = new THREE.Scene();
  const camera3d = new THREE.PerspectiveCamera(DEFAULT_FOV, 1, 0.1, 1000);
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 60, 40);
  // Invert the sphere on x so its faces point inward and the panorama is seen
  // from the middle of the room. Inverting the *geometry* is what three's own
  // equirectangular example does; a negative scale on the mesh flips the
  // winding order instead and back-face culling then hides every face.
  geometry.scale(-1, 1, 1);

  // Two layers so a room change can crossfade: `back` holds the room being
  // left, `front` the one arriving.
  const makeLayer = (): Layer => {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = SPHERE_YAW;
    world.add(mesh);
    return { mesh, material };
  };
  let back = makeLayer();
  let front = makeLayer();
  back.material.opacity = 0;
  front.material.opacity = 1;
  back.mesh.renderOrder = 0;
  front.mesh.renderOrder = 1;

  const camera: Camera = { yaw: 0, pitch: 0, fov: DEFAULT_FOV };
  let fovTarget = DEFAULT_FOV;

  /* ---- textures ------------------------------------------------------ */

  const loader = new THREE.TextureLoader();
  const loaded = new Map<string, THREE.Texture>();
  const pending = new Map<string, Promise<THREE.Texture>>();
  /** Full-res urls, least-recently-used first. Previews are not tracked:
      at 512×256 they cost ~0.5 MB each and are what the fallback paints. */
  const fullOrder: string[] = [];
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  function evictFullTextures(keep: Set<string>) {
    while (fullOrder.length > FULL_TEXTURE_BUDGET) {
      const url = fullOrder.find((candidate) => !keep.has(candidate));
      if (!url) return;
      fullOrder.splice(fullOrder.indexOf(url), 1);
      loaded.get(url)?.dispose();
      loaded.delete(url);
    }
  }

  function getTexture(url: string, full: boolean): Promise<THREE.Texture> {
    const cached = loaded.get(url);
    if (cached) {
      if (full) {
        fullOrder.splice(fullOrder.indexOf(url), 1);
        fullOrder.push(url);
      }
      return Promise.resolve(cached);
    }
    const inFlight = pending.get(url);
    if (inFlight) return inFlight;

    const promise = loader.loadAsync(url).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, maxAnisotropy);
      loaded.set(url, texture);
      pending.delete(url);
      if (full) fullOrder.push(url);
      return texture;
    });
    promise.catch(() => pending.delete(url));
    pending.set(url, promise);
    return promise;
  }

  /* ---- scene changes -------------------------------------------------- */

  let currentScene: Scene | null = null;
  let fade: { from: number; started: number } | null = null;

  /** Show a room. Resolves once its full-resolution panorama is on screen;
      rejects if the panorama can't be loaded at all, leaving the previous
      room in place. The 512×256 preview is painted first, so the first frame
      lands in ~100 ms on a slow connection instead of a couple of seconds. */
  async function show(scene: Scene, { animate = true } = {}) {
    const isFirst = currentScene === null;
    currentScene = scene;

    const preview = await getTexture(scene.preview, false).catch(() => null);
    if (currentScene !== scene) return;

    // The panorama itself is the only hard requirement; a missing preview
    // just means the room appears when the full texture lands.
    const swap = (texture: THREE.Texture) => {
      const previous = front;
      front = back;
      back = previous;
      front.material.map = texture;
      front.material.needsUpdate = true;
      front.mesh.renderOrder = 1;
      back.mesh.renderOrder = 0;
      const instant = isFirst || !animate || options.reducedMotion;
      front.material.opacity = instant ? 1 : 0;
      back.material.opacity = 1;
      fade = instant ? null : { from: 0, started: performance.now() };
      if (!instant) {
        // A short dip in field of view reads as stepping forward through the
        // door. Reduced motion gets the cut without the dolly.
        camera.fov = clampFov(fovTarget - DOLLY_FOV);
      }
      camera.yaw = wrapYaw(scene.yaw);
      camera.pitch = clampPitch(scene.pitch);
      velocity.yaw = 0;
      velocity.pitch = 0;
    };

    if (preview) swap(preview);

    const full = await getTexture(scene.panorama, true);
    if (currentScene !== scene) return;
    if (preview) {
      // Same photo, higher resolution: replace the map in place. No fade —
      // a crossfade here would look like a flicker.
      front.material.map = full;
      front.material.needsUpdate = true;
    } else {
      swap(full);
    }
    evictFullTextures(new Set([scene.panorama]));
  }

  /** Decode the panoramas of the rooms one door away, so walking through is
      instant. Sequential on purpose — parallel decodes of 4K JPEGs stall the
      main thread on mid-range phones. */
  async function preload(urls: string[]) {
    for (const url of urls) {
      if (loaded.has(url)) continue;
      await getTexture(url, true).catch(() => null);
      evictFullTextures(new Set(currentScene ? [currentScene.panorama] : []));
    }
  }

  /* ---- controls ------------------------------------------------------- */

  const velocity = { yaw: 0, pitch: 0 };
  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let last = { x: 0, y: 0 };
  let pinchDistance = 0;
  /** Set once the visitor has moved the view themselves, so the "drag to look
      around" hint can retire. */
  let interacted = false;
  let onInteract: (() => void) | null = null;

  const size = () => ({
    width: host.clientWidth || 1,
    height: host.clientHeight || 1,
  });

  function markInteracted() {
    if (interacted) return;
    interacted = true;
    onInteract?.();
  }

  const onPointerDown = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      velocity.yaw = 0;
      velocity.pitch = 0;
      renderer.domElement.setPointerCapture(e.pointerId);
      host.dataset.grabbing = "true";
    } else if (pointers.size === 2) {
      dragging = false;
      pinchDistance = pointerSpread();
    }
  };

  function pointerSpread(): number {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const spread = pointerSpread();
      if (pinchDistance > 0 && spread > 0) {
        // Pinching apart zooms in, i.e. narrows the field of view.
        zoomBy((pinchDistance - spread) * 0.15);
        markInteracted();
      }
      pinchDistance = spread;
      return;
    }

    if (!dragging) return;
    const { height } = size();
    const speed = dragSensitivity(camera.fov, height);
    // Drag moves the image with the pointer: pulling left turns right.
    const dYaw = -(e.clientX - last.x) * speed;
    const dPitch = (e.clientY - last.y) * speed;
    last = { x: e.clientX, y: e.clientY };
    camera.yaw = wrapYaw(camera.yaw + dYaw);
    camera.pitch = clampPitch(camera.pitch + dPitch);
    velocity.yaw = options.reducedMotion ? 0 : dYaw;
    velocity.pitch = options.reducedMotion ? 0 : dPitch;
    markInteracted();
  };

  const endPointer = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDistance = 0;
    if (pointers.size === 0) {
      dragging = false;
      delete host.dataset.grabbing;
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoomBy(e.deltaY * 0.05);
    markInteracted();
  };

  function zoomBy(delta: number) {
    fovTarget = clampFov(fovTarget + delta);
    camera.fov = clampFov(camera.fov + delta);
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", endPointer);
  renderer.domElement.addEventListener("pointercancel", endPointer);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

  /* ---- the frame loop -------------------------------------------------- */

  let frame = 0;
  let running = false;
  const target = new THREE.Vector3();

  function render() {
    const { width, height } = size();
    if (renderer.domElement.width !== Math.floor(width * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
    }

    if (!dragging && (velocity.yaw !== 0 || velocity.pitch !== 0)) {
      camera.yaw = wrapYaw(camera.yaw + velocity.yaw);
      camera.pitch = clampPitch(camera.pitch + velocity.pitch);
      velocity.yaw *= INERTIA_DECAY;
      velocity.pitch *= INERTIA_DECAY;
      if (Math.abs(velocity.yaw) < INERTIA_CUTOFF) velocity.yaw = 0;
      if (Math.abs(velocity.pitch) < INERTIA_CUTOFF) velocity.pitch = 0;
    }

    if (fade) {
      const progress = Math.min(1, (performance.now() - fade.started) / FADE_MS);
      front.material.opacity = progress;
      back.material.opacity = 1 - progress;
      if (progress === 1) {
        fade = null;
        back.material.map = null;
        back.material.needsUpdate = true;
      }
    }

    // Ease the field of view back after a door dolly, and toward whatever
    // zoom the visitor asked for.
    if (Math.abs(camera.fov - fovTarget) > 0.05) {
      camera.fov += (fovTarget - camera.fov) * (options.reducedMotion ? 1 : 0.12);
    } else {
      camera.fov = fovTarget;
    }

    camera3d.fov = camera.fov;
    camera3d.aspect = width / height;
    camera3d.updateProjectionMatrix();
    const direction = yawPitchToVector(camera.yaw, camera.pitch);
    target.set(direction.x, direction.y, direction.z);
    camera3d.lookAt(target);

    renderer.render(world, camera3d);
    options.onFrame({ ...camera }, { width, height });
  }

  function loop() {
    frame = requestAnimationFrame(loop);
    render();
  }

  function start() {
    if (running) return;
    running = true;
    loop();
  }

  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frame);
  }

  /* Pause when the tab is hidden or the canvas scrolls out of view — a
     panorama nobody is looking at should not hold a GPU at 60 Hz. */
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);

  const observer = new IntersectionObserver(
    ([entry]) => (entry.isIntersecting ? start() : stop()),
    { threshold: 0.01 }
  );
  observer.observe(host);

  start();

  return {
    show,
    preload,
    /** Turn to face a direction — used when a hotspot is activated by
        keyboard, where there was no drag to bring it into view. */
    lookAt(yaw: number, pitch: number) {
      camera.yaw = wrapYaw(yaw);
      camera.pitch = clampPitch(pitch);
      velocity.yaw = 0;
      velocity.pitch = 0;
    },
    zoomBy,
    /** Back to how the room opened: the direction the host framed it from,
        at the default field of view. The way out of "I zoomed into a corner
        and now I don't know where I am". */
    resetView(yaw: number, pitch: number) {
      camera.yaw = wrapYaw(yaw);
      camera.pitch = clampPitch(pitch);
      camera.fov = DEFAULT_FOV;
      fovTarget = DEFAULT_FOV;
      velocity.yaw = 0;
      velocity.pitch = 0;
    },
    onFirstInteraction(handler: () => void) {
      onInteract = handler;
      if (interacted) handler();
    },
    /** Full teardown. Leaking a WebGL context per navigation exhausts the
        browser's context budget after about sixteen tours. */
    dispose() {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", endPointer);
      renderer.domElement.removeEventListener("pointercancel", endPointer);
      renderer.domElement.removeEventListener("wheel", onWheel);
      for (const texture of loaded.values()) texture.dispose();
      loaded.clear();
      fullOrder.length = 0;
      geometry.dispose();
      back.material.dispose();
      front.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
