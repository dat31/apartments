"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ArrowLeft, ChevronRight, Lock, Mail } from "lucide-react";
import { AuthShell } from "../components/auth-shell";
import { FILLED_INPUT } from "../components/password-field";
import { forgotSchema, type ForgotValues } from "../schemas/auth";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  return (
    <AuthShell>
      <Link
        href="/signin"
        className="flex w-fit items-center gap-1.5 whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft size={16} /> Back to sign in
      </Link>

      {!sentTo ? (
        <>
          <span className="inline-flex items-center justify-center w-12 h-12 bg-secondary text-primary mb-5">
            <Lock size={22} />
          </span>
          <h1 className="text-[1.85rem] font-semibold tracking-tight">
            Reset your password
          </h1>
          <p className="mt-2 text-muted-foreground text-pretty">
            Enter the email tied to your account and we&apos;ll send you a link
            to set a new password.
          </p>

          <form
            className="grid gap-4 mt-8"
            onSubmit={handleSubmit((v) => setSentTo(v.email))}
            noValidate
          >
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                autoFocus
                className={FILLED_INPUT}
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
            <Button
              size="lg"
              type="submit"
              className="w-full mt-1 h-14 text-base gap-2"
            >
              Send reset link <ChevronRight size={18} />
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link
              href="/signin"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </>
      ) : (
        <div className="anim-scale">
          <span className="inline-flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground mb-5">
            <Mail size={22} />
          </span>
          <h1 className="text-[1.85rem] font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="mt-2 text-muted-foreground text-pretty">
            We sent a reset link to{" "}
            <span className="font-medium text-foreground">{sentTo}</span>. It
            expires in 30 minutes.
          </p>

          <div className="mt-8 grid gap-3">
            <Button
              asChild
              size="lg"
              className="w-full h-14 text-base gap-2"
            >
              <Link href="/signin">
                Back to sign in <ChevronRight size={18} />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full h-14 text-base"
              onClick={() => setSentTo(null)}
            >
              Use a different email
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Didn&apos;t get it? Check spam, or{" "}
            <button
              type="button"
              onClick={() => setSentTo(getValues("email"))}
              className="text-primary font-medium hover:underline"
            >
              resend
            </button>
            .
          </p>
        </div>
      )}
    </AuthShell>
  );
}
