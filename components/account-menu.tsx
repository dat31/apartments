"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useTheme } from "next-themes";
import { type Profile, type Role } from "@/schemas/profile";
import { ArrowLeftRight, Building2, ChevronDown, Eye, LayoutGrid, LogOut, MapPin, Moon, Search, Settings, Sun } from "lucide-react";

export function AccountMenu({
  profile,
  userId,
  onManage,
  onSwitchRole,
  onSignOut,
  className,
}: {
  profile: Profile;
  userId?: string;
  onManage: () => void;
  onSwitchRole: (role: Role) => void;
  onSignOut: () => void;
  className?: string;
}) {
  const router = useRouter();
  const t = useTranslations("account");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [open, setOpen] = React.useState(false);

  const role = profile.role;
  const first = (profile.name || t("fallbackName")).trim().split(/\s+/)[0];
  const roleLabel = role === "owner" ? t("hosting") : t("renting");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 h-11 pl-1.5 pr-2.5 transition-colors focus-ring cursor-pointer active:scale-[.98]",
            open ? "bg-muted" : "hover:bg-muted",
            className
          )}
        >
          <ProfileAvatar name={profile.name} palette={profile.palette} size={32} />
          <span className="hidden lg:block text-sm font-medium leading-tight max-w-[9rem] truncate">
            {first}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 p-0 origin-top-right"
      >
        {/* identity */}
        <div className="flex items-center gap-3 px-4 py-4 bg-muted">
          <ProfileAvatar name={profile.name} palette={profile.palette} size={44} />
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">
              {profile.name || t("yourAccount")}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {profile.email || roleLabel}
            </p>
          </div>
        </div>

        {/* role pill row */}
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-secondary text-secondary-foreground">
            {role === "owner" ? <Building2 size={13} /> : <Search size={13} />}
            {role === "owner" ? t("owner") : t("renter")}
          </span>
          {profile.location && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <MapPin size={13} /> {profile.location}
            </span>
          )}
        </div>

        <DropdownMenuSeparator className="mx-0" />

        <div className="py-1.5">
          <DropdownMenuItem
            className="px-4 h-11 text-[15px] rounded-none"
            onSelect={onManage}
          >
            <Settings size={18} /> {t("manageProfile")}
          </DropdownMenuItem>
          {role === "owner" && (
            <DropdownMenuItem
              className="px-4 h-11 text-[15px] rounded-none"
              onSelect={() => router.push("/owner/dashboard")}
            >
              <LayoutGrid size={18} /> {t("ownerDashboard")}
            </DropdownMenuItem>
          )}
          {role === "owner" && userId && (
            <DropdownMenuItem
              className="px-4 h-11 text-[15px] rounded-none"
              onSelect={() => router.push(`/owner/${userId}`)}
            >
              <Eye size={18} /> {t("viewPublic")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="px-4 h-11 text-[15px] rounded-none"
            onSelect={() => onSwitchRole(role === "owner" ? "renter" : "owner")}
          >
            <ArrowLeftRight size={18} />{" "}
            {role === "owner" ? t("switchToRenting") : t("switchToListing")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-4 h-11 text-[15px] rounded-none"
            onSelect={(e) => {
              e.preventDefault();
              setTheme(isDark ? "light" : "dark");
            }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? t("lightMode") : t("darkMode")}
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="mx-0" />

        <div className="py-1.5">
          <DropdownMenuItem
            variant="destructive"
            className="px-4 h-11 text-[15px] rounded-none"
            onSelect={onSignOut}
          >
            <LogOut size={18} /> {t("signOut")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
