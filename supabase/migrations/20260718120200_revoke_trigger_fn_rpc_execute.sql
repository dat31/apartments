-- Keep trigger-only SECURITY DEFINER functions off the exposed REST API.
--
-- enforce_saved_search_cap (from 20260717100000_saved_searches) is a BEFORE
-- INSERT trigger function but was left executable by anon/authenticated, so it
-- showed up as /rest/v1/rpc/enforce_saved_search_cap (Supabase advisor
-- 0028/0029). Triggers fire regardless of EXECUTE grants, so revoking is safe.
-- (set_tour_owner_id is revoked in its own migration,
-- 20260718120000_tour_owner_id_integrity.)

revoke execute on function public.enforce_saved_search_cap() from public, anon, authenticated;
