-- La Colmena: dos ajustes tras revisar la landing.
--
-- 1. Fotos repetidas en «The buildings». La posada (#48) repite el edificio de
--    techo verde de la #03 casi desde el mismo ángulo, y la franja de la piscina
--    (#04) repite el encuadre de la #10. Las dos salen de `fotos` y quedan solo
--    con la principal (`img`). Las fotos NO se borran de R2: solo dejan de
--    mostrarse en estas tarjetas. Con `fotos = '{}'` la franja de miniaturas no
--    se renderiza.
--
-- 2. Contraste de las descripciones de tarjeta. El texto usaba `muted` #7a7268
--    (3,94:1 sobre tarjeta, 3,69:1 sobre tarjeta encima de bgMid). Se añade la
--    clave `tema_texto_desc` = #B0A89D (7,94:1 y 7,42:1). Es un dato de La
--    Colmena: sin la clave, el código usa `muted`, y El Barranco no cambia.
--
-- Solo toca filas de El Jardín del Edén (d0218a20-…). No toca showcase_barranco.

DO $$
DECLARE
  pid  uuid := 'd0218a20-1d05-4d0a-9731-2c944de65dbe';
  n    int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.propiedades WHERE id = pid AND slug = 'el-jardin-del-eden-la-colmena') THEN
    RAISE EXCEPTION 'La propiedad El Jardín del Edén no está donde se esperaba';
  END IF;

  UPDATE public.showcase_items
     SET fotos = '{}', updated_at = now()
   WHERE propiedad_id = pid AND seccion = 'construcciones' AND titulo = 'Guesthouse'
     AND cardinality(fotos) = 1;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Guesthouse: se esperaba 1 fila con 1 foto extra, hubo %', n; END IF;

  UPDATE public.showcase_items
     SET fotos = '{}', updated_at = now()
   WHERE propiedad_id = pid AND seccion = 'construcciones' AND titulo = 'Pool'
     AND cardinality(fotos) = 1;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Pool: se esperaba 1 fila con 1 foto extra, hubo %', n; END IF;

  INSERT INTO public.showcase_contenido (propiedad_id, clave, valor)
  VALUES (pid, 'tema_texto_desc', '#B0A89D')
  ON CONFLICT (propiedad_id, clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();

  -- El Barranco no se toca: mismas filas que antes.
  SELECT count(*) INTO n FROM public.showcase_contenido WHERE propiedad_id = 'eccfd92d-713e-4e0a-a074-ff76daffd81e';
  IF n <> 88 THEN RAISE EXCEPTION 'El Barranco debía tener 88 claves, tiene %', n; END IF;
END $$;
