// Los cuatro productos del modal de solicitud de crédito.
//
// ESTOS CUATRO VALORES SON LOS DEL CHECK `producto_valido` de la migración
// `20260909205233_solicitudes_credito_productos.sql`. Si acá aparece un quinto
// sin tocar la base, el INSERT vuelve con un 23514 y la solicitud se pierde:
// son la misma lista escrita en dos sitios y se mueven juntas.
//
// El rótulo es lo que se lee en el selector del panel, no el nombre interno.
// «Consumo y deudas» y no «consumo y consolidación»: en el chip de 13px la
// segunda parte el grupo en tres filas y la palabra que el visitante busca es
// «deudas».

export type ProductoCredito = 'hipotecario' | 'consumo' | 'bancarizacion' | 'leaseback'

export const PRODUCTOS: { value: ProductoCredito; label: string }[] = [
  { value: 'hipotecario',   label: 'Hipotecario' },
  { value: 'consumo',       label: 'Consumo y deudas' },
  { value: 'bancarizacion', label: 'Bancarización' },
  { value: 'leaseback',     label: 'Leaseback' },
]
