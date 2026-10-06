-- Ejecutar en el SQL Editor. Solo los administradores suben pósters.
begin;
-- Los procesos del sistema/SQL Editor no tienen auth.uid(). Se muestran como Sistema.
alter table public.log_actividad alter column usuario_id drop not null;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('peliculas-imagenes', 'peliculas-imagenes', true, 5242880,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists posters_insert_admin on storage.objects;
create policy posters_insert_admin on storage.objects for insert to authenticated
with check (bucket_id = 'peliculas-imagenes' and
  exists(select 1 from public.perfiles where id = auth.uid() and rol = 'admin'));

-- Leer pósters públicos es parte de la cartelera. No se permite borrar/sobrescribir desde Angular.
drop policy if exists posters_select_publico on storage.objects;
create policy posters_select_publico on storage.objects for select to anon, authenticated
using (bucket_id = 'peliculas-imagenes');

drop trigger if exists auditoria_configuracion_descuentos on public.configuracion_descuentos;
create trigger auditoria_configuracion_descuentos after insert or update or delete
on public.configuracion_descuentos for each row execute function public.registrar_auditoria_fila();
drop trigger if exists auditoria_cupones_descuento on public.cupones_descuento;
create trigger auditoria_cupones_descuento after insert or update or delete
on public.cupones_descuento for each row execute function public.registrar_auditoria_fila();
commit;
