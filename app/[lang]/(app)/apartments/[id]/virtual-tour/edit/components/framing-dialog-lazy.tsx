"use client";

import dynamic from "next/dynamic";

/* Lazy boundary for the framing dialog, for the same reason the renter's
   viewer has one: it pulls in three.js, and an owner naming rooms shouldn't
   pay for the renderer until they open it. */
export const FramingDialogLazy = dynamic(
  () => import("./framing-dialog").then((m) => m.FramingDialog),
  { ssr: false }
);
