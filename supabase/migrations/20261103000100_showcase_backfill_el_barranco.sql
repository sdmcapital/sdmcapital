-- Backfill de El Barranco: showcase_barranco → showcase_contenido + showcase_items.
--
-- SOLO LEE `showcase_barranco`; no la modifica ni la borra. Sigue siendo lo que
-- lee producción hasta que se despliegue el código nuevo, y queda como respaldo
-- hasta que alguien decida retirarla (otra migración, otro día).
--
-- Todo va en un único bloque DO: si cualquiera de las aserciones del final no
-- cuadra, el bloque entero se revierte y no queda nada a medias.
--
-- ─── QUÉ SE MIGRA, Y QUÉ NO ──────────────────────────────────────────────────
--
-- Se migra exactamente lo que el componente LEÍA. De las 323 filas:
--   · 77 claves sueltas        → showcase_contenido (8 de ellas con nombre nuevo:
--                                details_tab_X → ficha_X_titulo)
--   · 61 ítems (186 claves)    → showcase_items (las claves numeradas pasan a filas)
--   · 15 claves de imagen VACÍAS en producción: el componente las pintaba con
--     el objeto `IMG` del código. Aquí se escribe esa misma URL en la base,
--     para que quitar los fallbacks del componente no deje a El Barranco sin
--     fotos.
--   · las claves HUÉRFANAS (amenity_N_*, ficha_inf_*, ficha_leg_*, act_N_title,
--     dest_p1/p2, prop_desc, …) NO se migran: ningún componente las lee.
--
-- Más 11 claves NUEVAS en contenido que antes vivían en el código del
-- componente: acento de la paleta, idioma por defecto, SEO, eyebrow del hero,
-- texto del pie y alt de la foto de destino. Y las 6 tarjetas del brief, cuyos
-- rótulos estaban en un ternario del componente (EN/ES) y ahora son dato.
--
-- Un valor vacío NO se migra: «vacío» ya no significa «usa el texto por
-- defecto» sino «no hay nada que pintar».

CREATE FUNCTION pg_temp.v(k text) RETURNS text LANGUAGE sql STABLE AS $f$
  SELECT CASE WHEN btrim(valor) <> '' THEN valor END
  FROM public.showcase_barranco WHERE clave = k
$f$;

