import { X } from 'lucide-react'
import { METRICAS_DASHBOARD, METRICAS_REPORTES } from '../utils/preferenciasUi'

const grupoTitulo = {
  basicas: 'Básicas',
  restaurante: 'Restaurante',
  metodos: 'Métodos de pago',
  nuevas: 'Sugeridas',
  graficos: 'Gráficos',
}

const OVERLAY = 'fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-10 sm:pt-16'

/**
 * Modal arriba (teclado tablet) para activar/desactivar cards de métricas.
 */
const ModalEditarMetricas = ({ seccion, valores, modoTienda, onToggle, onClose, guardando }) => {
  const catalogo = seccion === 'reportes' ? METRICAS_REPORTES : METRICAS_DASHBOARD
  const grupos = [...new Set(catalogo.map((m) => m.grupo))]

  return (
    <div className={OVERLAY} onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Editar métricas</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Cerrar">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {grupoTitulo[grupo] || grupo}
              </p>
              {catalogo.filter((m) => m.grupo === grupo).map((m) => {
                const deshabilitada = modoTienda && (m.id === 'propinas' || m.id === 'ordenes_activas')
                return (
                  <label
                    key={m.id}
                    className={`flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg ${
                      deshabilitada ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-900">{m.label}</span>
                    <input
                      type="checkbox"
                      checked={!!valores?.[m.id] && !deshabilitada}
                      disabled={deshabilitada || guardando}
                      onChange={() => onToggle(m.id)}
                      className="w-4 h-4 shrink-0"
                    />
                  </label>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ModalEditarMetricas
