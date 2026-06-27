"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { logAuthError } from "@/lib/auth-log";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export function useResetPassword() {
  const locale = useLocale() as Locale;
  return useMutation({
    mutationFn: async (email: string) => {
      const supabase = createClient();
      // Locale-aware path (as-needed: no prefix for the default locale).
      const next = getPathname({ href: "/reset-password", locale });
      const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
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
