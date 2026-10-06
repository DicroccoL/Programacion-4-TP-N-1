-- Prueba real de la RPC con filas temporales. Requiere un perfil, película y función existentes.
-- Ejecutar el archivo completo: ROLLBACK revierte películas, funciones, alertas y logs de prueba.
begin;
do $test$
declare
  v_usuario uuid; v_pelicula public.peliculas; v_funcion public.funciones;
  v_pelicula_id uuid := gen_random_uuid(); v_inicio timestamptz;
begin
  select id into v_usuario from public.perfiles limit 1;
  select * into v_pelicula from public.peliculas limit 1;
  select * into v_funcion from public.funciones limit 1;
  if v_usuario is null or v_pelicula.id is null or v_funcion.id is null then raise exception 'Faltan datos para esta prueba'; end if;
  insert into public.peliculas select (jsonb_populate_record(null::public.peliculas,to_jsonb(v_pelicula)||jsonb_build_object('id',v_pelicula_id,'titulo','PRUEBA TEMPORAL ALERTAS','estado','PROXIMAMENTE','preventa_activa',false))).*;
  perform set_config('request.jwt.claim.sub',v_usuario::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_usuario)::text,true);
  insert into public.alertas_estreno(usuario_id,pelicula_id,notificada) values(v_usuario,v_pelicula_id,false) on conflict(usuario_id,pelicula_id) do update set notificada=false;
  insert into public.alertas_estreno(usuario_id,pelicula_id,notificada) values(v_usuario,v_pelicula_id,false) on conflict(usuario_id,pelicula_id) do update set notificada=false;
  if (select count(*) from public.alertas_estreno where usuario_id=v_usuario and pelicula_id=v_pelicula_id) <> 1 then raise exception 'La alerta se duplicó'; end if;
  if (select disponible from public.obtener_mis_alertas_estreno() where pelicula_id=v_pelicula_id) is distinct from false then raise exception 'Estreno sin funciones debe estar pendiente'; end if;
  update public.peliculas set estado='EN_CARTELERA' where id=v_pelicula_id;
  if (select disponible from public.obtener_mis_alertas_estreno() where pelicula_id=v_pelicula_id) is distinct from true then raise exception 'Cartelera debe estar disponible'; end if;
  update public.peliculas set estado='PROXIMAMENTE' where id=v_pelicula_id;
  select greatest(coalesce(max(fecha_hora_fin),now()),now())+interval '2 days' into v_inicio from public.funciones;
  insert into public.funciones select (jsonb_populate_record(null::public.funciones,to_jsonb(v_funcion)||jsonb_build_object('id',gen_random_uuid(),'pelicula_id',v_pelicula_id,'fecha_hora_inicio',v_inicio,'fecha_hora_fin',v_inicio+make_interval(mins=>v_pelicula.duracion_min)))).*;
  if (select disponible from public.obtener_mis_alertas_estreno() where pelicula_id=v_pelicula_id) is distinct from true then raise exception 'Función futura debe habilitar la alerta'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  perform set_config('request.jwt.claims','{}',true);
  if exists(select 1 from public.obtener_mis_alertas_estreno() where pelicula_id=v_pelicula_id) then raise exception 'Se expuso una alerta ajena'; end if;
end $test$;
rollback;
select 'OK: sin duplicados, estreno pendiente, cartelera disponible, función futura disponible, aislamiento por usuario. Datos de prueba revertidos.' as resultado;
