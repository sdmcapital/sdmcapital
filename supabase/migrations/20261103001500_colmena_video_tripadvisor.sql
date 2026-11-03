-- La Colmena: video de YouTube y enlace de TripAdvisor del Salto Cristal, en la sección del destino.
-- Claves nuevas de showcase_contenido (si una está vacía o no existe, ese elemento no se pinta):
--   destino_video_id               ID del video (acepta también la URL; el front extrae el ID)
--   destino_tripadvisor_url        URL https
--   destino_tripadvisor_texto(_es) texto del enlace, en inglés y en español
-- Solo La Colmena (d0218a20-…). El Barranco no tiene ninguna de las claves y no cambia.

DO $$
DECLARE
  pid uuid := 'd0218a20-1d05-4d0a-9731-2c944de65dbe';
  n   int;
BEGIN
  INSERT INTO public.showcase_contenido (propiedad_id, clave, valor) VALUES
    (pid, 'destino_video_id', 'X5EdCOT-IoY'),
    (pid, 'destino_tripadvisor_url', 'https://www.tripadvisor.com/Attraction_Review-g2108618-d8565876-Reviews-Salto_Cristal-Paraguari_Paraguari_Department.html'),
    (pid, 'destino_tripadvisor_texto', 'Salto Cristal on TripAdvisor'),
    (pid, 'destino_tripadvisor_texto_es', 'Salto Cristal en TripAdvisor')
  ON CONFLICT (propiedad_id, clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();

  SELECT count(*) INTO n FROM public.showcase_contenido WHERE propiedad_id = pid AND clave LIKE 'destino\_%';
  IF n <> 4 THEN RAISE EXCEPTION 'Debían quedar 4 claves destino_*, hay %', n; END IF;
  SELECT count(*) INTO n FROM public.showcase_contenido WHERE propiedad_id = 'eccfd92d-713e-4e0a-a074-ff76daffd81e';
  IF n <> 88 THEN RAISE EXCEPTION 'El Barranco debía tener 88 claves, tiene %', n; END IF;
END $$;