DO $backfill$
DECLARE
  bid  constant uuid := 'eccfd92d-713e-4e0a-a074-ff76daffd81e';
  base constant text := 'https://ugfhgfpgxyfzafudxaeo.supabase.co/storage/v1/object/public/imagenes/propiedades/';
  n_cont integer;
  n_items integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.propiedades WHERE id = bid) THEN
    RAISE EXCEPTION 'El Barranco (%) no existe en propiedades', bid;
  END IF;
  IF EXISTS (SELECT 1 FROM public.showcase_contenido WHERE propiedad_id = bid)
     OR EXISTS (SELECT 1 FROM public.showcase_items WHERE propiedad_id = bid) THEN
    RAISE EXCEPTION 'El Barranco ya tiene contenido en las tablas nuevas: backfill no se repite';
  END IF;

  -- ── 1. Claves sueltas con el mismo nombre ──
  INSERT INTO public.showcase_contenido (propiedad_id, clave, valor)
  SELECT bid, k, pg_temp.v(k)
  FROM unnest(ARRAY[
    'hero_titulo','banner_foto','banner_detalle_foto','precio_display','contacto_telefono','contacto_empresa',
    -- bilingües: EN y _es
    'hero_subtitulo','hero_subtitulo_es','hero_tagline','hero_tagline_es',
    'dest_eyebrow','dest_eyebrow_es','dest_titulo','dest_titulo_es',
    'destination_p1','destination_p1_es','destination_p2','destination_p2_es',
    'exp_eyebrow','exp_eyebrow_es','exp_titulo','exp_titulo_es','act_p','act_p_es',
    'prop_eyebrow','prop_eyebrow_es','prop_titulo','prop_titulo_es','propiedad_desc','propiedad_desc_es',
    'opp_eyebrow','opp_eyebrow_es','opp_titulo','opp_titulo_es',
    'opp_tab_story','opp_tab_story_es','opp_tab_brief','opp_tab_brief_es',
    'story_p1','story_p1_es','story_p2','story_p2_es','story_p3','story_p3_es',
    'brief_upside_titulo','brief_upside_titulo_es','brief_upside_texto','brief_upside_texto_es',
    'brief_legal_titulo','brief_legal_titulo_es','brief_legal_texto','brief_legal_texto_es',
    'details_eyebrow','details_eyebrow_es','details_titulo','details_titulo_es',
    'gallery_eyebrow','gallery_eyebrow_es','gallery_titulo','gallery_titulo_es',
    'contact_eyebrow','contact_eyebrow_es','contact_titulo','contact_titulo_es',
    'precio_sub','precio_sub_es','contacto_parrafo','contacto_parrafo_es'
  ]) AS k
  WHERE pg_temp.v(k) IS NOT NULL;

  -- ── 2. Títulos de los bloques de la ficha: details_tab_X → ficha_X_titulo ──
  INSERT INTO public.showcase_contenido (propiedad_id, clave, valor)
  SELECT bid, 'ficha_' || b || '_titulo' || s, pg_temp.v('details_tab_' || b || s)
  FROM unnest(ARRAY['infra','equip','legal','ops']) AS b,
       unnest(ARRAY['','_es']) AS s
  WHERE pg_temp.v('details_tab_' || b || s) IS NOT NULL;

  -- ── 3. Foto de destino: estaba vacía, la pintaba IMG.exterior ──
  INSERT INTO public.showcase_contenido (propiedad_id, clave, valor)
  VALUES (bid, 'destination_foto',
          coalesce(pg_temp.v('destination_foto'), base || '1777583053965_mg7v97c92vq.jpeg'));

  -- ── 4. Claves nuevas: lo que vivía en el código del componente ──
  INSERT INTO public.showcase_contenido (propiedad_id, clave, valor) VALUES
    (bid, 'tema_acento',          '#4CAF82'),
    (bid, 'idioma_default',       'en'),
    (bid, 'publicado',            'true'),
    (bid, 'ficha_bloques',        'infra,equip,legal,ops'),
    (bid, 'seo_titulo',           'Hotel El Barranco · Futaleufú, Patagonia'),
    (bid, 'seo_titulo_es',        'Hotel El Barranco · Futaleufú'),
    (bid, 'seo_descripcion',      'A fully operational boutique hotel and restaurant in Futaleufú, Patagonia. 25 years of history, for sale with SDM Capital.'),
    (bid, 'seo_descripcion_es',   'Hotel boutique y restaurante en operación en Futaleufú, Patagonia. 25 años de historia, en venta con SDM Capital.'),
    (bid, 'hero_eyebrow',         'SDM Capital · Exclusive Listing · Futaleufú, Patagonia'),
    (bid, 'footer_texto',         'SDM Capital Real Estate · Hotel El Barranco · Futaleufú, Chile'),
    (bid, 'destination_foto_alt', 'Futaleufú aerial view');

  -- ── 5. Carrusel del hero (4 fotos) ──
  INSERT INTO public.showcase_items (propiedad_id, seccion, orden, img)
  SELECT bid, 'hero', n,
         coalesce(pg_temp.v('hero_img_' || n),
                  base || (ARRAY['1778531485042_utd1zrr91v.jpg','1778531465482_ftlnnwfyutk.jpg',
                                 '1778531472893_zj233ren18a.jpg','1777583063859_qqx4hhentmb.jpeg'])[n])
  FROM generate_series(1, 4) AS n;

  -- ── 6. Stats del destino (3): cifra en `valor`, rótulo en `titulo` ──
  INSERT INTO public.showcase_items (propiedad_id, seccion, orden, titulo, titulo_es, valor)
  SELECT bid, 'destino_stats', n,
         pg_temp.v('dest_stat_' || n || '_label'), pg_temp.v('dest_stat_' || n || '_label_es'),
         pg_temp.v('dest_stat' || n || '_num')
  FROM generate_series(1, 3) AS n;

  -- ── 7. Actividades (3): foto vacía → la que pintaba IMG ──
  INSERT INTO public.showcase_items (propiedad_id, seccion, orden, titulo, titulo_es, descripcion, descripcion_es, img, icono)
  SELECT bid, 'actividades', n,
         pg_temp.v('actividad_' || n || '_titulo'), pg_temp.v('actividad_' || n || '_titulo_es'),
         pg_temp.v('actividad_' || n || '_sub'),    pg_temp.v('actividad_' || n || '_sub_es'),
         coalesce(pg_temp.v('act_' || n || '_img'),
                  base || (ARRAY['1778531522207_oi7mb8uwuhr.jpg','1777583064713_zh85bb8aor.jpeg','1778531531394_0wvo8zwzu3l.jpg'])[n]),
         (ARRAY['wave','fish','mountain'])[n]
  FROM generate_series(1, 3) AS n;

  -- ── 8. Fotos de «La propiedad» (4) ──
  INSERT INTO public.showcase_items (propiedad_id, seccion, orden, img)
  SELECT bid, 'propiedad_fotos', n,
         coalesce(pg_temp.v('prop_foto' || n),
                  base || (ARRAY['1777583055168_28dt3gtnyn8.jpeg','1777583057089_pesdipnyo4.jpeg',
                                 '1777583055875_ia6ypl5pr1.jpeg','1777583058072_uv5a2s1dwqf.jpeg'])[n])
  FROM generate_series(1, 4) AS n;

  -- ── 9. Amenidades (8): el icono pasa de «el del slot» a dato ──
  INSERT INTO public.showcase_items (propiedad_id, seccion, orden, titulo, titulo_es, descripcion, descripcion_es, icono)
  SELECT bid, 'amenidades', n,
         pg_temp.v('amenidad_' || n || '_titulo'), pg_temp.v('amenidad_' || n || '_titulo_es'),
         pg_temp.v('amenidad_' || n || '_desc'),   pg_temp.v('amenidad_' || n || '_desc_es'),
         (ARRAY['bed','fork','spa','home','bolt','car','key','badge'])[n]
  FROM generate_series(1, 8) AS n;

  -- ── 10. Tarjetas del brief (6): los rótulos EN/ES eran un ternario del
  --        componente; la cifra y la nota ya eran dato. La sexta («2%») era
  --        un literal del componente. ──
  INSERT INTO public.showcase_items (propiedad_id, seccion, orden, titulo, titulo_es, valor, descripcion)
  SELECT bid, 'brief', c.n, c.t_en, c.t_es,
         CASE c.n WHEN 1 THEN pg_temp.v('brief_precio')  WHEN 2 THEN pg_temp.v('brief_revenue')
                  WHEN 3 THEN pg_temp.v('brief_meses')   WHEN 4 THEN pg_temp.v('brief_guests')
                  WHEN 5 THEN pg_temp.v('brief_terreno') ELSE '2%' END,
         pg_temp.v('brief_note' || c.n)
  FROM (VALUES
    (1, 'Asking price',        'Precio de venta'),
    (2, 'Peak revenue (CLP)',  'Ingresos peak (CLP)'),
    (3, 'Months of operation', 'Meses de operación'),
    (4, 'Guests (best year)',  'Huéspedes (mejor año)'),
    (5, 'Total land area',     'Superficie total'),
    (6, 'Broker commission',   'Comisión corredora')
  ) AS c(n, t_en, t_es);

  -- ── 11. Filas de la ficha técnica: ficha_X_N_key/val (+_es) ──
  INSERT INTO public.showcase_items (propiedad_id, seccion, orden, titulo, titulo_es, valor, valor_es)
  SELECT bid, 'ficha_' || f.b, n,
         pg_temp.v('ficha_' || f.b || '_' || n || '_key'), pg_temp.v('ficha_' || f.b || '_' || n || '_key_es'),
         pg_temp.v('ficha_' || f.b || '_' || n || '_val'), pg_temp.v('ficha_' || f.b || '_' || n || '_val_es')
  FROM (VALUES ('infra', 7), ('equip', 7), ('legal', 6), ('ops', 6)) AS f(b, filas),
       LATERAL generate_series(1, f.filas) AS n;

  -- ── 12. Galería (7): fotos vacías → las que pintaba IMG ──
  INSERT INTO public.showcase_items (propiedad_id, seccion, orden, img)
  SELECT bid, 'galeria', n,
         coalesce(pg_temp.v('gallery_' || n),
                  base || (ARRAY['1777583053965_mg7v97c92vq.jpeg','1777583059062_cfjhlfacay7.jpeg',
                                 '1777583059865_4hizucq2vzy.jpeg','1777583060861_i2rbjdkn90r.jpeg',
                                 '1777583061970_gzzmcc1mcul.jpeg','1777583063859_qqx4hhentmb.jpeg',
                                 '1777583064713_zh85bb8aor.jpeg'])[n])
  FROM generate_series(1, 7) AS n;

  -- ── Aserciones: si algo no cuadra, se revierte todo ──
  SELECT count(*) INTO n_cont  FROM public.showcase_contenido WHERE propiedad_id = bid;
  SELECT count(*) INTO n_items FROM public.showcase_items     WHERE propiedad_id = bid;
  IF n_cont <> 88 THEN
    RAISE EXCEPTION 'showcase_contenido: esperaba 88 filas para El Barranco y hay %', n_cont;
  END IF;
  IF n_items <> 61 THEN
    RAISE EXCEPTION 'showcase_items: esperaba 61 filas para El Barranco y hay %', n_items;
  END IF;
  -- Ningún ítem de estas secciones puede quedar sin foto.
  IF EXISTS (SELECT 1 FROM public.showcase_items
             WHERE propiedad_id = bid AND seccion IN ('hero','propiedad_fotos','galeria') AND img IS NULL) THEN
    RAISE EXCEPTION 'hay fotos de hero/propiedad/galería sin URL';
  END IF;
  IF EXISTS (SELECT 1 FROM public.showcase_items
             WHERE propiedad_id = bid AND seccion = 'actividades' AND img IS NULL) THEN
    RAISE EXCEPTION 'hay actividades sin foto';
  END IF;
  RAISE NOTICE 'backfill El Barranco: % filas en showcase_contenido, % en showcase_items', n_cont, n_items;
END
$backfill$;
