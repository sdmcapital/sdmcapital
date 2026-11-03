-- Showcase por propiedad: dos tablas nuevas que reemplazan a `showcase_barranco`.
--
-- `showcase_barranco` era clave/valor SIN columna de propiedad (323 filas, un
-- singleton para todo el sitio), con los topes escritos en el componente y en
-- el admin, y con la tabla misma creada a mano en el dashboard: no existe en
-- ninguna migración. Esta es la primera vez que el contenido del showcase tiene
-- DDL versionado.
--
-- ESTE ARCHIVO SOLO CREA. No toca `showcase_barranco`, que sigue siendo lo que
-- lee producción hasta que el código nuevo se despliegue. El backfill de El
-- Barranco va en el archivo siguiente.
--
--   showcase_contenido   textos y cifras sueltas:  (propiedad_id, clave) → valor
--   showcase_items       listas de largo variable: amenidades, actividades,
--                        construcciones, energía, producción, galería, filas de
--                        ficha técnica, tarjetas del brief… sin tope fijo.
--
-- ─── DOS DESVIACIONES RESPECTO DEL ESQUEMA PEDIDO, y por qué ─────────────────
--
-- 1. `desc` / `desc_es` se llaman `descripcion` / `descripcion_es`.
--    `DESC` es palabra reservada de SQL: la columna obligaría a entrecomillarla
--    en cada consulta y choca con `order=…desc` en PostgREST.
--
-- 2. Se agregan `valor` y `valor_es` a showcase_items.
--    Hay tres listas cuyo ítem es un PAR «rótulo → cifra», no «título → texto»:
--    las filas de la ficha técnica (clave/valor), las stats del destino
--    («25+» / «Years in operation») y las tarjetas del brief («USD 3M» /
--    «Asking price»). Sin esta columna habría que esconder la cifra en
--    `descripcion` o en `icono`, que es justamente la clase de truco que el
--    modelo nuevo viene a eliminar. Es nullable: el resto de las listas no la
--    usa.
--
-- El icono (`icono`) es un NOMBRE del registro de iconos del front, no un SVG.
-- Un nombre desconocido o vacío simplemente no pinta icono.
--
-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- El mismo patrón que `showcase_barranco` (verificado en pg_policies antes de
-- escribir esto): anon solo SELECT; authenticated ALL. La escritura anónima
-- está cerrada. Además se le REVOCA a anon el privilegio de escritura a nivel de
-- tabla: la política ya lo impide, pero un GRANT de más no debería depender de
-- que nadie agregue después una política permisiva (la clase de fallo que
-- 20260805000300 tuvo que corregir en otras cuatro tablas).

CREATE TABLE public.showcase_contenido (
  propiedad_id uuid        NOT NULL REFERENCES public.propiedades(id) ON DELETE CASCADE,
  clave        text        NOT NULL,
  valor        text        NOT NULL DEFAULT '',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (propiedad_id, clave),
  CONSTRAINT showcase_contenido_clave_formato CHECK (clave ~ '^[a-z][a-z0-9_]*$')
);

COMMENT ON TABLE public.showcase_contenido IS
  'Textos y cifras sueltas del showcase de una propiedad. Bilingüe por sufijo: `clave` (EN) y `clave_es`; _es vacío o ausente = usa EN. Ausente o vacío = esa pieza no se pinta.';

CREATE TABLE public.showcase_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  propiedad_id    uuid        NOT NULL REFERENCES public.propiedades(id) ON DELETE CASCADE,
  seccion         text        NOT NULL,
  orden           integer     NOT NULL DEFAULT 0,
  titulo          text,
  titulo_es       text,
  descripcion     text,
  descripcion_es  text,
  valor           text,
  valor_es        text,
  img             text,
  icono           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT showcase_items_seccion_formato CHECK (seccion ~ '^[a-z][a-z0-9_]*$')
);

-- Sin UNIQUE (propiedad_id, seccion, orden) a propósito: reordenar una lista
-- intercambia dos `orden`, y con una restricción única ese UPDATE fallaría en
-- el paso intermedio.
CREATE INDEX showcase_items_propiedad_seccion_orden
  ON public.showcase_items (propiedad_id, seccion, orden);

COMMENT ON TABLE public.showcase_items IS
  'Listas del showcase de una propiedad, una fila por ítem, ordenadas por `orden` dentro de (propiedad_id, seccion). `_es` nulo = usa EN. `icono` es un nombre del registro de iconos del front.';

-- ── RLS ──
ALTER TABLE public.showcase_contenido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_items     ENABLE ROW LEVEL SECURITY;

CREATE POLICY showcase_contenido_select_anon
  ON public.showcase_contenido FOR SELECT TO anon USING (true);
CREATE POLICY showcase_contenido_all_auth
  ON public.showcase_contenido FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY showcase_items_select_anon
  ON public.showcase_items FOR SELECT TO anon USING (true);
CREATE POLICY showcase_items_all_auth
  ON public.showcase_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.showcase_contenido FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.showcase_items     FROM anon;
