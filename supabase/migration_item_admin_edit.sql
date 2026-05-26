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
begin
  if not public.current_user_is_admin() then
    raise exception 'Brak uprawnien administratora do edycji asortymentu.';
  end if;

  if trim(coalesce(p_name, '')) = ''
    or trim(coalesce(p_size, '')) = ''
    or trim(coalesce(p_material, '')) = ''
    or trim(coalesce(p_unit, '')) = '' then
    raise exception 'Nazwa, rozmiar, material i jednostka sa wymagane.';
  end if;

  update public.items
  set
    name = trim(p_name),
    size = trim(p_size),
    material = trim(p_material),
    unit = trim(p_unit)
  where id = p_item_id;

  if not found then
    raise exception 'Nie znaleziono artykulu.';
  end if;
exception
  when unique_violation then
    raise exception 'Taki artykul juz istnieje. Zmien nazwe, rozmiar albo material.';
end;
$$;

grant execute on function public.update_item_details(uuid, text, text, text, text) to authenticated;

drop policy if exists "Authenticated users can manage items" on public.items;
drop policy if exists "Admins can manage items" on public.items;
create policy "Admins can manage items" on public.items
for all to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());
