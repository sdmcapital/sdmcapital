-- La Colmena: imagen de la tarjeta del catálogo.
--
-- La tarjeta (`components/ui/PropertyCard.tsx`) NO lee del showcase: lee de la tabla
-- `propiedades`, `imagen_principal` (y, si está vacía, `imagenes[0]`), y pide su
-- miniatura de 400 px (`thumbUrl`: <host>/thumbs/propiedades/<archivo>). El registro se
-- creó con las dos vacías, así que la tarjeta caía al rectángulo azul con «tipo · comuna».
--
-- Se pone la #52 —la vista aérea de las cúpulas y el valle, la primera del hero—, que
-- ya está en R2 con su miniatura. `imagenes` lleva la misma foto: el panel de
-- Propiedades da por hecho que la principal está dentro de `imagenes`. Solo toca la fila
-- de El Jardín del Edén (d0218a20-…), y solo si sigue sin imagen.

DO $$
DECLARE
  pid uuid := 'd0218a20-1d05-4d0a-9731-2c944de65dbe';
  url text := 'https://imagenes.sdmcapital.cl/propiedades/1793681179206_1pdzwlld25rj.jpg';
  n   int;
BEGIN
  UPDATE public.propiedades
     SET imagen_principal = url,
         imagenes = ARRAY[url]
   WHERE id = pid AND slug = 'el-jardin-del-eden-la-colmena'
     AND coalesce(imagen_principal, '') = '' AND coalesce(cardinality(imagenes), 0) = 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Se esperaba actualizar 1 propiedad sin imagen, fueron %', n; END IF;
END $$;
