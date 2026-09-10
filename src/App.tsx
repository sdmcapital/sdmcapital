import { lazy, Suspense } from 'react'
import SEO from '@/components/SEO'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { LangProvider } from '@/hooks/useLang'
import Layout from '@/components/layout/Layout'
import ScrollToTop from '@/components/layout/ScrollToTop'
import HomePage from '@/pages/HomePage'
import QuienesSomosPage from '@/pages/QuienesSomosPage'
import ServiciosPage from '@/pages/ServiciosPage'
import PropiedadesPage from '@/pages/PropiedadesPage'
import PropiedadDetailPage from '@/pages/PropiedadDetailPage'
import AsociadosPage from '@/pages/AsociadosPage'
import BlogPage from '@/pages/BlogPage'
import BlogPostPage from '@/pages/BlogPostPage'
import RentalPage from '@/pages/RentalPage'
import VendeConNosotrosPage from '@/pages/VendeConNosotrosPage'
import PoliticaPrivacidadPage from '@/pages/PoliticaPrivacidadPage'
import CondicionesServicioPage from '@/pages/CondicionesServicioPage'
import EliminacionDatosPage from '@/pages/EliminacionDatosPage'
import EvaluacionGratuitaPage from '@/pages/EvaluacionGratuitaPage'

// ─── Cargadas bajo demanda ────────────────────────────────────────────────────
// El admin arrastra el editor TipTap, el generador de PDF y html2canvas: en
// total la mayor parte del bundle. Ningún visitante del sitio público entra
// ahí, así que no tiene por qué descargarlo. El showcase es igual de pesado y
// solo lo abre quien llega por su enlace.
const AdminPage           = lazy(() => import('@/pages/AdminPage'))
const FichaClientesLista  = lazy(() => import('@/pages/admin/FichaClientesLista'))
const FichaClienteDetalle = lazy(() => import('@/pages/admin/FichaClienteDetalle'))
const FichaClienteNueva   = lazy(() => import('@/pages/admin/FichaClienteNueva'))
const FichaClienteVer     = lazy(() => import('@/pages/admin/FichaClienteVer'))
const FichaClienteEditar  = lazy(() => import('@/pages/admin/FichaClienteEditar'))
const Agentes             = lazy(() => import('@/pages/admin/Agentes'))
const Captacion           = lazy(() => import('@/pages/admin/Captacion'))
const Solicitudes         = lazy(() => import('@/pages/admin/Solicitudes'))
const ElBarrancoShowcase  = lazy(() => import('@/pages/ElBarrancoShowcase'))
const ReservaConfirmacionPage = lazy(() => import('@/pages/ReservaConfirmacionPage'))

// Se ve solo el instante que tarda en llegar el chunk. Sin texto: un mensaje
// de "cargando" que parpadea 200 ms molesta más de lo que informa.
function Cargando() {
  return <div style={{ minHeight: '100vh', background: '#fff' }} />
}

// El admin baja chunks bastante más grandes que el sitio público, y ahí una
// pantalla en blanco de varios segundos se lee como una página rota. El retardo
// de 300 ms lo pone la animación en CSS (.admin-loading), no un timer en JS.
function CargandoAdmin() {
  return (
    <div
      className="admin-loading flex flex-col items-center justify-center gap-4"
      style={{ minHeight: '100vh', background: 'var(--off)' }}
    >
      <div className="logo-stripes">
        <div className="logo-stripe logo-stripe--sky" />
        <div className="logo-stripe logo-stripe--green" />
        <div className="logo-stripe logo-stripe--navy" />
      </div>
      <span className="text-sdm-sm" style={{ color: 'var(--muted)' }}>Cargando panel…</span>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-8 text-center">
      {/* Sin descripcion propia: hereda la generica del sitio. */}
      <SEO title="Página no encontrada" />
      <div className="font-serif text-sdm-display-xl" style={{ fontWeight: 300, color: 'var(--border)' }}>404</div>
      <h1 className="font-serif font-light text-sdm-display-md" style={{ color: 'var(--navy-dark)' }}>
        Página no <em>encontrada</em>
      </h1>
      <p className="text-sdm-lg" style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
        La página que buscas no existe o fue movida.
      </p>
      <a href="/" className="btn-primary">← Volver al inicio</a>
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<Cargando />}>
        <Routes>
          {/* Admin — sin layout público. Suspense propio: estas rutas bajan
              chunks grandes y merecen un fallback visible, no el div en blanco. */}
          <Route element={<Suspense fallback={<CargandoAdmin />}><Outlet /></Suspense>}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/ficha-cliente" element={<FichaClientesLista />} />
            <Route path="/admin/ficha-cliente/:clienteId" element={<FichaClienteDetalle />} />
            <Route path="/admin/ficha-cliente/:clienteId/nueva" element={<FichaClienteNueva />} />
            <Route path="/admin/ficha-cliente/:clienteId/ficha/:fichaId" element={<FichaClienteVer />} />
            <Route path="/admin/ficha-cliente/:clienteId/ficha/:fichaId/editar" element={<FichaClienteEditar />} />
            <Route path="/admin/agentes" element={<Agentes />} />
            <Route path="/admin/captacion" element={<Captacion />} />
            <Route path="/admin/solicitudes" element={<Solicitudes />} />
          </Route>

          {/* Showcase El Barranco — experiencia inmersiva, sin header/footer */}
          <Route path="/propiedades/:id/showcase" element={<ElBarrancoShowcase />} />

          {/* Confirmación de reserva (retorno de Transbank) — sin header/footer */}
          <Route path="/reserva/confirmacion" element={<ReservaConfirmacionPage />} />

          {/* Landing campaña Meta Ads — sin header/footer del sitio */}
          <Route path="/evaluacion-gratuita" element={<EvaluacionGratuitaPage />} />

          {/* Sitio público — con Header + Footer */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/quienes-somos" element={<QuienesSomosPage />} />
            <Route path="/servicios" element={<ServiciosPage />} />
            <Route path="/servicios/:slug" element={<ServiciosPage />} />
            <Route path="/propiedades" element={<PropiedadesPage />} />
            <Route path="/propiedades-usadas" element={<PropiedadesPage />} />
            <Route path="/proyectos-nuevos" element={<PropiedadesPage />} />
            <Route path="/propiedades/:slug" element={<PropiedadDetailPage />} />
            <Route path="/asociados" element={<AsociadosPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/rental" element={<RentalPage />} />
            <Route path="/vende-con-nosotros" element={<VendeConNosotrosPage />} />
            <Route path="/politica-de-privacidad" element={<PoliticaPrivacidadPage />} />
            <Route path="/condiciones-del-servicio" element={<CondicionesServicioPage />} />
            <Route path="/eliminacion-de-datos" element={<EliminacionDatosPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </LangProvider>
  )
}
