-- BantayAyuda database schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL editor after creating your project.

-- ─────────────────────────────────────────────
-- 1. Profiles (extends auth.users with a role)
-- ─────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null check (role in ('donor', 'admin', 'beneficiary')),
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'donor')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- 2. Beneficiaries (household registry)
-- ─────────────────────────────────────────────
create table beneficiaries (
  id uuid primary key references auth.users(id) on delete cascade,
  household_head text not null,
  barangay text not null,
  household_size int not null,
  contact_number text,
  status text not null default 'active',
  archived_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 3. Donations (logged by donors, confirmed by admin)
-- ─────────────────────────────────────────────
create table donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references profiles(id),
  donor_name text,
  item text not null,
  quantity text,
  barangay text,
  is_private boolean default false,
  status text default 'pending' check (status in ('pending', 'confirmed', 'archived')),
  archived_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 4. Distributions (aid handed to a household, e-signed)
-- ─────────────────────────────────────────────
create table distributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references beneficiaries(id),
  household_head text,
  donation_id uuid references donations(id),
  item text not null,
  quantity text,
  signature_path text,
  status text default 'confirmed',
  stock_returned_at timestamptz,
  stock_returned_for uuid,
  archived_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 5. Donation flags (comments/concerns from donors or beneficiaries)
-- ─────────────────────────────────────────────
create table donation_flags (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid references donations(id) on delete cascade,
  donor_id uuid references profiles(id),
  beneficiary_id uuid references profiles(id) on delete cascade,
  kind text not null default 'donor' check (kind in ('donor', 'beneficiary')),
  message text not null,
  admin_reply text,
  replied_at timestamptz,
  status text not null default 'open',
  archived_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 6. Row Level Security
-- ─────────────────────────────────────────────
alter table profiles enable row level security;
alter table beneficiaries enable row level security;
alter table donations enable row level security;
alter table distributions enable row level security;
alter table donation_flags enable row level security;

-- Helper: is the current user an admin?
create function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Profiles: users can read their own profile; admins can read all
create policy "read own profile" on profiles
  for select using (auth.uid() = id or public.is_admin());

-- Beneficiaries: household can read/update their own row; admins full access
create policy "beneficiary reads own household" on beneficiaries
  for select using (auth.uid() = id or public.is_admin());
create policy "beneficiary inserts own household" on beneficiaries
  for insert with check (auth.uid() = id);
create policy "admin manages beneficiaries" on beneficiaries
  for update using (public.is_admin());
create policy "admin deletes beneficiaries" on beneficiaries
  for delete using (public.is_admin());

-- Donations: donor reads their own; public can read non-private confirmed
-- entries that were not archived (for the landing page feed); admin has full access
create policy "public reads confirmed public donations" on donations
  for select using (
    status = 'confirmed'
    and coalesce(is_private, false) = false
    and archived_at is null
  );
create policy "donor reads own donations" on donations
  for select using (auth.uid() = donor_id or public.is_admin());
create policy "admin inserts donations" on donations
  for insert with check (public.is_admin());
create policy "admin updates donations" on donations
  for update using (public.is_admin());
create policy "admin deletes donations" on donations
  for delete using (public.is_admin());

-- Distributions: household reads their own; admin full access
create policy "household reads own distributions" on distributions
  for select using (auth.uid() = household_id or public.is_admin());
create policy "admin inserts distributions" on distributions
  for insert with check (public.is_admin());
create policy "admin deletes distributions" on distributions
  for delete using (public.is_admin());

-- Donation flags: donors and beneficiaries can add/read their own comments; admin reads all
create policy "donor inserts own flags" on donation_flags
  for insert with check (auth.uid() = donor_id and kind = 'donor');
create policy "donor reads own flags" on donation_flags
  for select using (auth.uid() = donor_id or public.is_admin());
create policy "beneficiary inserts own flags" on donation_flags
  for insert with check (auth.uid() = beneficiary_id and kind = 'beneficiary');
create policy "beneficiary reads own flags" on donation_flags
  for select using (auth.uid() = beneficiary_id or public.is_admin());
create policy "admin updates donation_flags" on donation_flags
  for update using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes donation_flags" on donation_flags
  for delete using (public.is_admin());

-- Admin-only helper used by the Archive tab. Clears references that would block
-- a permanent delete while keeping historical distribution rows intact.
create or replace function public.delete_archived_record(p_type text, p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can permanently delete archived records.';
  end if;

  case p_type
    when 'distribution' then
      delete from public.distributions where id = p_id;
      get diagnostics v_deleted = row_count;
    when 'donation' then
      update public.distributions set donation_id = null where donation_id = p_id;
      delete from public.donations where id = p_id;
      get diagnostics v_deleted = row_count;
    when 'household' then
      update public.distributions set household_id = null where household_id = p_id;
      delete from public.beneficiaries where id = p_id;
      get diagnostics v_deleted = row_count;
    when 'comment' then
      delete from public.donation_flags where id = p_id;
      get diagnostics v_deleted = row_count;
    else
      raise exception 'Unknown archive type: %', p_type;
  end case;

  return v_deleted;
end;
$$;

grant execute on function public.delete_archived_record(text, uuid) to authenticated;

-- Public dashboard totals. Counts only, never personal data.
create or replace function public.public_stats()
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

-- ─────────────────────────────────────────────
-- 6. Storage bucket for e-signatures
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('signatures', 'signatures', false)
on conflict (id) do nothing;

create policy "admin manages signatures" on storage.objects
  for all using (bucket_id = 'signatures' and public.is_admin());
