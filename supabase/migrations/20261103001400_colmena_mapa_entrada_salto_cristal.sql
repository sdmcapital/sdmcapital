-- La Colmena: el punto del mapa pasa a la entrada del Salto Cristal.
--
-- El PDF dice «a 100 m de la entrada del Salto Cristal»: es literal, la finca está pegada a esa
-- entrada y no en el poblado de Isla Alta (donde la migración anterior había puesto el punto, a
-- ~3,2 km). Coordenadas: estacionamiento de la entrada, OpenStreetMap, «Salto Cristal, Camino a
-- Salto Cristal, Paraguarí»: -25,9793084 / -56,7246571. Solo la fila de esta propiedad.

DO $$
DECLARE n int;
BEGIN
  UPDATE public.propiedades
     SET map_lat = -25.9793084,
         map_lng = -56.7246571,
         map_address = 'Entrada del Salto Cristal, Camino a Salto Cristal, Paraguarí, Paraguay'
   WHERE id = 'd0218a20-1d05-4d0a-9731-2c944de65dbe' AND slug = 'el-jardin-del-eden-la-colmena'
     AND map_lat = -25.9643650 AND map_lng = -56.6975896;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Se esperaba actualizar 1 propiedad, fueron %', n; END IF;
END $$;
