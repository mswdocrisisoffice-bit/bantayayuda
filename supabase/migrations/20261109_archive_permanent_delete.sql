-- Permanent delete from the Archive tab.
--
-- Two things can make "Delete permanently" fail:
--   1. RLS denies DELETE when no admin DELETE policy exists (the delete then
--      removes 0 rows without an error).
--   2. A household or donation can still be referenced by distribution rows,
--      which blocks the delete through a foreign key.
--
-- The policies below grant admins DELETE access. The helper function removes
-- the references first and reports how many rows were actually deleted.

drop policy if exists "admin deletes donations" on public.donations;
create policy "admin deletes donations"
  on public.donations for delete
  using (public.is_admin());

drop policy if exists "admin deletes distributions" on public.distributions;
create policy "admin deletes distributions"
  on public.distributions for delete
  using (public.is_admin());

drop policy if exists "admin deletes beneficiaries" on public.beneficiaries;
create policy "admin deletes beneficiaries"
  on public.beneficiaries for delete
  using (public.is_admin());

drop policy if exists "admin deletes donation_flags" on public.donation_flags;
create policy "admin deletes donation_flags"
  on public.donation_flags for delete
  using (public.is_admin());

-- Used by the Archive tab. Historical distribution rows are kept: their
-- household/donation link is cleared instead of deleting the aid record.
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
