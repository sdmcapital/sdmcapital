// ─── Propiedad ───────────────────────────────────────────────────────────────
export type EstadoPropiedad = 'en_venta' | 'en_arriendo' | 'vendida' | 'reservada' | 'arrendada'
export type TipoPropiedad =
  | 'casa' | 'departamento' | 'oficina' | 'parcela'
  | 'comercial' | 'hotel' | 'terreno' | 'otro'
export type CategoriaPropiedad = 'usada' | 'proyecto_nuevo'
export type EtapaConstruccion = 'en_blanco' | 'en_verde' | 'planos' | 'inicio' | 'avanzado' | 'proxima_entrega' | 'entrega_inmediata'

export interface DossierItem {
  url: string
  titulo?: string
}

/**
 * Una unidad arrendable dentro de una propiedad — típicamente un piso de un
 * edificio de oficinas.
 *
 * `piso` es texto y no número porque el catálogo real trae etiquetas como
 * "701", "702" o "23 a 25".
 *
 * `m2` admite null: hay unidades cuya superficie todavía no está verificada.
 * La ficha las muestra como "Por confirmar" en lugar de omitirlas.
 */
export interface UnidadPropiedad {
  piso: string
  m2: number | null
  nota?: string
}

export interface Propiedad {
  id: string
  slug?: string
  titulo: string
  titulo_en?: string
  descripcion: string
  descripcion_en?: string
  tipo: TipoPropiedad
  estado: EstadoPropiedad
  categoria?: CategoriaPropiedad
  precio_uf?: number
  precio_clp?: number
  precio_usd?: number
  a_consultar: boolean
  dormitorios?: number
  banos?: number
  superficie_total?: number
  superficie_util?: number
  unidades?: UnidadPropiedad[]
  estacionamientos?: number
  region: string
  comuna: string
  direccion?: string
  pais: string
  ciudad?: string
  lat?: number
  lng?: number
  imagenes: string[]
  imagen_principal?: string
  destacada: boolean
  internacional: boolean
  amenidades?: string[]
  youtube_url?: string
  /** WhatsApp propio de la ficha, formato wa.me (595992955053). Vacío = el número global del sitio. */
  whatsapp_numero?: string | null
  dossier_url?: string
  dossiers?: DossierItem[]
  /** «Esta propiedad muestra el botón de reserva». Se llamó
   *  `mostrar_boton_flow` hasta el 2026-08-10; la columna vieja sigue en la
   *  base y se borra después de verificar el deploy. */
  mostrar_boton_reserva?: boolean
  precio_anterior_uf?: number
  baja_precio?: boolean
  ano_construccion?: number
  comision_porcentaje?: number
  bodegas?: number
  estado_conservacion?: string
  bono_pie?: boolean
  bono_pie_porcentaje?: number
  etapa_construccion?: EtapaConstruccion
  fecha_entrega?: string
  avance_obra?: number
  subsidios?: string[]
  activo?: boolean
  orden?: number
  map_address?: string
  map_lat?: number
  map_lng?: number
  created_at: string
  updated_at: string
}

// ─── Blog ────────────────────────────────────────────────────────────────────
export interface BlogPost {
  id: string
  titulo: string
  titulo_en?: string
  slug: string
  resumen: string
  resumen_en?: string
  extracto?: string
  extracto_en?: string
  contenido: string
  contenido_en?: string
  imagen_portada?: string
  autor?: string
  autor_id?: string
  autor_nombre: string
  categoria: string
  tags?: string[]
  publicado: boolean
  destacado: boolean
  created_at: string
  updated_at: string
}

// ─── Equipo ──────────────────────────────────────────────────────────────────
export interface MiembroEquipo {
  id: string
  nombre: string
  cargo: string
  cargo_en?: string
  bio: string
  bio_en?: string
  foto?: string
  email?: string
  telefono?: string
  whatsapp?: string
  linkedin?: string
  orden: number
  activo: boolean
}

// ─── Asociados ───────────────────────────────────────────────────────────────
export interface Asociado {
  id: string
  nombre: string
  logo: string
  url: string
  descripcion?: string
  descripcion_en?: string
  orden: number
  activo: boolean
}

// ─── Contacto ────────────────────────────────────────────────────────────────
export interface MensajeContacto {
  id?: string
  nombre: string
  email: string
  telefono?: string
  mensaje: string
  propiedad_interes?: string
  leido?: boolean
  created_at?: string
}

// ─── Servicios ───────────────────────────────────────────────────────────────
export interface Servicio {
  id: string
  slug: string
  titulo: string
  titulo_en?: string
  descripcion_corta: string
  descripcion_corta_en?: string
  descripcion_larga: string
  descripcion_larga_en?: string
  icono?: string
  imagen?: string
  orden: number
  activo: boolean
}

// ─── Filtros ─────────────────────────────────────────────────────────────────
export interface FiltrosPropiedades {
  tipo?: TipoPropiedad | ''
  estado?: EstadoPropiedad | ''
  region?: string
  comuna?: string
  dormitorios_min?: number
  precio_max_uf?: number
  internacional?: boolean
  busqueda?: string
  // `'si'` = con bono pie, cualquier porcentaje. Un número en texto —`'14'`— =
  // ese porcentaje o MÁS. Se guarda como texto y no como número porque los dos
  // casos viven en la misma clave de la URL, y `Number('si')` no existe.
  bono_pie?: string
  // `'inmediata'` | `'futura'`. No son los valores de `etapa_construccion`: la
  // columna tiene siete y esto los agrupa en dos.
  entrega?: string
}

// ─── Cotizaciones ─────────────────────────────────────────────────────────────
export type EstadoCotizacion = 'borrador' | 'enviada' | 'aceptada' | 'rechazada'
export type FormaPago        = 'contado' | 'credito' | 'leasing' | 'mixto'

export interface Cotizacion {
  id: string
  numero: number
  estado: EstadoCotizacion

  // Paso 1 – cliente
  cliente_nombre:    string
  cliente_rut?:      string
  cliente_email?:    string
  cliente_telefono?: string
  cliente_empresa?:  string

  // Paso 2 – propiedad (snapshot)
  propiedad_id?:          string
  prop_titulo:            string
  prop_tipo?:             string
  prop_direccion?:        string
  prop_comuna?:           string
  prop_region?:           string
  prop_dormitorios?:      number
  prop_banos?:            number
  prop_sup_total?:        number
  prop_sup_util?:         number
  prop_estacionamientos?: number
  prop_bodegas?:          number
  prop_amenidades?:       string[]
  prop_imagen_url?:       string
  prop_pais?:             string
  prop_ciudad?:           string

  // Paso 3 – precios
  valor_uf:          number
  precio_uf?:        number
  precio_clp?:       number
  precio_usd?:       number
  descuento_pct?:    number
  precio_final_uf?:  number
  precio_final_clp?: number

  // Paso 4 – forma de pago
  forma_pago?:   FormaPago
  pie_pct?:      number
  pie_uf?:       number
  credito_uf?:   number
  plazo_anos?:   number
  tasa_anual?:   number
  dividendo_uf?: number

  // Paso 5 – ejecutivo y observaciones
  ejecutivo_nombre?:   string
  ejecutivo_email?:    string
  ejecutivo_telefono?: string
  ejecutivo_cargo?:    string
  observaciones?:      string
  vigencia_dias?:      number

  created_at: string
  updated_at: string
}

export type CotizacionDraft = Omit<Cotizacion, 'id' | 'numero' | 'created_at' | 'updated_at'> & {
  id?: string
}

// ─── Lang ────────────────────────────────────────────────────────────────────
export type Lang = 'es' | 'en'
