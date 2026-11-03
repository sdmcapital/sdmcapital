-- El Barranco: modo de contraste reforzado (el mismo que ya usa La Colmena).
--
-- Medido por píxeles en producción: 170 textos únicos bajo 4,5:1 (135 a 3,7:1 y 26 a 4,1:1 por el gris `muted` sobre
-- tarjeta y sobre fondo; la tarjeta de pesca a 3,1:1; el hero con el eyebrow a 1,0–1,9:1, el subtítulo a 1,7–3,2:1 y el
-- título de 52 px a 2,0:1 en móvil).
--
--   · tema_texto_desc = #B0A89D  activa el modo reforzado (descripciones y rótulos claros, velo localizado en el hero,
--                                acento aclarado sobre fotos, selector de idioma en barra fija). El mismo valor que
--                                La Colmena: 8,4:1 sobre el fondo, 7,4:1 sobre tarjeta encima de bgMid.
--   · tema_velo_movil = fuerte   velo del hero más alto en móvil: las fotos de El Barranco son más claras que las de
--                                La Colmena y el velo de siempre no alcanzaba (ver mobile.css).
--
-- La paleta de El Barranco NO cambia: `tema_acento` sigue siendo #4CAF82, la marca del hotel.
-- Solo toca dos filas de El Barranco (eccfd92d-…). No toca showcase_barranco ni otra propiedad.

DO $$
DECLARE
  pid uuid := 'eccfd92d-713e-4e0a-a074-ff76daffd81e';
  n   int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.propiedades WHERE id = pid AND slug = 'hotel-restaurante-futaleufu-futaleufu-10d') THEN
    RAISE EXCEPTION 'El Barranco no está donde se esperaba';
  END IF;
  SELECT count(*) INTO n FROM public.showcase_contenido WHERE propiedad_id = pid;
  IF n <> 88 THEN RAISE EXCEPTION 'El Barranco debía tener 88 claves antes de este cambio, tiene %', n; END IF;
  IF (SELECT valor FROM public.showcase_contenido WHERE propiedad_id = pid AND clave = 'tema_acento') IS DISTINCT FROM '#4CAF82' THEN
    RAISE EXCEPTION 'El acento de El Barranco no es #4CAF82';
  END IF;

  INSERT INTO public.showcase_contenido (propiedad_id, clave, valor) VALUES
    (pid, 'tema_texto_desc', '#B0A89D'),
    (pid, 'tema_velo_movil', 'fuerte')
  ON CONFLICT (propiedad_id, clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();

  SELECT count(*) INTO n FROM public.showcase_contenido WHERE propiedad_id = pid;
  IF n <> 90 THEN RAISE EXCEPTION 'El Barranco debía quedar con 90 claves, tiene %', n; END IF;
END $$;
