-- La Colmena: comisión, título descriptivo y punto del mapa. Cambios de DATO en una sola fila.
--
-- 1. COMISIÓN. `comision_porcentaje` = 0: es el valor con el que la ficha no muestra la etiqueta
--    «Comisión corredora» (`if (p.comision_porcentaje && …)`), y el mismo que usan los proyectos
--    nuevos. NO se toca el DEFAULT de la columna (2), ni el `?? 2` del formulario, ni ninguna otra
--    propiedad.
-- 2. TÍTULO. El nombre propio no decía qué se vende. El título descriptivo sale del PDF (21 ha, casa
--    principal, posada, producción, 100 m del Salto Cristal, Paraguay). El SLUG no cambia
--    (`slug` es una columna aparte): `el-jardin-del-eden-la-colmena` sigue resolviendo.
-- 3. MAPA. La propiedad está en Isla Alta, no en el centro de La Colmena. Punto de OpenStreetMap
--    «Sub Comisaría N° 12 Isla Alta» (Camino a Salto Cristal, Paraguarí): -25,9643650 / -56,6975896.
--    OSM no tiene un nodo de «poblado» para Isla Alta; ese es el elemento más cercano con su nombre.
--    La entrada de Salto Cristal (estacionamiento, OSM) está en -25,9793084 / -56,7246571, a ~3,2 km.

DO $$
DECLARE
  pid uuid := 'd0218a20-1d05-4d0a-9731-2c944de65dbe';
  n   int;
BEGIN
  UPDATE public.propiedades
     SET comision_porcentaje = 0,
         titulo = 'Finca en Venta de 21 Hectáreas con Casa, Posada y Producción a 100 m del Salto Cristal – Paraguay',
         map_lat = -25.9643650,
         map_lng = -56.6975896,
         map_address = 'Isla Alta, Departamento de Paraguarí, Paraguay'
   WHERE id = pid AND slug = 'el-jardin-del-eden-la-colmena' AND comision_porcentaje = 2;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Se esperaba actualizar 1 propiedad, fueron %', n; END IF;

  IF (SELECT count(*) FROM public.propiedades WHERE comision_porcentaje = 0) < 32 THEN
    RAISE EXCEPTION 'Había 31 propiedades en 0 y esta debía sumarse';
  END IF;
END $$;
