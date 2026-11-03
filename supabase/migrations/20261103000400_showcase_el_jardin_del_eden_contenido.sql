-- Contenido de «El Jardín del Edén» (La Colmena, Paraguay), a partir del PDF de
-- la carpeta de fotos de la propiedad. Inglés por defecto, con español en los `_es`.
--
-- SOLO escribe filas de la propiedad nueva: no toca a El Barranco ni a ninguna otra.
-- La propiedad sigue `activo = false` y sin `publicado`: ni el catálogo ni el
-- banner de la ficha la muestran. Las fotos ya están en R2 (`sdm-imagenes`,
-- servidas por imagenes.sdmcapital.cl), optimizadas con el pipeline del sitio;
-- las seis con el sello «Armor 28 Pro» van recortadas por abajo.
--
-- Qué NO va, a propósito (no aplican a esta propiedad): actividades, la pestaña
-- Story, y las tarjetas de huéspedes e ingresos del brief. Sin esos datos esas
-- secciones no se pintan. La sección «La propiedad» y el brief completo tampoco.
-- Moneda: el único precio es el de lista en guaraníes (`precio_display`, ya cargado).
--
-- Sobre lo que dice el PDF: los frutales van resumidos por familias; el detalle
-- está en filas de la ficha técnica. «Frutales», «Piscina» y «Posada» llevan varias
-- fotos: la principal en `img` y el resto en `fotos`. Quesería, energía, cabras,
-- gallinero y lotos no tienen foto: son tarjetas de texto.

