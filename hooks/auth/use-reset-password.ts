"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { logAuthError } from "@/lib/auth-log";
import { useLocale } from "@/lib/i18n/navigation";

export function useResetPassword() {
  const locale = useLocale();
  return useMutation({
    mutationFn: async (email: string) => {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=/${locale}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        logAuthError("reset-password", { email, redirectTo }, error);
        throw error;
      }
    },
  });
}
