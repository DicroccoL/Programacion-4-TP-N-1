-- Elimina una sala vacía y sus butacas como una única operación.
-- Ejecutar este script una vez desde el SQL Editor del proyecto Supabase.

CREATE OR REPLACE FUNCTION public.eliminar_sala_sin_funciones(p_sala_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_sala_id public.salas.id%TYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE id = auth.uid()
      AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo un administrador puede eliminar salas.'
      USING ERRCODE = '42501';
  END IF;

  SELECT id
  INTO v_sala_id
  FROM public.salas
  WHERE id::text = p_sala_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La sala indicada ya no existe.'
      USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.funciones
    WHERE sala_id = v_sala_id
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar esta sala porque tiene funciones asociadas. Eliminá o reasigná esas funciones antes de volver a intentarlo.'
      USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.butacas
  WHERE sala_id = v_sala_id;

  DELETE FROM public.salas
  WHERE id = v_sala_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.eliminar_sala_sin_funciones(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eliminar_sala_sin_funciones(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.eliminar_sala_sin_funciones(text) TO authenticated;
