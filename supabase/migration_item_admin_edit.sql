create or replace function public.update_item_details(
  p_item_id uuid,
  p_name text,
  p_size text,
  p_material text,
  p_unit text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_id uuid;
  v_stock record;
  v_new_name text;
  v_new_size text;
  v_new_material text;
  v_new_unit text;
begin
  if not public.current_user_is_admin() then
    raise exception 'Brak uprawnien administratora do edycji asortymentu.';
  end if;

  v_new_name := trim(coalesce(p_name, ''));
  v_new_size := trim(coalesce(p_size, ''));
  v_new_material := trim(coalesce(p_material, ''));
  v_new_unit := trim(coalesce(p_unit, ''));

  if v_new_name = ''
    or v_new_size = ''
    or v_new_material = ''
    or v_new_unit = '' then
    raise exception 'Nazwa, rozmiar, material i jednostka sa wymagane.';
  end if;

  if not exists (select 1 from public.items where id = p_item_id) then
    raise exception 'Nie znaleziono artykulu.';
  end if;

  select id into v_target_id
  from public.items
  where id <> p_item_id
    and lower(trim(name)) = lower(v_new_name)
    and lower(trim(size)) = lower(v_new_size)
    and lower(trim(material)) = lower(v_new_material)
  order by (name = v_new_name and size = v_new_size and material = v_new_material) desc
  limit 1;

  if v_target_id is not null then
    for v_stock in
      select warehouse_id, quantity
      from public.item_stocks
      where item_id = p_item_id
    loop
      insert into public.item_stocks (item_id, warehouse_id, quantity, updated_at)
      values (v_target_id, v_stock.warehouse_id, v_stock.quantity, now())
      on conflict (item_id, warehouse_id)
      do update set
        quantity = public.item_stocks.quantity + excluded.quantity,
        updated_at = now();
    end loop;

    update public.stock_movements
    set
      item_id = v_target_id,
      item_name = v_new_name,
      size = v_new_size,
      material = v_new_material,
      unit = v_new_unit
    where item_id = p_item_id;

    delete from public.item_stocks where item_id = p_item_id;
    delete from public.items where id = p_item_id;

    update public.items
    set
      name = v_new_name,
      size = v_new_size,
      material = v_new_material,
      unit = v_new_unit
    where id = v_target_id;

    perform public.sync_item_total(v_target_id);
    return;
  end if;

  begin
    update public.items
    set
      name = v_new_name,
      size = v_new_size,
      material = v_new_material,
      unit = v_new_unit
    where id = p_item_id;

    if not found then
      raise exception 'Nie znaleziono artykulu.';
    end if;
  exception
    when unique_violation then
      select id into v_target_id
      from public.items
      where id <> p_item_id
        and lower(trim(name)) = lower(v_new_name)
        and lower(trim(size)) = lower(v_new_size)
        and lower(trim(material)) = lower(v_new_material)
      order by (name = v_new_name and size = v_new_size and material = v_new_material) desc
      limit 1;

      if v_target_id is null then
        raise exception 'Taki artykul juz istnieje, ale nie udalo sie znalezc pozycji do scalenia.';
      end if;

      for v_stock in
        select warehouse_id, quantity
        from public.item_stocks
        where item_id = p_item_id
      loop
        insert into public.item_stocks (item_id, warehouse_id, quantity, updated_at)
        values (v_target_id, v_stock.warehouse_id, v_stock.quantity, now())
        on conflict (item_id, warehouse_id)
        do update set
          quantity = public.item_stocks.quantity + excluded.quantity,
          updated_at = now();
      end loop;

      update public.stock_movements
      set
        item_id = v_target_id,
        item_name = v_new_name,
        size = v_new_size,
        material = v_new_material,
        unit = v_new_unit
      where item_id = p_item_id;

      delete from public.item_stocks where item_id = p_item_id;
      delete from public.items where id = p_item_id;

      update public.items
      set
        name = v_new_name,
        size = v_new_size,
        material = v_new_material,
        unit = v_new_unit
      where id = v_target_id;

      perform public.sync_item_total(v_target_id);
      return;
  end;
end;
$$;

grant execute on function public.update_item_details(uuid, text, text, text, text) to authenticated;

drop policy if exists "Authenticated users can manage items" on public.items;
drop policy if exists "Admins can manage items" on public.items;
create policy "Admins can manage items" on public.items
for all to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
