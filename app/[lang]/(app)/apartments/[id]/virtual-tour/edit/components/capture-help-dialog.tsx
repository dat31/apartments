"use client";

import { useTranslations } from "next-intl";
import { Camera, Image as ImageIcon, Lightbulb, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* "How do I take one?" — the question that decides whether a host can use
   this page at all. A host who cannot produce an equirectangular photo has no
   way in, and most have never heard the word, so this teaches the three ways
   to get one rather than defining the term. Reachable from the empty state
   and from every refused upload. */
export function CaptureHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("virtualTourEditor");

  const ways = [
    { icon: <Smartphone size={18} />, title: t("how1"), body: t("how1Body") },
    { icon: <Camera size={18} />, title: t("how2"), body: t("how2Body") },
    { icon: <ImageIcon size={18} />, title: t("how3"), body: t("how3Body") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("howTitle")}</DialogTitle>
          <DialogDescription>{t("howLead")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {ways.map((way) => (
            <div key={way.title} className="flex gap-3.5">
              <span className="grid size-9 shrink-0 place-items-center bg-secondary text-secondary-foreground">
                {way.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-medium">{way.title}</p>
                <p className="text-[13.5px] text-muted-foreground text-pretty">{way.body}</p>
              </div>
            </div>
          ))}
          <p className="bg-muted p-3.5 text-[13px] text-pretty">
            <Lightbulb size={15} className="mr-1.5 -mt-0.5 inline text-primary" />
            {t("howTip")}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("howClose")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
