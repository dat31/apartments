"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  onManage,
  onSwitchRole,
  onSignOut,
}: {
  profile: Profile;
  onManage: () => void;
  onSwitchRole: (role: Role) => void;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [open, setOpen] = React.useState(false);

  const role = profile.role;
  const first = (profile.name || "there").trim().split(/\s+/)[0];
  const roleLabel = role === "owner" ? "Hosting on Danapa" : "Renting on Danapa";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 h-11 pl-1.5 pr-2.5 transition-colors focus-ring cursor-pointer active:scale-[.98]",
            open ? "bg-muted" : "hover:bg-muted"
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
              {profile.name || "Your account"}
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
            {role === "owner" ? "Owner" : "Renter"}
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
            <Settings size={18} /> Manage profile
          </DropdownMenuItem>
          {role === "owner" && (
            <DropdownMenuItem
              className="px-4 h-11 text-[15px] rounded-none"
              onSelect={() => router.push("/owner/dashboard")}
            >
              <LayoutGrid size={18} /> Owner dashboard
            </DropdownMenuItem>
          )}
          {role === "owner" && (
            <DropdownMenuItem
              className="px-4 h-11 text-[15px] rounded-none"
              onSelect={() => router.push("/owner/you")}
            >
              <Eye size={18} /> View public profile
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="px-4 h-11 text-[15px] rounded-none"
            onSelect={() => onSwitchRole(role === "owner" ? "renter" : "owner")}
          >
            <ArrowLeftRight size={18} /> Switch to{" "}
            {role === "owner" ? "renting" : "listing"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-4 h-11 text-[15px] rounded-none"
            onSelect={(e) => {
              e.preventDefault();
              setTheme(isDark ? "light" : "dark");
            }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="mx-0" />

        <div className="py-1.5">
          <DropdownMenuItem
            variant="destructive"
            className="px-4 h-11 text-[15px] rounded-none"
            onSelect={onSignOut}
          >
            <LogOut size={18} /> Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
