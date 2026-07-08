"use client";

import dynamic from "next/dynamic";
import { TourRouteSkeleton } from "./tour-route-skeleton";

/* Lazy boundary for the route map. Leaflet is heavy and the route view is
   opt-in (behind the "View route" toggle), so the component — and leaflet
   with it — is code-split and only fetched in the browser when a day's
   route is opened; never during SSR (leaflet needs `window`). */
export const TourRouteMapLazy = dynamic(
  () => import("./tour-route-map").then((m) => m.TourRouteMap),
  { ssr: false, loading: () => <TourRouteSkeleton /> }
);
