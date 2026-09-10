-- ── solicitudes_credito: el ciclo de gestión del equipo ─────────────────────
--
-- La tabla existe desde junio y NUNCA se había leído desde la aplicación: las
-- solicitudes solo llegaban por el correo de `notify-credito`. Nace
-- `src/pages/admin/Solicitudes.tsx` para verlas y gestionarlas, y estas tres
-- columnas son el estado de esa gestión.
--
-- LA REGLA QUE DA NOMBRE A ESTAS TRES COLUMNAS: el panel escribe SOLO en
-- `contactado_en`, `cerrado_en` y `resultado`. Ningún campo que llenó el
-- visitante —nombres, rut, email, telefono, producto, valor_uf, sueldo_promedio
-- y los demás— se toca desde el admin.
--
-- No es una preferencia de estilo. Es la separación que faltó en `leads`, donde
-- el panel se convirtió en un SEGUNDO escritor de `status` —columna del Worker
-- de Sofía— y escribió 'visita_confirmada', un valor que el Worker no conoce:
-- eso vació 'derivado' de la base y abrió un agujero en el filtro del
-- seguimiento de leads fríos. Acá el visitante es el único autor de sus datos y
-- el equipo el único autor de su gestión, y los dos conjuntos no se tocan.
--
-- LAS TRES SON NULL POR DEFECTO, y ese null significa algo: una solicitud
-- recién llegada no está contactada ni cerrada. El estado del ciclo NO se
-- almacena — se deriva de estas tres columnas en el panel:
--
--   cerrado_en    IS NOT NULL  →  Cerrada   (manda sobre contactado_en, porque
--                                            cerrar escribe las dos fechas)
--   contactado_en IS NOT NULL  →  Contactada
--   las dos NULL               →  Sin contactar
--
-- Es el mismo eje que `20260823000000` montó sobre `leads`, con los mismos tres
-- nombres a propósito: quien lea un panel entiende el otro.
--
-- `resultado` es NULLABLE incluso con `cerrado_en` puesto, igual que en `leads`.
-- Un cierre puede no tener motivo todavía.
--
-- LOS CUATRO VALORES DEL CHECK son los de este producto, no los de `leads`:
-- una solicitud de crédito se aprueba o se rechaza, no se «vende». Si se agrega
-- un quinto acá, va también al `RESULTADO_LABEL` de `Solicitudes.tsx` — son la
-- misma lista escrita en dos sitios.


-- ── 1 · Las tres columnas ───────────────────────────────────────────────────

ALTER TABLE public.solicitudes_credito
  ADD COLUMN IF NOT EXISTS contactado_en timestamptz;

ALTER TABLE public.solicitudes_credito
  ADD COLUMN IF NOT EXISTS cerrado_en timestamptz;

ALTER TABLE public.solicitudes_credito
  ADD COLUMN IF NOT EXISTS resultado text;


-- ── 2 · El CHECK ────────────────────────────────────────────────────────────
--
-- `DROP IF EXISTS` + `ADD` porque Postgres no tiene `ADD CONSTRAINT IF NOT
-- EXISTS`, igual que en `20260909205233`. Con nombre propio para que el 23514
-- diga cuál falló.
--
-- `resultado IS NULL OR ...` explícito y no solo el `IN`: un CHECK con NULL
-- evalúa a NULL, que Postgres deja pasar, así que el `IS NULL` no cambia el
-- comportamiento — está escrito para que se lea que el null es DELIBERADO y no
-- un descuido de quien redactó la restricción.

ALTER TABLE public.solicitudes_credito DROP CONSTRAINT IF EXISTS resultado_valido;
ALTER TABLE public.solicitudes_credito ADD CONSTRAINT resultado_valido
  CHECK (resultado IS NULL OR resultado IN ('aprobado', 'rechazado', 'desistio', 'sin_respuesta'));


-- ── 3 · El índice ───────────────────────────────────────────────────────────
--
-- El panel ordena SIEMPRE por `created_at DESC` y no ofrece otro orden, así que
-- el índice cubre la única consulta que hace. Hoy son 3 filas y da igual; el
-- día que sean 3.000 no hay que acordarse de volver.

CREATE INDEX IF NOT EXISTS solicitudes_credito_created_at_idx
  ON public.solicitudes_credito (created_at DESC);


-- ── 4 · Que PostgREST vea las columnas nuevas ───────────────────────────────
--
-- Sin esto el primer UPDATE del panel responde 400 con «Could not find the
-- 'contactado_en' column of 'solicitudes_credito' in the schema cache».

NOTIFY pgrst, 'reload schema';
