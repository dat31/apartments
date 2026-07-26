"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { logAuthError } from "@/lib/auth-log";
import type { SignInValues } from "@/schemas/auth";
import posthog from "posthog-js";

export function useSignIn() {
  return useMutation({
    mutationFn: async (values: SignInValues) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        logAuthError("sign-in", { email: values.email }, error);
        throw error;
      }
      if (data.user) {
        posthog.identify(data.user.id, {
          email: data.user.email,
          name: (data.user.user_metadata?.name as string | undefined) ?? undefined,
          role: (data.user.user_metadata?.role as string | undefined) ?? undefined,
        });
      }
    },
  });
}
