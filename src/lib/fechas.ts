// Fechas en horario de Chile.
//
// ZONA COMPARTIDA (`src/lib/`). Archivo nuevo, no modifica ninguno existente.
//
// EL BUG QUE JUSTIFICA QUE ESTO NO SE ESCRIBA A MANO EN CADA PANEL:
// `new Date().toISOString()` devuelve UTC. Chile va en UTC-4 (UTC-3 en verano),
// así que a partir de las 20:00 de cada noche cualquier fecha derivada de ahí ya
// es la de mañana. Le pasó a la barra de indicadores —de ahí nació
// `hoyEnChile()` en `src/lib/indicadores.ts`— y volvió a aparecer en las
// ventanas de métricas de Captación.
//
// LO QUE **NO** ES UN BUG, y conviene decirlo porque se confunde: guardar
// `new Date().toISOString()` en una columna `timestamptz` es CORRECTO. Esa
// columna guarda un INSTANTE, no un día de calendario, y el instante es el mismo
// se escriba en UTC o en la hora de Chile. El peligro es el contrario: derivar
// de un instante la FECHA en Chile, o truncar con `.slice(0, 10)`.
//
// Por eso acá solo hay formateadores de PRESENTACIÓN: convierten un instante ya
// guardado a lo que se lee en pantalla, que sí tiene que ir en hora de Chile.

const ZONA = 'America/Santiago'

/**
 * Día y hora, en horario de Chile. `10-09-2026, 14:32`.
 *
 * `es-CL` con `timeZone` explícito, y no las partes armadas a mano: el locale ya
 * sabe que en Chile el día va antes que el mes.
 *
 * `hour12: false` explícito porque `es-CL` no es estable en eso entre motores:
 * Node y algunos Safari devuelven «2:32 p. m.» donde Chrome da «14:32», y una
 * lista de solicitudes ordenada por hora no puede cambiar de formato según el
 * navegador de quien la abre.
 */
export function fechaHoraChile(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CL', {
    timeZone: ZONA,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}
