# SDM Capital — notas para Claude Code

## El sistema de diseño está en SISTEMA-DISENO.md

[`SISTEMA-DISENO.md`](./SISTEMA-DISENO.md) es la **referencia**: los tokens con
sus valores y ratios, los componentes con sus variantes y estados, la tabla de
«qué botón uso cuando…», los principios con su razón, las decisiones cerradas
que no se reabren y las trampas del proyecto.

Antes de escribir un componente, elegir un color o inventar un token, mirar ahí.
Cuando ese documento y `SINCRONIA.md` se contradigan, **manda
`SISTEMA-DISENO.md`**: el segundo es el registro cronológico, no la referencia.

## Antes de tocar nada: leer SINCRONIA.md

Varias sesiones de Claude Code trabajan sobre este repo en paralelo.
[`SINCRONIA.md`](./SINCRONIA.md) define qué archivos le corresponden a cada una y
dos reglas obligatorias:

1. **Commitear antes de deployar**, nunca al revés — el deploy toma el working
   tree completo, no lo commiteado.
2. **Correr `git status` al iniciar sesión** — si hay cambios sin commitear de
   otra sesión, detenerse y preguntar antes de editar.

Ahí mismo está el registro donde cada sesión anota en qué está trabajando.

## Migraciones de base de datos (Supabase)

El proyecto está linkeado a `ugfhgfpgxyfzafudxaeo`, así que el DDL se aplica
desde acá — siempre que la CLI esté autenticada con la cuenta correcta.

### Antes de cualquier DDL: verificar con qué cuenta quedó la CLI

El login de `supabase` es **global de la máquina, no por proyecto**. Al alternar
entre SDM y BookFindería hay que reloguearse cada vez.

**Hay dos modos de fallo, no uno.** El que esta sección documentó durante meses
es el ruidoso. El que hace daño es el otro.

#### Modo ruidoso — la cuenta autenticada no ve el proyecto linkeado

Falla **antes de tocar nada**:

```
Initialising login role...
unexpected login role status 403: {"message":"Your account does not have the
necessary privileges to access this endpoint. ..."}
Connect to your database by setting the env var correctly: SUPABASE_DB_PASSWORD
```

Ese 403 **no** es un problema de permisos dentro del proyecto: es que la cuenta
autenticada no ve el proyecto. Se resuelve con:

```bash
supabase login
```

El mensaje sugiere `SUPABASE_DB_PASSWORD` y es una pista falsa: lleva a
conectarse por fuera de la autenticación normal. **Nunca** pedir ni usar la
contraseña de la base para esquivar este error — la solución es reloguearse.

#### Modo silencioso — la CLI está linkeada a OTRO proyecto que sí existe

La CLI está autenticada, el link es válido y el proyecto existe. Simplemente no
es éste. **No hay 403, no hay advertencia, no hay nada raro que mirar**, y
`supabase migration up --linked` aplicaría las migraciones de este repo sobre la
base de ese otro proyecto sin preguntar nada.

Es el modo grave, y es el que la versión anterior de esta sección negaba:
afirmaba que el link (`supabase/.temp/project-ref`) «no cambia». **Sí cambia.**

#### La verificación obligatoria son tres comandos, no uno

```bash
supabase projects list          # ugfhgfpgxyfzafudxaeo ("SDM New Website"), con "linked": true
cat supabase/.temp/project-ref  # tiene que decir ugfhgfpgxyfzafudxaeo
supabase migration list         # lo único pendiente tiene que ser lo tuyo
```

Los tres, y hacen falta los tres: el primero dice qué proyectos ve la cuenta
autenticada, el segundo a cuál apunta este repo, y son preguntas distintas. El
modo silencioso pasa limpiamente el primero.

**Cómo leer `migration list`:** filas con **Remote poblado y Local vacío**
significan que la base tiene aplicado algo cuyo archivo no está en el repo. Esa
es la señal de que estás mirando la base equivocada. Ahí se para.

**`.env` puede estar correcto mientras la CLI no lo está.** Son dos
configuraciones independientes: `VITE_SUPABASE_URL` gobierna con qué base habla
la aplicación y `supabase/.temp/project-ref` con cuál habla la CLI. Que el sitio
funcione contra la base correcta no dice **nada** de la CLI.

> **2026-09-09.** Este repo apareció linkeado a `gczyxedxakfrjjpdpnzl`
> ("booksfinderia's Project"), con los archivos de `supabase/.temp/` fechados el
> 2026-08-23. `.env` seguía apuntando a `ugfhgfpgxyfzafudxaeo`, así que el repo y
> el sitio se veían perfectamente normales. En ese estado,
> `supabase migration up --linked` habría aplicado las 18 migraciones con
> timestamp de SDM sobre la base de producción de BookFindería. Se detectó porque
> la verificación se corrió antes del DDL, no después.

### Los 10 archivos SQL antiguos de `supabase/migrations/` NO deben renombrarse

Estos archivos no siguen el patrón `<timestamp>_descripcion.sql`:

```
captacion_propiedades.sql        paginas_legales.sql
ficha_clientes.sql               paginas_legales_extra.sql
propiedades_dossiers_y_flow.sql  propiedades_estados_resultado.sql
solicitudes_credito.sql          solicitudes_credito_extra.sql
tarjetas_equipo.sql              travel_guide.sql
```

La CLI los ignora justamente por eso, y esa es la protección que los mantiene
inofensivos. **Ya fueron aplicados a mano** contra la base de producción.

