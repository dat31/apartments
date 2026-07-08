"use client";

import dynamic from "next/dynamic";
import { LocationMapSkeleton } from "./location-map-skeleton";

/* Lazy boundary for the map. Leaflet is the heaviest client dependency on
   the detail page, so the component (and leaflet with it) is code-split and
   only fetched in the browser when this section renders — never during SSR
   (leaflet needs `window`). The skeleton holds the section's footprint
   while the chunk downloads. */
export const LocationMapLazy = dynamic(
  () => import("./location-map").then((m) => m.LocationMap),
  { ssr: false, loading: () => <LocationMapSkeleton /> }
);
