import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { imagenParaPDF } from '@/lib/imagenes'
import type { Cotizacion } from '@/types'
import { formatSuperficie, formatM2 } from '@/lib/formato'

// ─── Paleta ──────────────────────────────────────────────────────────────────
//
// LITERALES A PROPÓSITO: @react-pdf/renderer rasteriza fuera del DOM y no
// resuelve `var(--…)`, así que esta paleta no puede apuntar a las custom
// properties como sí hace `tailwind.config.js`.
//
// ES UNA COPIA MANUAL DE `globals.css`: SI ALLÁ CAMBIA UN TOKEN, HAY QUE
// CAMBIARLO ACÁ TAMBIÉN. No hay nada que lo garantice, y ya falló una vez —
// `muted` se corrigió en globals.css y esta copia se quedó con el valor viejo.
//
// Correspondencias, verificadas el 2026-08-09:
//   navy  → --navy-dark    navyMid  → --navy       green → --green
//   sky   → --sky          skyPale  → --sky-pale   ink   → --ink
//   muted → --muted        skyLight → --sky-light  red   → --error
// `white` es el único sin token equivalente.
const C = {
  navy:     '#0F2535',
  navyMid:  '#1C3D5C',
  green:    '#3DAA6E',
  sky:      '#A8C4DC',
  skyPale:  '#EDF4F9',
  skyLight: '#D4E6F1',
  // Espejo de `--muted`. Valía #7a8a96, que es el valor que la auditoría web
  // rechazó y aquí se quedó atrás: son 12 usos de texto secundario a 6,5–8 pt
  // —rótulos de campo, dirección, amenidades, nota del valor UF, vigencia— y a
  // ese tamaño ningún criterio de texto grande aplica. Daba 3,56:1 sobre blanco
  // y 3,20:1 sobre `skyPale`, en un documento impreso que se le manda a un
  // cliente. Con #5F7183 dan 5,03:1 y 4,53:1.
  // También es el fondo de la insignia «Borrador», con texto blanco encima: ahí
  // pasa de 3,56:1 a 5,03:1. Ningún uso de este color va sobre fondo oscuro, así
  // que oscurecerlo mejora los tres contextos y no empeora ninguno.
  muted:    '#5F7183',
  ink:      '#1a1a1a',
  white:    '#FFFFFF',
  red:      '#A8384B',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PAD = (n: number) => `COT-${String(n).padStart(4, '0')}`

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

const fmtN = (n: number, dec = 0) =>
  n.toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtUF = (n?: number) => (n != null ? `${fmtN(n, 2)} UF` : '—')
const fmtCLP = (n?: number) => (n != null ? `$ ${fmtN(Math.round(n))}` : '—')

const estadoColor: Record<string, string> = {
  borrador:  C.muted,
  enviada:   C.navyMid,
  aceptada:  C.green,
  rechazada: C.red,
}
const estadoLabel: Record<string, string> = {
  borrador: 'BORRADOR', enviada: 'ENVIADA', aceptada: 'ACEPTADA', rechazada: 'RECHAZADA',
}
const pagoLabel: Record<string, string> = {
  contado: 'Pago al Contado',
  credito: 'Crédito Hipotecario',
  leasing: 'Leasing Inmobiliario',
  mixto:   'Pago Mixto',
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: C.ink, backgroundColor: C.white },

  // Header
  header: {
    backgroundColor: C.navy, padding: '26 36 22 36',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  hStripes: { flexDirection: 'row', marginBottom: 9, gap: 4 },
  // El interletraje va contenido: con letterSpacing 3 el bloque no cabía en su
  // columna y "SDM CAPITAL" se partía a media palabra. `flexShrink: 0` +
  // `wrap={false}` en el Text evitan que vuelva a ocurrir si crece el bloque
  // derecho. Mismo criterio en el resto de los títulos en mayúsculas.
  hLeft:    { flexShrink: 0 },
  hTitle:   { fontFamily: 'Helvetica-Bold', fontSize: 19, color: C.white, letterSpacing: 1.4 },
  hSub:     { fontSize: 7.5, color: C.sky, letterSpacing: 1.4, marginTop: 3 },
  hRight:   { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  hNum:     { fontFamily: 'Helvetica-Bold', fontSize: 15, color: C.green },
  hDate:    { fontSize: 8, color: C.sky },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, marginTop: 5 },
  badgeTx:  { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.white, letterSpacing: 1 },

  // Body
  body: { paddingHorizontal: 36, paddingTop: 22, paddingBottom: 70, gap: 18 },

  // Section label + divider
  secLbl: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.green, letterSpacing: 1.4, marginBottom: 5 },
  secLine: { height: 1, backgroundColor: C.sky, opacity: 0.4, marginBottom: 10 },

  // Client grid
  clientRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  clientFld: { minWidth: 122 },
  lbl: { fontSize: 6.5, color: C.muted, letterSpacing: 0.9, marginBottom: 2 },
  val: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.navy },

  // Property
  propRow:  { flexDirection: 'row', gap: 16 },
  propLeft: { flex: 1 },
  propImg:  { width: 148, height: 104, objectFit: 'cover', borderRadius: 2 },
  propNoImg: { width: 148, height: 104, backgroundColor: C.skyPale, borderRadius: 2,
               alignItems: 'center', justifyContent: 'center' },
  propType:  { fontSize: 7, color: C.green, fontFamily: 'Helvetica-Bold', letterSpacing: 1.2, marginBottom: 4 },
  propName:  { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.navy, marginBottom: 4 },
  propAddr:  { fontSize: 8, color: C.muted, marginBottom: 10 },
  chars:     { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip:      { backgroundColor: C.skyPale, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 },
  chipTx:    { fontSize: 7.5, color: C.navy },
  amenLine:  { fontSize: 7, color: C.muted, marginTop: 7, lineHeight: 1.4 },

  // Prices
  ufNote:     { fontSize: 7.5, color: C.muted, marginBottom: 8 },
  priceGrid:  { flexDirection: 'row', gap: 3 },
  pcell:      { flex: 1, backgroundColor: C.skyPale, padding: 10, borderRadius: 2, gap: 3 },
  pcellHL:    { flex: 1, backgroundColor: C.navy,    padding: 10, borderRadius: 2, gap: 3 },
  pLbl:       { fontSize: 6.5, color: C.muted, letterSpacing: 0.9 },
  pLblHL:     { fontSize: 6.5, color: C.sky,   letterSpacing: 0.9 },
  pVal:       { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.navy },
  pValHL:     { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.white },
  pSub:       { fontSize: 7.5, color: C.muted },
  pSubHL:     { fontSize: 7.5, color: C.sky },

  // Payment
  payTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.navy, marginBottom: 8 },
  barBg:    { height: 8, backgroundColor: C.skyPale, borderRadius: 4, overflow: 'hidden',
               flexDirection: 'row', marginBottom: 8 },
  barPie:   { height: 8, backgroundColor: C.green },
  barCred:  { height: 8, backgroundColor: C.sky },
  payDets:  { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  payDet:   { gap: 2 },
  payVal:   { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.navy },
  payValG:  { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.green },

  // Observations
  obsBox:  { backgroundColor: C.skyPale, padding: 10, borderRadius: 2 },
  obsTx:   { fontSize: 9, color: C.ink, lineHeight: 1.5 },
  vigTx:   { fontSize: 7.5, color: C.muted, marginTop: 7 },

  // Disclaimer
  disc: {
    fontSize: 7, color: C.muted, lineHeight: 1.4,
    borderTopWidth: 1, borderTopColor: C.skyLight, paddingTop: 10,
  },

  // Footer
  footer: {
    backgroundColor: C.navy, padding: '14 36',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 58,
  },
  ftName:   { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.white, marginBottom: 2 },
  ftCargo:  { fontSize: 7.5, color: C.sky, marginBottom: 3 },
  ftCont:   { fontSize: 7.5, color: C.sky },
  ftBrand:  { alignItems: 'flex-end' },
  ftBrandBox: { alignItems: 'flex-end', flexShrink: 0 },
  ftTitle:  { fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.white, letterSpacing: 1.2 },
  ftWeb:    { fontSize: 7, color: C.sky, marginTop: 2 },
  ftSt:     { flexDirection: 'row', gap: 3, marginTop: 5 },
})

