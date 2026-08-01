"use client";

import dynamic from "next/dynamic";
import { TourStageSkeleton } from "./tour-skeleton";

/* Lazy boundary for the 360° viewer. three.js is by far the heaviest client
   dependency in the app (~150 KB gzipped), so it is fetched only in the
   browser, only once this route renders, and never during SSR — WebGL needs a
   real canvas. The detail page links here rather than embedding the viewer
   precisely so that chunk never enters its graph (plan §14.1). */
export const PanoramaViewerLazy = dynamic(
  () => import("./panorama-viewer").then((m) => m.PanoramaViewer),
  { ssr: false, loading: () => <TourStageSkeleton /> }
);
