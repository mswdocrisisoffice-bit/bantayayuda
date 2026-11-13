-- Archived donations must leave the public landing-page feed.
--
-- Why this migration is needed:
--   * The original donations table only allowed status 'pending'/'confirmed',
--     so archiving (status = 'archived') was rejected by the check constraint.
--     The row stayed 'confirmed' and kept appearing on the public dashboard.
--   * Some deployments never got donations.archived_at, which the archive
--     button also writes.
--
-- Run this in the Supabase SQL Editor after the earlier migrations.

alter table public.donations
  add column if not exists archived_at timestamptz;

-- Beneficiary archiving uses the same pair of columns.
alter table public.beneficiaries
  add column if not exists status text not null default 'active';
alter table public.beneficiaries
  add column if not exists archived_at timestamptz;

-- Replace the old status check (whatever its auto-generated name is) with one
-- that also accepts 'archived'.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.donations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.donations drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.donations
  drop constraint if exists donations_status_check;

alter table public.donations
  add constraint donations_status_check
  check (status in ('pending', 'confirmed', 'archived'));

-- Keep the public feed strict: pending, private and archived entries never show,
-- even if a status update was interrupted.
drop policy if exists "public reads confirmed public donations" on public.donations;
create policy "public reads confirmed public donations" on public.donations
  for select using (
    status = 'confirmed'
    and coalesce(is_private, false) = false
    and archived_at is null
  );

-- Totals for the public dashboard. Returns counts only, never personal data.
-- security definer is required because visitors cannot read the tables directly.
drop function if exists public.public_stats();
create function public.public_stats()
returns table (donations bigint, households bigint, served bigint)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(*)
      from public.donations
      where status = 'confirmed'
        and coalesce(is_private, false) = false
        and archived_at is null
    ),
    (
      select count(*)
      from public.beneficiaries
      where coalesce(status, 'active') <> 'archived'
    ),
    (
      select count(distinct household_id)
      from public.distributions
      where household_id is not null
        and archived_at is null
    );
$$;

grant execute on function public.public_stats() to anon, authenticated;
