-- La Colmena: datos de la ficha del catálogo (no del showcase).
--
-- 1. MAPA. `PropertyMap` lee `map_address`, `map_lat` y `map_lng`. Los tres quedaron NULL al
--    crear el registro (las otras 90 propiedades con mapa los tienen; los pone el selector
--    del panel de Propiedades al geocodificar). Sin coordenadas el mapa geocodifica por
--    nombre `"<comuna>, <región>, Chile"` —«Chile» escrito a mano en el componente— y
--    «La Colmena, Paraguarí, Chile» cae en el Maule. Se fijan las coordenadas del distrito
--    de La Colmena, Departamento de Paraguarí (centro de la localidad, Wikipedia
--    25°52′59″S 56°50′05″O): la ubicación es «aproximada» y lleva un círculo de 300 m.
-- 2. BOTÓN DE RESERVA. `mostrar_boton_reserva` es una columna por propiedad (default true):
--    se apaga en esta, que está en Paraguay.
-- 3. DESCRIPCIÓN. HTML como las demás fichas (`<p>`), solo con lo que dice el PDF de la propiedad.
-- 4. IMAGEN. `imagen_principal`/`imagenes` pasan a la copia «-portada» de la #52, cuya
--    miniatura es de 900 px y no de 400 (la tarjeta del catálogo la muestra a ~415 px de ancho).
--    Es una clave nueva y no una sobrescritura porque R2 sirve con `max-age=31536000, immutable`:
--    los navegadores seguirían con la miniatura vieja.
--
-- NO toca `comision_porcentaje`. Solo la fila de El Jardín del Edén.

DO $$
DECLARE
  pid  uuid := 'd0218a20-1d05-4d0a-9731-2c944de65dbe';
  img  text := 'https://imagenes.sdmcapital.cl/propiedades/1793681179206_1pdzwlld25rj-portada.jpg';
  n    int;
  desc_es text := $d$<p><strong>El Jardín del Edén · 21 hectáreas a 100 m del Salto Cristal, La Colmena (Paraguarí)</strong></p><p>La propiedad se encuentra a 100 m de la entrada del Salto Cristal, uno de los principales sitios turísticos del Paraguay, con entre 2.000 y 2.500 visitantes por día durante las vacaciones de verano. Son 21 hectáreas de bosque nativo con especies raras, dos arroyos con numerosas pequeñas cascadas y dos piscinas naturales en el cauce de uno de ellos, además de tres estanques para producción de tilapia, cinco estanques de lotos para explotación comercial, bosques de bambú, plantaciones de forrajeras y una gran variedad de árboles frutales.</p><p>Es un lugar único: las construcciones están hechas con sacos de tierra tipo superadobe, con paredes de 55 cm de grosor, resistentes a los terremotos, al fenómeno de El Niño, a las inundaciones y al fuego. Incluyen una casa principal de 300 m² con 3 dormitorios y 2 baños, techo aislado de tierra y paja y ventanas de doble vidrio; una posada turística con dos estudios de 20 m² y un apartamento de 60 m² con dos dormitorios; una casa turística de estilo maya de 30 m², en construcción; una piscina con tratamiento de agua con sal de 12 × 4,5 m; una quesería con cámara fría y cocina semiprofesional; y una zona de almacenamiento de 100 m².</p><p>El lugar es 100 % autónomo a nivel energético, con 16 paneles solares de 410 W y 16 baterías, y 90 % a nivel alimentario. Cuenta con un pozo artesiano de 204 m de profundidad, un granero para cabras, un gallinero completo y una zona para el ganado; los animales pueden venderse junto con la propiedad. La zona de la casa maya es ideal para desarrollar una pequeña aldea de alquiler, un condominio o un camping, y hay una zona de crepería, comercio o pequeña gastronomía por renovar, con agua de pozo y electricidad, a lo largo de la ruta del Salto Cristal.</p>$d$;
BEGIN
  UPDATE public.propiedades
     SET map_lat = -25.8830556,
         map_lng = -56.8347222,
         map_address = 'La Colmena, Departamento de Paraguarí, Paraguay',
         mostrar_boton_reserva = false,
         descripcion = desc_es,
         imagen_principal = img,
         imagenes = ARRAY[img]
   WHERE id = pid AND slug = 'el-jardin-del-eden-la-colmena'
     AND map_lat IS NULL AND map_lng IS NULL AND coalesce(descripcion, '') = '';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Se esperaba actualizar 1 propiedad, fueron %', n; END IF;

  IF (SELECT comision_porcentaje FROM public.propiedades WHERE id = pid) IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'La comisión no debía cambiar';
  END IF;
END $$;
