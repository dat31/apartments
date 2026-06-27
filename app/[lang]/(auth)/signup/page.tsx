"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { useSignUp } from "@/hooks/auth";

export default function SignUpPage() {
  const router = useRouter();
  const signUp = useSignUp();
  const t = useTranslations("auth.signup");
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

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { needsConfirmation } = await signUp.mutateAsync(values);
      if (needsConfirmation) {
        toast.success(t("confirmToast"));
        router.push("/signin");
      } else {
        router.push("/apartments");
        router.refresh();
      }
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
        {t("title")}
      </h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        {t("subtitle")}
      </p>

      <div className="mt-8 grid gap-3">
        <SocialButton icon={<AppleMark />} onClick={soon}>
          {t("withApple")}
        </SocialButton>
        <SocialButton icon={<GoogleMark />} onClick={soon}>
          {t("withGoogle")}
        </SocialButton>
      </div>

      <AuthDivider>{t("dividerEmail")}</AuthDivider>

      <form className="grid gap-4" onSubmit={onSubmit} noValidate>
        <div>
          <span className="block mb-1.5 text-sm font-medium text-foreground">
            {t("hereTo")}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "renter" as const, label: t("roleRent"), icon: Search },
                { id: "owner" as const, label: t("roleList"), icon: Building2 },
              ]
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
          <FieldLabel htmlFor="name">{t("fullName")}</FieldLabel>
          <Input
            id="name"
            placeholder={t("fullNamePlaceholder")}
            autoComplete="name"
            className={FILLED_INPUT}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            className={FILLED_INPUT}
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <div>
          <PasswordField
            label={t("password")}
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
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
              {t.rich("agree", {
                terms: (chunks) => (
                  <a href="#" className="text-primary hover:underline">
                    {chunks}
                  </a>
                ),
                privacy: (chunks) => (
                  <a href="#" className="text-primary hover:underline">
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </label>
          <FieldError className="mt-1.5" errors={[errors.agree]} />
        </div>

        <Button
          size="lg"
          type="submit"
          disabled={signUp.isPending}
          className="w-full mt-1 h-14 text-base gap-2"
        >
          {signUp.isPending ? t("submitting") : t("submit")}
          <ChevronRight size={18} />
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/signin" className="text-primary font-medium hover:underline">
          {t("signin")}
        </Link>
      </p>
    </AuthShell>
  );
}