DO $colmena$
DECLARE
  bid constant uuid := 'd0218a20-1d05-4d0a-9731-2c944de65dbe';
  n_cont integer;
  n_items integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.showcase_contenido WHERE propiedad_id = bid AND clave = 'tema_acento') THEN
    RAISE EXCEPTION 'La Colmena (%) no tiene su fila base de showcase', bid;
  END IF;
  IF EXISTS (SELECT 1 FROM public.showcase_items WHERE propiedad_id = bid) THEN
    RAISE EXCEPTION 'La Colmena ya tiene ítems: este contenido no se carga dos veces';
  END IF;

  INSERT INTO public.showcase_contenido (propiedad_id, clave, valor) VALUES
    (bid, $q$hero_eyebrow$q$, $q$SDM Capital · Exclusive Listing · La Colmena, Paraguay$q$),
    (bid, $q$hero_eyebrow_es$q$, $q$SDM Capital · Propiedad exclusiva · La Colmena, Paraguay$q$),
    (bid, $q$hero_subtitulo$q$, $q$100 metres from Salto Cristal$q$),
    (bid, $q$hero_subtitulo_es$q$, $q$A 100 metros del Salto Cristal$q$),
    (bid, $q$hero_tagline$q$, $q$21 hectares of native forest, streams and plantations, 100 m from the entrance to Salto Cristal — one of Paraguay's main tourist sites, with 2,000 to 2,500 visitors a day in the summer holidays.$q$),
    (bid, $q$hero_tagline_es$q$, $q$21 hectáreas de bosque nativo, arroyos y plantaciones, a 100 m de la entrada del Salto Cristal, uno de los principales sitios turísticos del Paraguay, con entre 2.000 y 2.500 visitantes por día en las vacaciones de verano.$q$),
    (bid, $q$dest_eyebrow$q$, $q$The Location$q$),
    (bid, $q$dest_eyebrow_es$q$, $q$La ubicación$q$),
    (bid, $q$dest_titulo$q$, $q$Next to Salto Cristal$q$),
    (bid, $q$dest_titulo_es$q$, $q$Junto al Salto Cristal$q$),
    (bid, $q$destination_p1$q$, $q$The property sits 100 m from the entrance to Salto Cristal, one of the main tourist sites in Paraguay. In the summer holidays it receives between 2,000 and 2,500 visitors a day.$q$),
    (bid, $q$destination_p1_es$q$, $q$La propiedad se encuentra a 100 m de la entrada del Salto Cristal, uno de los principales sitios turísticos del Paraguay. Durante las vacaciones de verano recibe entre 2.000 y 2.500 visitantes por día.$q$),
    (bid, $q$destination_p2$q$, $q$It is a unique place: the buildings are made of superadobe earthbags, resistant to earthquakes, El Niño, floods and fire, with walls 55 cm thick. The site is 100% energy-autonomous and 90% food-autonomous.$q$),
    (bid, $q$destination_p2_es$q$, $q$Es un lugar único: las construcciones están hechas con sacos de tierra tipo superadobe, resistentes a los terremotos, al fenómeno de El Niño, a las inundaciones y al fuego, con paredes de 55 cm de grosor. El lugar es 100 % autónomo a nivel energético y 90 % a nivel alimentario.$q$),
    (bid, $q$construcciones_eyebrow$q$, $q$The Buildings$q$),
    (bid, $q$construcciones_eyebrow_es$q$, $q$Las construcciones$q$),
    (bid, $q$construcciones_titulo$q$, $q$Earthbag buildings$q$),
    (bid, $q$construcciones_titulo_es$q$, $q$Construcciones de superadobe$q$),
    (bid, $q$construcciones_intro$q$, $q$The houses are built with superadobe earthbags and 55 cm walls, resistant to earthquakes, El Niño, floods and fire.$q$),
    (bid, $q$construcciones_intro_es$q$, $q$Las casas están hechas con sacos de tierra tipo superadobe, con paredes de 55 cm, resistentes a sismos, al fenómeno de El Niño, a inundaciones y al fuego.$q$),
    (bid, $q$energia_eyebrow$q$, $q$Self-sufficiency$q$),
    (bid, $q$energia_eyebrow_es$q$, $q$Autosuficiencia$q$),
    (bid, $q$energia_titulo$q$, $q$Energy & water$q$),
    (bid, $q$energia_titulo_es$q$, $q$Energía y agua$q$),
    (bid, $q$energia_intro$q$, $q$The site is 100% energy-autonomous.$q$),
    (bid, $q$energia_intro_es$q$, $q$El lugar es 100 % autónomo a nivel energético.$q$),
    (bid, $q$produccion_eyebrow$q$, $q$Production$q$),
    (bid, $q$produccion_eyebrow_es$q$, $q$Producción$q$),
    (bid, $q$produccion_titulo$q$, $q$Farming & livestock$q$),
    (bid, $q$produccion_titulo_es$q$, $q$Producción agrícola y ganadera$q$),
    (bid, $q$produccion_intro$q$, $q$The site is 90% food-autonomous. The animals can be sold with the property.$q$),
    (bid, $q$produccion_intro_es$q$, $q$El lugar es 90 % autónomo a nivel alimentario. Los animales pueden venderse junto con la propiedad.$q$),
    (bid, $q$details_eyebrow$q$, $q$Property Details$q$),
    (bid, $q$details_eyebrow_es$q$, $q$Detalles de la propiedad$q$),
    (bid, $q$details_titulo$q$, $q$Technical overview$q$),
    (bid, $q$details_titulo_es$q$, $q$Ficha técnica$q$),
    (bid, $q$ficha_bloques$q$, $q$construccion,terreno,cultivos$q$),
    (bid, $q$ficha_construccion_titulo$q$, $q$Construction$q$),
    (bid, $q$ficha_construccion_titulo_es$q$, $q$Construcción$q$),
    (bid, $q$ficha_terreno_titulo$q$, $q$Land & nature$q$),
    (bid, $q$ficha_terreno_titulo_es$q$, $q$Terreno y naturaleza$q$),
    (bid, $q$ficha_cultivos_titulo$q$, $q$Crops & plantations$q$),
    (bid, $q$ficha_cultivos_titulo_es$q$, $q$Cultivos y plantaciones$q$),
    (bid, $q$gallery_eyebrow$q$, $q$Gallery$q$),
    (bid, $q$gallery_eyebrow_es$q$, $q$Galería$q$),
    (bid, $q$gallery_titulo$q$, $q$The property in images$q$),
    (bid, $q$gallery_titulo_es$q$, $q$La propiedad en imágenes$q$),
    (bid, $q$contact_eyebrow$q$, $q$Exclusive Listing$q$),
    (bid, $q$contact_eyebrow_es$q$, $q$Propiedad exclusiva$q$),
    (bid, $q$contact_titulo$q$, $q$Begin your conversation$q$),
    (bid, $q$contact_titulo_es$q$, $q$Comencemos la conversación$q$),
    (bid, $q$precio_sub$q$, $q$21 hectares · La Colmena, Paraguay$q$),
    (bid, $q$precio_sub_es$q$, $q$21 hectáreas · La Colmena, Paraguay$q$),
    (bid, $q$seo_titulo$q$, $q$El Jardín del Edén · La Colmena, Paraguay$q$),
    (bid, $q$seo_descripcion$q$, $q$21 hectares 100 m from Salto Cristal, Paraguay: earthbag buildings, 100% energy-autonomous, with a pool, ponds, plantations and native forest. For sale with SDM Capital.$q$),
    (bid, $q$seo_descripcion_es$q$, $q$21 hectáreas a 100 m del Salto Cristal, Paraguay: construcciones de superadobe, 100 % autónomas en energía, con piscina, estanques, plantaciones y bosque nativo. En venta con SDM Capital.$q$),
    (bid, $q$footer_texto$q$, $q$SDM Capital Real Estate · El Jardín del Edén · La Colmena, Paraguay$q$)
  ON CONFLICT (propiedad_id, clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();

  INSERT INTO public.showcase_items
    (propiedad_id, seccion, orden, titulo, titulo_es, descripcion, descripcion_es, valor, valor_es, img, icono, fotos)
  VALUES
    (bid, $q$hero$q$, 1, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179206_1pdzwlld25rj.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$hero$q$, 2, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179208_qp1j9tys258.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$hero$q$, 3, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179211_2k2co7e2f4x.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$hero$q$, 4, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179215_2acl3y7cxbw.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$destino_stats$q$, 1, $q$Land area$q$, $q$Superficie$q$, NULL, NULL, $q$21 ha$q$, NULL, NULL, NULL, '{}'::text[]),
    (bid, $q$destino_stats$q$, 2, $q$Energy autonomy$q$, $q$Autonomía energética$q$, NULL, NULL, $q$100%$q$, NULL, NULL, NULL, '{}'::text[]),
    (bid, $q$destino_stats$q$, 3, $q$Food autonomy$q$, $q$Autonomía alimentaria$q$, NULL, NULL, $q$90%$q$, NULL, NULL, NULL, '{}'::text[]),
    (bid, $q$construcciones$q$, 1, $q$Main house$q$, $q$Casa principal$q$, $q$300 m² superadobe house with an insulated earth-and-straw roof and European-style double-glazed windows. 3 bedrooms and 2 bathrooms, one with a ceramic-tiled bathtub and an imported European thermostatic shower. Living room with a 4.5 m ceiling, dining room with a mezzanine and a professional American pool table. A 300 l solar water heater for the bathtub bathroom and an 80 l heater for the shower.$q$, $q$Casa de 300 m² en superadobe, con techo aislado de tierra y paja y ventanas de doble vidrio de tipo europeo. 3 dormitorios y 2 baños, uno de ellos con bañera revestida de cerámica y ducha termostática importada de Europa. Sala de estar con techo de 4,50 m de altura, comedor con mezzanine y mesa de billar americano profesional. Calentador de agua solar de 300 l para el baño con bañera y calentador de 80 l para la ducha.$q$, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179216_e2p6cy54xy7.jpg$q$, $q$home$q$, '{}'::text[]),
    (bid, $q$construcciones$q$, 2, $q$Guesthouse$q$, $q$Posada turística$q$, $q$Superadobe guesthouse with an insulated metal roof, solar panels and batteries in case of power cuts. Two 20 m² studios, each with a European-style shower, water heater, toilet and basin. One 60 m² apartment with two 10 m² bedrooms, a bathroom with a shower clad in local stone, two basins and a toilet, a mosaic kitchen and a 34 m² living/dining room. Outdoor quincho: a kitchen with a vegetated roof and a bamboo structure.$q$, $q$Posada turística en superadobe, con techo metálico aislado, paneles solares y baterías en caso de corte de energía eléctrica. 2 estudios de 20 m² con baño con ducha a la europea, calentador de agua, inodoro y lavabo. 1 apartamento de 60 m² con 2 dormitorios de 10 m², baño con ducha revestida de piedra del país, 2 lavabos e inodoro, cocina de mosaico y sala de estar/comedor de 34 m². Quincho exterior: cocina con techo vegetal y estructura de bambú.$q$, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179242_fjb4epj0p.jpg$q$, $q$tent$q$, ARRAY[$q$https://imagenes.sdmcapital.cl/propiedades/1793681179246_3cc4ojwwofv.jpg$q$]::text[]),
    (bid, $q$construcciones$q$, 3, $q$Mayan house & future projects$q$, $q$Casa maya y proyectos posibles$q$, $q$30 m² Mayan-style superadobe tourist house, under construction. An ideal area to develop a small rental village, a condominium or a campsite. There is also a crêperie / retail / small-gastronomy area to renovate, with well water and electricity, along the Salto Cristal road.$q$, $q$Casa turística de estilo maya de 30 m² en superadobe, en construcción. Zona ideal para desarrollar una pequeña aldea de alquiler, un condominio, un camping... Además, una zona de crepería / comercio / pequeña gastronomía por renovar, con agua de pozo y electricidad, a lo largo de la ruta del Salto Cristal.$q$, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179226_vfff3p44qdl.jpg$q$, $q$building$q$, '{}'::text[]),
    (bid, $q$construcciones$q$, 4, $q$Cheese-making room$q$, $q$Quesería$q$, $q$Cheese-making room with a 15 m² cold chamber and a semi-professional kitchen, with a staff area on site: a room and a bathroom with shower and toilet.$q$, $q$Quesería con cámara fría (15 m²) y cocina semiprofesional, con zona para el personal in situ: una habitación y un baño con ducha e inodoro.$q$, NULL, NULL, NULL, $q$milk$q$, '{}'::text[]),
    (bid, $q$construcciones$q$, 5, $q$Pool$q$, $q$Piscina$q$, $q$Salt-water pool, 12 × 4.5 m and 2.3 m deep, fully lined in ceramic, with an unbeatable view and a natural-stone terrace.$q$, $q$Piscina con tratamiento de agua con sal, de 12 × 4,5 m y 2,3 m de profundidad, completamente revestida de cerámica, con una vista inmejorable y terraza de piedra natural.$q$, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179220_0z7u390q22e.jpg$q$, $q$droplets$q$, ARRAY[$q$https://imagenes.sdmcapital.cl/propiedades/1793681179281_za8kjdi62a.jpg$q$]::text[]),
    (bid, $q$energia$q$, 1, $q$16 solar panels$q$, $q$16 paneles solares$q$, $q$Photovoltaic installation with 16 panels of 410 W.$q$, $q$Instalación fotovoltaica con 16 paneles solares de 410 W.$q$, NULL, NULL, NULL, $q$sun$q$, '{}'::text[]),
    (bid, $q$energia$q$, 2, $q$8 kVA inverter$q$, $q$Inversor de 8 kVA$q$, $q$Each circuit of the main house can be powered by the panels or by the grid.$q$, $q$Posibilidad de alimentar cada circuito de la casa principal con los paneles o con la red eléctrica.$q$, NULL, NULL, NULL, $q$plug$q$, '{}'::text[]),
    (bid, $q$energia$q$, 3, $q$16 batteries$q$, $q$16 baterías$q$, $q$16 batteries of 200 Ah for storage. The guesthouse also has solar panels and batteries in case of power cuts.$q$, $q$16 baterías de 200 Ah para almacenamiento. La posada cuenta además con paneles solares y baterías en caso de corte de energía eléctrica.$q$, NULL, NULL, NULL, $q$battery$q$, '{}'::text[]),
    (bid, $q$energia$q$, 4, $q$2 transformers$q$, $q$2 transformadores$q$, $q$25 kVA for the well, the Mayan house and the restaurant area; 45 kVA for the guesthouse and the main house.$q$, $q$Uno de 25 kVA para el pozo, la casa maya y la zona de restaurante, y otro de 45 kVA para la posada y la casa principal.$q$, NULL, NULL, NULL, $q$bolt$q$, '{}'::text[]),
    (bid, $q$energia$q$, 5, $q$Artesian well & tank$q$, $q$Pozo artesiano y tanque$q$, $q$204 m artesian well and a 5,000 l tank, with piping supplying the main house, the guesthouse, the Mayan house and the crêperie.$q$, $q$Pozo artesiano de 204 m de profundidad y tanque de 5.000 l, con tuberías que abastecen la casa principal, la posada, la casa maya y la crepería.$q$, NULL, NULL, NULL, $q$droplets$q$, '{}'::text[]),
    (bid, $q$produccion$q$, 1, $q$Tilapia ponds$q$, $q$Estanques de tilapia$q$, $q$3 ponds for tilapia production, with approximately 1 tonne of fish already in them.$q$, $q$3 estanques para la producción de tilapia, con aproximadamente 1 tonelada de peces ya presentes.$q$, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179230_irt4qraabei.jpg$q$, $q$fish$q$, ARRAY[$q$https://imagenes.sdmcapital.cl/propiedades/1793681179247_h63y09g19a.jpg$q$]::text[]),
    (bid, $q$produccion$q$, 2, $q$Fruit trees$q$, $q$Frutales$q$, $q$An extensive orchard: citrus, tropical fruit, mulberries and other berries, vines, peaches and many more species. The full list is in the technical sheet.$q$, $q$Un extenso huerto frutal: cítricos, frutas tropicales, moras y otras bayas, vides, duraznos y muchas especies más. La lista completa está en la ficha técnica.$q$, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179259_b5qfs22v21e.jpg$q$, $q$apple$q$, ARRAY[$q$https://imagenes.sdmcapital.cl/propiedades/1793681179260_lv6ij1pgm9.jpg$q$,$q$https://imagenes.sdmcapital.cl/propiedades/1793681179263_ev51yzaog6l.jpg$q$,$q$https://imagenes.sdmcapital.cl/propiedades/1793681179268_5s103vk3w7w.jpg$q$]::text[]),
    (bid, $q$produccion$q$, 3, $q$Forage$q$, $q$Forrajeras$q$, $q$Forage plantations: capiaçu, kurubí, grass, Cameroon, brizantha and Mexican sunflower.$q$, $q$Plantaciones de forrajeras: capiaçu, kurubí, pasto, Camerún, brizanta y girasol mexicano.$q$, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179254_j3tht7qzn4o.jpg$q$, $q$wheat$q$, '{}'::text[]),
    (bid, $q$produccion$q$, 4, $q$Bamboo$q$, $q$Bambú$q$, $q$Several bamboo groves with 7 varieties, 3 of them edible.$q$, $q$Varios bosques de bambú con 7 variedades, 3 de ellas comestibles.$q$, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179269_91ofqgxi0aq.jpg$q$, $q$leaf$q$, ARRAY[$q$https://imagenes.sdmcapital.cl/propiedades/1793681179275_q6nlyhs4zk.jpg$q$]::text[]),
    (bid, $q$produccion$q$, 5, $q$Lotus ponds$q$, $q$Estanques de lotos$q$, $q$5 ponds with lotus for commercial production.$q$, $q$5 estanques con lotos para explotación comercial.$q$, NULL, NULL, NULL, $q$sprout$q$, '{}'::text[]),
    (bid, $q$produccion$q$, 6, $q$Goats$q$, $q$Cabras$q$, $q$Covered goat barn with individual stalls and a covered area for dairy cows. 9 goats.$q$, $q$Granero cubierto para cabras con boxes individuales y zona cubierta para vacas lecheras. 9 cabras.$q$, NULL, NULL, NULL, $q$paw$q$, '{}'::text[]),
    (bid, $q$produccion$q$, 7, $q$Chicken coop$q$, $q$Gallinero$q$, $q$Complete, mesh-fenced chicken coop with hens of various breeds, plus a chick-rearing area with an incubator.$q$, $q$Gallinero completo, cercado con malla, con gallinas de distintas razas, y una zona de cría de pollitos con incubadora.$q$, NULL, NULL, NULL, $q$bird$q$, '{}'::text[]),
    (bid, $q$ficha_construccion$q$, 1, $q$System$q$, $q$Sistema constructivo$q$, NULL, NULL, $q$Superadobe (earthbag)$q$, $q$Superadobe (sacos de tierra)$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_construccion$q$, 2, $q$Wall thickness$q$, $q$Grosor de las paredes$q$, NULL, NULL, $q$55 cm$q$, $q$55 cm$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_construccion$q$, 3, $q$Resistance$q$, $q$Resistencia$q$, NULL, NULL, $q$Earthquakes, El Niño, floods and fire$q$, $q$Sismos, fenómeno de El Niño, inundaciones y fuego$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_construccion$q$, 4, $q$Main house$q$, $q$Casa principal$q$, NULL, NULL, $q$300 m² · 3 bedrooms · 2 bathrooms$q$, $q$300 m² · 3 dormitorios · 2 baños$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_construccion$q$, 5, $q$Guesthouse$q$, $q$Posada$q$, NULL, NULL, $q$2 studios of 20 m² + 60 m² apartment$q$, $q$2 estudios de 20 m² + apartamento de 60 m²$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_construccion$q$, 6, $q$Mayan house$q$, $q$Casa maya$q$, NULL, NULL, $q$30 m², under construction$q$, $q$30 m², en construcción$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_construccion$q$, 7, $q$Pool$q$, $q$Piscina$q$, NULL, NULL, $q$12 × 4.5 m, 2.3 m deep, salt-water treatment$q$, $q$12 × 4,5 m, 2,3 m de profundidad, tratada con sal$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_construccion$q$, 8, $q$Storage$q$, $q$Almacenamiento$q$, NULL, NULL, $q$100 m² for tools, plus a chick-rearing area with incubator$q$, $q$100 m² para herramientas, y zona de cría de pollitos con incubadora$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_terreno$q$, 1, $q$Land area$q$, $q$Superficie$q$, NULL, NULL, $q$21 hectares$q$, $q$21 hectáreas$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_terreno$q$, 2, $q$Location$q$, $q$Ubicación$q$, NULL, NULL, $q$La Colmena, Paraguarí · 100 m from the Salto Cristal entrance$q$, $q$La Colmena, Paraguarí · a 100 m de la entrada del Salto Cristal$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_terreno$q$, 3, $q$Native forest$q$, $q$Bosque nativo$q$, NULL, NULL, $q$With rare species$q$, $q$Con especies raras$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_terreno$q$, 4, $q$Streams$q$, $q$Arroyos$q$, NULL, NULL, $q$2 (one year-round, the other depending on rainfall), with small waterfalls and two natural pools in the stream bed (one shallow, one 1.5 m deep)$q$, $q$2 (uno con agua todo el año y el otro según la cantidad de lluvia), con pequeñas cascadas y dos piscinas naturales en el cauce (una de poca profundidad y otra de 1,50 m)$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_terreno$q$, 5, $q$Autonomy$q$, $q$Autonomía$q$, NULL, NULL, $q$100% energy · 90% food$q$, $q$100 % energética · 90 % alimentaria$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_terreno$q$, 6, $q$Livestock$q$, $q$Animales$q$, NULL, NULL, $q$Can be sold with the property$q$, $q$Pueden venderse junto con la propiedad$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_cultivos$q$, 1, $q$Forage$q$, $q$Forrajeras$q$, NULL, NULL, $q$Capiaçu, kurubí, grass, Cameroon, brizantha, Mexican sunflower$q$, $q$Capiaçu, kurubí, pasto, Camerún, brizanta, girasol mexicano$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_cultivos$q$, 2, $q$Bamboo$q$, $q$Bambú$q$, NULL, NULL, $q$7 varieties, 3 of them edible$q$, $q$7 variedades, 3 de ellas comestibles$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_cultivos$q$, 3, $q$Lotus$q$, $q$Lotos$q$, NULL, NULL, $q$5 ponds for commercial production$q$, $q$5 estanques para explotación comercial$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_cultivos$q$, 4, $q$Native trees$q$, $q$Árboles nativos$q$, NULL, NULL, $q$Blue jacaranda, many lapachos, yellow bee tree, palo santo, orchid tree, moringa, castor, ora-pro-nóbis, pereskia, air potato$q$, $q$Flamboyant azul o jacarandá, numerosos lapachos, árbol amarillo para abejas, palo santo, árbol orquídea, moringa, ricino, ora-pro-nóbis, pereskia, papa del aire$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_cultivos$q$, 5, $q$Ornamentals$q$, $q$Ornamentales$q$, NULL, NULL, $q$Palms, climbers and shrubs, including varieties for bees$q$, $q$Palmeras, enredaderas y arbustos, con variedades para abejas$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_cultivos$q$, 6, $q$Citrus$q$, $q$Cítricos$q$, NULL, NULL, $q$Persian lime, Creole lemon, lime, finger lime, grapefruit, mandarin, torongo, orange, blood orange$q$, $q$Limón persa, limón criollo, lima, limón caviar, pomelo, mandarina, torongo, naranja, naranja sanguina$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_cultivos$q$, 7, $q$Tropical fruit$q$, $q$Frutas tropicales$q$, NULL, NULL, $q$Blue and pink bananas, pineapple, mango (Brazilian and creole), papaya (3 varieties), sweet passion fruit, jackfruit, sapote, avocado, macadamia, date palm$q$, $q$Banano plátano azul y rosado, piña, mangos de Brasil y criollos, papayo (3 variedades), maracuyá dulce, yaca, sapote, palto, macadamia, palmera datilera$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_cultivos$q$, 8, $q$Berries & vines$q$, $q$Moras y vides$q$, NULL, NULL, $q$Small black, giant, white and climbing mulberries (2 varieties); Italia and creole grapes; kiwi$q$, $q$Mora negra pequeña, gigante, blanca y trepadora (2 variedades); vides Italia y criollas; kiwi$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$ficha_cultivos$q$, 9, $q$Other fruit trees$q$, $q$Otros frutales$q$, NULL, NULL, $q$Peach, persimmon, pomegranate, tree tomato, jujube (Chinese date), inga, elder, pink guava, pink pepper, clove, Indian soap tree and more$q$, $q$Duraznos, caqui, granado, tomate de árbol, azufaifo (dátil chino), inga, saúco, guayabo rosado, pimienta rosa, clavo de olor, árbol del jabón de la India y más$q$, NULL, NULL, '{}'::text[]),
    (bid, $q$galeria$q$, 1, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179216_e2p6cy54xy7.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$galeria$q$, 2, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179220_0z7u390q22e.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$galeria$q$, 3, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179223_5bh93gu6d4x.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$galeria$q$, 4, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179226_vfff3p44qdl.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$galeria$q$, 5, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179227_6qgxfb5amwd.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$galeria$q$, 6, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179230_irt4qraabei.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$galeria$q$, 7, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681179237_fixh7icye97.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$galeria_reserva$q$, 1, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681491739_frfg69stbwp.jpg$q$, NULL, '{}'::text[]),
    (bid, $q$galeria_reserva$q$, 2, NULL, NULL, NULL, NULL, NULL, NULL, $q$https://imagenes.sdmcapital.cl/propiedades/1793681491742_ttjuu0qq9ib.jpg$q$, NULL, '{}'::text[]);

  SELECT count(*) INTO n_cont  FROM public.showcase_contenido WHERE propiedad_id = bid;
  SELECT count(*) INTO n_items FROM public.showcase_items     WHERE propiedad_id = bid;
  IF n_items <> 56 THEN RAISE EXCEPTION 'showcase_items: esperaba 56 y hay %', n_items; END IF;
  -- contenido: las 57 de este archivo + las 4 de la fila base (hero_titulo, tema_acento, idioma_default, precio_display)
  IF n_cont <> 61 THEN RAISE EXCEPTION 'showcase_contenido: esperaba 61 y hay %', n_cont; END IF;
  RAISE NOTICE 'El Jardín del Edén: % filas de contenido, % ítems', n_cont, n_items;
END
$colmena$;
