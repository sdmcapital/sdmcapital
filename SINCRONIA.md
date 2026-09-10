# Sincronía entre sesiones de Claude Code

Varias sesiones de Claude Code trabajan sobre este mismo repo en paralelo. Este
archivo define quién toca qué y las reglas para no pisarse.

## División de dominios

### Sesión Sofía / chatbot

- El Worker
- `functions/`
- Integraciones del bot

### Sesión web pública

- `src/pages/`
- `src/components/sections/`
- `src/components/ui/`
- `src/components/credito/` — no figuraba en ninguna sesión hasta el 2026-08-09.
  Es el modal de solicitud de crédito y su formulario, que solo se abren desde
  el sitio público (Inicio, `/servicios` y `/evaluacion-gratuita`)

### Sesión admin

- `src/pages/AdminPage.tsx`
- `src/components/cotizaciones/`
- `src/components/tarjetas/`

> `src/pages/AdminPage.tsx` es de la sesión admin aunque viva bajo `src/pages/`,
> que por lo demás es de la sesión web pública. Lo mismo para el resto de
> `src/pages/admin/`.
>
> Hay zonas que ninguna sesión posee en exclusiva —`src/lib/`, `src/types/`,
> `src/hooks/`, `src/styles/globals.css`, `package.json`, `vite.config.ts`—.
> Tocarlas afecta a todas: revisar `git status` y avisar en el registro de abajo
> antes de modificarlas.

## Reglas obligatorias para todas las sesiones

### 1. Commitear antes de deployar, nunca al revés

El deploy toma el **working tree completo**, no lo commiteado. Si hay cambios sin
commitear —propios o de otra sesión— se van a producción igual, mezclados con lo
que sí querías desplegar, y sin quedar registrados en ningún commit.

Orden correcto:

```bash
git status          # verificar que solo esté lo tuyo
git add <archivos>  # nunca 'git add .' con varias sesiones activas
git commit -m "..."
npm run build && npx wrangler pages deploy dist --project-name=sdmcapitalpage
```

Si wrangler avisa `Your working directory is a git repo and has uncommitted
changes`, ese aviso no es cosmético: está diciendo que estás desplegando algo que
no está versionado.

#### El mecanismo concreto por el que esto falla: `git stash pop`

Pasó el 2026-08-09 y salió a producción antes de detectarse.

Un `git stash pop` **no pregunta cuál**: toma el de arriba de la pila. Si tu
`git stash push` no guardó nada —porque los archivos que nombraste no tenían
cambios—, el `pop` posterior desapila **el stash de otra sesión**, o uno viejo
tuyo, y su contenido aterriza en el árbol de trabajo.

Lo que hace este caso peligroso es que **ningún commit lo delata**: el trabajo
reintroducido queda como cambios sin commitear, y si además revierte algo ya
arreglado —en aquel caso el `<h1>` de «Propiedad no encontrada»— el `git diff`
se lee como una eliminación deliberada, no como un accidente.

Precauciones:

- `git stash list` antes de cualquier `pop`, y `git stash pop stash@{n}` con
  el índice explícito en vez del `pop` a ciegas.
- Los stashes de comparación antes/después son basura en cuanto se usan:
  `git stash drop` al terminar. Un stash que sobrevive a su sesión es una
  trampa armada para la siguiente.
- **`git status` justo antes del deploy, no después.** Es la única barrera que
  detecta esto, porque el árbol de trabajo es lo que se despliega.

### 2. Correr `git status` al iniciar sesión

Antes de editar cualquier archivo:

```bash
git status
```

Si aparecen cambios sin commitear que no son tuyos, **detente y pregunta**. No
edites, no commitees por tu cuenta, no hagas `git checkout` para "limpiar": ese
trabajo es de otra sesión y puede estar a medio terminar o ya desplegado.

## Pendientes de decisión comercial, no de código

### Cuándo se cobra la gestión del crédito si el cliente compra por fuera

La política, según Víctor: **si el cliente consigue el crédito y compra su
propiedad con SDM —nueva o usada—, la gestión del crédito NO se cobra. Si
compra por fuera, sí se cobra.**

Lo que falta definir es **el momento** del cobro en ese segundo caso. Las dos
superficies que lo declaraban no coincidían entre sí y ninguna describía la
política:

| dónde | qué decía |
|---|---|
| `SolicitudCreditoModal.tsx` | «contra el **éxito de la operación**» |
| `EvaluacionGratuitaPage.tsx` | «solo al **éxito de la gestión**» |

No son lo mismo: la gestión tiene éxito cuando el banco aprueba, y la operación
cuando la compra se cierra. Entre esas dos fechas puede pasar que el cliente se
eche atrás.

Los textos nuevos **no inventan el momento**: el modal dice «siempre contra el
resultado» y el Inicio no lo menciona. Cuando Víctor lo defina, se escribe en el
modal —que es donde cabe el caso completo— y se revisa si el Inicio necesita
recogerlo.

### La gratuidad es de la GESTIÓN CREDITICIA, no de la compra

Las fichas de propiedad muestran **«Comisión corredora 2 %»**
(`PropiedadDetailPage.tsx`, desde `comision_porcentaje`), y el showcase de El
Barranco la declara también. Es otro cobro, por otro servicio.

Un visitante puede leer «si compras con nosotros no tiene costo» y entender que
la compra entera es gratis. Por eso los tres textos dicen **«la gestión»** y no
«comprar con SDM». Si en algún momento se acorta alguna de las tres frases, esa
palabra es la que no se puede perder.

### Las tres superficies que declaran honorarios

Si se cambia una, se cambian las tres:

1. Inicio → `financiamiento_body` y `financiamiento_condicion` en `contenido_sitio`
2. `src/components/credito/SolicitudCreditoModal.tsx` — bloque «Honorarios», en código
3. `src/pages/EvaluacionGratuitaPage.tsx` — arreglo `BENEFICIOS`, en código


## En qué está trabajando cada sesión

Cada sesión anota acá lo que tiene en curso, con fecha. Al terminar, se borra la
línea o se marca como cerrada.

| Fecha | Sesión | En qué está | Estado |
|---|---|---|---|
| 2026-08-02 | Admin | Cotizaciones: columnas `prop_pais`/`prop_ciudad` en Supabase, errores de escritura visibles en todo el admin (`avisarError`), catálogo como modo por defecto en el Paso 2, PDF bajo demanda | **Cerrada** — todo commiteado y desplegado |
| 2026-08-02 | Web pública | Componente `SinArriendos` en `PropiedadesPage.tsx` | Cerrado — commit `0b7e80a`, ya en producción |
| 2026-08-05 | Inventario oficinas | Carga de 10 edificios de oficinas en arriendo (42 unidades). Toca `src/types/index.ts`, `supabase/migrations/` y `src/pages/PropiedadDetailPage.tsx` | Commit `a1a0728`, pusheado |
| 2026-08-05 | Inventario oficinas (cambio de estrategia) | Los 10 edificios pasan a referencia interna permanente; se publica una ficha genérica en su lugar. Solo toca `supabase/migrations/` | Cerrada — commit `06d32b1`, migración aplicada y pusheada. Sin deploy propio: era SQL, no cambiaba el bundle |
| 2026-08-05 | Banner promocional | Barra promocional en el home controlada desde el admin. Toca `src/components/sections/BannerPromo.tsx`, `src/pages/HomePage.tsx` y `ContenidoAdmin` dentro de `src/pages/AdminPage.tsx` | Cerrada — commiteada y desplegada |
| 2026-08-05 | RLS / exposición de datos | Diagnóstico de lectura anónima en Supabase. Solo investigación | Cerrada — derivó en la migración `20260805000300` |
| 2026-08-05 | RLS / cierre de escritura anónima | Migración `20260805000300`: RLS en `propiedades`, `ficha_clientes`, `ficha_propiedades` y `sdm_agentes`. Solo toca `supabase/migrations/` | Cerrada — aplicada y verificada contra producción. **Reverificada el 2026-08-10**: con la anon key, `propiedades?activo=eq.false` devuelve **0 filas** (82 activas), así que las direcciones de la cartera del socio siguen cerradas |
| 2026-08-05 | RLS / `envios_plantilla` | Migración `20260805000400`: RLS en la última tabla de `public` que lo tenía apagado. Tabla de Sofía. Solo toca `supabase/migrations/` | Cerrada — aplicada y verificada. **Falta confirmar que Sofía siga registrando envíos** |
| 2026-08-05 | RLS / vistas de métricas | Migración `20260805000500`: `security_invoker` en las 4 vistas `metricas_*`, que evadían el RLS de las tablas de Sofía. Solo toca `supabase/migrations/` | Cerrada — aplicada y verificada con medición antes/después |
| 2026-08-05 | Admin — Fase 3, etapa 1 | Partir `AdminPage.tsx`. Primitivas a `src/components/admin/primitivas.tsx` y pestaña piloto a `src/pages/admin/Mensajes.tsx` | Cerrada — commiteada, desplegada y verificada |
| 2026-08-05 | Admin — Fase 3, etapa 2 | Helpers compartidos a `src/components/admin/`: `campos.tsx`, `layout.tsx`, `acciones.tsx`, `ImageUploader.tsx`. `primitivas.tsx` eliminado | Cerrada — commiteada, desplegada y verificada |
| 2026-08-05 | Admin — Fase 3, etapa 3 | Cuatro paneles a `src/pages/admin/`: `Blog`, `Equipo`, `Asociados`, `PaginasLegales` | Cerrada — commiteada, desplegada y verificada |
| 2026-08-05 | Admin — Fase 3, etapa 4 | Romper el ciclo de imports: `RichTextEditor` + `TBtn` y `useDragSort` a `src/components/admin/` | Cerrada — ciclo eliminado, commiteada, desplegada y verificada |
| 2026-08-06 | Admin — Fase 3, etapa 5 | Tres paneles a `src/pages/admin/`: `Rental`, `Vende`, `Barranco` | Cerrada — commiteada, desplegada y verificada |
| 2026-08-06 | Admin — Fase 3, etapa 6 | `Contenido` a `src/pages/admin/Contenido.tsx`, con `CarouselPhotoManager` y `HomeDestacadasSelector` | Cerrada — commiteada, desplegada y verificada |
| 2026-08-06 | Admin — Fase 3, etapa 7 (final) | `Propiedades` a `src/pages/admin/Propiedades.tsx`, con `PropImageManager`, `DossierUploader` y `slugify` | Cerrada — **refactor de `AdminPage.tsx` terminado**, commiteada, desplegada y verificada |
| 2026-08-06 | Admin — Fase 3, iconos | Reemplazar los emojis del admin por `lucide-react`. Dos commits: sidebar + encabezados, y controles + editor | Cerrada — commiteada, desplegada y verificada |
| 2026-08-06 | Admin — Fase 3, limpieza | Borrar `FotosAdmin` y corregir los comentarios desactualizados | Cerrada — commiteada, desplegada y verificada |
| 2026-08-06 | Admin — Fase 3, escala tipográfica (fase 1) | **Definición de tokens en ZONA COMPARTIDA** (`src/styles/globals.css` y `tailwind.config.js`). No toca componentes | Commiteada y pusheada, **sin desplegar** — no cambia nada visible |
| 2026-08-06 | Admin — Fase 3, escala tipográfica (fase 2, tanda 1) | Migrar los literales inline del **dominio admin** a los tokens: 25 archivos, 3 commits | Cerrada — commiteada, desplegada y verificada |
| 2026-08-06 | Admin — layout móvil | Sidebar como cajón deslizante debajo de `lg`, header adaptado, `top-[57px]` corregido. Solo `AdminPage.tsx` | Cerrada — commiteada, desplegada y verificada |
| 2026-08-06 | Admin — móvil, ajustes internos | Encabezados de panel apilados debajo de `lg` (10 archivos) y separación de columnas en la tabla de Propiedades | Cerrada — commiteada, desplegada y verificada. **El centrado de textos no existía**; tablas sin layout móvil |
| 2026-08-07 | Admin — Tailwind: hover a CSS | **INVASIÓN DE DOMINIO** sobre `src/components/` y `src/pages/`: los 90 hover puros de JS pasan a `hover:` de CSS. Se limpian además 13 clases muertas de `globals.css` (**zona compartida**) | En curso |
| 2026-08-07 | Admin — acotar `mobile.css` al sitio público | **INVASIÓN DE DOMINIO**: `Layout`, `ElBarrancoShowcase` y `EvaluacionGratuitaPage` reciben `className="sitio-publico"` | Cerrada — 26 combinaciones del sitio público sin cambio, admin liberado |
| 2026-08-07 | Admin — limpieza de `mobile.css` | **CAMBIO EN ZONA COMPARTIDA**: se borran 6 reglas muertas. **Afecta a todo el sitio debajo de 768px** | Cerrada — de 26 reglas quedan 20 |
| 2026-08-07 | Admin — cierre del layout móvil | `Cotizaciones` a breakpoint `xl`, `TarjetasEquipo` apilado y grids responsive en `FichaCliente` Nueva/Editar | Cerrada — commiteada, desplegada y verificada |
| 2026-08-07 | Admin — Cotizaciones a tarjetas | Rediseño móvil de `CotizacionesAdmin` y eliminación de los 23 fondos `var(--off)` inline que disparaban el selector de `mobile.css` | Cerrada — commiteada, desplegada y verificada |
| 2026-08-07 | Admin — tablas a tarjetas | Rediseño móvil de las tablas de `Propiedades` y `Blog`, y corrección del `<thead>` desalineado de Propiedades | Cerrada — commiteada, desplegada y verificada |
| 2026-08-07 | Limpieza técnica | Alinear las versiones de TipTap para quitar `--legacy-peer-deps`, y precisar la condición de `SinArriendos`. **Tocó `package.json` y `package-lock.json`, que son ZONA COMPARTIDA** | Cerrada — commits `be3fa8a` y `441065c`. **El lockfile se regeneró entero**: si otra sesión tenía cambios en él, hay que reinstalar |
| 2026-08-07 | Cierre — tagline y línea de Captación | **Invasión de dominio autorizada por Víctor: una línea de `Captacion.tsx`** (`minmax(380px, 1fr)` → responsive). Sesión Sofía, no se tocó nada más de ese archivo. Además, tagline único en código y meta tags | Cerrada — commits `5916af3` y `1b2095c`. Quedan 3 claves de `contenido_sitio` por editar a mano desde el admin |
| 2026-08-07 | UX copy — tanda 1 | Errores, confirmaciones de borrado y confirmación de guardado. **Tocó `src/lib/errores.ts`, que es ZONA COMPARTIDA** — solo el texto de la alerta; la firma y el log a consola quedan igual | Cerrada — commits `a1c53a9`, `8187a81`, `4cdcbd2` y `4ad82a8` |
| 2026-08-07 | UX copy — tanda 2 | Estados vacíos, consistencia de botones, tuteo, últimos emojis. **Tocó `src/types/index.ts`, que es ZONA COMPARTIDA** — borró `agente_id`, un campo cuya columna nunca existió | Cerrada — commits `153765c`, `55ac084`, `edf05b6`, `e9ed05e` y `36a093e` |
| 2026-08-07 | UX copy — tanda 3 | Las listas que se recortaban en silencio, más dos pendientes de la tanda 2 | Cerrada — commits `490fa33`, `59c5feb` y `b2df33d` |
| 2026-08-07 | UX copy — subida de fotos | La subida descartaba archivos en silencio. Solo `src/pages/admin/Propiedades.tsx` | Cerrada — commit `0d95c6d` |
| 2026-08-07 | UX copy — `<SEO>` en las rutas que faltaban | Blog, post, asociados, reserva, 404 y showcase. **Tocó `src/pages/`, dominio de la sesión web pública**, y `src/App.tsx` para la 404 | Cerrada — commit `209ec68`. **Deja dos pendientes: la Function del blog y el og-image roto** |
| 2026-08-07 | OG — imagen por defecto y Function del blog | **Invasión de dominio autorizada: `SEO.tsx` (og-image.jpg → .png) y `functions/blog/[slug].js` (nuevo, calcado de `propiedades/[id].js`).** `functions/` es de la sesión Sofía; no se tocó nada más de ahí | Cerrada — commits `b464c5b` y `42d61cb` |
| 2026-08-07 | Accesibilidad — tanda 1: contraste | **Cambio en zona compartida: correcciones de contraste WCAG AA en la paleta y en las clases de componente. Afecta a todo el sitio.** Tocó `src/styles/globals.css`; `tailwind.config.js` no hizo falta | Cerrada — commits `4a0c90c`, `fe9cc70`, `abb845d` y `60b144d` |
| 2026-08-07 | Sistema de color — tanda 1 | Insignias de estado y de oportunidad a variables semánticas, con contraste AA. **Tocó `src/styles/globals.css`, ZONA COMPARTIDA** | Cerrada — commit `12a46e2`. **`.btn-evaluacion` NO se eliminó: la condición de parada del encargo se disparó, ver el registro** |
| 2026-08-07 | Sistema de color — botón invertido | `.btn-evaluacion` eliminado, `.btn-inverse` creada. **Tocó `src/styles/globals.css`, ZONA COMPARTIDA** | Cerrada — commit `8c9770b` |
| 2026-08-07 | Color de estado — «Reservada» a tono frío | `--estado-reservada` de ámbar a petróleo, por daltonismo. **Tocó `src/styles/globals.css`, ZONA COMPARTIDA** | Cerrada — commit `f3d5860` |
| 2026-08-07 | Sistema de color — unificar la paleta paralela | **Los cinco colores del módulo de fichas pasan a la paleta oficial. La paleta paralela queda eliminada** | Cerrada — commits `2560d41`, `fcc24dc`, `788f51f` y `0768274` |
| 2026-08-08 | Sistema de color — el rojo de error | `--error: #A8384B` nace en **`src/styles/globals.css`, ZONA COMPARTIDA**, y reemplaza los 21 literales `#E24B4A` de admin y web pública. Antes, el precio rebajado de `PropiedadDetailPage` deja de usar el rojo y pasa a `--oportunidad`. **`Captacion.tsx` no se toca** — su uso queda pendiente | Cerrada — commits `95e7b25` y `c7ee2a7` |
| 2026-08-06 | Admin — sticky del header en móvil | **CAMBIO EN ZONA COMPARTIDA**: `src/styles/mobile.css` pasa de `overflow-x: hidden` a `clip`. Completa el cambio de `globals.css` — `html: clip` + `body: hidden` también rompe el `position: sticky`. **Afecta a todo el sitio debajo de 768px** | Cerrada — el header se pega en los 7 anchos medidos, commiteada, desplegada y verificada |
| 2026-08-06 | Admin — sticky del header | **CAMBIO EN ZONA COMPARTIDA**: `html` y `body` pasan de `overflow-x: hidden` a `clip`. `hidden` creaba contenedor de scroll y rompía el `position: sticky` del header del admin. `clip` recorta igual sin ese efecto. **Afecta a todo el sitio** | Cerrada — escritorio arreglado y verificado. **Debajo de 768px sigue roto**: `mobile.css` reintroduce `body { overflow-x: hidden }` |
| 2026-08-06 | Admin — Fase 3, escala tipográfica (fase 2, tanda 2) | **INVASIÓN DE DOMINIO** sobre `src/pages/` (fuera de `admin/`), `src/components/sections/` y `src/components/ui/`, para completar la migración iniciada en la tanda 1 | Cerrada — 29 archivos, 4 commits, desplegada y verificada. **Los 17 `em` quedan pendientes de tu revisión** |
| 2026-08-08 | Accesibilidad — tanda 2: etiquetas de formulario (paso 1) | Los tres formularios **públicos** pasan a `<label>` que envuelve al control: `ContactSection`, `SolicitudCreditoForm` y `VendeConNosotrosPage`. **`campos.tsx` NO se toca** — el paso 2 espera el visto bueno | Cerrada — commits `20d7fd4`, `e260e6e` y `5d3b007` |
| 2026-08-08 | Accesibilidad — tanda 2: etiquetas de formulario (paso 2) | `Field` envuelve a su control (152 campos del admin), nace `FieldGroup` para los 19 editores compuestos, y los `<select>` de `SearchBar` reciben rótulo asociado. **Toca `src/components/admin/campos.tsx` y `src/components/sections/SearchBar.tsx`** | Cerrada — commits `ed40ebe`, `7db6be7` y `03fed5c` |
| 2026-08-08 | Accesibilidad — tanda 2: cierre de los tres archivos | `PropiedadesPage`, `MapPicker` y `ElBarrancoShowcase` (9 campos), más el `aria-label` del input de URL de `ImageUploader`. **El barrido completo destapó 83 campos sin asociar en 10 archivos más** | Cerrada — commits `b184fa8` y `44e890a` |
| 2026-08-08 | Accesibilidad — tanda 2: cierre completo | Los tres envoltorios duplicados (`Fld`×2, `FLabel`×5) envuelven, más el login del admin y 4 controles de fila. **Fuera de `Captacion.tsx` no queda ningún campo sin nombre accesible en `src/`** | Cerrada — commits `ba3fe67`, `12da41f` y `9b7b66c` |
| 2026-08-08 | Admin — un solo envoltorio de campo | Los dos `Fld` se borran y sus 40 usos pasan al `Field` de `campos.tsx`. `FLabel` sobrevive a propósito: diverge en estilo | Cerrada — commit `e3151a9` |
| 2026-08-08 | Accesibilidad — tanda 3: teclado | Anillo de foco a `--green-dark` **en `globals.css`, ZONA COMPARTIDA**, indicador no cromático en `.input-line`, 16 `outline: none` fuera, 8 divs a `<button>`, 2 tarjetas, header completo y `RadioGroup` | Cerrada — commits `2e45121`, `c453e58`, `f90f602`, `4ced14d`, `22a5f60` y `f671ab9` |
| 2026-08-08 | Accesibilidad — tanda 4: estructura, idioma y modales | Un `h1` por página en las 19 rutas, `sanitizarContenido()` en **`src/lib/`**, `lang` en el showcase y `useDialogoModal` en **`src/hooks/`** para los CINCO modales | Cerrada — commits `1955063`, `06aca14` y `19bc3c2` |
| 2026-08-08 | Accesibilidad — tanda 5: tamaño táctil y movimiento | `.area-44` en **`globals.css`, ZONA COMPARTIDA** para 13 objetivos, botón de pausa en los dos carruseles de la home y `prefers-reduced-motion` en todo el sitio | Cerrada — commits `e1e201e`, `cb73a07` y `da5b0ef` |
| 2026-08-08 | Accesibilidad — tanda 6: cierre de tamaño táctil y del último carrusel | Los 6 puntos que fallaban 2.5.8 pasan a 18px de separación; el resto cumple por excepción. El slider de El Barranco recibe pausa bilingüe | Cerrada — commits `c0250e9` y `91ba9b1` |
| 2026-08-08 | Accesibilidad — tanda 6: los menores | 70 iconos decorativos ocultos, estado en los 3 controles de dos estados, `.sr-only` nueva en **`globals.css`** y los 13 tokens tipográficos a `rem` en **`globals.css` y `tailwind.config.js`, ZONA COMPARTIDA**. **El reordenamiento por teclado NO se hizo** | Cerrada — commits `b306c5a`, `49fef29`, `ea2ea11` y `248e418` |
| 2026-08-08 | Contenido — cierre de la inconsistencia internacional | 12 textos de «el mundo» pasan a «Chile y Paraguay» —**`src/lib/i18n.ts` y `functions/blog/[slug].js`, ZONA COMPARTIDA y dominio Sofía**— y se borra el material muerto de los seis destinos | Cerrada — commits `48d38dd` y `2fb2712` |
| 2026-08-09 | Captación — cierre de los nueve pendientes | **Invasión de dominio autorizada: `Captacion.tsx`. Se cierran los nueve hallazgos que quedaron pendientes de las auditorías de UX copy, color y accesibilidad. No se toca la lógica del bot ni sus escrituras a Supabase** | Cerrada — commits `77d216c`, `166bca2`, `d0ba68e`, `92030bf` y `d236092`. **Ya no queda ningún módulo con excepciones de auditoría.** Deja 5 pendientes nuevos, el primero es blanco sobre `--green` a 2.93:1 |
| 2026-08-09 | Captación — insignias de lead a token | **CAMBIO EN ZONA COMPARTIDA: nacen seis tokens `--lead-*` en `src/styles/globals.css`** (tres de texto y tres de fondo) para la escala Hot/Warm/Cold, que vivía como literales en `Captacion.tsx` y fallaba contraste en dos de los tres. Solo los consume `Captacion.tsx`; no toca ninguna clase existente | Cerrada — commit `54d9cdc`. **Declarar siempre la matriz de daltonismo al medir ΔE**: la de acá es ~2 puntos más generosa que la de agosto |
| 2026-08-09 | Captación — cerrar el ciclo de la visita | Sección «Visitas confirmadas» y acción «Marcar como realizada». Solo `src/pages/admin/Captacion.tsx` | Cerrada — el ciclo pendiente → confirmada → realizada por fin tiene las tres etapas visibles |
| 2026-08-09 | Deuda menor — cierre | **INVASIÓN DE DOMINIO sobre `src/pages/`, `src/components/` y `functions/`** (sesión web pública y sesión Sofía): 4 Pages Functions nuevas, header, SEO, chevron de fichas y unificación de `FLabel`. No toca `globals.css` | En curso |
| 2026-08-09 | Teclado + TipTap | **INVASIÓN DE DOMINIO sobre `src/pages/` y `src/components/`**: reordenamiento por teclado en los 10 puntos de arrastre. Además TipTap 3.23.6 → 3.29.2, que toca `package.json` y `package-lock.json`, **ZONA COMPARTIDA** | Cerrada — commits `8435408`, `c9d563a` y `2a68f95` |
| 2026-08-09 | Alineación de campos del admin | Barrido de los 13 paneles a 1440/1280/390. Tres filas con `items-end` (dos en Propiedades, una en Cotizaciones) y **un cambio en zona compartida**: `min-height` derivado en `.input-line` de `globals.css`, porque el `<select>` medía 41px contra los 45px del `<input>`. Afecta también al select de `/vende-con-nosotros`, que ahora empareja con sus inputs | Cerrado |
| 2026-08-09 | Sistema de diseño: arreglos críticos | **ZONA COMPARTIDA cerrada.** `muted` valía dos cosas (#7a8a96 / #5F7183); ahora `ink`, `muted`, `border` y `off` del config APUNTAN a las custom properties con `var()`, así que el valor vive en un solo sitio y no pueden volver a divergir — a cambio se pierden los modificadores de opacidad, hoy con cero usos. Los cinco `.btn-*` tienen los cuatro estados, con hover por color en vez de por opacidad. Borde de `.btn-outline` de alfa 0.25 a 0.40 (2.27:1 → 3.67:1) | Cerrado |
| 2026-08-09 | Escala de radio + SISTEMA-DISENO.md | **ZONA COMPARTIDA cerrada.** `--sdm-radio-control` 2px, `--sdm-radio-contenedor` 4px, `--sdm-radio-flotante` 8px, espejados en `tailwind.config.js` con `var()`. Los 155 radios sueltos NO se migran: la cola queda anotada en el token. Y se crea **`SISTEMA-DISENO.md`**, que a partir de ahora es la REFERENCIA del sistema — este archivo queda como histórico, y cuando se contradigan manda el otro | Cerrado |
| 2026-08-09 | Tokens que faltan + barrido de --green | **ZONA COMPARTIDA cerrada.** 29 usos de `--green` como texto sobre claro pasan a `--green-dark` (2,93 → 4,85:1), incluida la regla `.section-label`. Tokens de peso (3; sin 600/700, porque Inter no los carga y son negrita sintética) y de movimiento (3 duraciones + 1 curva). La cola del radio de Captación y SearchBar alineada a la escala. La escala de ESPACIADO no se define: 1.619 literales, ver `SISTEMA-DISENO.md` 1.6 | Cerrado |
| 2026-08-09 | SEO: los cuatro críticos | **INVASIÓN ANUNCIADA de `functions/`, dominio de la sesión Sofía.** Se añade un segundo filtro para buscadores (Googlebot, bingbot, Google-InspectionTool, DuckDuckBot, Applebot, Yandex) que sirve el index.html REAL con la cabecera reescrita, no el stub de los bots sociales. Canonical propio en el cliente para tres rutas. Sitemap generado en el prebuild | En curso |
| 2026-08-09 | Datos estructurados de fichas y artículos | **INVASIÓN ANUNCIADA de `functions/`, dominio de la sesión Sofía.** `RealEstateListing`+`Accommodation` en las 82 fichas y `BlogPosting` en los 13 artículos, más `BreadcrumbList` en ambos, emitidos desde las Pages Functions. SIN `geo` ni `streetAddress` — ver el porqué en `src/lib/schema.js`. El `RealEstateAgent` de index.html se queda y convive | En curso |
| 2026-08-09 | Buscador del hero + barra de indicadores | **ZONA COMPARTIDA: se crea `src/lib/indicadores.ts`**, que pasa a ser la única fuente de UF y dólar. `CotizacionesAdmin` deja de tener su propio `fetch` a mindicador y consume el módulo — TOCA EL CÁLCULO DE DINERO DEL WIZARD, verificado que el valor y el flujo no cambian | En curso |
| 2026-08-09 | Financiamiento al puesto 3 del Inicio + política de honorarios | **ZONA SIN DUEÑO ASIGNADA: `src/components/credito/` pasa a la sesión web pública** — no figuraba en ninguna. **INVASIÓN ANUNCIADA de `src/pages/admin/Contenido.tsx`** (sesión admin) para los campos nuevos, y de **`src/lib/i18n.ts`, ZONA COMPARTIDA**, para retirar 4 claves muertas de `sections.financiamiento`. El bloque sube del puesto 5 al 3, por encima del banner promocional. Seis claves de `contenido_sitio`, sembradas con la migración `20260809000000`. Se corrige la declaración de honorarios en las TRES superficies que la hacían | Cerrado |
| 2026-08-10 | Auditoría UI Fase 3 | Auditoría UI/UX completa del sitio contra `ui-ux-pro-max` → `AUDITORIA-UI-FASE3.md` (3 críticos, 9 altos, 11 medios, 5 bajos). Se resuelve **C1**: el header `fixed` medía 91px desde 768px —al sumar la barra de indicadores de `2d380e5`— pero el desplazamiento del contenido seguía en 64px, así que los primeros 27px de cada página quedaban tapados en las 17 rutas. **ZONA COMPARTIDA: nace `--sdm-header-total` en `src/styles/globals.css`** y `Layout.tsx` pasa a consumirlo. **INVASIÓN ANUNCIADA de `src/pages/ServiciosPage.tsx` y `src/pages/HomePage.tsx`** (sesión web pública), por dos referencias más que encontró el barrido previo. Toca además `HeroSection.tsx` y **`mobile.css`, ZONA COMPARTIDA** (corte a 767.98px) | **Cerrada y desplegada** — commit `23f8f13`. Era el REGISTRO el que estaba desactualizado, no el despliegue: `23f8f13` es ancestro de `HEAD` y salió en el deploy del 2026-09-09. Verificado contra `sdmcapital.cl`, no solo por git: el CSS servido define `--sdm-header: 65px`, `--sdm-barra: 0px` con la media query que lo sube a 26px desde 768, y `--sdm-header-total: calc(var(--sdm-header) + var(--sdm-barra))`; el JS servido consume `paddingTop:"var(--sdm-header-total)"` |
| 2026-08-10 | Ficha de propiedad — filtro de `activo` | `PropiedadDetailPage.tsx` era el único punto del código público que consultaba sin filtrar `activo`, dejando la política `propiedades_select_anon` como control único sobre las direcciones de la cartera del socio. Pasa a `.eq('activo', true)` en las dos consultas (slug y UUID→slug) y a `.maybeSingle()` | **Cerrada y desplegada** — commit `67634a3`. Registro desactualizado, no despliegue pendiente: es ancestro de `HEAD` y salió en el deploy del 2026-09-09. Verificado contra `sdmcapital.cl`: el chunk servido trae las DOS consultas minificadas — `select("slug").eq("id",t).eq("activo",!0).maybeSingle()` y `select("*").eq("slug",t).eq("activo",!0).maybeSingle()` |
| 2026-08-10 | OG de propiedades — mismo filtro en la Function | **INVASIÓN ANUNCIADA de `functions/`, dominio de la sesión Sofía.** Un archivo, una línea: `functions/propiedades/[id].js` añade `&activo=eq.true` a su consulta. Cierra el mismo patrón que `67634a3` cerró en la ficha — era la última consulta a `propiedades` sin filtrar. **No se tocó nada más de `functions/`**; las otras siete se revisaron y están limpias (`blog/[slug].js` ya filtraba `publicado=eq.true`, y las otras cinco no consultan datos). Mismo precedente que `42d61cb` | **Cerrada y desplegada** — commit `c2eb606`, ancestro de `HEAD`; el deploy del 2026-09-09 subió el bundle de Functions. **La verificación externa NO puede aislar este cambio, y es por diseño:** como dice su propio comentario, el filtro no cambia ninguna respuesta mientras `propiedades_select_anon` siga en pie. Lo que sí se comprobó es el estado final — con UA de rastreador social, `/propiedades/torre-los-andes` (pausada) devuelve el OG genérico del sitio, sin «Torre Los Andes» ni «Miraflores», mientras una ficha activa devuelve su título, descripción y foto propios |
| 2026-08-23 | Migración: ciclo de lead y visita | Migración `20260823000000_ciclo_lead_y_visita.sql`: `leads.contactado_en`/`cerrado_en`/`resultado` (NO toca `status`, la escribe el Worker en index.js:1750) y `visitas.realizada_en` (NO toca el CHECK de `estado`). Backfill: las 10 filas de `visitas` en `estado='realizada'` (9 leads distintos) se mueven a `leads.cerrado_en`/`resultado=null` y esas visitas vuelven a `'pendiente'`. Solo toca `supabase/migrations/` | Cerrada — commit `61b7892`, aplicada y verificada. **Sin push** |
| 2026-08-23 | Migración: backfill `contactado_en` + RPC `resumen_diario` | Migración `20260823000100_resumen_sin_contactar.sql`: backfill `leads.contactado_en = cerrado_en` donde `cerrado_en IS NOT NULL` (9 leads). RPC `resumen_diario` recreada con `DROP FUNCTION` + `CREATE` (Postgres rechaza `CREATE OR REPLACE` si cambian nombres de columnas de salida): `visitas_pendientes` sale, entran `sin_contactar` (status='derivado' AND contactado_en IS NULL AND cerrado_en IS NULL) y `visitas_confirmadas` (estado='confirmada'). `estado='pendiente'` deja de contarse en la RPC — significaba "Sofía ofreció coordinar", no visita agendada. Solo toca `supabase/migrations/` | Cerrada — aplicada y verificada. `sin_contactar=0` hoy (no hay leads en status='derivado'). **Sin push** |
| 2026-08-23 | Migración: filtros por contacto, no por `status` | Migración `20260823000200_filtros_por_contacto.sql`. **`seguimiento_candidatos` se versiona por primera vez** — vivía solo en la base, aplicada a mano por el SQL Editor. Único cambio de lógica: `l.status not in ('derivado','cerrado','perdido')` pasa a `l.contactado_en is null and l.cerrado_en is null`. En `resumen_diario`, `sin_contactar` deja de filtrar por `status` y usa las mismas dos columnas. Motivo: `leads.status` tiene tres escritores y cinco valores, y `'visita_confirmada'` —que escribe el admin— no estaba en la lista de exclusión. Solo toca `supabase/migrations/` | Cerrada — aplicada y verificada. `CREATE OR REPLACE` bastó en las dos (no cambian columnas de salida), así que el ACL y el SECURITY INVOKER sobrevivieron sin recrearse. `seguimiento_candidatos` devuelve 0 candidatos y 0 leads con `cerrado_en`; `sin_contactar` = 5. **Sin push** |
| 2026-08-23 | Captación — el ciclo del equipo sale de `leads.status` | **INVASIÓN DE DOMINIO ANUNCIADA sobre `src/pages/admin/Captacion.tsx`, dominio de la sesión Sofía / chatbot.** El panel deja de escribir `leads.status` —campo del Worker— y el ciclo de gestión del equipo pasa a `contactado_en` / `cerrado_en` / `resultado` (migración `20260823000000`). Tres acciones por fila: «Ya lo contacté» (un clic, sin diálogo), «Cerrar» con los cuatro resultados, y «Ya no está en mi lista» (cierre rápido, `resultado = null`). Cerrar implica contactado: si falta `contactado_en` se escribe con el mismo timestamp. La última columna pasa a Sin contactar / Contactado / Cerrado. **No se tocan `visitas` ni `conversation` ni `mensajes`** | Cerrada — commiteada y desplegada. Se quitaron **DOS** escritores de `status`, no uno: el de `confirmarVisita` y el `<select>` «Estado» del modal de editar, que podía dejar cualquiera de los 7 valores del CHECK o NULL. `estadoLead()`, `STATUS_DE_VISITA` y la marca `contradice` eliminados: los ejes ya no compiten por la misma etiqueta |
| 2026-08-23 | Captación — cuatro arreglos sobre el ciclo del equipo | **INVASIÓN DE DOMINIO ANUNCIADA sobre `src/pages/admin/Captacion.tsx`, dominio de la sesión Sofía / chatbot.** Continuación de `296716a`, sin migración. (1) El botón Actualizar confirma con la píldora de `acciones.tsx` — se reusa `useGuardado`, NO el componente `Guardado`, cuyo texto «Guardado correctamente» sería falso tras una recarga. (2) «Reabrir» en la franja de los cerrados: `cerrado_en` y `resultado` a null explícito, `contactado_en` intacto; único botón con `confirm()` porque es el único que revierte. (3) Jerarquía: `.btn-primary` / `.btn-green` / `.btn-text`, se eliminan los `background: var(--muted)` inline que fabricaban una sexta variante y, por ser inline, anulaban el `:hover` de `globals.css`. (4) La franja de cerrados deja de repetir la columna. **Efecto lateral: los tres loaders devuelven su `error` en vez de tragárselo** — `loadLeadsQuiet` y `loadMetrics` ni siquiera lo recogían | Cerrada — commiteada y desplegada |
| 2026-08-23 | Captación — «Cerrar» baja a `.btn-text` | **INVASIÓN DE DOMINIO ANUNCIADA sobre `src/pages/admin/Captacion.tsx`, dominio de la sesión Sofía / chatbot.** Ajuste de una línea sobre `2cc69d7`: «Cerrar» pasa de `.btn-green` a `.btn-text`. El verde se leía como «esta es la buena» y cerrar incluye «No calificó» y «No respondió». Quedan DOS niveles, no tres: `.btn-primary` para «Ya lo contacté», `.btn-text` para los dos cierres. «Ya no está en mi lista» sigue visible —no se mete en el desplegable, ahí dejaría de ser rápido— y se separa con `marginLeft: auto`, por posición y nunca por color ni por peso | Cerrada — commiteada y desplegada |
| 2026-08-23 | Captación — métricas, ceros que mienten y orden de página | **INVASIÓN DE DOMINIO ANUNCIADA sobre `src/pages/admin/Captacion.tsx`, dominio de la sesión Sofía / chatbot.** Las tarjetas pasan de 5 a 5 pero otras: «Sin contactar» (estado actual, tiene que cuadrar con `resumen_diario.sin_contactar`), «Leads nuevos», «Calificación» con los sin calificar, «Visitas» sin realizadas, y «Gestión del equipo» nueva. **Se elimina la conversión lead → visita**: medía `visitas.estado='confirmada'` contra el histórico completo, así que una visita que avanzaba a realizada dejaba de contar y marcaba 0,0 % para siempre. Las ventanas de tiempo pasan a mes calendario en Chile vía `hoyEnChile()` de `src/lib/indicadores.ts` (**ZONA COMPARTIDA, solo lectura**). Un fallo de carga deja de verse como un cero: «No se pudo cargar» en rojo, contra «Nadie esperando» en verde cuando el cero es real. Orden de página invertido: leads primero, métricas al final; los vacíos pasan de tarjeta de 48 px a una línea. **También se eliminó «Compra vs. arriendo»**, que no estaba en las cinco pedidas — el dato no vive en ninguna otra parte, restaurarla es un bloque de 8 líneas. `sumarDias()` usa `toISOString().slice(0,10)` y es SEGURO: la fecha se ancla a 00:00Z y se mueve en días UTC enteros | Cerrada — commiteada y desplegada. Panel y RPC coinciden en `sin_contactar` = 0 |
| 2026-08-23 | Captación — «Compra vs. arriendo» vuelve como renglón | **INVASIÓN DE DOMINIO ANUNCIADA sobre `src/pages/admin/Captacion.tsx`, dominio de la sesión Sofía / chatbot.** El dato que se había perdido en `081421a` vuelve, pero NO como tarjeta: como renglón «Intención» dentro del bloque de perfil, que pasa a titularse «Perfil de los leads (este mes)» y agrupa intención + comunas. No es accionable —las cinco tarjetas responden «¿qué hago ahora?», esto «¿quién llegó este mes?»— y con 4 y 0 una tarjeta entera era el mismo problema de la conversión. Sale de la misma consulta del mes, sin viaje extra. Se añade **«Sin declarar»**: 4 + 0 sobre 7 leads dejaba tres filas sin explicar, el mismo agujero que tenían los scores | Cerrada — commiteada y desplegada |
| 2026-08-23 | Captación — visitas de leads cerrados y tarjetas colapsables | **INVASIÓN DE DOMINIO ANUNCIADA sobre `src/pages/admin/Captacion.tsx`, dominio de la sesión Sofía / chatbot.** (1) Las dos secciones de visitas excluyen los leads con `cerrado_en`: Salomón Adasme y Francisca salían pidiendo coordinar y a la vez «Cerrado» en la lista de arriba, restos del backfill de `20260823000000`. **Las 10 visitas `pendiente` eran todas de leads cerrados**, así que ambas secciones quedan en 0. (2) Los dos contadores de visitas SALEN DE LAS LISTAS, no de consultas propias en `loadMetrics` — dos consultas menos y una sola fuente, que es lo que impide que la tarjeta diga 10 mientras la sección muestra 0. (3) Tarjetas de visita colapsables reusando el `role="button"` de `LeadRow`; «Confirmar visita» sigue en verde sólido | Cerrada — commiteada y desplegada |
| 2026-08-23 | Captación — rótulo de gestionados y filas colapsadas | **INVASIÓN DE DOMINIO ANUNCIADA sobre `src/pages/admin/Captacion.tsx`, dominio de la sesión Sofía / chatbot.** (1) «Gestión del equipo (este mes)» pasa a **«Gestionados este mes»**: cuenta la ACCIÓN del equipo en el mes —14 contactados, 10 cerrados— y esos leads pueden ser de meses anteriores, así que el rótulo viejo invitaba a compararlos con los 7 leads nuevos. Cálculo sin tocar. (2) Las filas de leads colapsan a su cabecera. **La franja de un clic sobrevive, pero solo cuando «Ya lo contacté» es accionable** (`!contactado_en && !cerrado_en`): su mera presencia señala «esta fila te espera», y las ya gestionadas colapsan del todo. Cerrar / escape / Reabrir pasan detrás del chevron. **NO se entierra el contacto**: sigue costando un clic, que es de lo que depende `seguimiento_candidatos` | Cerrada — commiteada y desplegada |
| 2026-08-23 | Revisión de RLS — solo diagnóstico | Auditoría de RLS sobre las 26 tablas de `public`, disparada por una alerta de «RLS deshabilitado» en `envios_plantilla`, `eventos_turno` y `migracion_r2`. **RESULTADO: no hay ninguna tabla con RLS apagado, y el advisor de seguridad no reporta ni un solo hallazgo de RLS** — sus 20 avisos son 19 `function_search_path_mutable` y 1 `auth_leaked_password_protection`. La alerta estaba obsoleta: la cerraron las migraciones `20260805000300`/`000400`. Cinco tablas están en RLS + 0 políticas (deny-all deliberado para anon y authenticated, service_role bypasea). **No se escribió ninguna migración**; queda propuesta pendiente de revisión sobre `envios_plantilla`, que es la única con una política `ALL` permisiva `true` para `authenticated` | Cerrada — derivó en la migración `20260823000300` |
| 2026-08-23 | RLS + `search_path` — migración `20260823000300` | Migración `20260823000300_rls_y_search_path.sql`. (1) `DROP POLICY envios_plantilla_all_auth`: `envios_plantilla` baja a deny-all como sus cuatro hermanas de Sofía; el Worker no se entera porque usa `service_role`. (2) `SET search_path = public` en las **19** funciones de `public`, con `ALTER FUNCTION` y sin recrear ninguna. (3) **SE VERSIONAN 17 FUNCIONES QUE SOLO VIVÍAN EN LA BASE** — de 19, únicamente `resumen_diario` y `seguimiento_candidatos` estaban en el repo. Los cuerpos salen de `pg_get_functiondef` volcados por script, no transcritos. **Orden crítico: los `CREATE OR REPLACE` van ANTES de los `ALTER`**, porque un `CREATE OR REPLACE` sin cláusula `SET` reinicia la config de la función y borraría el `search_path`. `migracion_r2` NO se tocó: es el mapa de la migración de imágenes y el borrado de los 390 huérfanos de Storage está pendiente hasta el 2026-09-01. El advisor pasa de 20 hallazgos a **1** (`auth_leaked_password_protection`, que se arregla en el panel de Supabase, no por SQL) | Cerrada — aplicada y verificada. Sin deploy: es SQL |
| 2026-08-23 | Captación — maquetación del bloque de métricas | **INVASIÓN DE DOMINIO ANUNCIADA sobre `src/pages/admin/Captacion.tsx`, dominio de la sesión Sofía / chatbot.** Solo maquetación, sin tocar cálculos. (1) La grilla de métricas pasa de `grid` a **flex-wrap** con `flex: '1 1 190px'`: cinco tarjetas no entraban en cuatro columnas y «Gestionados este mes» caía sola con tres huecos. Se pasaba **por 12 px** —5×200+4×16 = 1064 contra 1052 de ancho útil—, pero el cambio de fondo es grid→flex: la grilla RESERVA columnas vacías en la última fila y flex las reparte, así que ya no puede quedar un hueco en ningún corte. (2) «Sin contactar» en cero llevaba `margin: 'auto 0'`: su línea mide ~24 px contra los ~47 de un `Stat` y la tarjeta quedaba con vacío abajo. Márgenes automáticos de flexbox, sin `minHeight` a ojo y sin contenido inventado; con cifra sigue alineada arriba como las otras cuatro | Cerrada — commiteada y desplegada |
| 2026-08-23 | Admin móvil — el cajón no scrollea. Solo diagnóstico | Bug en iPhone/Safari: con el menú lateral abierto no se llega a «Agentes» ni «Captación». **NO es el mecanismo de `overflow-x: hidden` vs `clip`** — los tres sitios (html y body en `globals.css`, body en `mobile.css`) están correctamente en `clip`, y ninguna regla de `mobile.css` alcanza al `<aside>`. **La causa es `h-screen` = `100vh` en `AdminPage.tsx:213`**: en iOS `100vh` es el viewport GRANDE, así que el aside mide más que el área visible, su contenido (789 px) cabe dentro y `overflow-y-auto` no genera scroll. El corte cae en 681 px, justo donde termina «Ficha para cliente». El rebote es el body en `position: fixed` del bloqueo del cajón. **No se aplicó ningún cambio**; propuesta `100dvh` pendiente de revisión | Cerrada — derivó en el arreglo de abajo |
| 2026-08-23 | Admin móvil — arreglo del cajón | **INVASIÓN DE DOMINIO: `src/pages/AdminPage.tsx`, una línea.** `h-screen` pasa a `h-screen supports-[height:100dvh]:h-[100dvh]` y el `<aside>` gana `overscrollBehavior: 'contain'`. **TRAMPA MEDIDA: `h-screen h-[100dvh]` a secas NO FUNCIONA.** Tailwind emite `.h-\[100dvh\]` en el offset 15841 y `.h-screen` en el 15935 del CSS compilado —el arbitrario ANTES—, así que con la misma especificidad ganaba `100vh` y el arreglo no hacía nada. El orden del `className` no decide; decide el orden en la hoja. `@supports` sale del empate porque se emite después. Cascada verificada sobre `dist`: respaldo 15935 < dvh 31798 < `lg:` 33721. **No se tocó `overflow` de html/body/contenedores ni el bloqueo del cajón** — `src/styles/` sin cambios | Cerrada — commiteada y desplegada |
| 2026-08-23 | Captación — ficha móvil de la fila de lead | **INVASIÓN DE DOMINIO ANUNCIADA sobre `src/pages/admin/Captacion.tsx`, dominio de la sesión Sofía / chatbot.** Solo maquetación, solo bajo `lg`. La cabecera de `LeadRow` pasa a **DOS RAMAS** —`hidden lg:flex` y `lg:hidden`— en vez de una con media queries: las diferencias son de CONTENIDO (en móvil los campos vacíos no se pintan y los que hay llevan rótulo), y eso no se puede hacer desde CSS. «cata gallegos» baja de 6 líneas a 2. Se extraen `AccionesFila` y `CampoMovil`. **`.area-44` con separación 14 en móvil y 4 en escritorio**: con 4 px las dos zonas táctiles de 44 se solapan 10 px y en el solape gana el último del DOM, o sea que parte del blanco de «editar» dispararía «eliminar». Verificado que ninguno de los 11 selectores sueltos de `mobile.css` alcanza el marcado nuevo. Comportamiento intacto: fila colapsada, «Ya lo contacté» a un clic, bloque expandido igual | Cerrada — commiteada y desplegada |
| 2026-09-09 | Financiamiento — cuatro productos en el modal | Migración `solicitudes_credito` (4 columnas + 3 CHECK) y rediseño de `src/components/credito/`: nace `campos.tsx` con el `RadioGroup` compartido y `productos.ts` con el tipo. Zona de la sesión web pública desde el 2026-08-09. No toca `globals.css` ni `functions/`. **PENDIENTES, fuera de alcance de esta sesión:** (1) `supabase/functions/notify-credito/` sigue siendo hipotecario-puro — el asunto dice «crédito hipotecario» y la tabla del correo ignora `producto`, `monto_solicitado`, `tipo_persona` y `tipo_bien`, así que una solicitud de leaseback llega como un hipotecario vacío; (2) `EvaluacionGratuitaPage.tsx` monta el formulario sin selector y se queda hipotecaria por el DEFAULT de la prop `producto` — la prop es opcional justamente para no romperle el `tsc`; (3) `ServiciosPage.tsx` sigue abriendo este modal para «Financiamiento Empresas»; (4) nadie lee `solicitudes_credito` en el admin, así que `producto` no se ve en ninguna pantalla | **Cerrada, pusheada y desplegada** — commit `1a5c59c`, desplegado el 2026-09-09 (`26c471c5.sdmcapitalpage.pages.dev`; `sdmcapital.cl` sirve el chunk `index-CK3MAEEu.js`, verificado con cinco muestras y con los cuatro valores de `producto` presentes en el bundle). La migración `20260909205233` quedó aplicada en producción y verificada. **El deploy se frenó una vuelta** porque `wrangler whoami` devolvía `beocert36@gmail.com` / `4c50093eb31e02f3fa6d4b0505f3b2a5` en vez de la cuenta de SDM — el mismo fallo del 2026-08-11 que ya documenta `CLAUDE.md`; se resolvió con `wrangler login`. **Incidente del día, ya documentado en `CLAUDE.md`:** `supabase/.temp/project-ref` apuntaba a `gczyxedxakfrjjpdpnzl` (BookFindería) y no a `ugfhgfpgxyfzafudxaeo`; con ese link, `migration up --linked` habría replicado las 18 migraciones con timestamp de SDM sobre la base de otro proyecto. Se detectó porque la verificación se corrió antes del DDL |
| 2026-09-09 | Documentación — verificación de cuenta antes de DDL | **ZONA SIN DUEÑO: `CLAUDE.md` no figura en la división de dominios.** Se reescribe la sección «Antes de cualquier DDL: verificar con qué cuenta quedó la CLI», que describía **un** modo de fallo y son **dos**. El documentado era el ruidoso —403 de privilegios, se arregla con `supabase login`, falla antes de tocar nada—. Se suma el **silencioso**: la CLI autenticada y linkeada a otro proyecto que sí existe, sin 403 ni advertencia, donde `migration up --linked` aplica las migraciones de este repo sobre la base ajena. La verificación pasa de un comando a tres (`projects list`, `cat supabase/.temp/project-ref`, `migration list`), se explica cómo leer una fila con Remote poblado y Local vacío, y se retira la afirmación de que el link «no cambia» — desmentida este mismo día. Se anota además que `.env` y la CLI son configuraciones independientes: que el sitio hable con la base correcta no dice nada de la CLI | **Cerrada, pusheada y desplegada** — commit `fc0ddcd`, subido y desplegado el 2026-09-09 en el mismo deploy que `1a5c59c`. No toca código ni base: el bundle no cambia por esto |
| 2026-09-09 | Documentación — la sección de wrangler, en dos modos | **ZONA SIN DUEÑO: `CLAUDE.md`.** Mismo eje que la fila de más arriba, segunda herramienta: «Antes de desplegar: verificar con qué cuenta quedó wrangler» describía **un** modo de fallo y pasa a **dos**. Ruidoso: «create a new project» o el 10000 de permisos, con el account id correcto en la URL que hace que el mensaje engañe. **Silencioso:** la cuenta activa es otra y el comando corre igual — lo único que hoy protege es que `sdmcapitalpage` no exista en las otras cuatro cuentas, que es una coincidencia de nombres y no un control de wrangler. Se documenta que `CLOUDFLARE_API_TOKEN` gana sobre la sesión OAuth y por eso el `unset` del comando de deploy no es opcional; que el email solo no basta y hay que comparar el account id; y que `wrangler login` no lo puede correr una sesión de Claude Code —abre el navegador—, así que ahí toca detenerse y pedirlo. Nota fechada con las dos ocurrencias, 2026-08-11 y 2026-09-09. Se añade además un párrafo que generaliza el eje: `supabase` y `wrangler` guardan sesión de MÁQUINA, no de repositorio, así que la verificación de cuenta va antes de cualquier operación que escriba. Se verifican de paso las tres filas del 2026-08-10, que estaban mal registradas | **Cerrada** — commiteada y **sin pushear**. No toca código ni base |
| 2026-09-09 | Admin — panel de solicitudes de crédito | **Módulo nuevo, sin precedente que copiar: `solicitudes_credito` existe desde junio y nunca se había leído desde la aplicación.** Nace `src/pages/admin/Solicitudes.tsx` con su ruta `/admin/solicitudes` y su entrada de menú. Dominio de la **sesión admin** (`src/pages/admin/`, `src/components/admin/`), más `src/App.tsx` para la ruta. Migración con el ciclo de gestión —`contactado_en`, `cerrado_en`, `resultado` con CHECK, e índice sobre `created_at DESC`—. **REGLA DEL MÓDULO: el panel escribe SOLO en esas tres columnas**; ningún campo que llenó el visitante se toca desde el admin, que es la separación que faltó en Captación. No toca `src/components/credito/`, `functions/`, `globals.css` ni `tailwind.config.js`. **ZONA COMPARTIDA: nace `src/lib/fechas.ts`** con `fechaHoraChile()` — archivo NUEVO, no modifica ninguno existente; `hoyEnChile()` de `indicadores.ts` da la fecha pero no la hora, y `fechaCorta()` vive dentro de Captación. **INVASIÓN ANUNCIADA de `src/App.tsx`** (ruta perezosa) y de `src/pages/AdminPage.tsx` (entrada de menú, icono `Banknote` porque `CreditCard` ya es el de Tarjetas). RLS sin tocar: no se añade ninguna política, las permisivas se combinan con OR y sumar una no restringiría nada | **Cerrada, pusheada y desplegada** — commit `02660b9`, desplegado el 2026-09-09 (`7829e898.sdmcapitalpage.pages.dev`). La migración `20260909214015` ya estaba aplicada y verificada: el CHECK `resultado_valido` responde 23514 con su nombre y la anon key sigue devolviendo `Content-Range: */0`. En producción, `sdmcapital.cl` sirve el chunk principal `index-BzNpR0zD.js` —diez muestras seguidas con conexión nueva, cero del anterior; la primera tanda pilló una muestra del viejo y hubo que esperar al borde antes de concluir— y `Solicitudes-Cxz5Z_Nh.js` responde 200 con `application/javascript`, **byte a byte idéntico al local** (sha256 `349b4ed1…`). La entrada de menú está en `AdminPage-CqCjPyKA.js`. El panel vive detrás de sesión, así que desde fuera se verifica que el chunk esté servido, no que la pantalla funcione: eso lo validó Víctor antes del deploy |
| 2026-09-09 | Edge Function — `notify-credito` para los cuatro productos | **ZONA SIN DUEÑO: `supabase/functions/` no figura en la división de dominios.** Un solo archivo: `supabase/functions/notify-credito/index.ts`. Hoy el correo tiene forma de hipotecario para los cuatro productos —asunto fijo con «crédito hipotecario» y una tabla que imprime siempre los mismos campos—, así que una solicitud de leaseback llega como un hipotecario vacío. Pasa a nombrar el producto en el asunto, imprimir solo los campos que aplican, omitir los null y enlazar a `/admin/solicitudes`, que ya existe. **NO se toca `verify_jwt` ni el destinatario.** Su deploy es INDEPENDIENTE del sitio: una Edge Function no viaja en el bundle, así que commitear no la cambia en producción | **Cerrada y desplegada** — `supabase functions deploy notify-credito` el **2026-09-09**: versión 2 → 3, `verify_jwt` sigue en `true` (se comprobó ANTES y DESPUÉS, porque `config.toml` no declara ninguna sección `[functions]` y un deploy podría haberlo volteado) y el bundle pasó de `8968c21a…` a `8cffa562…`. **SU DEPLOY ES INDEPENDIENTE DEL SITIO**: no viaja en el bundle de Cloudflare, así que ni el commit ni `wrangler pages deploy` la tocan — se despliega con la CLI de Supabase y punto. Probada con los cinco casos por HTTP contra la función ya desplegada (los cuatro productos más uno sin la clave `producto`): los cinco devolvieron 200 `{"ok":true}`. Esa ruta **no crea filas** —la función no importa ningún cliente de base, su único `fetch` sale a `api.resend.com`—, pero eso es una prueba de código, no un recuento: desde la CLI no hay forma de contar `solicitudes_credito`, porque solo está la anon key y el RLS devuelve `*/0`. El total se mira en la métrica «Solicitudes» de `/admin/solicitudes` |
| — | Sofía / chatbot | — | — |

> **`--sdm-header-total` es zona compartida, y de la clase que más duele.**
> El alto del header vive ahora en un solo sitio —`:root` de `globals.css`— y lo
> consumen `Layout.tsx` (el relleno de `<main>`), `HeroSection.tsx` (el alto del
> hero) y `ServiciosPage.tsx` (el anclaje de sus secciones). Cambiar el token es
> una línea, pero **mueve las 17 rutas públicas a la vez**.
>
> La regla práctica: si tocas la altura del `<header>` de `Header.tsx` —el `h-16`
> del `<nav>`, el `height` de `BarraIndicadores` o el `border-b`— **tienes que
> mover el token en el mismo commit**. Son el mismo hecho escrito en dos sitios,
> y esta sesión existe justamente porque la última vez que crecieron no se
> movieron juntos.
>
> El corte de la media query del token (768px) es el mismo que el `hidden md:flex`
> que enciende la barra. Si esa clase cambia de breakpoint, la media query de
> `globals.css` cambia con ella.

> **`src/lib/fechas.ts` es ZONA COMPARTIDA, y es un archivo NUEVO.**
> Lo estrena el panel de solicitudes el 2026-09-09. **No modifica nada
> existente**: `hoyEnChile()` sigue en `src/lib/indicadores.ts` y `fechaCorta()`
> sigue dentro de `Captacion.tsx`, ninguno de los dos se tocó. Queda anunciado
> igual porque `src/lib/` no es de nadie: lo que se agregue ahí lo hereda todo el
> repo.
>
> Contiene `fechaHoraChile(iso)` — día y hora en `America/Santiago`, con
> `hour12: false` explícito porque `es-CL` no es estable en eso entre motores.
>
> **Lo que el archivo NO es**: no hay ahí ningún ayudante para ESCRIBIR marcas de
> tiempo, y es deliberado. `new Date().toISOString()` en una columna
> `timestamptz` es CORRECTO —guarda un instante, no un día de calendario—. La
> trampa documentada es la contraria: derivar de un instante la FECHA en Chile, o
> truncar con `.slice(0, 10)`. Si alguna vez hace falta un helper de escritura,
> lo primero es releer ese párrafo del propio archivo.

### Sesión RLS — 2026-08-05

Diagnóstico inicial: **las 19 tablas de `public` eran legibles con la anon
key**, que viaja en el bundle del sitio. `propiedades` devolvía las 65 filas,
incluidas las 12 con `activo = false` y su `direccion`. El inventario de
`pg_policies` mostró además políticas PERMISSIVE sobre el rol `public` con
`FOR ALL / USING (true)`: como `public` incluye a `anon`, cualquiera podía
hacer DELETE o UPDATE sobre cuatro tablas.

Se aplicó la migración `20260805000300_rls_cerrar_escritura_anonima.sql` sobre
`propiedades`, `ficha_clientes`, `ficha_propiedades` y `sdm_agentes`.

#### Las políticas `Allow all` fueron ELIMINADAS. No recrearlas.

Se borraron `"Allow all"`, `"Allow all updates"`, `"Allow authenticated
updates"`, `propiedades_select` y `propiedades_write`.

El motivo de borrarlas en vez de sumar una política nueva encima: **las
políticas permisivas se combinan con OR**. Basta una que diga `USING (true)`
para que todas las demás dejen de restringir nada. De hecho `propiedades`
*ya tenía* una política de escritura correcta (`propiedades_write`), y estaba
completamente anulada por las permisivas que convivían con ella.

Si alguien recrea una `Allow all` desde el dashboard —es el default que ofrece
la UI al habilitar RLS— el agujero vuelve entero y en silencio: nada falla,
simplemente se vuelve a poder escribir sin autenticar.

#### Estado resultante

| Tabla | `anon` | `authenticated` |
|---|---|---|
| `propiedades` | SELECT solo `activo IS TRUE` | todo |
| `ficha_clientes` | SELECT | todo |
| `ficha_propiedades` | SELECT | todo |
| `sdm_agentes` | SELECT | todo |

La lectura anónima se conserva en las tres últimas porque el cliente abre su
ficha sin login.

#### Cómo verificar que sigue cerrado

Un `DELETE` con un filtro que no coincide con nada **no sirve** como prueba:
RLS no lanza error, filtra filas. Borrar 0 filas devuelve 204 tanto si la
escritura está permitida como si está bloqueada.

La prueba que sí discrimina es un `PATCH` sobre una fila **visible**, poniendo
una columna a su valor actual, con `Prefer: return=representation`: si
devuelve `[]` la escritura está bloqueada; si devuelve la fila, pasó. Al poner
el mismo valor, no cambia nada en ninguno de los dos casos.

#### Pendiente

Quedan sin revisar las otras 15 tablas de `public`. `cotizaciones` y
`contacto_mensajes` daban 0 filas en el diagnóstico, pero eso no distingue
"vacía" de "RLS la oculta": hay que confirmarlo antes de darlas por seguras.

### Sesión RLS `envios_plantilla` — 2026-08-05

Migración `20260805000400_rls_envios_plantilla.sql`, aplicada.

`envios_plantilla` era la única tabla de `public` con `relrowsecurity = false`.
Sin políticas y con grants de `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` para
`anon`: con la anon key del bundle se podía leer, llenar de basura o vaciar.

Ahora tiene RLS activo y una sola política, `FOR ALL TO authenticated`. **No se
le agregó política a `anon` a propósito**: es una tabla interna y el Worker de
Sofía accede con `service_role`, que no pasa por RLS.

#### Las tablas internas de Sofía están en deny-all a propósito

| Tabla | RLS | Políticas |
|---|---|---|
| `decisiones_shadow` | activo | ninguna |
| `eventos_procesados` | activo | ninguna |
| `eventos_turno` | activo | ninguna |
| `mensajes_pendientes` | activo | ninguna |
| `migracion_r2` | activo | ninguna |
| `envios_plantilla` | activo | solo `authenticated` |

RLS activo con cero políticas significa **deny-all** para `anon` y para
`authenticated`. No es un descuido: Sofía lleva meses escribiendo en ellas
porque el Worker usa `service_role`, que salta RLS por completo.

**Consecuencia:** un panel del admin que lea esas tablas se va a ver vacío, y
eso es lo esperado. Si alguien "arregla" ese panel vacío agregando un
`Allow all` desde el dashboard, reabre exactamente el agujero que se acaba de
cerrar. La solución correcta para un panel así es leer por el Worker o por una
función con `service_role`, nunca abrirle la tabla a `anon`.

#### Verificación que quedó pendiente

`envios_plantilla` **ya estaba vacía antes** de aplicar la migración (0 filas
con RLS apagado). Por eso:

- El test de conteo no prueba nada: daba 0 antes y da 0 después.
- El test de `PATCH` idempotente era inaplicable: no hay ninguna fila que
  tocar.

Lo que sí se verificó es un `INSERT` anónimo, que ahora devuelve
`42501 · new row violates row-level security policy` con HTTP 401, sin crear
fila. Eso confirma que RLS bloquea.

Lo que **no** se pudo verificar: que Sofía siga registrando envíos. La tabla
estaba vacía antes, así que no hay línea base, y ahora `anon` ya no puede
leerla. Hay que comprobarlo desde el SQL Editor del dashboard:

```sql
select count(*), max(created_at) from public.envios_plantilla;
```

Si tras un envío real de plantilla ese conteo sigue en 0, el Worker está
usando la anon key y no `service_role`. En ese caso **no** agregar una política
para `anon`: hay que arreglar el Worker.

### Fase 3 — partir `AdminPage.tsx`. Etapa 1 de N — 2026-08-05

La Fase 3 que quedó planificada y sin iniciar el 2026-08-02 arrancó por acá.
`AdminPage.tsx` tenía 2.808 líneas y 29 componentes de nivel superior.

Hecho en esta etapa:

- `Sec` y `Full` viven ahora en **`src/components/admin/primitivas.tsx`**.
- La pestaña Mensajes vive en **`src/pages/admin/Mensajes.tsx`**. Se eligió
  como piloto por ser la más autocontenida: una tabla, sin props, sin helpers
  compartidos y sin estado de `AdminPage`.
- `AdminPage.tsx` quedó en 2.751 líneas.

#### Regla: todo componente extraído va a nivel de módulo

Ningún componente puede quedar definido dentro de otro, ni dentro de un
render, ni como arrow function creada en el cuerpo de un componente. Si al
partir un archivo queda uno anidado, hay que sacarlo al nivel superior.

No es estilo. `Sec` y `Full` estuvieron definidos dentro de `ContenidoAdmin`,
`BarrancoAdmin`, `RentalAdmin` y `VendeAdmin` —cuatro copias idénticas— y al
recrearse en cada render React los trataba como tipos de componente distintos:
desmontaba el árbol entero, la página perdía altura, el navegador llevaba el
scroll a 0 y no volvía. Tocar cualquier switch saltaba al inicio. La regla
está escrita también dentro de `primitivas.tsx`.

#### Las claves de pestaña NO se renombran

El orden de las pestañas se persiste en `localStorage` como un array de claves
(`STORAGE_KEY` en `AdminPage.tsx`). Renombrar una clave le borra la
configuración a Víctor. El componente pasó de `MensajesAdmin` a `Mensajes`,
pero la clave sigue siendo `'mensajes'`.

#### Chunks: sin movimiento

Verificado antes y después. `pdf` (2 MB) sigue fuera de la carga inicial del
admin, y `react` y `editor` conservaron el mismo hash.

| Chunk | Antes | Después |
|---|---|---|
| `AdminPage` | 169,57 kB | 169,57 kB |
| `pdf` | 2.054,86 kB | 2.054,86 kB |
| `react` | 147,89 kB | 147,89 kB |
| `index` | 238,90 kB | 238,90 kB |

**Es un refactor puro: mover código, no mejorarlo.** Las mejoras detectadas se
anotan y se hacen en una etapa aparte.

### Fase 3 — Etapa 2: helpers compartidos — 2026-08-05

`src/components/admin/` quedó así:

| Archivo | Qué contiene |
|---|---|
| `campos.tsx` | `Field`, `Inp`, `Txa`, `Chk`, `Sel` |
| `layout.tsx` | `Sec`, `Full` |
| `acciones.tsx` | `SaveBtn`, `Badge` |
| `ImageUploader.tsx` | `ImageUploader` |

`AdminPage.tsx`: 2.751 → 2.653 líneas.

#### `primitivas.tsx` fue eliminado

Se creó en la Etapa 1 con `Sec` y `Full`. Su contenido pasó a `layout.tsx` sin
cambios. El nombre no decía nada: "primitivas" habría terminado siendo el
cajón donde cae todo lo que no tiene otro lugar, que es exactamente el
problema que este refactor viene a resolver en `AdminPage.tsx`.

#### Por qué separado por tipo y no un archivo único

Un `helpers.tsx` con los diez componentes vuelve a crear un archivo que hay
que abrir para cualquier cosa, y del que todos los paneles importan aunque
usen una fracción. Separado por tipo, el import declara qué necesita cada
panel: `MensajesAdmin` no importa nada, `PaginasLegalesAdmin` solo
`acciones`, y los cuatro que usan la grilla solo `layout`.

También deja lugar obvio para lo que viene: cuando se extraigan los paneles
grandes, cada helper nuevo tiene un archivo donde entrar en vez de engordar
uno solo.

`ImageUploader` va en su propio archivo, con nombre en PascalCase, porque es
un componente con estado y con dependencias de `src/lib/` —`subirImagen` y
`thumbUrl`—, no un helper de presentación de tres líneas.

#### Qué NO se extrajo, a propósito

- `TBtn` — solo lo usa `RichTextEditor`, viaja con él.
- `DossierUploader`, `PropImageManager`, `CarouselPhotoManager`,
  `HomeDestacadasSelector` — van con sus paneles.

#### Chunks: sin movimiento

| Chunk | Etapa 1 | Etapa 2 |
|---|---|---|
| `AdminPage` | 169,57 kB | 169,57 kB |
| `pdf` | 2.054,86 kB | 2.054,86 kB |
| `react` | `react-DLA1cIuT.js` | mismo hash |
| `editor` | `editor-CRXeSJ56.js` | mismo hash |
| `index` | 238,90 kB | 238,90 kB |

### Fase 3 — Etapa 3: cuatro paneles mecánicos — 2026-08-05

| Antes | Ahora |
|---|---|
| `BlogAdmin` | `src/pages/admin/Blog.tsx` |
| `EquipoAdmin` | `src/pages/admin/Equipo.tsx` |
| `AsociadosAdmin` | `src/pages/admin/Asociados.tsx` |
| `PaginasLegalesAdmin` | `src/pages/admin/PaginasLegales.tsx` |

`AdminPage.tsx`: 2.656 → 2.286 líneas. Acumulado de la Fase 3: **2.808 → 2.286,
−522 líneas** en tres etapas.

`LEGAL_PAGES` se movió con `PaginasLegales`: es una constante local de
`AdminPage.tsx`, no de `src/types/`, y solo la usaba ese panel.

#### Dos símbolos que siguen viviendo en `AdminPage.tsx`

`RichTextEditor` y `useDragSort` quedaron exportados desde `AdminPage.tsx` y
los paneles extraídos los importan desde ahí:

- `RichTextEditor` — lo usan `Blog` y `PaginasLegales`. Se extrae junto con
  `TBtn` en una etapa posterior.
- `useDragSort` — lo usan `Equipo`, `Asociados` y `PropiedadesAdmin`.

**Esto creó un import circular**: `AdminPage` importaba los paneles y los
paneles importaban de `AdminPage`. Funcionaba porque ambos son declaraciones
`function`, que se hoistean, y porque nadie los invocaba en tiempo de
evaluación del módulo, solo en render.

> **Deuda RESUELTA en la Etapa 4.** Ambos símbolos se movieron a
> `src/components/admin/` y no queda ningún import desde `src/pages/admin/`
> hacia `AdminPage.tsx`.

#### Los paneles NO se convirtieron en chunks aparte

Se importan de forma estática, así que siguen dentro del chunk `AdminPage`.
Es deliberado: un `lazy()` cambiaría el comportamiento de carga y esto es un
refactor puro.

#### Chunks

| Chunk | Etapa 2 | Etapa 3 |
|---|---|---|
| `AdminPage` | 169,57 kB | 169,60 kB |
| `pdf` | 2.054,86 kB | 2.054,86 kB |
| `react` | `react-DLA1cIuT.js` | mismo hash |
| `editor` | `editor-CRXeSJ56.js` | mismo hash |
| `index` | 238,90 kB | 238,90 kB |

Los 0,03 kB de más en `AdminPage` son los `export` y los `import` nuevos.

### Fase 3 — Etapa 4: ciclo de imports roto — 2026-08-05

| Símbolo | Ahora vive en |
|---|---|
| `RichTextEditor` + `TBtn` | `src/components/admin/RichTextEditor.tsx` |
| `useDragSort` | `src/components/admin/useDragSort.ts` |

`AdminPage.tsx`: 2.286 → 2.123 líneas. Acumulado de la Fase 3: **2.808 →
2.123, −685 líneas (−24,4%)** en cuatro etapas.

#### El ciclo desapareció

**No queda ningún import desde `src/pages/admin/` hacia `AdminPage.tsx`.**
`AdminPage.tsx` ya no exporta `RichTextEditor` ni `useDragSort`; el flujo de
dependencias va en una sola dirección:

```
src/components/admin/  ←  src/pages/admin/  ←  AdminPage.tsx
```

`TBtn` no se exporta desde `RichTextEditor.tsx`: solo lo usa ese archivo, así
que viaja con el editor y no forma parte de su API.

#### `useDragSort` va en `src/components/admin/`, no en `src/hooks/`

Es un hook, pero `src/hooks/` es zona compartida entre sesiones y esto es
exclusivo del admin. Ponerlo ahí obligaría a coordinar con las otras sesiones
cada vez que se toque.

#### Chunks — atención al de TipTap

El riesgo de esta etapa era que mover `RichTextEditor` de archivo alterara
cómo Vite agrupa TipTap. **No pasó: `editor` conservó el hash exacto.**

| Chunk | Etapa 3 | Etapa 4 |
|---|---|---|
| `AdminPage` | 169,60 kB | 169,57 kB |
| `pdf` | 2.054,86 kB | 2.054,86 kB |
| `editor` | `editor-CRXeSJ56.js` | **mismo hash**, 388,10 kB |
| `react` | `react-DLA1cIuT.js` | mismo hash |
| `index` | 238,90 kB | 238,90 kB |

`AdminPage` bajó 0,03 kB y volvió al tamaño de la Etapa 2: son los `export` y
los imports cruzados que dejaron de existir.

#### Pendiente para las próximas etapas

Quedan 15 componentes en `AdminPage.tsx`. Los grandes: `PropiedadesAdmin`
(426 líneas), `BarrancoAdmin` (403), `ContenidoAdmin` (321),
`PropImageManager` (145), `RentalAdmin` (143), `VendeAdmin` (120).

### Fase 3 — Etapa 5: Rental, Vende y Barranco — 2026-08-06

| Antes | Ahora | Líneas del archivo nuevo |
|---|---|---:|
| `RentalAdmin` | `src/pages/admin/Rental.tsx` | 156 |
| `VendeAdmin` | `src/pages/admin/Vende.tsx` | 103 |
| `BarrancoAdmin` | `src/pages/admin/Barranco.tsx` | 410 |

`AdminPage.tsx`: 2.123 → 1.496 líneas. Acumulado de la Fase 3: **2.808 →
1.496, −1.312 líneas (−46,7%)** en cinco etapas.

El diff de `AdminPage.tsx` son 633 borrados y **6 líneas agregadas**: los tres
`import` y los tres `tab === … && <Panel />`. Nada más cambió — los cuerpos de
las tres funciones se movieron byte a byte, verificados con `diff` contra el
extracto original.

#### Eran los tres paneles del bug de remontaje

`Sec` y `Full` estuvieron definidos **dentro** de estos tres (más
`ContenidoAdmin`), y esa es la causa documentada del salto de scroll. Ya vivían
a nivel de módulo en `src/components/admin/layout.tsx` desde la Etapa 2, y así
siguen: los tres archivos nuevos no definen ningún componente anidado.
Verificado: la única declaración a nivel de módulo de cada archivo es su
`export default function`.

#### Las claves de pestaña no se tocaron

`'rental'`, `'vende'` y `'barranco'` siguen igual. Solo cambió el nombre del
componente.

#### El ciclo sigue roto

**No queda ningún import desde `src/pages/admin/` hacia `AdminPage.tsx`.** Las
menciones a `AdminPage` que quedan en ese directorio son todas comentarios de
cabecera. Ninguno de los tres paneles necesitó estado ni handlers de
`AdminPage`: los tres son autocontenidos contra Supabase.

#### Chunks: sin movimiento

| Chunk | Etapa 4 | Etapa 5 |
|---|---|---|
| `AdminPage` | 169,57 kB | 169,57 kB |
| `pdf` | 2.054,86 kB | 2.054,86 kB |
| `editor` | `editor-CRXeSJ56.js` | mismo hash |
| `react` | `react-DLA1cIuT.js` | mismo hash |
| `index` | 238,90 kB | 238,90 kB |

`pdf` sigue **fuera** de la carga inicial del admin. Los imports estáticos del
chunk `AdminPage` son `react`, `router`, `index`, `errores`, `subirImagen`,
`editor` e `iconos`; `pdf` solo aparece dentro del array `__vite__mapDeps`, que
es la tabla de precarga de un `import()` dinámico.

#### Anotado y NO tocado

Los tres archivos conservan el comentario `// Sec y Full: definidos a nivel de
módulo, junto a ContenidoAdmin.`, que quedó desactualizado: `Sec` y `Full`
viven en `src/components/admin/layout.tsx` desde la Etapa 2, no junto a
`ContenidoAdmin`. Es un comentario, no comportamiento, y esta etapa es un
refactor puro. Corregirlo va en la etapa de limpieza.

#### Pendiente

Quedan 12 declaraciones de nivel superior en `AdminPage.tsx`. Las grandes:
`PropiedadesAdmin` (443 líneas), `ContenidoAdmin` (321), `PropImageManager`
(145), `CarouselPhotoManager` (107) y `HomeDestacadasSelector` (96).
`FotosAdmin`, `DossierUploader` y `slugify` son las que faltan además del
propio `AdminPage`.

### Fase 3 — Etapa 6: Contenido — 2026-08-06

| Antes | Ahora |
|---|---|
| `ContenidoAdmin` | `src/pages/admin/Contenido.tsx` |
| `CarouselPhotoManager` | idem — mismo archivo |
| `HomeDestacadasSelector` | idem — mismo archivo |

`src/pages/admin/Contenido.tsx`: 569 líneas.
`AdminPage.tsx`: 1.496 → **953** líneas. Acumulado de la Fase 3: **2.808 → 953,
−1.855 líneas (−66,1%)** en seis etapas.

El diff de `AdminPage.tsx` son 546 borrados y **3 líneas agregadas**.

#### Los tres van juntos porque `Contenido` es su único consumidor

Verificado con `grep` sobre `src/` y `functions/`: `CarouselPhotoManager` y
`HomeDestacadasSelector` no se usan en ningún otro lado. Por eso van a
`src/pages/admin/` y no a `src/components/admin/`, que es para lo compartido.

Los tres quedan **a nivel de módulo**; solo `Contenido` lleva `export default`.
Cero componentes anidados en el archivo.

Se movieron con ellos `HERO_KEYS`, `HERO_POS_KEYS` y `POSITION_OPTIONS`: son
constantes locales que solo usa `CarouselPhotoManager`.

#### Verificación byte a byte

`diff` del bloque completo (539 líneas: las tres constantes más los tres
componentes) contra el original en `HEAD`. **Una sola línea distinta**, que es
justamente el renombre pedido:

```
< function ContenidoAdmin() {
> export default function Contenido() {
```

`CarouselPhotoManager` y `HomeDestacadasSelector` quedaron idénticos hasta el
byte, y el cuerpo de `ContenidoAdmin` también salvo su firma.

#### Las claves de `contenido_sitio` no se tocaron

Ninguna clave cambió. Las del banner promocional —`banner_activo`,
`banner_titulo`, `banner_subtitulo`, `banner_cta_texto`, `banner_cta_url`— no
tienen migración: las crea este panel con el primer guardado. Renombrar
cualquiera de ellas rompería el banner en silencio, porque `BannerPromo` caería
a sus valores por defecto sin que nada fallara. La clave de pestaña sigue
siendo `'contenido'`.

#### Cinco imports quedaron huérfanos y `tsc` no los delató

`noUnusedLocals` está apagado en `tsconfig.json`, así que el build pasaba en
verde con ellos. Revisados a mano y eliminados de `AdminPage.tsx`:
`invalidateContenidoCache`, `Sec`, `Full`, `Txa` e `ImageUploader`.

El chunk `AdminPage` conservó **exactamente el mismo hash** antes y después de
quitarlos: Rollup ya los eliminaba por tree-shaking. Es limpieza de fuente, sin
efecto en el bundle.

#### Chunks

| Chunk | Etapa 5 | Etapa 6 |
|---|---|---|
| `AdminPage` | 169,57 kB | 169,56 kB |
| `pdf` | 2.054,86 kB | 2.054,86 kB |
| `editor` | `editor-CRXeSJ56.js` | **mismo hash** |
| `react` | `react-DLA1cIuT.js` | **mismo hash** |
| `index` | 238,90 kB | 238,90 kB |

`pdf` sigue fuera de la carga inicial del admin. Los imports estáticos del
chunk `AdminPage` son `react`, `router`, `index`, `errores`, `subirImagen`,
`editor` e `iconos`.

##### Por qué cambiaron hashes con el tamaño intacto

`pdf`, `index`, `subirImagen` y varios chunks de rutas cambiaron de hash sin
cambiar de tamaño. Se verificó descargando de producción los archivos de la
Etapa 5 y comparándolos: **el contenido es idéntico salvo los nombres de chunk
embebidos**. `pdf` difería en 32 bytes, `index` en 152, `subirImagen` en 8 —
todos dentro de rutas `nombre-<hash>.js`.

El cascade arranca donde tenía que arrancar: `AdminPage.tsx` cambió, así que su
chunk cambió de hash; `index` embebe `AdminPage-<hash>.js` en su mapa de rutas
lazy, así que cambió también; y todo lo que importa `index` fue detrás.

Conviene tenerlo presente al revisar etapas futuras: **comparar solo hashes da
falsos positivos.** Lo que discrimina es normalizar los `-<hash>.js` y comparar
el contenido.

#### Pendiente

Quedan 8 declaraciones de nivel superior en `AdminPage.tsx`, y las grandes son
ya solo dos: `PropiedadesAdmin` (426 líneas) y `PropImageManager` (145).
Además `FotosAdmin` (68), `DossierUploader` (62), `LoginForm`, `useAdminAuth`,
`slugify` y `loadTabOrder`, más las constantes de la sidebar y el propio
`AdminPage`.

### Fase 3 — Etapa 7: Propiedades. **Refactor cerrado** — 2026-08-06

| Antes | Ahora |
|---|---|
| `PropiedadesAdmin` | `src/pages/admin/Propiedades.tsx` |
| `PropImageManager` | idem — mismo archivo |
| `DossierUploader` | idem — mismo archivo |
| `slugify` | idem — mismo archivo |

`src/pages/admin/Propiedades.tsx`: 713 líneas.
`AdminPage.tsx`: 953 → **264** líneas. El diff son 692 borrados y 3 líneas
agregadas.

Se movieron con el panel `FECHA_ENTREGA_OPTIONS`, `AVANCE_OBRA_OPTIONS` y
`SUBSIDIO_OPTIONS`, identificadas como propias de este panel desde la Etapa 2.

#### `slugify` se movió aunque no estaba en la lista

Solo lo usa `PropiedadesAdmin` (una llamada, al construir el slug de la
propiedad). Dejarlo en `AdminPage.tsx` habría dejado una función muerta, así
que viajó con el panel. Verificado con `grep` sobre `src/`, `functions/` y
`scripts/`: `PropImageManager`, `DossierUploader` y `slugify` no se usan en
ningún otro lado.

#### Se borró el encabezado `// ─── SHARED UI ───`

Encabezaba las primitivas compartidas que salieron en la Etapa 2 y desde
entonces encabezaba las constantes de proyectos nuevos. Al irse esas
constantes quedaba colgado justo antes de `// ─── FOTOS ───`, sin nada debajo.

#### Verificación byte a byte

`diff` del bloque de 678 líneas contra el original en `HEAD`. **Una sola línea
distinta**, el renombre pedido:

```
< function PropiedadesAdmin() {
> export default function Propiedades() {
```

`PropImageManager`, `DossierUploader`, `slugify` y las tres constantes
quedaron idénticos hasta el byte.

#### RLS y subidas: no se tocó nada

Ninguna query cambió, ni la semántica de `activo`. La tabla `propiedades`
sigue con `anon` restringido a `activo IS TRUE` y `FOR ALL` solo para
`authenticated`; el admin entra autenticado. Las subidas siguen pasando por
`src/lib/subirImagen.ts` sin modificar. Ese pipeline apunta a `/api/subir`, una
Pages Function, y `vite.config.ts` no proxea `/api`: **las subidas no funcionan
en localhost**, se prueban en producción. Queda anotado en la cabecera del
archivo nuevo.

#### 18 imports huérfanos

Con `noUnusedLocals` apagado, `tsc` pasaba en verde con los 18. Revisados a
mano y eliminados de `AdminPage.tsx`: `REGIONES`, `getComunas`, `avisarError`,
`subirArchivo`, `normalizeDossiers`, `dossierFileName`, `thumbUrl`,
`Propiedad`, `DossierItem`, `MapPicker`, `Field`, `Inp`, `Chk`, `Sel`,
`SaveBtn`, `Badge`, `RichTextEditor` y `useDragSort`.

`AdminPage.tsx` quedó con solo dos imports de librería —`supabase` y
`subirImagen`, ambos para `FotosAdmin`— más React, el router, los iconos y los
once paneles.

#### Chunks

| Chunk | Etapa 6 | Etapa 7 |
|---|---|---|
| `AdminPage` | 169,56 kB | 169,56 kB |
| `pdf` | 2.054,86 kB | 2.054,86 kB |
| `editor` | `editor-CRXeSJ56.js` | **mismo hash** |
| `react` | `react-DLA1cIuT.js` | **mismo hash** |
| `index` | 238,90 kB | 238,90 kB |

`pdf` sigue fuera de los imports estáticos del chunk `AdminPage`, que son los
mismos siete de la Etapa 6: `react`, `router`, `index`, `errores`,
`subirImagen`, `editor` e `iconos`.

Comparando contenido normalizado contra los archivos de la Etapa 6 servidos en
producción: `pdf` y `subirImagen` **idénticos**. `index` difiere en 37
caracteres de 238.765, y son todos el mismo hecho: `errores` y `subirImagen`
intercambiaron posición en la tabla `__vite__mapDeps`, así que cada referencia
a esos índices se dio vuelta (3↔4). Se verificó que es una **permutación pura**:
las 9 rutas lazy precargan exactamente el mismo conjunto de chunks antes y
después. `AdminPage` sí cambió de verdad, con el mismo tamaño exacto — es el
renombrado de identificadores minificados al mover 678 líneas a un módulo
nuevo.

---

### Fase 3 — Iconos: emojis reemplazados por `lucide-react` — 2026-08-06

Los emojis se renderizaban distinto en cada sistema operativo, no heredaban
`currentColor` y no escalaban con la tipografía. `lucide-react` ya estaba
instalado y en uso en el sitio público. Los iconos se importan **por nombre**,
nunca el paquete completo.

Se hizo en **dos commits** para que, si algo se ve raro, se sepa en cuál está:

| Commit | Alcance |
|---|---|
| `a4884a6` | sidebar de pestañas (13) + encabezados de panel (48) |
| `81a8940` | controles, estados (≈30) + barra del editor (11) |

#### Tabla de equivalencias

**Sidebar** — `size={16} strokeWidth={1.75}`. Las claves de pestaña **no
cambiaron**; solo el icono.

| Clave | Antes | Ahora |
|---|---|---|
| `propiedades` | 🏠 | `Building2` |
| `cotizaciones` | 📋 | `ClipboardList` |
| `blog` | 📝 | `FileText` |
| `equipo` | 👥 | `Users` |
| `asociados` | 🤝 | `HeartHandshake` |
| `mensajes` | 💬 | `MessageCircle` |
| `contenido` | ✏️ | `PenLine` |
| `fotos` | 🖼 | `Image` |
| `barranco` | 🏨 | `Building2` |
| `tarjetas` | 💳 | `CreditCard` |
| `legal` | 🔒 | `Lock` |
| `rental` | 🏘 | `KeyRound` |
| `vende` | 🏷 | `Tag` |

**Encabezados de panel** — `size={18} strokeWidth={1.75}`.

🎬 `Clapperboard` · 🖼 `Image` · 🌊 `Waves` · 🏄 `Wind` · 🏨 `Building2` ·
🛏 `Bed` · 💡 `Lightbulb` · 📊 `BarChart3` · 📖 `BookOpen` · 📋 `ClipboardList` ·
💰 `Wallet` · 📝 `FileText` · 👁/🚫 `Eye`/`EyeOff` · 🗂 `FolderTree` ·
🏠 `Home` · 🌎 `Globe` · 💬 `MessageCircle` · 👥 `Users` · 💼 `Briefcase` ·
🤝 `HeartHandshake` · 🏢 `Building` · 📱 `Smartphone` · 🔑 `KeyRound` ·
⚖️ `Scale` · 🏛 `Landmark` · 🔁 `RefreshCw`

**Controles, estados y editor** — `size={14} strokeWidth={2}`.

✓ `Check` · ✕ `X` · ★ `Star` · ⠿ `GripVertical` · 🖱 `MousePointer2` ·
⏸ `Pause` · ↑↓↕ `ArrowUp`/`ArrowDown`/`ArrowUpDown` · 📄 `File` ·
📎 `Paperclip` · 📷 `Camera` · 🏢 `Building2` · ↗ `ExternalLink` ·
📍 `MapPin` · 🎥 `Youtube` · ⬅☰➡ `AlignLeft`/`AlignCenter`/`AlignRight` ·
• `List` · ❝ `Quote` · — `Minus` · 🔗 `Link` · 🔗̸ `Link2Off` · ↩↪ `Undo2`/`Redo2`

#### Cuatro cambios de tipo

| Símbolo | Antes | Ahora |
|---|---|---|
| `Sec.title` | `string` | `React.ReactNode` |
| `Field.label` | `string` | `React.ReactNode` |
| `Chk.label` | `string` | `React.ReactNode` |
| `DEFAULT_TABS.icon` | `string` | `LucideIcon` |

**Las claves de pestaña no se tocaron.** `localStorage` guarda solo `t.key`
(`AdminPage.tsx`, en el `setItem` del reordenado), nunca el icono, así que el
orden configurado sobrevive.

#### Excepciones — qué quedó sin tocar y por qué

| Qué | Dónde | Motivo |
|---|---|---|
| 🇬🇧 🇨🇱 | etiquetas EN/ES de `Barranco` | lucide **no tiene iconos de país**. Reemplazarlas pierde la información |
| 🌐 / 🇨🇱 | columna internacional de `Propiedades` | idem |
| 🇪🇸 🇺🇾 | destinos en `Contenido` | idem |
| `'6 → 12'` | `Barranco` — `brief_meses` y su placeholder | **es dato**, no icono: se escribe en `showcase_barranco` |
| `••••••••` | máscara de contraseña en `AdminPage` | es texto de placeholder |
| `→` `←` | texto de enlaces ("Ingresar →", "← Ir al admin") | convención tipográfica; reemplazarlos obligaría a tocar el layout de nueve enlaces |
| 🎤 ✋ 🤖 | `Captacion.tsx` | SINCRONIA.md lo asigna a la **sesión Sofía** |

Dos emojis se quitaron **sin reemplazo**, dejando solo el texto:

- **Ciudades en `Contenido`** (🏙 Miami, 🏖 Punta Cana, 🎡 Orlando, 🗽 Nueva
  York): no hay icono para la Estatua de la Libertad, y usar uno genérico para
  las cuatro borraba justamente la distinción que aportaban.
- **Opciones del `Sel` de `activo` en `Propiedades`** (✅ Activa / ⏸ Inactiva):
  `Sel` renderiza `<option>{label}</option>`, y **un `<option>` de HTML solo
  admite texto, no SVG**. No es una preferencia, es una restricción del
  elemento. El texto ya dice "visible en el sitio" / "oculta del sitio".

#### Detalles de implementación que conviene recordar

**Iconos dentro de prosa van `inline`, no `flex`.** Para las leyendas de
arrastre y el pie de la galería se usa
`style={{ display: 'inline', verticalAlign: '-0.2em' }}`. Meterlos en un
contenedor flex convierte cada nodo de texto en un ítem y se pierde el
espaciado entre palabras.

**El color semántico se hereda solo.** En los pares activa/pausada y
visible/oculto el color vive en el contenedor (`#16a34a` / `#dc2626`), así que
los iconos quedan del color correcto con `currentColor`, sin fijárselo.

**`RichTextEditor` ya importaba `Image` y `Link` de TipTap.** Los de lucide
entran como `ImageIcon` y `LinkIcon`. Sin el alias el build falla con
`TS2300: Duplicate identifier 'Image'`.

**El único cambio de layout es el mínimo para alinear.** `flex items-center
gap-2` en el `h3` de `Sec` y el `h2` de Barranco; `display: flex` en el
`label` de `Field` y en los sub-encabezados de `Propiedades`. Ninguno tenía
más de un hijo antes, así que el `gap` no alteró nada existente.

#### Chunks — cuánto costaron los iconos

| Chunk | Etapa 7 | Iconos | Delta |
|---|---:|---:|---:|
| `AdminPage` | 169,56 kB | 176,10 kB | **+6,54 kB** |
| `iconos` | 11,81 kB | 30,67 kB | **+18,86 kB** |
| `pdf` | 2.054,86 kB | 2.054,86 kB | — |
| `index` | 238,90 kB | 238,90 kB | — |
| `editor` | `editor-CRXeSJ56.js` | mismo hash | — |
| `react` | `react-DLA1cIuT.js` | mismo hash | — |

**Costo real: +25,40 kB sin comprimir, +3,98 kB en gzip** (`AdminPage` +0,57,
`iconos` +3,41). `iconos` ya era un import estático del chunk `AdminPage`
antes de esta etapa, así que ese es el aumento de la carga inicial del admin.

`pdf` sigue fuera de los imports estáticos del chunk `AdminPage`, que son los
mismos siete: `react`, `router`, `index`, `errores`, `subirImagen`, `editor` e
`iconos`.

Con el método normalizado, `pdf` e `index` quedaron **byte a byte idénticos**
a la Etapa 7 — esta vez ni siquiera se permutó la tabla `__vite__mapDeps`.

---

## Fase 3 cerrada — `AdminPage.tsx`, de 2.808 a 194 líneas

**−2.614 líneas, −93,1%.** Siete etapas de refactor puro, sin un solo cambio
de comportamiento, más la etapa de iconos y la de limpieza.

| Etapa | Qué salió | `AdminPage.tsx` |
|---|---|---:|
| — | punto de partida | 2.808 |
| 1 | `Sec`/`Full` a `primitivas.tsx`, piloto `Mensajes` | 2.751 |
| 2 | helpers a `campos` / `layout` / `acciones` / `ImageUploader` | 2.653 |
| 3 | `Blog`, `Equipo`, `Asociados`, `PaginasLegales` | 2.286 |
| 4 | `RichTextEditor` + `TBtn`, `useDragSort` — ciclo roto | 2.123 |
| 5 | `Rental`, `Vende`, `Barranco` | 1.496 |
| 6 | `Contenido` + `CarouselPhotoManager` + `HomeDestacadasSelector` | 953 |
| 7 | `Propiedades` + `PropImageManager` + `DossierUploader` | 264 |
| limpieza | `FotosAdmin` — panel legado, borrado | **194** |

### Qué quedó en `AdminPage.tsx`

Siete declaraciones, todas de armazón: el tipo `Tab`, `useAdminAuth`,
`LoginForm`, `DEFAULT_TABS`, `STORAGE_KEY`, `loadTabOrder` y el propio
`AdminPage`. Es lo que tiene que ser: autenticación, sidebar y enrutado de
pestañas.

`FotosAdmin` (68 líneas) sigue ahí **a propósito**. Es el panel legado que
mezcla Supabase Storage con R2 y está marcado para borrarse, no para
refactorizarse. Extraerlo sería trabajo tirado.

> **Ya no está.** Se eliminó en la etapa de limpieza del 2026-08-06.
> `AdminPage.tsx` quedó en 194 líneas.

### Las reglas que sobrevivieron a las siete etapas

1. **Todo componente a nivel de módulo.** `Sec` y `Full` definidos dentro de
   `ContenidoAdmin`, `BarrancoAdmin`, `RentalAdmin` y `VendeAdmin` fueron la
   causa del bug de remontaje: React los trataba como tipos distintos en cada
   render, desmontaba el árbol y el scroll saltaba al inicio.
2. **Las dependencias van en una sola dirección:**
   `src/components/admin/` ← `src/pages/admin/` ← `AdminPage.tsx`. Ningún
   archivo de `src/pages/admin/` importa de `AdminPage.tsx`. El ciclo que
   introdujo la Etapa 3 se cerró en la Etapa 4 y no volvió.
3. **Las claves de pestaña no se renombran.** Se persisten en `localStorage`
   como array (`STORAGE_KEY`); renombrar una borra el orden configurado. Los
   componentes cambiaron de nombre, las claves no.
4. **Refactor puro, verificado con `diff`.** De la Etapa 5 en adelante, cada
   cuerpo extraído se comparó byte a byte contra el original. La única línea
   distinta admitida es la de la firma.
5. **`noUnusedLocals` está apagado.** `tsc` no delata imports huérfanos; hay
   que revisarlos a mano después de cada extracción. Las etapas 6 y 7 dejaron
   5 y 18.
6. **Los hashes de chunk no sirven para comparar.** Un cambio en un chunk
   cascadea a todo lo que lo referencia. Hay que normalizar los `-<hash>.js` y
   comparar contenido.

### Lo anotado y no tocado

`Barranco.tsx`, `Rental.tsx` y `Vende.tsx` conservan el comentario
`// Sec y Full: definidos a nivel de módulo, junto a ContenidoAdmin.`, que
quedó desactualizado en la Etapa 2 —viven en `src/components/admin/layout.tsx`—
y más aún ahora que `ContenidoAdmin` es `Contenido` y está en otro archivo. Son
comentarios, no comportamiento. Corregirlos es trabajo de una etapa de
limpieza, junto con borrar `FotosAdmin`.

> **Deuda saldada** en la etapa de limpieza del 2026-08-06. No quedan
> referencias a nombres `*Admin` en `src/`.

### Fase 3 — Escala tipográfica, fase 1: los tokens — 2026-08-06

Solo definiciones. **No migra ni un literal**, y no toca ningún archivo de
`src/pages/` ni `src/components/`. El deploy va con la primera tanda de
migración.

Zona compartida: `src/styles/globals.css` y `tailwind.config.js`.

#### Los 13 tokens — nombres definitivos

**Una sola regla, sin excepciones:** todo token lleva el prefijo `sdm-`, y la
custom property equivalente es `--sdm-<nombre>`.

| Clase Tailwind | Custom property | Valor |
|---|---|---|
| `text-sdm-display-sm` | `var(--sdm-display-sm)` | 28px / 1.15 / −0.5px |
| `text-sdm-display-md` | `var(--sdm-display-md)` | 40px / 1.08 / −0.5px |
| `text-sdm-display-lg` | `var(--sdm-display-lg)` | 52px / 1.05 / −0.5px |
| `text-sdm-display-xl` | `var(--sdm-display-xl)` | 72px / 1.02 / −1px |
| `text-sdm-xs` | `var(--sdm-text-xs)` | 11px |
| `text-sdm-sm` | `var(--sdm-text-sm)` | 13px |
| `text-sdm-base` | `var(--sdm-text-base)` | 15px |
| `text-sdm-lg` | `var(--sdm-text-lg)` | 17px |
| `text-sdm-xl` | `var(--sdm-text-xl)` | 20px |
| `text-sdm-2xl` | `var(--sdm-text-2xl)` | 24px |
| `tracking-sdm-tight` | `var(--sdm-tracking-tight)` | −0.5px |
| `tracking-sdm-normal` | `var(--sdm-tracking-normal)` | 0 |
| `tracking-sdm-wide` | `var(--sdm-tracking-wide)` | 2px |

Los display llevan `lineHeight` y `letterSpacing` empaquetados en la clase de
Tailwind. Sin ellos Tailwind aplicaría `line-height: 1.5`, que en un título de
72px es una regresión. Las custom properties solo llevan el tamaño.

#### Por qué el prefijo `sdm-` en todo

En UI y tracking es **obligatorio**: `xs`/`sm`/`base`/`lg`/`xl`/`2xl` y
`tight`/`normal`/`wide` son claves **nativas** de Tailwind. Redefinirlas
habría cambiado en silencio `text-sm` de 14 a 13px en `BlogPostPage.tsx` y
`ReservaConfirmacionPage.tsx`, y `tracking-wide` de 0.025em a 2px en
`BlogPostPage.tsx` — tres archivos de la web pública que esta fase no toca.

En display **no haría falta**, y de hecho quedaron sin prefijo en el primer
commit. Se renombraron enseguida: la asimetría
—`text-sdm-sm` pero `text-display-lg`— es difícil de recordar, y en una
migración de ~780 literales garantiza que alguien escriba `text-sm` creyendo
que es el token de SDM y obtenga los 14px de Tailwind.

Verificado con `resolveConfig` que los defaults nativos quedan intactos:
`text-sm` sigue en `0.875rem` y `tracking-wide` en `0.025em`.

#### Se eliminó una tercera fuente de verdad

`globals.css` tenía clases `.display-xl` / `.display-lg` / `.display-md`
escritas a mano con **otros valores** que los del config:

| | `.display-*` de globals.css | `fontSize` del config | ahora |
|---|---:|---:|---:|
| xl | 72px | 76px | 72px |
| lg | 52px | 52px | 52px |
| md | 42px | 42px | 40px |
| sm | — | 32px | 28px |

Las tres estaban muertas: no aparecían en ningún `.tsx`, `.ts`, `index.html`
ni `functions/`, ni en las cinco tablas de contenido editable
(`paginas_legales`, `blog`, `propiedades`, `contenido_sitio`,
`showcase_barranco`). Se borraron.

#### Las clases utilitarias todavía no existen en el CSS

El JIT de Tailwind solo emite lo que encuentra en el contenido, así que
`text-sdm-sm` y compañía **no están en el bundle** hasta que el primer
componente las escriba. Es lo esperado. Las custom properties sí están desde
ya, porque `:root` se emite siempre.

#### Chunks

Los tres chunks JS quedaron **byte a byte idénticos**. Lo único que cambia es
el CSS: +241 bytes en el primer commit (13 tokens menos tres clases borradas)
y +52 más al renombrar.

### Fase 3 — Escala tipográfica, fase 2 · tanda 1: el admin — 2026-08-06

Migra los literales inline del dominio admin a las clases de Tailwind.
**25 archivos, 482 literales, 3 commits.**

| Commit | Alcance | fontSize | letterSpacing |
|---|---|---:|---:|
| `7413e15` | `components/admin/`, `cotizaciones/`, `tarjetas/` | 68 | 16 |
| `f5728b5` | los 17 paneles de `pages/admin/` | 307 | 68 |
| `5c73b73` | `AdminPage.tsx` | 16 | 8 |
| | **total** | **391** | **91** |

**Quedaron cero literales sin migrar** en el alcance.

#### ESTA MIGRACIÓN NO ES NEUTRA

Los valores cambian a propósito. Texto que medía 14px ahora mide 15; 22px
pasa a 24; 12px pasa a 13. **Los hashes de chunks no sirven como verificación
en esta fase** — a diferencia de todas las etapas del refactor anterior.

#### Tabla de conversión — la misma para la tanda de web pública

```
   9, 10, 11            →  text-sdm-xs          (11px)
  12, 13                →  text-sdm-sm          (13px)
  14, 15                →  text-sdm-base        (15px)
  16, 17                →  text-sdm-lg          (17px)
  18, 19, 20            →  text-sdm-xl          (20px)
  21, 22, 24, 26        →  text-sdm-2xl         (24px)
  28, 30, 32            →  text-sdm-display-sm  (28px)
  36, 38, 40, 42, 44    →  text-sdm-display-md  (40px)
  48, 52                →  text-sdm-display-lg  (52px)
  72, 96                →  text-sdm-display-xl  (72px)

  letter-spacing negativo          →  tracking-sdm-tight
  0 y positivos hasta 0.3px        →  tracking-sdm-normal
  positivos desde 0.5px            →  tracking-sdm-wide
```

Es **fija, sin excepciones**. No se decide caso por caso.

#### Siete literales no podían llevar `className`

Viven en constantes `React.CSSProperties` compartidas —`const inp` en los
cinco archivos de ficha de cliente, y `pill` en `CotizacionesAdmin.tsx`—, que
no son elementos JSX. Usan las custom properties, que existen exactamente
para este caso:

```js
const inp: React.CSSProperties = { fontSize: 'var(--sdm-text-base)', … }
```

Son 6 `fontSize` y 1 `letterSpacing`.

#### Un solo `lineHeight` absorbido

Los cuatro tokens display traen `lineHeight` y `letterSpacing` empaquetados,
así que un valor inline los pisaría. En todo el admin hubo **un solo caso**:
el porcentaje de conversión de `Captacion.tsx`, de 28px con `lineHeight`
inline. En la web pública habrá muchos más — ahí es donde viven los títulos
grandes.

#### Lo que `tsc` atrapó y una revisión visual no habría atrapado

Tres tags tenían el `className` **después** del `style`, y el transformador
solo miraba antes: quedaron con `className` duplicado. `tsc` los frenó con
`TS17001: JSX elements cannot have multiple attributes with the same name`.
Corregidos a mano en `Asociados.tsx:97`, `Equipo.tsx:106` y
`Propiedades.tsx:680`, conservando las clases que ya tenían.

**Para la tanda de web pública: buscar `style={{…}} className=` antes de
empezar.** Es el único patrón que rompe la transformación automática.

#### Componentes que no son elementos DOM

13 de los tags migrados son `Link` / `RouterLink` de react-router-dom.
Reenvían `className` al `<a>` subyacente, así que las clases aplican. Se
verificó que ningún icono de lucide recibiera una clase de texto: los iconos
llevan `size`, no `fontSize`.

#### Fuera de alcance, sin tocar

- `CotizacionPDF.tsx` — puntos tipográficos de `@react-pdf/renderer` sobre
  hoja carta, no píxeles de pantalla. Sistema aparte.
- `tarjeta.css` — usa `em` y un `11.33px` calculado para un ancho fijo de
  400px. Sistema aparte.
- Todo `src/pages/` fuera de `admin/`, `src/components/sections/` y
  `src/components/ui/` — sesión web pública, va en otra tanda.

#### El CSS creció, y es lo esperado

El JIT de Tailwind solo emite lo que encuentra en el contenido. Hasta esta
tanda las clases no existían en el bundle; ahora se emiten **9**:

`text-sdm-xs` · `text-sdm-sm` · `text-sdm-base` · `text-sdm-lg` ·
`text-sdm-xl` · `text-sdm-2xl` · `text-sdm-display-sm` ·
`tracking-sdm-normal` · `tracking-sdm-wide`

Faltan cuatro: `text-sdm-display-md`, `-lg`, `-xl` y `tracking-sdm-tight`. No
es un error — el admin no tiene tipografía por encima de 30px ni tracking
negativo. Aparecerán con la tanda de web pública.

CSS: 26.879 → 27.200 bytes (**+321**).

### Admin — layout móvil: el sidebar pasa a cajón — 2026-08-06

**El admin no tenía layout móvil.** No es que duplicara markup como el resto
del proyecto: simplemente nunca se adaptó. Cero `matchMedia`, cero
`innerWidth`; los breakpoints de Tailwind se usaban solo para grillas de
formulario (`md:grid-cols-2` y parientes, 28 apariciones), y del layout
general había **una sola**: `lg:p-10` en el `<main>`.

El `aside` medía `w-56` (224px fijos) y el `main` llevaba `ml-56` (otros 224
fijos). La aritmética era el problema entero.

#### Medido, no calculado

Chrome headless, `getBoundingClientRect`. **Cuidado con el método:** headless
tiene un piso de viewport de ~500px que ignora `--window-size`, así que las
primeras medidas móviles daban 500px y eran falsas. Lo que sirve es cargar la
página en **iframes del ancho real** dentro de una ventana grande.

| Viewport | Contenido antes | Contenido ahora |
|---:|---:|---:|
| 360px | **72px** | 328px |
| 390px | **102px** | 358px |
| 430px | 142px | 398px |
| 1024px | 736px | 736px |
| 1440px | 1136px | 1136px |

72px de ancho útil es más angosto que la palabra "Propiedades" en el serif de
28px de los títulos. De ahí que se rompieran letra por letra.

#### Qué se hizo

Debajo de `lg` (1024px) el `aside` es un cajón de 256px fuera de pantalla
(`-translate-x-full`) que se superpone con backdrop y **no empuja el layout**.
Lo abre una hamburguesa en el header; se cierra al elegir pestaña, al tocar el
backdrop, al navegar a una herramienta y con Escape. El `main` pierde el
`ml-56` y baja el padding a `p-4 lg:p-8 xl:p-10`.

**De `lg` para arriba no cambia nada.** Verificado a 1024 y 1440: aside en
x=0 w=224, main con `ml-56`, mismas medidas que antes.

Todo con breakpoints de Tailwind. El único estado en JS es abierto/cerrado.

#### El `top-[57px]` era un número mágico desalineado

El header mide **79,50px** medidos, y el aside arrancaba en 57. El header es
`sticky z-40` y el aside `fixed z-30`, así que le tapaba los primeros ~22px —
justamente la etiqueta "Arrastra para ordenar". Bug de escritorio,
preexistente.

Ahora hay **una sola definición**, `--admin-header-h: 80px`, declarada en el
div raíz del admin y referenciada por los dos:

```
header  lg:h-[var(--admin-header-h)]              ← la FUERZA
aside   lg:top-[var(--admin-header-h)]
        lg:h-[calc(100vh-var(--admin-header-h))]
```

Al forzarla en el header, no puede volver a desalinearse. Medido después:
header 80,0px, aside top 80,0px, sin solape. En móvil el cajón es `top-0
h-screen`, así que no depende de esa altura.

**Por qué no se rehizo como app-shell** (`h-screen flex flex-col` con scroll
interno en el `main`), que habría eliminado el número por completo:
`Contenido.tsx` guarda y restaura la posición con `window.scrollY` y
`window.scrollTo` al cambiar de página. Con scroll interno, `window.scrollY`
es siempre 0 y esa función se rompe en silencio.

#### El header móvil no se desbordaba: crecía

Medido, el header anterior daba **126px a 360px** y **110px entre 390 y 430**,
contra 80 en escritorio. No había overflow horizontal —`scrollWidth` igual al
viewport en todos los anchos—: los flex items partían su texto en varias
líneas.

Debajo de `lg` se ocultan el subtítulo "Panel Admin" y las etiquetas de "Ver
sitio" y "Cerrar sesión", que quedan solo con su icono. El header baja a
**63px** y entra en una línea. Se prefirió reducir antes que dejarlo envolver
porque el alto es lo escaso en un teléfono, y porque un header de alto
variable es la fragilidad que se acababa de quitar.

#### El arrastre no funciona en táctil, y ahora no lo aparenta

> **RESUELTO el 2026-08-07.** Se reimplementó con Pointer Events; la etiqueta y
> la manija vuelven a mostrarse debajo de `lg`. Ver «Admin móvil — cajón que
> bloquea el fondo y arrastre en táctil». Lo de abajo queda como registro del
> estado anterior.

El reordenamiento usa la **API HTML5 de drag and drop**: `draggable` con
`onDragStart` / `onDragEnter` / `onDragEnd`, sin un solo `onTouchStart` ni
`onPointerDown` en todo el admin. Esa API **no dispara desde eventos
táctiles** en iOS ni Android, así que en teléfono la etiqueta "Arrastra para
ordenar" mentía.

Debajo de `lg` se ocultan la etiqueta y la manija de cada fila. **El orden
guardado en `localStorage` se sigue respetando y renderizando igual**; solo no
se puede cambiar desde el teléfono. Reimplementarlo con Pointer Events es
trabajo aparte.

#### Sin tocar `globals.css`

El `overflow-x: hidden` del `body` queda como estaba, y la solución no depende
de él. El único archivo del diff es `AdminPage.tsx`.

Chunk `AdminPage`: 175,55 → 177,29 kB (**+1,74**).

### Admin móvil — encabezados, alineación y densidad — 2026-08-06

Segunda tanda de móvil, sobre el contenido interno de los paneles. Todo con
el breakpoint `lg`, igual que el cajón. **De `lg` para arriba no cambia nada**,
verificado a 1024 y 1440.

#### El encabezado de panel está repetido, no compartido

No hay componente. Es un `<div className="flex items-center justify-between
mb-N">` con un `<h2>` y una acción, **duplicado en 10 paneles**, cada uno con
su propio margen inferior: `Propiedades`, `Contenido`, `PaginasLegales`,
`Blog`, `Asociados`, `Barranco`, `Equipo`, `Rental`, `Vende` y
`CotizacionesAdmin`. El arreglo va en los 10.

Debajo de `lg` se apila —título arriba, acción abajo, `gap-3`— y de `lg` para
arriba vuelve a la fila, con `lg:gap-0` para que el escritorio quede idéntico.

**La acción no ocupa el ancho completo, a propósito.** Los grupos son
heterogéneos: unos son un solo botón (`+ Nueva propiedad`) y otros un par
estado + botón (`Guardado correctamente` + `SaveBtn`). Estirarlos pediría un
tratamiento distinto por panel, y un botón verde a todo el ancho bajo cada
título se lee como acción principal de página incluso cuando solo es guardar.

#### La densidad de la tabla era espaciado, no estructura

Medido con `getBoundingClientRect`: la tabla mide **619px dentro de un
contenedor de 328**, o sea que el `overflow-x-auto` ya funciona y scrollea. El
problema era solo la separación entre columnas al comprimirse a su ancho
mínimo:

| | título → tipo |
|---|---:|
| móvil, antes | **16px** |
| móvil, ahora | **32px** |
| 1440px | 218px (sin cambio) |

La celda del título pasó a `pr-8 lg:pr-4`. Como la tabla ya scrollea,
ensancharla 16px no aprieta nada.

#### El centrado de textos de ayuda NO EXISTE en el admin

Se buscó y **no se tocó nada**. Las 32 apariciones de `text-center` y
`textAlign: 'center'` del dominio son, las 32, exclusiones que el propio
encargo pedía respetar:

- estados vacíos (`No hay imágenes`, `Aún no hay propiedades`…)
- `Cargando…` y spinners
- las tarjetas de "Acceso restringido" de las 7 vistas con auth propia
- el badge `PORTADA` centrado dentro de su caja
- la tarjeta de `Asociados`, diseñada centrada (logo arriba, nombre abajo)
- el indicador de pasos del wizard de cotizaciones

Tampoco viene de otro lado. Verificado: `globals.css` **no tiene una sola
regla de `text-align`**; los estilos `.ProseMirror` del editor no centran; el
contenido guardado en `paginas_legales`, `blog` y `propiedades` tiene **cero**
`text-align: center`; y los únicos contenedores con centrado por flexbox son
los dos deliberados de arriba.

##### CERRADO: era contenido de base de datos, no estilo

Falsa alarma, resuelta el 2026-08-06. Lo que se veía centrado en **Páginas
Legales** es contenido guardado en la tabla, centrado en su momento desde el
botón de alineación del editor. Es **dato editable, no estilo**, así que no se
toca desde el código: se cambia desde el propio editor del admin.

La conclusión del análisis era correcta: el centrado no existía en el código.
Queda fuera de la lista de pendientes.

#### Pendiente: las tablas siguen sin layout móvil

`Propiedades` y `Blog` usan `<table className="w-full">` dentro de un
`overflow-x-auto`. En móvil eso significa **scroll horizontal**: la tabla de
Propiedades mide 635px contra 328 de pantalla, con 8 columnas en su ancho
mínimo. Funciona, pero obliga a arrastrar de lado para ver el estado o el
precio.

**Necesitan rediseño a tarjetas apiladas**, no más ajustes de espaciado. Queda
fuera de esta etapa a propósito y se decide aparte.

#### Sobre medir en headless

Chrome headless tiene un piso de viewport de ~500px que ignora
`--window-size`. Toda medida móvil hecha así es falsa. Lo que sirve es cargar
la página en **iframes del ancho real** dentro de una ventana grande.

Chunk `AdminPage`: 177,29 → 177,84 kB (**+0,55**).

### Fase 3 — Escala tipográfica, fase 2 · tanda 2: la web pública — 2026-08-06

Cierra la migración. **29 archivos, 4 commits.** Invasión de dominio sobre la
sesión web pública, anunciada antes de tocar.

| Commit | Superficie | fontSize | letterSpacing |
|---|---|---:|---:|
| `f952fb9` | home y catálogo + secciones compartidas | 113 | 56 |
| `0ff7989` | ficha de propiedad + crédito | 76 | 25 |
| `3c5b42e` | el último literal de la ficha (`'13px'` como string) | 1 | — |
| `4653bba` | institucionales, blog, legales, showcase | 155 | 51 |
| | **total** | **345** | **132** |

Se partió por **superficie visual, no por carpeta**, para que si algo se ve
mal se sepa en qué pantalla mirar.

#### 58 valores quedan sin migrar, a propósito

| Tipo | Cuántos | Motivo |
|---|---:|---|
| `clamp(...)` | 40 | tamaños responsive calculados, no literales |
| `letter-spacing` en `em` | 17 | **pendiente de revisión** (ver abajo) |
| ternario | 1 | `PropiedadDetailPage:115` elige 11 o 9 según el símbolo de la red |

El ternario merece una nota: sus dos valores caerían en `text-sdm-xs`, así que
unificarlo subiría el icono de LinkedIn de 9 a 11px. Se deja como está.

#### Los 17 `em` de El Barranco, sin convertir

El encargo mencionaba solo `ElBarrancoShowcase.tsx`; **`ElBarrancoBanner.tsx`
también tiene dos**. Equivalencias calculadas contra el `font-size` de cada
elemento:

| em | font-size | = px | archivos |
|---|---:|---:|---|
| 0.4em | 10px | **4,0px** | Showcase ×2, Banner ×1 |
| 0.35em | 10px | 3,5px | Showcase ×1 |
| 0.3em | 10px | 3,0px | Showcase ×2 |
| 0.25em | 10–11px | 2,5–2,8px | Showcase ×5, Banner ×1 |
| 0.2em | 10–11px | 2,0–2,2px | Showcase ×2 |
| 0.06em | clamp(32px…) | 1,9px | Showcase ×1 |
| 0.08em | 12px | **1,0px** | Showcase ×1 |

**Los 17 caerían en `tracking-sdm-wide` (2px)**, pero sus valores reales van de
1,0 a 4,0px.

##### DECIDIDO: quedan como están. NO los conviertas.

Excepción documentada, cerrada el 2026-08-06. Si abres
`ElBarrancoShowcase.tsx` o `ElBarrancoBanner.tsx` y ves `letterSpacing` en
`em` en vez de un token, **está bien y es deliberado**.

Los cuatro más abiertos son *eyebrows* en versalitas de 10px, y a ese tamaño en
mayúsculas el tracking amplio es justamente lo que los hace legibles — es el
mismo principio que el sistema de diseño aplica en `.section-label` (`sans`
uppercase de 13px con tracking de 3px). Colapsarlos a los 2px de
`tracking-sdm-wide` los rompe.

**Tampoco se crea un token propio.** Dos tokens de tracking ancho para
distinguir 2px de 4px es una distinción que nadie recuerda y que termina
aplicándose al azar. Vale más una excepción explícita en dos archivos que un
token mal usado en veinte.

#### Las constantes no pueden llevar `className`

27 literales viven en objetos `React.CSSProperties`, casi todos en el registro
de estilos `S` de `ElBarrancoShowcase`, que se aplica con `style={S.loQueSea}`.
Van con `var(--sdm-*)`, igual que en la tanda 1.

#### Los tres avisos de la tanda 1, comprobados

- **`style={{…}} className=`**: dos casos, `BlogPage:71` y `HomePage:82`, pero
  ninguno con `fontSize`, así que el transformador los ignoró. Aun así se le
  enseñó a buscar el `className` en **todo el tag** y no solo antes del
  `style`, que era el fallo de la tanda 1.
- **Constantes**: 27, resueltas con custom properties.
- **`lineHeight` sobre display**: 11 absorbidos, contra 1 en el admin. Se
  cumplió que serían bastantes más.

#### Ahora sí se emiten los 13 tokens

La tanda 1 dejaba 9. Con la web pública aparecen los cuatro que faltaban:
`text-sdm-display-md`, `-lg`, `-xl` y `tracking-sdm-tight` — los títulos
grandes y el tracking negativo viven acá, no en el admin.

| | delta |
|---|---:|
| CSS | +0,26 kB |
| chunk `index` | +2,24 kB |
| chunk `AdminPage` | +0,06 kB |

#### La escala queda completa

Todo el sitio usa los tokens, salvo dos sistemas aparte que quedan fuera **a
propósito y de forma permanente**:

- **`CotizacionPDF.tsx`** — puntos tipográficos de `@react-pdf/renderer` sobre
  hoja carta. No son píxeles de pantalla.
- **`tarjeta.css`** — `em` y un `11.33px` calculado para un ancho fijo de
  400px.

### `overflow-x: hidden` en html + body rompe TODO `position: sticky` — 2026-08-06

**Guardar esto.** Es la clase de trampa que cuesta días encontrar, porque el
síntoma aparece a metros de la causa: el header del admin subía con el scroll,
y el culpable estaba en dos líneas de `globals.css` que nadie relaciona con un
`sticky`.

#### El mecanismo

`overflow-x: hidden` convierte al elemento en **contenedor de scroll**. Un
`position: sticky` se pega a su contenedor de scroll más cercano, no al
viewport. Con `html` y `body` en `hidden`, ese contenedor deja de ser el
viewport y el sticky no se activa nunca.

`overflow-x: clip` recorta **exactamente igual** pero no crea contenedor de
scroll. Es la propiedad diseñada para este caso.

#### Medido, no deducido

Chrome, estructura real del admin, scroll de 600px, leyendo el `top` del
header. **Forzar `behavior: 'instant'`**: el `scroll-behavior: smooth` de `html`
anima y falsea la lectura si se mide enseguida — costó una medición entera
descubrirlo.

| `html` | `body` | header tras scrollear |
|---|---|---|
| `hidden` | `hidden` | top 0 → **−600** · se va |
| `hidden` | visible | top 0 → 0 · se pega |
| visible | `hidden` | top 0 → 0 · se pega |
| **`clip`** | **`clip`** | top 0 → **0** · se pega |
| `clip` | `hidden` | top 0 → **−600** · **se va** |

**Hacen falta las dos en `hidden` para romperlo.** Por eso las dos reglas de
`globals.css` van juntas y simétricas: dejar una sola sería un arreglo por
accidente que alguien "corregiría" más adelante reintroduciendo el bug.

#### `clip` no destapó ningún desborde

El riesgo era que `hidden` estuviera tapando overflow horizontal real. No lo
había. Home, catálogo, ficha de propiedad y showcase de El Barranco, a 360,
390, 1024 y 1440, con el build nuevo servido por `vite preview`: las 16
combinaciones renderizan contenido real y en ninguna el `scrollWidth` supera
al `innerWidth`.

#### La regla vive en TRES lugares, no en dos

Al aplicar el cambio en `globals.css` apareció un tercero:
**`src/styles/mobile.css`**, dentro de `@media (max-width: 768px)`. Dejaba
`html: clip` + `body: hidden` en teléfono, que —según la tabla de arriba—
**también rompe el sticky**.

| # | Archivo | Selector |
|---|---|---|
| 1 | `src/styles/globals.css` | `html` |
| 2 | `src/styles/globals.css` | `body` |
| 3 | `src/styles/mobile.css` | `body`, bajo `@media (max-width: 768px)` |

**Los tres son `clip`. Ninguno puede volver a `hidden`.**

La regla operativa para este proyecto es simple: *ninguna de las tres puede
ser `hidden`*. Dicho con precisión, lo que se midió es que rompe cuando `body`
queda en `hidden` mientras `html` no es `visible` — y `html` nunca es `visible`
acá. Con que una vuelva a `hidden`, el header del admin deja de pegarse otra
vez.

Verificado tras el cambio: **no queda ningún `overflow-x: hidden` en el CSS
compilado**, y el header se pega a 360, 390, 430, 767, 768, 1024 y 1440 — o
sea dentro y fuera de la media query. Sin desborde horizontal en home,
catálogo, ficha y showcase en ninguno de esos anchos.

De paso, `mobile.css` merece una revisión aparte: son overrides con
`!important` sobre selectores genéricos (`section.relative`, `header nav`) que
pueden estar peleando con Tailwind. En este cambio **solo se tocó la regla de
`overflow-x`**.

Vale la pena revisar `mobile.css` entero de paso: son overrides con `!important`
sobre selectores genéricos (`section.relative`, `header nav`) que pueden estar
peleando con Tailwind.

#### Nota de compatibilidad

`overflow: clip` necesita Chrome 90+, Firefox 81+ y **Safari 16+**. En Safari 15
y anteriores cae a `visible`, así que un desborde horizontal produciría barra
en vez de recorte. Como se verificó que no hay desbordes, el riesgo es
teórico — pero conviene saberlo si alguna sesión agrega contenido ancho.

### Admin móvil — las tablas pasan a tarjetas apiladas — 2026-08-07

Cierra el último pendiente grande del layout móvil del admin. Dos commits:
`8a2b27a` (bug del `<thead>`) y `4f57deb` (rediseño).

#### El bug del `<thead>`, que era preexistente

La tabla de `Propiedades` tiene **9 columnas pero el encabezado declaraba 8**:
la de la bandera (🌐 / 🇨🇱) no tenía `<th>`. Como los `<th>` se alinean a las
primeras columnas, desde ahí en adelante **todos los rótulos estaban corridos
una posición**: "Activo" rotulaba la bandera, "Acciones" rotulaba el toggle
Activa/Pausada, y la columna de acciones quedaba sin rótulo. El estado vacío
usaba además `colSpan={8}`.

Se agregó el `<th>` con la etiqueta **"País"**. No puede quedar vacía: el `key`
del `map` es el propio `label` y ya existe uno vacío —el de la manija de
arrastre—, así que dos vacíos colisionarían.

#### La técnica: un solo árbol de markup

Las dos son `<table>` semánticas reales, no divs con `display: table`. Debajo
de `lg` la tabla pasa a bloques y **cada `<tr>` a `flex flex-wrap`**, así sus
`<td>` se vuelven flex items que se reordenan con `order-*` y se dimensionan
con `w-full`. De `lg` para arriba vuelve a `table-row` / `table-cell`.

Eso resuelve el agrupamiento **sin envolver celdas en nada**, que era el
obstáculo real: no se pueden meter `<div>` entre `<tr>` y `<td>` sin romper la
tabla en escritorio. Se descartaron `display: contents` —soporte irregular
sobre elementos de tabla y bugs conocidos de accesibilidad— y el doble render,
que es la duplicación que este proyecto ya sufrió.

#### El truco del borde continuo en la línea de acciones

El toggle Activa/Pausada lleva `flex-1`. Así su `border-t` se estira hasta
encontrarse con el de la celda de acciones, y **entre los dos dibujan una sola
línea continua sin necesidad de un contenedor**. Sin eso quedaba un hueco sin
borde en el medio.

#### Medido, antes y después

| ancho | contenido | `display` de la tabla | tabla | precio | sep. Editar–Eliminar | alto táctil |
|---:|---:|---|---:|---:|---:|---:|
| 360 | 328 | `block` | 328 | 24px | **24px** | **44px** |
| 390 | 358 | `block` | 358 | 24px | 24px | 44px |
| 430 | 398 | `block` | 398 | 24px | 24px | 44px |
| 1024 | 736 | `table` | 826 | 15px | 12px | 20px |
| 1280 | 976 | `table` | 976 | 15px | 12px | 20px |
| 1440 | 1136 | `table` | 1136 | 15px | 12px | 20px |

En móvil la tabla mide **exactamente el ancho del contenido**: se acabó el
scroll horizontal. De `lg` para arriba, mismo `display`, mismo tamaño de precio
y misma separación y alto de botones que antes.

#### Dos estilos inline que habrían cambiado el escritorio

El peso del precio y la opacidad del slug se habían escrito como `style={{}}`
inline, que aplica en **todos** los anchos. Pasaron a clases responsive
—`font-medium lg:font-normal` y `opacity-70 lg:opacity-100`— antes de
commitear. Es el error fácil de este tipo de rediseño: el inline no entiende de
breakpoints.

#### Lo que NO se tocó

El arrastre para reordenar sigue oculto debajo de `lg` y **no se reimplementó**
con Pointer Events. ~~Pendiente~~ — hecho el 2026-08-07. A 1024 la tabla sigue midiendo 826px en un contenedor de
736 y scrolleando dentro de su `overflow-x-auto`: es el comportamiento de
siempre en ese ancho, y el rediseño se acotó a debajo de `lg` a propósito.

### La trampa del selector por subcadena de `mobile.css` — 2026-08-07

**Guardar esto.** Es la segunda trampa de CSS compartido de esta serie, y del
mismo tipo que la de `overflow-x: hidden`: el síntoma aparece lejos de la
causa.

#### El mecanismo

`src/styles/mobile.css:75-79`, dentro de `@media (max-width: 768px)`:

```css
[style*="background: var(--off)"] .section-label,
[style*="background: var(--off)"] h2,
[style*="background: var(--off)"] p,
[style*="background: var(--off)"] .flex.items-center {
  text-align: center !important;
}
```

Es un **selector por subcadena del atributo `style`**. No mira una clase ni un
componente: mira el texto literal del atributo. Cualquier elemento del sitio
que escriba `background: var(--off)` **inline** convierte a todos sus
descendientes `h2`, `p`, `.section-label` y `.flex.items-center` en texto
centrado, con `!important`, en teléfono.

#### Por qué costó encontrarlo

El síntoma era "las tarjetas del admin salen centradas en móvil". La búsqueda
natural —`text-center` y `textAlign` en los paneles— daba cero resultados
útiles: las 32 apariciones del admin son estados vacíos, spinners y badges.
La causa no estaba en el admin ni en `globals.css`, sino en un archivo de
overrides de la web pública.

Y explica también el "centrado de textos" que en su momento se cerró como
falsa alarma: lo de Páginas Legales era contenido de base de datos, sí, pero
**además había esta causa en código** que entonces no se encontró.

#### REGLA: en el admin no se usa fondo inline

`background: var(--off)` va **siempre** como clase `bg-[var(--off)]`, nunca
como `style` inline. Se convirtieron 24 elementos:

| Archivo | Cajas |
|---|---:|
| `Propiedades` | 7 |
| `Barranco` | 6 |
| `Contenido` | 3 |
| `Rental` | 2 |
| `Asociados` · `Equipo` · `Vende` · `CotizacionesAdmin` · `RichTextEditor` | 1 c/u |
| `AdminPage` (root, corregido antes) | 1 |

Medido a 390px sobre el CSS compilado, con una caja de cada forma:

| | `h2` | `p` | `.flex.items-center` |
|---|---|---|---|
| fondo **inline** | `center` | `center` | `center` |
| fondo **por clase** | `start` | `start` | `start` |

A 1440 ambos dan `start`, o sea que en escritorio nunca cambió nada.

**Los tres fondos inline de `src/components/sections/` se conservan**: ahí la
regla es intencional, es web pública.

El arreglo de fondo sería una línea en `mobile.css` —acotar el selector o
borrarlo—, pero es zona compartida y no estaba autorizado.

### Admin móvil — Cotizaciones a tarjetas — 2026-08-07

La lista de cotizaciones **no es una `<table>`**: es un `div` con CSS grid de
7 columnas, `90px 1fr 1fr 110px 120px 120px 110px`. Los fijos suman 550px, así
que a 390px la fila medía **674 dentro de 358** y, al no tener `overflow-x`,
se recortaba contra el `clip` del body: total, estado y acciones eran
inalcanzables **sin siquiera scroll**.

Al ser grid y no tabla, la conversión es más simple que en `Propiedades`:
debajo de `lg` la fila pasa a `flex-wrap` y sus hijos se reordenan con
`order-*`; en `lg` vuelve al grid. El `gridTemplateColumns` inline se ignora
solo mientras el `display` es `flex` — no hace falta tocarlo.

| ancho | contenido | `display` | fila scroll/client | alto | botón | separación |
|---:|---:|---|---|---:|---:|---:|
| 360 | 328 | `flex` | 326 / 326 | 196 | 44px | 24px |
| 390 | 358 | `flex` | 356 / 356 | 196 | 44px | 24px |
| 430 | 398 | `flex` | 396 / 396 | 196 | 44px | 24px |
| 1280 | 976 | `grid` | 974 / 974 | 61 | 31px | 4px |
| 1440 | 1136 | `grid` | 1134 / 1134 | 61 | 31px | 4px |

**Los contadores** pasan de `grid-cols-4` a `grid-cols-2 lg:grid-cols-4`. Se
eligió envolver en dos filas de dos y no comprimir: a 390px cada tarjeta
quedaba en 82px y la etiqueta más larga —`RECHAZADA`, versalitas de 11px con
2px de tracking— mide unos 100px. Comprimir obligaba a achicar el número, que
es el dato.

#### PENDIENTE: a 1024 exactos sigue recortándose

La fila mide **811 dentro de 734** y se recorta contra el `overflow: hidden`
de la caja. El grid pide 550px fijos más dos columnas flexibles y a ese ancho
no entra. Afecta a iPad horizontal y laptops chicos.

**Es preexistente**, no lo introdujo el rediseño, que se acotó a debajo de
`lg` a propósito. La salida sería subir el breakpoint de este panel a `xl`, o
darle `overflow-x-auto` a la caja.

### Admin móvil — los tres últimos paneles — 2026-08-07

Cierra el layout móvil del admin. Tres commits: `d25ca30`, `8b3a0b3` y
`317c44e`.

#### `Cotizaciones` usa `xl`, el resto del admin usa `lg`

**Es la única excepción del proyecto y tiene motivo.** Su grid pide **550px
fijos** —`90px 1fr 1fr 110px 120px 120px 110px`— más dos columnas flexibles.
A 1024 la fila medía 811 dentro de 734 y se recortaba contra el
`overflow: hidden` de la caja. Ningún otro panel tiene tantas columnas fijas.

Entre 1024 y 1279 se muestran las tarjetas, que ahí caben con holgura.

**No se usó `overflow-x-auto`** a propósito: sería la misma barra escondida
dentro del área de la tabla que ya dio problemas en `Propiedades`. Nadie la
descubre y se lee como contenido cortado.

| ancho | `display` | fila scroll/client | botón | separación |
|---:|---|---|---:|---:|
| 390 | `flex` | 356 / 356 | 44px | 24px |
| 1024 | `flex` | 734 / 734 | 44px | 24px |
| 1279 | `flex` | 989 / 989 | 44px | 24px |
| **1280** | `grid` | 974 / 974 | 31px | 4px |
| 1440 | `grid` | 1134 / 1134 | 31px | 4px |

Solo la lista cambió de breakpoint. El encabezado del panel y los cuatro
contadores siguen en `lg`: a 1024 los contadores dan 175px cada uno, de sobra
para `RECHAZADA`.

#### `TarjetasEquipo`

La fila tenía miniatura de 140px fijos + nombre en `flex-1` + los botones de
reordenar + `Imprimir / PDF` con `Editar` y `Eliminar`. A 358px al nombre le
quedaban ~56px: se partía una palabra por línea y el botón de imprimir
terminaba encima del texto.

Debajo de `lg` pasa a `flex-wrap` con `order-*`: miniatura con los `▲▼` a su
derecha, luego nombre y contacto a todo el ancho, y las acciones en fila
propia con borde superior. Medido: el nombre pasa de ~56px a **326px** a
390px de viewport.

Los `▲▼` tenían `padding: 2px 8px`, unos 20px de alto. Los cinco botones
pasan a 44px táctiles debajo de `lg`.

#### `FichaCliente` Nueva y Editar

Cuatro grids con `gridTemplateColumns` hard-coded, sin breakpoint. Pasan al
patrón que ya usaba el resto del admin:

```
'1fr 1fr'      →  grid-cols-1 md:grid-cols-2
'1fr 1fr 1fr'  →  grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

`FichaClienteVer:258` también tiene un `1fr 1fr` y **no se tocó**: es la página
de fotos del documento imprimible, no un formulario.

#### Cuidado al medir en iframes: faltan ~6px

Un iframe de `width=1024` tiene un viewport efectivo de ~1018 por la barra de
scroll vertical, así que `lg` (min-width 1024) **no matchea**. Una medición a
"1024" puede dar el layout de tablet y parecer un bug. Verificado con un test
aislado: a 1023 y 1024 da 2 columnas, a 1030 da 3.

Para comprobar un breakpoint exacto hay que medir unos píxeles por encima.

### `mobile.css` limpiado y acotado a `.sitio-publico` — 2026-08-07

El archivo nació el **2026-04-30** en `d91b373`, *"fix: mobile responsive"*, tres
meses antes del refactor del admin. Arregló el responsive de la web pública a
base de `!important` sobre selectores genéricos, y desde entonces venía
alcanzando al admin sin que nadie lo notara.

De **26 reglas quedan 20**; de **36 declaraciones con `!important`, 29**.

#### Ahora está acotado: `.sitio-publico`

Los nueve selectores genéricos van prefijados con `.sitio-publico`, clase que
llevan **`Layout`, `ElBarrancoShowcase` y `EvaluacionGratuitaPage`**.
`ReservaConfirmacionPage` no la lleva porque no usa ninguna regla.

**Se acotó en positivo, no con `:not()`.** Dos razones:

1. Hay **ocho rutas de admin** y solo una cuelga del root de `AdminPage`. Las
   otras siete —`FichaCliente` ×5, `Agentes` y `Captacion`— son rutas
   hermanas. Una clase en el root del admin dejaba siete sin proteger.
2. `:not(.admin *)` exige Safari 16.4.

**Consecuencia que conviene recordar: una ruta o panel nuevo queda protegido
por defecto.** Para que `mobile.css` le aplique hay que optar explícitamente
poniéndole la clase.

#### Las dos correcciones al diagnóstico

El diagnóstico previo dio por muertas dos reglas que **no lo estaban**. Las dos
fallas son instructivas:

**`section.relative` sí existe.** Hay un `<section class="relative …">` en el
home. El grep falló porque buscaba `<section className="relative` y la clase no
va en primera posición. **Buscar clases con grep posicional es poco fiable; lo
que decide es `querySelectorAll` sobre la página renderizada.**

**`.lg\:grid-cols-3` matchea aunque la utilidad no esté activa.** Entre 768 y
1024 la *utilidad* `lg:grid-cols-3` no aplica —su media query empieza en
1024—, pero **la clase sigue estando en el atributo**, así que el selector
`.lg\:grid-cols-3` la matchea igual. Sin esa regla el grid del home pasa de 2
columnas a 1.

> **La distinción que causó el error: "la utilidad no aplica" ≠ "el selector no
> matchea".** Una clase de Tailwind es un nombre en el atributo `class` esté
> activa o no; cualquier CSS puede engancharse a ella fuera de su breakpoint.

#### Los selectores por subcadena de atributo: no usar más

`[style*="…"]` y `[class*="…"]` **causaron los dos bugs de esta jornada**:

- `[style*="background: var(--off)"]` centraba con `!important` todo `h2`, `p`
  y `.flex.items-center` del admin, porque el root tenía ese fondo inline.
- El `overflow-x: hidden` de `body` rompía el `position: sticky` del header.
  (Distinto mecanismo, misma familia: reglas globales con efectos a distancia.)

No miran una clase ni un componente: miran el **texto literal** del atributo.
Cualquiera que escriba ese string, en cualquier parte del sitio, hereda el
efecto. Son cinco en este archivo y ahora están acotados, pero **no deben
escribirse más**.

#### Cómo se verificó

**Sitio público — que nada cambie.** Para cada uno de los nueve selectores se
contó cuántos elementos matchea y cuántos de esos están dentro de
`.sitio-publico`, en **13 páginas × 2 anchos**. Los 26 casos dan *todos
dentro*: 469 elementos por ancho, ninguno fuera. Si el conteo coincide,
prefijar no le quitó efecto a nada.

Se descartó una primera prueba que cargaba el CSS viejo y el nuevo en secuencia
y comparaba el estilo computado: **el DOM cambia entre medio** por animaciones
y carruseles, y daba falsos positivos —la misma página llegaba a reportar 285 y
148 nodos—.

**Admin — que quede libre.** Medido a 390, 767, 800 y 1040:

| | antes | ahora |
|---|---|---|
| `.font-serif` | `word-break: break-word` | `normal` |
| `.grid-cols-3` | 1 columna | 3 columnas |
| header padding | 16px forzado | 16px de `px-4`, sin forzar |
| `.btn-primary` justify | `center` | `normal` |
| `[style*=repeat(2]` | 12px | 0px |

**El `word-break: break-word` era el que hacía que los títulos del admin se
partieran letra por letra** cuando la columna era angosta.

#### Las reglas borradas, y las dos que se salvaron

Verificadas borrándolas del CSSOM en vivo y comparando el estilo computado:

| Borrada | Por qué era segura |
|---|---|
| `.px-8` | `[class*="px-8"]` matchea los mismos 35 elementos con las mismas declaraciones |
| `.font-serif.display` | 0 elementos |
| `.propiedades-grid` | 0 elementos; su única aparición era la propia regla |
| `[style*="gridTemplateColumns"]…` | **no puede matchear nunca**: React convierte a kebab-case |
| `.lg\:order-1, .lg\:order-2` | debajo de 768 el `order` ya es 0, igual que `unset` |
| `footer .lg\:grid-cols-4` | 9 elementos, todos idénticos con y sin ella |

Las dos que se salvaron —`section.relative` y el `.lg\:grid-cols-3` del bloque
tablet— quedaron con un comentario en el archivo explicando por qué no se
borran.

### LA PALETA OFICIAL ES LA ÚNICA — 2026-08-07

Commits `2560d41`, `fcc24dc`, `788f51f`. **Los colores viven en
`src/styles/globals.css`. No se escriben literales hexadecimales en los
componentes.**

El módulo de fichas de cliente y agentes tenía una paleta completa propia — 164
usos, cero `var(--)` de la oficial. No fue deriva: entró de una en el commit
`8c9e412` (2026-06-24, 152 archivos), **dos meses después** de que la paleta
existiera en el primer deploy. Ya usaba la escala tipográfica oficial; lo único
desalineado era el color.

| paralelo | → oficial | ΔE | qué arregla |
|---|---|---|---|
| `#F5F7FA` | `--off` | 1.2 | nada, era invisible |
| `#DCE4EC` | `--border` | 2.6 | nada, umbral |
| **`#7A8FA6`** | **`--muted`** | 11.6 | **3.33 → 5.03:1** |
| **`#4DB870`** | **`--green-dark`** | 18.6 | **2.50 → 4.85:1** |

`#7A8FA6` era **peor que el `#7a8a96` que la Fase 1 ya había descartado** por no
cumplir: 3.33 contra 3.56. La corrección se aplicó a la variable y este módulo,
al no usarla, se la saltó. **Ése es el argumento contra los literales**: una
corrección centralizada no alcanza a quien no está centralizado.

#### Las dos excepciones

**`tarjeta.css` se queda con su tercera paleta.** Está justificada: se importa
`?raw` y se inyecta en un contenedor que `html-to-image` rasteriza a PDF, sin el
reset global. Define sus variables con ámbito propio en `.sdm-pcard, .sdm-sheet`.
Es autocontención deliberada, no desconocimiento.

~~**`Captacion.tsx` queda con 5 usos pendientes** —`#0D2240`, `#7A8FA6`, `#F5F7FA`
y `#4DB870` en su objeto `COLORS`— por ser dominio de la sesión Sofía. Necesita
autorización.~~
**CERRADO el 2026-08-09** con autorización de Víctor. Los seis valores del mapa
apuntan a `var()`; se revisó antes que ningún consumidor concatenara alfa.

#### Lo que se revisó antes de tocar

- **Los 6 usos de `#DCE4EC` como texto** son los seis el mismo elemento: el `|`
  que separa «← Volver al admin» del título. Separador tipográfico, mismo rol
  que un borde, y **WCAG exime el texto puramente decorativo**, así que su
  1.28:1 no es incumplimiento. Merecería `aria-hidden`: hoy se lee como «barra
  vertical».
- **El aviso de `--muted` sobre `#0D2240` no se materializó.** Revisados los 36
  usos uno por uno, ninguno está sobre fondo oscuro. Los tres que un primer
  barrido marcó eran falsos positivos: lo que detectaba era el color de **texto
  de un hermano**, no un fondo.
- `#a0b4c4` de botones deshabilitados **no se toca**: WCAG exime los controles
  deshabilitados.

#### Los dos navy quedan pendientes

`#0D2240` (59 usos) y `#1A2E44` (14) siguen como literales. Ver la entrada
siguiente.

### `#0D2240` y `#1A2E44`: RESUELTO, los dos a `--navy-dark` — 2026-08-07

**No son el mismo rol con dos valores por descuido: hacen trabajos distintos.**

| | `#0D2240` | `#1A2E44` |
|---|---|---|
| como fondo | **20 usos** | **0** |
| como texto | 31 | 12 |

`#0D2240` **como fondo** son: el portón de sesión a pantalla completa
(`minHeight: 100vh`, dos por archivo × 5), los círculos de avatar con iniciales,
las barras de cabecera de la vista de impresión, el marcador de foto, y dos
botones. **Como texto** son títulos, nombres y valores, siempre sobre claro.

`#1A2E44` **nunca es fondo**. Sus 12 usos se reparten en dos grupos: el `color`
del `inputStyle` compartido de cada archivo (5), y el párrafo «Debes iniciar
sesión.» (7).

Comprobado que ese párrafo **no** está sobre el panel oscuro —hay una tarjeta
blanca en medio—, así que da 13.83:1 y no hay bug.

**Resuelto en el commit `0768274`: los dos a `--navy-dark`.** `#1A2E44` nunca
era fondo, así que no eran dos roles con dos valores sino un rol con dos valores
por descuido.

**Dos correcciones a la premisa, las dos medidas:**

1. **`--navy-dark` NO es más oscuro** que `#0D2240`. Tiene menos azul y algo más
   de luminancia (0.0168 contra 0.0160), así que el blanco encima **baja** de
   15.91 a 15.71. Es −0.20 sobre 15.7:1: imperceptible, y a 3,5× del umbral AA.
   No se detuvo porque ningún caso se acerca a fallar.
2. **En el PDF gasta MENOS tinta, no más:** la cobertura CMYK baja de **202 % a
   181 %**. La preocupación estaba invertida.

| los 21 fondos, texto encima | antes | después |
|---|---|---|
| portón «Verificando…», blanco 70 % (5) | 8.40 | 8.35 |
| avatares, iniciales blancas (6) | 15.91 | 15.71 |
| cabeceras de impresión (2) | 15.91 | 15.71 |
| botón «Imprimir» y «Agregar fotos» (3) | 15.91 | 15.71 |
| portón «Debes iniciar sesión» (5) | sin texto directo — hay una tarjeta blanca encima | |
| marcador de foto (1) | sin texto | |

| los 43 como texto sobre claro | antes | después |
|---|---|---|
| `#0D2240` sobre blanco | 15.91 | 15.71 |
| **`#1A2E44` sobre blanco** | 13.83 | **15.71** |
| `#0D2240` sobre `--off` | 15.22 | 15.04 |
| **`#1A2E44` sobre `--off`** | 13.24 | **15.04** |

### EL SEPARADOR «|» DE LAS CABECERAS ES DECORATIVO. NO «ARREGLARLO». — 2026-08-07

En las seis pantallas del módulo de fichas, la cabecera lleva
`← Volver al admin | Título`. Ese `|` es un `<span>` con `color: var(--border)`,
que da **1.28:1** sobre blanco.

**No es un incumplimiento.** WCAG exime el texto puramente decorativo, y esto es
un separador —el mismo papel que una línea de 1 px—, no contenido. Usa
`--border` a propósito, que es la variable de las separaciones decorativas (ver
la entrada de `--border` contra `--border-input`).

Si una auditoría automática lo marca, es un falso positivo.

**Lo que sí le falta es `aria-hidden`:** hoy un lector de pantalla lo anuncia
como «barra vertical» entre el enlace y el título. Pendiente, no hecho.

### Lo que queda de literales en el módulo de fichas — 2026-08-07

La paleta paralela **catalogada** —los cinco colores del diagnóstico— está
eliminada: cero apariciones. Pero hay una cola que el diagnóstico no había
contado, casi toda en `FichaClienteVer.tsx`, que es la vista de impresión:

| color | dónde | veredicto |
|---|---|---|
| `#aabccc` `#7a9ab8` `#9aafc2` | texto sobre las barras oscuras del PDF | **cumplen**: 4.69 a 8.06 |
| `#162e4a` | fondo de una barra de impresión | fondo, sin problema |
| `#c0cdd8` | color de iconos `<Image>` y `<ChevronRight>` sobre blanco | **1.62** — decorativos, pero el chevron indica navegación y 1.4.11 pediría 3:1 |
| `#e8edf2` | escrito como literal en vez de `var(--border)` | mismo valor, solo falta la variable |
| `#a0b4c4` | botones deshabilitados | exento |
| `#e24b4a` | errores | es el rojo de todo el proyecto, sin variable oficial |

Ninguno justifica otra tanda por sí solo, pero está anotado para que «cero
literales» no se lea como más de lo que es.

### LOS COLORES DE ESTADO SE VERIFICAN CON ΔE2000 BAJO DALTONISMO — 2026-08-07

Commit `f3d5860`. **El criterio, para cualquier color de estado que se agregue:**

| pregunta | medida | criterio |
|---|---|---|
| ¿se lee el texto sobre la insignia? | **ratio de luminancia** WCAG | ≥ 4.5:1 |
| ¿se distinguen dos estados entre sí? | **ΔE2000** | > 10 |
| ¿los distingue alguien con daltonismo? | **ΔE2000 sobre la simulación**, protanopia y deuteranopia | > 10 |

**Los tres hacen falta y miden cosas distintas.** El ratio dice si el texto se
lee; el ΔE dice si dos estados se diferencian. Un color puede cumplir 4.5:1
perfecto y ser indistinguible de su vecino.

#### Qué pasó con «Reservada»

En ámbar `#B45309` cumplía contraste (5.02:1) y **bajo deuteranopia daba ΔE2000
de 2.1 contra «Vendida»**: prácticamente el mismo color. El ámbar anterior
`#D97706` tampoco se salvaba. Rojo contra naranja es justo el par que esas
condiciones colapsan, y la deuteranopia es la forma más común —alrededor del
6 % de los hombres—.

Se buscó barriendo H165-300°, S30-95 %, L18-52 %, filtrando por contraste ≥4.5 y
ordenando por **el peor ΔE** contra los otros tres estados en las tres
condiciones. Ganó `#1F5F6B` — petróleo, H189° S55% L27%.

| | |
|---|---|
| contraste con blanco | **7.22:1** (antes 5.02) |
| peor ΔE de los nueve pares | **21.2** |
| distancia de `--navy` | 16.7 — familia adyacente, distinto |

**La agrupación es también semántica:** «Reservada» y «Arrendada» son ocupación
temporal y ahora son las dos frías; «Vendida» es lo único definitivo y se queda
sola en rojo.

#### La matriz completa, cinco estados × tres condiciones

Peor par en cada condición, excluyendo «Precio rebajado» vs «Bono Pie» que son
**el mismo color a propósito** (nunca coexisten):

| condición | peor par | ΔE |
|---|---|---|
| normal | Reservada vs Arrendada | 23.3 |
| protanopia | **Vendida vs Precio rebajado** | **10.2** |
| deuteranopia | Vendida vs Precio rebajado | 16.3 |

**El par más ajustado del sistema ya no es Vendida/Reservada sino Vendida contra
Precio rebajado bajo protanopia: 10.2**, justo en el umbral. Es rojo contra
verde, que es lo que la protanopia colapsa, y son de familias distintas —una de
estado y otra de oportunidad— así que pueden aparecer en la misma tarjeta. Pasa,
pero es el siguiente candidato a revisar si algún día se toca la paleta.

#### Costo

Cero: `+0,02 kB gzip`, y es ruido de compresión. Se cambió un valor hexadecimal.

### `.btn-evaluacion` eliminado · `.btn-inverse` es la contraparte que faltaba — 2026-08-07

Commit `8c9770b`.

#### Por qué se fue el dorado

Rompía **cuatro principios del sistema a la vez**: degradado donde el sistema
usa color plano, `box-shadow` donde usa bordes finos, negrita siendo el único
botón así, y un brillo animado en `:hover` donde el sistema dice movimiento
mínimo. Se eliminó con su `::after` y su `@keyframes`.

**La jerarquía que expresaba sí era correcta** —es el único de los tres botones
que convierte; los otros dos navegan a leer— así que lo que cambió es el
tratamiento, no el peso.

#### `.btn-inverse` NO es una excepción

`.btn-primary` es navy sobre claro; **`.btn-inverse` es claro sobre navy**.
Mismas propiedades salvo los dos colores: plana, sin sombra, sin degradado,
mismo peso (500), mismo radio, mismo padding.

Hacía falta porque sobre el panel `--navy-dark` de la sección de financiamiento
**`.btn-primary` es literalmente invisible**: el botón y el fondo son el mismo
color, `1.00:1`. No era «poca separación».

| | contra el panel | texto sobre el botón |
|---|---|---|
| `.btn-inverse` `#FFFFFF` | **15.71** | **15.71** |

Se llama `inverse` y no `invertido` para seguir a las cuatro clases que
sobreviven —`primary`, `green`, `outline`, `text`—, todas en inglés.
`evaluacion` era la única en español y era justo la que se iba.

Jerarquía resultante en esa sección, sobre panel `--navy-dark`:

| botón | tratamiento | separación del panel | rol |
|---|---|---|---|
| Personas | verde sólido | 3.24 | navega a leer |
| Empresas | contorno blanco | borde a 15.71 | navega a leer |
| **Evaluación** | **blanco sólido** | **15.71** | **convierte** — único `<button>` |

Los tres se distinguen por tratamiento, no solo por color, y el que convierte es
el más contrastado. Es el orden correcto.

### PARA SABER SI DOS COLORES SE DISTINGUEN, LA MEDIDA NO ES EL CONTRASTE

Quedó claro tres veces seguidas y conviene que no se repita:

| pregunta | medida correcta | medida que NO sirve |
|---|---|---|
| ¿se lee este texto sobre este fondo? | **ratio de luminancia** (WCAG 1.4.3) | — |
| ¿se distinguen estos dos colores? | **ΔE2000** | el ratio de luminancia: dos tonos opuestos de igual claridad dan ~1.0 y se ven clarísimamente distintos |
| ¿los distingue alguien con daltonismo? | **ΔE2000 sobre la simulación** | el ΔE2000 normal |

#### Aplicado: «Vendida» contra «Reservada»

**Sí coexisten en pantalla.** De las 53 propiedades activas hay **3 vendidas** y
**2 reservadas**, todas en la misma grilla de `/propiedades`, así que dos
tarjetas contiguas pueden llevar una de cada una.

| par | ΔE2000 |
|---|---|
| Vendida `#C0392B` vs Reservada **nueva** `#B45309` | **13.8** |
| Vendida vs Reservada **vieja** `#D97706` | 24.7 |
| Vendida vs Arrendada `#2563EB` | 44.4 |

A 13.8 **se distinguen** en visión normal —por encima de 10 son colores
distintos—, aunque oscurecer el ámbar para cumplir contraste costó casi la mitad
de la separación que había.

**El problema real es otro, y no estaba en el encargo:**

| simulación | Vendida | Reservada | ΔE2000 |
|---|---|---|---|
| protanopia | `#636329` | `#6C6C03` | **6.8** |
| **deuteranopia** | `#7C7C1A` | `#7E7E00` | **2.1** |

**Con deuteranopia —la forma más común de daltonismo, ~6 % de los hombres— las
dos insignias son prácticamente el mismo color.** 2.1 está en el umbral de lo
imperceptible. Y con el ámbar viejo tampoco se salvaba: rojo y naranja es
exactamente el par que estas condiciones colapsan.

Se distinguen por el **texto** de la insignia, que sí es distinto. Pero el color
no está aportando información para esos usuarios. Si se quiere que aporte, hay
que sacar «Reservada» de la franja rojo-naranja, no oscurecerla más. **No se
tocó: es decisión de diseño.**

#### Costo

`index.css` **−0,14 kB gzip**. Se borró más de lo que se agregó.

### Insignias: dos familias, y el rojo que significaba dos cosas — 2026-08-07

Commit `12a46e2`.

#### Las variables y qué significan

| variable | valor | blanco encima | qué comunica |
|---|---|---|---|
| `--estado-vendida` | `#C0392B` | **5.44** | la propiedad ya no está disponible |
| `--estado-reservada` | `#B45309` | **5.02** | tiene una reserva en curso |
| `--estado-arrendada` | `#2563EB` | **5.17** | ya no está disponible |
| `--oportunidad` | `#2D8055` | **4.85** | tiene una ventaja comercial |

**Son dos familias y no deben mezclarse.** *Estado* dice en qué situación está
la propiedad y ocupa la insignia de arriba; *oportunidad* dice qué ventaja tiene
y ocupa la de abajo. Pueden convivir una de cada una; dentro de cada familia son
excluyentes.

#### El rojo significaba dos cosas opuestas

`#c0392b` se usaba para «Vendida» **y** para «Precio rebajado»: un cierre y una
oportunidad, con el mismo color, en una grilla donde conviven. El rojo se queda
con «Vendida», que es lo que comunica.

«Precio rebajado» y «Bono Pie» comparten `--oportunidad` **a propósito**: nunca
coexisten —la insignia secundaria es una o la otra— y ahora se leen como familia
frente a las de estado. `--oportunidad` es `--green-dark`, o sea **no se agrega
un color nuevo** a la paleta.

El ámbar de «Reservada» sube manteniendo el tono: H32° → H26°, claridad 44 % →
37 %. Es el candidato más cercano al original que llega a 4.5.

**Nota de método:** para «¿se distinguen a simple vista?» el ratio de luminancia
**no sirve** —dos colores de tono opuesto e igual claridad dan ~1.0 y se ven
clarísimamente distintos—. La medida es la distancia de tono. `--oportunidad`
está a **143°** del rojo de «Vendida»; el ámbar, a **20°**, que es la
convergencia que ya tenía y que oscurecerlo acentúa un poco.

### `.btn-evaluacion` NO se eliminó: `.btn-primary` sería INVISIBLE ahí

Se pidió reemplazarlo por `.btn-primary` en sus dos usos. En uno funciona; en el
otro **no puede funcionar**, y el encargo traía una condición de parada para
justo esto.

| dónde | fondo del panel | `.btn-primary` sobre él |
|---|---|---|
| `ServiciosPage.tsx:86` | `bg-white` | **15.71** ✓ |
| `HomePage.tsx:275` | **`var(--navy-dark)`** | **1.00** ✗ |

El panel de la home es `--navy-dark` y `.btn-primary` tiene
`background: var(--navy-dark)`: **el mismo color exacto**. No es «poca
separación», es un botón que desaparece.

Separación de cada alternativa contra ese panel `#0F2535`:

| opción | separación | problema |
|---|---|---|
| dorado actual | 6.88 | rompe cuatro principios del sistema |
| `.btn-green` (`--green-dark`) | 3.24 | **queda idéntico al botón «Personas»** de la misma sección |
| blanco sólido | **15.71** | trata­miento nuevo, no existe en el sistema |

La jerarquía a preservar: «Personas» y «Empresas» **navegan a leer** y son un
par; el tercero **convierte** —es el único `<button>`, abre el modal— y va en
una fila aparte. Si el tercero se vuelve `.btn-green` queda igual que
«Personas» y se pierde justo lo que el dorado expresaba bien.

**Queda pendiente de decisión.** Mientras tanto `.btn-evaluacion` sigue en
`globals.css` con sus dos consumidores; no se borró nada a medias.

#### Costo

`index.css` **+0,06 kB gzip**.

### Contraste WCAG AA — tanda 1 — 2026-08-07

Ratios calculados con la fórmula de luminancia relativa de WCAG 2.1, validada
contra la referencia conocida `#767676` sobre blanco = **4.54**. Ningún número
de acá es estimado.

| qué | antes | después | criterio |
|---|---|---|---|
| `.btn-green` blanco sobre fondo | `--green` **2.93** | `--green-dark` **4.85** | 1.4.3 (4.5) |
| borde de campo público | `--border` **1.18** | `--border-input` **4.06** | 1.4.11 (3.0) |
| borde de foco del campo | `--green` **2.93** | `--green-dark` **4.85** | 1.4.11 |
| borde de campo del admin | `--sky`/`--sky-pale` **1.63** | `--border-input-admin` **3.71** | 1.4.11 |
| placeholder | `#9AA8B4` **2.43** | `#6B7681` **4.63** | 1.4.3 |
| «Verificando sesión…» | blanco 40 % **3.67** | blanco 70 % **8.35** | 1.4.3 |
| pie de tarjeta vacía | blanco 20 % **1.82** | blanco 60 % **5.14** | 1.4.3 |

#### `--border` y `--border-input` SON COSAS DISTINTAS. No unificarlas.

| variable | para qué | ratio sobre blanco |
|---|---|---|
| `--border` `#e8edf2` | **separaciones decorativas** — líneas de 1 px, divisiones de tabla, bordes de tarjeta | 1.18, **y está bien** |
| `--border-input` `#767F8A` | **límite de un CONTROL** de formulario | 4.06 |
| `--border-input-admin` `#5A81A2` | ídem sobre `--sky-pale` | 3.71 (y 4.12 sobre blanco) |

**1.4.11 aplica al límite de un control, no a una separación decorativa.** Subir
`--border` habría engordado todas las líneas finas del sitio para resolver un
criterio que no las alcanza. Son requisitos distintos y la variable separada es
lo que impide que alguien los junte «para simplificar».

#### `--green` no se toca: el problema es blanco ENCIMA de verde

| `--green` como texto, sobre… | ratio |
|---|---|
| blanco | 2.93 ✗ |
| `--off` | 2.80 ✗ |
| `--sky-pale` | 2.64 ✗ |
| `--navy` | 3.83 (solo texto grande) |
| `--navy-dark` | **5.37** ✓ |
| `--navy-deeper` | **6.12** ✓ |

**Y `--green-dark` es PEOR sobre fondo oscuro**: 2.31 sobre `--navy`, 3.24 sobre
`--navy-dark`. O sea el arreglo depende del fondo y **no se puede hacer un
buscar-y-reemplazar global de `--green` por `--green-dark`**. Sobre claro,
oscurecer; sobre oscuro, el verde de marca ya cumple.

Armonía: mismo tono (147° contra 149°), misma saturación (47 % contra 48 %),
solo 11 puntos menos de luminosidad. `--green-dark` ya existía en la paleta.
Quedan 13 elementos con `--green` de fondo —líneas, puntos del carrusel,
insignias— y no se tocan: no llevan texto encima.

#### El `.btn-outline` no está sobre el velo del hero

Se pidió medir dónde cae dentro del degradado a 390/768/1440. **La premisa no se
sostiene:** `.btn-outline` se usa en **dos** sitios y **ninguno** es el hero.

| dónde | color real | fondo real | ratio |
|---|---|---|---|
| `HomePage.tsx:268` | `#FFFFFF` pisado inline | `--navy-dark` sólido | **15.71** ✓ |
| `CotizacionesAdmin.tsx:861` | `--muted` pisado inline | blanco | **5.03** ✓ |

**Los dos consumidores pisan el color de la clase con un `style` inline**, así
que el `rgba(255,255,255,0.65)` que declara `.btn-outline` en `globals.css:135`
**nunca se renderiza**. El 1.93:1 del inventario describe un estado que no
existe en pantalla.

Lo que sí queda por revisar del segundo: su borde es `--border` sobre blanco,
1.18:1, y ahí sí es el límite de un control.

#### Encontrado de paso, sin tocar

- **`--sky` como texto sobre casi-blanco**: `BlogPostPage.tsx:82` pinta las
  iniciales del autor en `--sky` sobre `rgba(168,196,220,0.2)` sobre blanco —
  fondo efectivo `#EEF3F8`, ratio **1.62**. Es el peor par del sitio.
- **`--muted` sobre `--sky-light` (3.92) y sobre `--sky` (2.78)**: se buscaron y
  **no hay texto `--muted` sobre esos dos fondos**. Los usos de `--sky` como
  fondo son barras de progreso y avatares, sin texto `--muted` encima.
- **`Captacion.tsx:1126`** tiene el octavo «Verificando sesión…» con blanco al
  40 %. Es dominio de la sesión Sofía y quedó sin tocar.

#### Costo

`index.css` **+0,02 kB gzip**.

### `og-image.jpg` NUNCA EXISTIÓ, y el catch-all lo disimulaba — 2026-08-07

Commits `b464c5b` y `42d61cb`. Cierran los dos pendientes de la entrada de
abajo.

#### El bug de la imagen, y por qué tardó tanto en verse

`SEO.tsx` pedía `${BASE}/og-image.jpg`. En `public/` solo hay
**`og-image.png`** y `og-image.svg`. El `.jpg` **no existió nunca**.

No se notó porque el catch-all de SPA —`/*  /index.html  200` en
`public/_redirects`— devuelve `index.html` con **status 200** para cualquier
ruta. O sea la URL «funcionaba»: respondía 200, y el crawler recibía HTML donde
esperaba una imagen.

**Es la trampa del 404 ya documentada, mordiendo en un sitio nuevo.** Está
anotada desde la entrada del `.DS_Store`: *en este sitio ninguna URL devuelve
404 nunca, así que comprobar existencia por código de estado da falsos
positivos*. Acá el falso positivo llevaba meses.

**Cómo comprobar que un asset existe de verdad en este sitio:** mirar el
`content-type` **y** que el hash del cuerpo **no** coincida con el de `/`. Un
200 no prueba nada.

El valor correcto ya estaba escrito en el repo desde siempre:
`functions/propiedades/[id].js` usa `og-image.png`.

#### La Function del blog

`functions/blog/[slug].js`, calcada de la de propiedades. Misma detección de bot
por user-agent, misma consulta con la anon key y sus fallbacks de entorno, mismo
`escapeHtml` sobre todos los valores, mismo caché de 300 s.

Dos diferencias deliberadas con la de propiedades:

| | por qué |
|---|---|
| `og:type` = **`article`** y no `website` | es un artículo, y es lo que ya pasa `<SEO>` desde el cliente |
| filtro **`publicado=eq.true`** explícito | desde fuera no se distingue «RLS filtra los borradores» de «no hay borradores» —la anon key devuelve 13 filas y 0 despublicadas, compatible con ambas— y un borrador no debe filtrarse por el previsualizador de WhatsApp |

`DEFAULT_DESCRIPTION` es un **espejo** de la de `SEO.tsx`. Al escribirla de
memoria le sobraba una frase; se alineó comparando las dos cadenas. **Si se
cambia una, cambiar la otra.**

#### Lo que esto arregla y lo que no

Arregla la vista previa de **los artículos del blog**. El resto de las rutas
—`/blog`, `/asociados`, `/quienes-somos`, `/servicios`…— siguen sin Function, o
sea que para un crawler que no ejecuta JS siguen mostrando el título genérico.
Ahora al menos comparten **con imagen**, que es lo que arregla `b464c5b`.

Si algún día importa que esas rutas también se compartan bien, el patrón está
escrito dos veces y es mecánico.

### `<SEO>` en las seis rutas que faltaban — y dos cosas que quedan rotas — 2026-08-07

Commit `209ec68`. Las seis rutas que heredaban el título genérico ya ponen el
suyo: `/blog`, `/blog/:slug`, `/asociados`, `/reserva/confirmacion`, la 404 y el
showcase. Verificado navegándolas: ninguna cae ya en «SDM Capital | Inversión
Inmobiliaria Chile & Internacional».

`blog_posts` **sí** tenía los campos: `resumen` para la descripción e
`imagen_portada` para el `og:image`, más `resumen_en` para seguir el mismo
patrón bilingüe que el título.

El showcase va **en inglés** porque la página arranca en inglés — `lang` parte
en `'en'` y solo cambia si el visitante pulsa ES. Lleva las dos versiones y
sigue al toggle.

---

#### PENDIENTE 1 · El blog NO tiene Pages Function. WhatsApp sigue sin ver nada.

`functions/` tiene `api/imagen.js`, `api/subir.js` y `propiedades/[id].js`.
**No hay equivalente para `/blog/`.**

`propiedades/[id].js` existe justamente porque un crawler que no ejecuta
JavaScript no ve lo que `<SEO>` escribe en el cliente: detecta el user-agent del
bot (`facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|…`) y le devuelve HTML
con los meta ya puestos.

**Consecuencia:** lo de este commit arregla la pestaña del navegador, Google —que
sí ejecuta JS— y cualquier crawler moderno. **No arregla la vista previa de
WhatsApp ni la de LinkedIn para los artículos del blog**, que es el caso que
motivó la tarea. Para eso hace falta `functions/blog/[slug].js`, calcado de
`propiedades/[id].js`. **Es otra tarea y no está hecha.**

#### PENDIENTE 2 · El `og:image` por defecto apunta a un archivo que no existe

`SEO.tsx:12` dice:

```js
const DEFAULT_IMG = `${BASE}/og-image.jpg`
```

En `public/` hay **`og-image.png`** y **`og-image.svg`**. No hay `.jpg`. Y como
el sitio responde 200 a todo (ver la entrada del `.DS_Store`),
`https://sdmcapital.cl/og-image.jpg` devuelve **`index.html` con
`content-type: text/html`** — o sea el crawler pide una imagen y recibe HTML.

**Toda ruta que no pase su propia imagen comparte sin imagen.** Son todas menos
la ficha de propiedad y, desde este commit, el post del blog.

La Pages Function `propiedades/[id].js` **lo tiene bien**: usa
`og-image.png`. O sea el bug está solo en el componente del cliente, y el valor
correcto ya está escrito en el repo, a un carácter de distancia.

No se corrigió acá: `src/components/SEO.tsx` queda fuera del dominio anunciado
para esta tanda, que era `src/pages/`.

#### Costo

**+0,26 kB gzip.**

### SI EL CÓDIGO DESCARTA ALGO QUE EL USUARIO PIDIÓ, TIENE QUE DECIRLO — 2026-08-07

Commit `0d95c6d`. Generaliza el criterio de la entrada de abajo, que hablaba de
listas que se recortan al mostrarse. Esto es un grado peor:

> **Recortar al mostrar** = no ves algo.
> **Descartar al ejecutar** = crees que hiciste algo que no ocurrió.

`Propiedades.tsx` hacía `Array.from(files).slice(0, 20 - imagenes.length)` a
secas. Elegías 25 fotos con 0 cargadas, subían 20, y nada lo decía: quedabas
convencido de que la propiedad tenía 25.

**El comportamiento no cambió** —suben las que caben, se descarta el resto— y el
límite de 20 sigue siendo deliberado. Lo único que cambió es que ahora se avisa,
**antes** de subir y con el conteo real.

#### El navegador no puede impedirlo

Se verificó antes de escribir el aviso: `<input type="file">` tiene `multiple` y
`accept`, pero **HTML no define ningún atributo de cantidad máxima**. No hay
forma de que el selector del sistema operativo limite cuántos archivos se
eligen. Avisar después de elegir es la única vía.

#### Por qué `alert()` y no la píldora

No había mecanismo para avisos informativos: la píldora «Guardado correctamente»
es de éxito y `avisarError` es de fallo. Se usó `alert()` a propósito:

- El mensaje **tiene que interrumpir**. Aparece justo antes de una operación
  lenta que va a hacer algo distinto de lo que el usuario pidió.
- Un aviso no bloqueante se lo comería la barra de progreso de la subida, que
  arranca inmediatamente después.
- `alert()` ya es el mecanismo del panel para detener y hacer leer —lo usa
  `avisarError`—, así que no introduce una forma nueva.

**Si algún día hace falta un aviso informativo que no interrumpa, ahí sí
corresponde un componente nuevo.** Este caso no era ese.

#### El botón desaparecía sin explicar por qué

Con 20 fotos cargadas, el botón de agregar simplemente no se renderizaba
(`{imagenes.length < 20 && …}`). Otro silencio: no había forma de saber si
faltaba un permiso, si estaba roto, o si era el tope. Ahora en su lugar va el
motivo.

#### El 20 estaba escrito cuatro veces

Literal, a mano, en las líneas 279, 370, 372 y 707 del mismo archivo. Ahora es
`MAX_FOTOS` y vive una vez. **No hay otro tope de cantidad en el camino**:
`subirImagen.ts` y `functions/api/subir.js` limitan el **lado** de la imagen
(1920 px), no cuántas se suben. Tampoco hay uno en la base.

#### Costo

`AdminPage.js` **+0,20 kB gzip**. Medido worktree contra worktree.

### UNA LISTA QUE SE RECORTA TIENE QUE DECIRLO — 2026-08-07

**El criterio, para cualquier lista nueva:** si se muestra un subconjunto, hay
que decir que hay más. Si no, el usuario no puede distinguir «no hay más» de
«hay más y no te los muestro», y concluye lo primero. Cuando la lista es un
catálogo, esa conclusión es «no lo tenemos».

Y antes de anunciar el recorte, preguntarse si hace falta recortar. En los dos
casos de esta tanda **no hacía falta**, y se quitó el tope en vez de explicarlo.

| Commit | Qué |
|---|---|
| `490fa33` | el buscador del paso 2 deja de recortar a 12 |
| `59c5feb` | el PDF muestra todas las amenidades |
| `b2df33d` | el botón de El Barranco y la flecha de la confirmación de reserva |

#### El buscador de cotizaciones: el tope no lo justificaba nada

Era `.slice(0, 12)` sobre `propsFiltradas`. Si la propiedad buscada era la
decimotercera, no aparecía y nada lo indicaba.

- **Espacio:** el contenedor **ya scrollea** — `maxHeight: 220` con
  `overflowY: 'auto'`. La lista nunca creció hacia abajo indefinidamente, así
  que el tope no ganaba un píxel.
- **Rendimiento:** son 53 propiedades, y la lista solo se pinta cuando hay
  término de búsqueda, ya filtrada.

Verificado con el componente real y 35 propiedades que coinciden: salen las 35
y la caja scrollea.

#### El PDF: medir con cadenas ÚNICAS

Las amenidades iban recortadas a 6 en un documento que se le manda al cliente.

Renderizando el PDF de verdad con `@react-pdf/renderer`: 6, 12, 30 y **60**
amenidades caben en una página, y recién a las **200** pasa a dos —fluyendo, sin
cortar—. El bloque es un `<Text>` en una fila con `flex: 1` y sin altura fija,
así que ajusta línea y empuja. No había razón de espacio.

**Trampa de método:** la primera medición usó amenidades repetidas y dio
**bytes idénticos** para 12, 24 y 40, lo que parecía recorte del layout. Era la
compresión Flate del PDF colapsando cadenas iguales. Con cadenas únicas el
tamaño crece monótono y la respuesta se ve. **Para medir crecimiento de un PDF,
contenido único.**

#### El UUID de El Barranco era el correcto

`eccfd92d-713e-4e0a-a074-ff76daffd81e` resuelve a «Hotel + Restaurante ·
Futaleufú», slug `hotel-restaurante-futaleufu-futaleufu-10d`, activo. El destino
estaba bien; sobraba la palabra «listado». Ahora dice «Volver a la propiedad» /
«Back to the property» y navega **por slug**, que evita la redirección
UUID→slug.

#### Barrido: lo que se revisó y se dejó

| sitio | qué es | veredicto |
|---|---|---|
| `Equipo.tsx:70,106` | `.slice(0,2)` sobre un nombre | **iniciales**, no una lista |
| `Contenido.tsx:214,231` · `CotizacionesAdmin.tsx:1099` | ellipsis sobre `p.titulo` / `c.prop_titulo` | **títulos**, excepción aceptada |
| `Propiedades.tsx:112` | ellipsis sobre el nombre del dossier | ídem |
| `HomePage.tsx:232` | `.slice(0, 6)` de destacadas | intencional y documentado |

#### Pendientes

- ~~**`Captacion.tsx`** (dominio Sofía): `.slice(0, 5)` en la conversación de un
  lead —línea 994— y los cinco `textOverflow: ellipsis` de las tarjetas de lead
  —141 y 779-783— sobre nombre, teléfono, comuna, presupuesto y plazo. Esos
  **no** son títulos: son datos que se cortan sin aviso.~~
  **CERRADO el 2026-08-09**, con una corrección: el `.slice(0, 5)` de la 994 no
  era la conversación, era `topComunas` en Métricas. La conversación no tiene
  ningún `.slice` — ya traía scroll propio. Ver «Captación — cierre de los nueve
  pendientes».
- **`Propiedades.tsx:279`**, `Array.from(files).slice(0, 20 - imagenes.length)`.
  No estaba en el encargo y no es un recorte de render sino de **subida**: si
  seleccionas 25 fotos con 0 cargadas, cinco se descartan sin decir nada. Mismo
  defecto, otra superficie.

#### Costo

**−0,01 kB gzip.** Se borró código, no se agregó.

### UX copy tanda 2 — vacíos, consistencia, tuteo e iconos — 2026-08-07

| Commit | Qué |
|---|---|
| `153765c` | una sola forma de estado vacío, con salida |
| `55ac084` | botones de alta, «volver» y menú móvil |
| `edf05b6` | tuteo en los tres textos que trataban de usted |
| `e9ed05e` | los emojis que quedaban pasan a lucide |
| `36a093e` | `agente_id` fuera del tipo |

#### `agente_id` NO EXISTE. No reintroducirlo.

Estaba declarado en `Propiedad` (`src/types/index.ts`) pero **la columna nunca
existió**: PostgREST responde `42703 column propiedades.agente_id does not
exist`. Grep sobre `src/`, `functions/` y `supabase/` daba **una** aparición: la
propia declaración.

Un campo fantasma en el tipo es peor que no tenerlo, porque cualquiera que lea
`Propiedad` asume que puede pedirlo y se entera de que no existe recién cuando
el SELECT devuelve 400 en producción. Pasó de verdad: el texto que se encargó
para la confirmación de borrado de agentes en la tanda 1 daba por hecho una
relación agente↔ficha que **no existe** — las fichas copian `asesor_nombre` /
`asesor_telefono` / `asesor_correo`, no referencian nada.

**Si hace falta asociar propiedades a agentes, primero la migración, después el
tipo.**

#### Dos cosas del encargo que no eran lo que parecían

**Los tres botones «sin +» ya tenían uno.** Era un `<Plus>` de lucide, no un
carácter. Agregar un `+` literal habría dado dos plus en el mismo botón. La
inconsistencia real era de mecanismo —seis con el carácter, tres con el
icono— y se unificó en el icono, que es adonde fue el resto del proyecto.

**Lo mismo con «Volver al admin» y «Volver al cliente»:** llevan un `<ArrowLeft>`
justo antes, así que ya se leen con flecha. Solo los seis «← Ir al admin»
necesitaban cambio. Regla para el futuro: **antes de anteponer un signo,
comprobar si ya está puesto como icono.**

#### Los emojis eran catorce, no cuatro

El encargo listaba los cuatro que había detectado la auditoría, pero el criterio
de verificación pedía cero emojis en el admin y en la ficha, así que se barrió
entero: `✓ ✏️ 📄 📧 ⏳ 🗑 🔗 🅿 📦 🏗 🖨️ 📌`. Los `🅿 📦 🏗` convivían en la **misma
fila** con iconos lucide, o sea eran leftovers evidentes.

Los `⏳` ganaron giro de paso: `Loader2` con `animate-spin`, que es utilidad de
Tailwind y no necesita CSS nuevo. Antes el reloj de arena estaba quieto.

**Dos se quedan a propósito, no se olvidaron:**

| dónde | qué | por qué |
|---|---|---|
| `Propiedades.tsx:824` | `{p.internacional ? '🌐' : '🇨🇱'}` | el globo hace pareja con la bandera chilena, que es excepción documentada |
| `PropiedadDetailPage.tsx:24` | `symbol: '✉'` | los otros de `SHARE_NETWORKS` son glifos de texto (`𝕏`, `in`) y se pintan igual |

La flecha `↗` de «Descargar ↗» se mantiene: la fila ya lleva un `FileText` a la
izquierda y un segundo icono lucide al otro extremo competiría por la misma
línea. Además `↗` es flecha tipográfica, la misma excepción que `←` y `→`.

#### Estados vacíos: la regla

**«Todavía no hay X.» más una frase de acción cuando la haya.** El que más gana
es el público: «No se encontraron propiedades» no decía que el problema eran los
filtros ni que se pudieran aflojar.

Se alinearon también los vacíos de Cotizaciones y Tarjetas, que no estaban en el
encargo pero decían «No hay X todavía» — dejarlos habría arreglado siete de
nueve.

Verificado en iframes de ancho real: a 390 el texto público ocupa 3 líneas y a
1440 una, sin desbordar.

#### Costo

**+0,65 kB gzip.** Casi todo es `iconos.js` (+0,42), que crece porque entran
nueve iconos nuevos de lucide. Medido worktree contra worktree.

#### Encontrado de paso, sin tocar

- **`ElBarrancoShowcase.tsx:522`** dice «Volver al listado» / «Back to listing»
  pero navega a `/propiedades/eccfd92d-…`, que es **la ficha de una propiedad**,
  no un listado. La etiqueta miente. No se tocó: hay que decidir si cambia el
  destino o el texto.
- **`ReservaConfirmacionPage.tsx:50`** dice «Volver al inicio» sin flecha,
  mientras que el de `App.tsx:72` la lleva. Es un botón de acción primaria tras
  el pago, no un enlace de vuelta, así que se dejó.

### UX copy tanda 1 — errores, borrados y confirmación de guardado — 2026-08-07

| Commit | Qué |
|---|---|
| `a1c53a9` | los 6 `alert()` crudos del dominio pasan a `avisarError()` |
| `8187a81` | la alerta de `avisarError` habla al usuario |
| `4cdcbd2` | las 8 confirmaciones de borrado nombran el elemento |
| `4ad82a8` | los 14 paneles confirman el guardado |

#### EL DETALLE TÉCNICO DE `avisarError` SE QUEDA EN CONSOLA. NO QUITARLO.

La alerta ya **no** muestra `code`, `message`, `details` ni `hint`. Eso no
significa que sobren: `console.error` los sigue recibiendo completos, y es lo
que permitió encontrar que `prop_pais` no existía como columna. Si alguien ve
que la alerta no los usa y decide limpiar el `console.error`, se pierde la
única forma de diagnosticar un fallo de escritura en producción.

Lo que ve el usuario ahora:

```
{contexto}.

No se guardó ningún cambio. Vuelve a intentarlo; si sigue fallando, abre
la consola del navegador y pásame el detalle.
```

La segunda frase es la que faltaba. El formulario **ya** quedaba abierto con lo
escrito —para eso `avisarError` devuelve `true`— pero nunca se lo decía, así que
un fallo se leía como pérdida del trabajo.

#### El texto de Agentes que se pidió NO era cierto

Se encargó «¿Eliminar a X? Sus fichas asignadas quedan sin agente». **No pasa
eso.** `ficha_propiedades` no referencia al agente: copia `asesor_nombre`,
`asesor_telefono` y `asesor_correo` al crearse. Borrar un agente no borra
fichas ni las deja huérfanas — solo desaparece de la lista para elegir asesor,
y eso es lo que dice el texto que quedó.

De paso: **`agente_id` está declarado en `src/types/index.ts` pero la columna
no existe en la base** (`42703: column propiedades.agente_id does not exist`) y
nada la usa. Es un campo fantasma del tipo.

#### Los borrados recargaban la lista aunque fallaran

Los cuatro `alert()` de borrado no cortaban el flujo: llamaban a `load()`
igual, así que la lista se recargaba como si la operación hubiera salido bien.
Al pasar a `avisarError` ganaron el `return` que les faltaba.

#### La píldora de guardado SÍ se extrajo

Estaba duplicada literal en los cinco paneles que la tenían. Ahora vive una vez
en `src/components/admin/acciones.tsx` como `Guardado` + `useGuardado`, y la
usan **los catorce**. El hook se lleva también el temporizador, que estaba
copiado con duraciones distintas —2000 ms en Vende, 2500 en el resto— y ahora
es 2500 en todos, con limpieza al desmontar.

Al migrar, cuatro paneles quedaron importando `Check` sin usarlo. `strict` está
en `false` en `tsconfig.json` y **el build no lo detecta**: hay que mirarlo a
mano.

#### Costo

`AdminPage.js` +0,37 kB gzip; el chunk nuevo `acciones.js` +0,54 kB. Total
**+1,20 kB gzip**. Medido worktree contra worktree.

#### Pendientes de esta tanda

- ~~**`Captacion.tsx`** (dominio Sofía): sus dos `alert()` crudos —línea 464,
  «No se pudo cambiar el modo», y 1115, «Error al eliminar»— y su confirmación
  «¿Cancelar esta visita?» siguen sin tocar.~~
  **CERRADO el 2026-08-09.** Ver «Captación — cierre de los nueve pendientes».
- **`TarjetasEquipo.tsx:189`**, `alert('El nombre es obligatorio.')`: es una
  validación de formulario, no un error de Supabase, así que no entraba en la
  migración a `avisarError`. Sigue siendo el único mensaje de validación propio
  del admin.

### EL TAGLINE ES UNO SOLO: «Tu socio confiable en bienes raíces» — 2026-08-07

Sin punto final cuando va como título; con punto cuando va como frase en el
footer o en un meta. **No inventar variantes.** Convivían cuatro:

| variante | dónde estaba |
|---|---|
| «Tu socio confiable en el mundo de los bienes raíces» | footer, i18n, defaults del admin |
| «Tu socio en bienes raíces» | hero, partido en 3 claves |
| «Tus Sueños en nuestras manos» | dorso de la tarjeta de presentación |
| **«Tu socio estratégico en bienes raíces»** | **meta tags, SEO, Quiénes Somos** |

La cuarta no estaba en el encargo y era la más visible de todas: es la que leen
Google y las vistas previas de WhatsApp y LinkedIn.

#### Lo que se cambió en código — commit `5916af3`

`index.html` (description, og:description, twitter:description), `SEO.tsx`,
`HomePage.tsx`, `QuienesSomosPage.tsx`, `markup.ts` (tarjeta),
`i18n.ts`, `Footer.tsx` y los 3 valores por defecto de `Contenido.tsx`.

#### Lo que NO se toca desde el código

Los valores **vivos** de `contenido_sitio` son contenido editable y se cambian
desde el admin. Lo que hay en `Contenido.tsx` es solo el respaldo para cuando
la clave no existe en la base.

| clave | valor actual | dónde se edita |
|---|---|---|
| `hero_titulo_1/2/3` | «Tu socio» / «en bienes» / «raíces» | Textos del sitio → **Inicio** → «Título y subtítulo del hero» → Línea 1, 2 y 3 |
| `qs_titulo` | «Tu socio estratégico en bienes raíces» | Textos del sitio → **Quiénes Somos** → «Título principal» |
| `footer_tagline` | «Tu socio confiable en el mundo de los bienes raíces.» | Textos del sitio → **Contacto y Redes** → «Texto del footer» |

#### La clave `tagline` está muerta

Existe en la base y en el mapa de defaults, pero **nadie la lee y no tiene
campo en el admin**. Por eso no se encontraba dónde editarla: no hay dónde, y
cambiarla no haría nada. El footer usa `footer_tagline`, que sí es otra clave.
Si algún día estorba, se borra; no se toca ahora porque no molesta.

Verificado que el tagline no aparece en `blog_posts` (13 filas),
`paginas_legales` (3) ni `propiedades` (53).

### La línea de Captación, y por qué `scrollWidth` no la detectaba — 2026-08-07

Commit `1b2095c`. Invasión de dominio autorizada, **una sola línea**:

```
minmax(380px, 1fr)  →  minmax(min(380px, 100%), 1fr)
```

| viewport | antes (tarjeta/caja) | después |
|---|---|---|
| 360 | 380/306 → **se salía 74 px** | 306/306 |
| 390 | 380/336 → **44 px** | 336/336 |
| 430 | 380/376 → **4 px** | 376/376 |
| 1024 | 477px × 2 | **idéntico** |
| 1440 | 518px × 2 | **idéntico** |

**Lo que hay que recordar:** el síntoma no era una barra de scroll horizontal
sino **contenido cortado**. `body` lleva `overflow-x: clip` en `globals.css`,
así que el desborde se recorta en vez de generar scroll, y
`scrollWidth - innerWidth` da **0 en los dos casos**. Esa métrica no sirve para
detectar este tipo de defecto en este sitio: hay que comparar el borde de la
tarjeta con el de su contenedor.

Y de nuevo: `Emulation.setDeviceMetricsOverride` **no se re-aplica** al abrir
una sesión CDP nueva sobre la misma pestaña. Cinco mediciones seguidas
reportaron los cinco el mismo viewport. **Iframes de ancho real**, como ya
estaba anotado.

### Editor de unidades, y la trampa de `undefined` con supabase-js — 2026-08-07

| Commit | Qué |
|---|---|
| `58d4fad` | suprimir la selección de texto mientras dura el arrastre |
| `c67cd20` | el editor de unidades |

#### `undefined` NO vacía una columna: la deja fuera del UPDATE

Es lo más importante de esta entrada y aplica a **cualquier campo opcional
que se edite desde el admin**, no solo a `unidades`.

`supabase-js` serializa el payload con `JSON.stringify`, y `JSON.stringify`
descarta las claves cuyo valor es `undefined`:

```js
JSON.stringify({ unidades: undefined })  // {}                    ← la columna ni se menciona
JSON.stringify({ unidades: null })       // {"unidades":null}     ← la columna queda en NULL
JSON.stringify({ unidades: [] })         // {"unidades":[]}       ← array vacío, que NO es NULL
```

O sea: si el formulario manda `undefined`, **el valor anterior sobrevive** al
guardado. Borrar todas las unidades y guardar habría dejado las 42 de siempre
en la base, y el admin habría dicho que guardó. Es la misma familia de fallo
silencioso que motivó `avisarError`.

Por eso la conversión vive en `save()` y no en el componente:

```js
unidades: editing.unidades?.length ? editing.unidades : null
```

**Regla para el futuro: para vaciar una columna desde el admin, `null`
explícito. Nunca `undefined`, nunca omitir la clave.**

#### `null` y `[]` se ven igual en la ficha, pero no son lo mismo

`PropiedadDetailPage` hace `Array.isArray(prop.unidades) ? prop.unidades : []`
y sale si el largo es 0, así que los dos estados no dibujan nada. La ficha
genérica de oficinas se vería igual con `[]`. Se manda `NULL` igual, porque es
lo que dice la migración y porque el RAG de Sofía —que vive en otro repo— sí
podría distinguirlos.

#### `m2`: null y 0 se distinguen sin inventar centinelas

`Inp` entrega **siempre** un string, así que `''` llega distinguible de `'0'`.
`''` ⇒ `null` (la ficha muestra "Por confirmar"), `'0'` ⇒ `0`. Verificado en el
payload: `[{"piso":"PB","m2":0}]` frente a `[{"piso":"23 a 25","m2":null}]`.

#### Dos defectos que aparecieron al probar, los dos reales

**1 · El setter no puede leer del closure.** El oyente que sigue el arrastre se
monta **una sola vez**, en el `pointerdown`. Si el adaptador de `setItems` lee
`items` de la clausura, cada paso del reordenamiento parte del array original.
Medido paso a paso: un arrastre de dos posiciones daba

```
paso  4  destino=1  → [20, 3, 23a25]      correcto
paso 10  destino=2  → [3, 23a25, 20]      partió otra vez del original
```

La cura es el ref actualizado en el acto, el mismo patrón que ya estaba en
`PropImageManager`. **Cualquier consumidor nuevo de `usePointerSort` que no
use un `useState` propio necesita ese ref.**

**2 · La selección de texto compite con el arrastre.** Con el ratón, arrastrar
por encima de las filas empieza a seleccionar texto. El sidebar no lo sufría
porque lleva `userSelect: 'none'` inline; la tabla de Propiedades y las listas
nuevas sí. Ahora el hook lo suprime en `document.body` solo mientras dura el
arrastre y lo restaura al soltar — no fijo en la fila, porque estas listas
llevan campos de texto adentro.

#### Costo

`AdminPage.js` +3,95 kB sin comprimir, **+0,81 kB gzip**. Medido worktree
contra worktree.

#### Método: el panel real contra un PostgREST falso

El admin pide sesión, así que no se puede manejar desde fuera, y escribir en
producción para probar no es opción. Se empaquetó el componente **real** con
esbuild apuntando `import.meta.env` a un servidor local que devuelve dos
propiedades fijas y **registra el cuerpo crudo de cada escritura**. Eso permite
ver exactamente qué JSON habría viajado, que es justo donde vive la trampa de
`undefined`.

Tres cosas que costaron y conviene no repetir:

- El bundle servido **sin `charset=utf-8`** se decodifica como latin-1 y revienta
  el regex de diacríticos de `slugify`. El servidor de pruebas tiene que mandar
  el charset.
- **`npm run build` vacía `dist/`**, y se lleva por delante los archivos de
  prueba que se hayan dejado ahí.
- React mapea `onBlur` a **`focusout`**, no a `blur`. Un `blur` sintético no
  dispara el `onBlur` deliberado de `Inp` y nada se propaga — parecía que los
  campos no guardaban.

Y dos falsos positivos que costaron más que los defectos reales: medir con las
filas **fuera del viewport** (los eventos sintéticos no llegan, y en táctil el
navegador lo toma como scroll y manda `pointercancel`), y localizar campos por
un `placeholder` que se repite cuatro veces en la página. Los selectores de
prueba van **relativos a la fila**, nunca globales.

### TipTap alineado — ya no hace falta `--legacy-peer-deps` — 2026-08-07

```bash
npm install        # a secas. Sin --legacy-peer-deps.
```

Verificado con una instalación desde cero, sin `node_modules` ni lockfile:
exit 0 y los 32 paquetes en 3.23.6.

#### El conflicto no era el que parecía

Se veía como «`@tiptap/extension-image` está en 3.23.4 y el resto en 3.23.1».
La causa de fondo es otra: **TipTap declara sus dependencias internas con
caret pero sus peers con versión exacta** —`peer @tiptap/core@"3.23.6"`—, así
que cualquier desfase de resolución rompe.

Dos intentos fallidos antes de dar con la forma correcta, los dos vale la pena
conocerlos:

| intento | qué pasó |
|---|---|
| todo en `^3.23.6` | árbol partido: 10 paquetes en 3.23.6 y 24 en 3.29.2 |
| versión exacta en las 9 declaradas | los 20 sub-paquetes de `starter-kit` son transitivos y siguen flotando |

Con el árbol partido **el build falla**, con doce errores de tipos:
`toggleBold`, `toggleHeading` y compañía desaparecen de `ChainedCommands`
porque las augmentaciones de tipos vienen de versiones distintas. Si alguien ve
esos errores, el diagnóstico es éste y no un problema del editor.

Lo que funciona es **`overrides` cubriendo los 32**, transitivos incluidos.
Están en `package.json`. **No quitarlos**: sin ellos el árbol se vuelve a
partir en la siguiente instalación.

#### Se queda en 3.23.x a propósito

Alinear en 3.29.2 también resolvería el conflicto, y de hecho es adonde flotan
los sub-paquetes solos. Pero son seis versiones menores de salto en el editor
del blog, de las páginas legales y de las descripciones de propiedad, sobre
contenido **ya publicado**. 3.23.1 → 3.23.6 es un parche. Si algún día hace
falta subir, que sea una etapa propia con su prueba de contenido.

#### El editor, probado

Con el componente real empaquetado con esbuild, cargando el mismo HTML que ya
hay publicado. Va y vuelve intacto: `h2`, negrita, cursiva, enlace con `target`
y `rel`, lista, cita, alineación, color e imagen. Los **16 controles** de la
barra responden, sin errores de consola.

Son **tres** los consumidores, no dos: `Blog`, `PaginasLegales` y también las
descripciones de `Propiedades`.

Nota de método: la primera pasada dio cuatro fallos y los cuatro eran de la
prueba, no del editor. Tres botones caían fuera de un viewport de 390 px que
había quedado del override móvil de las pruebas de arrastre —Chrome lo conserva
entre navegaciones—, y el de color fallaba porque asignar `.value` a un
`input[type=color]` no dispara el `onChange` de React: hay que usar el setter
nativo del prototipo. **Fijar el viewport al empezar cada prueba.**

### El `.DS_Store` público no existe — 2026-08-07

`sdmcapital.cl/.DS_Store` responde **200**, y por eso parece que expone el
archivo. No lo expone: devuelve `index.html`.

```
/.DS_Store              200   4901 bytes   sha 9af21f0f3f8b
/esto-no-existe-xyz123  200   4901 bytes   sha 9af21f0f3f8b
/                       200   4901 bytes   sha 9af21f0f3f8b
```

Los tres son el mismo archivo. Lo hace `public/_redirects`, que tiene un
catch-all de SPA:

```
/*  /index.html  200
```

**Consecuencia general, más allá del `.DS_Store`: en este sitio ninguna URL
devuelve 404 nunca.** Cualquier comprobación del tipo «¿existe este archivo en
producción?» hecha mirando el código de estado va a dar un falso positivo. Hay
que comparar el contenido, o el hash, contra el de `/`.

No había nada que borrar ni que ignorar: `.DS_Store` ya estaba en `.gitignore`
desde antes, y `git ls-files` no devolvía ninguno. Los cuatro que había en el
disco eran locales y sin versionar; se borraron, pero no generaron commit
porque no había nada que commitear.

### Ya no queda arrastre HTML5 en el proyecto — 2026-08-07

**Regla: no reintroducir `draggable` + `onDragStart` / `onDragEnter` /
`onDragEnd`.** Esa API no dispara desde eventos táctiles ni en iOS ni en
Android, así que cualquier reordenamiento escrito así nace roto en teléfono.
Para reordenar hay una sola herramienta: `usePointerSort` en
`src/components/admin/useDragSort.ts`.

Los únicos `draggable` que quedan en `src/` son de Leaflet (`MapPicker`,
`PropertyMap`) y no tienen nada que ver.

| Commit | Qué |
|---|---|
| `4352f9a` | el arrastre se termina desde `window`, no desde la fila |
| `a14eeae` | los dos de `Contenido` |
| `1347901` | `PropImageManager` + `[data-orden-quieto]` |
| `94f9697` | las dos fichas de cliente |

#### Cuatro de los cinco sitios son grilla, no lista

| sitio | forma | manija |
|---|---|---|
| `PropImageManager` | grilla 3/4/5 col | ya existía de adorno |
| `CarouselPhotoManager` | grilla 2/3/5 col | ya existía de adorno |
| `HomeDestacadasSelector` | **lista** | `GripVertical` suelto |
| `FichaClienteNueva` / `Editar` | grilla `auto-fill 110px` | **no tenían** |

`usePointerSort` **no asume una sola dimensión**: busca el destino con
`document.elementFromPoint` y reordena con `splice`, que es exactamente lo que
hacían las cuatro implementaciones HTML5. Verificado con un arrastre en
diagonal sobre una grilla de 3×3: `ABCDEFGHI` → `BCDEAFGHI`.

#### El bug que apareció al probar las grillas

Soltar **fuera** de la lista dejaba el reordenamiento hecho en pantalla pero
**sin guardar**, y el commit salía después pegado a un toque cualquiera y sin
relación con él. Medido: arrastrar y soltar afuera daba `commits []`, y el
siguiente toque simple disparaba el commit.

Estaba en el hook desde el principio, o sea también en el sidebar, Propiedades,
Equipo y Asociados. No se había visto porque en una lista de una columna se
suelta casi siempre sobre otra fila; en una grilla de tres columnas soltar
fuera es facilísimo.

`setPointerCapture` **no alcanza** para cubrirlo. Si React desmonta la fila que
capturó, la captura se va con ella — y le pasa a cualquier lista que lleve el
índice dentro de la `key`, como `PropImageManager` con `key={url + i}`. Y
aunque la fila sobreviva, un `pointerup` fuera del contenedor no llega a ningún
handler nuestro.

Ahora `pointermove` / `pointerup` / `pointercancel` se escuchan en **`window`**
mientras dura el arrastre, y se quitan al terminar y al desmontar. La función
de guardado va por un ref: los consumidores la pasan como arrow inline y cambia
de identidad en cada render, mientras que los oyentes se instalan una sola vez
por arrastre.

Nota de método: la primera versión de esta prueba comparaba el **orden** antes
y después y lo daba por bueno. El orden no era el problema —cambiaba
correctamente—; el que faltaba era el **commit**. Si se vuelve a probar un
reordenamiento, mirar lo que se guarda, no lo que se ve.

#### `[data-orden-quieto]`

Las celdas del toggle y de Editar/Eliminar de `Propiedades` llevaban
`draggable={false}` para no iniciar un arrastre desde ahí. Con Pointer Events
ese atributo **no tiene ningún efecto**, así que desde el `ae82003` de esta
misma tarde arrastrar el botón Eliminar reordenaba la fila. Ahora el descarte
es explícito: cualquier elemento dentro de `[data-orden-quieto]` no arranca un
arrastre. Verificado en los dos sentidos.

Si mañana se agrega un botón dentro de una fila arrastrable, ese atributo es la
forma de excluirlo.

#### Estados que no son un `useState`

Dos de los cinco no tenían un array en estado propio y hubo que darle al hook
un setter que entienda las dos formas de `SetStateAction`:

- **`CarouselPhotoManager`** — `urls` es una vista de `d` sobre las
  `HERO_KEYS`; el setter reescribe las claves.
- **`PropImageManager`** — `imagenes` es controlada por el formulario; el
  setter reenvía a `onChange`. Acá además el ref de apoyo se actualiza **en el
  acto** y no solo en el render: si dos movimientos del puntero caen en el
  mismo frame React los agrupa, y sin eso el segundo partiría del orden viejo y
  se comería el primero.

Las ranuras vacías del carrusel siguen sin llevar `filaProps`: ni se arrastran
ni son destino, igual que antes con `draggable={!!url}`.

#### Costo: cero

| | sin comprimir | gzip |
|---|---|---|
| `AdminPage.js` | −2,02 kB | −0,72 kB |
| `subirImagen.js` | +2,01 kB | +0,84 kB |
| **total** | **−0,03 kB** | **+0,06 kB** |

`subirImagen.js` crece exactamente lo que baja `AdminPage.js`: al usar el hook
también las fichas de cliente, Rollup lo movió al chunk compartido. Borrar
cuatro implementaciones duplicadas paga el hook compartido casi al peso.

Medido **worktree contra worktree**, como corresponde desde el sesgo detectado
en la etapa anterior.

### Admin móvil — cajón que bloquea el fondo y arrastre en táctil — 2026-08-07

Dos commits.

| Commit | Qué |
|---|---|
| `306b2c0` | con el cajón abierto el fondo no scrollea |
| `ae82003` | reordenar por arrastre con Pointer Events |

#### Bloquear el scroll cuesta el header sticky. Con TODAS las técnicas.

Esto no estaba previsto y es lo más útil de anotar. Cualquier forma de impedir
que el documento scrollee desprende un `position: sticky`, porque **`sticky` es
función del scroll**: si el documento deja de scrollear, el header vuelve a su
posición natural, que con la página a 1200 px está 1200 px por encima del
viewport.

Medido a 390×844 con las tres variantes, con la página a scroll 1200:

| técnica | ¿bloquea? | `header.top` |
|---|---|---|
| `body { position: fixed; top: -scrollY }` | **sí** | −1200 |
| `body { overflow: hidden }` | **no** — siguió scrolleando a 1936 | −1200 |
| `html` + `body { overflow: hidden }` | sí | −1200 |

Se eligió `position: fixed` porque es la única que funciona en iOS: ahí
`overflow: hidden` sobre body **no alcanza**, Safari sigue scrolleando igual.

El precio de `position: fixed` es que el body deja de estar desplazado, así que
hay que compensar con `top: -scrollY` y devolver el scroll a mano al cerrar. El
`scrollTo` va con **`behavior: 'instant'`**: `globals.css` pone
`scroll-behavior: smooth` en `html` y sin eso la vuelta se ve como un salto
animado. Es la tercera vez en esta sesión que ese `smooth` muerde.

Y para el header desprendido: mientras el cajón está abierto pasa a `fixed` y
el contenedor lleva un relleno igual a su alto —medido con
`getBoundingClientRect` justo antes de abrir, porque en móvil el header no usa
`--admin-header-h`— para que el contenido no salte al sacarlo del flujo.
Verificado: el contenido no se mueve **ni un píxel** al abrir ni al cerrar.

Los valores de `document.body.style` se guardan y se restauran, no se fuerzan a
un valor fijo: si el efecto se interrumpe, el sitio vuelve a como estaba y no a
un `overflow: visible` inventado por nosotros. Comprobado que `body` queda sin
atributo `style` residual.

#### El sidebar NO usaba `useDragSort`

Tenía su propia copia inline del mismo algoritmo, con sus propios
`dragTab` / `dragOverTab`. Eran dos implementaciones del mismo reordenamiento
en dos archivos. Ahora la mecánica vive una sola vez en **`usePointerSort`**, y
`useDragSort` es esa mecánica más la sincronización desde props que necesitan
los tres paneles. El sidebar usa `usePointerSort` directo porque su orden vive
en `localStorage` y en estado local: la sincronización de `useDragSort` ahí
sobraría y pelearía.

#### Ratón desde toda la fila, dedo solo desde la manija

No es una inconsistencia, es la única combinación que funciona. Con el dedo, si
se pudiera arrastrar desde cualquier parte de la fila **no quedaría forma de
scrollear la lista**. Con el ratón esa restricción no compra nada y achicaría
el blanco de la interacción que hoy se usa.

`touch-action: none` va **solo en la manija**, no en la fila: le dice al
navegador que un gesto que empieza ahí no es un scroll, y deja el resto de la
fila scrolleando como siempre.

Umbral de **6 px** antes de que cuente como arrastre: cualquier toque con el
dedo trae uno o dos px de temblor, y sin umbral un toque simple reordenaría.

Medido contra el hook real —empaquetado con esbuild, no una reimplementación
del test—:

| | resultado |
|---|---|
| ratón, arrastre desde el CUERPO de la fila | `ABCDEF` → `BCDAEF`, un commit |
| ratón, click posterior al arrastre | **no se dispara** |
| ratón, click simple | selecciona, orden intacto |
| dedo, arrastre desde la MANIJA | `ABCDEF` → `BCDAEF`, un commit |
| dedo, toque simple en la manija | no reordena |
| dedo, arrastre desde el CUERPO | orden intacto, la lista scrollea 0 → 370 px |

#### Lo único que se pierde

El fantasma semitransparente que dibujaba el navegador solo con la API HTML5.
No hay forma de conservarlo fuera de esa API. Se reemplaza reordenando la lista
**en vivo** durante el arrastre, que además muestra el resultado antes de
soltar.

#### Costo

`AdminPage.js` **+1,82 kB** sin comprimir, **+0,79 kB** gzip. Pointer Events es
más código que las ocho líneas de la API HTML5; se paga por tener la función en
el teléfono.

Nota de método: la primera medición dio `index.js` +0,41 kB y
`ReservaConfirmacionPage` +0,04 kB, dos chunks que este cambio no toca. Era
sesgo de comparar un build en worktree contra uno en el directorio principal.
Repetido **worktree contra worktree** esos dos desaparecen. Si se vuelve a
medir un delta de chunks: las dos puntas del mismo tipo de directorio.

#### Alcance mayor al anunciado

El brief acotaba el dominio a `AdminPage.tsx` y `useDragSort.ts`, dando por
hecho que el sidebar usaba el hook. Como no lo usaba, cambiar la API del hook
obligaba a tocar también sus tres consumidores: `Propiedades.tsx`,
`Equipo.tsx` y `Asociados.tsx`. Los tres ya tenían su `GripVertical`; solo hubo
que envolverla en `manijaProps`. En `Propiedades` además se destapó debajo de
`lg`, donde estaba oculta por el mismo motivo que la del sidebar: como la fila
es `flex-wrap` y la celda del título lleva `w-full`, la manija queda en su
propia franja arriba de la tarjeta.

### Fase 3 — Tailwind: hover a CSS y la migración masiva DESCARTADA — 2026-08-07

Cuatro commits. Ninguno migra `style={{}}` a clases: esta etapa solo hace lo
que **borra** código.

| Commit | Qué | Saldo |
|---|---|---|
| `f86250e` | 17 clases muertas fuera de `globals.css` | −15 líneas |
| `9748d55` | los 20 hover del admin pasan a `hover:` | −20 handlers |
| `9f8208f` | Header (20) y Footer (14) | −34 handlers |
| `8d5ca39` | las 10 páginas públicas restantes | −36 handlers |

#### La decisión: NO se migran los 1.457 `style={{}}`

El inventario del paso 0 midió el objetivo antes de tocarlo, y el número lo
desaconsejó:

| | |
|---|---|
| objetos `style={{}}` | **1.457** en 56 archivos |
| peso en el bundle | **115,8 kB**, el **3,2 %** |
| propiedad más repetida | `border` (158), después `lineHeight` (112) |

El 3,2 % no es lo que decide. Lo que decide es que **migrar transforma, no
elimina**: un `style={{ border: '1px solid var(--border)' }}` que pasa a
`className="border border-[var(--border)]"` sigue ocupando bytes, ahora en el
CSS en vez del JS. En `border` y `lineHeight` —las dos propiedades más
repetidas, 270 apariciones entre las dos— la migración no gana nada: Tailwind
genera una utilidad por valor distinto y el ahorro se lo come la clase.

Se descarta 1.457 ediciones de riesgo real sobre un sitio en producción a
cambio de un ahorro que no está demostrado. Si alguien lo vuelve a proponer,
el número que hay que rebatir es ese: **3,2 %, y transformando en vez de
eliminando**.

#### Lo que sí se hizo: hover

Los 90 `onMouseEnter`/`onMouseLeave` que solo cambiaban apariencia sí eran
JavaScript eliminable de verdad. Quedan **4** en todo el proyecto, los del
`Header` que abren los desplegables — ésos mueven estado, no color.
`Captacion.tsx` no tenía ninguno.

Con ellos se fueron tres `useState` de `ElBarrancoShowcase`, que existían solo
para escalar una imagen. El wrapper lleva `group` y el `<img>`
`group-hover:scale-[1.06]`.

**La trampa:** el `style` inline gana siempre sobre la clase. Si el handler
pisaba una propiedad que también estaba en el `style`, hay que **sacarla del
`style`** — dejarla anula el `hover:` en silencio, sin error de build y sin
que se note salvo pasando el mouse por encima.

#### El bundle SUBIÓ, y era previsible

Se esperaba que bajara. Medido contra `7d1994b`, construyendo las dos puntas:

| | sin comprimir | gzip |
|---|---|---|
| JS | **−5,49 kB** | −0,18 kB |
| CSS | **+3,54 kB** | +0,46 kB |
| **total** | **−1,91 kB** | **+0,28 kB** |

Sin comprimir baja; **gzipeado sube**, que es lo que se transfiere. El JS que
se borró era la misma cadena repetida 90 veces y gzip ya la reducía casi a
nada; las utilidades `hover:` que la reemplazan son cadenas distintas entre
sí. La razón para hacer este cambio es que hay 90 handlers menos que mantener,
no el peso.

#### Las 17 clases muertas eran 17, no 13

Se listaron 13 —"ocho de color"— y eran **doce**: `.text-navy`,
`.text-navy-dark`, `.text-green-sdm`, `.text-sky-sdm`, `.text-muted`,
`.bg-navy`, `.bg-navy-dark`, `.bg-navy-deeper`, `.bg-green-sdm`,
`.bg-sky-pale`, `.bg-off`, `.border-sdm`. Todas duplicaban lo que Tailwind ya
genera desde la paleta de `tailwind.config.js`.

Verificado con `querySelectorAll` sobre la página renderizada en 14 rutas —
**no con grep**, por lo que pasó con `section.relative` en `mobile.css`: un
`class="relative …"` donde la clase no va primera no aparece en un grep
posicional y se declara muerto lo que está vivo.

#### El `hover:` se queda pegado en táctil — y ya se quedaba antes

En Tailwind 3.4 `hover:` **no** va envuelto en `@media (hover: hover)`; eso es
opt-in vía `future.hoverOnlyWhenSupported`, y este proyecto no lo tiene. Así
que en teléfono el estado persiste tras el toque.

Medido en Chrome con touch emulado, dos botones idénticos lado a lado, uno con
`:hover` de CSS y otro con `onmouseenter`, tocando **uno por vez**:

| | reposo | tras tocarlo | tras tocar afuera |
|---|---|---|---|
| CSS `:hover` | verde | **navy** | verde |
| JS `onmouseenter` | verde | **navy** | verde |

Idénticos. La persistencia existía antes de la migración y existe después: el
navegador sintetiza `mouseenter` en el toque y no manda `mouseleave` hasta el
siguiente toque en otro lado. **No es una regresión** y no hay nada que
arreglar acá.

El primer intento de esta medición tocaba los dos botones seguidos, así que el
primero perdía el hover porque se tocó el segundo, no por el mecanismo. Si se
vuelve a medir: **un elemento por vez**.

### Fase 3 — Limpieza: `FotosAdmin` eliminado y comentarios al día — 2026-08-06

Dos commits. Cierra las dos deudas que el refactor fue dejando anotadas.

| Commit | Qué |
|---|---|
| `5d392f2` | borrado de `FotosAdmin` |
| `71dbb6d` | comentarios desactualizados |

#### Por qué se borró `FotosAdmin`

Leía de **Supabase Storage**, no de R2, que es donde viven las imágenes del
sitio desde hace meses. La documentación del proyecto ya decía que no debía
usarse para fotos de propiedades porque apunta a otra carpeta. Además los 390
archivos huérfanos de Supabase Storage se borran después del **2026-09-01**,
así que el panel iba a quedar listando archivos inexistentes.

Se eliminó el componente, su entrada en `DEFAULT_TABS`, su rama de render,
`'fotos'` del tipo `Tab` y los imports que quedaron huérfanos: `subirImagen` y
los iconos `Image`, `Check` y `X`, que solo usaba ese panel. **`supabase` se
queda**: lo usan `useAdminAuth`, `LoginForm` y el botón de cerrar sesión.

#### El riesgo era `localStorage`, y estaba cubierto

`STORAGE_KEY` persiste el orden de pestañas como array de claves. Si Víctor
tenía `'fotos'` guardado y la clave desaparece de `DEFAULT_TABS`, el admin
tenía que ignorarla sin romperse.

`loadTabOrder` **ya lo manejaba**, sin necesidad de tocarlo:

```js
const sorted = order.map(key => DEFAULT_TABS.find(t => t.key === key)).filter(Boolean)
DEFAULT_TABS.forEach(t => { if (!sorted.find(s => s.key === t.key)) sorted.push(t) })
```

`.find()` devuelve `undefined` para una clave desconocida, `.filter(Boolean)`
la descarta, y el `forEach` reincorpora las pestañas que falten. Se simularon
cuatro casos —`'fotos'` en medio del orden, `'fotos'` como única clave
guardada, sin nada guardado y JSON corrupto— y los cuatro dan 12 pestañas sin
huecos.

**La pestaña activa no se persiste** (`useState<Tab>('propiedades')`), así que
tampoco podía quedar apuntando a un panel inexistente.

#### Comentarios corregidos

| Archivo | Qué decía | Qué se hizo |
|---|---|---|
| `Barranco`, `Rental`, `Vende` | `// Sec y Full: definidos a nivel de módulo, junto a ContenidoAdmin.` | borrado — falso desde la Etapa 2 |
| 8 paneles | `Extraída de AdminPage.tsx sin cambios: mismo markup` | reescrito: la etapa de iconos **sí** cambió el markup |
| `layout.tsx` | `Las usan ContenidoAdmin, BarrancoAdmin, RentalAdmin y VendeAdmin` | nombres actuales |
| `useDragSort.ts` | `Lo usan PropiedadesAdmin, Equipo y Asociados` | nombres actuales |

`Blog.tsx` y `Mensajes.tsx` **conservan la redacción original** de la
cabecera: en esos dos sigue siendo exacta, porque la etapa de iconos no los
tocó. Verificado con `git diff --name-only` entre `6032ff1` y `81a8940`.

La nota histórica de `layout.tsx` sobre el bug de remontaje se conserva —es el
motivo de la regla— pero con los nombres actuales, para que se puedan
encontrar en el repo.

El commit de comentarios **no cambió ni una línea de código**, y el chunk
`AdminPage` conservó el hash exacto. Es la prueba de que fue solo prosa.

#### Chunks

| Chunk | Iconos | Limpieza | Delta |
|---|---:|---:|---:|
| `AdminPage` | 176,10 kB | **172,83 kB** | **−3,27 kB** |
| `pdf` | 2.054,86 kB | igual | — |
| `iconos` | 30,67 kB | **mismo hash** | — |
| `index` | 238,90 kB | igual | — |

`iconos` no bajó porque `Image`, `Check` y `X` los siguen usando otros
paneles; lo único que se fue es el uso que hacía `FotosAdmin`.

`pdf` sigue fuera de los imports estáticos del chunk `AdminPage`. `index`
difiere en 37 caracteres: `errores` y `subirImagen` volvieron a permutarse en
`__vite__mapDeps` porque `AdminPage.tsx` dejó de importar `subirImagen`.
Verificado que las 9 rutas lazy precargan el mismo conjunto de chunks.

### Sesión RLS vistas de métricas — 2026-08-05

Migración `20260805000500_rls_vistas_metricas.sql`, aplicada.

#### Una vista sin `security_invoker` es un bypass de RLS

`metricas_calidad`, `metricas_costo`, `metricas_descartes` y
`metricas_operacion` eran vistas con dueño `postgres` y sin
`security_invoker`. Una vista sin esa opción **se evalúa con los privilegios
de su dueño**, no con los de quien consulta. `postgres` es superusuario, así
que saltaba RLS por completo.

Con `GRANT SELECT` para `anon` sobre las cuatro, cualquiera con la anon key
del bundle leía a través de ellas las tablas internas de Sofía que están en
deny-all.

Medición con la anon key, antes y después de la migración:

| Vista | Antes | Después |
|---|---:|---:|
| `metricas_calidad` | 3 | 0 |
| `metricas_costo` | 3 | 0 |
| `metricas_descartes` | 1 | 0 |
| `metricas_operacion` | 3 | 0 |

Al mismo tiempo, `eventos_turno`, `mensajes_pendientes`, `decisiones_shadow` y
`eventos_procesados` devolvían 0 a `anon`. **Las tablas negaban el acceso y
las vistas lo concedían igual.**

#### Por qué este agujero es fácil de pasar por alto

No aparece en `pg_policies`: las vistas no tienen políticas. Tampoco aparece
en `pg_class` filtrado por `relkind = 'r'`, porque una vista es `relkind = 'v'`.
Una auditoría que solo mire tablas y políticas lo da por cerrado.

Para encontrarlas:

```sql
select c.relname, c.reloptions
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'v';
```

Si `reloptions` no incluye `security_invoker=true`, la vista corre con los
privilegios de su dueño.

**Regla para el futuro: toda vista nueva sobre tablas con RLS debe crearse con
`WITH (security_invoker = true)`.** Lo mismo aplica a las funciones
`SECURITY DEFINER`.

#### Sobre los paneles

Ningún archivo de este repo consulta las cuatro vistas. Si algún panel del
admin las usara, quedaría vacío: el admin consulta como `authenticated`, y las
tablas base están en deny-all también para ese rol.

Si eso pasa, **no** agregar políticas para `authenticated` sobre las tablas
base. La salida correcta es una función `SECURITY DEFINER` acotada que
devuelva solo el agregado que el panel necesita.

### Sesión banner promocional — 2026-08-05

Esta sesión entra en **`src/pages/AdminPage.tsx`, que es dominio de la sesión
admin** — concretamente en `ContenidoAdmin`, pestaña Inicio, para agregar la
sección "Banner promocional". Queda avisado acá porque es una invasión de
dominio, no un archivo compartido.

También toca `src/components/sections/` y `src/pages/HomePage.tsx`, que son de
la sesión web pública, y **`functions/api/subir.js`, que es dominio de la sesión
Sofía / chatbot**: se agregó `'banner/'` a la lista `PREFIJOS`. Sin ese prefijo
el endpoint rechaza la subida de la imagen del banner. Es una línea, pero está
en territorio ajeno.

Además se subieron `Sec` y `Full` a nivel de módulo en `AdminPage.tsx`. Estaban
definidos dentro de `ContenidoAdmin`, `BarrancoAdmin`, `RentalAdmin` y
`VendeAdmin` — cuatro copias idénticas. Al recrearse en cada render, React
desmontaba y remontaba el árbol completo, y la página saltaba al inicio con
cada cambio de switch. Si otra sesión vuelve a definirlos adentro, el bug
reaparece.

Las claves nuevas (`banner_activo`, `banner_titulo`, `banner_subtitulo`,
`banner_cta_texto`, `banner_cta_url`) viven en `contenido_sitio` y **no
requieren migración**: el admin las crea con el primer guardado y el
componente tiene los mismos valores por defecto vía `useContenido`.

### Sesión inventario oficinas — 2026-08-05

`src/pages/PropiedadDetailPage.tsx` es dominio de la **sesión web pública**, y
`src/types/index.ts` es zona compartida. Esta sesión los toca de todas formas
para el render de unidades; queda avisado acá. El admin y el banner del home
**no** se tocan — eso viene en una etapa posterior.

Migraciones `20260805000000` y `20260805000100` **ya aplicadas** contra
`ugfhgfpgxyfzafudxaeo`. La base cambió: `propiedades` tiene columna `unidades`
(jsonb, nullable) y 10 filas nuevas de tipo `oficina`.

### Cambio de estrategia — los 10 edificios NO se publican

Migración `20260805000200`, también aplicada.

Los 10 edificios cargados en `20260805000100` quedan **pausados de forma
permanente**: son referencia interna. Publicarlos expondría las direcciones de
la cartera del socio.

- **No borrarlos.** Los datos y las 42 unidades se conservan.
- **No activarlos.** `activo = false` es deliberado y definitivo, no un estado
  transitorio a la espera de fotos.

Lo que sí se publica es una ficha genérica, `oficinas-arriendo-santiago-centro`:
comunica volumen y rango de superficies sin decir dónde está nada. Va sin
`direccion`, sin `map_address` y sin `map_lat` / `map_lng` a propósito —
cualquiera de esos campos reintroduciría lo que se está protegiendo. Su
`unidades` es NULL para que la ficha no dibuje el desglose piso por piso.

Esa sí está publicada: se le cargaron 10 fotos desde el admin y quedó con
`activo = true` el 2026-08-05.

### Sesión admin cerrada el 2026-08-02

Último commit: `933fac8`. Árbol limpio y producción verificada contra `HEAD`
(mismos hashes de assets, chunks diferidos y `/api/imagen` respondiendo).

Trabajo de la sesión, en orden:

1. Accesibilidad: contraste WCAG AA, `focus-visible`, sanitización con DOMPurify,
   lazy loading de imágenes.
2. TypeScript: de 38 errores a 0, `tsc` incorporado al script de build,
   `thumbUrl()` en las miniaturas del catálogo.
3. Rendimiento del admin: PDF bajo demanda, el chunk de 2 MB fuera de la carga
   inicial, fallback de Suspense propio para `/admin`.
4. PDF de cotizaciones: imagen vía proxy de R2, UF fresca al abrir el wizard,
   letter-spacing legible.
5. Alta de cotizaciones: columnas `prop_pais`/`prop_ciudad`, errores de Supabase
   visibles en todo el admin, catálogo por defecto en el Paso 2.

**Fase 3 (tokens tipográficos): planificada, NO iniciada.** No se tocó ningún
archivo por este motivo. Queda como el siguiente trabajo pendiente de la sesión
admin.

Pendiente operativo **ya resuelto**: aquellos commits estaban solo en local,
pero desde el 2026-08-05 `main` está a la par con `origin/main`. No queda nada
sin pushear de esa sesión.

---

### EL COLOR DE ERROR NO SE USA PARA NADA QUE NO SEA UN ERROR — 2026-08-08

`--error: #A8384B` reemplaza los 21 literales de `#E24B4A`. Pero lo que hay que
recordar no es el valor: es **por qué antes no había ningún valor posible**.

#### El bloqueo

`#E24B4A` fallaba WCAG 1.4.3 en los 18 usos de texto pequeño —3.93:1 sobre
blanco, 3.76 sobre `--off`, 3.54 sobre `--sky-pale`— y había que reemplazarlo.
Pero cualquier reemplazo tenía que cumplir dos condiciones a la vez:

1. **Contraste ≥ 4.5:1**, que obliga a oscurecer.
2. **Distinguirse de `--estado-vendida` #C0392B**, que comparte pantalla en el
   listado de propiedades. Oscurecer un rojo lo acerca a esa marca ladrillo, así
   que para separarse hay que **correrse en tono, hacia el magenta**.

Y ahí aparecía la tercera condición, que era la que cerraba la puerta:
`PropiedadDetailPage` usaba este mismo rojo para el **precio rebajado**, en la
única pantalla que lleva `--oportunidad` #2D8055. O sea que el rojo también
tenía que separarse del verde. Medido:

| candidato | contraste | ΔE vs Vendida (peor de 3) | ΔE vs Oportunidad (peor) |
|---|---|---|---|
| `#A8385D` carmín | 6.20 | 16.5 ✓ | **0.6** ✗ deuteranopia |
| `#A8384B` frambuesa | 6.30 | 11.4 ✓ | **5.8** ✗ deuteranopia |
| `#C0392B` (= Vendida) | 5.44 | **0.0** ✗ | 10.2 |
| `#E24B4A` (el de entonces) | **3.93** ✗ | 10.0 | **3.8** ✗ protanopia |

Cuanto más se corre al magenta para separarse de «Vendida», más colapsa contra
el verde bajo deuteranopia. Es el mismo choque rojo-verde que ya había obligado
a sacar «Reservada» del ámbar. **No existe un rojo que cumpla las tres.** Los
burdeos oscuros (`#6F203A`) lo consiguen, pero con contraste 10-11 dejan de
leerse como alerta.

#### La salida no fue de color, fue de semántica

El precio rebajado **nunca debió estar en el rojo de error**. Peor: la insignia
que va justo encima decía «Precio rebajado» en `--oportunidad` desde el cambio
anterior, así que la misma tarjeta afirmaba dos cosas opuestas sobre el mismo
hecho. La comparación ya la comunica el precio anterior tachado.

Con la rebaja en `--oportunidad`, el rojo dejó de convivir con el verde y la
tercera condición desapareció. `#A8384B` entra sin forzar nada.

#### LA REGLA

> **El color de error es solo para errores.** Un envío que falló, un registro
> que no se encontró, el texto de los botones «Eliminar». Nada más.
>
> No es una insignia de estado, no marca urgencia comercial, no señala una
> oferta. En el momento en que se usa para otra cosa, hereda las restricciones
> de esa otra cosa, y el rojo se queda sin margen para cumplir contraste.

Lo mismo vale al revés y ya había pasado una vez: `--estado-vendida` se usaba
también para «Precio rebajado» —el mismo rojo para un cierre y para una
oportunidad—. Es el segundo caso del mismo error en dos semanas.

#### Los números que quedaron

| | antes | ahora |
|---|---|---|
| sobre blanco | 3.93 ✗ | **6.30** ✓ |
| sobre `--off` | 3.76 ✗ | **6.03** ✓ |
| sobre `--sky-pale` | 3.54 ✗ | **5.67** ✓ |
| blanco encima (badge del PDF) | 3.93 ✗ | **6.30** ✓ |
| selector de estado, sobre su color al 13 % | `#FBE7E7` → 3.31 ✗ | `#F3E4E7` → **5.12** ✓ |
| precio rebajado, 40 px | 3.93 (pasaba por tamaño) | **4.85** ✓ con `--oportunidad` |

ΔE2000 de `--error` contra `--estado-vendida`, en visión normal / protanopia /
deuteranopia: **12.7 / 12.8 / 11.4**. Por encima de 10 en las tres.

#### `var()` no sirve cuando el color se opera en JS

Dos literales sobreviven a propósito, los dos comentados como espejo de
`--error`:

- **`CotizacionPDF.tsx`** — `@react-pdf/renderer` rasteriza fuera del DOM y no
  resuelve `var(--…)`. Misma razón que `tarjeta.css`.
- **`CotizacionesAdmin.tsx`, `ESTADO_COLORS`** — el selector de estado deriva su
  fondo concatenando el alfa: `ESTADO_COLORS[estado] + '22'`. Con una variable
  el resultado es la cadena `var(--error)22`, que **no es CSS válido**: React la
  escribe igual, el navegador la descarta y el fondo desaparece **solo en
  «Rechazada»**, sin ningún error en consola. Se detectó revisando el consumidor
  del mapa, no compilando.

  Generalizable: **antes de cambiar un hex por `var()`, mirar si alguien hace
  aritmética de cadena con ese valor.** El build pasa igual.

#### Pendiente

~~`Captacion.tsx:112` conserva su `red: '#E24B4A'` — dominio de la sesión Sofía.
Cuando esa sesión lo toque, el valor a poner es `#A8384B`, y conviene revisar si
ese mapa también concatena alfa.~~

**CERRADO el 2026-08-09.** Se revisó: ese mapa **no** concatena alfa en ningún
consumidor, así que quedó como `var(--error)` y no como hex espejo.

---

### Accesibilidad — tanda 2, paso 1: los formularios públicos — 2026-08-08

WCAG 2.1 AA, criterios 1.3.1, 3.3.2 y 4.1.2. El diagnóstico de partida:
**104 campos en `src/`, cero con `id`, cero usos de `htmlFor` en todo el
repositorio.** De los 51 `<label>` existentes, 13 envolvían su campo —esos
funcionaban— y 38 quedaban yuxtapuestos, que es markup de etiqueta sin
asociación.

Este paso cubre los tres formularios **públicos**: los que completa alguien de
fuera de la corredora.

| Archivo | Campos |
|---|---:|
| `src/components/credito/SolicitudCreditoForm.tsx` | 8 |
| `src/pages/VendeConNosotrosPage.tsx` | 7 |
| `src/components/sections/ContactSection.tsx` | 4 |

#### UN PLACEHOLDER NO ES UNA ETIQUETA

> Es la trampa exacta que produjo los 104 campos. Los tres formularios se ven
> perfectamente etiquetados, y de hecho lo están **visualmente**: hay un rótulo
> encima de cada campo. Lo que no había era ninguna relación entre los dos
> elementos. El navegador no la infiere de la posición.
>
> Y donde no hay rótulo visible, el `placeholder` da la ilusión de que sí:
>
> - **Desaparece al escribir.** Justo cuando el usuario querría verificar qué
>   pedía el campo, ya no está.
> - **No sobrevive al autocompletado.** El campo queda relleno y mudo.
> - **No es un nombre accesible fiable.** Algunos lectores lo leen, otros no, y
>   ninguno lo hace en lugar de la etiqueta.
> - **No sirve para el clic.** No hay nada que pulsar para enfocar el campo, que
>   es lo que amplía el área de acierto para quien tiene poca motricidad fina.
>
> Como el formulario *parece* correcto en pantalla, nada delata el problema
> hasta que alguien lo recorre con un lector. Por eso llegaron a 104.

#### La solución: envolver, no generar ids

El `<div class="flex flex-col gap-2">` que agrupaba rótulo y campo pasa a ser
`<label>`, y el `<label>` yuxtapuesto de adentro pasa a `<span>`. Un `<label>`
que contiene a su control lo asocia sin `htmlFor` y sin `id`.

**El estilo se queda en el `<span>`, no sube al `<label>`.** No es cosmético:
`text-transform` y `letter-spacing` son propiedades **heredadas** y sí se
aplican al texto que el usuario escribe dentro de un `input`. `.input-line` no
fija ninguna de las dos. Poner el `labelStyle` en el elemento que ahora envuelve
habría dejado todo lo tecleado en mayúsculas y con 2px de separación entre
letras.

##### Por qué envolver y no `id` + `htmlFor`

Porque **`ContactSection` y el modal de crédito conviven en la misma página**,
en Home y en Servicios. Los dos tienen un campo «Email» y uno «Teléfono». Con
ids escritos a mano se habrían duplicado, y un `id` duplicado no falla: el
`htmlFor` se asocia al primero que encuentre y el segundo campo se queda mudo,
en silencio. Envolviendo no hay ningún id que colisionar. Verificado: cero ids
duplicados en las tres páginas.

##### La excepción: «Valor de la propiedad (UF)»

Su contenedor lleva, además del rótulo y el input, un `<p>` con el valor de la
UF del día. Envolver el contenedor entero habría metido ese texto dentro del
nombre accesible del campo —y encima es un texto que cambia solo—. Ahí el
`<label>` envuelve **solo al input** y el `<p>` queda fuera, como hermano. Los
`gap-2` anidados dan los mismos 8px de separación que había.

**Regla general:** el `<label>` envuelve exactamente el rótulo y el control.
Todo lo que sea texto de ayuda, error o estado se queda fuera, o pasa a formar
parte del nombre del campo.

#### `RadioGroup` tenía un `<label>` que no etiquetaba nada

Sus opciones son `<button>`, y un `<button>` no es un control etiquetable: un
`<label>` no puede asociársele ni envolviéndolo ni con `htmlFor`. El rótulo
«¿Qué quieres hacer?» era markup decorativo.

Pasa a `<span id>` más `role="group"` y `aria-labelledby` en el contenedor de
los botones. **El texto visible no cambia** —esa es la razón de usar
`aria-labelledby` sobre el rótulo que ya estaba, y no un `aria-label` invisible:
un rótulo que se ve sirve a todo el mundo, no solo a quien usa lector—. El `id`
sale de `useId()`, porque este formulario se monta también dentro del modal.

Queda **pendiente** que esos botones expongan estado de selección: hoy un lector
anuncia «botón», no «seleccionado». El arreglo completo es `role="radio"` +
`aria-checked` + navegación con flechas, y cambia el comportamiento de teclado,
así que no entra en una tanda de semántica pura.

#### Cómo se verificó — `labels.length`, no «se ve bien»

Con Chrome por CDP contra el build de producción, no leyendo el JSX:

| Prueba | Antes | Después |
|---|---|---|
| `el.labels.length` en los 19 campos | **0** | **1** en todos |
| clic en la etiqueta enfoca el campo | **0 de 19** | **19 de 19** |
| ids duplicados en la página | 0 (no había ids) | **0** |

Y el **nombre accesible real**, leído del árbol de accesibilidad
(`Accessibility.getPartialAXTree`), no de `textContent`:

- El `<select>` envuelto da «TIPO DE PROPIEDAD», **sin arrastrar el texto de sus
  `<option>`**. Chrome excluye el control incrustado al calcular el nombre.
- «VALOR DE LA PROPIEDAD (UF)» no incluye el valor del día.
- Los dos `role="group"` quedan con nombre.
- Los 19 con `origen: relatedElement`, que es lo que confirma que el nombre
  viene del `<label>` y no de un `placeholder` o un `title`.

`textContent` **no sirve** para esta verificación: en el `<select>` daba
«Tipo de propiedadCasaDepartamentoOficina…», que no es lo que anuncia el lector.

##### Trampa al medir: leer el árbol AX antes de que React renderice

La primera lectura contra producción dio los 19 nombres saliendo del
`placeholder`, como si el arreglo no hubiera llegado. No era eso: la sonda
esperaba un tiempo fijo tras `Page.navigate`, que alcanzaba en `localhost` y no
contra la red. El árbol de accesibilidad se leía antes de que el formulario
existiera.

Es un **falso negativo especialmente confuso**, porque el síntoma —«el nombre
viene del placeholder»— es idéntico al del defecto que se está arreglando. Se
descartó comparando el chunk servido en producción contra el local (`sha256`
idéntico) y pidiendo el DOM real. La sonda ahora espera a que exista
`form input` antes de pedir el árbol.

#### Que no cambió nada visualmente

Se construyó `HEAD` en un worktree aparte, se levantaron los dos builds en
paralelo y se capturó cada formulario. Los PNG salieron **idénticos byte a
byte** en los tres:

| Formulario | Antes | Después |
|---|---:|---:|
| `ContactSection` | 15.104 B | 15.104 B, mismo `sha256` |
| `SolicitudCreditoForm` | 39.587 B | 39.587 B, mismo `sha256` |
| `VendeConNosotrosPage` | 27.375 B | 27.375 B, mismo `sha256` |

Un `<label class="flex flex-col gap-2">` renderiza igual que el `<div>` que
reemplaza: la clase fija `display: flex`, que gana sobre el `inline` que trae
`<label>` por defecto. El riesgo del cambio está en quitar esa clase, no en el
cambio en sí.

#### Observación, no defecto

Los rótulos llevan `text-transform: uppercase`, y el nombre accesible sale con
el texto ya transformado («NOMBRE COMPLETO»). Algunos lectores deletrean las
palabras en mayúsculas. Es la tipografía del sitio y viene de antes; se anota
por si en una tanda futura se decide poner el texto en minúsculas y dejar las
mayúsculas al CSS.

#### El paso 2 está detenido a propósito

`src/components/admin/campos.tsx` **no se tocó**. Su `Field` concentra 171 usos
en 8 paneles del admin y el reporte previo está entregado, esperando decisión.
Los dos hallazgos que impiden aplicar ahí el mismo arreglo de forma mecánica:

- **19 `Field` no envuelven un control**, sino `ImageUploader` (16),
  `RichTextEditor` (2) y `PropImageManager` (1). Los tres traen **su propio
  `<label>` interno** alrededor de un `<input type="file">` oculto. Convertir
  `Field` en `<label>` anidaría etiquetas —inválido— y el rótulo del campo
  quedaría apuntando al selector de archivos: pulsarlo abriría el diálogo de
  subida.
- **`ImageUploader` tiene además un segundo control**, el input de solo lectura
  con la URL. Un `<label>` que envuelve dos controles asocia solo el primero.

Lo que sí quedó despejado: **ningún `Field` contiene más de un control directo**,
ninguno se usa para mostrar un valor de solo lectura, ninguno mezcla el control
con texto de ayuda, y **ningún `Chk` vive dentro de un `Field`** —los 9 son
hermanos—, así que por ese lado no hay riesgo de etiquetas anidadas.

#### Campos públicos que siguen sin etiqueta

No entran en el paso 1 y no son formularios de captación, pero son públicos:

| Dónde | Campos | Estado |
|---|---:|---|
| `SearchBar.tsx` | 3 `<select>` | **sin rótulo de ningún tipo**: ni `<label>`, ni `placeholder`, ni `aria-label`. El buscador del home |
| `PropiedadesPage.tsx` | 2 `<select>` | 2 `<label>` sueltos, sin asociar. Filtros del catálogo |
| `MapPicker.tsx` | 1 `<input>` | solo `placeholder` |
| `ElBarrancoShowcase.tsx` | 2 | 2 `<label>` sueltos y un `aria-label` |
| `TarjetasEquipo.tsx` | 1 | 1 `<label>` |

Un `<select>` sin nombre es el peor caso de la lista: no tiene `placeholder` que
dé siquiera una pista, así que un lector anuncia «cuadro combinado» y el valor
seleccionado, sin decir nunca de qué se trata la lista.

Verificado en producción tras el deploy: los 19 campos con `labels.length === 1`,
clic que enfoca en 19 de 19, cero ids duplicados y los 19 nombres con origen
`relatedElement`. En `/evaluacion-gratuita` se miden 7 de los 8 campos porque
«Tipo de propiedad» solo se monta cuando la acción elegida es «comprar».

---

### Accesibilidad — tanda 2, paso 2: el admin y el buscador — 2026-08-08

Cierra lo que el paso 1 dejó abierto. **171 campos del admin más los del
buscador del home.**

| Commit | Qué |
|---|---|
| `ed40ebe` | `Field` envuelve a su control — 152 campos |
| `7db6be7` | `FieldGroup` para los 19 editores compuestos |
| `03fed5c` | los `<select>` de `SearchBar` |

#### UN `<label>` QUE ENVUELVE LE HEREDA `text-transform` AL CAMPO

> Es la trampa central de este paso, y no se ve venir.
>
> El rótulo de `Field` llevaba `textTransform: 'uppercase'` y
> `tracking-sdm-wide` (2px). Al convertir el `<div>` contenedor en `<label>`,
> lo natural es dejar ese estilo donde estaba —ahora en el elemento que
> envuelve— y quedarse tranquilo, porque el rótulo se sigue viendo idéntico.
>
> **`text-transform` y `letter-spacing` son propiedades heredadas, y sí se
> aplican al texto que el usuario escribe dentro de un `input`.** No es un
> caso raro de CSS: es el comportamiento normal, y `.input-line` no fija
> ninguna de las dos, así que no hay nada que corte la herencia.
>
> El resultado habría sido que **todo lo que Víctor teclee en los 152 campos
> del admin salga en MAYÚSCULAS y con 2px de separación entre letras**. De una
> sola vez, en los 8 paneles.
>
> Y no se detecta:
>
> - `tsc` pasa en verde. No es un error de tipos.
> - No hay advertencia en consola. Es CSS válido y deliberado.
> - **El rótulo se ve exactamente igual**, que es lo que uno mira al revisar.
> - La captura de pantalla del formulario vacío también es idéntica.
>
> Solo aparece cuando alguien escribe. Un formulario recién cargado no lo
> delata.
>
> **La regla:** en un `<label>` que envuelve a su control, el estilo del
> rótulo va en un `<span>` interior, nunca en el `<label>`. Vale para
> `Field`, para `FieldGroup` y para los tres formularios públicos del paso 1.
>
> Verificado midiendo `getComputedStyle` del input, no mirando el JSX:
> `text-transform: none` y `letter-spacing: normal` en el campo, `uppercase`
> en el `<span>` del rótulo, con el texto tecleado intacto.

#### `FieldGroup` — la variante sin `<label>`

19 de los 171 `Field` no envolvían un control etiquetable:

| Componente | Usos |
|---|---:|
| `ImageUploader` | 16 |
| `RichTextEditor` | 2 |
| `PropImageManager` | 1 |

`ImageUploader` y `PropImageManager` traen **su propio `<label>`** alrededor de
un `<input type="file">` oculto. Un `<label>` por fuera anida etiquetas
—inválido— y apunta al primer descendiente etiquetable, que es justamente ese
selector: **pulsar el rótulo «Foto del destino» habría abierto el diálogo de
subida de archivos.** `ImageUploader` tiene además un segundo control, el input
de solo lectura con la URL, y un `<label>` solo asocia al primero.

`FieldGroup` usa `<span id>` + `role="group"` + `aria-labelledby`. Se ve igual
que un `Field`. El id sale de `useId()` y **no se escribe a mano**: ocho de
estos se montan a la vez en `Barranco` y cinco en `Contenido`, y dos ids
iguales no fallan — se asocian al primero y dejan al resto sin nombre, en
silencio.

##### El nombre lo dice el `role`

Se llamó `FieldGroup` y no `Campo`, `Grupo` ni `FieldSet` porque nombra
exactamente el `role="group"` que emite, y porque su hermano `Field` ya está en
inglés y sin abreviar. `FieldSet` habría sugerido un `<fieldset>`, que trae
`<legend>` y estilos propios del navegador.

#### La migración se hizo con un parser, no a mano

El mismo parser de bloques balanceados de la auditoría: localiza cada
`<Field>…</Field>`, mira si su contenido tiene un compuesto y reemplaza los dos
extremos. Las 19 líneas resultantes coincidieron una a una con las de la
auditoría previa.

Quedaron **152 pares `Field` y 19 pares `FieldGroup`**, que son los 171
originales, con las aperturas y los cierres balanceados en los 8 archivos.

> **Ojo al auditar:** `indexOf('<Field')` engancha también `<FieldGroup`. Los
> scripts de conteo necesitan `<Field(?![A-Za-z])`. La primera re-auditoría dio
> «70 bloques, 4 con más de un control» por esto, y no era un problema del
> código.

#### `SearchBar` — no hizo falta `aria-label`

Los `<select>` del buscador **ya tenían rótulo visible** —«Región», «Comuna»,
«Tipo», «Precio»—, puesto como `<div>`. Solo faltaba la asociación. El
contenedor pasa a `<label>` y el rótulo a `<span>`, sin tocar el texto ni el
diseño. Un rótulo que se ve sirve a todo el mundo; un `aria-label` invisible,
solo a quien usa lector.

**Los dos llevan `display: block` explícito**, y esto sí era necesario:
`<label>` y `<span>` son `inline` por defecto, y estos contenedores tenían
`padding`, `border` y `marginBottom`, que en inline no se comportan igual. Es
distinto de `Field`, donde la clase `flex flex-col gap-2` ya fijaba
`display: flex` y no hubo que agregar nada.

En el DOM se renderizan **4** `<select>`, no 3: el par tipo/precio sale de un
`.map` sobre dos entradas. Los cuatro quedaron asociados.

El buscador de escritorio no usa `<select>`: son dropdowns hechos con `<button>`
que llevan su texto dentro, así que ya tenían nombre accesible.

#### Cómo se verificó sin poder entrar al admin

`AdminPage` exige sesión de Supabase, así que los 8 paneles no se pueden
recorrer con el navegador. Pero **el arreglo de los 152 vive entero en `Field` y
el de los 19 en `FieldGroup`**: se montó un banco de pruebas temporal con los
componentes reales —`Field`, `FieldGroup`, `Inp`, `Txa`, `Sel`, `Chk`,
`ImageUploader` y `RichTextEditor`— y se midió ahí. `PropImageManager` no se
exporta desde `Propiedades.tsx`, así que se replicó su estructura interna
exacta, que es la propiedad bajo prueba.

El banco se borró al terminar. No quedó en el repositorio.

| Prueba | Antes | Después |
|---|---|---|
| `labels.length` en input, textarea y select de `Field` | 0 | **1** |
| `text-transform` computado del campo | `none` | **`none`** |
| `letter-spacing` computado del campo | `normal` | **`normal`** |
| texto tecleado | — | **«Depto en Las Condes», intacto** |
| nombre accesible de los `FieldGroup` | no existían | **4 de 4, origen `relatedElement`** |
| pulsar el rótulo de un `FieldGroup` | habría abierto el selector | **no enfoca nada** |
| `<label>` anidados | — | **0** |
| ids duplicados | — | **0**, con 4 ids de `useId()` (`:r0:`…`:r3:`) |
| `<select>` de `SearchBar` con label | `[0,0,0,0]` | **`[1,1,1,1]`** |

#### Comparación visual: 0 píxeles

No se compararon hashes de PNG sino **píxel a píxel**, decodificando las dos
imágenes en un canvas y contando las diferencias:

| Captura | Píxeles distintos |
|---|---:|
| banco de `Field` + `FieldGroup` (1280×1083) | **0** |
| `SearchBar` a 390px de ancho (500×333) | **0** |

##### El falso positivo del foco

La primera comparación del banco dio 776 píxeles distintos (0,056 %), y **656
de ellos estaban en una sola fila**, la 101, a lo ancho del primer campo. No era
el cambio: era `.input-line:focus`, el borde verde. La sonda de accesibilidad
había tecleado en ese input y, en una de las dos corridas, después pulsaba los
rótulos de los `FieldGroup` y con eso quitaba el foco.

**Una captura solo sirve para comparar si el estado es neutro.** Se repitió sin
teclear, sin pulsar y con `blur()` explícito antes de disparar, y dio 0.

Que el grueso de la diferencia caiga en una única fila horizontal es la firma de
un borde, no de un cambio de layout: si algo se hubiera movido, las diferencias
se repartirían por muchas filas.

#### Lo que NO se hizo, y por qué

**Los rótulos en mayúsculas: no había nada que cambiar.** El encargo pedía pasar
el texto a minúsculas y dejar las mayúsculas al CSS. Ya estaba así. De **243
rótulos localizados en `src/`, solo 4 están escritos en mayúsculas**, y los
cuatro son siglas legítimas: `RUT` una vez y `SDM` tres —y las de `SDM` ni
siquiera son rótulos de campo, son la marca en el header, el footer y la página
de evaluación—.

Las mayúsculas que se ven vienen todas de `text-transform: uppercase` en CSS. El
problema real es otro: **Chrome aplica `text-transform` al calcular el nombre
accesible.** El código dice `Nombre completo` y el árbol de accesibilidad
expone `NOMBRE COMPLETO`. Medido, no supuesto.

Así que mover las mayúsculas al CSS no arregla nada, porque ya están en el CSS.
Las únicas salidas de verdad son quitar `text-transform: uppercase` de los
rótulos —que **cambia el aspecto de todo el sitio**— o aceptarlo. Es una
decisión de diseño, no de semántica, y quedó **pendiente de Víctor**.

#### Pendiente

- El input de solo lectura con la URL dentro de `ImageUploader` no tiene nombre
  propio. Está dentro de un `FieldGroup` con nombre, así que hay contexto, pero
  un lector lo anuncia sin decir qué es.
- Los botones de `RadioGroup` en `SolicitudCreditoForm` siguen sin exponer
  estado de selección — ver el paso 1.
- `PropiedadesPage.tsx` (2 `<select>` con `<label>` sueltos), `MapPicker.tsx`
  (solo `placeholder`) y `ElBarrancoShowcase.tsx` (2 `<label>` sueltos) siguen
  sin asociar.

---

### Accesibilidad — tanda 2: cierre de los tres archivos — 2026-08-08

`PropiedadesPage` (5 filtros), `ElBarrancoShowcase` (3 campos) y `MapPicker`
(1). Los tres tenían **rótulo visible sin asociar**, así que se envolvió: ni un
solo `aria-label`, ni un cambio de texto, ni uno de diseño.

Más el `aria-label="URL de la imagen"` del input de solo lectura de
`ImageUploader`. **Ahí sí corresponde `aria-label`** y no un rótulo visible: es
un campo de apoyo para copiar, no un dato que se edite, y el `FieldGroup` que
lo contiene ya nombra al conjunto. Un segundo rótulo visible sería ruido.

| Archivo | Campos | `labels` antes → después |
|---|---:|---|
| `PropiedadesPage.tsx` | 5 | `[0,0,0,0,0]` → `[1,1,1,1,1]` |
| `ElBarrancoShowcase.tsx` | 3 | `[0,0,0]` → `[1,1,1]` |
| `MapPicker.tsx` | 1 | `[0]` → `[1]` |

Los 9 con origen `relatedElement`. Los filtros del catálogo no tenían **ningún**
nombre —ni `placeholder`—: el lector anunciaba «cuadro combinado» y nada más.

`S.formLabel` de `ElBarrancoShowcase` es el caso más claro de la trampa de
herencia: lleva `letterSpacing: '0.3em'` y `textTransform: uppercase`, y
`S.formInput` no fija ninguna de las dos. Se quedó en el `<span>`.

Comparación píxel a píxel con foco neutro: **0 diferencias en los tres**, y
`MapPicker` con las mismas dimensiones exactas, así que tampoco cambió el
layout.

---

## Dos criterios que se fijan acá

### 1. Los rótulos en mayúsculas se quedan. Es una excepción consciente

**No es un pendiente.** El texto ya está en minúsculas en el código —de 243
rótulos, solo 4 en mayúsculas, y los 4 son siglas: `RUT` y `SDM`×3—. Las
mayúsculas vienen de `text-transform: uppercase` en CSS.

El problema es que **Chrome aplica `text-transform` al calcular el nombre
accesible**: el código dice `Nombre completo` y el árbol de accesibilidad
expone `NOMBRE COMPLETO`. Algunos lectores deletrean las palabras en
mayúsculas.

Quitar `text-transform` arreglaría el nombre, pero **cambiaría el aspecto de
todos los formularios del sitio**, y el problema afecta solo a algunos
lectores. La relación entre lo que cuesta y lo que resuelve no da.

Queda así a propósito. Si alguien lo detecta en una auditoría futura, esto es
la respuesta: ya se evaluó y se decidió.

### 2. Al comparar capturas, el foco deja rastro

Una diferencia de píxeles **concentrada en una sola fila horizontal es la firma
de un borde**, no de un cambio de layout. Si algo se hubiera movido, las
diferencias se repartirían por muchas filas.

Pasó midiendo `Field`: 776 píxeles distintos, **656 de ellos en la fila 101**, a
lo ancho justo del primer campo. Era `.input-line:focus` —el borde verde—,
porque la sonda de accesibilidad había tecleado ahí y en una de las dos corridas
después pulsaba otros elementos y quitaba el foco.

**Una captura solo sirve para comparar si el estado es neutro en las dos
corridas:** sin teclear, sin pulsar y con `blur()` explícito antes de disparar.
Repetida así, la misma comparación dio 0.

Corolario del mismo caso: **la caja de recorte tiene que apuntar al mismo
elemento en las dos corridas.** Con `MapPicker` se usó
`input.closest('div')` y, como el envoltorio pasó a ser un `<label>`, en la
segunda corrida atrapó un `<div>` distinto: la captura salió de 656×62 a 656×98
sin que nada hubiera cambiado de tamaño. Con una caja estable —la raíz— dio
0 diferencias y las mismas dimensiones.

---

### El barrido completo de `src/`: quedan 83 campos sin asociar

Las tandas anteriores midieron lo que tenían delante —los `<Field>`, los
formularios públicos, `SearchBar`— y de ahí salió «quedan tres archivos». Era
incompleto. Un barrido de **todo `src/` con el parser de TypeScript** da otro
número.

| Archivo | Campos sin nombre |
|---|---:|
| `components/cotizaciones/CotizacionesAdmin.tsx` | 35 |
| `pages/admin/FichaClienteEditar.tsx` | 14 |
| `pages/admin/FichaClienteNueva.tsx` | 14 |
| `components/tarjetas/TarjetasEquipo.tsx` | 7 |
| `pages/admin/Agentes.tsx` | 3 |
| `pages/admin/FichaClienteDetalle.tsx` | 3 |
| `pages/admin/FichaClientesLista.tsx` | 3 |
| `pages/AdminPage.tsx` (el login) | 2 |
| `pages/admin/Contenido.tsx` | 1 |
| `pages/admin/Propiedades.tsx` | 1 |
| **total fuera de `Captacion.tsx`** | **83** |

`Captacion.tsx` suma 5 más y es dominio de la sesión Sofía.

#### `Fld` es el mismo defecto que tenía `Field`, dos veces

**42 de los 83** salen de un solo patrón: `CotizacionesAdmin` y
`TarjetasEquipo` definen **cada uno su propio `Fld`**, copia exacta del `Field`
viejo:

```jsx
function Fld({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label …>{label}</label>   {/* yuxtapuesto, no envuelve */}
      {children}
    </div>
  )
}
```

Arreglarlos es el mismo cambio de dos líneas ya validado en `Field`: el `<div>`
pasa a `<label>` y el `<label>` interior a `<span>` —con el estilo en el
`<span>`, o el texto tecleado sale en mayúsculas—. Cerraría 42 de golpe.

Los `FichaCliente*` (34) no tienen envoltorio: son campos sueltos y hay que
mirarlos uno a uno.

#### Los dos errores de medición que hubo que corregir

Anotados porque cualquiera que repita el barrido va a tropezar con ellos:

1. **Contar sobre el texto crudo cuenta los comentarios.** `Propiedades.tsx`
   tiene un comentario que menciona `<input type="file">` y aparecía como campo
   real.
2. **Blanquear los comentarios con expresiones regulares rompe el conteo de
   etiquetas.** Al hacerlo desapareció un `</label>`, la pila quedó abierta y
   **los 35 campos de `CotizacionesAdmin` pasaron a figurar como asociados**.
   Un falso negativo que da justo el resultado que uno quiere ver.

La versión fiable **parsea con el compilador de TypeScript** y recorre el AST de
JSX con la pila real de ancestros. Los comentarios, las cadenas y el anidamiento
dejan de importar.

> **Y hay que verificar qué asocia de verdad.** La primera pasada del barrido
> con AST dio 45 en vez de 83, porque se había supuesto que `Fld` asociaba, por
> parecerse a `Field`. Un envoltorio no asocia porque se llame parecido: hay que
> abrir su implementación.

---

### Accesibilidad — tanda 2: cierre completo — 2026-08-08

**De 83 campos sin nombre accesible a 0**, fuera de `Captacion.tsx`.

| Commit | Qué | Campos |
|---|---|---:|
| `ba3fe67` | los dos `Fld` duplicados envuelven | 38 |
| `12da41f` | los cinco `FLabel` duplicados envuelven | 34 |
| `9b7b66c` | login del admin + 4 controles de fila | 7 |

#### El mismo defecto estaba copiado en ocho lugares

`Field`, dos `Fld` y cinco `FLabel`. Ocho definiciones del mismo componente,
cada una con el mismo error: un `<div>` con un `<label>` yuxtapuesto que no
asocia nada.

| Componente | Copias | Dónde |
|---|---:|---|
| `Field` | 1 | `components/admin/campos.tsx` — arreglado en el paso 2 |
| `Fld` | 2 | `CotizacionesAdmin.tsx`, `TarjetasEquipo.tsx` |
| `FLabel` | 5 | los cuatro `FichaCliente*` y `Agentes.tsx` |

Los dos `Fld` son idénticos byte a byte entre sí. Los cinco `FLabel`, también.
Se reemplazaron exigiendo **coincidencia exacta del bloque completo**, así que
una copia divergente se habría saltado y reportado en vez de romperse
silenciosamente: los cinco dieron `ok`.

##### Ninguno necesitó `display: block`

`Fld` trae la clase `flex flex-col gap-2` y `FLabel` trae
`display: flex` en línea. En los dos casos el `display` ya estaba fijado y gana
sobre el `inline` que un `<label>` trae por defecto. Es la diferencia con
`SearchBar`, `MapPicker` y `PropiedadesPage`, donde el contenedor no era flex y
hubo que ponerlo explícito.

##### Y en los ocho, el estilo va en el `<span>`

Los ocho rótulos llevan `textTransform: uppercase` más `tracking-sdm-wide` o
`letterSpacing`. Dejarlos en el elemento que ahora envuelve habría puesto en
mayúsculas todo lo tecleado en 79 campos. Verificado tecleando de verdad:

```
CotizacionesAdmin  valor: "Juan Pérez de la Barra"  text-transform: none
TarjetasEquipo     valor: "María Fernández"         text-transform: none
                   rótulo: uppercase
```

#### Revisión previa, con AST, antes de envolver

| | `Fld` (42 usos) | `FLabel` (37 usos) |
|---|---:|---:|
| con más de un control | 0 | 0 |
| con un interactivo además del campo | 1 | 0 |
| que no envuelven exactamente 1 control | 1 | 0 |

Los dos casos de `Fld` pasaron a `FieldGroup`:

- **«Imagen principal»** — `ImageUploader` trae su propio `<label>` con un
  `<input type="file">` oculto y un segundo input con la URL.
- **«Valor UF del día (auto)»** — no contiene ningún control: es un valor de
  solo lectura con su rótulo. **Caso nuevo**, que no existía con `Field`: un
  `<label>` que no envuelve a nada no etiqueta nada.

#### Los 4 que llevan `aria-label`, y por qué

Son controles repetidos **por fila**, donde un rótulo visible partiría el
layout y se repetiría en cada elemento. El `aria-label` lleva el contexto de la
fila, que es lo que un rótulo repetido no daría:

| Dónde | Nombre |
|---|---|
| `Contenido` — posición de cada foto del hero | `Posición de la foto N` |
| `Propiedades` — título de cada dossier | `Título del dossier <archivo>` |
| `CotizacionesAdmin` — estado de cada fila | `Estado de la cotización <nº>` |
| `CotizacionesAdmin` — URL en su `ImageUploader` local | `URL de la imagen` |

El login del admin, en cambio, se envolvió como todo lo demás. Se le agregaron
`autoComplete="username"` y `"current-password"`, que no son asociación pero sí
lo que corresponde en un formulario de acceso.

#### La verificación, sin poder entrar al admin

| Qué | Cómo se llegó |
|---|---|
| login | ruta real `/admin`, que es lo que se ve sin sesión |
| `Fld` | banco temporal montando `CotizacionesAdmin` y `TarjetasEquipo` **reales** |
| `FLabel` | dos worktrees desechables —antes y después— con el **mismo** parche local a `useAdminAuth` |

El parche de `useAdminAuth` se aplicó **igual en los dos árboles**, así que la
comparación sigue siendo válida, y **nunca tocó el árbol de trabajo**: vivió y
murió en los worktrees. El banco temporal también se borró.

> Antes se intentó plantar una sesión falsa en `localStorage`. **No sirve:**
> `useAdminAuth` llama a `supabase.auth.getSession()` en un `useEffect` y
> escribe el resultado en el estado, así que el valor vuelve a `false` aunque
> el `useState` inicial diga otra cosa. Lo que funciona es fijar el objeto que
> el hook **devuelve**.

| | antes | después |
|---|---|---|
| login | `[0,0]` | `[1,1]` |
| `FLabel` (ficha) | `[0×14, 1]` | `[1×15]` |
| `Fld` (cotización) | `[0,0,0,0,0]` | `[1,1,1,1,1]` |
| `Fld` (tarjetas) | `[0×7]` | `[1×7]` |

Todos con origen `relatedElement`. Píxel a píxel, con foco neutro y la misma
caja de recorte en las dos corridas: **0 diferencias en los cuatro.**

#### Conteo final

```
campos en src/: 289
  con nombre accesible: 284
  SIN nombre: 5   ← los 5 de Captacion.tsx, dominio de Sofía
```

**Los 5 se cerraron el 2026-08-09.** El contador queda en 289 / 289.

---

## Cómo contar campos sin equivocarse

Tres tandas dieron tres números distintos —104, 83, 79— y ninguno estaba mal
calculado: estaban mal **definidos**. Vale la pena dejar por qué.

### Trampa 1 — contar sobre el texto crudo incluye los comentarios

`Propiedades.tsx` tiene un comentario que explica por qué el navegador no puede
limitar la cantidad de archivos, y **menciona `<input type="file">`**. Un
`grep` lo cuenta como un campo real.

Es el error inofensivo de los dos: infla el número y se descubre al abrir el
archivo.

### Trampa 2 — blanquear comentarios con regex rompe la pila de etiquetas

Al quitar los comentarios con expresiones regulares para arreglar la trampa 1,
desapareció un `</label>`. La pila de ancestros quedó abierta y **los 35 campos
de `CotizacionesAdmin` pasaron a figurar como asociados**.

> **Este es el error peligroso**, y no por ser más sutil: porque **da el
> resultado que uno quiere ver.** Un barrido que dice «ya no queda nada» no
> invita a revisarlo. La trampa 1 sobra campos y molesta; la trampa 2 los borra
> y tranquiliza.

La versión fiable **parsea con el compilador de TypeScript** —ya está instalado,
lo usa `tsc` en el build— y recorre el AST de JSX con la pila real de
ancestros. Comentarios, cadenas y anidamiento dejan de importar.

### Trampa 3 — un barrido solo ve los envoltorios que le enseñaste

Aun con AST, el conteo depende de qué componentes se declaran como
«asociadores». Dos errores de este tipo, los dos reales:

- **`FLabel` no estaba en la lista**, así que los 37 campos de las fichas
  figuraban como sueltos. De ahí salió el reporte de que «los `FichaCliente*`
  no tienen envoltorio», que era falso: tenían uno, roto.
- **`Fld` sí se puso en la lista, suponiendo que asociaba** por parecerse a
  `Field`. No asociaba. Eso dio 45 en vez de 83.

**Un envoltorio no asocia porque se llame parecido.** Hay que abrir su
implementación y mirar si el `<label>` envuelve o se yuxtapone.

También hay que decidir qué es «un campo»: el `<input>` que vive **dentro** de
la definición de `Inp` no es un campo aparte del `<Inp>` que se escribe en el
panel. Contar los dos duplica.

### Pregunta abierta: unificar los tres envoltorios

Los ocho ya funcionan igual, pero siguen siendo ocho copias. `Fld` y `FLabel`
podrían reemplazarse por el `Field` de `campos.tsx`. **No se hizo: es un
refactor, no un arreglo de accesibilidad.** Lo que hay que saber antes de
hacerlo:

| | `Field` | `Fld` | `FLabel` |
|---|---|---|---|
| `label` | `React.ReactNode` | `string` | `string` |
| separación | `gap-2` (8px) | `gap-2` (8px) | `gap: 6` |
| peso del rótulo | heredado | heredado | `fontWeight: 500` |
| rótulo | `display:flex`, `gap:6` para iconos | sin `display` propio | sin `display` propio |

`Fld` es **idéntico a `Field` salvo el tipo de `label` y el `display:flex` del
rótulo**. `FLabel` diverge además en la separación (6 vs 8px) y en el peso, así
que cambiarlo por `Field` **sí movería píxeles** en las cinco pantallas de
fichas. Ese es el trabajo real del refactor, y por eso va aparte.

---

### Admin — `Field` es el único envoltorio de campo — 2026-08-08

Los dos `Fld` —uno en `CotizacionesAdmin`, otro en `TarjetasEquipo`— se
borraron. Sus **40 usos** pasan al `Field` de `src/components/admin/campos.tsx`.

#### Por qué esto importa más que la limpieza

El defecto de asociación —`<div>` con un `<label>` yuxtapuesto que no etiqueta
nada— estaba copiado en **ocho envoltorios**: `Field`, dos `Fld` y cinco
`FLabel`. Hubo que arreglarlo ocho veces, en tres tandas distintas, y en cada
tanda apareció una copia que la anterior no había visto.

**Unificar es lo que evita que aparezca un noveno.** Mientras cada panel pueda
escribir su propio envoltorio de doce líneas, el siguiente panel lo va a volver
a escribir, y va a volver a nacer con el `<label>` al lado en vez de alrededor,
porque visualmente se ve igual y nada falla.

#### Las dos diferencias, medidas antes de aplicar

| | `Fld` | `Field` |
|---|---|---|
| `label` | `string` | `React.ReactNode` |
| rótulo | sin `display` propio | `display:flex`, `alignItems:center`, `gap:6` |

**El tipo** es un ensanche: `string` entra en `React.ReactNode`. Los 40 usos
pasan un literal de cadena —verificado con AST, cero expresiones—, así que
ninguno se ve afectado.

**El `display:flex`** era la única duda real, y por eso se midió antes de
tocar nada: se renderizaron los **40 rótulos reales** con las dos variantes, a
cuatro anchos de columna, incluidos los estrechos donde el texto se parte en
dos líneas —que es justo donde `flex` y `block` podrían diferir—.

```
160 combinaciones (40 rótulos × 4 anchos)
  cajas distintas: 0
  altura de columna: idéntica
  píxeles distintos: 0 sobre 5.263.000
```

El `gap: 6` no cambia nada porque el rótulo tiene **un solo hijo**; solo
separaría un icono del texto, que es para lo que está.

#### `FLabel` sobrevive a propósito

No es un olvido. Diverge de `Field` en dos cosas que **sí se ven**:

| | `Field` | `FLabel` |
|---|---|---|
| separación rótulo/campo | `gap-2` = 8px | `gap: 6` |
| peso del rótulo | heredado | `fontWeight: 500` |

Reemplazarlo movería píxeles en las **cinco pantallas de fichas**. Eso es
rediseño, no limpieza, y esas pantallas ya cambiaron de paleta esta semana.
Si alguna vez se unifica, el trabajo real es decidir cuál de las dos
separaciones se queda, no el reemplazo.

#### Verificación

Con los dos paneles reales montados en un banco temporal, antes y después:

| | resultado |
|---|---|
| `CotizacionesAdmin`, 1352×621 | **0 píxeles distintos** |
| `TarjetasEquipo`, 1352×554 | **0 píxeles distintos** |
| los 40 campos | `labels.length === 1`, nombre por `relatedElement` |
| texto tecleado | «María Fernández» intacto, `text-transform: none` |
| definiciones de `Fld` restantes | ninguna |

Los 40 nombres se leyeron pasando los rótulos reales por el `Field` compartido:
el asistente de cotización no se deja recorrer entero sin datos válidos, así que
en vivo solo se alcanzan 13. Lo que cierra la cobertura es que el AST confirma
que **los 40 usos son `<Field label="literal">`**, y que ese componente produce
un nombre correcto en los 40.

##### Otro falso positivo de captura, esta vez por carrera de carga

La primera comparación del panel de cotizaciones dio 1941 píxeles distintos
(0,15 %), todos dentro de un rectángulo de 286×16. No era el cambio: la captura
abarcaba también `TarjetasEquipo`, montado debajo en el mismo banco, y el
rectángulo era su **estado vacío** —«Todavía no hay tarjetas»— que en una de las
dos corridas todavía no había reemplazado al mensaje de carga.

Se identificó con `elementFromPoint` sobre las coordenadas de la caja, en vez de
mirar la imagen. Recortando cada panel por separado, los dos dieron 0.

> Suma a las trampas de captura ya anotadas —el foco, la caja de recorte
> inestable— una tercera: **el estado asíncrono.** Si la caja abarca algo que
> depende de una petición, la comparación mide la red, no el código. La firma
> también es reconocible: un bloque compacto de texto en vez de una fila.

---

### Accesibilidad — tanda 3: teclado — 2026-08-08

WCAG 2.1 AA, criterios 2.1.1, 2.4.7, 1.4.11 y 4.1.2. Seis commits.

| Commit | Qué |
|---|---|
| `2e45121` | anillo de foco: contraste y señal no cromática |
| `c453e58` | fuera los 16 `outline: none` |
| `f90f602` | 8 `<div>` de acción a `<button>` |
| `4ced14d` | 2 tarjetas navegables sin anidar interactivos |
| `22a5f60` | el header completo |
| `f671ab9` | `RadioGroup` |

---

## UN INDICADOR DE FOCO NO PUEDE DEPENDER SOLO DEL TONO

> Es el criterio que deja esta tanda, y vale para cualquier indicador de estado.
>
> `.input-line` —unos 190 campos— marcaba el foco cambiando el color del borde,
> de `--border-input` a `--green-dark`. Medido contra el fondo da **4.85:1**, o
> sea que **cumple 1.4.11**. Y aun así el indicador era malo:
>
> ```
> --green-dark contra el fondo blanco      4.85:1  ✓ cumple
> --green-dark contra el borde en reposo   1.19:1  ← el cambio real
> ```
>
> El cambio es **de tono, casi no de luminancia**. Con daltonismo —o en una
> pantalla en escala de grises, o con poca luz— el campo enfocado se ve igual
> que el de al lado. El ratio contra el fondo dice que el borde se ve; no dice
> que se distinga del borde que ya había.
>
> **Cumplir el criterio y servir no son lo mismo.** Un indicador necesita
> además un cambio no cromático: grosor, tamaño, forma o posición.
>
> Acá el borde engorda de 1px a 2px, y el `padding-bottom` baja ese mismo pixel
> para que la altura del campo no cambie ni empuje lo que tiene debajo —45px
> enfocado y en reposo—.
>
> **La prueba es en escala de grises.** Perfil de luminancia por fila de la
> franja del borde:
>
> ```
> enfocado  255 255 255 107 107 255 255 255   → 2 filas oscuras
> reposo    255 255 255 255 126 255 255 255   → 1 fila oscura
> ```

### El anillo global también fallaba

`*:focus-visible` usaba `--green` (#3DAA6E), que sobre fondos claros no llega a
3:1. Pasa a `--green-dark`:

| sobre | `--green` | `--green-dark` |
|---|---:|---:|
| blanco | 2.93 ✗ | **4.85** ✓ |
| `--off` | 2.80 ✗ | **4.64** ✓ |
| `--sky-pale` | 2.64 ✗ | **4.42** ✓ |
| `--navy-dark` | 5.37 ✓ | **3.24** ✓ |

Quitar los `outline: none` no habría bastado: habría restaurado un anillo que
tampoco cumplía.

#### Al medir el contraste del anillo, el fondo es el del PADRE

`outline-offset: 2px` dibuja el anillo **fuera** de la caja del elemento, así
que el color adyacente no es el fondo del propio control. Midiendo mal, dos
botones verdes daban 1.15:1 y parecían fallar; el anillo en realidad se pinta
sobre el blanco de la página. Con el fondo correcto: **22 de 22 controles del
home y 16 de 16 del catálogo, ninguno bajo 3:1.**

### Los 16 `outline: none` no reemplazaban nada

Se buscó `:focus` y `onFocus` en los archivos que los concentran: cero. No se
cambió el anillo por un borde ni por una sombra, se quitó y no se puso nada.
Eran estilos **en línea**, que ganan sobre cualquier selector sin `!important`.

El decimosexto vivía dentro del array de estilos que TipTap aplica al área
editable de `RichTextEditor` — una cadena, no una propiedad, así que la misma
búsqueda no lo encontraba. Los 5 de `Captacion.tsx` no se tocan.

---

### Un botón dentro de otro interactivo: la superposición

Cuatro de los elementos a convertir tenían controles adentro, y ni `<button>` ni
`<a>` admiten interactivos anidados. En vez de forzarlo:

| Dónde | Qué contenía | Solución |
|---|---|---|
| imagen principal de la propiedad | flechas anterior/siguiente | `<button>` superpuesto, `inset: 0` |
| disparador región/comuna | la X de limpiar | ídem |
| tarjeta de cliente | botón eliminar | `<Link>` en el título, estirado con `::after` |
| tarjeta de ficha | botones editar y eliminar | ídem |

En los cuatro, **el elemento que va encima necesita `position: relative` y un
z-index mayor**, o queda tapado por la superposición.

La diferencia entre las dos formas: con la superposición el área entera es UN
control; con `.enlace-tarjeta` el título es el enlace y la tarjeta solo amplía
su zona de clic. Para las tarjetas es lo correcto — envolverlas habría hecho
que el lector anunciara de una vez todo el texto de la tarjeta.

Verificado: clic en medio de la tarjeta → ENLACE, clic sobre Eliminar → BOTÓN,
y **un solo destino en el orden de tabulación**.

#### La selección no puede usar `outline` si el foco también

Las miniaturas de galería marcaban la seleccionada con
`outline: 2px solid var(--green)`. Al pasar a `<button>`, esa es exactamente la
propiedad del anillo de foco: la miniatura enfocada no se habría distinguido.
La selección pasa a `box-shadow: 0 0 0 2px`, que dibuja el mismo anillo por
fuera de la caja y sin tocar el layout.

#### El arrastre del sidebar sobrevive al `<button>`

Era el riesgo del commit 3. `filaProps` solo esparce `data-*`, `onPointerDown` y
`onClickCapture`, y los tres se comportan igual en un `<button>`. Verificado con
eventos de puntero reales: arrastrar la fila 1 a la 3 reordena, el orden se
persiste en `localStorage`, y el clic que el navegador manda al soltar se sigue
tragando. Enter y Espacio sí cambian de pestaña.

---

### El header: convertir el padre le quita el destino

Los disparadores eran `<Link>` que navegaban. Al pasarlos a `<button
aria-expanded>` ganan teclado pero pierden su destino. En Propiedades no se
notaba —«Ver todas» va al mismo sitio—, pero `/servicios` se habría quedado sin
enlace en el header. Por eso se agregó **«Ver todos los servicios»** al
desplegable.

Se encontró además que el menú móvil **nunca listó** «Vende con nosotros» ni las
tres páginas de servicios, y que la hamburguesa no tenía nombre accesible.

---

### La comparación píxel a píxel encontró un cambio que yo no quería

El header dio **970 píxeles de diferencia** después de convertir los
disparadores, en una banda de 10px de alto —la altura del texto— pero **sin
ningún desplazamiento**: las cajas medían exactamente lo mismo antes y después
(x=766 w=199, x=1136 w=115).

No era geometría, era color. Al convertirlos les puse `navLinkClass`, y resultó
que **esos dos eran los únicos enlaces de la navegación que NO la llevaban**:
heredaban `--ink` y se veían más oscuros que sus vecinos, que van en `--muted`.
Ponerles la clase normalizó una inconsistencia que llevaba ahí desde siempre.

Se revirtió con `color: 'inherit'` —un `<button>` tampoco hereda el color, el
navegador le pone `buttontext`—. **La inconsistencia se conserva a propósito:
corregirla es una decisión de diseño, y esta tanda es de teclado.**

> Vale como método: la comparación píxel a píxel no solo confirma que no
> rompiste nada. También **destapa lo que arreglaste sin querer**, que en un
> encargo acotado es igual de indeseable. Sin ella, la normalización se habría
> ido a producción sin que nadie la decidiera.

Antes de dar por buena una diferencia hay que descartar el ruido: **dos capturas
del mismo build dieron 0**, así que los 970 píxeles eran reales. Es la cuarta
trampa de captura de la serie, después del foco, la caja inestable y el estado
asíncrono: **verificar que la medición es determinista antes de interpretarla.**

---

### `RadioGroup`: la tabulación itinerante y el estado vacío

Tres instancias, dos opciones cada una, mutuamente excluyentes. `role="radio"`
con `aria-checked` y navegación con flechas circulares, donde solo una opción
está en el orden de tabulación — el grupo entero cuenta como una parada, igual
que un `<input type="radio">` nativo.

**El detalle que hay que recordar:** el valor inicial es `''`, sin nada elegido.
Si el tabulable fuera solo el seleccionado, el grupo entero se saldría del orden
de tabulación y no habría forma de llegar a él. Con nada elegido, el tabulable
es el primero.

### Lo que NO se tocó, a propósito

- **Los 5 fondos de modal y del cajón.** Un control a pantalla completa en el
  orden de tabulación es peor que el problema. Lo que les falta es `Escape` y
  atrapar el foco, y eso es otra tanda. El cajón del admin ya tiene `Escape`.
- **Los 2 `stopPropagation`.** No son controles: solo evitan que el clic sobre
  la imagen cierre el modal.
- **`Captacion.tsx`**, dominio de la sesión Sofía.

---

### Accesibilidad — tanda 4: estructura, idioma y modales — 2026-08-08

WCAG 2.1 AA: 1.3.1, 2.4.6, 3.1.1, 3.1.2, 2.1.2 y 2.4.3. Tres commits.

## La jerarquía de encabezados de las 19 rutas públicas

**Esta tabla es el contrato.** Si un cambio futuro la altera, es una regresión
salvo que sea deliberada. Se lee del DOM renderizado, no del JSX: los
encabezados también llegan desde `ContactSection`, el pie y el contenido
editable.

| Ruta | Secuencia |
|---|---|
| `/` | 1 2 2 2 2 2 3 3 3 2 |
| `/quienes-somos` | 1 2 3 3 3 3 2 2 3 3 3 2 2 |
| `/servicios` · `/servicios/:slug` | 1 2 2 2 2 |
| `/propiedades-usadas` · `/proyectos-nuevos` | 1 |
| `/propiedades/:slug` | 1 2 |
| `/asociados` | 1 2 2 2 2 2 |
| `/blog` | 1 2 × 13 |
| `/blog/:slug` | 1 2 2 2 2 2 |
| `/rental` | 1 2 2 2 2 3 3 2 |
| `/vende-con-nosotros` | 1 2 3 3 3 2 2 |
| `/politica-de-privacidad` | 1 2 × 8 |
| `/condiciones-del-servicio` | 1 2 × 9 |
| `/eliminacion-de-datos` | 1 2 × 5 |
| `/evaluacion-gratuita` | 1 2 |
| `/reserva/confirmacion` · `/showcase` · 404 | 1 · 1 2 × 7 · 1 |

**Las 19 con exactamente un `h1` y cero saltos de nivel.** Antes fallaban
cuatro, una más de las tres que traía el encargo.

#### El segundo `h1` no estaba en el código

`/blog/:slug` tenía DOS `h1` con el mismo texto. El segundo venía del
**contenido editable del post**, no del JSX. Y no era un caso suelto:

| Tabla | Con `<h1>` en su contenido |
|---|---|
| `blog_posts.contenido` | **7 de 13** |
| `propiedades.descripcion` | **6 de 54** |
| `paginas_legales.contenido` | 0 de 3 |

Por eso el arreglo no fue editar esas 13 entradas —eso no evita la
catorceava, porque la barra del editor ofrece H1— sino
`sanitizarContenido()` en `src/lib/contenidoRico.ts`, que sanea y además baja
los `h1` a `h2` al renderizar. Lo usan `BlogPostPage` y `PropiedadDetailPage`.

> **El `h1` lo pone la página; lo que va debajo empieza en `h2`.** Un `h1`
> dentro del contenido crea un segundo título de documento.

**Sí cambia el aspecto en esos 13 registros, y es una corrección.**
`.prose-sdm` estiliza `h2` y `h3` pero **no** `h1`, y el reset de Tailwind deja
los encabezados en `font-size: inherit`. O sea que esos `h1` se veían como un
párrafo cualquiera: encabezados invisibles. Ahora se ven como los del resto de
los posts. En el post medido, el bloque de prosa pasa de 1453 a 1462px.

#### El `h1` del hero no movió un píxel, y se comprobó por geometría

Detrás del titular rota el carrusel, así que **una captura no sirve**: dos
capturas del mismo build daban 75 % de diferencia. Lo que sí discrimina es medir
la caja:

```
             antes (DIV)              después (H1)
caja         64,325  1272x272         64,325  1272x272
fontSize     88px / 300 / 90.64px     igual
margin       0 0 0 0                  igual
renglones    3 × 1272x91              igual
lo siguiente 64,849 1272x79           igual
```

Funciona porque `@tailwind base` deja los encabezados en `font-size: inherit`,
`font-weight: inherit` y `margin: 0`. Sin ese reset, un `<h1>` traería el
margen del navegador y empujaría todo.

---

## El idioma: el showcase era la única superficie bilingüe real

`<html lang="es">` es fijo, pero `ElBarrancoShowcase` arranca en **inglés** —su
estado local parte en `'en'`— y servía toda la página en inglés bajo `lang="es"`.
Un lector la pronunciaba con fonemas españoles.

`lang={lang}` en el contenedor de la sección. Alcanza porque **`lang` se
hereda**, así que no hay que tocar el `<html>` ni el resto del sitio.

#### Lo que se revisó y NO se tocó, con su motivo

Hay código bilingüe en `PropertyCard`, `BlogPage`, `BlogPostPage`,
`BlogPreviewSection` y `PropiedadDetailPage` —`titulo_en`, `resumen_en`,
`contenido_en`—, pero **hoy no se puede alcanzar**: el `lang` global de
`useLang` nace en `'es'` y **no hay un solo `setLang` en toda la aplicación**
fuera del selector local de este showcase. Esas ramas nunca se evalúan.

Las páginas legales tampoco: `paginas_legales` solo tiene la columna
`contenido`, en español. Su `lang` se usa nada más para el título de SEO.

> Si algún día se agrega un selector de idioma global, **hay que volver acá**:
> el patrón es marcar el contenedor del contenido traducido, no el `<html>`.

---

## Los modales: son CINCO, y dos maneras de encerrar al usuario

El quinto es el **lightbox de la galería de propiedad**, que no estaba en la
lista: tapa la página entera y con Tab se salía a los enlaces de atrás sin
cerrarlo. Es además el único público y de uso frecuente.

| Modal | Qué tenía antes |
|---|---|
| Lightbox de la galería | solo Escape |
| `SolicitudCreditoModal` | `role`, `aria-modal` y Escape |
| Nuevo cliente · Nuevo agente · Editar cliente | nada |

Todo en `src/hooks/useDialogoModal.ts`.

### ATRAPAR EL FOCO MAL ES PEOR QUE NO ATRAPARLO

> **1. Modal sin ningún elemento enfocable.** Si el ciclo no encuentra a quién
> pasarle el foco y aun así bloquea el Tab, el usuario queda encerrado en la
> página, sin salida y sin nada que pulsar. Con cero enfocables **el Tab no se
> bloquea**: es preferible que el foco se escape a que no pueda moverse.
>
> Probado de verdad, no por lectura: se abre el modal, se deshabilitan sus 4
> controles y se pulsa Tab — el foco sale.
>
> **2. Trap que no se libera.** Si el oyente sobrevive al desmontaje, el Tab
> sigue secuestrado sobre una página donde ya no hay modal. Todo cuelga de un
> único `useEffect` cuya limpieza lo quita siempre. Probado: tras cerrar, el Tab
> vuelve a recorrer la página.

#### El disparador NO se puede leer cuando el modal ya está abierto

Los modales del admin enfocan su primer campo con `autoFocus`, y **React lo
aplica durante el commit, antes de que corra ningún efecto**. Leer
`document.activeElement` al abrir devolvía ese input, que al cerrarse ya no está
en el documento: el foco terminaba en el `<body>`.

Se anota mientras el modal está **cerrado**, siguiendo el foco de la página, e
ignorando lo que caiga dentro de un `[aria-modal="true"]`.

> **La guarda mira el DOM, no el `ref` del contenedor.** Cuando salta ese
> `autoFocus` el ref todavía puede estar sin enganchar; el marcado ya está
> puesto. Con la guarda por ref el fallo seguía igual, y solo se entendió
> instrumentando el hook y leyendo la consola del navegador.

#### Verificación de los cinco, con teclado real

Abrir con Enter · Tab más veces que enfocables sin salirse · Shift+Tab ·
Escape · foco de vuelta al disparador · Tab libre después.

| Modal | Enfocables | Foco vuelve a |
|---|---:|---|
| Lightbox de la galería | 22 | «Ver la imagen ampliada» |
| Modal de crédito | 12 | «Solicita una evaluación» |
| Nuevo cliente | 4 | «Nuevo cliente» |
| Nuevo agente | 5 | «Nuevo agente» |
| Editar cliente | 5 | «Editar» |

---

### Una trampa nueva al comparar contra un worktree

`.env` está en `.gitignore`, así que **un worktree recién creado no lo tiene** y
el cliente de Supabase cae al `placeholder.supabase.co` del fallback. Todo lo
que dependa de datos —el catálogo, las fichas, los posts— renderiza vacío.

Costó un rato: `/asociados` daba 987px contra 984 y parecía un desplazamiento
del cambio de `h3` a `h2`; con `.env` copiado dio 984 en los dos, o sea 0. La
diferencia era la sección de asociados sin cargar.

> **Antes de comparar contra un worktree, copiar `.env`.** Si no, se comparan
> dos sitios distintos: uno con datos y otro sin ellos.

Suma a las trampas ya anotadas —el foco, la caja de recorte inestable, el estado
asíncrono, la medición no determinista— una quinta: **el entorno del árbol de
comparación**.

---

### Accesibilidad — tanda 5: tamaño táctil y movimiento — 2026-08-08

## ÁREA TÁCTIL: 44×44 SIN CAMBIAR EL TAMAÑO VISUAL

> Un objetivo pequeño no hay que agrandarlo: hay que agrandarle la **zona que
> responde al toque**. `.area-44` en `globals.css` pone un `::after` absoluto,
> centrado, de `max(100%, 44px)`. Como es absoluto no ocupa espacio: el control
> se sigue viendo igual y el layout no se mueve. Un punto de carrusel puede
> medir 8px y tener 44px de área.

### VERIFICAR LA SEPARACIÓN, NO SOLO EL TAMAÑO

> **Ampliar sin mirar al vecino crea un problema peor que el que resuelve.** Si
> dos controles están a menos de 44px, sus áreas se solapan y el toque cae en el
> equivocado — y eso no se ve, porque las áreas son invisibles. Un objetivo
> chico se falla; uno solapado activa otra cosa.
>
> Lo que manda es el **paso entre centros**, no el tamaño. Medido antes de tocar
> nada:

| Grupo | n | Tamaño | Paso | ¿Cabe 44? |
|---|---:|---|---:|---|
| puntos del hero | 5 | 8×8 / 24×8 | 16px | ✗ se solaparían 28px por lado |
| puntos de testimonios | 5 | 8×8 / 24×8 | 16px | ✗ ídem |
| enlaces del footer | 13 | 222×23 | 33px | ✗ se solaparían 11px |
| legales del footer | 4 | 93×16 | 20px | ✗ se solaparían 24px |
| selects del buscador | 4 | 442×18 / 204×18 | 69px | ✓ |
| pastillas Comprar/Arrendar | 2 | 230×31 | 238px | ✓ |
| flechas ↑↓ de testimonios | 2 | 40×40 | 56px | ✓ |
| hamburguesa + logo | 2 | 36×36 / 109×35 | 395px | ✓ |
| enlaces «Ver todas» sueltos | 3 | 266×23 · 196×23 · 216×20 | aislados | ✓ |

**13 ampliados, 28 no.** Los 28 exigen separar elementos, o sea mover el
diseño; eso es una decisión de diseño y no entra en una tanda de accesibilidad.

#### Y comprobar que el área invisible no tape otro control

`«Ver todas las propiedades»` tiene **0px de separación con la tarjeta de
abajo**. Centrada, su área se comía el borde superior de esa tarjeta: el toque
ahí abría el enlace en vez de la propiedad. Arriba tenía 237px libres, así que
usa `.area-44--arriba`, que ancla el pseudo-elemento abajo y crece solo hacia
arriba.

Se comprueba con `elementFromPoint`, no mirando el CSS:

```
18px por encima → el enlace       4px por debajo → la tarjeta
 8px por encima → el enlace       9px por debajo → la tarjeta
```

> **Trampa de medición:** la sonda seguía marcando conflicto después de
> arreglarlo, porque calculaba el área como centrada en vez de leer el
> pseudo-elemento. Con `elementFromPoint` sobre puntos concretos se ve lo que
> pasa de verdad. Y antes de eso marcaba cuatro solapes falsos entre el header y
> el buscador: **a un elemento `position: fixed` no se le suma `scrollY`**, o
> aparece cientos de píxeles más abajo de donde está.

## 2.2.2 — Un botón de pausa, no «detener al pasar el ratón»

Los dos carruseles de la home rotan cada 5s indefinidamente. Los puntos y las
flechas cambian de elemento pero **no detienen la rotación**: no había forma de
pararla.

> Se eligió el **botón visible** sobre «detener al enfocar o al pasar el ratón».
> El hover no existe para quien navega con teclado, y detener al enfocar obliga
> a tabular hasta el hero. Ninguna de las dos cubre el caso que el criterio
> protege: alguien que está **leyendo el texto de al lado** y necesita que la
> foto deje de cambiar. El botón sirve a los tres.

Con `prefers-reduced-motion: reduce` nacen pausados, y el botón ofrece
reanudar: no se pierde contenido, solo deja de moverse sin pedirlo.

### Inventario de movimiento automático

| Qué | Cada | Duración | Control |
|---|---|---|---|
| carrusel del hero | 5.000ms | indefinido | ✓ botón |
| carrusel de testimonios | 5.000ms | indefinido | ✓ botón |
| contadores del hero | — | 1,8s, una vez | no aplica (<5s) |
| slider de `ElBarrancoShowcase` | 5.500ms | indefinido | **✗ pendiente** |

## prefers-reduced-motion: acortar, no eliminar

No aparecía ni una vez en el proyecto. El alcance: 1 `@keyframes`, 7
transiciones en `globals.css`, 64 en estilos inline y 18 clases de Tailwind.
Por eso la regla es global.

> **`transition-duration: 0.01ms`, no `transition: none`.** Con `none`, un
> cambio de estado a mitad de camino puede quedarse trabado; con una duración
> mínima siempre llega a su valor final, solo que sin recorrido visible. Lo
> mismo con `animation-iteration-count: 1`: lleva la animación a su fotograma
> final en vez de cortarla donde esté.
>
> Antes de poner una regla global hay que comprobar que **ninguna animación
> termine ocultando algo**. Acá la única va de `opacity: 0` a `1`, así que
> saltar al final nunca deja contenido invisible. Si alguna terminara en
> `opacity: 0`, esta regla la haría desaparecer.

Además: `scroll-behavior` pasa de `smooth` a `auto`, y los contadores del hero
muestran el número final en vez de contar de 0 a 120 durante 1,8s.

| | normal | reduce |
|---|---|---|
| transiciones | 0.2s · 1.2s · 0.4s | 1e-05s |
| `scroll-behavior` | smooth | auto |
| contadores | 15 · 120+ · 15+ | iguales |
| elementos a medio camino | ninguno | ninguno |
| texto del hero | visible | visible |

### EL CRITERIO CORRECTO DE TAMAÑO TÁCTIL

> **2.5.5 «Tamaño del objetivo» (44×44) es nivel AAA en WCAG 2.1.**
> El criterio de nivel **AA** es **2.5.8 «Tamaño del objetivo (mínimo)»**, de
> WCAG 2.2, y pide **24×24** — con dos excepciones que cambian el alcance por
> completo:
>
> - **Separación.** Un objetivo menor de 24×24 cumple igual si un círculo de
>   24px de diámetro centrado en su caja no toca la caja ni el círculo de otro
>   objetivo.
> - **Inline.** Está exento el objetivo que va dentro de una frase, o cuyo alto
>   lo fija el interlineado del texto que lo rodea.
>
> **El admin usa 44×44 por decisión propia, no por obligación normativa.** Y
> los 13 objetivos que se ampliaron a 44 en la home se quedan así: cumplir AAA
> donde salió gratis es mejor, no peor. Lo que no corresponde es pagar un
> cambio de diseño para llegar a 44 donde AA se cumple con 24.

---

### Accesibilidad — tanda 6: el criterio correcto, y el último carrusel — 2026-08-08

## La excepción por separación cambió el alcance de 28 a 6

Evaluados los 21 objetivos por debajo de 24px con la **regla real** de 2.5.8 —un
círculo de 24px centrado en la caja que no debe tocar ni la caja ni el círculo
de un vecino— y no por tamaño:

| Grupo | n | Veredicto |
|---|---:|---|
| enlaces del footer | 13 | **✓ ya cumplían.** 167×23, el círculo llega a 12px y la caja vecina está a 21px |
| legales del footer | 4 | **✓ exentos por inline.** Van dentro de un `<p>`: «© 2026 SDM Capital · … · Diseño …» |
| puntos de carrusel | 10 | **✗ 6 fallaban.** Paso de 16px entre los de 8px: sus círculos se cortaban |

**El cambio real fueron dos números**, no un rediseño: la separación de las dos
filas de puntos pasa de 8px a 18px. El paso entre los puntos chicos queda en
26px y el círculo llega a 22px de la caja vecina.

> **El punto se sigue viendo de 8px.** Lo que cambia es el aire entre ellos. En
> 2.5.8 el tamaño y la separación son intercambiables: se cumple agrandando el
> objetivo *o* separándolo, y separar suele costar mucho menos diseño.

Cuánto creció, medido:

| | antes | después |
|---|---:|---:|
| extensión de cada fila de puntos | 88px | **128px** (+40, centrada) |
| alto total de la página | 10127 | **10127** (sin cambio) |

Y comprobado con `elementFromPoint` sobre el centro de cada punto: **5 de 5 se
pulsan a sí mismos**, ninguno queda tapado por el vecino.

#### El caso de los enlaces del footer merece guardarse

Tenían 222×23 y **parecían** incumplir: 23 < 24. Contarlos por tamaño daba 13
problemas; evaluarlos por la regla completa daba cero. **Un pixel de diferencia
en la altura no dice nada por sí solo** — lo que decide es cuánto aire hay
alrededor.

## El último movimiento automático sin control

El slider de `ElBarrancoShowcase` rotaba cada 5,5s. Recibe el mismo botón que el
hero y los testimonios.

> **El nombre accesible sigue al idioma activo.** Esa página arranca en inglés y
> tiene su propio diccionario dentro del componente: un rótulo fijo en español
> no lo leería nadie de los que efectivamente la usan. El botón y los puntos se
> traducen con el mismo `lang` que el resto de la página.

De paso, los puntos pasan de «Slide 1» a «Slide 1 of 4» / «Foto 1 de 4»: en un
carrusel, el total es la mitad de la información.

Ahí los puntos miden 6px, así que la separación va a **20px** y no 18: con 18 el
paso quedaba exactamente en 24 —círculos tangentes, el límite justo del
criterio— y con 20 queda en 26, el mismo margen que en la home.

### Inventario final de movimiento automático

| Qué | Cada | Control |
|---|---|---|
| carrusel del hero | 5.000ms | ✓ botón |
| carrusel de testimonios | 5.000ms | ✓ botón |
| slider de El Barranco | 5.500ms | ✓ botón, bilingüe |
| contadores del hero | 1,8s una vez | no aplica (<5s), y con `reduce` no animan |

**No queda movimiento automático sin forma de detenerlo.**

---

### Accesibilidad — tanda 6: los menores — 2026-08-08

## Los tokens en px ignoraban la preferencia de tamaño de fuente

> Un tamaño en `px` no responde al ajuste de tamaño de letra del navegador, que
> es lo que usa mucha gente con baja visión. Subirla a 20px no hacía nada.

Los 13 tokens pasan a `rem` sobre base 16 — **en los dos sitios a la vez**,
`globals.css` y `tailwind.config.js`. Si solo se tocaran las custom properties,
`text-sdm-sm` seguiría en px mientras `var(--sdm-text-sm)` escalaría, y la misma
escala se comportaría distinto según cómo se escriba.

Las dos verificaciones previas, antes de aplicar:

- **El `<html>` no fija `font-size`**, así que la base es 16 y el cálculo vale:
  11px = 0.6875rem, 15px = 0.9375rem, 72px = 4.5rem.
- **Nadie hace aritmética con esos valores**: ni `parseInt`, ni `calc()`, ni
  alturas derivadas. Solo se usan como `fontSize`.

Medido con la fuente del navegador en 20px, en cuatro rutas:

| fuente | base | texto medio | ancho | recortes |
|---|---|---|---|---|
| 16px | 16px | 15–17px | 500/500 ✓ | 0 ✓ |
| 20px | 20px | 19–21px | 500/500 ✓ | 0 ✓ |

Ni desbordes ni cajas con texto cortado, así que no hizo falta detenerse. Con la
fuente por defecto: **0 píxeles de diferencia** — 0.9375rem sobre base 16 son
exactamente los 15px de antes.

`CotizacionPDF` y `tarjeta.css` no se tocaron, y no hacía falta excluirlos: **no
referencian los tokens ni una vez**.

## Un icono junto a un texto se anuncia además del texto

70 iconos de lucide dentro de botones que ya tienen texto pasan a
`aria-hidden="true"`: sin eso el lector dice «Imprimir / Guardar PDF, imagen».

> Aplicado con AST y **solo donde el botón tiene texto propio**. Si el icono
> fuera el único contenido, ocultarlo dejaría al botón sin nombre.

Sobre los botones de solo icono: **no había ninguno sin nombre accesible**.
Verificado sobre el árbol de accesibilidad, no leyendo el código: **179 botones
en `/admin`, 0 sin nombre**.

## `.sr-only` no existía

Se crea en `globals.css` con el patrón estándar: caja de 1px recortada y fuera
del flujo.

> **Ni `display: none` ni `visibility: hidden`.** Esos ocultan también al lector,
> que es exactamente lo contrario de lo que hace falta. Verificado: la caja mide
> ≤1×1 y su texto sigue en el árbol de accesibilidad.

La usa la celda de país de `Propiedades`, donde la bandera era el único
contenido: ahora el emoji va `aria-hidden` y al lado va «Chile» o
«Internacional».

## Estado programático: eran tres controles, no uno

| Control | Qué faltaba |
|---|---|
| Activa/Pausada de propiedades | `aria-pressed`. Ya tenía texto además del color |
| interruptor del banner | **todo**: sin texto dentro, el lector decía «botón» |
| interruptor de cada servicio | ídem |

Los dos interruptores llevan `role="switch"` con `aria-checked`, **no
`aria-pressed`**: son encendido/apagado, no un botón que queda hundido. Y
`aria-label`, porque su rótulo vive en un `<span>` hermano que no los nombra.

---

## AUDITORÍA DE ACCESIBILIDAD — CIERRE

Seis tandas. Lo que se corrigió, por criterio:

| Criterio | Qué |
|---|---|
| 1.1.1 | la bandera deja de ser el único contenido |
| 1.3.1 · 2.4.6 | 190 campos asociados a su etiqueta · un `h1` por página en las 19 rutas |
| 1.4.1 · 1.4.3 · 1.4.11 | contraste de paleta, insignias y el anillo de foco |
| 2.1.1 · 2.1.2 | menús del header, 8 divs a `<button>`, 5 modales con foco atrapado |
| 2.2.2 | los tres carruseles con control de pausa |
| 2.4.3 · 2.4.7 | orden de foco en los modales · anillo visible en todo control |
| 2.5.8 | tamaño táctil, con la regla de separación |
| 3.1.1 · 3.1.2 | idioma declarado donde el contenido cambia |
| 4.1.2 | nombre y estado en botones, interruptores y grupos |

### LO QUE QUEDÓ FUERA, Y POR QUÉ

**1. El reordenamiento por teclado — NO SE HIZO.** `usePointerSort` usa Pointer
Events: propiedades, equipo, asociados, fotos del hero, destacadas, dossiers,
imágenes de propiedad, unidades y el sidebar solo se reordenan con ratón o dedo.
`TarjetasEquipo` es el único con botones ▲▼.

> Son **diez** puntos de uso del hook, no seis, y cada uno tiene su propio
> manejador de reordenamiento —unos escriben en Supabase, otros en estado local,
> el sidebar en `localStorage`—. Hacerlo bien es un componente compartido, diez
> integraciones y el manejo del foco tras mover en cada una.
>
> **Se dejó entero a propósito.** Media función de teclado —que anda en tres
> paneles y en siete no— es peor que ninguna: el usuario no puede saber dónde
> funciona. Va en su propia tanda.

**2. `Captacion.tsx`** — ~~dominio de la sesión Sofía. Conserva 5 campos sin
etiqueta, 5 `outline: none` y un `<div>` clicable.~~
**Los 5 campos y los 5 `outline: none` se cerraron el 2026-08-09.** El `<div>`
clicable de la fila de lead **sigue pendiente**: no entraba en ese encargo.

**3. Los rótulos en mayúsculas** — excepción consciente, no pendiente. Ver la
tanda 2: el texto ya está en minúsculas y Chrome aplica el `text-transform` al
calcular el nombre accesible. Quitarlo cambiaría el aspecto de todos los
formularios.

**4. Lo que no se puede medir sin un lector de pantalla real.** Todo lo de acá
se verificó contra el **árbol de accesibilidad de Chrome**, que es lo que un
lector consume, pero no es lo mismo que oírlo:

- Si el orden en que se anuncian las cosas **se entiende** al escucharlo.
- Si los nombres son claros dichos en voz alta y sin ver la pantalla.
- Cómo se comporta el foco atrapado con los gestos de VoiceOver o NVDA, que no
  usan Tab.
- Si un rótulo en mayúsculas se deletrea, y en qué lectores.
- Si las tablas del admin se recorren bien en modo tabla.

Eso pide una sesión con VoiceOver o NVDA y, sobre todo, con alguien que los use
a diario. **Lo automatizable está hecho; lo que falta no es automatizable.**

---

### La operación es CHILE Y PARAGUAY — 2026-08-08

> **Dos países. `stats_paises = 2` es correcto y NO debe «corregirse» a 1.**
>
> El sitio arrastraba una promesa de operación mundial que no existía: una
> sección de destinos con Miami, Orlando, Nueva York, Punta Cana, España y
> Uruguay, y textos que decían «Chile y el mundo». Víctor confirmó que la
> operación real es Chile y Paraguay.
>
> `servicio_inv_int_desc` ya estaba reescrito a Paraguay en la base antes de
> esta tanda, y `servicio_banco_visible` (bancarización en EE.UU.) ya estaba en
> `false`. Lo de acá es el resto.

#### Eran 12 textos, no 3

El encargo listaba tres. El barrido encontró la misma frase repartida en:

| Dónde | Qué |
|---|---|
| `index.html` | meta description, `og:description` y el JSON-LD |
| `SEO.tsx` | la descripción por defecto de todas las rutas |
| `functions/blog/[slug].js` | **la misma descripción, duplicada** |
| `HomePage.tsx` | su propio `<SEO description>`, que pisa a la anterior |
| `HeroSection.tsx` | el respaldo de `hero_kicker` |
| `i18n.ts` | el kicker, en español **y en inglés** («Chile & worldwide») |
| `BlogPage.tsx` · `QuienesSomosPage.tsx` | respaldos de `blog_subtitulo` y `qs_historia_2` |
| `Contenido.tsx` | los valores por defecto de esas tres claves |

##### El que ninguna búsqueda encontraba

En el hero hay un bloque **visible** escrito a mano que decía «Inversión
inmobiliaria / Chile & el mundo», con el ampersand como entidad HTML
`&amp;`. Buscar `Chile & el mundo` no lo encuentra: en el archivo dice
`Chile &amp; el mundo`.

**Era el único de los doce que se leía en pantalla.** Los otros once son
metadatos o respaldos que la base pisa.

> Y al verificarlo en el navegador tampoco aparecía: `innerText` **aplica
> `text-transform`**, así que buscar «Paraguay» falla donde el CSS muestra
> «PARAGUAY». Hay que comparar sin distinguir mayúsculas.

#### El tagline NO se toca

«Tu socio confiable en el **mundo** de los bienes raíces» usa «mundo» en
sentido figurado, no geográfico. Vive solo en la base.

#### Material muerto borrado, y cómo se confirmó

| Símbolo | AST |
|---|---|
| `CITIES` | 1 declaración, 0 usos |
| `cityImgs` | 1 declaración, 0 usos |
| sección `internacional` del i18n | 0 accesos fuera de `i18n.ts` |

> Se comprobó con el AST y no con grep. Los tres `.internacional` que aparecían
> en el barrido eran la **columna `propiedades.internacional` de la base**, no
> la sección del diccionario: un grep los habría contado como uso y el bloque
> se habría quedado.

`CITIES` traía conteos por destino —Miami 3, Punta Cana 5, Orlando 2, España 3,
Uruguay 8— **escritos a mano, que nunca salieron de la base**. Nunca se
renderizaron: la constante estaba declarada y sin usar.

También se fue el panel del admin que subía las seis imágenes de destinos, que
era lo que más molestaba: le ofrecía a Víctor administrar imágenes que no se
publicaban en ninguna parte.

#### HUÉRFANO CONOCIDO: las seis claves `dest_*_img`

`dest_miami_img`, `dest_punta_cana_img`, `dest_orlando_img`, `dest_espana_img`,
`dest_uruguay_img` y `dest_nueva_york_img` **siguen en `contenido_sitio`, con
sus imágenes subidas**. Ya no las lee ni las escribe nadie.

Se dejan a propósito: borrar filas de la base es otra decisión y no urge. Si
alguien las ve y no encuentra quién las usa, la respuesta está acá.

#### Verificación

Ningún «el mundo» geográfico queda en el código. En el home, el hero dice
«INVERSIÓN INMOBILIARIA · CHILE & PARAGUAY», el contador sigue en «2+ PAÍSES»,
y no aparecen Miami, Punta Cana ni Uruguay. El panel «Inicio» del admin termina
en «Sección Financiamiento» sin ningún contenedor vacío. Los chunks bajan:
AdminPage 186,54 → 185,85 kB, index 243,77 → 243,29 kB.

---

## El flash del hero: siembra del contenido en index.html

**Sesión de accesibilidad — dominio `HeroSection.tsx`, `src/hooks/`, `scripts/`.**

### El problema

Los textos del hero viven en `contenido_sitio` y `useContenido` los consulta
recién después de que React monta. Hasta que llega la respuesta se pintan los
defaults escritos en el código, así que el visitante leía «Tu socio» y a los
~600ms el texto saltaba a «Tu socio confiable».

Medido antes del arreglo (localhost, mediana de 5 corridas):

| | |
|---|---|
| Primer texto pintado | 142 ms |
| El texto cambia | 807 ms |
| **Flash visible** | **249 ms** (mediana) |
| **LCP** | **408 ms** — el div del fondo del hero, 1440×749 |

Los defaults además se habían desincronizado: decían «Tu socio», «en Chile **y
el extranjero**» y «**10** países» mucho después de que la operación quedara en
Chile y Paraguay. Eso se pintaba en cada carga.

### El mecanismo

`scripts/sync-contenido-seed.mjs` corre en el `prebuild`, consulta las 18 claves
del hero y las deja escritas en `index.html` entre las marcas
`CONTENIDO_SEED:inicio` / `:fin`, dentro de un
`<script type="application/json" id="sdm-contenido-seed">`. `useContenido` lo lee
al importarse y arranca con esos valores en vez de con `{}`.

**La consulta se hace igual**: lo que vuelve pisa la semilla. La semilla es solo
el arranque.

Mismo patrón que `sync-hero-preload.mjs`, que ya hacía esto con la URL de la
foto. Los dos comparten `scripts/lib/entorno.mjs` — antes cada uno tenía su
copia de `leerEnv()`.

### Resultado

| | Antes | Después |
|---|---|---|
| Flash | 249 ms | **0 ms** |
| LCP | 408 ms | **164 ms** |
| Contador de países | 0→1→2→**3**, vuelve a **0**, sube a 2 | 0→1→2, monótono |

El LCP mejoró en vez de empeorar, y por una razón concreta: el elemento del LCP
es el div del fondo del hero, y su `background-image` **colgaba de la consulta**.
El `<link rel="preload">` calentaba los bytes pero el pintado seguía esperando a
que React supiera la URL. Con la semilla, la URL está en el primer render.

### EL COMPROMISO: la semilla envejece

**La semilla es de la hora del build.** Si Víctor edita un texto del hero desde
el admin y no hay deploy, el primer pintado muestra lo anterior y la consulta en
vivo lo corrige — o sea, vuelve el flash.

Es un efecto **nuevo**, y hay que saberlo: hoy el flash era constante; ahora es
intermitente, solo entre una edición del hero y el siguiente deploy. Cualquier
deploy lo resincroniza. El cambio es a mejor, pero deja de ser un
comportamiento estable y pasa a depender de cuándo fue el último build.

### El contador

`useCounter` anima de 0 al objetivo, y su efecto depende de `target`. Si arranca
antes de que llegue la base, anima hacia el default y a mitad de camino el
objetivo cambia: el intervalo se rehace con `start = 0` y **el número vuelve a
cero a la vista**. Medido en países (default 10, base 2): 0→1→2→3 a los 657ms,
de vuelta a 0 a los 807ms, y recién el 2 final a los 2390ms.

Ahora `AnimatedStat` recibe `habilitado` y no arranca hasta que el número es
definitivo — `listo` de `useContenido`, que es true desde el primer render si
hay semilla, o cuando contesta la consulta si no la hay.

Con un plazo de 2,5s como red de seguridad: si la consulta se cuelga sin
resolver ni fallar, `listo` no llegaría nunca y los tres números se quedarían en
0 para siempre. Verificado colgando la consulta con la semilla vacía: los
contadores quedan en 0 hasta los 2,5s y después animan a 120 / 15 / 2.

### Lo que NO rompe el build

`sync-contenido-seed.mjs` sale con 0 pase lo que pase. Verificado en cinco
modos: 500 de Supabase, respuesta que no es un arreglo, host caído, sin
credenciales, y `npm run build` entero con `VITE_SUPABASE_URL` apuntando a un
puerto muerto. En los cinco `index.html` queda **sin tocar**.

Al fallar se deja la semilla anterior en vez de vaciarla: una semilla de ayer
sigue siendo mejor que ninguna, y ninguna es exactamente el comportamiento de
antes de que este script existiera.

### El escapado

El contenido de `contenido_sitio` lo escribe Víctor desde el admin: desde el
script es **entrada no confiable**. Un `</script>` en cualquier texto cerraría el
bloque y lo que siguiera se parsearía como HTML.

Dentro de un `<script>` el parser de HTML trata todo como texto crudo y **no
decodifica entidades**, así que `&` y `"` viajan tal cual y escaparlos los
rompería — llegarían como `&amp;` literal. Lo único que termina el bloque
empieza por `<`, así que se escapan todos los `<` como `\u003c`, que dentro de
JSON es el mismo carácter. Encima el bloque va con `type="application/json"`:
el navegador no lo ejecuta jamás.

Verificado con un Supabase falso que devuelve
`Cierra </script><img src=x onerror="alert(1)"> y sigue`, comillas dobles y
simples, `&`, `&amp;`, `<!-- -->`, saltos de línea, tabs, emoji y U+2028. El
round-trip es exacto, en el DOM hay **0** `<img src=x>`, **0** scripts sin tipo,
ningún diálogo se abrió, y el `h1` renderiza el texto como texto.

> No se pudo probar escribiendo en la base real: la clave anon **no tiene
> permiso de escritura** sobre `contenido_sitio`, que es lo correcto. Por eso el
> servidor falso.

### ALCANCE: solo el hero

Se sembraron **18 claves, 807 bytes** (361 gzip). `contenido_sitio` tiene **148
claves, 11 kB** (4 kB gzip) — sembrarla entera cabría de sobra.

**Los otros 15 componentes que usan `useContenido` siguen con el patrón viejo** y
tienen el mismo flash dondequiera que un default difiera de la base: `RentalPage`
(29 claves), `VendeConNosotrosPage` (15), `HomePage` (11), `BannerPromo` (7),
`ServiciosPage`, `QuienesSomosPage`, `PropiedadesPage`, `PropiedadDetailPage`,
`BlogPostPage`, `ContactSection`, `Footer`, `FloatingButtons`.

Se resuelven ampliando `CLAVES` en el script o sembrando la tabla entera. Se
dejó fuera a propósito para medir el hero primero.

### `hero_kicker` ya no pinta nada

El kicker del hero es **texto fijo en el JSX** desde la limpieza de «Chile y
Paraguay»: necesita el salto de línea en un punto exacto. La clave `hero_kicker`
sigue en la base y editable desde el admin, pero no se renderiza — se leía en un
`const` que nadie usaba, y ese `const` se borró.

En la base la clave tiene `"Inversión inmobiliaria · Chile "`, con espacio al
final y sin Paraguay. No importa mientras nadie la reconecte; si alguien lo
hace, tiene que ir también a `CLAVES` en `sync-contenido-seed.mjs`.

### Efecto en el repositorio

`index.html` **se modifica en cada build** si cambió alguna clave del hero, igual
que ya pasaba con el preload. Es intencional: así lo que se sembró queda
commiteado y revisable en el historial. Al deployar, `npm run build` regenera la
semilla antes de `wrangler pages deploy`, así que lo que sube siempre está al día
con la base en ese momento.

---

## La semilla se amplía a toda `contenido_sitio`

Antes cubría 18 claves del hero. Ahora **las 148**, o sea la tabla entera.

Se hizo por partes a propósito: primero el hero, para medir si el mecanismo
valía la pena antes de extenderlo. Valió —flash 249 → 0 ms, LCP 408 → 164 ms—
así que se amplió.

Sembrar la tabla entera en vez de una lista tiene una ventaja que no es de peso:
**no hay lista que mantener sincronizada**. Una clave nueva usada desde
cualquier componente queda sembrada sola. La lista de 18 ya obligaba a acordarse
de dos lugares.

### Peso

| | Antes | Después |
|---|---|---|
| `dist/index.html` sin comprimir | 5.927 B | 16.146 B |
| `dist/index.html` gzip | 1.971 B | **5.514 B** |

+3.543 B comprimidos, al lado de los 67 kB gzip del bundle principal.

### Flash, medido antes y después

La medición fue difícil de hacer bien y conviene saber por qué, porque el
método obvio da números falsos.

Medir «texto que cambia después del primer pintado» cuenta secciones que montan
tarde por `IntersectionObserver` y fichas de propiedades que vienen de otra
tabla: así el home marcaba 5.669 ms de flash, que era mentira. Lo que funciona
es **cargar la página con `contenido_sitio` bloqueada**: ese render es, por
definición, lo que el visitante ve antes de que llegue la consulta. Si es igual
al final, no hay flash posible por más que la consulta tarde.

| Página | Flash antes | Flash después | LCP antes | LCP después |
|---|---|---|---|---|
| home | 292 ms | **0** | 144 ms | 128 ms |
| catálogo | 0 | 0 | 744 ms | 736 ms |
| ficha de propiedad | 269 ms | **0** | 528 ms | 384 ms |
| /rental | 269 ms | **0** | 388 ms | 216 ms |
| /vende-con-nosotros | 0 | 0 | 388 ms | 140 ms |
| /admin | 0 | 0 | 116 ms | 104 ms |

Ningún LCP empeora. El del catálogo llegó a marcar 764 → 784 ms con 6 muestras;
con 15 por lado quedó 744 → 736. Era ruido.

**El pie de página era el que más daño hacía**: está en todas las rutas
públicas y sus teléfonos por defecto no son los de la base, así que en cada
ficha y en /rental se veían ~270 ms los números viejos. Ese es el flash que
desaparece.

### Costo en el admin, que no usa nada de esto

`/admin` **no consulta `contenido_sitio` ni una vez**. La semilla ahí es peso
muerto:

- +3,8 kB comprimidos en el HTML.
- `JSON.parse` de las 148 claves: **0,067 ms**.
- LCP 116 → 104 ms, sin penalización medible.
- La pantalla de acceso carga normal: 2 campos, 1 botón, 16 nodos, 0 errores.

### EL COMPROMISO, ahora para todo el sitio

La semilla es de la hora del build. Si Víctor edita **cualquier** texto desde el
admin y no hay deploy, el primer pintado muestra lo anterior y la consulta en
vivo lo corrige — vuelve el flash hasta el siguiente deploy.

Antes esa ventana valía solo para el hero. **Ahora vale para todo el sitio.**
Sigue siendo mejor que el estado anterior, donde el flash era constante, pero es
un comportamiento que depende de cuándo fue el último build y conviene tenerlo
presente al mirar el sitio después de editar.

#### REGLA: OCULTAR ALGO DESDE EL ADMIN EXIGE DESPLEGAR

Para los textos, la ventana solo significa ver lo anterior un instante. **Para
los interruptores que OCULTAN una pieza del sitio significa otra cosa: la pieza
apagada sigue asomando ~300 ms a cada visitante hasta el siguiente despliegue.**

Hoy son dos:

| interruptor | qué oculta | dónde |
|---|---|---|
| `banner_activo` | el banner promocional del inicio | Contenido → Inicio |
| `servicio_*_visible` | una tarjeta de servicio entera | Contenido → Servicios |

**Si se apaga porque la oferta terminó o el servicio ya no se presta, hay que
desplegar.** Guardar en el admin no basta.

Está avisado en el propio panel, junto a los dos interruptores, con el
componente `AvisoDespliegue` de `Contenido.tsx`. El texto dice qué hacer —«pide
que se despliegue el sitio»— y no explica la semilla: a quien administra el
sitio no le sirve entender el mecanismo.

Es la misma familia que el pendiente de las tres claves de testimonios, con la
diferencia de que aquello era una tarea puntual y esto es una regla permanente.

### Dos cosas que aparecieron midiendo, y que la semilla no arreglaba

> **Ya están cerradas.** Ver «Una consulta por página, y las claves sueltas
> pasan por el hook», más abajo. Se dejan acá porque explican por qué existía
> el problema.

#### 1 · Hay consultas a `contenido_sitio` que no pasan por `useContenido`

El catálogo pide `contenido_sitio?select=valor&clave=eq.catalogo_orden` y el
home pide `clave=eq.home_destacadas_ids`, cada uno por su cuenta. Son consultas
sueltas, así que **la semilla no las cubre**: el orden de las fichas del
catálogo y la selección de destacadas del home siguen llegando tarde.

Con la consulta bloqueada el catálogo muestra las mismas 54 fichas en otro
orden, así que la clave decide el orden y llega tarde.

> CORRECCIÓN: acá se dijo que «la grilla se reordena a los ~300 ms». Eso era una
> inferencia, no una medición, y al medirlo resultó falso: las fichas aparecen
> a los ~925 ms, bastante después de que llega `catalogo_orden`, así que el
> reordenamiento nunca se llegaba a ver. La carrera existía —si las propiedades
> vinieran del caché y el contenido tardara, se vería— pero el síntoma estaba
> exagerado.

Se arreglarían leyendo esas dos claves desde `useContenido` —ya vienen en la
semilla— en vez de con una consulta propia.

#### 2 · `useContenido` dispara una consulta POR COMPONENTE, no una por página

El caché de módulo solo funciona **después** de que vuelve la primera respuesta.
Todos los componentes montan antes de eso, así que todos ven `cache === null` y
todos lanzan su propia consulta. Medido con `PerformanceResourceTiming`:

| Ruta | Consultas idénticas |
|---|---|
| home | 6 |
| /rental | 4 |
| ficha | 3 |
| /vende-con-nosotros | 3 |
| catálogo | 2 |

Con la consulta bloqueada llegó a 20 en el home, porque al fallar nunca se
llena el caché y cada reintento de render vuelve a pedir.

Se resuelve guardando la promesa en vuelo a nivel de módulo, no solo el
resultado. No se tocó en esta pasada.

---

## Una consulta por página, y las claves sueltas pasan por el hook

Cierra las tres pendientes que había dejado la semilla.

### `useContenido` pedía una vez por componente

**Corrección de un diagnóstico anterior:** en su momento describí `useContenido`
como «una consulta por carga de página compartida por los 16 componentes». Era
falso. El caché de módulo guardaba el **resultado**, y eso solo sirve *después*
de que vuelve la primera respuesta. Todos los componentes montan antes, todos
ven `cache === null` y cada uno abría su propia consulta idéntica.

Ahora se guarda también la **petición en curso** (`enVuelo`): el segundo
componente que monta se engancha a la del primero.

| Ruta | Antes | Después |
|---|---|---|
| home | 7 (6 del hook + `home_destacadas_ids`) | **1** |
| catálogo | 3 (2 del hook + `catalogo_orden`) | **1** |
| ficha | 4 | **1** |
| /rental | 4 | **1** |
| /vende-con-nosotros | 3 | **1** |
| /quienes-somos | 4 | **1** |
| /servicios | 4 | **1** |
| /blog | 2 | **1** |

#### La promesa no puede quedar envenenada

Cachear la petición tiene un riesgo que el caché de resultado no tenía: si la
consulta falla y la promesa queda guardada, el sitio se queda sin contenido
hasta recargar. Por eso la referencia se suelta **siempre** al terminar. Si
falló, `cache` sigue en null y `enVuelo` vuelve a null, así que la próxima
montura reintenta; si salió bien, responde `cache` y no se vuelve a pedir.

Verificado: se carga con la consulta bloqueada (falla), se desbloquea, y una
navegación del lado del cliente dispara el reintento — 3 → 4 peticiones. Una
tercera navegación **no** vuelve a pedir: ya hay caché.

`invalidateContenidoCache()` limpia las dos. Si el admin guarda mientras una
consulta viaja, esa respuesta ya es vieja y engancharse a ella devolvería
justamente los datos que se acaban de reemplazar.

### `catalogo_orden` y `home_destacadas_ids` salen del hook

Las dos consultas sueltas se fueron. Ahora se leen con `get()`, así que vienen
sembradas en index.html y el primer render ya tiene el valor bueno. Siguen
actualizándose si la consulta en vivo trae otra cosa, porque el efecto del home
depende del valor y el orden del catálogo se aplica en el render.

El catálogo no se reordena: 54 fichas, **un solo estado de la grilla, 0
reordenamientos**. Tampoco antes, según se explica en la corrección de más
arriba.

De paso, el `JSON.parse` de `home_destacadas_ids` quedó dentro de un try: iba
suelto, y una comilla de más en la base tiraba el efecto entero — sin
destacadas y sin respaldo.

> El home sigue mostrando `SAMPLE_PROPS` (las fichas de muestra `/propiedades/1`
> a `/6`) durante los primeros ~400 ms, hasta que llegan las reales. Eso no lo
> toca esta pasada: son datos de la tabla `propiedades`, no de contenido.

### El kicker vuelve a `hero_kicker`

Era la peor combinación: el campo estaba en el admin y no movía nada. Los
renglones se separan con `\n` en el valor y cada línea se renderiza en su
`<span>` con `display: block`; se recortan espacios y se descartan líneas
vacías, porque un campo de texto libre no puede mover el diseño.

Verificado píxel a píxel con la foto del carrusel fijada —emulando
`prefers-reduced-motion: reduce`, que la deja pausada en la primera— y la
consulta bloqueada: **0 píxeles distintos de 114.400**, y el contenedor mide
exactamente lo mismo, `64,120,1312,33`.

#### PENDIENTE: el valor de la base está viejo

`hero_kicker` contiene hoy `"Inversión inmobiliaria · Chile "` — un solo
renglón, con espacio al final, sin Paraguay y con un `·` que el maquetado ya no
usa. **Hasta que se corrija desde el admin, el kicker muestra ese texto**, no el
default del código: `get()` devuelve el valor de la base porque no está vacío, y
la semilla lo lleva tal cual.

El texto que hay que dejar en Textos del sitio → Inicio → `hero_kicker` es dos
renglones:

```
Inversión inmobiliaria
Chile & Paraguay
```

### LCP

| | Antes | Después |
|---|---|---|
| home | 132 ms | 128 ms |
| catálogo | 836 ms | 772 ms |
| ficha | 404 ms | 432 ms |
| /rental | 128 ms | 124 ms |
| /vende-con-nosotros | 128 ms | 132 ms |
| /admin | 108 ms | 112 ms |

Home y catálogo mejoran. Ficha, vende y admin se mueven dentro del ruido: sus
rangos se solapan casi por completo (la ficha, por ejemplo, va de 368 a 468 ms
antes y de 372 a 592 después).

---

## NO SE USAN DATOS DE MUESTRA EN PRODUCCIÓN

Tres páginas arrancaban con arreglos de datos inventados y los pintaban hasta
que llegaba la consulta. **Se borraron los tres.** Si alguien vuelve a
necesitar relleno para desarrollar, que sea detrás de una bandera y nunca en el
estado inicial de un componente.

| Página | Arreglo | Qué inventaba |
|---|---|---|
| `HomePage` | `SAMPLE_PROPS` | 6 propiedades con enlaces a `/propiedades/1..6`, que no existen |
| `AsociadosPage` | `SAMPLE_ASOCIADOS` | Portal Inmobiliario, BCI, Santander, CBRE, Century 21 como socios, con enlace a sus sitios reales |
| `QuienesSomosPage` | `SAMPLE_EQUIPO` | Tres personas inventadas con cargo y biografía, presentadas como el equipo |

### Las tres razones, en orden de gravedad

**1 · Afirmaban relaciones comerciales que no existen.** Las propiedades falsas
dan un enlace roto —`/propiedades/1` responde «Propiedad no encontrada»—, pero
nombrar a cinco empresas reales como socias de SDM, y a tres personas que no
existen como su equipo, es otra categoría de problema.

**2 · Ante un fallo de red se quedaban para siempre.** El patrón era
`if (data && data.length > 0) setX(data)`. Un error deja `data` en null, así que
no se llamaba a `setX` y el estado inicial permanecía. No había ninguna rama que
distinguiera «cargando» de «falló». Verificado bloqueando cada consulta: los
tres arreglos seguían en pantalla.

**3 · No eran un respaldo, eran relleno de desarrollo.** `SAMPLE_PROPS` viene
del primer commit del repositorio (`61f0ab8`) con el comentario `Sample data for
empty DB`, y sus seis registros no tienen `slug`. Un respaldo diseñado para el
fallo no enlazaría a URLs inexistentes.

### Lo que hay ahora

Estado inicial `[]`, una bandera de tres valores —`cargando` / `listo` /
`error`— y esqueletos (`src/components/ui/Esqueleto.tsx`) que reservan el
espacio mientras carga. Con resultado vacío no se pinta nada; con error, un
mensaje.

Duración de los esqueletos, medida: home 138→450 ms, `/asociados` 99→360 ms,
`/quienes-somos` 75→324 ms.

**El LCP no sufre** porque el bloque de destacadas está bajo el pliegue: la
primera ficha empieza en y=1181 px con un viewport de 813 px, y el elemento del
LCP del home es el div del fondo del hero. Medido: 128 → 116 ms.

### SUPABASE REINTENTA ~7 SEGUNDOS ANTES DE DARSE POR VENCIDO

Al medir el estado de error apareció esto, que conviene tener presente para
cualquier UI que dependa de una consulta:

```
petición 1 →  107 ms
petición 2 → 1114 ms
petición 3 → 3118 ms
petición 4 → 7121 ms   ← recién acá resuelve
```

Con la red caída, el mensaje de error tarda **unos 7 segundos** en aparecer. Es
correcto —hasta entonces todavía está intentando— pero explica por qué una
sonda que mira a los 6 segundos concluye que la UI está colgada. Pasó: reporté
que el mensaje no aparecía y era la sonda la que miraba temprano.

> Y de paso, la parte que sí estaba mal en mi diagnóstico: creí que el builder
> de supabase **rechazaba** ante un fallo de red. **No: resuelve con
> `{ error: 'TypeError: Failed to fetch' }`.** Comprobado con una sonda en las
> dos ramas. El segundo argumento de `then` queda igual, como red de seguridad,
> pero no es el camino que se recorre.

### La jerarquía de encabezados aguanta con y sin datos

Verificadas las seis combinaciones (tres páginas × con datos / consulta
bloqueada): **0 saltos de nivel** en todas. En `/quienes-somos` el bloque del
equipo pierde sus tres `<h3>` y queda `<h2>` seguido de `<h2>`, que no es salto.

`/propiedades/<algo que no existe>` era la única ruta del sitio que se
renderizaba **sin ningún `<h1>`**: se saltó el contrato de la tanda 4. Ahora
tiene su `<h1>` y un enlace de salida al catálogo.

---

## «Más de 10 países» y los seis «en Chile y el extranjero»

Restos de la limpieza internacional que mi propia auditoría no encontró. Ahí
busqué «el mundo» y los seis destinos, y reporté «ningún "el mundo" geográfico
queda en el código» — cierto de lo que busqué, incompleto como barrido.

**Lo falso**, que estaba vivo en `/quienes-somos`:

> 04 · Red Global — «Presencia en más de 10 países.»

Contradecía el contador del hero, que dice «2+ PAÍSES». Ahora:

> 04 · Alcance regional — «Operamos en Chile y Paraguay. Acceso a oportunidades
> inmobiliarias en ambos mercados.»

Se eligió «Alcance regional» y no un rasgo de carácter porque **el bloque de
valores ya mezcla las dos cosas**: el 02 («Más de 15 años en el mercado nos
respaldan») también es un dato con número. El cuarto ítem siempre fue el que
decía DÓNDE se opera; el problema era que el dato era falso, no que fuera un
dato. Del texto de apoyo se cayó además «que otros no pueden ofrecer», que es
incomprobable.

El `<h2>` «Red global» de `/asociados` pasó a **«Red regional»**: su propio
párrafo acota la red a Chile y Paraguay. Una red de socios sí puede ser más
amplia que la operación —son cosas distintas— pero ese texto no dice eso.

**Lo vago**, seis textos con «en Chile y el extranjero» (y sus versiones en
inglés con «abroad»), todos a «Chile y Paraguay»: dos en `/quienes-somos`, dos
en `/asociados`, uno en `/servicios` y los defaults de `hero_subtitulo`,
`financiamiento_body` y `servicios_intro` en el admin. No eran falsos —Paraguay
es el extranjero— pero reabrían la ambigüedad que se venía cerrando.

**`servicio_banco_desc` se deja como está**: «abrir cuentas bancarias y acceder
a servicios financieros en el extranjero» describe un servicio, no dónde opera
SDM. Ahí «el extranjero» es correcto y acotarlo a Paraguay achicaría el
servicio.

---

## El arrastre de fotos, roto en escritorio desde la migración a Pointer Events

`<img>` y `<a>` son **arrastrables por defecto en HTML**. Al presionar sobre una
miniatura y mover, el navegador arranca SU propio arrastre y **deja de entregar
eventos de puntero**. Medido: llegaba un solo `pointermove` y ningún
`pointerup`. El hook se quedaba esperando y la lista no se reordenaba nunca.

```
10 movimientos SIN botón presionado  → 10 pointermove   ✓
10 movimientos CON el botón          →  1 pointermove   ✗   y 0 pointerup
```

Arreglo, una línea en `filaProps` de `useDragSort.ts`:

```ts
onDragStart: (e) => { e.preventDefault() },
```

Va en el hook y no como `draggable={false}` en cada `<img>`: son siete listas, y
la octava que alguien agregue mañana volvería a nacer rota. `dragstart` burbujea,
así que cancelarlo en la fila cubre todo lo que tenga adentro.

### LA LECCIÓN DE MÉTODO, que es lo que más vale de acá

El hook se migró de la API HTML5 a Pointer Events **porque HTML5 no funcionaba en
táctil**. Se verificó en táctil, funcionó, y se dio por bueno.

Quedó roto en **escritorio**, que era justamente donde antes andaba.

Bajo HTML5 el arrastre nativo ERA el mecanismo, así que nadie tenía que pensar en
él. Al cambiar de mecanismo pasó de aliado a competidor, y eso solo se ve con
ratón: desde el dedo el arrastre nativo no se dispara.

> **Al cambiar un mecanismo de interacción hay que probar las DOS entradas, no
> solo la que motivó el cambio.** La entrada que ya funcionaba es precisamente la
> que nadie vuelve a mirar.

### Bisección

`1347901` para la galería de fotos —la migración de `PropImageManager`— y
`ae82003` para el resto. Su diff quita `draggable` de la fila y deja adentro los
elementos que lo traen de fábrica.

**No fue ninguna de las tandas de accesibilidad**, que era la sospecha inicial.
Descartadas una por una: `FieldGroup` es un `div role="group"` y no un `<label>`;
`area-44` no aparece ni una vez en `Propiedades.tsx` —y su `::after` *debe*
recibir eventos, que es lo que agranda el área táctil—; la tarjeta sigue siendo
un `div`; `ea2ea11` solo agregó `aria-hidden`; y el editor de propiedades no es
un modal.

### Verificación — las siete listas, ratón y dedo

| Lista | Ratón | Dedo | Qué queda guardado |
|---|---|---|---|
| Sidebar de pestañas | ✓ | ✓ | localStorage — 0 escrituras a Supabase |
| Propiedades — lista | ✓ | ✓ | 58 × `PATCH propiedades {destacada}` |
| Propiedades — galería | ✓ | ✓ | el `imagenes[]` del formulario |
| Equipo | ✓ | ✓ | 3 × `PATCH equipo {orden}` |
| Asociados | ✓ | ✓ | 5 × `PATCH asociados {orden}` |
| Textos — carrusel del hero | ✓ | ✓ | el formulario de Contenido |
| Textos — destacadas del home | ✓ | ✓ | el formulario de Contenido |

El editor de unidades usa el mismo hook, así que hereda el arreglo, pero **sus
filas no llevan `<img>`: nunca estuvo roto**. No se pudo ejercitar porque la
propiedad abierta no tenía unidades.

La galería se verificó **contra lo guardado**, no contra la pantalla: se
reordena, se pulsa «Guardar cambios» y se captura el cuerpo del `PATCH`. El
`imagenes[]` enviado coincide exactamente con el orden visible, y
`imagen_principal` se mantiene en su foto — reordenar no cambia la portada.

Los tres casos límite:

- **Soltar fuera de la lista** (400px por debajo de la grilla): reordena igual.
  Es lo que arregló `4352f9a` moviendo los oyentes a `window`, y sigue en pie.
- **Clic simple sobre una miniatura**: no reordena y no escribe nada.
- **`[data-orden-quieto]`**: 122 marcados, todos dentro de filas ordenables — el
  interruptor «Activa» y la columna Editar/Eliminar. Arrastrar desde uno de
  ellos no reordena.

### Qué se pierde al cancelar el `dragstart`

Solo esto: **arrastrar una imagen hacia fuera** —a otra pestaña, al escritorio—
desde dentro de una fila ordenable del admin. Verificado que el alcance es
exactamente ese: un `<a>` fuera de las filas sigue arrastrándose, y el menú
contextual sobre la miniatura **no** se cancela, así que «Guardar imagen como…»
sigue funcionando. El sitio público no usa este hook.

### Nota al margen: el orden de la lista de propiedades no se persiste

`Propiedades.tsx:463` escribe `{ destacada: i < 6 }` a cada fila al reordenar:
el orden de esa lista **es** la selección de destacadas del inicio. No escribe
`orden`, así que al recargar la lista vuelve a salir ordenada por la columna
`orden`. Es anterior a este arreglo y puede ser deliberado —lo que se administra
ahí son las seis destacadas, no un orden de catálogo— pero conviene saberlo
antes de reportarlo como bug.

---

## CERRADO: `hero_kicker` se queda como está

Decisión de Víctor, 2026-08-08. **No es un pendiente y no vuelve a los
reportes.**

La clave contiene `"Inversión inmobiliaria · Chile "` —un solo renglón, con
espacio al final y sin Paraguay— y el hero la renderiza tal cual desde que se
reconectó. Queda así a propósito.

Si alguien lo ve y le extraña: el componente parte el valor por `\n` y pinta un
`<span>` por renglón, así que para volver a los dos renglones bastaría con
guardar en el admin

```
Inversión inmobiliaria
Chile & Paraguay
```

pero **no hace falta hacerlo**. Está decidido.

---

## El botón «Ver publicada» en el formulario de edición

Confirmado: **sí aparece con la propiedad pausada**, y sale deshabilitado con el
motivo. En el formulario no hay casilla de por medio —la de «mostrar pausadas»
solo filtra la lista— así que editando una pausada el botón está a la vista.

| | Lista | Formulario |
|---|---|---|
| Propiedad activa | enlace | enlace |
| Propiedad pausada | deshabilitado, **solo si la casilla «mostrar pausadas» está marcada** | deshabilitado, siempre visible |
| Propiedad nueva | no aplica | no se dibuja: todavía no hay slug |

Medido en el formulario de una pausada: `<button>` sin `href`,
`aria-disabled="true"`, `tabIndex 0` —recibe foco, así que la explicación llega
al teclado— y el nombre accesible «Ver ficha publicada de X: no disponible
porque la propiedad está pausada».

### PENDIENTE: el botón mira el borrador, no lo publicado

El formulario tiene su propio selector Activa/Pausada. Al cambiarlo **sin
guardar**, el botón cambia con él:

- pausada → «Activa» sin guardar: el botón se vuelve **enlace**, pero la base
  sigue diciendo `activo = false` y la ficha pública responde «Propiedad no
  encontrada». Es exactamente lo que el botón deshabilitado existía para evitar.
- activa → «Inactiva» sin guardar: se deshabilita aunque la ficha siga en pie.
  Falso negativo, menos dañino.

La causa: el formulario le pasa `editing`, que es el borrador. El botón abre la
versión **publicada**, así que tiene que mirar la fila guardada:

```tsx
<VerPublicada prop={items.find(x => x.id === editing.id) ?? editing} conTexto />
```

El respaldo a `editing` cubre la propiedad nueva, que no está en `items` y
tampoco tiene slug, así que sigue sin dibujarse.

---

## EN CURSO: simplificación del footer — sesión web pública

**Cerrada.** Se tocaron `Footer.tsx`, `ContactSection.tsx` y una línea de
`admin/Contenido.tsx` (los defaults cruzados de los teléfonos).

### `ContactSection` y `Footer` son componentes distintos, y eso importa

Se parecen —los dos van abajo, los dos son navy desde este cambio— pero tienen
ciclos de vida distintos:

| | `ContactSection` | `Footer` |
|---|---|---|
| Dónde se monta | **a mano, en 7 páginas** | en `Layout` → **las 13 rutas públicas** |
| Qué es | una sección con el **formulario de contacto** | el pie del sitio |
| En `/admin` | no | **tampoco** — el admin va fuera de `Layout` |

**`ContactSection` NO está en 6 de las 13 rutas**: `/propiedades`, `/blog`,
`/vende-con-nosotros`, `/politica-de-privacidad`, `/condiciones-del-servicio` y
`/eliminacion-de-datos`. Antes de este cambio, en esas seis **no había ningún
dato de contacto en toda la página**. Esa fue la razón de fondo para subir
teléfonos y email al footer: no era solo simplificar.

> Y una corrección al encargo: se dio por hecho que el footer estaba también en
> `/admin`. No lo está — las rutas de admin se declaran fuera del `<Route
> element={<Layout />}>`. Verificado: `/admin` no tiene `<footer>`.

### Qué quedó

Un solo bloque navy, tres columnas: marca + eslogan + las 4 redes · Navegación ·
Contacto. Fuera la columna «Servicios» (sus tres enlaces viven dentro de
`/servicios`, que ya está en Navegación) y fuera «LAS CONDES · SANTIAGO · CHILE»
del pie.

`ContactSection` se queda con **Dirección y Horario**, que son justamente lo que
el footer no lleva y no existen en ninguna otra parte: **no hay ruta
`/contacto`**, solo el ancla `#contacto` que apunta a esa misma sección.

`footer_tagline` sigue leyéndose de `contenido_sitio`. Es la única clave que
alimenta el footer; ninguna quedó huérfana.

#### Los dos teléfonos, etiquetados

`telefono_1` **es el de WhatsApp**: la clave `whatsapp` vale `56937478846` y
normalizada es idéntica. `telefono_2` es el fijo.

Los defaults del código estaban **cruzados**: `telefono_1` traía el número que en
la base es `telefono_2`, y `telefono_2` uno que ya no existe. No se veía porque
la base manda, pero al vaciar la clave habrían salido los equivocados.
Corregidos en el footer y en `admin/Contenido.tsx`, cuyos campos ahora se rotulan
«Teléfono 1 · WhatsApp» y «Teléfono 2 · fijo».

#### «Reserva tu propiedad» no era deliberado

Se veía distinto —navy en vez de gris, con `tracking-sdm-wide`— solo porque ser
el único enlace externo obliga a `<a>` en vez de `<Link>`, y esa rama se escribió
con otro estilo. Ahora se ve igual que sus vecinos y lleva `ExternalLink`, que es
la marca que de verdad faltaba: «sale del sitio».

### Medidas

| | Antes | Después |
|---|---|---|
| Footer @1440 | 446 px | **398 px** (−11 %) |
| Footer @390 | 763 px | **659 px** (−14 %) |
| Zona contacto+footer @1440, `/quienes-somos` | 1469 px | **1421 px** |
| Zona contacto+footer @390 | 1913 px | **1697 px** (−11 %) |

En escritorio el bloque de info de `ContactSection` no encoge al pasar de 4 a 2
elementos: su grilla es `grid-cols-2 md:grid-cols-4`, así que sigue siendo una
fila. El ahorro vertical de esa sección solo aparece en móvil, donde pasa de dos
filas a una.

#### Contraste — SOBRE NAVY NO SE PUEDE USAR `--muted`

`--muted` (#5F7183) sobre `--navy-dark` (#0F2535) da **3,13:1**: no llega al 4,5
de 1.4.3. Es el error fácil al mover un componente de fondo blanco a fondo
oscuro. La paleta que sí sirve, medida:

| Uso | Color | Ratio |
|---|---|---|
| Rótulos de columna, marca | `#fff` | **15,71:1** |
| Enlaces | `rgba(255,255,255,0.8)` | **10,44:1** |
| Eslogan y pie legal | `rgba(255,255,255,0.6)` | **6,50:1** |
| Hover | `--sky` #A8C4DC | 8,68:1 |

22 textos medidos, **0 por debajo del mínimo**.

> TRAMPA DE MEDICIÓN: una sonda que lea `getComputedStyle().color` y tome los
> tres primeros números de `rgba(255,255,255,0.8)` da 15,71 para todo, porque
> ignora el alfa. Hay que componer sobre el fondo antes de calcular. Pasó acá y
> el primer informe salía con todo en 15,71.

#### Objetivos táctiles y encabezados

Las 4 redes pasan de icono+texto a solo icono, con `aria-label` que incluye el
aviso de pestaña nueva. Miden 32×32 —por encima de los 24 de 2.5.8— y van a 12px,
así que los centros quedan a 44.

Los 10 enlaces de menos de 24px de alto siguen cumpliendo por separación: el
centro más cercano queda a 30-31px, tanto a 1440 como a 390. Los 4 legales del
pie van inline dentro de un `<p>`, exentos por ser texto corrido.

Las columnas del footer se rotulan con `<div>`, no con encabezados —así era
antes— así que quitar «Servicios» no podía crear un salto de nivel. Verificado
igual en una ruta con `ContactSection` y otra sin: 0 saltos en las dos.

---

## EN CURSO: rediseño del bloque de testimonios — sesión web pública

**Anuncio de dominio, con una corrección.** El encargo lo situaba en
`src/components/sections/`. **No está ahí**: `TestimoniosCarrusel` vive dentro de
`src/pages/HomePage.tsx` (línea 50), y solo se monta ahí. En
`src/components/sections/` hay cinco componentes y ninguno es este.

Se tocó `src/pages/HomePage.tsx`.

### Por qué se fueron tres de los cinco

Los firmados por «Equipo SDM» **no eran testimonios**: eran casos narrados por
la empresa en primera persona del plural —«Agradecemos a Matías…», «Conectamos
la venta de Don Elías…»— y **duplicaban el bloque de blog que está justo
debajo**, que hace lo mismo con foto, fecha, categoría y el artículo entero.

Uno de ellos era literalmente el **teaser de un artículo del blog, con enlace a
ese artículo**: «Te contamos cómo acompañamos a una de nuestras clientas…» →
`/blog/detras-de-una-compraventa-exitosa…`.

Encima el diseño anterior los envolvía en comillas dobles literales, o sea le
atribuía a la empresa una cita de sí misma.

Quedan los dos reales: Macarena y Gerardo.

**Las claves 3 a 8 siguen disponibles** en el admin para testimonios reales
futuros. No se recortó el `[1..8].map()` de `Contenido.tsx`: los campos vacíos
no se renderizan en la web —el componente filtra por `texto`— y quitarlos sería
cerrar la vía de sumar uno sin tocar código.

### De carrusel a dos tarjetas

Con dos elementos el carrusel no tenía sentido. Se fue **toda** la mecánica:
`setInterval` de 5s, `goTo/next/prev`, los estados `current`, `pausado`,
`animating` y `direction`, el `useRef` del temporizador, los dos `useEffect`, el
botón de pausa, las flechas ↑↓, el contador 01/05 y los cinco puntos. También
los imports de `Pause` y `Play`, y `useRef`. **Sin movimiento no hay nada que
detener, así que 2.2.2 deja de aplicar.**

De paso se borró `TESTIMONIALS`, tres personas inventadas —María Sánchez, Carlos
González, Isabel Ríos— que se usaban como default cuando la clave estaba vacía.
Es la misma regla que ya cerró `SAMPLE_PROPS`: **nada de datos de muestra en
producción**. Ahora una ranura vacía se descarta y, si no queda ninguna, la
sección entera no se dibuja.

#### Medidas

| | Antes | Después |
|---|---|---|
| @1440 | 490 px | **476 px** |
| @390 | 744 px | 821 px |

En móvil **sube**, y es inevitable: dos tarjetas apiladas ocupan más que una
cita rotando. Se descartó un «ver más» porque dos citas cortas no justifican un
control.

Para bajar de los 490 en escritorio hizo falta poner el ornamento **a la
izquierda** del texto en vez de encima: apilado se comía una fila de 56px por
tarjeta y la sección se quedaba en 644 px.

#### Contraste, sobre `--off`

| Elemento | Color | Ratio |
|---|---|---|
| Ornamento ❞ | `--green-dark` | **4,64:1** |
| Cita | `--ink` | 16,65:1 |
| Nombre | `--navy-dark` | 15,04:1 |
| Ubicación | `--muted` | 4,81:1 |
| Enlace | `--green-dark` | **4,64:1** |

**`--sky` sobre `--off` da 1,73:1**: el ornamento habría sido invisible. Y
`--green` da 2,80:1, que para un enlace **no llega al 4,5** — por eso los dos
usan `--green-dark`.

El autor viene como «Nombre · Ciudad, País» en una sola cadena y se parte por el
primer `·`. Ojo: en la base hay un **doble espacio** antes del separador, así que
hay que recortar.

### PENDIENTE PARA DESPLEGAR: vaciar tres claves

**Este cambio NO está desplegado.** Con la base como está hoy, la sección
renderiza las **cinco** tarjetas y mide **1469 px** a 1440 — el triple de los 490
que había que mejorar, y empuja el blog fuera de la vista.

Antes de cualquier deploy hay que vaciar, desde Textos del sitio → Testimonios,
el **Texto, el Autor y la URL** de los bloques **Testimonio 3, 4 y 5**. Con eso
la sección baja a 476 px.

> Si alguien despliega sin hacerlo, no se rompe nada: se ven cinco tarjetas en
> vez de dos. Pero es exactamente lo contrario de lo que se pidió.

---

## Captación — cierre de los nueve pendientes — 2026-08-09

**Invasión de dominio autorizada por Víctor sobre `Captacion.tsx`.** No se tocó
la lógica del bot ni sus escrituras a Supabase: los cinco commits son errores,
copy, recortes, color y accesibilidad. Con esto **ya no queda ningún módulo con
excepciones de auditoría**.

| Commit | Qué |
|---|---|
| `77d216c` | Los dos `alert()` crudos a `avisarError`, con corte de flujo |
| `166bca2` | «¿Cancelar esta visita?» nombra la visita y dice la consecuencia |
| `d0ba68e` | Los recortes silenciosos: el `.slice` y los seis `ellipsis` |
| `92030bf` | La paleta paralela a los tokens oficiales |
| `d236092` | Cinco campos con nombre accesible, cinco `outline: none` fuera |

### La auditoría se había equivocado con el `.slice(0, 5)`

Quedó anotado como «`.slice(0, 5)` en la conversación de un lead —línea 994—».
**No lo era.** La 994 es `topComunas`, el ranking de «Comunas más buscadas» de la
sección Métricas. La conversación —`ChatLog`— no tiene ningún `.slice`:
renderiza el arreglo entero dentro de una caja con `maxHeight: 380` y
`overflowY: auto`, o sea que ya tenía scroll propio y nunca recortó nada.

El ranking sí recortaba: su caja es un flex-wrap de fichas, sin scroll. Ahora
dice «Mostrando las 5 más buscadas de N comunas» cuando hay más de cinco, y
`MetricsData` suma `comunasTotal` para poder decirlo.

Los `ellipsis` tampoco eran cinco sino **seis**, y no cubrían lo anotado: los de
`LeadRow` son nombre, comuna, **intención**, presupuesto y plazo —no teléfono—;
el teléfono se recortaba en el sexto, el `DRow` genérico de la línea 141.

### Qué pasa de verdad al cancelar una visita

Verificado antes de escribir el texto, porque ya se había escrito una
consecuencia falsa en otro panel:

1. Lo único que se escribe es `visitas.estado = 'cancelada'`. **No hay DELETE.**
2. La tarjeta desaparece porque `loadVisitas` filtra `estado=pendiente`.
3. **Al cliente no le llega nada.** El worker
   (`sdm-captacion-worker-project/index.js`) solo hace POST a `visitas` cuando
   el lead califica; no lee `estado` en ningún punto.
4. `leads.status` **no** se toca al cancelar, aunque al confirmar sí se pone
   `visita_confirmada`. Asimetría real, ver Pendientes.

### El banner del modal de edición NO pasa por `avisarError`

Es la única escritura del panel que no lo hace, y es deliberado: `avisarError`
levanta un `alert()`, y ahí el modal ya está abierto con lo que se escribió — el
aviso saldría **encima** del formulario y habría que descartarlo antes de poder
corregir el campo. El banner inline dice lo mismo sin interrumpir. Lo que sí se
conserva es el `console.error` con el objeto completo, que es la parte de
`avisarError` que sirve para depurar. Lo que se fue es el `error.message` de
Postgres, en inglés y hablando de columnas.

### El mapa de colores no concatenaba alfa

Era la condición de parada del encargo. Se revisó a **todos** los consumidores
antes de tocar el mapa: cero concatenaciones. Los seis valores se usan enteros,
en objetos `style` o interpolados en un `1px solid ${...}`, así que van como
`var()` y no como hex espejo.

La única excepción eran los dos iconos de `lucide-react` con
`color={COLORS.muted}`: esa prop termina en el atributo `stroke` del SVG, donde
`var()` no es de fiar. Pasaron a `style={{ color }}` — lucide dibuja con
`currentColor` por defecto. Medido en el navegador: el icono resuelve a
`rgb(95, 113, 131)`, que es `--muted`.

### Ratios de contraste medidos

| par | antes | después | |
|---|---|---|---|
| `--muted` / blanco | 3.33 | **5.03** | AA |
| `--muted` / `--off` | 3.10 | **4.81** | AA |
| `--error` / blanco | 3.93 | **6.30** | AA |
| `--error` / `#fde2e1` | 3.21 | **5.14** | AA |
| `--navy-dark` / blanco | 15.91 | 15.71 | AA |
| blanco / `--navy-dark` | 15.91 | 15.71 | AA |
| `--muted` / `--off` en `SCORE_NULL` | 2.94 | **4.81** | AA |

`SCORE_NULL` y `ROL_FALLBACK` dejaron su `#eef1f4` de paso: son ausencia de
calificación y rol desconocido, o sea neutros del sistema, y sobre ese gris
`--muted` daba 4.44:1 — corto para un texto de 11 px.

### EL ESTILO DEL RÓTULO VA EN UN `<span>`, NUNCA EN EL `<label>`

Los `<label>` ahora envuelven a su control, y en cuanto envuelven,
`textTransform` y `letterSpacing` **se heredan hacia adentro**. Dejados en el
`<label>`, todo lo tecleado sale en mayúsculas y espaciado: el `value` del estado
queda bien y solo miente la pantalla. Es CSS válido, así que `tsc` no lo delata y
el build pasa en verde. Por eso existe el componente `Rotulo`.

Verificado en el navegador: **0 de 8 campos** heredan `text-transform` o
`letter-spacing`.

### Cómo se verificó, sin sesión de admin

El panel exige sesión de Supabase. Se montó un banco de pruebas temporal
—`banco.html` + `src/__banco.tsx`, más una copia del archivo en `ca9eba3`— que
renderiza los componentes de presentación reales con datos falsos, para comparar
antes/después. Se borró todo al terminar; `git status` quedó limpio y
`Captacion.tsx` byte a byte igual al commit.

Medido a 1280 / 768 / 375 px:

| | antes | después |
|---|---|---|
| campos sin nombre accesible | 8 de 8 | **0 de 8** |
| `outline` al enfocar | `none 0px` | `solid 2px rgb(45,128,85)`, offset 2px |
| campos con transform heredado | — | **0 de 8** |
| overflow horizontal | no | no |
| errores de consola | 0 | 0 |

### Lo que costó envolver en vez de recortar

Alto de la fila colapsada de lead:

| ancho | antes | después (datos cortos) | después (datos largos) |
|---|---|---|---|
| 1280 px | 58 px | 67 px | **96 px** |
| 768 px | 80 px | 97 px | **145 px** |
| 375 px | 198 px | 237 px | **321 px** |

Se eligió «caben enteros» sobre «reorganizar la tarjeta», que era la disyuntiva
del encargo. El dato completo vale más que la densidad, pero el número de 375 px
es grande: tres leads llenan una pantalla de teléfono.

### Pendientes que deja

1. ~~**Blanco sobre `--green` da 2.93:1 y no cumple AA.**~~
   **CERRADO el 2026-08-09.** Ver «Captación — los dos verdes» más abajo.
2. **La fila de lead a 375 px mide 321 px** con datos largos. Si molesta, la
   salida es mostrar menos columnas en el resumen y dejar el resto al detalle.
3. ~~**`leads.status` no se toca al cancelar una visita**, pero sí al confirmarla.
   Un lead cancelado se queda en `visita_pendiente` para siempre.~~
   **CERRADO el 2026-08-09**, sin escribir en `leads`: se corrige al leer,
   cruzando con la última visita. Ver «Captación — los banners y el estado real
   del lead».
4. **El `<div>` clicable de la fila de lead** sigue sin ser un `<button>`. Venía
   de la tanda 3 de accesibilidad y no entraba acá.
5. Las paletas de insignia —`#fde2e1`/`#c0392b`, `#fdedd6`/`#c8740a`,
   `#dde7f6`/`#2c5da0`— y los colores del banner de modo siguen siendo literales
   propios. No son la paleta paralela que se estaba eliminando: son una familia
   semántica aparte, sin equivalente en `globals.css`.

---

## Captación — los dos verdes — 2026-08-09

Cierra el pendiente 1 del cierre anterior. Mismo criterio que ya seguía
`.btn-green` en `globals.css`, del que Captación había quedado fuera por el
dominio y no por decisión: **`--green` es el color de marca y solo vale para lo
decorativo; lo que tiene texto en el par usa `--green-dark`.**

El mapa `COLORS` pasa a tener las dos entradas, con la regla escrita al lado:
si agregas un uso nuevo, la pregunta es «¿hay texto en este par?».

### Los seis sitios que llevaban texto

| sitio | par | antes | después | |
|---|---|---|---|---|
| Botón «Confirmar visita» | blanco sobre verde | 2.93 | **4.85** | AA |
| Burbuja del equipo | blanco sobre verde | 2.93 | **4.85** | AA |
| Rótulo «Equipo» | verde sobre blanco | 2.93 | **4.85** | AA |
| Métrica «Confirmadas» | verde sobre blanco | 2.93 | **4.85** | AA |
| Botón «Devolver a Sofía» | blanco sobre verde | 2.93 | **4.85** | AA |
| Titular «Sofía está respondiendo» | verde sobre `#e3f5ea` | 2.58 | 4.28 | **corto** |

Los tres eran seis. Al buscar los usos aparecieron tres más de los que decía el
pendiente: la métrica «Confirmadas», el botón «Devolver a Sofía» y el titular
del banner de modo.

### Los tres decorativos NO se tocaron

Siguen en `--green`: el filete superior del cuadro de mensaje manual (2 px) y
los dos bordes izquierdos de la caja de brief (3 px). No hay texto en esos
pares, así que 1.4.11 no aplica y el color de marca se queda donde se ve.

### El titular del banner de modo queda corto, y su gemelo también

`--green-dark` sobre `#e3f5ea` da **4.28:1**. Es texto de 15 px en negrita, o
sea que el umbral es 4.5 y no 3. Mejora respecto de 2.58 pero no llega.

Y no es solo el verde: el gemelo ámbar del mismo banner —`#c8740a` sobre
`#fdedd6`, «Control manual — Sofía en pausa»— está en **3.06:1** y falla igual.
Nunca estuvo en ningún pendiente porque las auditorías miraban el verde.

Los dos se arreglan juntos, y hay dos salidas:

- **fondo del banner a blanco** — `--green-dark` sube a 4.85 y el ámbar a 3.47,
  que sigue corto;
- **titular a `--navy-dark`** — 13.86:1 sobre el verde claro; el color queda en
  el fondo, el emoji y el botón, que ya distinguen los dos estados de sobra.

La segunda cumple en ambos lados. Es cambio de diseño, así que no se aplicó.

### Verificado en el navegador

Con el mismo banco temporal del cierre anterior, borrado al terminar. Los seis
sitios resuelven a `rgb(45, 128, 85)` = `#2D8055` = `--green-dark`, y los tres
decorativos siguen en `--green`. Cero errores de consola.

---

## Captación — los banners y el estado real del lead — 2026-08-09

### 1. El color de los banners de modo lo lleva el fondo, no el texto

El titular de cada banner iba en el color de su modo, y **ninguno de los dos
cumplía sobre su propio fondo**. El ámbar no había aparecido en ninguna
auditoría porque todas miraban el verde.

| banner | elemento | antes | después | |
|---|---|---|---|---|
| Automático (`#e3f5ea`) | titular, 15 px bold | 2.58 (`--green`) | **13.86** (`--navy-dark`) | AA |
| Automático | secundario, 13 px | 4.43 (`--muted`) | **9.89** (`--navy`) | AA |
| Manual (`#fdedd6`) | titular, 15 px bold | 3.06 (`#c8740a`) | **13.67** (`--navy-dark`) | AA |
| Manual | secundario, 13 px | 4.37 (`--muted`) | **9.76** (`--navy`) | AA |

**El texto secundario también fallaba, en los dos.** `--muted` sobre blanco da
5.03 y cumple; sobre estos fondos teñidos cae a 4.43 y 4.37. No estaba en
ningún pendiente. No podía ir a `--navy-dark` sin igualar al titular y comerse
la jerarquía, así que usa `--navy` (9.89 / 9.76) y la jerarquía la sostienen el
peso y el tamaño.

Los fondos NO se tocaron: son lo que distingue los dos modos de un vistazo.

### 2. `leads.status` LO ESCRIBE EL WORKER. El admin no es segundo escritor.

**Antes de agregar cualquier `update({ status })` desde el panel, leer
`index.js:1750` del worker:**

```js
else if (!readyEfectivo && lead.status === "nuevo") patch.status = "calificando";
```

Es la única lectura que el Worker hace de ese campo, verificada a fondo:
`marcarLeadReady` (línea 1123) es un `PATCH ...&ready=eq.false` —el candado
atómico va contra `ready`, no contra `status`— y `calcularReady`,
`calcularScore` y `calcularHandoff` no lo leen.

Aun siendo una sola lectura, el panel **no** se suma como escritor. Dos razones:
sumar un escritor más sobre un campo ajeno aumenta la superficie de conflicto, y
no hay forma de comprobar si existe un `CHECK` que rechace un valor nuevo — la
tabla `leads` no está en `supabase/migrations/` ni aparece en el esquema que
expone PostgREST, y sin Docker la CLI no puede leer el DDL.

### 3. El estado desfasado se corrige AL LEER

Un lead cuya visita se cancelaba se quedaba en `visita_pendiente` para siempre:
cancelar solo escribe `visitas.estado`. Ahora el panel cruza con la última
visita del lead y muestra la verdad, sin escribir nada en `leads`.

**La misma insignia con otro texto, no una insignia aparte.** Dos etiquetas
contradictorias en la misma fila obligan a quien mira a decidir cuál vale.

**Hace falta una consulta más.** `loadVisitas` solo trae las `pendiente` —son
las que se coordinan— y justamente las canceladas son las que aquí interesan.
La consulta nueva va en `loadLeadsQuiet`, acotada con `.in()` a los 100 leads en
pantalla, así que no crece con el histórico.

**El orden es la mitad del asunto.** Viene `created_at` descendente y el mapa se
llena con el PRIMERO de cada `lead_id`, o sea el más reciente. Un lead con una
visita cancelada y otra confirmada después se ve como confirmado.

Qué manda sobre qué:

- solo se corrigen `visita_pendiente` y `visita_confirmada`, que son los dos
  `status` que hablan de una visita;
- `cerrado`, `perdido`, `nuevo`, `calificando` y `derivado` **no se pisan**: son
  afirmaciones más fuertes que el estado de una visita;
- cuando la visita contradice al lead, el detalle lo dice —«el lead sigue
  marcado como “visita_pendiente”»— en vez de esconder una de las dos;
- el detalle suma una fila «Última visita» con estado y antigüedad.

Los cinco casos, verificados en el banco temporal:

| caso | fila | detalle |
|---|---|---|
| visita cancelada, lead en `visita_pendiente` | «Visita cancelada» | + nota del desfase |
| cancelada ayer, confirmada hoy | «Visita confirmada» | mira la última |
| pendiente y pendiente | «Visita pendiente» | sin nota |
| lead `perdido` con visita cancelada | «Perdido» | no se pisa |
| sin visitas | «Nuevo» | «Sin visitas» |

De paso se fue el `textTransform: capitalize` de esa celda: pintaba
`visita_pendiente` como «Visita_pendiente», guion bajo incluido.

La lectura nueva **no** pasa por `avisarError`: corre cada 25 s con el refresco
automático y un fallo no puede levantar un `alert()` encima de quien trabaja. Va
a consola, y el panel cae al comportamiento anterior.

### Hallazgo al margen: «Realizadas» siempre marca 0

Métricas cuenta `visitas.estado='realizada'`, pero **nadie escribe ese valor** —
ni el panel ni el Worker. Los estados que se escriben de verdad son `pendiente`
(Worker, al calificar), `confirmada` y `cancelada` (panel). O se marcan a mano en
la base, o esa métrica es siempre cero.

### Barrido completo de contraste del panel, tras estos cambios

Ya que el panel quedó medido entero, queda el inventario. **Tres pares siguen
fallando**, los tres de la familia de insignias y del ámbar, que nunca fue la
paleta paralela y no tiene variante oscura en `globals.css`:

| elemento | ratio | tamaño | umbral | |
|---|---|---|---|---|
| Insignia **Hot** (`#c0392b` / `#fde2e1`) | 4.44 | 11 px bold | 4.5 | **falla por poco** |
| Insignia **Warm** (`#c8740a` / `#fdedd6`) | 3.06 | 11 px bold | 4.5 | **falla** |
| Botón **«Tomar control»** (blanco / `#c8740a`) | 3.52 | 13 px bold | 4.5 | **falla** |
| Insignia Cold (`#2c5da0` / `#dde7f6`) | 5.29 | 11 px bold | 4.5 | AA |
| Insignia Sin calificar | 4.81 | 11 px bold | 4.5 | AA |
| Botón «Devolver a Sofía» (blanco / `--green-dark`) | 4.85 | 13 px bold | 4.5 | AA |
| Las 6 métricas de colores | 3.52 – 6.60 | 24 px bold | 3.0 | AA |

Las métricas cumplen por ser texto grande: 24 px en negrita pasa el umbral de
3:1, no el de 4.5.

El problema de fondo es que **no existe un ámbar oscuro en `globals.css`**. `Hot`
y `Warm` comparten familia con `Cold`, que sí cumple, así que la corrección
natural es oscurecer los dos tonos de texto —no los fondos— hasta 4.5, y usar
ese ámbar oscuro también en el botón «Tomar control». Es un cambio en ZONA
COMPARTIDA y toca la identidad de las insignias: va en su propia tanda.

---

## Captación — la escala Hot/Warm/Cold pasa a token — 2026-08-09

**CAMBIO EN ZONA COMPARTIDA:** seis tokens nuevos en `src/styles/globals.css`.
No tocan ninguna clase existente y su único consumidor es `Captacion.tsx`.

```
--lead-hot        #9A0410   sobre su fondo  7.15:1   (antes 4.44, fallaba)
--lead-warm       #A95704   sobre su fondo  4.51:1   (antes 3.06, fallaba)
--lead-cold       #2C5DA0   sobre su fondo  5.29:1   (sin cambio de valor)
--lead-hot-fondo  #FDE2E1
--lead-warm-fondo #FDEDD6
--lead-cold-fondo #DDE7F6
```

**El fondo también es token.** A diferencia de `--estado-*` —blanco sobre color
sólido—, estas insignias son texto de color sobre fondo teñido. Con el texto en
`globals.css` y el fondo como literal en `Captacion.tsx`, la relación de
contraste quedaba partida en dos archivos y no había forma de verificarla.

### AVISO DE MÉTODO: la matriz de daltonismo importa, y hay que declararla

La simulación que se usó acá es **Viénot, Brettel & Mollon (1999)** sobre RGB
lineal. Da resultados **~2 puntos más generosos** que la usada en la revisión de
agosto: en el par Vendida/Oportunidad bajo protanopia, esta matriz da **12.2**
donde aquella anotó **10.2**.

**Cualquier medición futura de ΔE bajo daltonismo tiene que decir con qué matriz
se hizo, o los números no son comparables con los de la otra tanda.** Los de
esta sección son todos con Viénot 1999.

El instrumental se validó antes de usarlo: reproduce exacto los contrastes ya
documentados (Vendida 5.44, Reservada 7.22) y los controles clásicos de ΔE2000
(blanco/negro 100, rojo/verde 86.6).

### En Hot/Warm, contraste y distinguibilidad tiran en direcciones OPUESTAS

Es el mismo muro que tuvo «Reservada», y conviene tenerlo escrito porque no es
intuitivo:

- `#C8740A` **no se puede salvar aclarando el fondo**. Para llegar a 4.5
  necesitaría un fondo de luminancia **1.291** y el máximo físico es 1.0; ni
  sobre blanco puro pasa de 3.52. Oscurecer el texto no era una opción de
  diseño, era la única salida.
- Pero **al oscurecerlo colapsa contra el rojo de Hot bajo protanopia**: ΔE2000
  de 6.4. Desglosado, `#7E3E07` y `#BD3728` se convierten en `#514600` y
  `#5F5525` — el mismo a\* (−2.8 los dos), solo los separa algo de claridad.
  Rojo contra naranja es justo el par que esas condiciones funden.

O sea: el ámbar claro de antes **se distinguía (ΔE 11.4) pero no se leía
(3.06)**. Arreglar la lectura rompía la distinción. Por eso se movieron los dos
colores y no solo el ámbar, aunque Hot «solo» fallara por 0.06.

La curva de intercambio que se midió:

| margen exigido | Hot | Warm | peor par |
|---|---|---|---|
| ΔE > 10 | `#9C2416` | `#A95704` | 10.2 — **peor que hoy** |
| **ΔE > 12** | **`#9A0410`** | **`#A95704`** | **12.0** ← elegida |
| ΔE > 14 | `#6F203E` | `#B24D00` | 14.0 — Hot deja de ser rojo |
| ΔE > 16 | — | — | sin solución |

Peor par del sistema, con los pares que **sí coexisten** en el panel:

| par | normal | protanopia | deuteranopia | peor |
|---|---|---|---|---|
| Hot / Warm | 18.7 | 13.2 | 12.0 | **12.0** |
| Hot / `--error` | 13.7 | 15.3 | 10.6 | 10.6 |
| Warm / `--error` | 27.5 | 21.2 | 14.0 | 14.0 |
| Hot / Cold | 42.3 | 43.7 | 49.0 | 42.3 |
| Warm / Cold | 46.4 | 49.0 | 53.7 | 46.4 |

### `--estado-vendida` contra `--lead-warm` da 3.4 — pero nunca coexisten

`#C0392B` y `#A95704` están a ΔE **3.4**: para cualquiera serían el mismo color.
Hoy no importa porque viven en pantallas distintas —`--estado-*` en fichas de
propiedad, `--lead-*` en el panel de Captación— y **no hay ninguna vista que
muestre las dos familias a la vez**.

**Si algún día se juntan, ese es el par a mirar primero.** Contra
`--estado-reservada`, en cambio, hay margen de sobra: Warm 33.3 y Hot 28.7.

### Los fondos de las insignias colapsan, y está bien

Hot/Warm ΔE 6.5 bajo deuteranopia, Hot/Cold 9.4 bajo protanopia. **No es un
fallo:** la insignia dice «Hot», «Warm», «Cold» con todas sus letras, así que el
color es codificación redundante y 1.4.1 se cumple por el texto. Es también la
razón por la que 12.0 alcanza y no hace falta perseguir 20.

### Medido en el navegador

Los seis pares dan exactamente los ratios documentados. De paso, las métricas
«Pendientes» y «Realizadas» dejaron sus literales y pasaron de 3.52 y 6.60 a
**5.18** y **6.60** sobre blanco: antes cumplían solo por ser texto de 24 px.

---

## Captación — el ciclo de la visita por fin tiene final — 2026-08-09

El disparador fue una métrica muerta: «Realizadas» contaba
`visitas.estado='realizada'` y **nadie escribía ese valor**. Pero el problema de
fondo era mayor: **una visita desaparecía del panel en el momento de
confirmarla**, que es justo cuando pasa a ser un compromiso con un cliente.
`loadVisitas` pedía solo las `pendiente`, y no había ninguna pantalla que
mostrara lo que venía.

### Qué se agregó

- **Sección «Visitas confirmadas»**, entre las pendientes y los leads.
- **Acción «Marcar como realizada»**, que cierra el ciclo.

`loadVisitas` pasa a pedir los dos estados en **una sola consulta**
—`estado=in.(pendiente,confirmada)`— y los parte en cliente. `cancelada` y
`realizada` quedan fuera a propósito: son finales de ciclo y no piden acción.
Verificado inspeccionando la URL que arma supabase-js.

### Componente aparte, NO una variante con bandera

`VisitaConfirmadaCard` es un componente nuevo y no un `VisitaCard` con un
`readonly`. Apagar controles con una bandera los deja existiendo en el DOM
—alcanzables con Tab, anunciados por un lector, sin hacer nada— o exige rociar
`disabled` por todas partes y confiar en no olvidar ninguno. Acá simplemente no
hay controles que apagar: lo que era editable se pinta como dato.

Medido en el navegador: **1 elemento enfocable** en la tarjeta de solo lectura
—la acción— contra 5 en la editable, y **0 campos de formulario**.

Lo que muestra: nombre, teléfono, cuándo se solicitó, insignia de score, comuna,
intención, **asignada a** y **horario** (que en la pendiente son controles y acá
son datos), el brief, y la acción.

### La confirmación dice lo que no se puede deshacer

```
¿Marcar como realizada la visita de María José Fernández?

Sale de esta sección y no se puede deshacer desde el panel.

Al cliente no le llega ningún aviso.
```

Verificado antes de escribirlo: solo se escribe `visitas.estado='realizada'`; la
tarjeta sale de la sección porque la consulta pide `pendiente` y `confirmada`;
**no hay ninguna pantalla que liste las realizadas ni acción que las devuelva**,
y esa es la diferencia real con confirmar o cancelar, que siempre dejan la
visita a la vista en alguna sección; al cliente no le llega nada porque el
Worker nunca lee `visitas.estado`; y `leads.status` no se toca —la fila del lead
pasa a decir «Visita realizada» por el cruce de `estadoLead`.

### Criterios heredados

Objetivo táctil de **44 px** explícito en el botón: con el `padding: 11px` y
texto de 13 px que usa el resto del panel medía ~41. Contraste **15.71:1**,
anillo de foco visible, cero colores fuera de token, `avisarError` con `return`.

La consulta nueva **no** pasa por `avisarError` —corre cada 25 s con el refresco
y un fallo no puede levantar un `alert()` encima de quien trabaja—: va a
consola, igual que el cruce con visitas.

De paso, `confirmarVisita` y `cancelarVisita` ahora también recargan Métricas.
Movían contadores y los dejaban desfasados hasta el refresco de 25 s.

### Pendiente que deja

~~**Una visita confirmada no se puede cancelar desde el panel.**~~
**CERRADO el 2026-08-09.** Ver «Captación — cancelar una visita confirmada».

### MÉTODO: un 200 no prueba que el asset esté propagado

Al verificar este deploy, la comprobación de propagación dio verde y era mentira.

Cloudflare Pages sirve el **fallback de la SPA** para cualquier ruta que todavía
no exista: devuelve **200 con `content-type: text/html`**, o sea el `index.html`
completo. Un bucle que solo mira el código de estado lo cuenta como propagado.

Consecuencia medida: el CSS nuevo «propagó tras 1 intento», pero durante unos
minutos `https://sdmcapital.cl/assets/index-<hash>.css` devolvía HTML. El
navegador que lo pidió en esa ventana **rechazó la hoja** —tipo MIME incorrecto—
y la dejó cacheada rota: aparecía en `document.styleSheets`, sin ninguna regla
aplicada, con `cssRules` inaccesible por SecurityError y el `body` transparente.
Parecía que los tokens nuevos no existían. Existían.

**Comprobar el `content-type`, no el código de estado:**

```bash
curl -sI "https://sdmcapital.cl/assets/index-<hash>.css" | grep -i '^content-type'
# text/css      → propagado
# text/html     → todavía no; es el fallback de la SPA
```

Y si un navegador ya pidió el asset durante esa ventana, hay que reiniciarlo
—`browse stop`— antes de creerle: la hoja rota se queda en caché.

---

## Captación — cancelar una visita confirmada — 2026-08-09

Cierra el pendiente que dejó la sección nueva. `cancelarVisita` siempre funcionó
sobre cualquier visita, pero el botón solo existía en la tarjeta de las
pendientes: si una visita ya confirmada se caía —el cliente avisa, se enferma,
cambia de opinión— no había forma de reflejarlo. Y son justamente las que más
importan, porque ya son un compromiso.

### El aviso se ramifica por el estado, no por un parámetro

`avisoCancelar(v)` es una función pura al lado de los otros helpers de
etiquetas. Se ramifica leyendo `v.estado`, y no recibiendo una bandera desde
cada botón: la visita ya sabe cuál es su estado, así que los dos textos no se
pueden desincronizar. Pura, además, para poder verificar los dos sin tocar la
base.

Cancelar una confirmada no es lo mismo que cancelar una pendiente. Una pendiente
es una solicitud que todavía no se le prometió a nadie. Una confirmada tiene
hora acordada y un asesor asignado, y **el cliente la está esperando**. Como el
sistema no avisa a nadie —el Worker nunca lee `visitas.estado`—, ese trabajo
queda entero en manos de quien aprieta el botón:

```
¿Cancelar la visita CONFIRMADA de María José Fernández?

Estaba agendada para «Sábado 14 de junio, 11:00 hrs» con Roberto.

El cliente la está esperando y NO recibe ningún aviso automático: tienes que
avisarle tú por WhatsApp, y avisarle también a Roberto.

Queda marcada como cancelada y sale de esta sección. El registro no se borra.
```

El nombre y la hora van dentro a propósito: después de cancelar ya no están en
pantalla, y quien tenga que escribir el WhatsApp los necesita.

Verificado en los cuatro casos, incluidos los degradados: sin hora escrita se
omite esa línea entera, y sin asesor se omiten las dos menciones.

### Dos acciones opuestas en la misma tarjeta

Apiladas y con **24 px** de separación medidos, no lado a lado con el hueco de
10 que usa la tarjeta de pendientes. Una cierra bien el ciclo y la otra rompe un
compromiso ya tomado, y ninguna de las dos se puede deshacer desde el panel. Se
distinguen además por peso —sólida contra contorno— y por color.

| acción | tamaño | contraste | |
|---|---|---|---|
| «Marcar como realizada» | 438 × **44** px | 15.71:1 | AA |
| «Cancelar la visita» | 438 × **44** px | 6.30:1 texto · 6.30:1 borde | AA |

Las dos con anillo de foco visible, `avisarError` con `return`, y recarga de
`loadVisitas`, `loadLeadsQuiet` y `loadMetrics`.

### El ciclo, completo

`pendiente → confirmada → realizada` y `pendiente → confirmada → cancelada`. Una
cancelada sale de la sección porque la consulta pide `estado=in.(pendiente,
confirmada)`, y la fila del lead pasa a decir «Visita cancelada» con la nota del
desfase, porque `leads.status` sigue en `visita_confirmada` y el cruce lo
declara en vez de esconderlo.

---

## Propiedades — el orden de la lista por fin persiste — 2026-08-09

Cierra el pendiente anotado en «Nota al margen: el orden de la lista de
propiedades no se persiste». Siete commits.

| Commit | Qué |
|---|---|
| `6d43e79` | El arrastre deja de mover la fila equivocada |
| `f98e15e` | El PATCH escribe `orden` |
| `38b37b5` | `load()` ordena por `orden` |
| `2256eb2` | Fuera `destacada: i < 6` |
| `7018fcb` | La etiqueta dice lo que la pantalla hace |
| `101e915` | `avisarError` corta antes del `load()` |
| `7c314e7` | El ciclo de orden por columna no se atasca |

### El desfase de índices: se TRADUCE, no se desactiva

`useDragSort` guarda su estado sobre las 65 filas crudas; la tabla pinta
`displayItems`, filtrada y ordenable. `filaProps(i)` recibía el índice de la
lista pintada y el hook lo usaba para hacer `splice` sobre la suya.

Se evaluaron las dos salidas y **la traducción gana para el caso del filtro**:
se le pasa al hook el índice de la fila dentro de SU array. Las filas ocultas no
están en el DOM, así que tampoco pueden ser destino, y la que se arrastra
aterriza donde el usuario la soltó.

**Para el orden por columna la traducción no alcanza**, y ahí sí se desactiva.
El problema no es el índice sino que no hay nada que mirar: `displayItems` se
reordena por la columna después del arrastre, la fila vuelve a su sitio en
pantalla y el usuario no ve ningún movimiento — mientras el `orden` sí se
escribiría. Un arrastre sin respuesta visual que igual persiste es peor que uno
que no arranca.

Consecuencia: **«Mostrar pausadas» ya no impide arrastrar.** El único motivo que
apaga el arrastre es la columna ordenada, así que la etiqueta solo necesita un
mensaje.

`toggleSort` alternaba asc/desc para siempre y no había forma de volver a la
lista sin ordenar salvo recargar. Daba igual mientras fuera una vista; con el
arrastre apagado, quedarse atrapado dejaba la pantalla sin su función. Pasa a
tres pasos, y los dos valores viven en un solo `useState` para que el ciclo
cierre aunque lleguen dos clics en el mismo tick.

### El aviso del modo aparece solo cuando es verdad

El orden manual únicamente se aplica con `catalogo_orden` en `'manual'`, y en
producción está en `'precio_alto'`. La etiqueta lo dice, nombrando el modo
puesto, y **la línea desaparece sola** el día que se ponga en Manual. Decirlo
siempre habría sido mentir a futuro.

El enlace a Contenido viaja como callback desde `AdminPage`: las pestañas del
admin son estado de React, no rutas. Sin el callback degrada a texto en vez de
dejar un enlace muerto.

### VERIFICADO MIRANDO LO QUE SE GUARDA, NO LO QUE SE VE

Con un banco temporal que intercepta `fetch`, sobre el componente real y
supabase-js real. Ocho filas: cuatro con `orden`, cuatro en NULL y una pausada
oculta — el espejo del 33/32 de producción.

Se arrastró la quinta fila al primer puesto, con la pausada oculta de por medio:

```
en pantalla:  5 · 1 · 2 · 3 · 4 · 7 · 8
se guarda:    id-5→1  id-1→2  id-2→3  id-3→4  id-4→5  id-6→6  id-7→7  id-8→8
```

**El orden guardado coincide con la pantalla**, y la fila oculta conserva su
posición relativa. Un único campo escrito —`orden`—, ninguna fila queda en NULL,
y cero `destacada`.

> **Trampa del método, para la próxima.** Los primeros dos intentos dieron
> resultados falsos por disparar los eventos en el mismo tick: React no alcanza a
> renderizar, `ultimo.current` del hook queda con el array previo y los clics de
> cabecera leen el `sortDir` viejo. Con un ratón real cada evento es una tarea
> aparte. **Hay que separar los eventos sintéticos en ticks distintos o se está
> midiendo el bug del banco, no el del código.** El segundo intento falso fue el
> que destapó la fragilidad de `toggleSort`, así que no fue tiempo perdido.

### Lo público no cambia

- El Inicio toma sus destacadas de `home_destacadas_ids`, y **los seis IDs
  existen**, así que el respaldo por bandera nunca corre. Comprobado: solo 3 de
  esos 6 tienen `destacada = true`, o sea que los dos mecanismos ya iban por
  caminos separados. Quitar la escritura no puede cambiar el Inicio.
- `catalogo_orden = 'precio_alto'`, y `applyCatalogOrder` descarta `orden` salvo
  en modo manual. Escribir `orden` no mueve el catálogo público hoy.

### Las tres listas de arrastre se comportan igual ante el error

`Equipo.tsx` y `Asociados.tsx` avisaban del error y recargaban igual. **Alineadas
el 2026-08-09** (commit `c233778`): las tres cortan con `return` antes del
`load()`. Sus listas son más cortas y la ventana de fallo parcial es menor, pero
existe igual, y tres listas con dos comportamientos ante el mismo error es lo que
confunde al siguiente que las lea.

**Queda una cuarta, y NO se tocó:** `TarjetasEquipo.tsx:230`. Es otro mecanismo
—flechas que INTERCAMBIAN el `orden` de dos filas, no un renumerado de la lista
entera— y su fallo parcial es más feo: si uno de los dos PATCH pasa y el otro no,
quedan **dos tarjetas con el mismo `orden`**. Ahí el `load()` tras el aviso tiene
un argumento a favor que las otras tres no tienen: el estado local queda
seguro mal, y recargar al menos muestra el desempate real en vez de una pantalla
limpia que miente. Es decisión aparte, no un olvido.

---

## BannerPromo se pinta desde la semilla — 2026-08-09

`BannerPromo` esperaba a la consulta (`if (loading) return null`) para decidir si
dibujarse, aunque desde la semilla del 8 de agosto el dato ya está en el primer
render. Aparecía **~300 ms tarde**, empujando todo lo que tiene debajo.

Pasa a `listo`, que con semilla es `true` desde el primer render.

### Lo que decidió el caso: `ServiciosPage` ya aceptaba ese riesgo

El gate existía «para que la pieza no aparezca y desaparezca si en la base está
apagada». El riesgo es real, pero **`ServiciosPage.tsx:38` ya filtra por
`servicio_*_visible` leyendo la semilla, sin ningún gate, sobre el pliegue y con
una tarjeta de servicio entera en juego** — y `servicio_banco_visible` está en
`'false'`, o sea que el mecanismo está en uso. Mantener la excepción solo en
BannerPromo era una inconsistencia, no una protección.

### La tercera vía se descartó, y por qué

Reservar el espacio y decidir el contenido al llegar la consulta cambia «banner
que se retracta» por «caja vacía que se colapsa»: el alto no es fijo —322 px en
escritorio, 519 px en móvil, y depende del largo del título— así que reservar
mal crea su propio salto, y en el caso malo la caja se colapsa igual. Además,
para saber *si* reservar hay que consultar la semilla, con lo cual ya se está
confiando en ella.

### Medido

Antes, en producción (3 muestras): FCP 140–352 ms · LCP = FCP, elemento
`<div class="absolute inset-0">` (el hero) · CLS 0.0002–0.0036 · **banner a
316–660 ms**.

Después, sobre el build (3 muestras): FCP 48–56 ms · **LCP = FCP, el mismo
elemento** · CLS 0.0003 · **banner presente desde el primer frame**.

**Mover el primer pintado NO desplazó el elemento LCP**, que era el riesgo a
descartar. CLS tampoco se mueve — el banner está bajo el pliegue en las cuatro
ventanas medidas (a 145 px de scroll en escritorio, 333 px en móvil), así que su
salto nunca puntuó.

Los dos casos simulables, con el `index.html` del build parcheado en su ruta
real y 300 ms de latencia simulada:

| caso | resultado |
|---|---|
| semilla `true` / base `true` | banner en el DOM a los 21–37 ms, **antes del FCP**. No desaparece |
| semilla `true` / base `false` | aparece a los 24 ms y **desaparece a los 574 ms — parpadeo de 549 ms** |

El segundo es el costo aceptado, y es lo que cierra la regla de proceso.

> **Trampa del método.** El primer intento midió el caso B como «el banner no
> apareció nunca»: el observador se instalaba después de que la consulta ya lo
> había retirado. Y el segundo dio los dos casos vacíos porque servía la
> simulación desde `/__caso-b.html`, ruta que **React Router resuelve como 404**,
> no como el home. Para simular hay que parchear el `index.html` que se sirve en
> `/`, y el recorder tiene que instalarse ANTES de que monte React.

---

## Cierre de la deuda menor — 2026-08-09

**INVASIÓN DE DOMINIO** sobre `src/pages/`, `src/components/` y `functions/`
—sesión web pública y sesión Sofía—. No toca `globals.css`.

| Commit | Punto |
|---|---|
| `e56a134` | La preposición del aviso de despliegue |
| `6f7a1a1` | Los dos enlaces del header sin `navLinkClass` |
| `cf040c3` | `DEFAULT_DESCRIPTION` unificada |
| `fb9224d` | Pages Functions para /blog, /asociados, /quienes-somos y /servicios |
| `d46e9fe` | El chevron de las fichas, 1.62 → 5.03:1 |
| `7af26aa` | Los cinco `FLabel` unificados con `Field` |

### Las Functions SÍ pueden importar del árbol del cliente

Era la duda que decidía el punto 3. **Se puede:** los dos lados corren en
runtimes distintos —el bundle de Vite y el Worker de Cloudflare— pero los dos se
compilan con esbuild, así que un módulo hoja sin dependencias se importa desde
ambos. Verificado con `wrangler pages functions build` antes de escribir nada
más: compila y la constante viaja dentro del Worker.

Nacen dos módulos compartidos, los dos en `.js` y sin tipos para que las
Functions tengan lo menos posible que resolver:

- `src/lib/seo-compartido.js` — `SITE_NAME`, `BASE_URL`, `DEFAULT_OG_IMAGE`,
  `DEFAULT_DESCRIPTION`.
- `src/lib/og-estatico.js` — el render de los meta, el escape de HTML, el
  recorte a 200 caracteres y la lectura de `contenido_sitio`.

**Ninguno de los dos debe importar React ni nada del navegador.**

> **Una regresión que solo apareció probando.** Al sustituir el bloque de
> constantes de `functions/blog/[slug].js` por el import quedó `BASE_URL` sin
> importar. No lo delata ni `tsc` ni `wrangler pages functions build` —un
> identificador libre es un error de EJECUCIÓN—, y el `try/catch` de la Function
> lo convertía en un `next()` silencioso: /blog/:slug volvía a servir el título
> genérico. Se detectó con `wrangler pages dev` sobre el build real. **Compilar
> no basta para estas Functions: hay que pedirlas con un user-agent de bot.**

### Los títulos de las Functions no salen de `contenido_sitio`

Las descripciones sí —`blog_subtitulo`, `asociados_intro`, `qs_subtitulo`,
`servicios_intro`— pero los títulos no, aunque haya claves parecidas:
`blog_titulo` vale «Blog SDM Capital» y es el encabezado de la página, no un meta
title. Interpolarlo daría «Blog SDM Capital | SDM Capital».

### Cuánto movió unificar `FLabel`

Se queda la separación de `Field` y no la de `FLabel`: gobierna 152 campos contra
37. Medido en el navegador, por campo: **66.5 → 68.5px de alto (+2.0px)** y
rótulo de **peso 500 → 400**; mismo tamaño y mismo color.

| pantalla | campos | filas | crece |
|---|---|---|---|
| `FichaClienteNueva` | 14 | 8 | **+16px** |
| `FichaClienteEditar` | 14 | 8 | **+16px** |
| `FichaClienteDetalle` | 3 | 3 | +6px |
| `FichaClientesLista` | 3 | 3 | +6px |
| `Agentes` | 3 | 3 | +6px |

Las rejillas son de dos columnas, así que el alto crece una vez por fila y no una
por campo. Verificado: 40 campos en las cinco pantallas, **0 sin nombre
accesible**.

### PENDIENTE PARA VÍCTOR: borrar seis claves huérfanas

`dest_espana_img`, `dest_miami_img`, `dest_nueva_york_img`, `dest_orlando_img`,
`dest_punta_cana_img` y `dest_uruguay_img` no las referencia nadie en `src/`,
`functions/` ni `scripts/`. Siguen en `contenido_sitio` y por lo tanto en la
semilla de cada build.

**La clave anon no puede borrarlas, y el panel Contenido tampoco**: solo hace
upsert del conjunto fijo de claves que conoce, no tiene forma de borrar una
suelta. Hay que correr esto en el **SQL Editor del dashboard de Supabase**:

```sql
delete from contenido_sitio
where clave in (
  'dest_espana_img', 'dest_miami_img', 'dest_nueva_york_img',
  'dest_orlando_img', 'dest_punta_cana_img', 'dest_uruguay_img'
);
-- 6 filas. Las imágenes en R2 se quedan: no las borra esto ni hay que borrarlas.
```

> **Aviso de método.** Al comprobar si la clave anon podía borrar, el `DELETE`
> devolvió **204 y no borró nada**: PostgREST responde 204 cuando RLS filtra
> todas las filas candidatas. **Un 204 en un DELETE no prueba que se haya
> borrado** — hay que contar antes y después. Se contó: siguen las 6 y el total
> sigue en 148.

---

## Reordenar con teclado, en los diez puntos — 2026-08-09

`usePointerSort` está construido sobre Pointer Events: con teclado no había forma
de reordenar nada, en ninguna de las diez listas. Incumplía **2.1.1**.

**Va en los diez o en ninguno.** Media función —que ande en tres paneles y en
siete no— es peor que ninguna: el usuario no tiene cómo saber dónde funciona.

| punto | guarda en |
|---|---|
| Propiedades · lista | Supabase (`orden`) |
| Propiedades · unidades | estado del formulario |
| Propiedades · fotos | estado del formulario |
| Contenido · carrusel del hero | estado del panel |
| Contenido · destacadas del inicio | `contenido_sitio` al guardar |
| Equipo | Supabase (`orden`) |
| Asociados | Supabase (`orden`) |
| Ficha de cliente · nueva y editar | estado del formulario |
| Sidebar del admin | `localStorage` |

### Se agrega al lado, no se toca el arrastre

`src/components/admin/ordenTeclado.tsx` **no importa nada de `useDragSort.ts` ni
lo modifica**. Son dos caminos independientes hacia el mismo guardado.

**Cada punto guarda por SU mismo camino:** `moverEnLista` hace el mismo `splice`
que el arrastre, llama al mismo setter y entrega el array al mismo `alSoltar`.
Donde el callback estaba inline se le puso nombre para poder reutilizarlo, sin
cambiarle una línea. Así el teclado no puede divergir del arrastre.

### Lo que no es obvio

- **`aria-disabled` y NO `disabled`.** Un botón deshabilitado de verdad sale del
  orden de tabulación: quien navega con teclado nunca lo encuentra y no se entera
  de por qué no puede usarlo.
- **Nombre con contexto:** «Subir «Casa en Peñalolén»», no «Subir».
- **El foco sigue al elemento movido**, y si llega a un extremo pasa al otro
  botón en vez de quedarse en uno inerte. El dato del foco pendiente vive en el
  módulo y no en estado de React: entre el clic y el re-render no hay ningún
  componente vivo que pueda llevarlo.
- **24×24 exactos**, el mínimo de 2.5.8. Midiendo los dos, el criterio se cumple
  por tamaño y no hace falta separarlos.
- **En Propiedades los ▲▼ respetan la MISMA guarda que el arrastre.** Con una
  columna ordenada harían el mismo `splice` sobre el array del hook y
  reintroducirían el desfase de índices.
- **En el sidebar van FUERA del `<button>` de la pestaña**: un botón dentro de
  otro es HTML inválido.

### Verificado mirando lo que se guarda

Sobre el componente real con `fetch` interceptado: bajar «Propiedad 2» deja la
pantalla en `1 · 3 · 2 · 4 · 5` y guarda `id-3→2`, `id-2→3` — lo mismo que se ve.
El foco se queda en el botón del elemento movido; al llegar al final salta al ▲.

> **`TarjetasEquipo` queda fuera y no es olvido.** Ya tenía ▲▼ y por lo tanto no
> incumplía 2.1.1. Su mecanismo es otro —intercambia el `orden` de dos filas en
> vez de reordenar un array— y usa `disabled` y `title` en vez de `aria-disabled`
> y `aria-label`. Migrarlo exigiría tocar su guardado. Es la única lista con
> presentación distinta.

---

## TipTap 3.23.6 → 3.29.2 — 2026-08-09

**ZONA COMPARTIDA:** `package.json` y `package-lock.json`. Se subieron las 41
entradas —9 dependencias y 32 overrides— al mismo número.

**El salto es limpio.** Se comprobó antes de subir, que era la condición:

| qué | resultado |
|---|---|
| Serialización de contenido real | **IDÉNTICA** en los tres tipos |
| Las 16 órdenes de la barra | responden en los tres tipos |
| Cambios de API en las 9 extensiones | ninguno: compila sin tocar código |
| `npm install` sin `--legacy-peer-deps` | funciona sobre `node_modules` borrado |
| Los 32 overrides | **siguen haciendo falta** |

### Cómo se comprobó la serialización, que era lo que más importaba

Los 13 artículos, las 3 páginas legales y las descripciones de propiedad ya están
guardados: si la serialización cambiaba, el contenido existente podía renderizar
distinto. Se sacaron de la base un artículo publicado, una página legal y una
descripción, se pasaron por el mismo juego de extensiones del editor y se comparó
`getHTML()`:

```
blog       2972 car  IDÉNTICO
legal      3354 car  IDÉNTICO
propiedad  4169 car  IDÉNTICO
```

`legal` entra con 3450 caracteres y sale con 3354 **en las dos versiones**: es la
normalización de siempre, no algo que introduzca el salto.

> **Trampa del método.** Probar los controles pulsando los botones con eventos
> sintéticos NO sirve: ProseMirror lleva su propia selección y no la ve. El bucle
> daba «sin efecto» en los 16. Hay que ejecutar las órdenes por la API
> —`editor.chain().focus().toggleBold().run()`—, que es exactamente lo que hacen
> los botones. Y `unsetLink` hay que probarlo aparte: encadenado con `setLink` el
> HTML neto no cambia y se lee como si fallara.

---

## Tres arreglos del home en móvil — 2026-08-09

| Commit | Qué |
|---|---|
| `5bb1f5e` | El icono de «Reserva tu propiedad» no se separa de la palabra |
| `825514d` | La fecha del blog deja de competir con la categoría |
| `6dd6c63` | El CTA es un botón, y en móvil van 3 destacadas |

### LO QUE SE VE COMO «TAGS» DEL BLOG NO SON TAGS

Es el hallazgo del encargo y conviene que quede escrito.

La columna `tags` existe en `BlogPost` y en la tabla, pero **está vacía en los 13
artículos**: 0 tags en total. Lo que se lee como una fila de etiquetas es el
campo **`categoria`**, en el que se han ido escribiendo listas separadas por
comas dentro de un único valor:

```
'Mercado, Mercado inmobiliario, Casas, Corretaje propiedades, Creditos hipotecarios'
```

Eso es UNA cadena, no cinco términos. De ahí el solapamiento: «Mercado» y
«Mercado inmobiliario» no son dos etiquetas que se repitan, son texto seguido.

- **No enlazan a nada.** Son `<span>` en los tres sitios donde se pintan
  (`BlogPage`, `BlogPreviewSection` y el pie de `BlogPostPage`). No hay filtro
  por categoría ni búsqueda en el blog.
- De los 13 artículos, **9 tienen coma** en `categoria`; los 4 restantes son un
  término solo («Inversión», «Mercado», «Asesoria Inmobiliaria»…).
- El bloque de tags de `BlogPostPage:110` no se pinta nunca, porque depende de
  `post.tags` y siempre está vacío.

**Queda pendiente de decisión, no se tocó:** o `categoria` pasa a ser un término
único de verdad y lo demás se mueve a `tags`, o se acepta que es una lista y se
parte por comas al pintarla. Lo segundo es una línea; lo primero pide limpiar 9
filas a mano y decidir la taxonomía.

Lo que sí se arregló sin depender de eso: la fecha iba en un `flex items-center`
junto a la categoría, así que con una categoría de varias líneas quedaba
centrada contra el bloque en vez de alineada con su primera línea. En móvil se
apilan; desde `sm` vuelven a la fila con `items-start`.

### El icono que se soltaba en el footer

Con `inline-flex` el enlace era un contenedor flex de una sola línea: el texto
envolvía por dentro y el icono quedaba centrado contra un bloque de dos líneas.
Vuelve al flujo normal y la última palabra viaja con el icono dentro de un
`white-space: nowrap`. Medido a 360, 390 y 430: siempre en la misma línea que
«propiedad», a 5px.

### Tres destacadas en móvil

Debajo de 768px la grilla ya caía a UNA columna por `mobile.css`, así que seis
fichas eran una torre:

| ancho | antes | después |
|---|---|---|
| 360px | 2968px | **1450px** |
| 390px | 3080px | **1518px** |

El `.slice` sigue siendo intencional; lo que cambia es que el número dependa del
ancho, con el mismo corte de 768px que ya usa `mobile.css`.

**No altera `home_destacadas_ids`:** `props` ya viene en el orden de esa clave,
así que los 3 de móvil son los 3 primeros que eligió el admin.

### «Ver todos los artículos» NO recibe el mismo tratamiento

Se revisó, como pedía el encargo. En el bloque de blog la acción principal es
**entrar a un artículo** —las tres tarjetas son el contenido—, y «Ver todos los
artículos →» es la salida secundaria hacia el índice. En el bloque de
propiedades, en cambio, las fichas llevan a una ficha concreta y «Ver todas» es
la única salida al catálogo completo.

Ponerles el mismo botón dejaría dos primarios compitiendo en la misma página.
`.btn-primary` para el de propiedades (15.71:1, 281×44px) y enlace subrayado
para el del blog.

---

## La taxonomía del blog: qué hay y qué falta decidir — 2026-08-09

Commit `6cf3c97`. Se cierra la parte de presentación; la de datos queda abierta a
propósito y conviene tenerla escrita antes de que alguien construya encima.

### `blog_posts.tags` ESTÁ VACÍA. No la uses sin llenarla primero.

La columna existe en la tabla y en el tipo `BlogPost`, y **los 13 artículos
publicados tienen 0 tags**. Consecuencia directa: **el bloque de
`BlogPostPage:110` que la pinta no se renderiza nunca** —depende de
`post.tags && post.tags.length > 0`— y lleva ahí desde que se escribió.

No es código muerto que haya que borrar: es la mitad de una funcionalidad que
nunca se terminó. Borrarlo sería tan arbitrario como dejarlo. La decisión de
abajo es la que resuelve cuál de las dos cosas hacer.

### `categoria` contiene listas escritas a mano

Es una columna de texto libre y se ha usado como si admitiera varios valores:

```
'Mercado, Mercado inmobiliario, Casas, Corretaje propiedades, Creditos hipotecarios'
'Mercado, hipotecarios, creditos, financiamiento, asesoria inmobiliaria '
'Inversión'
```

**9 de los 13 tienen coma.** Los otros 4 son un término solo. Nadie los escribió
pensando en que se leerían como etiquetas, de ahí el solapamiento: «Mercado» y
«Mercado inmobiliario» no son dos categorías, son la misma idea dos veces.

### Lo que se hizo: recortar la PRESENTACIÓN, no el dato

`categoriaPrincipal()` en `src/lib/blog.ts` parte por coma y recorta espacios.
Se aplica en los cinco sitios donde se pinta —la lista de /blog, el bloque del
home (artículo grande y pequeños) y la cabecera del artículo—. **La cadena
completa sigue intacta en la base.**

Se pudo hacer sin perder nada porque **esos `<span>` no son navegación**: el blog
no tiene filtro ni búsqueda por categoría. Son decoración.

| | antes | después |
|---|---|---|
| Tarjeta de 5 términos, 390px | 507px | **468px** |
| Tarjeta de 1 término, 390px | 570px | 570px |
| Lista completa de /blog | 6588px | **6373px** |
| Bloque de blog del home | 1466px | **1341px** |

### SI ALGÚN DÍA SE HACE UN FILTRO DE BLOG, PRIMERO LA TAXONOMÍA

En cuanto una categoría pase a ser un enlace, `categoriaPrincipal()` deja de
alcanzar: filtrar por «Mercado» traería nueve artículos que no tienen nada que
ver entre sí, y los otros cuatro términos de cada cadena quedarían inalcanzables.

El orden correcto es:

1. **Decidir la lista cerrada de categorías.** Una por artículo.
2. **Limpiar las 9 filas con coma**: dejar el término que corresponda en
   `categoria` y mover el resto a `tags`.
3. Recién entonces, convertir `categoria` en enlace y usar `tags` —que a partir
   de ahí sí tendría contenido, y el bloque de `BlogPostPage:110` empezaría a
   renderizarse solo.

Hacerlo al revés —poner el filtro sobre los datos de hoy— da una navegación que
miente sobre lo que agrupa.

---

## DECISIÓN DE VÍCTOR: fuera el reordenamiento por teclado — 2026-08-09

Commit `b5b99a7`. **Esto reabre a sabiendas el incumplimiento de WCAG 2.1.1 que
se había cerrado el mismo día en `8435408`.** Queda escrito acá para que una
auditoría futura no lo trate como regresión ni como olvido.

### Qué se quitó

Los botones ▲▼ de **los diez puntos** de reordenamiento —sidebar, lista de
propiedades, unidades, fotos de propiedad, carrusel del hero, destacadas del
inicio, equipo, asociados y las dos fichas de cliente— más los que
`TarjetasEquipo` ya tenía de antes. `ordenTeclado.tsx` se quedó sin consumidores
y se borró.

### La decisión, y por qué no es un defecto

Bastan el arrastre y el drop. Es una pantalla **interna**, la usa **una sola
persona**, con ratón. El criterio 2.1.1 sigue sin cumplirse ahí, y eso está
asumido: no es que nadie lo haya notado, es que se prefirió la interfaz más
limpia sabiendo el costo.

**Si algún día el admin lo usa más de una persona, o alguien que no puede usar el
ratón, esto hay que revertirlo.** El commit `8435408` tiene la implementación
completa y `git revert b5b99a7` la devuelve entera.

### El arrastre no se tocó

`usePointerSort` y `useDragSort.ts` quedaron **byte a byte iguales**, y los diez
puntos conservan su hook y sus manijas. Solo desapareció el camino paralelo.

### CONSECUENCIA APARTE: `TarjetasEquipo` se queda sin forma de reordenar

Es la única lista que **nunca tuvo arrastre** —sus ▲▼ eran el único mecanismo—.
Al quitárselos, la única manera de cambiar el orden de una tarjeta es escribir el
número a mano en el campo «Orden» del formulario de edición.

No es lo mismo que en las otras diez, donde el arrastre sigue ahí. Si se nota en
uso, la salida barata es darle arrastre como al resto, no devolverle las flechas.

---

## Confirmación al guardar una propiedad — 2026-08-09

Commit `01d25b5`. La píldora «Guardado correctamente» se iba sola a los 2500 ms;
ahora hay un diálogo que hay que aceptar. **Solo en Propiedades** — los otros
trece paneles siguen con la píldora.

Diálogo propio y no `alert()`, con el mismo par de hooks que los cinco modales
del sitio: `useDialogoModal` (Escape, foco atrapado, foco devuelto) y
`useBloquearScroll`.

### EL FOCO NO PODÍA VOLVER AL DISPARADOR

`useDialogoModal` devuelve el foco a quien abrió el modal, y acá **ese elemento
ya no existe**: `save()` hace `setEditing(null)` y el formulario entero —con su
botón «Guardar»— se desmonta antes de que el diálogo aparezca.

Sin resolverlo, al cerrar el foco caía en el `<body>` y quien navega con teclado
perdía el sitio por completo. Se manda a «Nueva propiedad», que es la acción
siguiente natural y está justo encima de la lista recién actualizada.

**Es el patrón a copiar** para cualquier diálogo que se levante después de
desmontar lo que lo disparó: el hook no puede adivinar a dónde ir, hay que
decírselo.

> **Trampa al verificar.** `useDialogoModal` escucha `keydown` en `document`, no
> en `window`. Un Escape sintético despachado sobre `window` no cierra nada y se
> lee como si el hook estuviera roto.

---

## `estado` y `categoria` son ejes independientes — y la navegación los ataba — 2026-08-09

Commits `f8ca5f8`, `65b34b7` y `a806c83`.

Lo destapó un caso concreto: un departamento nuevo que una clienta compró para
arrendar. Es **nuevo Y está en arriendo**, y no aparecía por ninguna parte.

### El modelo de datos SIEMPRE admitió la combinación

`categoria` responde «¿nueva o usada?» y `estado` responde «¿se vende o se
arrienda?». Son ortogonales por diseño, y las consultas de `PropiedadesPage` los
tratan como tales. La propiedad se guardó **limpia**: `estado=en_arriendo`,
`categoria=proyecto_nuevo`, con los campos de proyecto vacíos. **No había nada
que corregir en la base.**

### El defecto estaba en SEIS enlaces, no en el formulario

Todos ataban un filtro de `estado` a la ruta `/propiedades-usadas`, que fuerza
`categoria=usada`:

| sitio | qué |
|---|---|
| `Header.tsx` ×4 | «En Venta» y «En Arriendo», escritorio y móvil |
| `RentalPage.tsx` | el CTA hacia arriendos |
| `SearchBar.tsx` | **toda** búsqueda, con o sin filtros |

Medido contra la base:

| | total | mostraba | escondidas |
|---|---|---|---|
| En venta | 57 | 44 | **13** |
| En arriendo | 3 | 2 | 1 |

**«En Venta» era mucho más grave que el caso que lo destapó**, y el buscador se
llevaba los 13 proyectos nuevos en cualquier búsqueda. Ahora los seis apuntan a
`/propiedades?estado=…`, sin categoría.

Verificado tras el cambio: «En Arriendo» devuelve las 3 —2 usadas + 1 proyecto
nuevo, con la de la clienta entre ellas— y «En Venta» las 57.

### El rótulo del menú también mentía

Con los enlaces arreglados, el desplegable **«Propiedades Usadas»** pasaba a
mostrar proyectos nuevos en dos de sus opciones. Pasa a llamarse
**«Propiedades»**, «Ver todas» apunta al catálogo entero y la ruta de categoría
sigue accesible como **«Solo usadas»**, pareja de «Proyectos Nuevos».

### Y el del formulario

`Field label="Estado de venta"` → **«Estado»**. El selector incluye «En arriendo»
y «Arrendada», así que el rótulo contradecía sus propias opciones y sugería que
venta y arriendo eran el mismo eje — justo la confusión de partida. Aparecía en
un solo sitio.

---

## `TarjetasEquipo` recupera el reordenamiento, con arrastre — 2026-08-09

Consecuencia de `b5b99a7`: era la única lista **sin arrastre**, así que al
quitarle las ▲▼ se quedó sin ningún mecanismo. Ahora usa `usePointerSort` como
las otras tres.

**El guardado pasó del INTERCAMBIO al RENUMERADO.** Antes intercambiaba el
`orden` de dos filas; ahora escribe `orden: i + 1` sobre la lista entera. Deja
las cuatro con el mismo mecanismo y **elimina el fallo parcial del intercambio**,
donde si uno de los dos PATCH pasaba y el otro no quedaban dos tarjetas con el
mismo `orden` y el desempate lo decidía Postgres. Con el renumerado, un fallo a
media lista deja huecos pero nunca empates.

Se comprobó antes de migrar que **nadie más lee `tarjetas_equipo`** —ni página
pública ni Pages Function—, así que el renumerado no puede afectar a nada fuera
del panel.

### El campo «Orden» manual se queda

Con el arrastre puesto es redundante, pero **Equipo y Asociados también lo
tienen** junto a su arrastre. Quitarlo solo de Tarjetas crearía una
inconsistencia nueva en vez de resolver una.

Si se quita algún día, hay que quitarlo en las tres a la vez. Y conviene tener
presente que el campo permite escribir números repetidos o con huecos que el
siguiente arrastre normaliza en silencio: es un segundo escritor sobre el mismo
concepto, igual en las tres.

---

## «Proyectos Nuevos» es una vitrina, no una categoría — 2026-08-09

Commit `cab1c37`. Cierra el caso que empezó con el departamento nuevo en arriendo
de San Joaquín.

### El registro estaba bien; faltaba el filtro de la ruta

`categoria` y `estado` son ejes ortogonales y el modelo admite «nuevo Y en
arriendo». Lo que fallaba es que `/proyectos-nuevos` filtraba **solo** por
`categoria='proyecto_nuevo'`, sin mirar el estado, así que un arriendo aparecía
entre proyectos con bono pie y entrega inmediata.

```js
if (categoria === 'proyecto_nuevo') q = q.not('estado', 'in', '(en_arriendo,arrendada)')
```

### LA DISTINCIÓN QUE DECIDE EL CASO, y que conviene no perder

**«Proyectos Nuevos» es una VITRINA COMERCIAL** de unidades en venta: bono pie,
entrega inmediata, etapa de construcción. Un arriendo no pertenece ahí aunque el
inmueble sea nuevo.

**«Propiedades Usadas» es una CATEGORÍA DEL INVENTARIO.** Una casa usada en
arriendo sigue siendo una casa usada, así que **no lleva filtro equivalente**.
Excluir arriendos ahí dejaría **5 propiedades** —2 `en_arriendo` + 3
`arrendada`— alcanzables solo desde el filtro de estado, casi el doble de las
que salen de proyectos nuevos.

Son dos rutas que se parecen y no son lo mismo. Si alguien «unifica» su
comportamiento por simetría, rompe una de las dos.

### Qué se queda dentro

`vendida` y `reservada` **siguen apareciendo** en la vitrina, con su insignia
como en el catálogo general: son unidades que sí se ofrecieron ahí, y sacarlas
haría desaparecer proyectos enteros a medida que se colocan. `--estado-vendida` y
`--estado-reservada` existen justo para eso.

### El vacío nuevo dice DÓNDE están, no solo que ahí no

Con el filtro, `/proyectos-nuevos?estado=en_arriendo` da **cero siempre**. El
vacío genérico —«Ninguna propiedad coincide con estos filtros»— sería cierto y
desorientador a la vez: el visitante concluiría que no hay arriendos cuando sí
los hay.

`ArriendosEnElCatalogo` lo explica y lleva el enlace con el filtro ya puesto,
para no obligar a rehacer la búsqueda. Es la misma idea que `SinArriendos`, que
capta cuando de verdad no hay ninguno; **son dos vacíos distintos y no deben
fundirse**: uno dice «todavía no tenemos», el otro «no están aquí, están allá».

### Verificado

| ruta | fichas | ¿la de San Joaquín? |
|---|---|---|
| `/proyectos-nuevos` | 14 de 15 | **no** |
| `/propiedades?estado=en_arriendo` | 3 | **sí** |
| `/propiedades` | 69 | sí |
| `/propiedades-usadas` | 54 | no (es proyecto nuevo) |
| `/proyectos-nuevos?estado=en_arriendo` | 0 → vacío nuevo | — |
| `/proyectos-nuevos?estado=arrendada` | 0 → vacío nuevo | — |

> Los totales subieron respecto del reporte previo —15 proyectos nuevos y 69
> activas, no 14 y 68— porque se publicó una propiedad entre medio. El filtro
> saca exactamente una: la de San Joaquín, la única `proyecto_nuevo` que no está
> `en_venta`.

---

## `mostrar_boton_flow` → `mostrar_boton_reserva`, los cuatro pasos — 2026-08-10

**ZONA COMPARTIDA:** `src/types/index.ts`. Además toca `src/pages/` (sesión web
pública) y `src/pages/admin/` (sesión admin). El árbol estaba limpio al empezar.

El botón dejó de ser de Flow en `c737689`: hoy abre `ReservaModal`, que cobra por
transferencia. La columna seguía llamándose como el proveedor que ya no se usa.
`PropiedadDetailPage.tsx` traía escrito que no valía la pena renombrarla; el
encargo decidió lo contrario, con el procedimiento que hace que no sea riesgoso.

### CERRADO — los cuatro pasos, el mismo día

| paso | qué | estado |
|---|---|---|
| 1 | `ADD COLUMN mostrar_boton_reserva`, backfill, mismo default | **hecho** (`20260810000000`) |
| 2 | el código pasa a la columna nueva | **hecho** |
| 3 | deploy, y verificar en producción | **hecho** (`3ac3392c`) |
| 4 | `DROP COLUMN mostrar_boton_flow` | **hecho** (`20260810000100`) |

`mostrar_boton_flow` ya no existe. Pedirla por PostgREST devuelve
`42703 column propiedades.mostrar_boton_flow does not exist`, y `select=*`
devuelve 54 columnas sin ella.

### EL ARCHIVO DEL PASO 4 NO SE ESCRIBIÓ HASTA QUE EL 3 ESTUVO VERIFICADO

Es la parte del procedimiento que conviene copiar. Un `DROP COLUMN` escrito «para
después» dentro de `supabase/migrations/` no es una nota: es una migración
pendiente, y **se aplica en el próximo `migration up` de cualquier sesión**, sin
que nadie haya decidido que era el momento. La lista de migraciones no distingue
«listo para correr» de «escrito por adelantado».

### La ventana entre el paso 2 y el 3 existió y se cerró sin usarse

Mientras las dos columnas convivieron, el código nuevo **solo escribía la nueva**.
En producción no pasaba nada —corría el código viejo, que leía y escribía la
vieja—, pero un `npm run dev` local contra la base de producción tocando ese
checkbox las habría separado. No ocurrió: la comprobación previa al `DROP`
encontró **0 desacuerdos en las 82 filas**.

Se descartó sincronizarlas con un trigger o escribiendo ambas desde el admin:
reintroduce el nombre viejo en el código que el encargo venía a limpiar, y la
ventana se cierra con un deploy.

### Verificación después del borrado

Las 82 fichas recorridas otra vez en producción, con el mismo barrido de antes:

| | antes del DROP | después |
|---|---|---|
| botón renderizado | 73 | **73** |
| discrepancias contra lo que predice la columna | 0 | **0** |
| Futaleufú | sin botón | **sin botón** |
| errores y excepciones de consola | 0 | **0** |

Y las rutas que consultan `propiedades` con `select('*')` —`/`, `/propiedades`,
`/proyectos-nuevos`, `/propiedades-usadas`, la ficha de Futaleufú y su showcase—
más `/admin`, que sigue pintando su formulario de acceso. Ningún `42703` en
ninguna.

### EL BOTÓN SALE EN 73, NO EN 81, Y LA BANDERA NO ES LA CAUSA

Se descubrió al verificar y conviene que quede escrito, porque invita a
diagnosticar mal. `PropiedadDetailPage.tsx` pinta el botón con:

```jsx
{prop.mostrar_boton_reserva !== false && !destacado && (
```

`destacado` es `ESTADO_DESTACADO[prop.estado]`, o sea `vendida`, `arrendada` o
`reservada`. La bandera está encendida en 81 propiedades, pero **8 de ellas
tienen uno de esos tres estados**, así que el botón no se pinta:

| | |
|---|---|
| bandera encendida | 81 |
| **botón en pantalla** | **73** |
| oculto por estado (3 vendidas, 3 arrendadas, 2 reservadas) | 8 |
| oculto por bandera | 1 · Hotel + Restaurante · Futaleufú |

Es comportamiento previo y correcto —una propiedad vendida no se reserva—, y
ninguno de los commits de este encargo lo tocó. Pero «la bandera está en 81, así
que el botón sale en 81» es falso, y quien cuente fichas para comprobar un cambio
en esa bandera va a encontrar 8 que no cuadran por una razón que no tiene nada
que ver.

### Por qué el `ADD` + backfill y no un `RENAME`

Un `ALTER TABLE ... RENAME COLUMN` es instantáneo, pero el sitio en vivo está
leyendo esa columna: entre el rename y el deploy, `select('*')` deja de traer
`mostrar_boton_flow` y `prop.mostrar_boton_flow !== false` pasa a evaluar
`undefined !== false` → **true**. El botón aparecería en las 82, incluido el
Hotel de Futaleufú, que es el único que lo tiene apagado.

El fallo es silencioso y va en la dirección peligrosa: no rompe la página, la
llena de un botón de reserva donde no debe haberlo.

### El backfill copia NULL como NULL

La columna es nullable y la lectura es `!== false`, así que NULL significa «sí
muestra». Convertirlo a `true` en el backfill sería cambiar el dato en vez de
moverlo, aunque hoy no haya ninguna fila NULL.

### Verificado contra producción, antes y después

| | antes | después |
|---|---|---|
| filas | 82 | 82 |
| muestran botón (`!== false`) | 81 | **81** |
| no lo muestran | 1 · Hotel + Restaurante · Futaleufú | **1 · el mismo** |
| NULL | 0 | 0 |
| desacuerdos vieja vs nueva | — | **0 de 82** |

Los 82 se compararon fila a fila, no por conteos: dos conteos que cuadran no
prueban que las mismas filas estén de los mismos lados.

> **Cuidado con la comparación entre columnas por PostgREST.** El intento de
> pedir «filas donde una columna difiere de la otra» con
> `and=(mostrar_boton_reserva.neq.mostrar_boton_flow)` **devuelve vacío siempre**:
> PostgREST lee el lado derecho como un literal, no como una columna, así que el
> vacío no significa «no hay desacuerdos». Hay que traerse las filas y compararlas
> fuera.

### El rótulo del checkbox también mentía

«Mostrar botón de pago Flow (Reserva esta propiedad)» → «Mostrar botón «Reservar
esta propiedad»». Es el texto que ve Víctor en el admin, y nombraba un proveedor
desactivado.

---

## Las fichas de cliente dejan de ser legibles con la anon key — 2026-08-10

**ZONA COMPARTIDA:** `supabase/migrations/`. No toca código.

`20260805000300` dejó `ficha_clientes_select_anon` y
`ficha_propiedades_select_anon` a propósito, con este criterio escrito: «lectura
anónima (el cliente abre su ficha sin login)».

**Ese caso de uso no existe.** Confirmado con Roberto: la ficha se le entrega al
cliente como **PDF descargado**, nunca como enlace a una URL del sitio. Sin ese
caso, la política regalaba datos personales —nombre, teléfono, correo— y las
propiedades asociadas a cualquiera con la anon key, que viaja en el bundle
público.

### Antes de borrar: quién las consulta

Las cinco pantallas viven bajo `/admin/ficha-cliente/…` y **las cinco pasan por
`useAdminAuth`**, o sea por sesión de Supabase, o sea por el rol
`authenticated`: `FichaClientesLista`, `FichaClienteDetalle`,
`FichaClienteNueva`, `FichaClienteVer` y `FichaClienteEditar`. Sus políticas
`*_all_auth` siguen intactas.

El PDF tampoco dependía de `anon`: `FichaClienteVer` lo genera con
`window.print()` sobre la página ya renderizada, sin ninguna consulta aparte.

### La comprobación es de comportamiento, y por eso sirve

No hacía falta leer `pg_policies` —sin Docker no se puede desde la CLI— porque
**las políticas permisivas se combinan con OR**: si quedara cualquier otra que
concediera SELECT a `anon` o a `public`, las filas seguirían llegando. Llegan
cero, así que no queda ninguna.

| tabla | anon antes | anon ahora |
|---|---|---|
| `ficha_clientes` | 1 | **0** |
| `ficha_propiedades` | 4 | **0** |
| `sdm_agentes` | 1 | 1 (sin tocar) |
| `propiedades` | 82 | 82 (sin tocar) |

Las dos últimas filas son el control: prueban que el `DROP` fue quirúrgico y no
un apagón general de RLS.

> **Un 0 hay que leerlo con cuidado.** La respuesta es **HTTP 200 con `[]`**, no
> un 404 ni un `42P01`: la tabla existe y RLS filtra. Es la misma trampa del
> `DELETE` que devuelve 204 sin borrar. Por eso se midió el ANTES —1 y 4— antes
> de tocar nada: sin línea base, un 0 podría ser «tabla vacía».

La escritura anónima sigue cerrada como estaba: `42501 new row violates
row-level security policy`.

### `sdm_agentes` NO se tocó, y no es olvido

Viene de la misma migración y con el mismo criterio dudoso. Queda fuera porque
**nadie ha comprobado si algo público lee esa tabla**, y cerrarla «por simetría»
sin esa comprobación es exactamente lo que dejó estas dos abiertas. Es una
decisión aparte, con su propia verificación pendiente.

### PENDIENTE DE VERIFICAR POR VÍCTOR

Las cinco pantallas con sesión iniciada, incluida la descarga del PDF. La
migración solo borró políticas `TO anon` y las `TO authenticated` quedaron
intactas, así que no debería cambiar nada — pero eso es un argumento, no una
comprobación, y no tengo credenciales del admin.

---

## CERRADO · Sofía y `envios_plantilla`: nunca pasó por esa política — 2026-08-10

Pendiente desde el 5 de agosto: confirmar que Sofía siguiera registrando envíos
tras `20260805000400`, que activó RLS en esa tabla. **Cerrado, y no por una
medición de filas sino por construcción.** Solo documentación: no se tocó código
ni el repo del worker.

### La evidencia, ejecutada en el SQL Editor

```sql
select rolname, rolbypassrls
  from pg_roles where rolname in ('service_role', 'authenticated', 'anon');
```

| rol | `rolbypassrls` |
|---|---|
| `anon` | false |
| `authenticated` | false |
| **`service_role`** | **true** |

```sql
select policyname, permissive, roles, cmd, qual, with_check
  from pg_policies where schemaname = 'public' and tablename = 'envios_plantilla';
```

| policyname | permissive | roles | cmd | qual | with_check |
|---|---|---|---|---|---|
| `envios_plantilla_all_auth` | PERMISSIVE | `{authenticated}` | ALL | true | true |

**Es la única.**

### EL RAZONAMIENTO, PARA QUE NADIE LO REABRA

Sofía accede con `SUPABASE_SERVICE_KEY`, o sea como `service_role`, y
`service_role` tiene **`rolbypassrls = true`**. Un rol con `BYPASSRLS` **no
evalúa ninguna política de fila**: no es que las cumpla, es que el planificador
ni las aplica.

De ahí se sigue que `20260805000400` **no pudo afectarla**, y la deducción no
depende de qué política se escribiera:

1. La única política sobre la tabla es `TO authenticated`. `service_role` no es
   `authenticated`, así que ni siquiera le correspondería.
2. Aunque le correspondiera, o aunque la política fuera `USING (false)`,
   `BYPASSRLS` la saltaría igual.

O sea que **el resultado es el mismo para cualquier política que se ponga sobre
esta tabla**. Activar RLS en `envios_plantilla` solo cambió lo que ven `anon` y
`authenticated`; para Sofía la tabla se comporta exactamente igual que antes del
5 de agosto.

Confirmado además por Víctor: Sofía funciona con normalidad.

**Corolario que conviene tener presente:** este mismo argumento cubre a las otras
tablas del worker. Cerrar con RLS cualquier tabla que solo escriba Sofía es
seguro por la misma razón. Lo que **sí** hay que mirar antes de cerrar una tabla
es si algo del **sitio** la lee con la anon key —eso es lo que rompió el criterio
de las fichas de cliente—, no si Sofía escribe en ella.

### La consulta de conteo se descartó, y por qué no hace falta

Se había preparado una tercera consulta que contaba filas posteriores al 5 de
agosto en `envios_plantilla` y en tres tablas hermanas de control. **Falló con
`42703`: la columna de fecha no se llama `created_at`.**

No se rehízo, y no es un cabo suelto. Era la **confirmación empírica de algo que
las dos primeras resuelven estructuralmente**: un conteo podría a lo sumo mostrar
que las escrituras llegan, mientras que `rolbypassrls = true` explica *por qué*
no podían dejar de llegar. Un experimento que solo puede confirmar lo que ya está
demostrado no aporta, y su caso ambiguo —cero filas porque Sofía estuvo quieta—
habría dejado el pendiente abierto sin motivo.

Si alguna vez hace falta contar por otra razón, primero hay que averiguar el
nombre real de la columna:

```sql
select table_name, column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'envios_plantilla';
```

### Lo que se midió por el camino, y sigue siendo válido

Con la anon key, **todas** las tablas y vistas de Sofía responden `200` con cero
filas: `envios_plantilla`, `mensajes`, `eventos_turno`, `mensajes_pendientes`,
`decisiones_shadow`, `eventos_procesados`, `leads`, `visitas`, `config` y las
cuatro vistas `metricas_*`.

Las vistas son de paso una **verificación de `20260805000500`**: en aquella
migración se midieron en 3, 3, 1 y 3 filas a través del bypass, y hoy dan 0. El
`security_invoker` aguantó.

---

## TRAMPA · Un cero desde fuera no distingue «vacía» de «bloqueada». Los tres conteos mienten igual.

Salió del caso de arriba y vale para cualquier tabla con RLS, no solo las de
Sofía.

PostgREST ofrece tres modos de conteo, y los dos últimos **no cuentan**: usan la
estimación del planificador, lo que parece una vía para leer el tamaño real de
una tabla sin poder leer sus filas.

**No lo es.** Comprobado calibrando contra una tabla cuyo contenido se conoce:

| tabla | filas reales | `count=exact` | `count=planned` | `count=estimated` |
|---|---|---|---|---|
| `ficha_clientes` | **1** | 0 | **0** | **0** |
| `propiedades` | 82 | 82 | 82 | 82 |

Con deny-all la política se convierte en un **filtro constante falso**, y la
estimación del planificador colapsa a 0 exactamente igual que el conteo. No hay
atajo.

Consecuencias prácticas:

- **Desde fuera de la base no se puede distinguir «la tabla está vacía» de «RLS
  me la está tapando».** Ni contando, ni estimando, ni por el código HTTP: la
  respuesta es `200` con `[]`, no un 404.
- Por eso, cuando se vaya a cerrar una tabla, **hay que medir el ANTES**. Sin
  línea base, el cero de después no prueba que el cierre funcionó.
- Es la misma familia que la trampa del `DELETE` que devuelve **204 sin borrar**
  cuando RLS filtra todas las filas candidatas, y que la del catch-all de SPA que
  devuelve **200 para cualquier ruta**. En los tres casos la respuesta es
  sintácticamente correcta y semánticamente vacía.

---

## Dos trampas que mordieron aplicando la auditoría — 2026-08-10

### El SQL Editor de Supabase corre cada bloque en su propia sesión

`begin;` … `commit;` escritos en el mismo archivo **no forman una transacción**
si el editor los ejecuta por separado. Los `UPDATE` de en medio quedan en una
sesión que se cierra sin confirmar, y se deshacen enteros.

Pasó con las siete claves de `contenido_sitio` de la tanda 2 de la auditoría. El
editor dijo que todo había ido bien y la base seguía con el texto viejo.

> **«Success. No rows returned» después de un `commit;` NO PRUEBA NADA.** Es la
> respuesta normal de un `commit` — incluso cuando no había ninguna transacción
> abierta que confirmar. Leerla como confirmación es exactamente el mismo error
> que leer el **204 de un `DELETE`** como borrado, o el **200 del catch-all de
> SPA** como «esta ruta existe». Las tres respuestas son sintácticamente
> correctas y semánticamente vacías.

**La regla:** el `select` de verificación va **DESPUÉS del `commit;` y en la
misma ejecución**. Si el editor los separa, el select cae en otra sesión y lee lo
que de verdad quedó confirmado — que es justo lo que se quiere comprobar. Un
select antes del commit lee lo que la transacción ve, no lo que sobrevive.

Y la comprobación final se hace **desde fuera**: con la anon key contra
PostgREST, no dentro del editor.

### Contar coincidencias de un `grep` no dice a qué interfaz pertenecen

`dividendo_uf` se dio por «campo de `Propiedad` que existe en el esquema y no se
pinta en ninguna superficie pública». Se verificó así:

```
grep -rn "dividendo_uf" src/pages/PropiedadDetailPage.tsx …   → 0
grep -rn "dividendo_uf" src/                                  → 4
```

**Las dos cifras eran ciertas y la conclusión falsa.** `dividendo_uf` está en la
línea 240 de `src/types/index.ts`, que pertenece a la interfaz **`Cotizacion`**,
no a `Propiedad` — el archivo declara varias interfaces seguidas. Y los 4 usos no
son «solo admin»: son el módulo de cotizaciones, donde el campo **funciona
correctamente**, escrito por `CotizacionesAdmin.tsx:376` y pintado por
`CotizacionPDF.tsx:368`.

Comprobado después contra la base: el tipo `Propiedad` tiene **54 campos y la
tabla 54 columnas, sin una sola diferencia en ninguna dirección**. No había
ninguna deuda de tipos.

Es la misma familia que el fallo de la regla 4.2: **buscar por forma sintáctica y
confundir el resultado con el hecho**. Allá se buscó `color:` y `background:` y se
declaró el eje cerrado cuatro veces mientras los usos vivían en ternarios y en
`boxShadow`. Acá se contó un nombre y se le atribuyó un dueño.

**La regla:** antes de afirmar que un campo pertenece a un tipo, mirar la
declaración —no la coincidencia— y contrastarla con la tabla real. Un nombre
repetido en un archivo de tipos no es un campo, es una cadena.

### Medir posiciones con `scroll-behavior: smooth` devuelve cifras falsas

`globals.css:395` declara `scroll-behavior: smooth` para todo el documento. Un
`scrollIntoView()` seguido de `getBoundingClientRect()` **lee el rect a mitad de
la animación**, así que devuelve una posición intermedia que no es ni la de antes
ni la de después.

**Ya mordió dos veces el mismo día:** a la evaluación B de la auditoría, que lo
detectó y lo dejó escrito, y a la verificación de la tanda 4, que lo repitió sin
haber leído esa nota. En el segundo caso el síntoma fue `elementFromPoint`
devolviendo `null` en 22 de 22 controles — se leyó como «ningún control recibe el
clic» cuando lo que pasaba es que aún no estaban en pantalla.

**La regla, antes de medir cualquier posición o hacer cualquier hit-test:**

```js
document.documentElement.style.scrollBehavior = 'auto'
```

Y dos corolarios que salieron del mismo error:

- **`elementFromPoint` solo resuelve coordenadas DENTRO del viewport.** Un
  elemento por debajo del pliegue devuelve `null`, que no significa «tapado»
  sino «fuera de pantalla». Hay que centrarlo primero y comprobar que el rect
  quedó dentro.
- **Al extraer cifras del texto de la página, la cinta del header entra en la
  muestra.** Un `match(/UF ([\d.]+)/)` sobre `document.body.innerText` captura
  el valor de la UF del día —40.846— junto a los precios de las propiedades. Hay
  que leer desde el contenedor de las tarjetas, no desde el `body`.

### Una comprobación cuya salida no depende de nada no es una comprobación

El guion de despliegue llevaba esto:

```bash
git status --short && echo "(limpio)" && npx wrangler pages deploy dist …
```

`git status --short` **imprimió `M index.html`** y justo debajo apareció
«(limpio)», porque el `echo` era incondicional: no derivaba nada de la salida
anterior. El despliegue salió con el árbol sucio y se reportó limpio.

**La regla: toda comprobación tiene que poder fallar.** Si su salida es la misma
pase lo que pase, no está comprobando — está decorando. La forma correcta deriva
el mensaje del hecho:

```bash
[ -z "$(git status --porcelain)" ] && echo "limpio" || { echo "ÁRBOL SUCIO"; exit 1; }
```

Es la cuarta de la misma familia en esta sesión, y conviene verlas juntas porque
la forma es idéntica:

| | el error |
|---|---|
| El **204** de un `DELETE` | leído como «borró», cuando también es lo que devuelve si RLS filtró todo |
| El **`grep`** de `dividendo_uf` | contó 4 coincidencias por nombre y les atribuyó una interfaz que no era la suya |
| El **barrido de la regla 4.2** | buscó `color:` y `background:`, y declaró el eje cerrado cuatro veces mientras los usos vivían en ternarios y en `boxShadow` |
| El **`echo "(limpio)"`** | imprimió el resultado deseado sin mirar el real |

Las cuatro comparten la misma raíz: **confundir la forma de la evidencia con el
hecho que se quería establecer.** Un código de estado, un conteo, una coincidencia
de texto y un mensaje en pantalla no son el hecho; son señales que hay que
interpretar, y las cuatro pueden decir «bien» estando mal.

### La versión en inglés del sitio público es código inalcanzable

`LangProvider` (`src/hooks/useLang.tsx:14`) inicializa `lang` en `'es'`, y
**nadie llama a `setLang` en todo el sitio público**. El único conmutador de
idioma que existe es el de `ElBarrancoShowcase`, que usa su propio `useState`
local y no toca ese contexto.

Consecuencia: todas las ramas `lang === 'es' ? … : '…in English'` de
`QuienesSomosPage` y `AsociadosPage` **no se renderizan nunca**. Se pueden
editar, y hay que mantenerlas coherentes con el español por si algún día se
enciende el conmutador, pero **no se pueden verificar en el navegador**.

Es el dato que le faltaba al hallazgo M8 de `AUDITORIA-VOZ-SDM.md` («bilingüe
parcial»): no es que cuatro páginas estén en inglés y el resto no — es que ese
inglés no tiene forma de mostrarse, salvo en El Barranco.

## `«UF —»` no era un límite de mindicador: era pedirle el dato a un solo sitio — 2026-08-11

Sesión web pública. Tocado `src/lib/indicadores.ts` —zona compartida— y
`src/components/layout/Header.tsx`.

La barra del header mostraba `UF —` y `DÓLAR —` las primeras horas de cada día.

### El diagnóstico, y por qué la UF no podía ser culpa del origen

`obtenerIndicadores()` pedía **una sola URL**, `https://mindicador.cl/api`. Ese
endpoint es un documento **del día en curso** que arma mindicador, y en las
primeras horas todavía no está poblado: los nodos `uf` y `dolar` faltan o vienen
sin valor. `leer()` devolvía `null`, el `catch` colapsaba todo a
`{ uf: null, dolar: null }` y el Header pintaba dos guiones. No había fallback ni
caché de ninguna clase.

Pero el valor de la UF **existe siempre**. El Banco Central emite la UF diaria
del 9 de cada mes al 9 del siguiente, y `/api/uf/2026` lo confirma: 252 nodos,
el más nuevo con fecha `2026-09-09`, o sea 29 días por delante del día en que se
consultó. La UF vacía era un bug nuestro.

Solo el dólar observado depende de la mañana, porque es el promedio del día hábil
anterior. Ese sí puede no estar todavía, y por eso es el único de los dos que
puede acabar oculto en un día normal.

### Tres intentos, y la regla que hace que el tercero sirva

1. `/api` — un viaje para los dos. Acierta el resto del día.
2. `/api/<codigo>` — la serie de 30 días, **solo para el que faltó**.
3. `localStorage` — el último valor conocido.

`guardarCache()` **descarta los nulos**. Sin esa regla, la primera visita de una
madrugada mala borraría el respaldo justo cuando hace falta, y el tercer intento
no tendría nada que ofrecer.

Ningún valor de respaldo está escrito a mano. Cualquier cifra que se pinte salió
alguna vez de mindicador y viaja con la fecha en que se publicó.

### Dos bugs de huso horario que salieron por el camino

`Header.tsx` calculaba `hoyISO` con `toISOString()`, que da la fecha **UTC**.
Chile va en UTC-4, así que **desde las 20:00 de cada noche** la barra creía que
hoy era mañana y estampaba «al 11 ago» sobre datos que sí eran de hoy. Y
`fechaCorta()` formateaba en el huso del navegador: mindicador fecha sus nodos a
medianoche de Chile (`T04:00:00.000Z`), que un navegador en UTC-5 o más al oeste
retrocede al día anterior.

Los dos se arreglan con `timeZone: 'America/Santiago'` explícito. `hoyEnChile()`
usa el locale `en-CA` porque es el único corriente cuyo formato de fecha corta ya
es ISO, así que no hay que armar el string desde las partes.

### Un indicador sin dato no se pinta, y el alto no lo pone el contenido

Nunca un guión: el `<span>` entero desaparece. Un «—» donde va la UF de un sitio
que cotiza propiedades se lee como una cifra rota; que el rótulo no esté se lee
como que hoy no hay, que es la verdad.

Eso solo es seguro porque la barra lleva `height: 26` **fijo**, no un alto que
salga de su contenido. Medido en el navegador con los tres casos —los dos datos,
solo UF, ninguno— por 390, 768 y 1440: **26 px en los seis visibles, y oculta en
390** (`hidden md:flex`). Si el alto lo pusiera el texto, esconder un indicador
sumaría CLS al llegar el dato.

El separador `·` se intercala **entre** piezas en vez de acompañar a cada una:
pegado al indicador dejaría un «·» suelto colgando de la fecha cuando falte.

### El sufijo de fecha no se atenúa

`al 10 ago` es lo único que impide leer la cifra como si fuera de hoy. Bajarle la
opacidad para hacerlo discreto es esconder justo el aviso. Hereda el `--sky` del
contenedor: **8,68:1** sobre `--navy-dark`, compuesto en el navegador contra el
fondo real y no contra el color declarado. Lo que lo separa del rótulo no es que
se vea menos — es que el número que va en medio pesa más y va en blanco.

### Nota para quien mire `PropiedadDetailPage.tsx:236`

Ese comentario decía que el módulo «ya trae caché, timeout y su propio fallback».
Traía timeout. Desde este commit, las tres cosas son ciertas.

## TRAMPA · `toISOString()` devuelve UTC, y Chile no está en UTC — 2026-08-11

`new Date().toISOString().slice(0, 10)` **no es «la fecha de hoy»**. Es la fecha
en UTC. Chile va en UTC-4 (UTC-3 en horario de verano), así que **desde las 20:00
de cada noche** esa expresión ya devuelve la de mañana.

Así se rompió la barra de indicadores del header: comparaba la fecha del
indicador contra ese `hoyISO` y, cada noche a partir de las 20:00, estampaba «al
11 ago» sobre datos que sí eran de hoy. El bug era invisible durante el día y
aparecía solo de noche, que es la peor forma de fallar.

**La regla: cualquier comparación o formateo de fechas en este proyecto tiene que
ser explícita en `America/Santiago`.** El sitio publica indicadores del Banco
Central, precios en UF y horarios de visita. Todos son fechas chilenas, y ninguna
significa nada sin su huso.

Para la fecha de hoy hay una función: `hoyEnChile()`, en
[`src/lib/indicadores.ts`](./src/lib/indicadores.ts). Usa el locale `en-CA`
porque es el único corriente cuyo formato de fecha corta ya es ISO, así que
devuelve `YYYY-MM-DD` sin armar el string desde `getFullYear()` y compañía.

```ts
new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
```

### Dónde SÍ está bien usar `toISOString()`

Cuando lo que se guarda es un **instante**, no una fecha de calendario:

- `VendeConNosotrosPage.tsx:50` y `PaginasLegales.tsx:42` escriben
  `created_at` / `updated_at`. Un timestamp en UTC es exactamente lo correcto.

La distinción es esa: un instante no tiene huso, una fecha de calendario sí.

### Barrido del 2026-08-11 — pendientes, NO arreglados

Ninguno se tocó en el commit de los indicadores. Quedan anotados acá para que se
arreglen a conciencia y no de paso.

**Depende del huso del navegador de quien mire** — correcto desde Chile, se
corre un día o unas horas desde fuera:

| Sitio | Qué muestra |
|---|---|
| `admin/Captacion.tsx:1336-1338` | `startOfToday` / `startOfMonth` de las métricas. `new Date(y, m, d)` construye medianoche **local**, así que el corte de «hoy» es el del navegador, no el de Chile |
| `admin/Captacion.tsx:323` | `formatHora()` de los mensajes del chat — la hora de un mensaje leída en otro huso |
| `admin/Mensajes.tsx:44` | fecha y hora completas del mensaje |
| `admin/FichaClienteVer.tsx:100` | el «hoy» impreso en la ficha del cliente |
| `admin/FichaClienteDetalle.tsx:260`, `admin/FichaClientesLista.tsx:199` | fecha de creación de la ficha |
| `BlogPage.tsx:66`, `BlogPostPage.tsx:79`, `BlogPreviewSection.tsx:40` | fecha de publicación del post |
| `cotizaciones/CotizacionPDF.tsx:46` y `:190` | fechas dentro del PDF de cotización |

De todos ellos, los dos de **`Captacion.tsx`** son los que importan: uno decide
qué leads entran en «hoy» —o sea, un número que alguien mira para tomar
decisiones—, y el otro es una hora, donde un huso mal puesto no se corre un día
sino cuatro horas, que es un error mucho más fácil de no notar.

`scripts/sync-sitemap.mjs:79` también corta con `toISOString()`, pero ahí es
`lastmod` de un sitemap, que el estándar espera en UTC. Se queda como está.
