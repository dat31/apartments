"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type Profile,
  type Role,
  DEFAULT_PROFILE,
  profileSchema,
} from "@/lib/data/profile";

const KEY = "danapa-profile";

/* Persisted signed-in profile (name, email, location, bio, avatar color, role). */
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) {
        const parsed = profileSchema.safeParse(JSON.parse(s));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed.success) setProfile(parsed.data);
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
    } catch {}
  }, [profile, ready]);

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })),
    []
  );

  const setRole = useCallback(
    (role: Role) => setProfile((p) => ({ ...p, role })),
    []
  );

  return { profile, updateProfile, setRole, ready };
}
