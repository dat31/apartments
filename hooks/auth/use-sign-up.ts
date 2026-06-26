"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { logAuthError } from "@/lib/auth-log";
import type { SignUpValues } from "@/schemas/auth";

export function useSignUp() {
  return useMutation({
    mutationFn: async (values: SignUpValues) => {
      const supabase = createClient();
      const emailRedirectTo = `${window.location.origin}/auth/confirm`;
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo,
          // Picked up by a handle_new_user trigger to seed the profiles row.
          // Stored in user_metadata — display only, never used for authorization.
          data: { name: values.name, role: values.role },
        },
      });
      if (error) {
        logAuthError(
          "sign-up",
          { email: values.email, role: values.role, emailRedirectTo },
          error
        );
        throw error;
      }
      // No session means email confirmation is required before sign-in.
      return { needsConfirmation: !data.session };
    },
  });
}
