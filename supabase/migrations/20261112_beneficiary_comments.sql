-- Comments / concerns from donor and beneficiary dashboards.
--
-- Donor comments already live in public.donation_flags (donor_id + donation_id).
-- Beneficiary comments reuse the same table through beneficiary_id, so the admin
-- Reports tab can read, reply to, and archive both kinds in one place.

alter table public.donation_flags
  add column if not exists beneficiary_id uuid references public.profiles(id) on delete cascade,
  add column if not exists kind text not null default 'donor',
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists status text not null default 'open',
  add column if not exists archived_at timestamptz;

-- Existing rows are donor comments.
update public.donation_flags
set kind = 'donor'
where kind is null;

-- Make sure a comment belongs to either a donor or a beneficiary.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'donation_flags_comment_owner_check'
      and conrelid = 'public.donation_flags'::regclass
  ) then
    alter table public.donation_flags
      add constraint donation_flags_comment_owner_check
      check (
        (kind = 'donor' and donor_id is not null) or
        (kind = 'beneficiary' and beneficiary_id is not null)
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'donation_flags_kind_check'
      and conrelid = 'public.donation_flags'::regclass
  ) then
    alter table public.donation_flags
      add constraint donation_flags_kind_check
      check (kind in ('donor', 'beneficiary')) not valid;
  end if;
end $$;

create index if not exists donation_flags_donor_idx
  on public.donation_flags (donor_id);

create index if not exists donation_flags_beneficiary_idx
  on public.donation_flags (beneficiary_id);

create index if not exists donation_flags_status_idx
  on public.donation_flags (status);

-- Donors can only submit donor comments for their own account.
drop policy if exists "donor inserts own flags" on public.donation_flags;
create policy "donor inserts own flags"
  on public.donation_flags for insert
  with check (auth.uid() = donor_id and kind = 'donor');

-- Beneficiaries can submit and read their own comments.
drop policy if exists "beneficiary inserts own flags" on public.donation_flags;
create policy "beneficiary inserts own flags"
  on public.donation_flags for insert
  with check (auth.uid() = beneficiary_id and kind = 'beneficiary');

drop policy if exists "beneficiary reads own flags" on public.donation_flags;
create policy "beneficiary reads own flags"
  on public.donation_flags for select
  using (auth.uid() = beneficiary_id or public.is_admin());

-- Admins reply to and archive comments.
drop policy if exists "admin updates donation_flags" on public.donation_flags;
create policy "admin updates donation_flags"
  on public.donation_flags for update
  using (public.is_admin())
  with check (public.is_admin());
