"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ArrowLeft, ChevronRight, Lock, Mail } from "lucide-react";
import { AuthShell } from "../components/auth-shell";
import { FILLED_INPUT } from "../components/password-field";
import { createForgotSchema, type ForgotValues } from "@/schemas/auth";
import { useResetPassword } from "@/hooks/auth";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const resetPassword = useResetPassword();
  const t = useTranslations("auth.forgot");
  const tv = useTranslations("validation");
  const forgotSchema = React.useMemo(() => createForgotSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const sendLink = async (email: string) => {
    try {
      await resetPassword.mutateAsync(email);
      setSentTo(email);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("errorToast")
      );
    }
  };

  return (
    <AuthShell>
      <Link
        href="/signin"
        className="flex w-fit items-center gap-1.5 whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft size={16} /> {t("back")}
      </Link>

      {!sentTo ? (
        <>
          <span className="inline-flex items-center justify-center w-12 h-12 bg-secondary text-primary mb-5">
            <Lock size={22} />
          </span>
          <h1 className="text-[1.85rem] font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground text-pretty">
            {t("subtitle")}
          </p>

          <form
            className="grid gap-4 mt-8"
            onSubmit={handleSubmit((v) => sendLink(v.email))}
            noValidate
          >
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
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
              disabled={resetPassword.isPending}
              className="w-full mt-1 h-14 text-base gap-2"
            >
              {resetPassword.isPending ? t("submitting") : t("submit")}
              <ChevronRight size={18} />
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("remembered")}{" "}
            <Link
              href="/signin"
              className="text-primary font-medium hover:underline"
            >
              {t("signin")}
            </Link>
          </p>
        </>
      ) : (
        <div className="anim-scale">
          <span className="inline-flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground mb-5">
            <Mail size={22} />
          </span>
          <h1 className="text-[1.85rem] font-semibold tracking-tight">
            {t("sentTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground text-pretty">
            {t.rich("sentLead", {
              email: sentTo,
              b: (chunks) => (
                <span className="font-medium text-foreground">{chunks}</span>
              ),
            })}
          </p>

          <div className="mt-8 grid gap-3">
            <Button
              asChild
              size="lg"
              className="w-full h-14 text-base gap-2"
            >
              <Link href="/signin">
                {t("backToSignin")} <ChevronRight size={18} />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full h-14 text-base"
              onClick={() => setSentTo(null)}
            >
              {t("differentEmail")}
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t.rich("didntGet", {
              resend: (chunks) => (
                <button
                  type="button"
                  onClick={() => sendLink(getValues("email"))}
                  className="text-primary font-medium hover:underline"
                >
                  {chunks}
                </button>
              ),
            })}
          </p>
        </div>
      )}
    </AuthShell>
  );
}
