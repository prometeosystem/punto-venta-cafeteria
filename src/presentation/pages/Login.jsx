import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../../application/services/authService'
import LogoZona2 from '../components/LogoZona2'
import { ArrowLeft, Coffee, Delete, Loader2, Lock } from 'lucide-react'

const LARGO_CODIGO = 6

// Toques sobre la taza que revelan al superadministrador
const TOQUES_PARA_REVELAR = 7

const COLOR_ROL = {
  superadministrador: 'bg-purple-100 text-purple-700',
  administrador: 'bg-blue-100 text-blue-700',
  vendedor: 'bg-matcha-100 text-matcha-700',
  cocina: 'bg-orange-100 text-orange-700',
  mesero: 'bg-amber-100 text-amber-700',
}

const ETIQUETA_ROL = {
  superadministrador: 'Superadmin',
  administrador: 'Administrador',
  vendedor: 'Vendedor',
  cocina: 'Cocina',
  mesero: 'Mesero',
}

const iniciales = (nombre = '') =>
  nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'U'

const Login = () => {
  const [usuarios, setUsuarios] = useState([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [segundosBloqueo, setSegundosBloqueo] = useState(0)
  const [mostrarOcultos, setMostrarOcultos] = useState(false)
  const toquesRef = useRef(0)

  const { loginConCodigo } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let vigente = true
    authService
      .usuariosParaLogin()
      .then((lista) => vigente && setUsuarios(Array.isArray(lista) ? lista : []))
      .catch(() => vigente && setError('No se pudo cargar la lista de usuarios'))
      .finally(() => vigente && setCargandoUsuarios(false))
    return () => {
      vigente = false
    }
  }, [])

  // Cuenta regresiva del bloqueo por intentos fallidos
  useEffect(() => {
    if (segundosBloqueo <= 0) return
    const id = setInterval(() => setSegundosBloqueo((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [segundosBloqueo])

  const visibles = useMemo(
    () => usuarios.filter((u) => !u.oculto || mostrarOcultos),
    [usuarios, mostrarOcultos]
  )

  const tocarTaza = () => {
    if (mostrarOcultos) return
    toquesRef.current += 1
    if (toquesRef.current >= TOQUES_PARA_REVELAR) {
      setMostrarOcultos(true)
      toquesRef.current = 0
    }
  }

  const volver = () => {
    setSeleccionado(null)
    setCodigo('')
    setError('')
    setSegundosBloqueo(0)
  }

  const entrar = useCallback(
    async (valor) => {
      setEntrando(true)
      setError('')
      try {
        await loginConCodigo(seleccionado.id_usuario, valor)
        // La raíz decide a dónde va cada rol; cocina y mesero no ven Dashboard
        navigate('/')
      } catch (err) {
        const detalle = err.response?.data?.detail
        setError(detalle?.mensaje || detalle || 'No se pudo iniciar sesión')
        if (detalle?.bloqueado_segundos) setSegundosBloqueo(detalle.bloqueado_segundos)
        setCodigo('')
      } finally {
        setEntrando(false)
      }
    },
    [loginConCodigo, navigate, seleccionado]
  )

  const teclear = (digito) => {
    if (entrando || segundosBloqueo > 0 || codigo.length >= LARGO_CODIGO) return
    const nuevo = codigo + digito
    setCodigo(nuevo)
    setError('')
    // Al completar los dígitos entra solo: en tablet evita un toque extra
    if (nuevo.length === LARGO_CODIGO) entrar(nuevo)
  }

  const borrar = () => {
    if (entrando) return
    setCodigo((c) => c.slice(0, -1))
    setError('')
  }

  // Permite teclear con teclado físico además del pad en pantalla
  useEffect(() => {
    if (!seleccionado) return
    const alTeclear = (e) => {
      if (e.key >= '0' && e.key <= '9') teclear(e.key)
      else if (e.key === 'Backspace') borrar()
      else if (e.key === 'Escape') volver()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })

  const bloqueado = segundosBloqueo > 0
  const minutos = Math.floor(segundosBloqueo / 60)
  const restoSegundos = String(segundosBloqueo % 60).padStart(2, '0')

  return (
    <div className="min-h-screen bg-gradient-to-br from-matcha-50 to-coffee-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={tocarTaza}
              className="p-3 rounded-full bg-matcha-100 focus:outline-none"
              aria-label="Zona 2"
            >
              <Coffee className="w-8 h-8 text-matcha-600" />
            </button>
            <LogoZona2 className="w-56 sm:w-72 text-gray-900" />
          </div>

          {!seleccionado ? (
            <div className="space-y-4">
              <p className="text-center text-gray-600">Selecciona tu usuario</p>

              {cargandoUsuarios ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
                </div>
              ) : visibles.length === 0 ? (
                <p className="text-center text-gray-500 py-10">
                  Todavía no hay usuarios con código asignado. Un administrador debe
                  configurarlos desde Empleados.
                </p>
              ) : (
                <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
                  {visibles.map((u) => (
                    <button
                      key={u.id_usuario}
                      type="button"
                      onClick={() => {
                        setSeleccionado(u)
                        setCodigo('')
                        setError('')
                      }}
                      className="min-h-[112px] p-4 rounded-xl border-2 border-gray-200 hover:border-matcha-400 hover:bg-matcha-50 transition-all flex flex-col items-center justify-center gap-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-matcha-500 text-white flex items-center justify-center font-semibold">
                        {iniciales(u.nombre_completo)}
                      </div>
                      <span className="text-sm font-medium text-gray-900 text-center leading-tight line-clamp-2">
                        {u.nombre_completo}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          COLOR_ROL[u.rol] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ETIQUETA_ROL[u.rol] || u.rol}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {error && !seleccionado && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
            </div>
          ) : (
            <div className="space-y-5 max-w-sm mx-auto">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={volver}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Elegir otro usuario"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {seleccionado.nombre_completo}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ETIQUETA_ROL[seleccionado.rol] || seleccionado.rol}
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-2.5">
                {Array.from({ length: LARGO_CODIGO }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full transition-colors ${
                      i < codigo.length ? 'bg-matcha-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm text-center">
                  {error}
                </div>
              )}

              {bloqueado && (
                <p className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Lock className="w-4 h-4" />
                  Espera {minutos}:{restoSegundos}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => teclear(String(n))}
                    disabled={entrando || bloqueado}
                    className="h-16 rounded-xl border-2 border-gray-200 text-2xl font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    {n}
                  </button>
                ))}
                <span />
                <button
                  type="button"
                  onClick={() => teclear('0')}
                  disabled={entrando || bloqueado}
                  className="h-16 rounded-xl border-2 border-gray-200 text-2xl font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={borrar}
                  disabled={entrando || bloqueado || codigo.length === 0}
                  className="h-16 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 transition-colors"
                  aria-label="Borrar"
                >
                  <Delete className="w-6 h-6" />
                </button>
              </div>

              {entrando && (
                <p className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
