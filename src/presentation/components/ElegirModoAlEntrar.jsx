import { useState } from 'react'
import { Store, UtensilsCrossed, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePreferencias } from '../context/PreferenciasContext'
import { MODO_RESTAURANTE, MODO_TIENDA } from '../utils/preferenciasUi'

const CLAVE = 'pos_preguntar_modo'

const ElegirModoAlEntrar = () => {
  const { usuario } = useAuth()
  const { guardar } = usePreferencias()
  const [abierto, setAbierto] = useState(() => sessionStorage.getItem(CLAVE) === '1')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  if (!usuario || usuario.debe_cambiar_codigo || !abierto) return null

  const elegir = async (modo) => {
    setGuardando(true)
    setError('')
    try {
      await guardar({ modo })
      sessionStorage.removeItem(CLAVE)
      setAbierto(false)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'No se pudo guardar el modo')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">¿Qué quieres ver?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Elige el tipo de negocio para esta sesión. Más tarde puedes cambiarlo en Configuración.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={guardando}
            onClick={() => elegir(MODO_RESTAURANTE)}
            className="flex items-start gap-3 rounded-xl border-2 border-gray-200 p-4 text-left transition-colors hover:border-marca-400 disabled:opacity-50"
          >
            <UtensilsCrossed className="mt-0.5 h-5 w-5 shrink-0 text-marca-600" />
            <span>
              <span className="block font-semibold text-gray-900">Restaurante / cafetería</span>
              <span className="mt-1 block text-sm text-gray-500">Mesas, comandas y propinas.</span>
            </span>
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={() => elegir(MODO_TIENDA)}
            className="flex items-start gap-3 rounded-xl border-2 border-gray-200 p-4 text-left transition-colors hover:border-marca-400 disabled:opacity-50"
          >
            <Store className="mt-0.5 h-5 w-5 shrink-0 text-marca-600" />
            <span>
              <span className="block font-semibold text-gray-900">Tienda / abarrotes</span>
              <span className="mt-1 block text-sm text-gray-500">Cobro directo, sin cocina ni mesas.</span>
            </span>
          </button>
        </div>
        {guardando && (
          <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando...
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}

export default ElegirModoAlEntrar
