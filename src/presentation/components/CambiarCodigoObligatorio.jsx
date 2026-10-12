import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { problemaCodigo, soloDigitos } from '../utils/codigoAcceso'

/**
 * Bloquea la pantalla mientras el usuario tenga el código por defecto: quien
 * lo conoce podría entrar con su cuenta, así que no se deja seguir sin cambiarlo.
 */
const CambiarCodigoObligatorio = () => {
  const { usuario, cambiarCodigo, logout } = useAuth()
  const navigate = useNavigate()
  const [nuevo, setNuevo] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!usuario?.debe_cambiar_codigo) return null

  const guardar = async (e) => {
    e.preventDefault()
    const problema = problemaCodigo(nuevo, { permitirDefault: false })
    if (problema) return setError(problema)
    if (nuevo !== confirmar) return setError('Los códigos no coinciden')

    setGuardando(true)
    setError('')
    try {
      await cambiarCodigo(null, nuevo)
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo guardar, intenta de nuevo')
    } finally {
      setGuardando(false)
    }
  }

  const salir = () => {
    logout()
    navigate('/login')
  }

  const inputClase =
    'input text-center text-2xl tracking-[0.5em] font-semibold placeholder:text-base placeholder:tracking-normal placeholder:font-normal'

  return (
    // Arriba: en tablet el teclado en pantalla tapa la mitad de abajo
    <div className="fixed inset-0 z-[10000] bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <form onSubmit={guardar} className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 mt-2 sm:mt-6">
        <div className="flex flex-col items-center text-center mb-1">
          <div className="w-12 h-12 rounded-full bg-matcha-100 flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6 text-matcha-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Elige tu código de acceso</h2>
         
        </div>

        <div className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            maxLength={6}
            value={nuevo}
            onChange={(e) => setNuevo(soloDigitos(e.target.value))}
            className={inputClase}
            placeholder="Nuevo"
            aria-label="Nuevo código"
          />
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={confirmar}
            onChange={(e) => setConfirmar(soloDigitos(e.target.value))}
            className={inputClase}
            placeholder="Repítelo"
            aria-label="Confirmar código"
          />
        </div>

        {error && <p className="text-sm text-red-600 mt-3 text-center">{error}</p>}

        <button type="submit" disabled={guardando} className="btn-primary w-full mt-5 py-3 disabled:opacity-60">
          {guardando ? 'Guardando…' : 'Guardar código'}
        </button>
        <button
          type="button"
          onClick={salir}
          className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}

export default CambiarCodigoObligatorio
