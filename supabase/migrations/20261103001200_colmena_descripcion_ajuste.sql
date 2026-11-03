-- Ajuste de redacción de la descripción de La Colmena: el PDF dice «dos piscinas naturales en el
-- cauce del arroyo», sin precisar de cuál de los dos; la migración anterior decía «de uno de ellos»,
-- que es una precisión que el PDF no da.
DO $$
DECLARE n int;
BEGIN
  UPDATE public.propiedades
     SET descripcion = replace(descripcion, 'dos piscinas naturales en el cauce de uno de ellos', 'dos piscinas naturales en el cauce del arroyo')
   WHERE id = 'd0218a20-1d05-4d0a-9731-2c944de65dbe' AND descripcion LIKE '%en el cauce de uno de ellos%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Se esperaba corregir 1 descripción, fueron %', n; END IF;
END $$;
