"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Logo } from "@/components/logo";
import { RoleCard } from "./components/role-card";
import { useTheme } from "@/hooks/use-theme";
import { useProfile } from "@/hooks/use-profile";
import { FILLED_INPUT } from "@/app/(auth)/components/password-field";
import { Building2, ChevronRight, Moon, Search, Sun } from "lucide-react";
import { type Role } from "@/lib/data/profile";

export default function RoleSelectPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { updateProfile } = useProfile();
  const [role, setRole] = React.useState<Role | null>(null);
  const [name, setName] = React.useState("");

  const onContinue = () => {
    if (!role) return;
    updateProfile({
      role,
      name: name.trim() || (role === "owner" ? "Jordan Rivera" : "Guest"),
    });
    router.push("/apartments");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 h-20">
        <Logo />
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl anim-up">
          <div className="text-center mb-10">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary mb-3">
              Welcome to Danapa
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
              Find a place, or fill one.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto text-pretty">
              A calm, simple way to rent in Da Nang. Choose how you&apos;d like
              to start — you can switch anytime.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <RoleCard
              active={role === "renter"}
              onClick={() => setRole("renter")}
              title="I'm renting"
              icon={Search}
              blurb="Browse homes and find your next place."
              points={[
                "Filter by price & size",
                "Tour details & amenities",
                "Reach owners directly",
              ]}
            />
            <RoleCard
              active={role === "owner"}
              onClick={() => setRole("owner")}
              title="I'm listing"
              icon={Building2}
              blurb="Post your place and manage it in one view."
              points={[
                "Publish in minutes",
                "Track views & interest",
                "Edit or pause anytime",
              ]}
            />
          </div>

          <div className="mt-6 bg-card p-5 flex flex-col sm:flex-row sm:items-end gap-4">
            <Field className="flex-1">
              <FieldLabel htmlFor="name">Your name (optional)</FieldLabel>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Rivera"
                className={FILLED_INPUT}
              />
            </Field>
            <Button
              disabled={!role}
              onClick={onContinue}
              className="sm:w-auto w-full h-11 px-7 text-base gap-2"
            >
              Continue{" "}
              {role === "owner"
                ? "as owner"
                : role === "renter"
                  ? "as renter"
                  : ""}
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </main>

      <footer className="px-6 sm:px-10 h-16 flex items-center text-sm text-muted-foreground">
        <span>Danapa — a demo prototype. No account required.</span>
      </footer>
    </div>
  );
}
