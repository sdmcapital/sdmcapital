-- La Colmena: reorganización de «Earthbag buildings», «Farming & livestock» y la galería.
--
-- 1. La quesería (sin foto) sale de construcciones y pasa a producción como una
--    tarjeta de texto más, con el mismo texto y el mismo icono. Es la MISMA fila:
--    solo cambia `seccion` y `orden`, así que no se reescribe ningún texto.
--    Producción queda en 8 tarjetas (…, cabras 6, quesería 7, gallinero 8);
--    construcciones en 4 (casa principal, posada, casa maya, piscina).
-- 2. Producción pasa a tarjetas de solo texto: las 8 fotos salen de las tarjetas
--    (img = NULL, fotos = '{}') y se agregan a la galería, que pasa de 7 a 15, en el
--    orden: tilapia #15 y #02, frutales #12, #45, #46 y #59, forrajeras #64, bambú #14.
--    Las fotos NO se borran de R2.
--
-- Solo toca filas de El Jardín del Edén (d0218a20-…). No toca showcase_barranco.

DO $$
DECLARE
  pid   uuid := 'd0218a20-1d05-4d0a-9731-2c944de65dbe';
  n     int;
  t_img text; t_f text[];
  f_img text; f_f text[];
  g_img text; b_img text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.propiedades WHERE id = pid AND slug = 'el-jardin-del-eden-la-colmena') THEN
    RAISE EXCEPTION 'La propiedad El Jardín del Edén no está donde se esperaba';
  END IF;

  -- Fotos de las cuatro tarjetas con foto de producción, leídas de la base.
  SELECT img, fotos INTO t_img, t_f FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'produccion' AND titulo = 'Tilapia ponds';
  SELECT img, fotos INTO f_img, f_f FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'produccion' AND titulo = 'Fruit trees';
  SELECT img INTO g_img FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'produccion' AND titulo = 'Forage';
  SELECT img INTO b_img FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'produccion' AND titulo = 'Bamboo';
  IF t_img IS NULL OR cardinality(t_f) <> 1 THEN RAISE EXCEPTION 'Tilapia: se esperaban 1 foto principal + 1 extra'; END IF;
  IF f_img IS NULL OR cardinality(f_f) <> 3 THEN RAISE EXCEPTION 'Frutales: se esperaban 1 foto principal + 3 extra'; END IF;
  IF g_img IS NULL OR b_img IS NULL THEN RAISE EXCEPTION 'Forrajeras y bambú deben tener foto principal'; END IF;
  IF (SELECT count(*) FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'galeria') <> 7 THEN
    RAISE EXCEPTION 'La galería debía tener 7 fotos';
  END IF;

  -- Galería: las 8 fotos van detrás de las 7 que ya había (la #69 sigue siendo la primera).
  INSERT INTO public.showcase_items (propiedad_id, seccion, orden, img) VALUES
    (pid, 'galeria',  8, t_img),
    (pid, 'galeria',  9, t_f[1]),
    (pid, 'galeria', 10, f_img),
    (pid, 'galeria', 11, f_f[1]),
    (pid, 'galeria', 12, f_f[2]),
    (pid, 'galeria', 13, f_f[3]),
    (pid, 'galeria', 14, g_img),
    (pid, 'galeria', 15, b_img);

  -- Producción: sin fotos.
  UPDATE public.showcase_items SET img = NULL, fotos = '{}', updated_at = now()
   WHERE propiedad_id = pid AND seccion = 'produccion' AND titulo IN ('Tilapia ponds', 'Fruit trees', 'Forage', 'Bamboo');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'Se esperaban 4 tarjetas de producción con foto, hubo %', n; END IF;

  -- Quesería: de construcciones a producción. Primero se hace sitio (gallinero 8).
  UPDATE public.showcase_items SET orden = 8, updated_at = now()
   WHERE propiedad_id = pid AND seccion = 'produccion' AND titulo = 'Chicken coop';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Gallinero: se esperaba 1 fila, hubo %', n; END IF;
  UPDATE public.showcase_items SET seccion = 'produccion', orden = 7, updated_at = now()
   WHERE propiedad_id = pid AND seccion = 'construcciones' AND titulo = 'Cheese-making room' AND img IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Quesería: se esperaba 1 fila sin foto, hubo %', n; END IF;

  -- Resultado esperado.
  SELECT count(*) INTO n FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'galeria' AND img IS NOT NULL;
  IF n <> 15 THEN RAISE EXCEPTION 'La galería debía quedar con 15 fotos, tiene %', n; END IF;
  SELECT count(*) INTO n FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'produccion';
  IF n <> 8 THEN RAISE EXCEPTION 'Producción debía quedar con 8 tarjetas, tiene %', n; END IF;
  SELECT count(*) INTO n FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'produccion' AND (img IS NOT NULL OR cardinality(fotos) > 0 OR icono IS NULL);
  IF n <> 0 THEN RAISE EXCEPTION 'Toda tarjeta de producción debe ser de texto y llevar icono (% no cumplen)', n; END IF;
  SELECT count(*) INTO n FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'construcciones' AND img IS NOT NULL AND cardinality(fotos) = 0;
  IF n <> 4 OR (SELECT count(*) FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'construcciones') <> 4 THEN
    RAISE EXCEPTION 'Construcciones debía quedar con 4 tarjetas, todas con foto única';
  END IF;

  -- El Barranco no se toca.
  SELECT count(*) INTO n FROM public.showcase_contenido WHERE propiedad_id = 'eccfd92d-713e-4e0a-a074-ff76daffd81e';
  IF n <> 88 THEN RAISE EXCEPTION 'El Barranco debía tener 88 claves, tiene %', n; END IF;
  SELECT count(*) INTO n FROM public.showcase_items WHERE propiedad_id = 'eccfd92d-713e-4e0a-a074-ff76daffd81e';
  IF n <> 61 THEN RAISE EXCEPTION 'El Barranco debía tener 61 ítems, tiene %', n; END IF;
END $$;
