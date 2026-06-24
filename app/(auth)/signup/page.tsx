"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Building2, ChevronRight, Search } from "lucide-react";
import { GoogleMark, AppleMark } from "@/components/icons";
import { AuthShell } from "../components/auth-shell";
import { SocialButton } from "../components/social-button";
import { AuthDivider } from "../components/auth-divider";
import { PasswordField, FILLED_INPUT } from "../components/password-field";
import { signUpSchema, type SignUpValues } from "@/schemas/auth";

export default function SignUpPage() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      role: "renter",
      name: "",
      email: "",
      password: "",
      agree: undefined as unknown as true,
    },
  });

  const role = watch("role");
  const agree = watch("agree");

  return (
    <AuthShell>
      <h1 className="text-[1.85rem] font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        Join Danapa in a minute — you can switch roles anytime.
      </p>

      <div className="mt-8 grid gap-3">
        <SocialButton icon={<AppleMark />}>Sign up with Apple</SocialButton>
        <SocialButton icon={<GoogleMark />}>Sign up with Google</SocialButton>
      </div>

      <AuthDivider>or with email</AuthDivider>

      <form className="grid gap-4" onSubmit={handleSubmit(() => {})} noValidate>
        <div>
          <span className="block mb-1.5 text-sm font-medium text-foreground">
            I&apos;m here to…
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "renter", label: "Rent", icon: Search },
                { id: "owner", label: "List", icon: Building2 },
              ] as const
            ).map(({ id, label, icon: I }) => (
              <button
                key={id}
                type="button"
                onClick={() => setValue("role", id)}
                aria-pressed={role === id}
                className={cn(
                  "flex items-center gap-2.5 h-12 px-4 text-[15px] font-medium transition-colors focus-ring active:scale-[.98]",
                  role === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <I size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input
            id="name"
            placeholder="Jordan Rivera"
            autoComplete="name"
            className={FILLED_INPUT}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            autoComplete="email"
            className={FILLED_INPUT}
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <div>
          <PasswordField
            label="Password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError className="mt-1.5" errors={[errors.password]} />
        </div>

        <div>
          <label className="flex items-start gap-2.5 cursor-pointer select-none text-sm text-muted-foreground leading-snug">
            <Checkbox
              checked={agree === true}
              onCheckedChange={(v) =>
                setValue("agree", (v === true) as true, {
                  shouldValidate: true,
                })
              }
              className="mt-px"
            />
            <span>
              I agree to Danapa&apos;s{" "}
              <a href="#" className="text-primary hover:underline">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          <FieldError className="mt-1.5" errors={[errors.agree]} />
        </div>

        <Button
          size="lg"
          type="submit"
          className="w-full mt-1 h-14 text-base gap-2"
        >
          Create account <ChevronRight size={18} />
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
