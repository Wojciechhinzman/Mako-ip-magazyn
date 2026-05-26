create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.app_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.item_stocks (
  item_id uuid not null references public.items(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  quantity numeric(12, 3) not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (item_id, warehouse_id)
);

insert into public.warehouses (name, active) values
  ('Magazyn 1', true),
  ('Magazyn 2', true),
  ('Magazyn 3', true)
on conflict (name) do nothing;

insert into public.app_admins (email) values
  ('wojciech.hinzman@mako-ip.de')
on conflict (email) do nothing;

alter table public.stock_movements
add column if not exists warehouse_id uuid references public.warehouses(id) on delete set null;

alter table public.stock_movements
add column if not exists to_warehouse_id uuid references public.warehouses(id) on delete set null;

alter table public.stock_movements
drop constraint if exists stock_movements_type_check;

alter table public.stock_movements
add constraint stock_movements_type_check check (type in ('in', 'out', 'transfer'));

alter table public.stock_movements
drop constraint if exists stock_movements_project_for_out;

alter table public.stock_movements
add constraint stock_movements_project_for_out check (
  (type = 'out' and project_id is not null)
  or (type = 'in' and project_id is null)
  or (type = 'transfer' and project_id is null and to_warehouse_id is not null)
);

create index if not exists item_stocks_warehouse_id_idx on public.item_stocks (warehouse_id);
create index if not exists stock_movements_warehouse_id_idx on public.stock_movements (warehouse_id);
create index if not exists stock_movements_to_warehouse_id_idx on public.stock_movements (to_warehouse_id);

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.sync_item_total(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.items
  set quantity = coalesce((select sum(quantity) from public.item_stocks where item_id = p_item_id), 0)
  where id = p_item_id;
end;
$$;

insert into public.item_stocks (item_id, warehouse_id, quantity)
select i.id, w.id, i.quantity
from public.items i
cross join lateral (
  select id from public.warehouses where name = 'Magazyn 1' limit 1
) w
where i.quantity > 0
on conflict (item_id, warehouse_id) do nothing;

alter table public.warehouses enable row level security;
alter table public.app_admins enable row level security;
alter table public.item_stocks enable row level security;

drop policy if exists "Authenticated users can read warehouses" on public.warehouses;
create policy "Authenticated users can read warehouses" on public.warehouses for select to authenticated using (true);
drop policy if exists "Admins can manage warehouses" on public.warehouses;
create policy "Admins can manage warehouses" on public.warehouses for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "Admins can read admins" on public.app_admins;
create policy "Admins can read admins" on public.app_admins for select to authenticated using (public.current_user_is_admin());
drop policy if exists "Admins can manage admins" on public.app_admins;
create policy "Admins can manage admins" on public.app_admins for all to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "Authenticated users can read item stocks" on public.item_stocks;
create policy "Authenticated users can read item stocks" on public.item_stocks for select to authenticated using (true);
drop policy if exists "Authenticated users can manage item stocks" on public.item_stocks;
create policy "Authenticated users can manage item stocks" on public.item_stocks for all to authenticated using (true) with check (true);

grant select on public.warehouses to authenticated;
grant insert, update, delete on public.warehouses to authenticated;
grant select, insert, update, delete on public.app_admins to authenticated;
grant select, insert, update, delete on public.item_stocks to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.sync_item_total(uuid) to authenticated;

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
    v_name := trim(v_line ->> 'name');
    v_size := trim(v_line ->> 'size');
    v_material := trim(v_line ->> 'material');
    v_unit := trim(v_line ->> 'unit');
    v_quantity := (v_line ->> 'quantity')::numeric;

    if v_name = '' or v_size = '' or v_material = '' or v_unit = '' or v_quantity <= 0 then
      raise exception 'Nazwa, rozmiar, materiał, jednostka i ilość większa od zera są wymagane.';
    end if;

    insert into public.items (name, size, material, unit, quantity)
    values (v_name, v_size, v_material, v_unit, 0)
    on conflict (name, size, material)
    do update set unit = excluded.unit
    returning id into v_item_id;

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

create or replace function public.receive_stock(
  p_name text,
  p_size text,
  p_material text,
  p_quantity numeric,
  p_unit text,
  p_employee_id uuid,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_warehouse_id uuid;
  v_item_id uuid;
begin
  select id into v_warehouse_id from public.warehouses where name = 'Magazyn 1' limit 1;

  perform public.receive_stock_batch(
    jsonb_build_array(jsonb_build_object('name', p_name, 'size', p_size, 'material', p_material, 'quantity', p_quantity, 'unit', p_unit)),
    v_warehouse_id,
    p_employee_id,
    p_comment
  );

  select id into v_item_id
  from public.items
  where name = trim(p_name) and size = trim(p_size) and material = trim(p_material)
  limit 1;

  return v_item_id;
end;
$$;

create or replace function public.issue_stock_batch(
  p_lines jsonb,
  p_employee_id uuid,
  p_project_id uuid,
  p_comment text default null,
  p_warehouse_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid;
  v_document_number text;
  v_line jsonb;
  v_item public.items%rowtype;
  v_item_id uuid;
  v_quantity numeric;
  v_available numeric;
  v_warehouse_id uuid;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Dodaj przynajmniej jeden artykuł do wydania.';
  end if;

  v_warehouse_id := p_warehouse_id;
  if v_warehouse_id is null then
    select id into v_warehouse_id from public.warehouses where name = 'Magazyn 1' limit 1;
  end if;

  v_document_number := 'WZ/' || to_char(now(), 'YYYYMMDD/HH24MISS');

  insert into public.issue_documents (document_number, employee_id, project_id, comment)
  values (v_document_number, p_employee_id, p_project_id, nullif(trim(coalesce(p_comment, '')), ''))
  returning id into v_document_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_item_id := (v_line ->> 'item_id')::uuid;
    v_quantity := (v_line ->> 'quantity')::numeric;

    if v_quantity <= 0 then
      raise exception 'Ilość musi być większa od zera.';
    end if;

    select * into v_item from public.items where id = v_item_id for update;
    if not found then
      raise exception 'Nie znaleziono artykułu.';
    end if;

    select quantity into v_available
    from public.item_stocks
    where item_id = v_item_id and warehouse_id = v_warehouse_id
    for update;

    if coalesce(v_available, 0) < v_quantity then
      raise exception 'Nie można wydać więcej niż aktualny stan magazynowy dla: %.', v_item.name;
    end if;

    update public.item_stocks
    set quantity = quantity - v_quantity, updated_at = now()
    where item_id = v_item_id and warehouse_id = v_warehouse_id;

    perform public.sync_item_total(v_item_id);

    insert into public.stock_movements (
      type, item_id, employee_id, project_id, issue_document_id, warehouse_id, item_name, size, material, quantity, unit, comment
    )
    values (
      'out', v_item_id, p_employee_id, p_project_id, v_document_id, v_warehouse_id, v_item.name, v_item.size, v_item.material, v_quantity, v_item.unit, nullif(trim(coalesce(p_comment, '')), '')
    );
  end loop;

  return v_document_id;
end;
$$;

create or replace function public.transfer_stock_batch(
  p_lines jsonb,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
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
  v_item public.items%rowtype;
  v_item_id uuid;
  v_quantity numeric;
  v_available numeric;
  v_count integer := 0;
begin
  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'Magazyn źródłowy i docelowy muszą być różne.';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Dodaj przynajmniej jeden artykuł do przesunięcia.';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_item_id := (v_line ->> 'item_id')::uuid;
    v_quantity := (v_line ->> 'quantity')::numeric;

    if v_quantity <= 0 then
      raise exception 'Ilość musi być większa od zera.';
    end if;

    select * into v_item from public.items where id = v_item_id for update;
    if not found then
      raise exception 'Nie znaleziono artykułu.';
    end if;

    select quantity into v_available
    from public.item_stocks
    where item_id = v_item_id and warehouse_id = p_from_warehouse_id
    for update;

    if coalesce(v_available, 0) < v_quantity then
      raise exception 'Brak wystarczającego stanu do przesunięcia dla: %.', v_item.name;
    end if;

    update public.item_stocks
    set quantity = quantity - v_quantity, updated_at = now()
    where item_id = v_item_id and warehouse_id = p_from_warehouse_id;

    insert into public.item_stocks (item_id, warehouse_id, quantity)
    values (v_item_id, p_to_warehouse_id, v_quantity)
    on conflict (item_id, warehouse_id)
    do update set quantity = public.item_stocks.quantity + excluded.quantity, updated_at = now();

    perform public.sync_item_total(v_item_id);

    insert into public.stock_movements (
      type, item_id, employee_id, project_id, warehouse_id, to_warehouse_id, item_name, size, material, quantity, unit, comment
    )
    values (
      'transfer', v_item_id, p_employee_id, null, p_from_warehouse_id, p_to_warehouse_id, v_item.name, v_item.size, v_item.material, v_quantity, v_item.unit, nullif(trim(coalesce(p_comment, '')), '')
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.receive_stock_batch(jsonb, uuid, uuid, text) to authenticated;
grant execute on function public.issue_stock_batch(jsonb, uuid, uuid, text, uuid) to authenticated;
grant execute on function public.transfer_stock_batch(jsonb, uuid, uuid, uuid, text) to authenticated;
