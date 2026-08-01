# Plan: hotspot authoring (phase 3, PR B)

> Implementation doc for the second half of owner authoring. PR A (rooms —
> upload, name, order, opening view, publish) is `#102`; this is what turns a
> set of rooms into a walkable home.
>
> The umbrella plan is `virtual-home-tour.md`; its §16 ledger is the record of
> what already exists. The product brief for the host's side, written for
> design and free of implementation detail, is
> `docs/design/tour-editing-brief.md` — read that for *what* this should feel
> like, and this for *how* it gets built.
>
> **Sequencing note.** PR A's upload pipeline has never been run by a signed-in
> user: no real panorama has been through `uploadPanorama`. Closing that is
> worth more than starting this. Doors placed in rooms nobody can create yet
> are doors nobody can use.

---

## 1. What this adds

A host opens a room they have uploaded, clicks a doorway in the photograph,
and says which room it leads to. Or clicks the fridge and writes a sentence
about it. Then they move it, edit it, or delete it.

That is the whole feature. Everything else in this document exists because
that one interaction sits on top of a photograph the host is also dragging
around, on a phone.

## 2. What already exists

Almost all the maths and every rule. Do not rebuild these.

| Piece | Where | Note |
| --- | --- | --- |
| Screen point → direction | `lib/virtual-tour/math.ts` → `screenToYawPitch(point, camera, size)` | Unit-tested. **This is the entire placement conversion** — no raycasting, no three.js. Its docstring already names this feature as the caller. |
| Direction → screen point | same file → `projectToScreen(hotspot, camera, size)` | What positions markers today; the editor's overlay uses the same function. |
| The renderer | `app/[lang]/(app)/apartments/[id]/virtual-tour/lib/engine.ts` | `show`, `lookAt`, `resetView`, `zoomBy`, and `onFrame(camera, size)` — the per-frame camera the overlay needs. |
| Renter's marker overlay | `…/virtual-tour/components/hotspot-layer.tsx` | Reference for positioning, **not** a component to extend (see §4). |
| Hotspot shape + validation | `schemas/virtual-tour/index.ts` → `HotspotSchema` | Discriminated on `kind`; a link without a target fails to parse. |
| Graph rules | `lib/virtual-tour/scene-graph.ts` → `validateTourGraph`, `adjacency`, `isLink` | Reports issues; owns no severity. |
| Publish severity | `lib/virtual-tour/publish.ts` | **Already classifies `dangling-link` and `self-link` as blocking.** PR A simply could not produce them. No change needed here. |
| Writes | `hooks/use-virtual-tour.ts` | `updateScene`, `removeScene`, optimistic invalidation, `revalidateVirtualTour()`. |
| Room editing surface | `…/virtual-tour/edit/components/framing-dialog.tsx` | Already mounts the engine for one room to set the opening view. §4 proposes growing this rather than adding a second engine mount. |
| Issue copy | `messages/{vi,en}.json` → `virtualTourEditor.issues.*` | All six codes already have sentences in both locales. |

## 3. Data model — no migration

`virtual_tour_scenes.hotspots` is already `jsonb not null default '[]'` with a
`jsonb_typeof = 'array'` check, and RLS already restricts writes to the
listing's owner. A hotspot is:

```ts
{ id: string;                 // client-generated uuid, stable across edits
  kind: "link" | "info";
  yaw: number; pitch: number; // radians, the conventions in math.ts
  label: string;              // door: the target room's name; info: its title
  target?: string;            // kind === "link": the target scene's id
  body?: string }             // kind === "info": one or two sentences
```

Writes replace the whole array for one scene. The list is small and bounded,
and a partial update would need a merge strategy for no benefit.

`updateScene` in `hooks/use-virtual-tour.ts` currently accepts
`Partial<Pick<SceneRow, "name" | "room" | "yaw" | "pitch" | "hfov">>`. Widen it
to include `hotspots`, and **parse with `HotspotSchema.array()` before the
write** — the column check only proves it is an array, and a malformed marker
would reach renters.

## 4. Where the editing happens

**Grow `framing-dialog.tsx` into a room editor rather than adding a second
surface.** It already mounts the engine for exactly one room; setting the
opening view and placing markers are the same activity — being inside a room,
looking around, deciding things about what you see. Two dialogs would mean two
engine mounts, two WebGL contexts, and a host wondering which one to open.

Rename it (`room-editor.tsx`) and give it: the existing look-around canvas, a
placement layer, the "set opening view" control it already has, and a list of
this room's markers. It should be full-screen on phones — the renter's tour is
immersive for the same reason, and marker placement needs every pixel.

**Do not extend `hotspot-layer.tsx`.** The renter's overlay must not grow an
edit mode: it would ship editor code to every renter and couple two things
that will diverge. Share `projectToScreen` and the engine; write a separate
`editor-hotspot-layer.tsx`. This is risk #4 in the umbrella plan.

## 5. The interaction

### 5.1 Placing

The engine owns pointer-drag for looking around, so a placement gesture has to
be distinguished from a look:

