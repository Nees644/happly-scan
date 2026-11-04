-- Zelfstartregister: herinneringen bij het als-dan plan, 4 november 2026.
-- Drie checks na het vastleggen van een plan: na een week, na drie maanden
-- en na vijf maanden. De datumherinnering per regel staat in plan (jsonb).

alter table public.zelfstarters
  add column if not exists mail_plan_week_op timestamptz,
  add column if not exists mail_plan_m3_op timestamptz,
  add column if not exists mail_plan_m5_op timestamptz;
