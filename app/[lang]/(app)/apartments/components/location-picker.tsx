"use client";

import "leaflet/dist/leaflet.css";
import "@/app/leaflet-theme.css";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type * as L from "leaflet";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { districtCenter } from "@/lib/geo";

/* Map pin picker for the listing form: click the map (or drag the pin) to
   set the home's exact coordinates. Starts centered on the chosen district;
   leaflet is imported dynamically inside the effect (it touches `window`),
   which also code-splits it out of the form's initial bundle. */

export type PickedPoint = { lat: number; lng: number };

export function LocationPicker({
  value,
  district,
  onChange,
}: {
  value: PickedPoint | null;
  district: string;
  onChange: (next: PickedPoint | null) => void;
}) {
  const t = useTranslations("listingForm.location");

  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pinIconRef = useRef<L.DivIcon | null>(null);
  // Latest values for handlers/init registered once — the map is created a
  // single time, so it must not close over stale props.
  const onChangeRef = useRef(onChange);
  const districtRef = useRef(district);
  useEffect(() => {
    onChangeRef.current = onChange;
    districtRef.current = district;
  });

  const [ready, setReady] = useState(false);

  /* Mount the map once. */
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

      // Same teardrop as the detail map; inline !important keeps the radius
      // against the global flat-system reset.
      pinIconRef.current = leaflet.divIcon({
        className: "",
        html:
          '<span style="display:block;width:30px;height:30px;position:relative;">' +
          `<span style="position:absolute;inset:0;border-radius:50% 50% 50% 0 !important;transform:rotate(-45deg);background:${primary};"></span>` +
          `<span style="position:absolute;top:9px;left:9px;width:12px;height:12px;border-radius:50% !important;background:${bg};"></span>` +
          "</span>",
        iconSize: [30, 30],
        iconAnchor: [15, 28],
      });

      const map = leaflet.map(nodeRef.current, {
        center: districtCenter(districtRef.current),
        zoom: 13,
        scrollWheelZoom: false, // click to focus first, as on the detail map
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

      map.on("click", (e: L.LeafletMouseEvent) =>
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
      );
      map.on("focus", () => map.scrollWheelZoom.enable());
      map.on("blur", () => map.scrollWheelZoom.disable());

      resizeTimer = setTimeout(() => map.invalidateSize(), 250);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  /* Sync the marker with the form value. */
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!ready || !map || !leaflet) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
    } else {
      const marker = leaflet
        .marker([value.lat, value.lng], {
          icon: pinIconRef.current ?? undefined,
          draggable: true,
          keyboard: false,
        })
        .addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
      markerRef.current = marker;
      map.panTo([value.lat, value.lng]);
    }
  }, [ready, value]);

  /* Changing district before a pin is set recenters the map there. */
  useEffect(() => {
    if (ready && mapRef.current && !markerRef.current) {
      mapRef.current.setView(districtCenter(district), 13);
    }
  }, [ready, district]);

  return (
    <div>
      <div className="relative isolate z-0 overflow-hidden border border-border bg-secondary">
        <div
          ref={nodeRef}
          className="h-64 sm:h-72 w-full bg-secondary"
          role="application"
          aria-label={t("ariaMap")}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {value
            ? t("pinSet", {
                lat: value.lat.toFixed(5),
                lng: value.lng.toFixed(5),
              })
            : t("hint")}
        </p>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X /> {t("clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
