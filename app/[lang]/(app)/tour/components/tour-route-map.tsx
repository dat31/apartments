"use client";

import "leaflet/dist/leaflet.css";
import "@/app/leaflet-theme.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type * as L from "leaflet";
import { Lightbulb, LoaderCircle, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kmBetween, type LatLng } from "@/lib/geo";
import {
  gmapsDirectionsUrl,
  legGapMinutes,
  type TourStop,
} from "../lib/route-plan";
import { RouteLegs, type RouteLeg } from "./route-legs";

/* Leaflet map of one day's tour route: numbered pins for every stop in
   schedule order, the renter's own location when granted, and the OSRM
   driving route between them with per-leg times listed below. When the drive
   between two tours takes longer than the free gap in the schedule, that leg
   is flagged and drawn in the destructive color. Client leaf — Leaflet
   touches `window` at import, so it's loaded dynamically inside the mount
   effect (same stack as the detail-page LocationMap). */

type GeoState =
  | { status: "locating" }
  | { status: "done"; point: LatLng }
  | { status: "denied" }
  | { status: "unavailable" };

type RouteState =
  | { status: "loading" }
  | {
      status: "shown";
      legs: RouteLeg[];
      totalKm: number;
      totalMinutes: number;
    }
  /* OSRM failed — dashed straight lines + crow-flies distances. */
  | { status: "estimate"; legs: RouteLeg[]; totalKm: number };

/* A cheaper visiting order found by the OSRM trip service — only computed
   for flexible days (≥3 stops, at least one time still pending) and only
   surfaced when it saves more than 5 minutes. Suggest-only: it never
   touches bookings. */
type Suggestion = {
  /** Stop numbers (0-based, schedule order) in the suggested visiting order. */
  order: number[];
  savedMinutes: number;
  legs: RouteLeg[];
  totalKm: number;
  totalMinutes: number;
  /** Route points in suggested order — for the Google Maps link. */
  points: LatLng[];
  /** Trip geometry for the preview polyline. */
  path: LatLng[];
};

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const OSRM_TRIP = "https://router.project-osrm.org/trip/v1/driving";

/* ① ② ③ … for the suggestion sentence; plain numbers past ⑨. */
const circled = (n: number) =>
  n >= 1 && n <= 9 ? String.fromCodePoint(0x245f + n) : String(n);

