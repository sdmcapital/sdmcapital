-- showcase_items.fotos: fotos ADICIONALES de un ítem, además de la principal (`img`).
--
-- Una tarjeta de construcciones o de producción a veces tiene varias fotos (la
-- posada lleva dos, los frutales cuatro) y `showcase_items` solo guardaba una.
-- Las alternativas eran peores: mandar las sobrantes a la galería, que no las
-- relaciona con su tarjeta, o inventar tarjetas sin texto solo para alojar fotos.
--
-- Es ADITIVA y con valor por defecto `{}`: las filas existentes (las 61 de El
-- Barranco) no cambian ni se tocan, y el código que hoy está en producción, que
-- lee `select *`, ignora la columna nueva. Orden de las fotos = orden del array.
-- Cada URL es una imagen de R2; el front pide su miniatura bajo `thumbs/`.

ALTER TABLE public.showcase_items
  ADD COLUMN fotos text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.showcase_items.fotos IS
  'URLs de fotos adicionales del ítem, además de `img`, en el orden en que se muestran. {} = ninguna.';
