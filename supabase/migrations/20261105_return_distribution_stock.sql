-- BantayAyuda · return the items a household received back to inventory
--
-- Run this once in the Supabase SQL Editor on the existing database. Re-run
-- it after this file changes; every statement is safe to run more than once.
--
-- It adds markers to distributions so the same item can never be returned
-- twice, plus functions that move the stock in one transaction:
--   · return_distribution_stock  → when a beneficiary is archived
--   · restore_household_stock    → when that beneficiary is restored
--
-- The app calls these functions from the Archive screens.

alter table public.distributions
  add column if not exists stock_returned_at timestamptz;

alter table public.distributions
  add column if not exists stock_returned_for uuid;

-- Keep the functions' own writes working even when RLS is enabled.
drop policy if exists "admin updates distributions" on public.distributions;
create policy "admin updates distributions" on public.distributions
  for update using (public.is_admin()) with check (public.is_admin());

do $$
begin
  if to_regclass('public.inventory') is not null then
    drop policy if exists "admin updates inventory" on public.inventory;
    create policy "admin updates inventory" on public.inventory
      for update using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- Replaces the first version of this function (it did not record which
-- household the stock was returned for).
drop function if exists public.return_distribution_stock(uuid[]);

create or replace function public.return_distribution_stock(
  p_distribution_ids uuid[],
  p_household_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dist record;
  v_inv record;
  v_qty numeric;
  v_returned integer := 0;
  v_skipped jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only staff can return items to inventory.';
  end if;

  if p_distribution_ids is null or array_length(p_distribution_ids, 1) is null then
    return jsonb_build_object('returned', 0, 'skipped', v_skipped);
  end if;

  for v_dist in
    select *
      from public.distributions
     where id = any(p_distribution_ids)
       and stock_returned_at is null
       and archived_at is null
     order by created_at
     for update
  loop
    v_qty := nullif(
      regexp_replace(coalesce(v_dist.quantity::text, ''), '[^0-9.]', '', 'g'),
      ''
    )::numeric;

    if v_qty is null or v_qty <= 0 then
      v_skipped := v_skipped || jsonb_build_object(
        'id', v_dist.id,
        'item', v_dist.item,
        'reason', 'invalid quantity'
      );
      continue;
    end if;

    select i.*
      into v_inv
      from public.inventory i
     where lower(trim(i.item)) = lower(trim(v_dist.item))
       and (
         v_dist.category is null or trim(v_dist.category) = ''
         or lower(trim(i.category)) = lower(trim(v_dist.category))
       )
       and (
         v_dist.unit is null or trim(v_dist.unit) = ''
         or lower(trim(i.unit)) = lower(trim(v_dist.unit))
       )
     order by i.id
     limit 1
     for update;

    if not found then
      v_skipped := v_skipped || jsonb_build_object(
        'id', v_dist.id,
        'item', v_dist.item,
        'reason', 'no matching inventory item'
      );
      continue;
    end if;

    update public.inventory
       set quantity_on_hand = coalesce(quantity_on_hand, 0) + v_qty
     where id = v_inv.id;

    update public.distributions
       set stock_returned_at = now(),
           stock_returned_for = p_household_id
     where id = v_dist.id;

    v_returned := v_returned + 1;
  end loop;

  return jsonb_build_object('returned', v_returned, 'skipped', v_skipped);
end;
$$;

grant execute on function public.return_distribution_stock(uuid[], uuid) to authenticated;

-- Symmetric operation: when an archived household is restored, take the
-- quantities that were returned to inventory back out again, so the items
-- belong to the household's record once more.
create or replace function public.restore_household_stock(p_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house record;
  v_dist record;
  v_inv record;
  v_qty numeric;
  v_restored integer := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_shortages jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only staff can restore items to a household.';
  end if;

  select household_head, contact_number, barangay
    into v_house
    from public.beneficiaries
   where id = p_household_id;

  if not found then
    return jsonb_build_object(
      'restored', 0,
      'skipped', jsonb_build_array(jsonb_build_object('reason', 'household not found')),
      'shortages', v_shortages
    );
  end if;

  for v_dist in
    select d.*
      from public.distributions d
     where d.stock_returned_at is not null
       and d.archived_at is null
       and (
         d.stock_returned_for = p_household_id
         or (
           d.stock_returned_for is null
           and (
             d.household_id = p_household_id
             or (
               d.household_id is null
               and (
                 (
                   v_house.contact_number is not null
                   and v_house.contact_number <> ''
                   and lower(trim(d.contact_primary)) = lower(trim(v_house.contact_number))
                 )
                 or (
                   lower(trim(d.household_head)) = lower(trim(v_house.household_head))
                   and (
                     d.barangay is null or trim(d.barangay) = ''
                     or lower(trim(d.barangay)) = lower(trim(v_house.barangay))
                   )
                 )
               )
             )
           )
         )
       )
     order by d.created_at
     for update
  loop
    v_qty := nullif(
      regexp_replace(coalesce(v_dist.quantity::text, ''), '[^0-9.]', '', 'g'),
      ''
    )::numeric;

    if v_qty is null or v_qty <= 0 then
      v_skipped := v_skipped || jsonb_build_object(
        'id', v_dist.id,
        'item', v_dist.item,
        'reason', 'invalid quantity'
      );
      continue;
    end if;

    select i.*
      into v_inv
      from public.inventory i
     where lower(trim(i.item)) = lower(trim(v_dist.item))
       and (
         v_dist.category is null or trim(v_dist.category) = ''
         or lower(trim(i.category)) = lower(trim(v_dist.category))
       )
       and (
         v_dist.unit is null or trim(v_dist.unit) = ''
         or lower(trim(i.unit)) = lower(trim(v_dist.unit))
       )
     order by i.id
     limit 1
     for update;

    if not found then
      v_skipped := v_skipped || jsonb_build_object(
        'id', v_dist.id,
        'item', v_dist.item,
        'reason', 'no matching inventory item'
      );
      continue;
    end if;

    if coalesce(v_inv.quantity_on_hand, 0) < v_qty then
      v_shortages := v_shortages || jsonb_build_object(
        'item', v_dist.item,
        'needed', v_qty,
        'on_hand', coalesce(v_inv.quantity_on_hand, 0)
      );
    end if;

    update public.inventory
       set quantity_on_hand = coalesce(quantity_on_hand, 0) - v_qty
     where id = v_inv.id;

    update public.distributions
       set stock_returned_at = null,
           stock_returned_for = null
     where id = v_dist.id;

    v_restored := v_restored + 1;
  end loop;

  return jsonb_build_object(
    'restored', v_restored,
    'skipped', v_skipped,
    'shortages', v_shortages
  );
end;
$$;

grant execute on function public.restore_household_stock(uuid) to authenticated;
