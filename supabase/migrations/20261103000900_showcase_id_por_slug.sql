-- Resolver el showcase por slug también cuando la propiedad está INACTIVA.
--
-- `propiedades` solo muestra a `anon` las filas con `activo IS TRUE` (RLS). El
-- showcase resolvía el slug consultando `propiedades`, así que
-- /propiedades/el-jardin-del-eden-la-colmena/showcase daba «Page not found» mientras
-- la propiedad estuviera inactiva, aunque el mismo showcase cargara por UUID.
--
-- Esta función devuelve SOLO el id de la propiedad con ese slug, y solo si tiene
-- contenido de showcase. No abre `propiedades`: no devuelve ninguna otra columna ni
-- filtra propiedades sin showcase. Quien conozca el slug de una propiedad inactiva
-- con showcase llega a lo mismo que quien conozca su UUID, que ya funcionaba.
-- SECURITY DEFINER para saltar la RLS de `propiedades`, con search_path fijo.

CREATE OR REPLACE FUNCTION public.showcase_id_por_slug(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
    FROM public.propiedades p
   WHERE p.slug = p_slug
     AND EXISTS (SELECT 1 FROM public.showcase_contenido c WHERE c.propiedad_id = p.id)
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.showcase_id_por_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.showcase_id_por_slug(text) TO anon, authenticated;

DO $$
BEGIN
  IF public.showcase_id_por_slug('el-jardin-del-eden-la-colmena') IS DISTINCT FROM 'd0218a20-1d05-4d0a-9731-2c944de65dbe'::uuid THEN
    RAISE EXCEPTION 'El slug de La Colmena no resuelve';
  END IF;
  IF public.showcase_id_por_slug('hotel-restaurante-futaleufu-futaleufu-10d') IS DISTINCT FROM 'eccfd92d-713e-4e0a-a074-ff76daffd81e'::uuid THEN
    RAISE EXCEPTION 'El slug de El Barranco no resuelve';
  END IF;
  IF public.showcase_id_por_slug('slug-que-no-existe') IS NOT NULL THEN
    RAISE EXCEPTION 'Un slug inexistente no debe resolver';
  END IF;
END $$;
