"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  });
}
