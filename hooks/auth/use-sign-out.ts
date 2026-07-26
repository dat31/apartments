"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { logAuthError } from "@/lib/auth-log";
import posthog from "posthog-js";

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      posthog.capture("user_signed_out");
      const { error } = await supabase.auth.signOut();
      if (error) {
        logAuthError("sign-out", {}, error);
        throw error;
      }
      posthog.reset();
    },
  });
}
