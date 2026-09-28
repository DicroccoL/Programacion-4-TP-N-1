-- Ejecutar una vez en Supabase SQL Editor.
-- Si ya existen reseñas duplicadas para la misma película y usuario,
-- resolverlas antes de crear el índice único.

CREATE UNIQUE INDEX IF NOT EXISTS resenias_pelicula_usuario_unico
  ON public.resenias (pelicula_id, usuario_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resenias_puntaje_rango_check'
      AND conrelid = 'public.resenias'::regclass
  ) THEN
    ALTER TABLE public.resenias
      ADD CONSTRAINT resenias_puntaje_rango_check
      CHECK (puntaje BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resenias_comentario_largo_check'
      AND conrelid = 'public.resenias'::regclass
  ) THEN
    ALTER TABLE public.resenias
      ADD CONSTRAINT resenias_comentario_largo_check
      CHECK (comentario IS NULL OR char_length(btrim(comentario)) <= 500);
  END IF;
END $$;

ALTER TABLE public.resenias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resenias_lectura_publica ON public.resenias;
CREATE POLICY resenias_lectura_publica
  ON public.resenias
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS resenias_insertar_propias ON public.resenias;
CREATE POLICY resenias_insertar_propias
  ON public.resenias
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS resenias_actualizar_propias ON public.resenias;
CREATE POLICY resenias_actualizar_propias
  ON public.resenias
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE OR REPLACE FUNCTION public.obtener_resumenes_resenias(p_pelicula_ids uuid[])
RETURNS TABLE (pelicula_id uuid, promedio numeric, total bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.pelicula_id, AVG(r.puntaje)::numeric, COUNT(*)
  FROM public.resenias AS r
  WHERE r.pelicula_id = ANY (p_pelicula_ids)
  GROUP BY r.pelicula_id;
$$;

REVOKE ALL ON FUNCTION public.obtener_resumenes_resenias(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_resumenes_resenias(uuid[]) TO anon, authenticated;
