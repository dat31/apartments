"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { cva } from "class-variance-authority";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { ProfileAvatar } from "@/components/profile-avatar";
import { type Profile } from "@/schemas/profile";
import {
  Calendar,
  Eye,
  Heart,
  LayoutGrid,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Settings,
  Sun,
  X,
} from "lucide-react";

const navRow = cva(
  "flex w-full items-center gap-3.5 h-12 px-5 text-left text-[15px] font-medium transition-colors focus-ring",
  {
    variants: {
      tone: {
        default: "text-foreground hover:bg-muted",
        active: "bg-secondary text-secondary-foreground",
        danger:
          "text-destructive hover:bg-destructive hover:text-destructive-foreground",
      },
    },
    defaultVariants: { tone: "default" },
  }
);

const sectionLabel =
  "px-5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export function MobileNav({
  profile,
  userId,
  savedCount,
  savedActive,
  toursActive,
  messagesActive,
  onManage,
  onSignOut,
  className,
}: {
  profile: Profile;
  userId?: string;
  savedCount: number;
  savedActive: boolean;
  toursActive: boolean;
  messagesActive: boolean;
  onManage: () => void;
  onSignOut: () => void;
  className?: string;
}) {
  const header = useTranslations("header");
  const t = useTranslations("account");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isOwner = profile.role === "owner";
  const roleLabel = isOwner ? t("hosting") : t("renting");

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("size-11", className)}
          aria-label={header("openMenu")}
        >
          <Menu className="size-[22px]" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="data-[vaul-drawer-direction=right]:w-[88%] data-[vaul-drawer-direction=right]:max-w-90 data-[vaul-drawer-direction=right]:sm:max-w-90">
        {/* identity */}
        <DrawerHeader className="flex-row items-center gap-3 bg-muted px-5 py-5">
          <ProfileAvatar name={profile.name} palette={profile.palette} size={46} />
          <div className="min-w-0 flex-1">
            <DrawerTitle className="font-sans text-sm font-semibold leading-tight truncate">
              {profile.name || t("yourAccount")}
            </DrawerTitle>
            <DrawerDescription className="text-xs truncate mt-0.5">
              {profile.email || roleLabel}
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground hover:bg-background"
              aria-label={header("closeMenu")}
            >
              <X size={18} />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Always rendered: owners get no Tours or Saved rows, but Messages
              is theirs too — the desktop header shows it to both roles, and
              without it the inbox has no mobile entry point at all. */}
          <div className="py-1.5">
            <p className={sectionLabel}>{header("browse")}</p>
            {!isOwner && (
              <DrawerClose asChild>
                <Link
                  href="/tour"
                  aria-current={toursActive ? "page" : undefined}
                  className={navRow({ tone: toursActive ? "active" : "default" })}
                >
                  <Calendar size={19} className="shrink-0 opacity-90" />
                  <span className="flex-1 leading-tight truncate">
                    {header("tours")}
                  </span>
                </Link>
              </DrawerClose>
            )}
            <DrawerClose asChild>
              <Link
                href="/messages"
                aria-current={messagesActive ? "page" : undefined}
                className={navRow({
                  tone: messagesActive ? "active" : "default",
                })}
              >
                <MessageCircle size={19} className="shrink-0 opacity-90" />
                <span className="flex-1 leading-tight truncate">
                  {header("messages")}
                </span>
              </Link>
            </DrawerClose>
            {!isOwner && (
              <DrawerClose asChild>
                <Link
                  href="/apartments/saved"
                  aria-current={savedActive ? "page" : undefined}
                  className={navRow({ tone: savedActive ? "active" : "default" })}
                >
                  <Heart size={19} className="shrink-0 opacity-90" />
                  <span className="flex-1 leading-tight truncate">
                    {header("saved")}
                  </span>
                  {savedCount > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-semibold tabular-nums",
                        savedActive
                          ? "bg-secondary-foreground text-secondary"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      {savedCount}
                    </span>
                  )}
                </Link>
              </DrawerClose>
            )}
          </div>

          <Separator />

          {/* account */}
          <div className="py-1.5">
            <p className={sectionLabel}>{header("account")}</p>
            <DrawerClose asChild>
              <button type="button" className={navRow()} onClick={onManage}>
                <Settings size={19} className="shrink-0 opacity-90" />
                <span className="flex-1 leading-tight truncate">
                  {t("manageProfile")}
                </span>
              </button>
            </DrawerClose>
            {isOwner && (
              <DrawerClose asChild>
                <Link href="/owner/dashboard" className={navRow()}>
                  <LayoutGrid size={19} className="shrink-0 opacity-90" />
                  <span className="flex-1 leading-tight truncate">
                    {t("ownerDashboard")}
                  </span>
                </Link>
              </DrawerClose>
            )}
            {isOwner && userId && (
              <DrawerClose asChild>
                <Link href={`/owner/${userId}`} className={navRow()}>
                  <Eye size={19} className="shrink-0 opacity-90" />
                  <span className="flex-1 leading-tight truncate">
                    {t("viewPublic")}
                  </span>
                </Link>
              </DrawerClose>
            )}
            {/* Theme toggle keeps the drawer open, mirroring the desktop menu. */}
            <button
              type="button"
              className={navRow()}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun size={19} className="shrink-0 opacity-90" />
              ) : (
                <Moon size={19} className="shrink-0 opacity-90" />
              )}
              <span className="flex-1 leading-tight truncate">
                {isDark ? t("lightMode") : t("darkMode")}
              </span>
            </button>
          </div>

          <Separator />

          <div className="py-1.5">
            <DrawerClose asChild>
              <button
                type="button"
                className={navRow({ tone: "danger" })}
                onClick={onSignOut}
              >
                <LogOut size={19} className="shrink-0 opacity-90" />
                <span className="flex-1 leading-tight truncate">{t("signOut")}</span>
              </button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