// ─── Componente PDF ───────────────────────────────────────────────────────────
export function CotizacionPDF({ c }: { c: Cotizacion }) {
  const piePct    = c.pie_pct ?? 0
  const creditPct = 100 - piePct

  const chars: string[] = [
    c.prop_dormitorios      ? `${c.prop_dormitorios} dormitorio${c.prop_dormitorios > 1 ? 's' : ''}` : '',
    c.prop_banos            ? `${c.prop_banos} baño${c.prop_banos > 1 ? 's' : ''}` : '',
    c.prop_sup_util         ? `${formatM2(c.prop_sup_util)} útiles` : c.prop_sup_total ? formatSuperficie(c.prop_sup_total).texto : '',
    c.prop_estacionamientos ? `${c.prop_estacionamientos} est.` : '',
    c.prop_bodegas          ? `${c.prop_bodegas} bodega${c.prop_bodegas > 1 ? 's' : ''}` : '',
  ].filter(Boolean)

  const imgSrc = imagenParaPDF(c.prop_imagen_url)

  // La fecha límite sale de created_at + vigencia_dias, nunca de la diferencia
  // contra "hoy": una cotización de hace un mes debe seguir diciendo los mismos
  // días que se pactaron, no los transcurridos.
  const vigFin = c.vigencia_dias
    ? new Date(new Date(c.created_at).getTime() + c.vigencia_dias * 86_400_000)
        .toLocaleDateString('es-CL')
    : null

  return (
    <Document title={`${PAD(c.numero)} – ${c.prop_titulo}`} author="SDM Capital">
      <Page size="A4" style={S.page}>

        {/* ── HEADER ── */}
        <View style={S.header}>
          <View style={S.hLeft}>
            <View style={S.hStripes}>
              <View style={{ width: 22, height: 4, backgroundColor: C.sky }} />
              <View style={{ width: 22, height: 4, backgroundColor: C.green }} />
              <View style={{ width: 22, height: 4, backgroundColor: C.navyMid }} />
            </View>
            <Text style={S.hTitle} wrap={false}>SDM CAPITAL</Text>
            <Text style={S.hSub} wrap={false}>COTIZACIÓN DE PROPIEDAD</Text>
          </View>
          <View style={S.hRight}>
            <Text style={S.hNum}>{PAD(c.numero)}</Text>
            <Text style={S.hDate}>{fmtDate(c.created_at)}</Text>
            <View style={[S.badge, { backgroundColor: estadoColor[c.estado] ?? C.muted }]}>
              <Text style={S.badgeTx}>{estadoLabel[c.estado] ?? c.estado.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ── BODY ── */}
        <View style={S.body}>

          {/* Datos cliente */}
          <View>
            <Text style={S.secLbl}>DATOS DEL CLIENTE</Text>
            <View style={S.secLine} />
            <View style={S.clientRow}>
              <View style={S.clientFld}>
                <Text style={S.lbl}>NOMBRE</Text>
                <Text style={S.val}>{c.cliente_nombre}</Text>
              </View>
              {c.cliente_rut && (
                <View style={S.clientFld}>
                  <Text style={S.lbl}>RUT</Text>
                  <Text style={S.val}>{c.cliente_rut}</Text>
                </View>
              )}
              {c.cliente_email && (
                <View style={S.clientFld}>
                  <Text style={S.lbl}>EMAIL</Text>
                  <Text style={S.val}>{c.cliente_email}</Text>
                </View>
              )}
              {c.cliente_telefono && (
                <View style={S.clientFld}>
                  <Text style={S.lbl}>TELÉFONO</Text>
                  <Text style={S.val}>{c.cliente_telefono}</Text>
                </View>
              )}
              {c.cliente_empresa && (
                <View style={S.clientFld}>
                  <Text style={S.lbl}>EMPRESA</Text>
                  <Text style={S.val}>{c.cliente_empresa}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Propiedad */}
          <View>
            <Text style={S.secLbl}>PROPIEDAD</Text>
            <View style={S.secLine} />
            <View style={S.propRow}>
              <View style={S.propLeft}>
                {c.prop_tipo && (
                  <Text style={S.propType}>{c.prop_tipo.toUpperCase()}</Text>
                )}
                <Text style={S.propName}>{c.prop_titulo}</Text>
                {(c.prop_direccion || c.prop_comuna || c.prop_region) && (
                  <Text style={S.propAddr}>
                    {[c.prop_direccion, c.prop_comuna, c.prop_region].filter(Boolean).join('  ·  ')}
                  </Text>
                )}
                {chars.length > 0 && (
                  <View style={S.chars}>
                    {chars.map((ch, i) => (
                      <View key={i} style={S.chip}>
                        <Text style={S.chipTx}>{ch}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Todas, sin recortar. Habia un .slice(0, 6) y esto es un
                    documento que se le manda a un cliente: descartar amenidades
                    en silencio le entrega una propiedad peor descrita de lo que
                    es. Medido renderizando el PDF: 60 amenidades siguen cabiendo
                    en una pagina, y recien a las 200 pasa a dos -- fluyendo, sin
                    cortar nada. No habia razon de espacio. */}
                {c.prop_amenidades?.length ? (
                  <Text style={S.amenLine}>
                    {c.prop_amenidades.join('  ·  ')}
                  </Text>
                ) : null}
              </View>
              {imgSrc ? (
                <Image src={imgSrc} style={S.propImg} />
              ) : (
                <View style={S.propNoImg}>
                  <Text style={{ fontSize: 7, color: C.muted }}>Sin imagen</Text>
                </View>
              )}
            </View>
          </View>

          {/* Precios */}
          <View>
            <Text style={S.secLbl}>PRECIOS</Text>
            <View style={S.secLine} />
            <Text style={S.ufNote}>
              Valor UF al {fmtDate(c.created_at)}: $ {fmtN(c.valor_uf, 2)}
            </Text>
            <View style={S.priceGrid}>
              <View style={S.pcell}>
                <Text style={S.pLbl}>PRECIO PUBLICADO</Text>
                <Text style={S.pVal}>{fmtUF(c.precio_uf)}</Text>
                {c.precio_clp ? <Text style={S.pSub}>{fmtCLP(c.precio_clp)}</Text> : null}
              </View>
              <View style={S.pcell}>
                <Text style={S.pLbl}>DESCUENTO</Text>
                <Text style={S.pVal}>{c.descuento_pct ? `${c.descuento_pct} %` : '—'}</Text>
              </View>
              <View style={S.pcellHL}>
                <Text style={S.pLblHL}>PRECIO FINAL UF</Text>
                <Text style={S.pValHL}>{fmtUF(c.precio_final_uf)}</Text>
              </View>
              <View style={S.pcellHL}>
                <Text style={S.pLblHL}>PRECIO FINAL CLP</Text>
                <Text style={S.pValHL}>{fmtCLP(c.precio_final_clp)}</Text>
                {c.precio_usd ? <Text style={S.pSubHL}>USD {fmtN(c.precio_usd)}</Text> : null}
              </View>
            </View>
          </View>

          {/* Forma de pago */}
          {c.forma_pago && (
            <View>
              <Text style={S.secLbl}>FORMA DE PAGO</Text>
              <View style={S.secLine} />
              <Text style={S.payTitle}>{pagoLabel[c.forma_pago] ?? c.forma_pago}</Text>
              {c.forma_pago !== 'contado' && piePct > 0 && (
                <>
                  <View style={S.barBg}>
                    <View style={[S.barPie,  { width: `${piePct}%` }]} />
                    <View style={[S.barCred, { width: `${creditPct}%` }]} />
                  </View>
                  <View style={S.payDets}>
                    {c.pie_uf ? (
                      <View style={S.payDet}>
                        <Text style={S.lbl}>PIE ({piePct}%)</Text>
                        <Text style={S.payValG}>{fmtUF(c.pie_uf)}</Text>
                      </View>
                    ) : null}
                    {c.credito_uf ? (
                      <View style={S.payDet}>
                        <Text style={S.lbl}>CRÉDITO ({creditPct}%)</Text>
                        <Text style={S.payVal}>{fmtUF(c.credito_uf)}</Text>
                      </View>
                    ) : null}
                    {c.plazo_anos ? (
                      <View style={S.payDet}>
                        <Text style={S.lbl}>PLAZO</Text>
                        <Text style={S.payVal}>{c.plazo_anos} años</Text>
                      </View>
                    ) : null}
                    {c.tasa_anual ? (
                      <View style={S.payDet}>
                        <Text style={S.lbl}>TASA ANUAL</Text>
                        <Text style={S.payVal}>{c.tasa_anual} %</Text>
                      </View>
                    ) : null}
                    {c.dividendo_uf ? (
                      <View style={S.payDet}>
                        <Text style={S.lbl}>DIVIDENDO ESTIMADO</Text>
                        <Text style={S.payVal}>{fmtUF(c.dividendo_uf)} / mes</Text>
                      </View>
                    ) : null}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Observaciones */}
          {(c.observaciones || vigFin) && (
            <View>
              <Text style={S.secLbl}>OBSERVACIONES</Text>
              <View style={S.secLine} />
              {c.observaciones && (
                <View style={S.obsBox}>
                  <Text style={S.obsTx}>{c.observaciones}</Text>
                </View>
              )}
              {vigFin && (
                <Text style={S.vigTx}>
                  Vigencia de esta cotización: {c.vigencia_dias} días · válida hasta el {vigFin}
                </Text>
              )}
            </View>
          )}

          {/* Disclaimer */}
          <Text style={S.disc}>
            Esta cotización tiene carácter informativo y no constituye una oferta formal de compraventa. Los valores
            en UF están sujetos a la variación diaria de la Unidad de Fomento. SDM Capital se reserva el derecho de
            modificar las condiciones aquí expuestas sin previo aviso.
          </Text>
        </View>

        {/* ── FOOTER ── */}
        <View style={S.footer}>
          <View>
            <Text style={S.ftName}>{c.ejecutivo_nombre ?? 'SDM Capital'}</Text>
            {c.ejecutivo_cargo && <Text style={S.ftCargo}>{c.ejecutivo_cargo}</Text>}
            <Text style={S.ftCont}>
              {[c.ejecutivo_email, c.ejecutivo_telefono].filter(Boolean).join('  ·  ')}
            </Text>
          </View>
          <View style={S.ftBrandBox}>
            <Text style={S.ftTitle} wrap={false}>SDM CAPITAL</Text>
            <Text style={S.ftWeb}>www.sdmcapital.cl</Text>
            <View style={S.ftSt}>
              <View style={{ width: 14, height: 3, backgroundColor: C.sky }} />
              <View style={{ width: 14, height: 3, backgroundColor: C.green }} />
              <View style={{ width: 14, height: 3, backgroundColor: C.navyMid }} />
            </View>
          </View>
        </View>

      </Page>
    </Document>
  )
}
