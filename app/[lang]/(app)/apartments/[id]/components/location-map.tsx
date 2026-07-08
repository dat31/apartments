"use client";

import "leaflet/dist/leaflet.css";
import "./leaflet-theme.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type * as L from "leaflet";
import { LoaderCircle, LocateFixed, MapPin, Route, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kmBetween, type LatLng } from "../lib/geo";

/* Leaflet map for the detail page's "Where you'll be" section.
   Client leaf: Leaflet touches `window` at import time, so the module is
   loaded dynamically inside an effect. Geolocation is requested on mount so
   the "distance from me" readout appears immediately, and directions are
   drawn on the map itself (OSRM route) rather than linking out. */

type GeoState =
  | { status: "locating" }
  | { status: "done"; point: LatLng; km: number }
  | { status: "denied" }
  | { status: "unavailable" };

type RouteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "shown"; km: number; minutes: number }
  | { status: "error" };

const OSRM = "https://router.project-osrm.org/route/v1/driving";

export function LocationMap({
  lat,
  lng,
  place,
}: {
  lat: number;
  lng: number;
  place: string;
}) {
  const t = useTranslations("detail.map");
  const format = useFormatter();

  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  // Leaflet writes SVG presentation attributes, which don't evaluate var() —
  // resolve the design tokens to concrete colors once the map mounts.
  const colorsRef = useRef({ primary: "#1c1c1c", bg: "#ffffff" });

  const [ready, setReady] = useState(false);
  const [geo, setGeo] = useState<GeoState>({ status: "locating" });
  const [route, setRoute] = useState<RouteState>({ status: "idle" });

  const distanceLabel = (km: number) =>
    km < 1
      ? format.number(Math.round(km * 1000), { style: "unit", unit: "meter" })
      : format.number(km, {
          style: "unit",
          unit: "kilometer",
          maximumFractionDigits: km < 10 ? 1 : 0,
        });

  /* Mount the map. */
  useEffect(() => {
    let cancelled = false;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !nodeRef.current || mapRef.current) return;
      leafletRef.current = leaflet;

      const center: LatLng = [lat, lng];
      const cs = getComputedStyle(nodeRef.current);
      const primary = cs.getPropertyValue("--primary").trim() || "#1c1c1c";
      const bg = cs.getPropertyValue("--background").trim() || "#ffffff";
      colorsRef.current = { primary, bg };

      const map = leaflet.map(nodeRef.current, {
        center,
        zoom: 14,
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

      // Approximate-location privacy circle — exact address shared after booking.
      leaflet
        .circle(center, {
          radius: 350,
          color: primary,
          weight: 1.5,
          opacity: 0.5,
          fillColor: primary,
          fillOpacity: 0.12,
        })
        .addTo(map);

      // The pin keeps its teardrop shape via inline !important — the global
      // flat-system reset (`* { border-radius: 0 !important }`) would
      // otherwise square it off.
      const pin = leaflet.divIcon({
        className: "",
        html:
          '<span style="display:block;width:30px;height:30px;position:relative;">' +
          `<span style="position:absolute;inset:0;border-radius:50% 50% 50% 0 !important;transform:rotate(-45deg);background:${primary};"></span>` +
          `<span style="position:absolute;top:9px;left:9px;width:12px;height:12px;border-radius:50% !important;background:${bg};"></span>` +
          "</span>",
        iconSize: [30, 30],
        iconAnchor: [15, 28],
      });
      leaflet.marker(center, { icon: pin, keyboard: false }).addTo(map);

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
    };
  }, [lat, lng]);

  /* setState only happens inside the geolocation callbacks, so this is safe
     to call from the mount effect (no sync setState in an effect body). */
  const requestPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setGeo({ status: "done", point, km: kmBetween(point, [lat, lng]) });
      },
      (err) => setGeo({ status: err.code === 1 ? "denied" : "unavailable" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [lat, lng]);

  /* Ask for the location right away so the distance shows immediately —
     the initial state is already "locating". */
  useEffect(() => {
    if (!navigator.geolocation) {
      const t = setTimeout(() => setGeo({ status: "unavailable" }), 0);
      return () => clearTimeout(t);
    }
    requestPosition();
  }, [requestPosition]);

  const retry = () => {
    if (!navigator.geolocation) {
      setGeo({ status: "unavailable" });
      return;
    }
    setGeo({ status: "locating" });
    requestPosition();
  };

  /* Once both the map and the user's location exist, draw the "you are here"
     dot plus a dashed sightline to the home, and frame both. */
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!ready || !map || !leaflet || geo.status !== "done") return;

    const { primary, bg } = colorsRef.current;
    const center: LatLng = [lat, lng];
    userLayerRef.current?.remove();

    const grp = leaflet.layerGroup();
    leaflet
      .polyline([geo.point, center], {
        color: primary,
        weight: 2,
        opacity: 0.45,
        dashArray: "3 6",
      })
      .addTo(grp);
    const dot = leaflet.divIcon({
      className: "",
      html: `<span style="display:block;width:18px;height:18px;border-radius:50% !important;background:${primary};border:3px solid ${bg};"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    leaflet
      .marker(geo.point, { icon: dot, keyboard: false, title: t("yourLocation") })
      .addTo(grp);
    grp.addTo(map);
    userLayerRef.current = grp;
    map.fitBounds(leaflet.latLngBounds([geo.point, center]).pad(0.35), {
      maxZoom: 15,
    });
  }, [ready, geo, lat, lng, t]);

  /* Fetch a driving route (OSRM) and draw it on the map. */
  const showDirections = useCallback(async () => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (geo.status !== "done" || !map || !leaflet) return;
    setRoute({ status: "loading" });
    try {
      const [uLat, uLng] = geo.point;
      const res = await fetch(
        `${OSRM}/${uLng},${uLat};${lng},${lat}?overview=full&geometries=geojson`
      );
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const data = (await res.json()) as {
        routes?: {
          distance: number;
          duration: number;
          geometry: { coordinates: [number, number][] };
        }[];
      };
      const r = data.routes?.[0];
      if (!r) throw new Error("no route");
      if (!mapRef.current) return; // unmounted while fetching

      const path = r.geometry.coordinates.map(
        ([x, y]) => [y, x] as LatLng
      );
      routeLayerRef.current?.remove();
      const line = leaflet
        .polyline(path, {
          color: colorsRef.current.primary,
          weight: 4,
          opacity: 0.8,
        })
        .addTo(map);
      routeLayerRef.current = line;
      map.fitBounds(line.getBounds().pad(0.2));
      setRoute({
        status: "shown",
        km: r.distance / 1000,
        minutes: Math.max(1, Math.round(r.duration / 60)),
      });
    } catch {
      setRoute({ status: "error" });
    }
  }, [geo, lat, lng]);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin size={15} /> {place}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {geo.status === "done" ? (
            <span
              className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3 h-8 text-sm font-medium"
              title={t("awayHint")}
            >
              <LocateFixed size={15} className="text-primary" />
              <span className="tabular-nums">
                {t("away", { distance: distanceLabel(geo.km) })}
              </span>
            </span>
          ) : (
            <Button
              variant="secondary"
              onClick={retry}
              disabled={geo.status === "locating"}
            >
              {geo.status === "locating" ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <LocateFixed />
              )}
              {t(geo.status === "locating" ? "locating" : geo.status)}
            </Button>
          )}
          {geo.status === "done" &&
            (route.status === "shown" ? (
              <span className="inline-flex items-center gap-1.5 px-3 h-8 text-sm font-medium text-primary">
                <Route size={15} />
                <span className="tabular-nums">
                  {t("routeSummary", {
                    distance: distanceLabel(route.km),
                    minutes: route.minutes,
                  })}
                </span>
              </span>
            ) : (
              <Button
                variant="secondary"
                onClick={showDirections}
                disabled={route.status === "loading"}
              >
                {route.status === "loading" ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Route />
                )}
                {t(route.status === "error" ? "directionsError" : "directions")}
              </Button>
            ))}
        </div>
      </div>

      <div className="relative isolate z-0 overflow-hidden border border-border bg-secondary">
        <div
          ref={nodeRef}
          className="h-72 sm:h-80 w-full bg-secondary"
          role="application"
          aria-label={t("ariaMap", { place })}
        />
        <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex items-center gap-1.5 border border-border bg-popover/95 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur">
          <ShieldCheck size={13} className="text-primary" /> {t("approx")}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("approxNote")}</p>
    </div>
  );
}
