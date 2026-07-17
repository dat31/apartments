"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Bell, Bookmark, Heart, User } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

/* Sign-in gate for saving a search: alerts email the renter, so saving needs
   an account. Sign-in returns to the current browse URL (filters intact) via
   the signin page's ?next= param. */
export function SaveSearchSignInGate({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("apartments.savedSearches.gate");
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qs = searchParams.toString();
  // i18n usePathname strips the locale prefix; signin re-adds it on push.
  const signInHref = `/signin?next=${encodeURIComponent(
    qs ? `${pathname}?${qs}` : pathname
  )}`;

  const benefits = [
    { icon: Bookmark, title: t("saveTitle"), desc: t("saveDesc") },
    { icon: Bell, title: t("alertTitle"), desc: t("alertDesc") },
    { icon: Heart, title: t("syncTitle"), desc: t("syncDesc") },
  ];

  const body = (
    <ul className="flex flex-col gap-3">
      {benefits.map(({ icon: Icon, title, desc }) => (
        <li key={title} className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center bg-secondary text-primary">
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{title}</p>
            <p className="text-pretty text-sm text-muted-foreground">{desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        {t("notNow")}
      </Button>
      <Button asChild>
        <Link href={signInHref}>
          <User size={16} /> {t("signIn")}
        </Link>
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg">{t("title")}</DrawerTitle>
            <DrawerDescription>{t("description")}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4">{body}</div>
          <DrawerFooter className="flex-row justify-end">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {body}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
