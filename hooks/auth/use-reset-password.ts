"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { logAuthError } from "@/lib/auth-log";

export function useResetPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=/reset-password`;
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
