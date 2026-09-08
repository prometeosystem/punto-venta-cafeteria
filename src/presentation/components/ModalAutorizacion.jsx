import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, ShieldCheck, X } from 'lucide-react'
import { configuracionService } from '../../application/services/configuracionService'

/**
 * Modal de confirmación que opcionalmente exige autorización.
 *
 * Admin y superadmin solo confirman; el resto necesita que un administrador
 * escriba su código de acceso, el mismo con el que inicia sesión. Se alinea
 * arriba porque en tablet el teclado taparía un modal centrado.
 */
const ModalAutorizacion = ({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  requiereCodigo = false,
  peligro = false,
  procesando = false,
  onConfirmar,
  onCancelar,
}) => {
  const [valor, setValor] = useState('')
  const [error, setError] = useState('')
  const [verificando, setVerificando] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (abierto) {
      setValor('')
      setError('')
      if (requiereCodigo) {
        // El foco automático abre el teclado de la tablet sin un toque extra.
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
  }, [abierto, requiereCodigo])

  if (!abierto) return null

  const ocupado = procesando || verificando

  const confirmar = async () => {
    if (!requiereCodigo) {
      onConfirmar(null)
      return
    }
    if (!valor.trim()) {
      setError('Pide a un administrador que escriba su código')
      return
    }
    setVerificando(true)
    setError('')
    try {
      await configuracionService.verificarAutorizacion(valor.trim())
      onConfirmar(valor.trim())
    } catch (e) {
      const detalle = e?.response?.data?.detail
      setError(typeof detalle === 'string' ? detalle : 'Código incorrecto')
    } finally {
      setVerificando(false)
    }
  }

  const colorAccion = peligro
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-emerald-600 hover:bg-emerald-700'

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-start justify-center p-4 overflow-y-auto"
      onClick={ocupado ? undefined : onCancelar}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {peligro ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            )}
            <h2 className="text-xl font-bold text-gray-900">{titulo}</h2>
          </div>
          <button
            onClick={onCancelar}
            disabled={ocupado}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {mensaje && <p className="text-gray-700">{mensaje}</p>}

          {requiereCodigo && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de autorización
              </label>
              <input
                ref={inputRef}
                type="password"
                inputMode="text"
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && confirmar()}
                placeholder="Código de administrador"
                className="input-field w-full text-lg"
                disabled={ocupado}
              />
              <p className="text-xs text-gray-500 mt-1">
                Es el mismo código con el que un administrador inicia sesión.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onCancelar}
            disabled={ocupado}
            className="flex-1 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={ocupado}
            className={`flex-1 py-3 rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${colorAccion}`}
          >
            {ocupado && <Loader2 className="w-4 h-4 animate-spin" />}
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalAutorizacion
