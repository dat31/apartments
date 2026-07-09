"use client";

import "leaflet/dist/leaflet.css";
import "@/app/leaflet-theme.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type * as L from "leaflet";
import { Eye, LoaderCircle, LocateFixed, TriangleAlert } from "lucide-react";
import { kmBetween, type LatLng } from "@/lib/geo";
import {
  gmapsDirectionsUrl,
  legGapMinutes,
  type TourStop,
} from "../lib/route-plan";
import { RouteLegs, type RouteLeg, type RoutePoint } from "./route-legs";
import { RouteSuggestionCard } from "./route-suggestion-card";

/* One day's tour route, side by side on wide screens: the Leaflet map on the
   left, and the stack (status rows, suggestion card, legs timeline) on the
   right. Numbered pins mark every stop in schedule order, the renter's own
   location shows when granted, and the OSRM driving route connects them.
   When the drive between two tours takes longer than the free gap in the
   schedule, that leg is flagged: its polyline turns destructive and a
   day-level banner counts the tours at risk. Hovering a leg in the timeline
   thickens its polyline and lifts its endpoint pins. Transient states
   (locating, location off, estimated route) also surface as chips overlaid
   on the map. Client leaf — Leaflet touches `window` at import, so it's
   loaded dynamically inside the mount effect (same stack as the detail-page
   LocationMap). */

type GeoState =
  | { status: "locating" }
  | { status: "done"; point: LatLng }
  | { status: "denied" }
  | { status: "unavailable" };

/* Points/legs are snapshotted into the route state when a fetch lands so the
   timeline never pairs fresh nodes with stale legs mid-refetch. */
type RouteState =
  | { status: "loading" }
  | {
      status: "shown";
      points: RoutePoint[];
      legs: RouteLeg[];
      totalKm: number;
      totalMinutes: number;
      latlngs: LatLng[];
    }
  /* OSRM failed — dashed straight lines + crow-flies distances. */
  | {
      status: "estimate";
      points: RoutePoint[];
      legs: RouteLeg[];
      totalKm: number;
      latlngs: LatLng[];
    };

/* A cheaper visiting order found by the OSRM trip service — only computed
   for flexible days (≥3 stops, at least one time still pending) and only
   surfaced when it saves more than 5 minutes. Suggest-only: it never
   touches bookings. */
type Suggestion = {
  /** Stop numbers (0-based, schedule order) in the suggested visiting order. */
  order: number[];
  savedMinutes: number;
  points: RoutePoint[];
  legs: RouteLeg[];
  totalKm: number;
  totalMinutes: number;
  /** Route points in suggested order — for the Google Maps link. */
  latlngs: LatLng[];
  /** Trip geometry for the preview polyline. */
  path: LatLng[];
};

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const OSRM_TRIP = "https://router.project-osrm.org/trip/v1/driving";

const CHIP =
  "pointer-events-auto inline-flex items-center gap-1.5 border border-border bg-background/95 px-2.5 py-1.5 text-xs font-medium";

export function TourRouteMap({ stops }: { stops: TourStop[] }) {
  const t = useTranslations("tour.route");

  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const userLayerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.FeatureGroup | L.Polyline | null>(null);
  // Built lazily from suggestion.path on first preview; add/remove toggles it.
  const suggestionLayerRef = useRef<L.Polyline | null>(null);
  // Hover targets: one polyline per schedule leg (with its base style, to
  // restore after a hover) and the marker element behind each stop number.
  const legLinesRef = useRef<
    { line: L.Polyline; base: { color: string; weight: number; opacity: number } }[]
  >([]);
  const markerElsRef = useRef<Record<string, HTMLElement>>({});
  // Guards a stale OSRM response (e.g. a location retry mid-flight) from
  // overwriting a fresher one.
  const requestRef = useRef(0);
  // Leaflet writes SVG presentation attributes, which don't evaluate var() —
  // resolve the design tokens to concrete colors once the map mounts.
  const colorsRef = useRef({
    primary: "#1c1c1c",
    bg: "#ffffff",
    destructive: "#b91c1c",
  });

  const [ready, setReady] = useState(false);
  const [geo, setGeo] = useState<GeoState>({ status: "locating" });
  const [route, setRoute] = useState<RouteState>({ status: "loading" });
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  /* Mount the map with the day's numbered stop pins. */
  useEffect(() => {
    let cancelled = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !nodeRef.current || mapRef.current) return;
      leafletRef.current = leaflet;

      const cs = getComputedStyle(nodeRef.current);
      const primary = cs.getPropertyValue("--primary").trim() || "#1c1c1c";
      const bg = cs.getPropertyValue("--background").trim() || "#ffffff";
      const destructive =
        cs.getPropertyValue("--destructive").trim() || "#b91c1c";
      colorsRef.current = { primary, bg, destructive };

      const map = leaflet.map(nodeRef.current, {
        scrollWheelZoom: false, // avoid hijacking page scroll — click to focus
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;
      map.zoomControl.setPosition("bottomright");

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(map);

      // One pin per distinct location; two tours at the same address share a
      // pin and stack their stop numbers ("1·2").
      const pins = new Map<string, { coords: LatLng; nums: number[]; titles: string[] }>();
      stops.forEach((s, i) => {
        const key = s.coords.join(",");
        const pin = pins.get(key);
        if (pin) {
          pin.nums.push(i + 1);
          pin.titles.push(s.listing.title);
        } else {
          pins.set(key, { coords: s.coords, nums: [i + 1], titles: [s.listing.title] });
        }
      });
      const dayMarkers: { marker: L.Marker; nums: number[] }[] = [];
      for (const { coords, nums, titles } of pins.values()) {
        const icon = leaflet.divIcon({
          className: "route-marker",
          html:
            '<span style="display:block;width:30px;height:30px;position:relative;">' +
            `<span class="route-teardrop" style="position:absolute;inset:0;transform:rotate(-45deg);background:${primary};"></span>` +
            `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${bg};font-size:${nums.length > 1 ? 10 : 13}px;font-weight:700;">${nums.join("·")}</span>` +
            "</span>",
          iconSize: [30, 30],
          iconAnchor: [15, 28],
        });
        const marker = leaflet
          .marker(coords, { icon, keyboard: false, title: titles.join(" · ") })
          .addTo(map);
        dayMarkers.push({ marker, nums });
      }
      map.fitBounds(
        leaflet.latLngBounds(stops.map((s) => s.coords)).pad(0.2),
        { maxZoom: 15 }
      );
      // The map had no view until fitBounds, and Leaflet defers every
      // layer's onAdd (which builds the icon element) until then — so the
      // hover registry can only be filled afterwards.
      markerElsRef.current = {};
      for (const { marker, nums } of dayMarkers) {
        const el = marker.getElement();
        if (el) for (const n of nums) markerElsRef.current[n] = el;
      }

      // Leaflet mis-measures when it mounts inside an animating/flex ancestor,
      // and the side-by-side column resizes as status rows come and go.
      resizeTimer = setTimeout(() => map.invalidateSize(), 250);
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(nodeRef.current);

      // Enable wheel-zoom only after the user clicks into the map.
      map.on("focus", () => map.scrollWheelZoom.enable());
      map.on("blur", () => map.scrollWheelZoom.disable());

      setReady(true);
    })();

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      userLayerRef.current = null;
      routeLayerRef.current = null;
      suggestionLayerRef.current = null;
      legLinesRef.current = [];
      markerElsRef.current = {};
    };
  }, [stops]);

  /* setState only happens inside the geolocation callbacks, so this is safe
     to call from the mount effect (no sync setState in an effect body). */
  const requestPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          status: "done",
          point: [pos.coords.latitude, pos.coords.longitude],
        }),
      (err) => setGeo({ status: err.code === 1 ? "denied" : "unavailable" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  /* Ask for the location right away so the route can start from the renter —
     the initial state is already "locating". */
  useEffect(() => {
    if (!navigator.geolocation) {
      const timer = setTimeout(() => setGeo({ status: "unavailable" }), 0);
      return () => clearTimeout(timer);
    }
    requestPosition();
  }, [requestPosition]);

  const retryLocation = () => {
    if (!navigator.geolocation) {
      setGeo({ status: "unavailable" });
      return;
    }
    setGeo({ status: "locating" });
    requestPosition();
  };

  /* Draw the "you are here" dot (with its pulse) once both the map and the
     location exist. */
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!ready || !map || !leaflet || geo.status !== "done") return;
    const { primary, bg } = colorsRef.current;
    userLayerRef.current?.remove();
    const dot = leaflet.divIcon({
      className: "route-marker",
      html:
        '<span style="display:block;width:18px;height:18px;position:relative;">' +
        `<span class="route-pulse" style="position:absolute;inset:0;background:${primary};opacity:.5;"></span>` +
        `<span class="route-dot" style="position:absolute;inset:0;box-sizing:border-box;background:${primary};border:3px solid ${bg};"></span>` +
        "</span>",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const marker = leaflet
      .marker(geo.point, { icon: dot, keyboard: false, title: t("yourLocation") })
      .addTo(map);
    userLayerRef.current = marker;
    const el = marker.getElement();
    if (el) markerElsRef.current.user = el;
  }, [ready, geo, t]);

  /* Fetch the whole day's driving route in one OSRM call (all waypoints in
     schedule order, the renter's location prepended when known) and draw it.
     On failure, degrade to dashed straight legs with crow-flies distances. */
  const fetchRoute = useCallback(async () => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    const request = ++requestRef.current;

    const fromUser = geo.status === "done";
    const latlngs: LatLng[] = fromUser
      ? [geo.point, ...stops.map((s) => s.coords)]
      : stops.map((s) => s.coords);
    const point = (i: number): RoutePoint =>
      fromUser && i === 0
        ? { kind: "user" }
        : { kind: "stop", n: i + (fromUser ? 0 : 1) };
    const points = latlngs.map((_, i) => point(i));

    const drawFallback = (path: LatLng[]) => {
      routeLayerRef.current?.remove();
      legLinesRef.current = [];
      const line = leaflet
        .polyline(path, {
          color: colorsRef.current.primary,
          weight: 2,
          opacity: 0.55,
          dashArray: "4 8",
        })
        .addTo(map);
      routeLayerRef.current = line;
      map.fitBounds(line.getBounds().pad(0.2), { maxZoom: 15 });
    };

    try {
      // steps=true so each leg carries its own geometry (concatenated step
      // paths) — that's what lets a tight leg get its own polyline color
      // while keeping the whole day in a single OSRM request.
      const res = await fetch(
        `${OSRM}/${latlngs.map(([lat, lng]) => `${lng},${lat}`).join(";")}` +
          "?overview=false&geometries=geojson&steps=true"
      );
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const data = (await res.json()) as {
        routes?: {
          distance: number;
          duration: number;
          legs: {
            distance: number;
            duration: number;
            steps: { geometry: { coordinates: [number, number][] } }[];
          }[];
        }[];
      };
      const r = data.routes?.[0];
      if (!r || r.legs.length !== points.length - 1) throw new Error("no route");
      if (requestRef.current !== request || !mapRef.current) return;

      // A refetch (location retry, manual retry) invalidates any previous
      // order suggestion and its preview.
      suggestionLayerRef.current?.remove();
      suggestionLayerRef.current = null;
      setSuggestion(null);
      setPreviewing(false);
      setHovered(null);

      // Leg i connects points[i] → points[i+1]; when the renter's location
      // leads the list, stop-to-stop legs start at leg 1. Only those have a
      // schedule gap to compare the drive against.
      const legs: RouteLeg[] = r.legs.map((leg, i) => {
        const minutes = Math.max(1, Math.round(leg.duration / 60));
        const pair = fromUser ? i - 1 : i;
        const gap =
          pair >= 0 ? legGapMinutes(stops[pair], stops[pair + 1]) : null;
        return {
          km: leg.distance / 1000,
          minutes,
          tightGap:
            gap !== null && minutes > gap
              ? { gap: Math.max(0, gap), drive: minutes }
              : undefined,
        };
      });

      routeLayerRef.current?.remove();
      const lines = r.legs.map((leg, i) => {
        const base = {
          color: legs[i].tightGap
            ? colorsRef.current.destructive
            : colorsRef.current.primary,
          weight: 4,
          opacity: 0.8,
        };
        return {
          line: leaflet.polyline(
            leg.steps.flatMap((s) =>
              s.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng)
            ),
            base
          ),
          base,
        };
      });
      const group = leaflet.featureGroup(lines.map((l) => l.line)).addTo(map);
      routeLayerRef.current = group;
      legLinesRef.current = lines;
      map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 15 });

      setRoute({
        status: "shown",
        points,
        legs,
        totalKm: r.distance / 1000,
        totalMinutes: Math.max(1, Math.round(r.duration / 60)),
        latlngs,
      });

      // On a flexible day (≥3 stops, at least one time still pending) ask
      // the OSRM trip service whether another visiting order is meaningfully
      // faster. Best-effort: any failure just means no hint. The nested
      // try keeps a trip error from tripping the outer route fallback.
      if (stops.length < 3 || !stops.some((s) => s.tour.status === "pending"))
        return;
      try {
        const tripRes = await fetch(
          `${OSRM_TRIP}/${latlngs.map(([lat, lng]) => `${lng},${lat}`).join(";")}` +
            "?roundtrip=false&source=first&overview=full&geometries=geojson"
        );
        if (!tripRes.ok) return;
        const tripData = (await tripRes.json()) as {
          trips?: {
            distance: number;
            duration: number;
            geometry: { coordinates: [number, number][] };
            legs: { distance: number; duration: number }[];
          }[];
          waypoints?: { waypoint_index: number }[];
        };
        const trip = tripData.trips?.[0];
        if (!trip || tripData.waypoints?.length !== points.length) return;
        if (requestRef.current !== request || !mapRef.current) return;

        const savedMinutes = Math.round((r.duration - trip.duration) / 60);
        if (savedMinutes <= 5) return;

        // waypoint_index = each input point's position in the optimized trip.
        const visitOrder = tripData.waypoints
          .map((w, input) => ({ input, position: w.waypoint_index }))
          .sort((a, b) => a.position - b.position)
          .map((x) => x.input);
        setSuggestion({
          order: visitOrder
            .filter((i) => !fromUser || i > 0)
            .map((i) => i - (fromUser ? 1 : 0)),
          savedMinutes,
          points: visitOrder.map((i) => point(i)),
          legs: trip.legs.map((leg) => ({
            km: leg.distance / 1000,
            minutes: Math.max(1, Math.round(leg.duration / 60)),
          })),
          totalKm: trip.distance / 1000,
          totalMinutes: Math.max(1, Math.round(trip.duration / 60)),
          latlngs: visitOrder.map((i) => latlngs[i]),
          path: trip.geometry.coordinates.map(
            ([lng, lat]) => [lat, lng] as LatLng
          ),
        });
      } catch {
        /* suggestion is best-effort */
      }
    } catch {
      if (requestRef.current !== request || !mapRef.current) return;
      suggestionLayerRef.current?.remove();
      suggestionLayerRef.current = null;
      setSuggestion(null);
      setPreviewing(false);
      setHovered(null);
      drawFallback(latlngs);
      setRoute({
        status: "estimate",
        points,
        legs: points.slice(1).map((_, i) => ({
          km: kmBetween(latlngs[i], latlngs[i + 1]),
        })),
        totalKm: latlngs
          .slice(1)
          .reduce((sum, p, i) => sum + kmBetween(latlngs[i], p), 0),
        latlngs,
      });
    }
  }, [geo, stops]);

  /* Route once the map is up and geolocation has settled either way; a
     successful location retry re-runs this with the renter as origin.
     Deferred a tick so the effect body itself never sets state. */
  useEffect(() => {
    if (!ready || geo.status === "locating") return;
    const timer = setTimeout(fetchRoute, 0);
    return () => clearTimeout(timer);
  }, [ready, geo.status, fetchRoute]);

  const retryRoute = () => {
    setRoute({ status: "loading" });
    fetchRoute();
  };

  /* Swap the drawn route between schedule order and the suggested order.
     The schedule layer group is kept intact and re-added, so tight-gap
     coloring survives a round trip through the preview. */
  const togglePreview = () => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !suggestion) return;
    setHovered(null);
    if (previewing) {
      suggestionLayerRef.current?.remove();
      routeLayerRef.current?.addTo(map);
      setPreviewing(false);
      return;
    }
    routeLayerRef.current?.remove();
    if (!suggestionLayerRef.current) {
      // Dotted to read as hypothetical, unlike the solid booked route.
      suggestionLayerRef.current = leaflet.polyline(suggestion.path, {
        color: colorsRef.current.primary,
        weight: 4,
        opacity: 0.8,
        dashArray: "1 7",
      });
    }
    suggestionLayerRef.current.addTo(map);
    map.fitBounds(suggestionLayerRef.current.getBounds().pad(0.2), {
      maxZoom: 15,
    });
    setPreviewing(true);
  };

  /* Map ↔ timeline link: thicken the hovered leg's polyline and lift its
     endpoint markers. The preview and fallback draw one shared line, so
     there only the markers respond. */
  useEffect(() => {
    for (const [i, { line, base }] of legLinesRef.current.entries()) {
      line.setStyle(
        i === hovered && !previewing
          ? { ...base, weight: base.weight + 3, opacity: 1 }
          : base
      );
    }
    for (const el of Object.values(markerElsRef.current))
      el.classList.remove("is-hi");
    const points =
      previewing && suggestion
        ? suggestion.points
        : route.status !== "loading"
          ? route.points
          : [];
    if (hovered === null) return;
    for (const p of [points[hovered], points[hovered + 1]]) {
      if (!p) continue;
      markerElsRef.current[p.kind === "user" ? "user" : p.n]?.classList.add(
        "is-hi"
      );
    }
  }, [hovered, previewing, suggestion, route]);

  const showingPreview = previewing && !!suggestion;
  const tightCount =
    route.status === "shown"
      ? route.legs.filter((l) => l.tightGap).length
      : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Day-level banners — the loud, hard-to-skip signals */}
      {tightCount > 0 && !showingPreview && (
        <div className="anim-fade flex items-start gap-2.5 bg-destructive/10 p-3 text-destructive">
          <TriangleAlert size={17} className="mt-px shrink-0" />
          <p className="text-sm font-medium">
            {t("tightDay", { count: tightCount })}
          </p>
        </div>
      )}
      {showingPreview && (
        <div className="anim-fade flex items-center gap-2.5 bg-primary p-3 text-primary-foreground">
          <Eye size={17} className="shrink-0" />
          <p className="flex-1 text-sm font-medium">{t("previewBanner")}</p>
          <button
            onClick={togglePreview}
            className="focus-ring shrink-0 text-sm font-semibold underline underline-offset-2"
          >
            {t("previewOff")}
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-stretch">
        {/* Map + overlaid status chips */}
        <div className="relative isolate z-0 h-72 overflow-hidden border border-border bg-secondary sm:h-80 lg:h-auto lg:min-h-80">
          <div
            ref={nodeRef}
            className="h-full w-full bg-secondary"
            role="application"
            aria-label={t("ariaMap")}
          />
          <div className="pointer-events-none absolute top-3 left-3 z-[1100] flex flex-col items-start gap-2">
            {geo.status === "locating" && (
              <span className={CHIP}>
                <LoaderCircle size={13} className="animate-spin text-primary" />
                {t("locating")}
              </span>
            )}
            {(geo.status === "denied" || geo.status === "unavailable") && (
              <span className={CHIP}>
                <LocateFixed size={13} className="text-muted-foreground" />
                <span className="text-muted-foreground">{t("locationOff")}</span>
                <button
                  onClick={retryLocation}
                  className="focus-ring font-semibold text-primary hover:underline"
                >
                  {t("retry")}
                </button>
              </span>
            )}
            {route.status === "estimate" && (
              <span className={CHIP}>
                <TriangleAlert size={13} className="text-destructive" />
                {t("estimatedRoute")}
                <button
                  onClick={retryRoute}
                  className="focus-ring font-semibold text-primary hover:underline"
                >
                  {t("retry")}
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Stack: status rows, suggestion, legs timeline */}
        <div className="flex min-w-0 flex-col gap-3">
          {geo.status === "locating" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle size={15} className="animate-spin" /> {t("locating")}
            </p>
          ) : (
            geo.status !== "done" && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <LocateFixed size={15} className="mt-0.5 shrink-0" />
                {t("locationDenied")}
              </p>
            )
          )}

          {route.status === "estimate" && (
            <div className="flex items-start gap-2 bg-secondary p-3 text-sm">
              <TriangleAlert size={15} className="mt-0.5 shrink-0 text-destructive" />
              <span className="flex-1 text-muted-foreground">
                {t("routeError")}
              </span>
              <button
                onClick={retryRoute}
                className="focus-ring font-semibold text-primary hover:underline"
              >
                {t("retry")}
              </button>
            </div>
          )}

          {route.status === "shown" && suggestion && (
            <RouteSuggestionCard
              savedMinutes={suggestion.savedMinutes}
              order={suggestion.order}
              previewing={showingPreview}
              onToggle={togglePreview}
            />
          )}

          {route.status === "loading" ? (
            geo.status !== "locating" && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle size={15} className="animate-spin" />
                {t("loadingRoute")}
              </p>
            )
          ) : showingPreview && suggestion ? (
            <RouteLegs
              points={suggestion.points}
              legs={suggestion.legs}
              totalKm={suggestion.totalKm}
              totalMinutes={suggestion.totalMinutes}
              href={gmapsDirectionsUrl(suggestion.latlngs)}
              hovered={hovered}
              onHover={setHovered}
            />
          ) : (
            <RouteLegs
              points={route.points}
              legs={route.legs}
              totalKm={route.totalKm}
              totalMinutes={
                route.status === "shown" ? route.totalMinutes : undefined
              }
              href={gmapsDirectionsUrl(route.latlngs)}
              hovered={hovered}
              onHover={setHovered}
            />
          )}
        </div>
      </div>
    </div>
  );
}