- **Pointer (mouse):** treat pointerdown → pointerup as a placement when total
  movement stays under a small threshold (~5 px) and the pointer did not land
  on an existing marker. Convert with `screenToYawPitch(point, camera, size)`
  using the camera from the frame loop.
- **Touch:** the same threshold is unreliable — fingers move, and the target is
  under the finger. Provide an explicit **aim-and-place** path: a fixed
  crosshair at the centre of the view, and a "place here" control that reads
  the camera's current direction directly (no screen-point conversion needed —
  the centre *is* `camera.yaw` / `camera.pitch`). Treat this as the primary
  path on touch, not a fallback.

After placing, open an editor for the new marker:

- **Door:** which room does this lead to? A select of the tour's other rooms.
  `label` is set from the target room's name, and must follow it if that room
  is later renamed (§7).
- **Point of interest:** a title and a short body.

Cancelling before saving discards the marker.

### 5.2 Moving

Dragging an existing marker converts the pointer position with the same
function on each move and writes on release. Two rules:

- While dragging a marker, the camera must not move — the drag belongs to the
  marker, not the view.
- The marker follows the pointer exactly. The two conversions are inverses —
  `math.test.ts` pins that ("inverts projectToScreen for an arbitrary point") —
  so a marker that lags or drifts means the camera snapshot is stale, not that
  the maths is wrong.

### 5.3 Selecting, editing, removing

Markers are `<button>`s (as they are for renters — keyboard reachable, and
`aria`-labelled). Selecting one opens the same editor used at placement.
Deleting is available there and from the room's marker list, which is also the
keyboard-accessible path to everything: **placement by pointer cannot be the
only way to add a marker**, so the list needs an "add" affordance that places
one at the current camera direction.

## 6. Deleting a room breaks other rooms

The one piece of genuinely new domain logic, and the one most likely to be
forgotten.

When a scene is removed, any `link` hotspot in a *sibling* scene whose `target`
was that scene is now dangling. `validateTourGraph` will report it and
`publish.ts` blocks on it — so the host deletes a bathroom and discovers, at
publish time, that the bedroom is broken with no clue why.

Add to `lib/virtual-tour/scene-graph.ts` (pure, unit-tested, where the
coverage gate can see it):

```ts
/** Every scene with links to `removedId` stripped. Returns the same array
    when nothing pointed at it, so callers can skip the write. */
export function pruneLinksTo(scenes: Scene[], removedId: string): Scene[]
```

`removeScene` in `hooks/use-virtual-tour.ts` then: delete the row, prune the
siblings, and write back only the scenes that changed. Tests: no-op when
nothing pointed at it; strips exactly the affected markers; leaves info
hotspots and other links untouched.

## 7. Renaming a room

A door's `label` is the target room's name, captured when the door was placed.
Rename the room and the door still says the old name.

Cheapest correct fix: **derive the label at render time** from the target
scene, and treat the stored `label` as a fallback for a target that no longer
exists. The renter's overlay already has the whole scene list in scope, and
`HotspotSchema` keeps `label` required, so nothing changes shape. The
alternative — rewriting every sibling's hotspots on rename — is a second write
path that can half-fail.

## 8. What does not change

- **The publish gate.** `dangling-link` and `self-link` are already blocking;
  `unreachable-scene` stays advisory. PR A's reasoning holds unchanged: the
  room rail reaches every room, so "no door leads here yet" is a note.
- **The schema, the migration, the RLS.**
- **The renter's viewer**, apart from §7's label derivation.

## 9. Copy

New `virtualTourEditor` keys in both locales: the placement prompt, the
kind choice, the door's target picker, the point-of-interest title and body
fields, marker list labels, delete confirmation, and the touch crosshair's
"place here". Vietnamese first — the host audience is local, and this is the
surface most likely to be used in Vietnamese.

## 10. Testing

**Unit** — `pruneLinksTo`, and any placement helper pure enough to extract.
The conversion itself is already covered by `math.test.ts`; do not re-test it.

**e2e** — belongs in `e2e/authed/` (the editor is auth-gated), which skips
without `E2E_EMAIL` / `E2E_PASSWORD`. That suite is deliberately read-only
against the shared Supabase project, so a spec that creates markers needs a
scratch listing or a cleanup step. Worth asserting: a placed door appears in
the renter's tour and walks to the right room — the one assertion that proves
the whole conversion chain end to end.

**Manual** — placement on a real phone, on a real panorama. The threshold in
§5.1 cannot be tuned any other way.

## 11. Risks

1. **Touch placement is the feature.** If it is fiddly, hosts will not place
   doors, and a tour without doors is a slideshow. Prototype §5.1's
   aim-and-place before committing to tap-to-place.
2. **A marker that drifts under the pointer** reads as broken maths and will
   send someone into `math.ts`. It is a stale camera snapshot; note it where
   the drag is implemented.
3. **Editing a live tour** changes what renters see immediately — see question
   4 in the design brief. If the answer turns out to be "stage the changes",
   that is a schema decision and should land before this ships, not after.
4. **Two markers in nearly the same place** are hard to select apart, and
   nothing stops a host stacking them.
