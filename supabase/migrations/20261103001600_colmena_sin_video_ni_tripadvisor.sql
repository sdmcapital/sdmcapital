-- La Colmena: se quitan el video y el enlace de TripAdvisor de la sección del destino.
-- Se vacían las claves (en la base «vacío» = fila borrada, igual que hace el panel al guardar un
-- campo en blanco). El código que las soporta —render condicional, campos del panel— se queda para
-- volver a usarlas: basta cargar de nuevo los valores. Solo La Colmena.

DO $$
DECLARE n int;
BEGIN
  DELETE FROM public.showcase_contenido
   WHERE propiedad_id = 'd0218a20-1d05-4d0a-9731-2c944de65dbe'
     AND clave IN ('destino_video_id', 'destino_tripadvisor_url', 'destino_tripadvisor_texto', 'destino_tripadvisor_texto_es');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'Se esperaba borrar 4 claves, se borraron %', n; END IF;
  SELECT count(*) INTO n FROM public.showcase_contenido WHERE propiedad_id = 'eccfd92d-713e-4e0a-a074-ff76daffd81e';
  IF n <> 88 THEN RAISE EXCEPTION 'El Barranco debía tener 88 claves, tiene %', n; END IF;
END $$;