Si alguien los renombra al formato timestamp, el siguiente
`supabase migration up --linked` intentará ejecutarlos sobre una base donde ya
están aplicados. Al menos uno es destructivo:
`propiedades_dossiers_y_flow.sql` hace
`ALTER TABLE propiedades RENAME COLUMN dossiers TO dossiers_legacy`.

No renombrarlos. Se quedan como documentación histórica.

### Para DDL nuevo

1. Crear el archivo en `supabase/migrations/` con formato
   `<timestamp>_descripcion.sql` — por ejemplo
   `20260803000000_cotizaciones_pais_ciudad.sql`.
2. Verificar con `supabase migration list` que lo único pendiente sea ese
   archivo.
3. Aplicar con:

```bash
supabase migration up --linked
```

**Nunca** `supabase db push` ni `supabase migration repair`.

Nota: `supabase db query` no existe como subcomando de la CLI. Los subcomandos
de `supabase db` son `diff`, `dump`, `push`, `pull`, `reset` y `lint`.

### `supabase db dump` requiere Docker

Aunque parezca una operación remota —lee del proyecto linkeado, no de una base
local—, `db dump` corre `pg_dump` dentro de un contenedor. Sin Docker Desktop
arriba falla así, después de haberse conectado:

```
Dumping schemas from remote database...
failed to inspect docker image: Cannot connect to the Docker daemon at
unix:///Users/<usuario>/.docker/run/docker.sock. Is the docker daemon running?
```

Lo mismo aplica a `db diff` y `db reset`. `migration up --linked` y
`migration list --linked` **no** necesitan Docker.

Consecuencia práctica: sin Docker no hay forma desde la CLI de leer el esquema,
las políticas RLS ni nada de `pg_catalog`. Para eso queda el SQL Editor del
dashboard, o consultas por PostgREST cuando la tabla esté expuesta.

## Build y deploy

`npm run build` corre `npm run lint && npm run typecheck && vite build`. Las dos
primeras etapas **bloquean el build a propósito**, para que ni un error de tipos
ni una regla de hooks rota lleguen a producción. Hay un hook `prebuild`
(`scripts/sync-hero-preload.mjs`, `sync-contenido-seed.mjs`, `sync-sitemap.mjs`)
que corre antes que todo eso.

El lint va primero porque es el que falla rápido: **1,6 s contra 4,7 s** del
typecheck. Y cada etapa es su propio script —`lint` y `typecheck`, no `eslint` y
`tsc` sueltos— para que npm imprima su banner antes del error y se vea cuál de
las dos cortó. Sin eso, un `error TS2322` aparece justo debajo del banner de
`lint` y se lee como si lo hubiera producido ESLint.

Los cinco `eslint-disable-next-line react-hooks/exhaustive-deps` del repo llevan
la razón escrita al lado. **No se quitan sin leerla**: los cinco describen qué se
rompe al completar el array, no una preferencia.

Deploy a Cloudflare Pages:

```bash
unset CLOUDFLARE_API_TOKEN && npm run build && npx wrangler pages deploy dist --project-name=sdmcapitalpage
```

### Antes de desplegar: verificar con qué cuenta quedó wrangler

Es la misma trampa que la de Supabase, con otra CLI. El login de `wrangler` es
**global de la máquina**, no por proyecto, y el account id queda cacheado en
`node_modules/.cache/wrangler/wrangler-account.json`. El repo se ve
perfectamente normal mientras la CLI apunta a otra cuenta, y el error no aparece
hasta el momento de desplegar.

```bash
npx wrangler whoami
```

Tiene que devolver `184d514a05e9b756bd0a448ed96c6d38`
(`Vurrutia@sdmcapital.cl's Account`), que es la dueña de `sdmcapitalpage`. **No
dar por hecho que el login de la última vez sigue siendo el bueno**: el
2026-08-11 un deploy falló porque la CLI había quedado en `beocert36@gmail.com`.

Síntoma cuando pasa:

```
✘ [ERROR] A request to the Cloudflare API
  (/accounts/184d514a05e9b756bd0a448ed96c6d38/pages/projects/sdmcapitalpage) failed.

  Authentication error [code: 10000]
```

Ese account id en la URL es el **correcto** —sale de la caché de un deploy que sí
funcionó—, así que el mensaje engaña: parece que el proyecto rechaza la
petición, cuando lo que pasa es que la cuenta autenticada no ve esa cuenta.
Detrás del error, wrangler imprime un `whoami` con el email real. Ahí está la
respuesta.

Se resuelve con `npx wrangler login`. La caché solo estorba si después del login
el account id sigue sin coincidir con el `whoami`; ahí sí se borra el archivo y
se reintenta. Si coincide, no se toca.

## Escrituras a Supabase

Toda operación de escritura debe recoger el `{ error }` y pasarlo por
`avisarError()` (`src/lib/errores.ts`), que loguea el objeto completo y muestra
code / message / details / hint. Un formulario nunca debe cerrarse ni perder lo
escrito cuando la escritura falla.

Motivo: durante meses el admin descartaba el `{ error }`. Un `INSERT` de
cotización fallaba con 400 porque `prop_pais` no existía como columna, y el
wizard se cerraba como si hubiera guardado — pérdida silenciosa de datos.

## Imágenes

Viven en R2 (`imagenes.sdmcapital.cl`), con variante de 400px bajo `thumbs/`.

- `thumbUrl()` — miniaturas en catálogo, tarjetas y galerías.
- `imagenParaPDF()` — para PDFs. El bucket **no** manda
  `access-control-allow-origin`, y `@react-pdf/renderer` descarga la imagen con
  `fetch()`, así que la petición directa la bloquea CORS. Se enruta por
  `/api/imagen` (`functions/api/imagen.js`), que sirve desde el mismo origen.
