import { describe, expect, it } from "vitest";
import {
  clamp,
  clampFov,
  clampPitch,
  DEFAULT_FOV,
  dragSensitivity,
  MAX_FOV,
  MAX_PITCH,
  MIN_FOV,
  projectToScreen,
  screenToYawPitch,
  shortestYawDelta,
  uvToYawPitch,
  vectorToYawPitch,
  wrapYaw,
  yawPitchToUv,
  yawPitchToVector,
} from "@/lib/virtual-tour/math";

const SIZE = { width: 800, height: 400 };
const CENTRE = { x: 400, y: 200 };

describe("clamp", () => {
  it("passes a value inside the range through", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps on both ends", () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("wrapYaw", () => {
  it("leaves a yaw already inside (−π, π] alone", () => {
    expect(wrapYaw(1)).toBeCloseTo(1);
    expect(wrapYaw(-1)).toBeCloseTo(-1);
  });

  it("wraps a full turn back to itself", () => {
    expect(wrapYaw(1 + Math.PI * 2)).toBeCloseTo(1);
    expect(wrapYaw(1 - Math.PI * 4)).toBeCloseTo(1);
  });

  it("normalises the ±π seam to the positive end", () => {
    // −π and π name the same direction; picking one keeps the round-trip
    // through vectorToYawPitch stable instead of flipping sign at the seam.
    expect(wrapYaw(-Math.PI)).toBe(Math.PI);
    expect(wrapYaw(Math.PI)).toBe(Math.PI);
  });
});

describe("clampPitch", () => {
  it("stops short of the poles", () => {
    expect(clampPitch(Math.PI / 2)).toBe(MAX_PITCH);
    expect(clampPitch(-Math.PI / 2)).toBe(-MAX_PITCH);
  });

  it("leaves an ordinary look-down alone", () => {
    expect(clampPitch(-0.4)).toBe(-0.4);
  });
});

describe("clampFov", () => {
  it("holds zoom between the fisheye and the blur", () => {
    expect(clampFov(10)).toBe(MIN_FOV);
    expect(clampFov(180)).toBe(MAX_FOV);
    expect(clampFov(DEFAULT_FOV)).toBe(DEFAULT_FOV);
  });
});

describe("shortestYawDelta", () => {
  it("turns the short way across the seam", () => {
    // From 170° to −170° is a 20° turn, not a 340° one.
    const from = (170 * Math.PI) / 180;
    const to = (-170 * Math.PI) / 180;
    expect(shortestYawDelta(from, to)).toBeCloseTo((20 * Math.PI) / 180);
  });

  it("is signed", () => {
    expect(shortestYawDelta(1, 0.5)).toBeCloseTo(-0.5);
  });
});

describe("yawPitchToVector / vectorToYawPitch", () => {
  it("puts yaw 0 at +z and pitch up at +y", () => {
    const ahead = yawPitchToVector(0, 0);
    expect(ahead.x).toBeCloseTo(0);
    expect(ahead.y).toBeCloseTo(0);
    expect(ahead.z).toBeCloseTo(1);
    const up = yawPitchToVector(0, Math.PI / 2);
    expect(up.y).toBeCloseTo(1);
  });

  it("turns toward −x as yaw grows — the side a three.js camera shows on the right", () => {
    expect(yawPitchToVector(Math.PI / 2, 0).x).toBeCloseTo(-1);
  });

  it("round-trips every quadrant", () => {
    for (const yaw of [-2.5, -0.7, 0, 0.7, 2.5]) {
      for (const pitch of [-1.2, -0.3, 0, 0.3, 1.2]) {
        const back = vectorToYawPitch(yawPitchToVector(yaw, pitch));
        expect(back.yaw).toBeCloseTo(yaw);
        expect(back.pitch).toBeCloseTo(pitch);
      }
    }
  });

  it("normalises a non-unit vector", () => {
    const back = vectorToYawPitch({ x: 0, y: 0, z: 12 });
    expect(back.yaw).toBeCloseTo(0);
    expect(back.pitch).toBeCloseTo(0);
  });

  it("survives a zero vector instead of returning NaN", () => {
    const back = vectorToYawPitch({ x: 0, y: 0, z: 0 });
    expect(Number.isNaN(back.yaw)).toBe(false);
    expect(Number.isNaN(back.pitch)).toBe(false);
  });
});

describe("uvToYawPitch / yawPitchToUv", () => {
  it("maps the centre of the panorama to straight ahead", () => {
    expect(uvToYawPitch(0.5, 0.5)).toEqual({ yaw: 0, pitch: 0 });
  });

  it("maps the top edge to straight up and the bottom to straight down", () => {
    expect(uvToYawPitch(0.5, 0).pitch).toBeCloseTo(Math.PI / 2);
    expect(uvToYawPitch(0.5, 1).pitch).toBeCloseTo(-Math.PI / 2);
  });

  it("round-trips an authored hotspot coordinate", () => {
    const { yaw, pitch } = uvToYawPitch(0.36, 0.55);
    const uv = yawPitchToUv(yaw, pitch);
    expect(uv.u).toBeCloseTo(0.36);
    expect(uv.v).toBeCloseTo(0.55);
  });
});

describe("projectToScreen", () => {
  const camera = { yaw: 0, pitch: 0, fov: DEFAULT_FOV };

  it("puts the direction the camera faces dead centre", () => {
    const p = projectToScreen({ yaw: 0, pitch: 0 }, camera, SIZE);
    expect(p.x).toBeCloseTo(CENTRE.x);
    expect(p.y).toBeCloseTo(CENTRE.y);
    expect(p.visible).toBe(true);
  });

  it("puts a direction to the camera's right on the right, and up above", () => {
    const right = projectToScreen({ yaw: 0.3, pitch: 0 }, camera, SIZE);
    expect(right.x).toBeGreaterThan(CENTRE.x);
    expect(right.y).toBeCloseTo(CENTRE.y);

    const above = projectToScreen({ yaw: 0, pitch: 0.3 }, camera, SIZE);
    expect(above.y).toBeLessThan(CENTRE.y);
    expect(above.x).toBeCloseTo(CENTRE.x);
  });

  it("reports a hotspot behind the camera as not visible", () => {
    const behind = projectToScreen({ yaw: Math.PI, pitch: 0 }, camera, SIZE);
    expect(behind.visible).toBe(false);
  });

  it("reports a hotspot beside the camera as not visible", () => {
    // Exactly 90° away: on the projection plane's horizon line, so `depth`
    // is ~0 and the marker must not be parked at the edge of the canvas.
    const beside = projectToScreen({ yaw: Math.PI / 2, pitch: 0 }, camera, SIZE);
    expect(beside.visible).toBe(false);
  });

  it("reports a hotspot in front but off screen as not visible", () => {
    const offScreen = projectToScreen({ yaw: 1.2, pitch: 0 }, camera, SIZE);
    expect(offScreen.visible).toBe(false);
  });

  it("brings an off-screen hotspot into view when the camera turns to it", () => {
    const turned = projectToScreen(
      { yaw: 1.2, pitch: 0 },
      { ...camera, yaw: 1.2 },
      SIZE
    );
    expect(turned.visible).toBe(true);
    expect(turned.x).toBeCloseTo(CENTRE.x);
  });

  it("holds the horizon level when the camera is pitched", () => {
    const pitched = { yaw: 0, pitch: 0.5, fov: DEFAULT_FOV };
    const left = projectToScreen({ yaw: -0.2, pitch: 0.5 }, pitched, SIZE);
    const rightward = projectToScreen({ yaw: 0.2, pitch: 0.5 }, pitched, SIZE);
    expect(left.y).toBeCloseTo(rightward.y);
    expect(left.x).toBeLessThan(rightward.x);
  });

  it("spreads hotspots further apart as the field of view narrows", () => {
    const wide = projectToScreen({ yaw: 0.2, pitch: 0 }, { ...camera, fov: 100 }, SIZE);
    const narrow = projectToScreen({ yaw: 0.2, pitch: 0 }, { ...camera, fov: 40 }, SIZE);
    expect(narrow.x - CENTRE.x).toBeGreaterThan(wide.x - CENTRE.x);
  });

  it("treats a zero-height canvas as square rather than dividing by zero", () => {
    const p = projectToScreen({ yaw: 0, pitch: 0 }, camera, { width: 0, height: 0 });
    expect(Number.isNaN(p.x)).toBe(false);
  });
});

describe("screenToYawPitch", () => {
  const camera = { yaw: 0.4, pitch: -0.2, fov: DEFAULT_FOV };

  it("maps the centre of the canvas back to where the camera looks", () => {
    const dir = screenToYawPitch(CENTRE, camera, SIZE);
    expect(dir.yaw).toBeCloseTo(camera.yaw);
    expect(dir.pitch).toBeCloseTo(camera.pitch);
  });

  it("inverts projectToScreen for an arbitrary point", () => {
    const point = { x: 610, y: 130 };
    const dir = screenToYawPitch(point, camera, SIZE);
    const back = projectToScreen(dir, camera, SIZE);
    expect(back.x).toBeCloseTo(point.x);
    expect(back.y).toBeCloseTo(point.y);
  });

  it("survives a zero-sized canvas", () => {
    const dir = screenToYawPitch(CENTRE, camera, { width: 0, height: 0 });
    expect(Number.isNaN(dir.yaw)).toBe(false);
  });
});

describe("dragSensitivity", () => {
  it("turns less per pixel when zoomed in", () => {
    expect(dragSensitivity(40, 800)).toBeLessThan(dragSensitivity(100, 800));
  });

  it("is zero on a zero-height canvas rather than infinite", () => {
    expect(dragSensitivity(DEFAULT_FOV, 0)).toBe(0);
  });

  it("drags one field of view across the full height of the canvas", () => {
    expect(dragSensitivity(90, 900) * 900).toBeCloseTo(Math.PI / 2);
  });
});
