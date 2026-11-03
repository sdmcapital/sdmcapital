-- Propiedad nueva: «El Jardín del Edén» — terreno de 21 hectáreas en La Colmena,
-- Paraguay. Es la segunda landing de showcase; la primera es El Barranco.
--
-- Se crea con una migración porque el CLI es la única vía de escritura de esta
-- sesión; el admin habría hecho el mismo INSERT (`Propiedades.tsx`, `save`).
--
-- ─── DECISIONES, para que no se lean como descuidos ──────────────────────────
--
-- slug  Es el que produce `slugify(titulo, comuna, dormitorios)` del admin
--       (`${titulo}-${comuna}`, sin sufijo de dormitorios porque un terreno no
--       tiene): «El Jardín del Edén» + «La Colmena» → el-jardin-del-eden-la-colmena.
--
-- activo = false
--       Queda FUERA del catálogo público hasta que tenga contenido. La policy
--       `propiedades_select_anon` solo deja ver `activo IS TRUE`, así que ni el
--       listado, ni la ficha, ni el sitemap la muestran. El showcase sí carga
--       por UUID: resuelve el contenido directo en showcase_contenido, que no
--       depende de la visibilidad de `propiedades`. Para publicarla: activarla
--       en el admin.
--
-- superficie_total = 210000
--       La columna está en m² (el terreno de Futaleufú de 102 ha guarda
--       1.023.000). 21 ha = 210.000 m².
--
-- a_consultar = true, y el precio NO va en propiedades
--       `propiedades` solo tiene precio_uf / precio_clp / precio_usd; no hay
--       columna en guaraníes. Convertir 4.950.000.000 Gs a USD exigiría inventar
--       un tipo de cambio que quedaría grabado como si fuera dato. El precio de
--       lista se guarda tal como lo dio Víctor en showcase_contenido
--       (`precio_display`), que es texto libre y no pretende ser comparable.
--       Cuando se decida si `propiedades` gana una columna de precio en Gs, o si
--       se fija un tipo de cambio, se cambia a_consultar.
--
-- region = 'Paraguarí'
--       NO la dio Víctor: es el departamento al que pertenece La Colmena, puesto
--       por conocimiento general. Confirmar. Se pone porque la columna es
--       obligatoria en el tipo y el catálogo filtra por región.
--
-- internacional = true
--       Es una propiedad fuera de Chile; el buscador tiene la pestaña
--       «Internacional» filtrando por esta bandera.

DO $jardin$
DECLARE
  nuevo uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.propiedades WHERE slug = 'el-jardin-del-eden-la-colmena') THEN
    RAISE EXCEPTION 'ya existe una propiedad con slug el-jardin-del-eden-la-colmena';
  END IF;

  INSERT INTO public.propiedades (
    titulo, slug, tipo, categoria, estado,
    pais, region, comuna,
    superficie_total, a_consultar, activo, destacada, internacional,
    comision_porcentaje
  ) VALUES (
    'El Jardín del Edén', 'el-jardin-del-eden-la-colmena', 'terreno', 'usada', 'en_venta',
    'Paraguay', 'Paraguarí', 'La Colmena',
    210000, true, false, false, true,
    2
  ) RETURNING id INTO nuevo;

  -- Showcase con las secciones vacías: solo lo que ya se sabe.
  INSERT INTO public.showcase_contenido (propiedad_id, clave, valor) VALUES
    (nuevo, 'hero_titulo',    'El Jardín del Edén'),
    (nuevo, 'tema_acento',    '#7A8B5A'),
    (nuevo, 'idioma_default', 'en'),
    (nuevo, 'precio_display', 'Gs. 4.950.000.000');

  RAISE NOTICE 'El Jardín del Edén creada con id %', nuevo;
END
$jardin$;
