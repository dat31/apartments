-- Fill in the cost block for the listings the original costs seed
-- (20260716090000_listing_costs.sql) never covered, so no browse card is left
-- with a blank deposit hint. Values are plausible Đà Nẵng terms, not a blanket
-- 'none': null still means "not listed", and writing 'none' everywhere would
-- claim a deposit-free market that doesn't exist.
--
-- Every row here answers deposit + min lease + all four utilities, so these
-- listings also earn the "transparent pricing" note (see isTransparent() in
-- lib/listing-costs.ts). Keyed by title and guarded on `deposit is null` so
-- re-running never clobbers owner edits.

update public.listings set deposit = '1mo',
  util_electricity = 'metered', util_water = 'metered',
  util_wifi = 'included', util_building = 'fixed', util_building_amount = 8,
  min_lease_months = 6
  where title = 'Studio Lê Thanh Nghị – gần Đông Á & Kiến Trúc'
    and deposit is null;

update public.listings set deposit = '2mo',
  util_electricity = 'metered', util_water = 'metered',
  util_wifi = 'included', util_building = 'fixed', util_building_amount = 35,
  min_lease_months = 12
  where title = 'Căn hộ 1PN 50m² – Panoma 1–2 (Sun Ponte), cạnh cầu Trần Thị Lý'
    and deposit is null;

-- The one deliberate "No deposit" in this batch: a cheap room let on a short
-- lease. Already had util_wifi = 'included' from the earlier seed.
update public.listings set deposit = 'none',
  util_electricity = 'metered', util_water = 'included',
  util_wifi = 'included', util_building = 'included',
  min_lease_months = 3
  where title = 'Cozy room in Cẩm Lệ' and deposit is null;

update public.listings set deposit = '1mo',
  util_electricity = 'metered', util_water = 'metered',
  util_wifi = 'included', util_building = 'fixed', util_building_amount = 40,
  min_lease_months = 6
  where title = 'greatest apartment' and deposit is null;

update public.listings set deposit = '1mo',
  util_electricity = 'metered', util_water = 'metered',
  util_wifi = 'included', util_building = 'fixed', util_building_amount = 35,
  min_lease_months = 6
  where title = 'Compact studio near Non Nước' and deposit is null;

update public.listings set deposit = '1mo',
  util_electricity = 'metered', util_water = 'metered',
  util_wifi = 'fixed', util_wifi_amount = 25,
  util_building = 'fixed', util_building_amount = 55,
  min_lease_months = 12
  where title = 'Bright 2-bed in Thanh Khê' and deposit is null;

update public.listings set deposit = '1mo',
  util_electricity = 'metered', util_water = 'included',
  util_wifi = 'included', util_building = 'fixed', util_building_amount = 60,
  min_lease_months = 12
  where title = 'Top-floor loft in An Thượng' and deposit is null;

-- Standalone townhouse: no management company, so no separate building fee.
update public.listings set deposit = '2mo',
  util_electricity = 'metered', util_water = 'metered',
  util_wifi = 'fixed', util_wifi_amount = 30, util_building = 'included',
  min_lease_months = 12
  where title = 'Marble Mountains townhouse with yard' and deposit is null;
