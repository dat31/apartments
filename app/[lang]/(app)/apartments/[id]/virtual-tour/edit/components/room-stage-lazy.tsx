"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/* Lazy boundary for the authoring stage, for the same reason the renter's
   viewer has one: it pulls in three.js, and the editor's first paint — the
   room list, the checklist, the empty state — should not wait on the
   renderer. */
export const RoomStageLazy = dynamic(
  () => import("./room-stage").then((m) => m.RoomStage),
  {
    ssr: false,
    loading: () => <Skeleton className="skeleton aspect-[4/3] w-full xl:aspect-[3/2]" />,
  }
);
