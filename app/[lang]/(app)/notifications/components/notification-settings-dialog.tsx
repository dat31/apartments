"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Settings } from "lucide-react";

/* Lazy boundary for the switches. The shell has to be mounted for its trigger
   to exist, but the switches do not: Radix mounts content on open, so this
   chunk — the switch primitive and the preferences query with it — is fetched
   on the first click and never for the many readers who only skim the feed.
   The skeleton holds the body's height so the dialog doesn't grow under the
   cursor while it lands. */
const NotificationSettingsFields = dynamic(
  () =>
    import("./notification-settings-fields").then(
      (m) => m.NotificationSettingsFields
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-5 px-6 pb-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="skeleton size-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <Skeleton className="skeleton h-4 w-40" />
              <Skeleton className="skeleton mt-2 h-3 w-full max-w-64" />
            </div>
            <Skeleton className="skeleton mt-1 h-5 w-9 shrink-0" />
          </div>
        ))}
        <Skeleton className="skeleton h-8 w-full" />
      </div>
    ),
  }
);

/* What shows up in the feed.

   One switch per category and one channel only — in app. There is deliberately
   no email column: nothing in this codebase sends email (the saved-search
   alert function is inert and superseded), and a switch that silently does
   nothing is a worse answer than an absent one. When a sender exists this
   grows a second column and the preferences row grows a second flag; until
   then the dialog says what it can actually do.

   Uncontrolled: the trigger lives inside the dialog and the footer button is a
   DialogClose, so Radix owns the open state and no `useState` in this tree —
   or in the feed above it — changes when the dialog opens (AGENTS.md, "Let the
   dialog own its own open state"). Opening settings used to re-render the
   whole feed; now it renders nothing but the dialog.

   The trigger is why this component is always mounted, and why the switches
   are a separate one: Radix mounts content on open, so the preferences query
   inside NotificationSettingsFields runs then rather than on every page load. */
export function NotificationSettingsDialog() {
  const t = useTranslations("notifications.settings");
  const isMobile = useIsMobile();

  const trigger = (
    <Button variant="ghost" size="sm">
      <Settings size={15} /> {t("open")}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="px-6 pt-2 pb-7 text-left">
            <DrawerTitle className="text-xl font-semibold tracking-tight">
              {t("title")}
            </DrawerTitle>
            <DrawerDescription>{t("subtitle")}</DrawerDescription>
          </DrawerHeader>
          {/* No Done button here: a drawer closes by dragging it down or
              tapping outside, and vaul already renders the grabber that says
              so. The dialog's footer exists because a modal has no such
              gesture. */}
          <div className="overflow-y-auto pb-6">
            <NotificationSettingsFields />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
        {/* pb-7: with the rules gone, the gap under the subtitle is the only
            thing separating the title block from the first switch, so it has
            to be wider than the gap between the switches themselves. */}
        <DialogHeader className="px-6 pt-6 pb-7">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          <NotificationSettingsFields />
        </div>
        {/* DialogFooter's own classes are `-mx-4 -mb-4 … border-t bg-muted/50
            p-4`: the negative margins cancel the content's default p-4 so the
            bar can sit flush against the dialog's edges. This dialog sets p-0
            and lays its own padding out per section, so those margins have
            nothing to cancel and push the bar 16px past the edge on each side
            — hence mx-0/mb-0. The rule and the tint go with the flat body. */}
        <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent px-6 pt-4 pb-6">
          <DialogClose asChild>
            <Button>{t("done")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
