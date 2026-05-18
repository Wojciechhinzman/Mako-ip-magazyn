create table if not exists public.issue_documents (
  id uuid primary key default gen_random_uuid(),
  document_number text not null unique,
  employee_id uuid not null references public.employees(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.stock_movements
add column if not exists issue_document_id uuid references public.issue_documents(id) on delete set null;

create index if not exists issue_documents_created_at_idx on public.issue_documents (created_at desc);
create index if not exists stock_movements_issue_document_id_idx on public.stock_movements (issue_document_id);

alter table public.issue_documents enable row level security;

drop policy if exists "Authenticated users can read issue documents" on public.issue_documents;
create policy "Authenticated users can read issue documents" on public.issue_documents for select to authenticated using (true);

drop policy if exists "Authenticated users can insert issue documents" on public.issue_documents;
create policy "Authenticated users can insert issue documents" on public.issue_documents for insert to authenticated with check (true);

grant select, insert on public.issue_documents to authenticated;

create or replace function public.issue_stock_batch(
  p_lines jsonb,
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
  v_document_id uuid;
  v_document_number text;
  v_line jsonb;
  v_item public.items%rowtype;
  v_item_id uuid;
  v_quantity numeric;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Dodaj przynajmniej jeden artykuł do wydania.';
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

    select * into v_item
    from public.items
    where id = v_item_id
    for update;

    if not found then
      raise exception 'Nie znaleziono artykułu.';
    end if;

    if v_item.quantity < v_quantity then
      raise exception 'Nie można wydać więcej niż aktualny stan magazynowy dla: %.', v_item.name;
    end if;

    update public.items
    set quantity = quantity - v_quantity
    where id = v_item_id;

    insert into public.stock_movements (
      type, item_id, employee_id, project_id, issue_document_id, item_name, size, material, quantity, unit, comment
    )
    values (
      'out', v_item_id, p_employee_id, p_project_id, v_document_id, v_item.name, v_item.size, v_item.material, v_quantity, v_item.unit, nullif(trim(coalesce(p_comment, '')), '')
    );
  end loop;

  return v_document_id;
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
begin
  return public.issue_stock_batch(
    jsonb_build_array(jsonb_build_object('item_id', p_item_id, 'quantity', p_quantity)),
    p_employee_id,
    p_project_id,
    p_comment
  );
end;
$$;

grant execute on function public.issue_stock_batch(jsonb, uuid, uuid, text) to authenticated;
grant execute on function public.issue_stock(uuid, numeric, uuid, uuid, text) to authenticated;
