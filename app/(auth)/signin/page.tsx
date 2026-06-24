"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { ChevronRight } from "lucide-react";
import { GoogleMark, AppleMark } from "@/components/icons";
import { AuthShell } from "../components/auth-shell";
import { SocialButton } from "../components/social-button";
import { AuthDivider } from "../components/auth-divider";
import { PasswordField, FILLED_INPUT } from "../components/password-field";
import { signInSchema, type SignInValues } from "@/schemas/auth";

export default function SignInPage() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  return (
    <AuthShell>
      <h1 className="text-[1.85rem] font-semibold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        Sign in to manage your search and your listings.
      </p>

      <div className="mt-8 grid gap-3">
        <SocialButton icon={<AppleMark />}>Continue with Apple</SocialButton>
        <SocialButton icon={<GoogleMark />}>Continue with Google</SocialButton>
      </div>

      <AuthDivider>or with email</AuthDivider>

      <form
        className="grid gap-4"
        onSubmit={handleSubmit(() => {})}
        noValidate
      >
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
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            rightLink={
              <Link
                href="/forgot-password"
                className="text-sm text-primary font-medium hover:underline"
              >
                Forgot?
              </Link>
            }
            {...register("password")}
          />
          <FieldError className="mt-1.5" errors={[errors.password]} />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer select-none text-sm text-muted-foreground leading-snug">
          <Checkbox
            checked={watch("remember")}
            onCheckedChange={(v) => setValue("remember", v === true)}
            className="mt-px"
          />
          <span>Keep me signed in</span>
        </label>

        <Button size="lg" type="submit" className="w-full mt-1 h-14 text-base gap-2">
          Sign in <ChevronRight size={18} />
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to Danapa?{" "}
        <Link
          href="/signup"
          className="text-primary font-medium hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
