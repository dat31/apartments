"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { useSignIn } from "@/hooks/use-auth";

export default function SignInPage() {
  const router = useRouter();
  const signIn = useSignIn();
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn.mutateAsync(values);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next || "/apartments");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not sign in. Try again."
      );
    }
  });

  const soon = () => toast("Social sign-in is coming soon.");

  return (
    <AuthShell>
      <h1 className="text-[1.85rem] font-semibold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        Sign in to manage your search and your listings.
      </p>

      <div className="mt-8 grid gap-3">
        <SocialButton icon={<AppleMark />} onClick={soon}>
          Continue with Apple
        </SocialButton>
        <SocialButton icon={<GoogleMark />} onClick={soon}>
          Continue with Google
        </SocialButton>
      </div>

      <AuthDivider>or with email</AuthDivider>

      <form className="grid gap-4" onSubmit={onSubmit} noValidate>
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

        <Button
          size="lg"
          type="submit"
          disabled={signIn.isPending}
          className="w-full mt-1 h-14 text-base gap-2"
        >
          {signIn.isPending ? "Signing in…" : "Sign in"}
          <ChevronRight size={18} />
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
