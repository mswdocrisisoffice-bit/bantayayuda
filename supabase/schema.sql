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
  status text default 'pending' check (status in ('pending', 'confirmed')),
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
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 5. Donation flags (donor comments/corrections on an admin's entry)
-- ─────────────────────────────────────────────
create table donation_flags (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid references donations(id) on delete cascade,
  donor_id uuid references profiles(id),
  message text not null,
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

-- Donations: donor reads their own; public can read non-private confirmed
-- entries (for the landing page feed); admin has full access
create policy "public reads confirmed public donations" on donations
  for select using (status = 'confirmed' and is_private = false);
create policy "donor reads own donations" on donations
  for select using (auth.uid() = donor_id or public.is_admin());
create policy "admin inserts donations" on donations
  for insert with check (public.is_admin());
create policy "admin updates donations" on donations
  for update using (public.is_admin());

-- Distributions: household reads their own; admin full access
create policy "household reads own distributions" on distributions
  for select using (auth.uid() = household_id or public.is_admin());
create policy "admin inserts distributions" on distributions
  for insert with check (public.is_admin());

-- Donation flags: donor can add/read their own flags on their own donations; admin reads all
create policy "donor inserts own flags" on donation_flags
  for insert with check (auth.uid() = donor_id);
create policy "donor reads own flags" on donation_flags
  for select using (auth.uid() = donor_id or public.is_admin());

-- ─────────────────────────────────────────────
-- 6. Storage bucket for e-signatures
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('signatures', 'signatures', false)
on conflict (id) do nothing;

create policy "admin manages signatures" on storage.objects
  for all using (bucket_id = 'signatures' and public.is_admin());
