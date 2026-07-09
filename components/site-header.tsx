"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { AccountMenu } from "@/components/account-menu";
import { MobileNav } from "@/components/mobile-nav";
import { ManageProfileDialog } from "@/components/manage-profile-dialog";
import { useSaved } from "@/hooks/use-saved";
import { useProfile } from "@/hooks/use-profile";
import { useUser, useSignOut } from "@/hooks/auth";
import { Building2, Calendar, Heart, Search } from "lucide-react";

export function SiteHeader() {
  const { saved } = useSaved();
  const { profile, updateProfile, setRole } = useProfile();
  const { data: user } = useUser();
  const signOut = useSignOut();
  const header = useTranslations("header");
  const [manageOpen, setManageOpen] = React.useState(false);
  const pathname = usePathname();
  const savedActive = pathname === "/apartments/saved";
  const toursActive = pathname === "/tour";
  const isOwner = profile.role === "owner";
  // Auth, saved count and role all come from client-only stores (react-query
  // cache seeded from cookies, localStorage). They're unknown during SSR, so
  // gate the auth-dependent header on mount: server and first client render
  // both show the signed-out shell, then the real state reveals after mount.
  // This keeps the (app) layout statically prerenderable (no server cookie
  // read) while avoiding a server/client hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isSignedIn = mounted && !!user;

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="container mx-auto px-5 sm:px-8 h-20 flex items-center gap-4">
        <Link href="/apartments" className="focus-ring shrink-0" aria-label="Home">
          <Logo size={24} />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {isSignedIn ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                {!isOwner && (
                  <Button
                    asChild
                    variant={toursActive ? "default" : "ghost"}
                    size="default"
                    className="h-9 gap-1.5 px-3"
                  >
                    <Link href="/tour">
                      <Calendar size={16} />
                      {header("tours")}
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
                    {header("saved")}
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

                <span className="inline-flex items-center gap-2 h-9 px-3 bg-secondary text-secondary-foreground text-sm font-medium">
                  {isOwner ? <Building2 size={16} /> : <Search size={16} />}
                  {isOwner ? header("owner") : header("renter")}
                </span>
              </div>

              <LanguageSwitcher />

              <AccountMenu
                className="hidden md:flex"
                profile={profile}
                userId={user?.id}
                onManage={() => setManageOpen(true)}
                onSwitchRole={setRole}
                onSignOut={() => signOut.mutate()}
              />

              <MobileNav
                className="md:hidden"
                profile={profile}
                userId={user?.id}
                savedCount={saved.length}
                savedActive={savedActive}
                toursActive={toursActive}
                onManage={() => setManageOpen(true)}
                onSwitchRole={setRole}
                onSignOut={() => signOut.mutate()}
              />
            </>
          ) : (
            <>
              <LanguageSwitcher />
              <Button asChild size="default" className="h-9 px-4">
                <Link href="/signin">{header("signIn")}</Link>
              </Button>
            </>
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
