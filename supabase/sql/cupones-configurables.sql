-- Configuración de primera compra y cupones por edad.
-- Conserva la reserva, creación de entradas, confirmación y puntos de la RPC original.
begin;

create table if not exists public.configuracion_descuentos (
  id boolean primary key default true check (id),
  porcentaje_primera_compra numeric(5,2) not null default 20 check (porcentaje_primera_compra between 0 and 100)
);
insert into public.configuracion_descuentos(id) values (true) on conflict do nothing;

create table if not exists public.cupones_descuento (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9_-]{3,30}$' and codigo <> 'PRIMERA_COMPRA'),
  porcentaje numeric(5,2) not null check (porcentaje > 0 and porcentaje <= 100),
  solo_mayores_50 boolean not null default true,
  activo boolean not null default true
);
alter table public.configuracion_descuentos enable row level security;
alter table public.cupones_descuento enable row level security;
drop policy if exists descuentos_lectura on public.configuracion_descuentos;
create policy descuentos_lectura on public.configuracion_descuentos for select to anon, authenticated using (true);
drop policy if exists descuentos_admin on public.configuracion_descuentos;
create policy descuentos_admin on public.configuracion_descuentos for update to authenticated
using (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'))
with check (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'));
drop policy if exists cupones_admin on public.cupones_descuento;
create policy cupones_admin on public.cupones_descuento for all to authenticated
using (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'))
with check (exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin'));
grant select on public.configuracion_descuentos to anon, authenticated;
grant update on public.configuracion_descuentos to authenticated;
grant select, insert, update on public.cupones_descuento to authenticated;

alter table public.ordenes add column if not exists porcentaje_descuento numeric(5,2) not null default 0;

create or replace function public.comprar_orden_con_comprobante(
  p_funcion_id uuid, p_butaca_ids uuid[], p_token uuid,
  p_fecha_nacimiento date, p_asiste_adulto boolean, p_codigo_cupon text
)
returns table(orden_id uuid, codigo_qr text, subtotal numeric, descuento numeric,
  codigo_cupon text, total numeric, fecha_compra timestamptz, estado text,
  pelicula text, fecha_funcion timestamptz, sala integer, formato text, idioma text,
  butacas text[], porcentaje_descuento numeric)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_orden_id uuid;
  v_usuario_id uuid := auth.uid();
  v_primera_compra_usada boolean := true;
  v_nacimiento date;
  v_porcentaje numeric := 0;
  v_porcentaje_primera numeric := 0;
  v_cupon public.cupones_descuento%rowtype;
  v_codigo text := nullif(upper(trim(p_codigo_cupon)), '');
  v_codigo_aplicado text;
  v_subtotal numeric;
  v_total numeric;
  v_descuento numeric;
  v_puntos integer;
  v_primera_elegible boolean := false;
begin
  if v_usuario_id is not null then
    select p.primera_compra_usada, p.fecha_nacimiento
      into v_primera_compra_usada, v_nacimiento
      from public.perfiles p where p.id = v_usuario_id for update;
    if not found then raise exception 'No se encontró el perfil de la cuenta'; end if;
    v_primera_elegible := not coalesce(v_primera_compra_usada, false)
      and not exists (select 1 from public.ordenes o where o.usuario_id = v_usuario_id and o.estado = 'PAGADA');
    if v_primera_elegible then
      select c.porcentaje_primera_compra into v_porcentaje_primera from public.configuracion_descuentos c where c.id;
      v_porcentaje := coalesce(v_porcentaje_primera, 0);
      if v_porcentaje > 0 then v_codigo_aplicado := 'PRIMERA_COMPRA'; end if;
    end if;
  end if;

  if v_codigo is not null then
    if v_usuario_id is null then raise exception 'Iniciá sesión para usar un cupón'; end if;
    select c.* into v_cupon from public.cupones_descuento c where c.codigo = v_codigo and c.activo for share;
    if not found then raise exception 'El cupón no existe o está inactivo'; end if;
    if v_cupon.solo_mayores_50 and (v_nacimiento is null or extract(year from age(current_date, v_nacimiento)) <= 50) then
      raise exception 'Este cupón es exclusivo para usuarios mayores de 50 años. Revisá la fecha de nacimiento de tu perfil';
    end if;
    if v_cupon.porcentaje > v_porcentaje then
      v_porcentaje := v_cupon.porcentaje;
      v_codigo_aplicado := v_cupon.codigo;
    end if;
  end if;

  v_orden_id := public.crear_orden_butacas_pendiente(p_funcion_id, p_butaca_ids, p_token, p_fecha_nacimiento, p_asiste_adulto);
  select o.total into v_subtotal from public.ordenes o where o.id = v_orden_id for update;
  if v_subtotal is null then raise exception 'No se pudo calcular el subtotal de la compra'; end if;
  if v_porcentaje > 0 then
    update public.entradas e set precio_abonado = round(e.precio_abonado * (1 - v_porcentaje / 100), 2)
      where e.orden_id = v_orden_id;
  end if;
  select coalesce(sum(e.precio_abonado), 0) into v_total from public.entradas e where e.orden_id = v_orden_id;
  v_descuento := greatest(0, v_subtotal - v_total);
  if v_descuento <= 0 then v_codigo_aplicado := null; v_porcentaje := 0; end if;
  v_puntos := case when v_usuario_id is null then 0 else floor(v_total)::integer end;
  update public.ordenes set subtotal = v_subtotal, descuento = v_descuento,
    codigo_cupon = v_codigo_aplicado, porcentaje_descuento = v_porcentaje,
    total = v_total, estado = 'PAGADA', expira_pago = null, puntos_generados = v_puntos where id = v_orden_id;
  if v_usuario_id is not null then
    update public.perfiles p set primera_compra_usada = true,
      puntos_fidelidad = coalesce(p.puntos_fidelidad, 0) + v_puntos where p.id = v_usuario_id;
  end if;
  delete from public.reservas_butacas where funcion_id = p_funcion_id and butaca_id = any(p_butaca_ids)
    and token_reserva_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex');
  return query select o.id::uuid, o.codigo_qr::text, o.subtotal::numeric, o.descuento::numeric,
    o.codigo_cupon::text, o.total::numeric, o.fecha_compra::timestamptz, o.estado::text,
    p.titulo::text, f.fecha_hora_inicio::timestamptz, s.numero::integer, f.formato::text, f.idioma::text,
    array_agg('Fila ' || b.fila || ' · Butaca ' || b.numero order by b.fila, b.numero), o.porcentaje_descuento::numeric
    from public.ordenes o join public.entradas e on e.orden_id = o.id join public.funciones f on f.id = e.funcion_id
    join public.peliculas p on p.id = f.pelicula_id join public.salas s on s.id = f.sala_id join public.butacas b on b.id = e.butaca_id
    where o.id = v_orden_id group by o.id, p.titulo, f.fecha_hora_inicio, s.numero, f.formato, f.idioma;
end;
$$;
revoke all on function public.comprar_orden_con_comprobante(uuid,uuid[],uuid,date,boolean,text) from public;
grant execute on function public.comprar_orden_con_comprobante(uuid,uuid[],uuid,date,boolean,text) to anon, authenticated;

-- Compatibilidad para clientes anteriores que envían cinco argumentos.
create or replace function public.comprar_orden_con_comprobante(
  p_funcion_id uuid, p_butaca_ids uuid[], p_token uuid, p_fecha_nacimiento date, p_asiste_adulto boolean
) returns table(orden_id uuid, codigo_qr text, subtotal numeric, descuento numeric, codigo_cupon text,
  total numeric, fecha_compra timestamptz, estado text, pelicula text, fecha_funcion timestamptz,
  sala integer, formato text, idioma text, butacas text[])
language sql security definer set search_path = public, pg_temp as $$
  select r.orden_id,r.codigo_qr,r.subtotal,r.descuento,r.codigo_cupon,r.total,r.fecha_compra,r.estado,
    r.pelicula,r.fecha_funcion,r.sala,r.formato,r.idioma,r.butacas
  from public.comprar_orden_con_comprobante(p_funcion_id,p_butaca_ids,p_token,p_fecha_nacimiento,p_asiste_adulto,null::text) r;
$$;
notify pgrst, 'reload schema';
commit;
