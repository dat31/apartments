"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { SignInValues, SignUpValues } from "@/schemas/auth";

/* Query keys shared by the auth hooks and the <Providers> auth listener. */
export const authKeys = {
  user: ["auth", "user"] as const,
  profile: ["profile"] as const,
};

/* Reactive current auth user, backed by react-query. The cache is kept fresh
   by the onAuthStateChange listener in <Providers>, so this query effectively
   never refetches on its own (staleTime: Infinity) — sign-in / sign-out push
   new data into the cache instead. */
export function useUser() {
  return useQuery<User | null>({
    queryKey: authKeys.user,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    },
    staleTime: Infinity,
  });
}

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

export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });
      if (error) throw error;
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
}
