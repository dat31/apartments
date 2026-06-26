"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { SignUpValues } from "@/schemas/auth";

export function useSignUp() {
  return useMutation({
    mutationFn: async (values: SignUpValues) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          // Picked up by a handle_new_user trigger to seed the profiles row.
          // Stored in user_metadata — display only, never used for authorization.
          data: { name: values.name, role: values.role },
        },
      });
      if (error) throw error;
      // No session means email confirmation is required before sign-in.
      return { needsConfirmation: !data.session };
    },
  });
}
