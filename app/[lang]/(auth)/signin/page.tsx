"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
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
import { useSignIn } from "@/hooks/auth";

export default function SignInPage() {
  const router = useRouter();
  const signIn = useSignIn();
  const t = useTranslations("auth.signin");
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
        err instanceof Error ? err.message : t("errorToast")
      );
    }
  });

  const soon = () => toast(t("soonToast"));

  return (
    <AuthShell>
      <h1 className="text-[1.85rem] font-semibold tracking-tight">
        {t('title')}
      </h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        {t('subtitle')}
      </p>

      <div className="mt-8 grid gap-3">
        <SocialButton icon={<AppleMark />} onClick={soon}>
          {t('continueApple')}
        </SocialButton>
        <SocialButton icon={<GoogleMark />} onClick={soon}>
          {t('continueGoogle')}
        </SocialButton>
      </div>

      <AuthDivider>{t('dividerEmail')}</AuthDivider>

      <form className="grid gap-4" onSubmit={onSubmit} noValidate>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
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
                {t('forgot')}
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
          <span>{t('keepSignedIn')}</span>
        </label>

        <Button
          size="lg"
          type="submit"
          disabled={signIn.isPending}
          className="w-full mt-1 h-14 text-base gap-2"
        >
          {signIn.isPending ? t('submitting') : t('submit')}
          <ChevronRight size={18} />
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t('noAccount')}{" "}
        <Link
          href="/signup"
          className="text-primary font-medium hover:underline"
        >
          {t('createAccount')}
        </Link>
      </p>
    </AuthShell>
  );
}
