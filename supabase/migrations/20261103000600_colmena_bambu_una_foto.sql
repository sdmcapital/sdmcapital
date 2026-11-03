-- La Colmena: la tarjeta de bambú queda solo con la #14. La #18 mostraba el mismo
-- arroyo entre bambúes, casi desde el mismo ángulo. La foto NO se borra de R2: solo
-- deja de mostrarse. Con `fotos = '{}'` la franja de miniaturas no se renderiza.
-- Solo toca una fila de El Jardín del Edén (d0218a20-…).

DO $$
DECLARE
  pid uuid := 'd0218a20-1d05-4d0a-9731-2c944de65dbe';
  n   int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.propiedades WHERE id = pid AND slug = 'el-jardin-del-eden-la-colmena') THEN
    RAISE EXCEPTION 'La propiedad El Jardín del Edén no está donde se esperaba';
  END IF;

  UPDATE public.showcase_items
     SET fotos = '{}', updated_at = now()
   WHERE propiedad_id = pid AND seccion = 'produccion' AND titulo = 'Bamboo'
     AND cardinality(fotos) = 1;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Bamboo: se esperaba 1 fila con 1 foto extra, hubo %', n; END IF;

  SELECT count(*) INTO n FROM public.showcase_contenido WHERE propiedad_id = 'eccfd92d-713e-4e0a-a074-ff76daffd81e';
  IF n <> 88 THEN RAISE EXCEPTION 'El Barranco debía tener 88 claves, tiene %', n; END IF;
END $$;
