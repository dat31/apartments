import { describe, expect, it } from "vitest";
import {
  ASPECT_TOLERANCE,
  MAX_PANORAMA,
  MAX_PANORAMA_BYTES,
  MIN_PANORAMA_WIDTH,
  isEquirectangular,
  panoramaTargetSize,
  rejectPanorama,
} from "@/lib/virtual-tour/panorama-spec";

describe("isEquirectangular", () => {
  it("accepts exact 2:1", () => {
    expect(isEquirectangular(4096, 2048)).toBe(true);
    expect(isEquirectangular(8192, 4096)).toBe(true);
  });

  it("accepts a stitcher being a pixel or two out", () => {
    expect(isEquirectangular(4096, 2047)).toBe(true);
    expect(isEquirectangular(4096, 2049)).toBe(true);
  });

  it("rejects an ordinary photo — the common mistake", () => {
    expect(isEquirectangular(4032, 3024)).toBe(false); // 4:3 phone shot
    expect(isEquirectangular(1920, 1080)).toBe(false); // 16:9
    expect(isEquirectangular(2048, 2048)).toBe(false); // square
  });

  it("rejects nonsense dimensions rather than dividing by zero", () => {
    expect(isEquirectangular(0, 0)).toBe(false);
    expect(isEquirectangular(-4096, -2048)).toBe(false);
  });

  it("honours a caller-supplied tolerance", () => {
    // 3:1 is way out; no sane tolerance accepts it.
    expect(isEquirectangular(3000, 1000, ASPECT_TOLERANCE)).toBe(false);
    expect(isEquirectangular(3000, 1000, 1)).toBe(true);
  });
});

describe("panoramaTargetSize", () => {
  it("caps an oversized panorama at 4096 wide, keeping 2:1", () => {
    expect(panoramaTargetSize(8192, 4096)).toEqual({ width: 4096, height: 2048 });
    expect(panoramaTargetSize(11000, 5500)).toEqual({ width: 4096, height: 2048 });
  });

  it("never upscales — bytes without detail", () => {
    expect(panoramaTargetSize(3000, 1500)).toEqual({ width: 3000, height: 1500 });
    expect(panoramaTargetSize(2048, 1024)).toEqual({ width: 2048, height: 1024 });
  });

  it("passes a panorama already at the cap through untouched", () => {
    expect(panoramaTargetSize(MAX_PANORAMA.width, MAX_PANORAMA.height)).toEqual({
      width: 4096,
      height: 2048,
    });
  });

  it("falls back to the cap on nonsense input", () => {
    expect(panoramaTargetSize(0, 0)).toEqual({ width: 4096, height: 2048 });
  });
});

describe("rejectPanorama", () => {
  const ok = { type: "image/jpeg", bytes: 3_000_000, width: 4096, height: 2048 };

  it("accepts a real panorama", () => {
    expect(rejectPanorama(ok)).toBeNull();
  });

  it("names why it refused", () => {
    expect(rejectPanorama({ ...ok, type: "application/pdf" })).toBe("not-image");
    expect(rejectPanorama({ ...ok, bytes: MAX_PANORAMA_BYTES + 1 })).toBe(
      "too-large-file"
    );
    expect(rejectPanorama({ ...ok, width: 4032, height: 3024 })).toBe(
      "not-equirectangular"
    );
    expect(
      rejectPanorama({ ...ok, width: MIN_PANORAMA_WIDTH - 8, height: (MIN_PANORAMA_WIDTH - 8) / 2 })
    ).toBe("too-small");
  });

  it("checks the file type before anything else", () => {
    // A PDF has no useful dimensions; reporting "not equirectangular" would
    // send the owner looking for the wrong problem.
    expect(rejectPanorama({ type: "application/pdf", bytes: 10, width: 0, height: 0 })).toBe(
      "not-image"
    );
  });
});
