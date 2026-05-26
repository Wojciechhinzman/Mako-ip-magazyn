create or replace function public.normalize_text(p_value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(p_value, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.receive_stock_batch(
  p_lines jsonb,
  p_warehouse_id uuid,
  p_employee_id uuid,
  p_comment text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_name text;
  v_size text;
  v_material text;
  v_unit text;
  v_count integer := 0;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Dodaj przynajmniej jeden artykuł do przyjęcia.';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_name := regexp_replace(trim(v_line ->> 'name'), '\s+', ' ', 'g');
    v_size := regexp_replace(trim(v_line ->> 'size'), '\s+', ' ', 'g');
    v_material := regexp_replace(trim(v_line ->> 'material'), '\s+', ' ', 'g');
    v_unit := regexp_replace(trim(v_line ->> 'unit'), '\s+', ' ', 'g');
    v_quantity := (v_line ->> 'quantity')::numeric;

    if v_name = '' or v_size = '' or v_material = '' or v_unit = '' or v_quantity <= 0 then
      raise exception 'Nazwa, rozmiar, materiał, jednostka i ilość większa od zera są wymagane.';
    end if;

    select id into v_item_id
    from public.items
    where public.normalize_text(name) = public.normalize_text(v_name)
      and public.normalize_text(size) = public.normalize_text(v_size)
      and public.normalize_text(material) = public.normalize_text(v_material)
    order by created_at asc
    limit 1;

    if v_item_id is null then
      insert into public.items (name, size, material, unit, quantity)
      values (v_name, v_size, v_material, v_unit, 0)
      returning id into v_item_id;
    else
      update public.items
      set unit = v_unit
      where id = v_item_id;
    end if;

    insert into public.item_stocks (item_id, warehouse_id, quantity)
    values (v_item_id, p_warehouse_id, v_quantity)
    on conflict (item_id, warehouse_id)
    do update set quantity = public.item_stocks.quantity + excluded.quantity, updated_at = now();

    perform public.sync_item_total(v_item_id);

    insert into public.stock_movements (
      type, item_id, employee_id, project_id, warehouse_id, item_name, size, material, quantity, unit, comment
    )
    values (
      'in', v_item_id, p_employee_id, null, p_warehouse_id, v_name, v_size, v_material, v_quantity, v_unit, nullif(trim(coalesce(p_comment, '')), '')
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.normalize_text(text) to authenticated;
grant execute on function public.receive_stock_batch(jsonb, uuid, uuid, text) to authenticated;
