-- Número de WhatsApp propio de una propiedad (opcional).
--
-- El botón «Consultar por WhatsApp» de la ficha usaba SIEMPRE el número global del sitio
-- (`contenido_sitio.clave = 'whatsapp'`, hoy 56937478846; con 56937478846 también de respaldo en el
-- código). No había ningún campo por propiedad ni por agente que sirviera. Esta columna es opcional:
-- vacía (NULL) = el número global, como hasta hoy; con valor = ese número para ESA ficha. El botón
-- flotante y el showcase siguen con el número global.
--
-- Formato de `wa.me`: solo dígitos, con el código de país y sin «+», espacios ni ceros iniciales
-- (595992955053). El CHECK lo hace cumplir en la base: entre 8 y 15 dígitos, el primero distinto de 0.

ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS whatsapp_numero text;

ALTER TABLE public.propiedades
  DROP CONSTRAINT IF EXISTS propiedades_whatsapp_numero_formato;
ALTER TABLE public.propiedades
  ADD CONSTRAINT propiedades_whatsapp_numero_formato
  CHECK (whatsapp_numero IS NULL OR whatsapp_numero ~ '^[1-9][0-9]{7,14}$');

COMMENT ON COLUMN public.propiedades.whatsapp_numero IS
  'Número de WhatsApp de esta ficha, formato wa.me (595992955053: solo dígitos, con código de país, sin + ni ceros iniciales). NULL = usa contenido_sitio.whatsapp.';

-- La Colmena (+595 992 955053). Solo esa fila.
DO $$
DECLARE n int;
BEGIN
  UPDATE public.propiedades SET whatsapp_numero = '595992955053'
   WHERE id = 'd0218a20-1d05-4d0a-9731-2c944de65dbe' AND slug = 'el-jardin-del-eden-la-colmena';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Se esperaba actualizar 1 propiedad, fueron %', n; END IF;
  SELECT count(*) INTO n FROM public.propiedades WHERE whatsapp_numero IS NOT NULL;
  IF n <> 1 THEN RAISE EXCEPTION 'Solo La Colmena debía tener número propio, hay %', n; END IF;
END $$;
