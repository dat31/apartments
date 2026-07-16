-- Cost transparency (improvement #13): deposit, per-utility billing, and
-- minimum lease on listings. Every column is nullable — null means the owner
-- hasn't listed it ("not listed"), which must never read as "free"/zero.
-- Amounts are USD, matching `price`.

create type public.deposit_type as enum ('none', '1mo', '2mo', 'custom');
create type public.utility_billing as enum ('included', 'metered', 'fixed');

alter table public.listings
  add column deposit public.deposit_type,
  add column deposit_amount integer
    check (deposit_amount is null or deposit_amount >= 0),
  add column util_electricity public.utility_billing,
  add column util_electricity_amount integer
    check (util_electricity_amount is null or util_electricity_amount >= 0),
  add column util_water public.utility_billing,
  add column util_water_amount integer
    check (util_water_amount is null or util_water_amount >= 0),
  add column util_wifi public.utility_billing,
  add column util_wifi_amount integer
    check (util_wifi_amount is null or util_wifi_amount >= 0),
  add column util_building public.utility_billing,
  add column util_building_amount integer
    check (util_building_amount is null or util_building_amount >= 0),
  add column min_lease_months smallint
    check (min_lease_months is null or min_lease_months >= 0);

comment on column public.listings.deposit_amount is
  'USD. Only meaningful when deposit = ''custom''.';
comment on column public.listings.min_lease_months is
  '0 = explicitly no minimum; null = not listed.';
comment on column public.listings.util_electricity_amount is
  'USD per month. Only meaningful when the matching billing mode = ''fixed''.';

-- Seed listings get plausible values so the UI never demos empty. Keyed by
-- title and guarded on `deposit is null` so re-running never clobbers edits.
update public.listings set deposit = '1mo',
  util_electricity = 'metered', util_water = 'metered',
  util_wifi = 'included', util_building = 'fixed', util_building_amount = 40,
  min_lease_months = 6
  where title = 'Sunlit studio near Mỹ Khê' and deposit is null;

update public.listings set deposit = '2mo',
  util_electricity = 'metered', util_water = 'included',
  util_wifi = 'included', util_building = 'fixed', util_building_amount = 60,
  min_lease_months = 12
  where title = 'Garden loft by the Hàn River' and deposit is null;

update public.listings set deposit = '1mo', min_lease_months = 6
  where title = 'Quiet 2-bed near Thanh Khê Beach' and deposit is null;

update public.listings set util_wifi = 'included'
  where title = 'Cozy room in Cẩm Lệ' and deposit is null;

update public.listings set deposit = 'none',
  util_electricity = 'metered', util_water = 'metered',
  util_wifi = 'included', min_lease_months = 6
  where title = 'Modern 1-bed by the river' and deposit is null;

update public.listings set deposit = 'custom', deposit_amount = 5000,
  util_electricity = 'metered', util_water = 'metered',
  util_wifi = 'fixed', util_wifi_amount = 30,
  util_building = 'fixed', util_building_amount = 80,
  min_lease_months = 12
  where title = 'Beachside house in Nam Ô' and deposit is null;
