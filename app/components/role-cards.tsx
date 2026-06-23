"use client";

import { useRouter } from "next/navigation";
import { Building2, ChevronRight, Search, type LucideIcon } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { type Role } from "@/lib/data/profile";

const ROLES: {
  id: Role;
  title: string;
  blurb: string;
  icon: LucideIcon;
  href: string;
  fallbackName: string;
}[] = [
  {
    id: "renter",
    title: "I'm renting",
    blurb: "Browse homes, find your next place.",
    icon: Search,
    href: "/apartments",
    fallbackName: "Guest",
  },
  {
    id: "owner",
    title: "I'm listing",
    blurb: "Post and manage your place.",
    icon: Building2,
    href: "/owner/dashboard",
    fallbackName: "Jordan Rivera",
  },
];

export function RoleCards() {
  const router = useRouter();
  const { profile, updateProfile } = useProfile();

  const enter = (role: Role, href: string, fallbackName: string) => {
    updateProfile({ role, name: profile.name || fallbackName });
    router.push(href);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-9">
      {ROLES.map(({ id, title, blurb, icon: I, href, fallbackName }) => (
        <button
          key={id}
          type="button"
          onClick={() => enter(id, href, fallbackName)}
          className="group flex items-start gap-3 p-4 text-left transition-colors focus-ring bg-card text-card-foreground ring-1 ring-border hover:bg-accent"
        >
          <span className="inline-flex items-center justify-center w-10 h-10 shrink-0 transition-colors bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground">
            <I size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
              {blurb}
            </p>
          </span>
          <ChevronRight
            size={18}
            className="shrink-0 mt-1 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </button>
      ))}
    </div>
  );
}
