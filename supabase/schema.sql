create extension if not exists "pgcrypto";

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text not null,
  material text not null,
  unit text not null,
  quantity numeric(12, 3) not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_unique_variant unique (name, size, material)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('in', 'out')),
  item_id uuid not null references public.items(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  item_name text not null,
  size text not null,
  material text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit text not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint stock_movements_project_for_out check (
    (type = 'out' and project_id is not null) or (type = 'in' and project_id is null)
  )
);

create index if not exists items_search_idx on public.items (name, size, material);
create index if not exists stock_movements_created_at_idx on public.stock_movements (created_at desc);
create index if not exists stock_movements_item_id_idx on public.stock_movements (item_id);
create index if not exists stock_movements_employee_id_idx on public.stock_movements (employee_id);
create index if not exists stock_movements_project_id_idx on public.stock_movements (project_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
before update on public.items
for each row execute function public.set_updated_at();

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
  v_item_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'Ilość musi być większa od zera.';
  end if;

  insert into public.items (name, size, material, unit, quantity)
  values (trim(p_name), trim(p_size), trim(p_material), trim(p_unit), p_quantity)
  on conflict (name, size, material)
  do update set
    quantity = public.items.quantity + excluded.quantity,
    unit = excluded.unit
  returning id into v_item_id;

  insert into public.stock_movements (
    type, item_id, employee_id, project_id, item_name, size, material, quantity, unit, comment
  )
  values (
    'in', v_item_id, p_employee_id, null, trim(p_name), trim(p_size), trim(p_material), p_quantity, trim(p_unit), nullif(trim(coalesce(p_comment, '')), '')
  );

  return v_item_id;
end;
$$;

create or replace function public.issue_stock(
  p_item_id uuid,
  p_quantity numeric,
  p_employee_id uuid,
  p_project_id uuid,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  v_movement_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'Ilość musi być większa od zera.';
  end if;

  select * into v_item
  from public.items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Nie znaleziono artykułu.';
  end if;

  if v_item.quantity < p_quantity then
    raise exception 'Nie można wydać więcej niż aktualny stan magazynowy.';
  end if;

  update public.items
  set quantity = quantity - p_quantity
  where id = p_item_id;

  insert into public.stock_movements (
    type, item_id, employee_id, project_id, item_name, size, material, quantity, unit, comment
  )
  values (
    'out', p_item_id, p_employee_id, p_project_id, v_item.name, v_item.size, v_item.material, p_quantity, v_item.unit, nullif(trim(coalesce(p_comment, '')), '')
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

alter table public.items enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "Authenticated users can read items" on public.items;
create policy "Authenticated users can read items" on public.items for select to authenticated using (true);
drop policy if exists "Authenticated users can manage items" on public.items;
create policy "Authenticated users can manage items" on public.items for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read employees" on public.employees;
create policy "Authenticated users can read employees" on public.employees for select to authenticated using (true);
drop policy if exists "Authenticated users can manage employees" on public.employees;
create policy "Authenticated users can manage employees" on public.employees for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read projects" on public.projects;
create policy "Authenticated users can read projects" on public.projects for select to authenticated using (true);
drop policy if exists "Authenticated users can manage projects" on public.projects;
create policy "Authenticated users can manage projects" on public.projects for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can read stock movements" on public.stock_movements;
create policy "Authenticated users can read stock movements" on public.stock_movements for select to authenticated using (true);
drop policy if exists "Authenticated users can insert stock movements" on public.stock_movements;
create policy "Authenticated users can insert stock movements" on public.stock_movements for insert to authenticated with check (true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert on public.stock_movements to authenticated;
grant execute on function public.receive_stock(text, text, text, numeric, text, uuid, text) to authenticated;
grant execute on function public.issue_stock(uuid, numeric, uuid, uuid, text) to authenticated;

insert into public.employees (full_name, active) values
  ('Jan Kowalski', true),
  ('Anna Nowak', true),
  ('Piotr Zieliński', true),
  ('Marek Wiśniewski', false)
on conflict (full_name) do nothing;

insert into public.projects (name, code, active) values
  ('Modernizacja sieci biurowej', 'MAKO-2026-001', true),
  ('Instalacja monitoringu hala A', 'MAKO-2026-002', true),
  ('Serwis infrastruktury klienta', 'MAKO-2026-003', true)
on conflict (code) do nothing;

insert into public.items (name, size, material, unit, quantity) values
  ('Rura elektroinstalacyjna', '20 mm', 'PVC', 'm', 120),
  ('Przewód UTP kat.6', '305 m', 'Cu', 'karton', 8),
  ('Peszel', '25 mm', 'PVC', 'm', 80),
  ('Uchwyt kablowy', '8 mm', 'tworzywo', 'szt.', 350),
  ('Patch panel', '24 porty', 'metal', 'szt.', 6)
on conflict (name, size, material) do update set quantity = excluded.quantity, unit = excluded.unit;
