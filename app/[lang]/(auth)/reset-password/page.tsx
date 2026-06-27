"use client";

import { useLocalizedRouter } from "@/lib/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { ChevronRight, Lock } from "lucide-react";
import { AuthShell } from "../components/auth-shell";
import { PasswordField } from "../components/password-field";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/schemas/auth";
import { useUpdatePassword } from "@/hooks/auth";

export default function ResetPasswordPage() {
  const router = useLocalizedRouter();
  const updatePassword = useUpdatePassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updatePassword.mutateAsync(values.password);
      toast.success("Password updated.");
      router.push("/apartments");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update password."
      );
    }
  });

  return (
    <AuthShell>
      <span className="inline-flex items-center justify-center w-12 h-12 bg-secondary text-primary mb-5">
        <Lock size={22} />
      </span>
      <h1 className="text-[1.85rem] font-semibold tracking-tight">
        Set a new password
      </h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        Choose a new password for your account. You&apos;ll stay signed in.
      </p>

      <form className="grid gap-4 mt-8" onSubmit={onSubmit} noValidate>
        <div>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            placeholder="8+ chars, mixed case, number, symbol"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <FieldError className="mt-1.5" errors={[errors.password]} />
        </div>

        <div>
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register("confirm")}
          />
          <FieldError className="mt-1.5" errors={[errors.confirm]} />
        </div>

        <Button
          size="lg"
          type="submit"
          disabled={updatePassword.isPending}
          className="w-full mt-1 h-14 text-base gap-2"
        >
          {updatePassword.isPending ? "Updating…" : "Update password"}
          <ChevronRight size={18} />
        </Button>
      </form>
    </AuthShell>
  );
}
