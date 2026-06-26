"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { AccountMenu } from "@/components/account-menu";
import { ManageProfileDialog } from "@/components/manage-profile-dialog";
import { useSaved } from "@/hooks/use-saved";
import { useProfile } from "@/hooks/use-profile";
import { useUser, useSignOut } from "@/hooks/use-auth";
import { Building2, Calendar, Heart, Search } from "lucide-react";

export function SiteHeader() {
  const { saved } = useSaved();
  const { profile, updateProfile, setRole } = useProfile();
  const { data: user } = useUser();
  const signOut = useSignOut();
  const [manageOpen, setManageOpen] = React.useState(false);
  const pathname = usePathname();
  const savedActive = pathname === "/apartments/saved";
  const toursActive = pathname === "/tour";
  const isOwner = profile.role === "owner";
  const isSignedIn = !!user;

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="container mx-auto px-5 sm:px-8 h-20 flex items-center gap-4">
        <Link href="/apartments" className="focus-ring shrink-0" aria-label="Home">
          <Logo size={24} />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {isSignedIn ? (
            <>
              {!isOwner && (
                <Button
                  asChild
                  variant={toursActive ? "default" : "ghost"}
                  size="default"
                  className="h-9 gap-1.5 px-3"
                >
                  <Link href="/tour">
                    <Calendar size={16} />
                    <span className="hidden sm:inline">Tours</span>
                  </Link>
                </Button>
              )}

              <Button
                asChild
                variant={savedActive ? "default" : "ghost"}
                size="default"
                className="relative h-9 gap-1.5 px-3"
              >
                <Link href="/apartments/saved">
                  <Heart size={16} />
                  <span className="hidden sm:inline">Saved</span>
                  {saved.length > 0 && (
                    <span
                      className={cn(
                        "inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-semibold tabular-nums",
                        savedActive
                          ? "bg-primary-foreground text-primary"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      {saved.length}
                    </span>
                  )}
                </Link>
              </Button>

              <span className="hidden md:inline-flex items-center gap-2 h-9 px-3 bg-secondary text-secondary-foreground text-sm font-medium">
                {isOwner ? <Building2 size={16} /> : <Search size={16} />}
                {isOwner ? "Owner" : "Renter"}
              </span>

              <AccountMenu
                profile={profile}
                onManage={() => setManageOpen(true)}
                onSwitchRole={setRole}
                onSignOut={() => signOut.mutate()}
              />
            </>
          ) : (
            <Button asChild size="default" className="h-9 px-4">
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>

      <ManageProfileDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        profile={profile}
        onSave={(data) => updateProfile(data)}
      />
    </header>
  );
}
