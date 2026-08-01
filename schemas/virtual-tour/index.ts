import { z } from "zod";

/* ============================================================
   Virtual tour domain schemas + types.

   A tour is an ordered set of *scenes* (rooms), each backed by one
   equirectangular 360° photo, plus the *hotspots* painted onto that
   photo: doors that walk you to another scene, and info markers that
   describe a point of interest.

   Naming note: "tour" alone already means an in-person viewing
   appointment in this app (/tour, TourRequest, book-tour-dialog).
   Everything here is deliberately `virtualTour` / `VirtualTour` and
   never nests inside those namespaces — see
   docs/plans/virtual-home-tour.md §2.
   ============================================================ */

/** Rooms a scene can represent. Drives the rail icon and the default name. */
export const ROOM_KINDS = [
  "living",
  "bed",
  "bath",
  "kitchen",
  "balcony",
  "other",
] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

/* Directions are stored as yaw/pitch in radians, measured from the scene's
   origin: yaw around the vertical axis, pitch up (+) and down (−). Pitch is
   bounded because a hotspot at the pole can't be looked at without the camera
   flipping; the viewer clamps the camera to the same range (lib/virtual-tour/math). */
const YawSchema = z.number().min(-Math.PI * 2).max(Math.PI * 2);
const PitchSchema = z.number().min(-Math.PI / 2).max(Math.PI / 2);

/** A door: walks the viewer to `target`, another scene in the same tour. */
export const LinkHotspotSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("link"),
  yaw: YawSchema,
  pitch: PitchSchema,
  label: z.string().min(1),
  target: z.string().min(1),
});

/** A point of interest: opens a panel with a sentence or two about the spot. */
export const InfoHotspotSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("info"),
  yaw: YawSchema,
  pitch: PitchSchema,
  label: z.string().min(1),
  body: z.string().min(1),
  photo: z.string().optional(),
});

/* Discriminated on `kind`, so a link without a target (or an info without a
   body) fails to parse rather than rendering a marker that goes nowhere. */
export const HotspotSchema = z.discriminatedUnion("kind", [
  LinkHotspotSchema,
  InfoHotspotSchema,
]);
export type Hotspot = z.infer<typeof HotspotSchema>;
export type LinkHotspot = z.infer<typeof LinkHotspotSchema>;
export type InfoHotspot = z.infer<typeof InfoHotspotSchema>;

export const SceneSchema = z.object({
  id: z.string().min(1),
  /* Owner-authored, stored as written: room names are content, not UI copy,
     so they are never run through next-intl. */
  name: z.string().min(1),
  room: z.enum(ROOM_KINDS).default("other"),
  /** Equirectangular 2:1 panorama, at most 4096×2048 (see the plan §5). */
  panorama: z.string().min(1),
  /** 512×256 version of the same shot — rail thumbnail and first paint. */
  preview: z.string().min(1),
  /** Where the camera looks when the scene opens. */
  yaw: z.number().default(0),
  pitch: z.number().default(0),
  /** Field of view the room opens at, degrees. Absent means "leave the
      visitor's current zoom alone" — the owner didn't frame one. */
  hfov: z.number().optional(),
  sortOrder: z.number().int().default(0),
  hotspots: z.array(HotspotSchema).default([]),
});
export type Scene = z.infer<typeof SceneSchema>;

/* The point-of-interest form in the owner's editor. A note has to say what it
   is *and* what a renter should know — an untitled or empty note is a marker
   that costs a renter a tap and tells them nothing, which is why
   InfoHotspotSchema requires both. Built from a translator scoped to
   `validation` so the messages are localized, the same shape as
   createReviewFormSchema. */
export const createNoteFormSchema = (t: (key: string) => string) =>
  z.object({
    label: z.string().trim().min(1, t("virtualTour.noteTitle")).max(80),
    body: z.string().trim().min(1, t("virtualTour.noteBody")).max(400),
  });
export type NoteFormValues = z.infer<ReturnType<typeof createNoteFormSchema>>;

export const VirtualTourSchema = z.object({
  id: z.string().min(1),
  listingId: z.string().min(1),
  status: z.enum(["draft", "published"]),
  /** Scene the tour opens on. Must be one of `scenes` — validateTourGraph checks. */
  entryScene: z.string().min(1),
  scenes: z.array(SceneSchema).min(1),
});
export type VirtualTour = z.infer<typeof VirtualTourSchema>;
