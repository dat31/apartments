"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { SignInValues } from "@/schemas/auth";

export function useSignIn() {
  return useMutation({
    mutationFn: async (values: SignInValues) => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
    },
  });
}
