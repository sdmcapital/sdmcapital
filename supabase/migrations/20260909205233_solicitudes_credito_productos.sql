-- ── solicitudes_credito: cuatro productos, no solo hipotecario ───────────────
--
-- La tabla nació hipotecaria (`solicitudes_credito.sql`, aplicado a mano en
-- junio) y todas sus columnas de negocio describen una compra con crédito
-- hipotecario. El modal pasa a cubrir cuatro productos, así que hacen falta un
-- discriminador y las tres columnas que los otros tres necesitan.
--
-- QUÉ COLUMNA USA CADA PRODUCTO
--
--   comunes a los cuatro
--     nombres · apellidos · email · telefono · rut
--
--   hipotecario    accion ('compra' | 'refinanciamiento') · valor_uf
--                  + si accion = 'compra': tipo_propiedad · condicion_propiedad
--                  + situacion_laboral · sueldo_promedio
--
--   consumo        monto_solicitado (CLP, lo que el cliente necesita)
--                  + situacion_laboral · sueldo_promedio
--
--   bancarizacion  tipo_persona ('persona' | 'empresa')
--                  + si tipo_persona = 'persona': situacion_laboral · sueldo_promedio
--                  (una empresa no tiene ni situación laboral ni sueldo)
--
--   leaseback      tipo_bien · monto_solicitado (valor estimado del bien, CLP)
--
-- `monto_solicitado` la comparten consumo y leaseback con dos significados
-- distintos —lo que se pide y lo que vale el bien—, y es deliberado: son la
-- misma magnitud, un monto en pesos, y `producto` ya dice cuál de los dos es.
-- Dos columnas separadas dejarían una siempre nula en cada fila.
--
-- Lo que un producto NO usa viaja como NULL explícito desde el formulario, no
-- ausente: en supabase-js una clave con `undefined` desaparece del cuerpo de la
-- petición y la columna se quedaría con lo que hubiera. Ver el `payload` de
-- `SolicitudCreditoForm.tsx`.
--
-- LAS 3 FILAS EXISTENTES son hipotecarias y tienen `valor_uf` y `accion`
-- poblados (verificado antes de escribir esto), así que el DEFAULT las
-- clasifica sola y los tres CHECK pasan sin rellenar nada a mano.
--
-- POR QUÉ LOS CHECK NO EXIGEN MÁS DE LO QUE EXIGEN: `producto_valido` cierra el
-- dominio del discriminador, que es lo que el resto del código da por cierto.
-- Los otros dos solo exigen aquello sin lo cual la solicitud no sirve para
-- nada: un hipotecario sin monto ni acción, un consumo sin monto. El resto de
-- la obligatoriedad —situación laboral, tipo de bien, tipo de persona— vive en
-- el formulario, y subirla acá convertiría cualquier cambio de copy en una
-- migración.
--
-- `accion` y `condicion_propiedad` siguen SIN CHECK, como estaban. Cerrar sus
-- dominios ahora tocaría filas que ya existen y no es lo que esta migración
-- viene a hacer.


-- ── 1 · Las cuatro columnas ──────────────────────────────────────────────────

ALTER TABLE public.solicitudes_credito
  ADD COLUMN IF NOT EXISTS producto text NOT NULL DEFAULT 'hipotecario';

ALTER TABLE public.solicitudes_credito
  ADD COLUMN IF NOT EXISTS monto_solicitado numeric;

ALTER TABLE public.solicitudes_credito
  ADD COLUMN IF NOT EXISTS tipo_persona text;

ALTER TABLE public.solicitudes_credito
  ADD COLUMN IF NOT EXISTS tipo_bien text;


-- ── 2 · Los tres CHECK, con nombre explícito ─────────────────────────────────
--
-- Postgres no tiene `ADD CONSTRAINT IF NOT EXISTS`, así que la idempotencia se
-- consigue con DROP IF EXISTS + ADD. Es seguro: un CHECK no guarda datos, y al
-- recrearlo Postgres vuelve a validar la tabla entera.
--
-- Van con nombre propio y no autogenerado para que el 23514 diga cuál falló:
-- con nombre, el `message` del error que llega al navegador es
-- «new row for relation "solicitudes_credito" violates check constraint
-- "consumo_completo"», y eso ya es el diagnóstico.

ALTER TABLE public.solicitudes_credito DROP CONSTRAINT IF EXISTS producto_valido;
ALTER TABLE public.solicitudes_credito ADD CONSTRAINT producto_valido
  CHECK (producto IN ('hipotecario', 'consumo', 'bancarizacion', 'leaseback'));

ALTER TABLE public.solicitudes_credito DROP CONSTRAINT IF EXISTS hipotecario_completo;
ALTER TABLE public.solicitudes_credito ADD CONSTRAINT hipotecario_completo
  CHECK (producto <> 'hipotecario' OR (valor_uf IS NOT NULL AND accion IS NOT NULL));

ALTER TABLE public.solicitudes_credito DROP CONSTRAINT IF EXISTS consumo_completo;
ALTER TABLE public.solicitudes_credito ADD CONSTRAINT consumo_completo
  CHECK (producto <> 'consumo' OR monto_solicitado IS NOT NULL);


-- ── 3 · Que PostgREST vea las columnas nuevas ────────────────────────────────
--
-- Sin esto el INSERT del formulario responde 400 con «Could not find the
-- 'producto' column of 'solicitudes_credito' in the schema cache» hasta que el
-- caché se refresque solo. Mismo cierre que `20260805000300`.

NOTIFY pgrst, 'reload schema';
