-- La Colmena: la galería no repite fotos.
--
-- La migración 20261103000700 agregó a la galería las 8 fotos que salían de
-- producción, pero la tilapia #15 YA estaba entre las 7 de la galería (posición 6).
-- Quedaba dos veces. Se quita la copia nueva (orden 8) y la galería queda con 14
-- fotos distintas: las 7 de antes más #02, #12, #45, #46, #59, #64 y #14. El hueco en
-- `orden` (8) no importa: la lectura ordena. Ninguna foto se borra de R2.
-- Solo toca El Jardín del Edén (d0218a20-…).

DO $$
DECLARE
  pid uuid := 'd0218a20-1d05-4d0a-9731-2c944de65dbe';
  n   int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.propiedades WHERE id = pid AND slug = 'el-jardin-del-eden-la-colmena') THEN
    RAISE EXCEPTION 'La propiedad El Jardín del Edén no está donde se esperaba';
  END IF;

  DELETE FROM public.showcase_items g
   WHERE g.propiedad_id = pid AND g.seccion = 'galeria' AND g.orden = 8
     AND EXISTS (SELECT 1 FROM public.showcase_items o
                  WHERE o.propiedad_id = pid AND o.seccion = 'galeria' AND o.orden < 8 AND o.img = g.img);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Se esperaba quitar 1 foto duplicada, se quitaron %', n; END IF;

  SELECT count(*) INTO n FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'galeria';
  IF n <> 14 THEN RAISE EXCEPTION 'La galería debía quedar con 14 fotos, tiene %', n; END IF;
  SELECT count(DISTINCT img) INTO n FROM public.showcase_items WHERE propiedad_id = pid AND seccion = 'galeria';
  IF n <> 14 THEN RAISE EXCEPTION 'Hay fotos repetidas en la galería (% distintas de 14)', n; END IF;

  SELECT count(*) INTO n FROM public.showcase_items WHERE propiedad_id = 'eccfd92d-713e-4e0a-a074-ff76daffd81e';
  IF n <> 61 THEN RAISE EXCEPTION 'El Barranco debía tener 61 ítems, tiene %', n; END IF;
END $$;