export function TourRouteMap({ stops }: { stops: TourStop[] }) {
  const t = useTranslations("tour.route");

  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const userLayerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.FeatureGroup | L.Polyline | null>(null);
  // Built lazily from suggestion.path on first preview; add/remove toggles it.
  const suggestionLayerRef = useRef<L.Polyline | null>(null);
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

  /* Mount the map with the day's numbered stop pins. */
  useEffect(() => {
    let cancelled = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
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
      // pin and stack their stop numbers ("1·2"). Teardrop shape via inline
      // !important — the global flat-system reset would square it off.
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
      for (const { coords, nums, titles } of pins.values()) {
        const icon = leaflet.divIcon({
          className: "",
          html:
            '<span style="display:block;width:30px;height:30px;position:relative;">' +
            `<span style="position:absolute;inset:0;border-radius:50% 50% 50% 0 !important;transform:rotate(-45deg);background:${primary};"></span>` +
            `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${bg};font-size:${nums.length > 1 ? 10 : 13}px;font-weight:700;">${nums.join("·")}</span>` +
            "</span>",
          iconSize: [30, 30],
          iconAnchor: [15, 28],
        });
        leaflet
          .marker(coords, { icon, keyboard: false, title: titles.join(" · ") })
          .addTo(map);
      }
      map.fitBounds(
        leaflet.latLngBounds(stops.map((s) => s.coords)).pad(0.2),
        { maxZoom: 15 }
      );

      // Leaflet mis-measures when it mounts inside an animating/flex ancestor.
      resizeTimer = setTimeout(() => map.invalidateSize(), 250);

      // Enable wheel-zoom only after the user clicks into the map.
      map.on("focus", () => map.scrollWheelZoom.enable());
      map.on("blur", () => map.scrollWheelZoom.disable());

      setReady(true);
    })();

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      mapRef.current?.remove();
      mapRef.current = null;
      userLayerRef.current = null;
      routeLayerRef.current = null;
      suggestionLayerRef.current = null;
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

  /* Draw the "you are here" dot once both the map and the location exist. */
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!ready || !map || !leaflet || geo.status !== "done") return;
    const { primary, bg } = colorsRef.current;
    userLayerRef.current?.remove();
    const dot = leaflet.divIcon({
      className: "",
      html: `<span style="display:block;width:18px;height:18px;border-radius:50% !important;background:${primary};border:3px solid ${bg};"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    userLayerRef.current = leaflet
      .marker(geo.point, { icon: dot, keyboard: false, title: t("yourLocation") })
      .addTo(map);
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
    const points: LatLng[] = fromUser
      ? [geo.point, ...stops.map((s) => s.coords)]
      : stops.map((s) => s.coords);
    const label = (i: number) =>
      fromUser && i === 0
        ? t("yourLocation")
        : t("stop", { n: i + (fromUser ? 0 : 1) });
    const legLabels = points
      .slice(0, -1)
      .map((_, i) => ({ from: label(i), to: label(i + 1) }));

    const drawFallback = (path: LatLng[]) => {
      routeLayerRef.current?.remove();
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
        `${OSRM}/${points.map(([lat, lng]) => `${lng},${lat}`).join(";")}` +
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
      if (!r || r.legs.length !== legLabels.length) throw new Error("no route");
      if (requestRef.current !== request || !mapRef.current) return;

      // A refetch (location retry, manual retry) invalidates any previous
      // order suggestion and its preview.
      suggestionLayerRef.current?.remove();
      suggestionLayerRef.current = null;
      setSuggestion(null);
      setPreviewing(false);

      // Leg i connects points[i] → points[i+1]; when the renter's location
      // leads the list, stop-to-stop legs start at leg 1. Only those have a
      // schedule gap to compare the drive against.
      const legs: RouteLeg[] = r.legs.map((leg, i) => {
        const minutes = Math.max(1, Math.round(leg.duration / 60));
        const pair = fromUser ? i - 1 : i;
        const gap =
          pair >= 0 ? legGapMinutes(stops[pair], stops[pair + 1]) : null;
        return {
          ...legLabels[i],
          km: leg.distance / 1000,
          minutes,
          tightGap:
            gap !== null && minutes > gap
              ? { gap: Math.max(0, gap), drive: minutes }
              : undefined,
        };
      });

      routeLayerRef.current?.remove();
      const group = leaflet
        .featureGroup(
          r.legs.map((leg, i) =>
            leaflet.polyline(
              leg.steps.flatMap((s) =>
                s.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng)
              ),
              {
                color: legs[i].tightGap
                  ? colorsRef.current.destructive
                  : colorsRef.current.primary,
                weight: 4,
                opacity: 0.8,
              }
            )
          )
        )
        .addTo(map);
      routeLayerRef.current = group;
      map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 15 });

      setRoute({
        status: "shown",
        legs,
        totalKm: r.distance / 1000,
        totalMinutes: Math.max(1, Math.round(r.duration / 60)),
      });

      // On a flexible day (≥3 stops, at least one time still pending) ask
      // the OSRM trip service whether another visiting order is meaningfully
      // faster. Best-effort: any failure just means no hint. The nested
      // try keeps a trip error from tripping the outer route fallback.
      if (stops.length < 3 || !stops.some((s) => s.tour.status === "pending"))
        return;
      try {
        const tripRes = await fetch(
          `${OSRM_TRIP}/${points.map(([lat, lng]) => `${lng},${lat}`).join(";")}` +
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
          legs: trip.legs.map((leg, k) => ({
            from: label(visitOrder[k]),
            to: label(visitOrder[k + 1]),
            km: leg.distance / 1000,
            minutes: Math.max(1, Math.round(leg.duration / 60)),
          })),
          totalKm: trip.distance / 1000,
          totalMinutes: Math.max(1, Math.round(trip.duration / 60)),
          points: visitOrder.map((i) => points[i]),
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
      drawFallback(points);
      setRoute({
        status: "estimate",
        legs: legLabels.map((leg, i) => ({
          ...leg,
          km: kmBetween(points[i], points[i + 1]),
        })),
        totalKm: points
          .slice(1)
          .reduce((sum, p, i) => sum + kmBetween(points[i], p), 0),
      });
    }
  }, [geo, stops, t]);

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

  return (
    <div>
      <div className="relative isolate z-0 overflow-hidden border border-border bg-secondary">
        <div
          ref={nodeRef}
          className="h-72 sm:h-80 w-full bg-secondary"
          role="application"
          aria-label={t("ariaMap")}
        />
      </div>

      {geo.status === "locating" ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle size={15} className="animate-spin" /> {t("locating")}
        </p>
      ) : (
        geo.status !== "done" && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <LocateFixed size={15} className="shrink-0" /> {t("locationDenied")}
            <Button variant="ghost" size="sm" className="h-7" onClick={retryLocation}>
              {t("retry")}
            </Button>
          </p>
        )
      )}

      {route.status === "shown" && suggestion && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Lightbulb size={15} className="shrink-0 text-primary" />
          <span>
            {t("suggestion", {
              order: suggestion.order.map((n) => circled(n + 1)).join(" → "),
              minutes: suggestion.savedMinutes,
            })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={togglePreview}
          >
            {t(previewing ? "previewOff" : "preview")}
          </Button>
        </p>
      )}

      {route.status === "loading" ? (
        geo.status !== "locating" && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle size={15} className="animate-spin" /> {t("loadingRoute")}
          </p>
        )
      ) : previewing && suggestion ? (
        <RouteLegs
          legs={suggestion.legs}
          totalKm={suggestion.totalKm}
          totalMinutes={suggestion.totalMinutes}
          href={gmapsDirectionsUrl(suggestion.points)}
        />
      ) : (
        <RouteLegs
          legs={route.legs}
          totalKm={route.totalKm}
          totalMinutes={route.status === "shown" ? route.totalMinutes : undefined}
          href={gmapsDirectionsUrl(
            geo.status === "done"
              ? [geo.point, ...stops.map((s) => s.coords)]
              : stops.map((s) => s.coords)
          )}
          estimated={route.status === "estimate"}
          onRetry={route.status === "estimate" ? retryRoute : undefined}
        />
      )}
    </div>
  );
}
