-- BantayAyuda · return the items a household received back to inventory
--
-- Run this once in the Supabase SQL Editor on the existing database.
--
-- It adds a marker to distributions so the same item can never be returned
-- twice, plus a function that adds the stock back and marks the rows in one
-- transaction. The app calls that function when a beneficiary is archived
-- with the "Return the items given to this household to inventory" option.

alter table public.distributions
  add column if not exists stock_returned_at timestamptz;

-- Keep the function's own writes working even when RLS is enabled.
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

create or replace function public.return_distribution_stock(p_distribution_ids uuid[])
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
       set stock_returned_at = now()
     where id = v_dist.id;

    v_returned := v_returned + 1;
  end loop;

  return jsonb_build_object('returned', v_returned, 'skipped', v_skipped);
end;
$$;

grant execute on function public.return_distribution_stock(uuid[]) to authenticated;
