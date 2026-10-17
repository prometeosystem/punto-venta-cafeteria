import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { configuracionService } from '../../application/services/configuracionService'
import { authService } from '../../application/services/authService'
import marca from '@marca'
import logoProthec from '../../assets/logo-prothec.png'
import { ArrowLeft, Delete, Loader2, Lock } from 'lucide-react'

const LARGO_CODIGO = 6

// Toques sobre la taza que revelan al superadministrador
const TOQUES_PARA_REVELAR = 7

// Un tono más fuerte que en Empleados: aquí van sobre la tarjeta de color de la marca
const COLOR_ROL = {
  superadministrador: 'bg-purple-600 text-white',
  administrador: 'bg-purple-200 text-purple-800',
  vendedor: 'bg-marca-200 text-marca-800',
  cocina: 'bg-amber-200 text-amber-800',
  mesero: 'bg-rose-200 text-rose-800',
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

const ACENTO = 'rgb(var(--acento))'
const OSCURO = 'rgb(var(--oscuro-800))'
const display = { fontFamily: '"Bebas Neue", sans-serif' }

const Cintilla = ({ frases, contorno = false, lenta = false }) => {
  const pistaRef = useRef(null)
  const secuencia = Array.from({ length: 4 }, () => frases).flat()

  useLayoutEffect(() => {
    const pista = pistaRef.current
    if (!pista) return
    const ajustar = () => {
      const mitad = pista.scrollWidth / 2
      if (mitad > 0) pista.style.setProperty('--marquee-dist', String(Math.round(mitad)))
    }
    ajustar()
    document.fonts?.ready?.then(ajustar)
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [frases])
  const texto = contorno
    ? {
        color: 'transparent',
        WebkitTextStroke: `0.6px ${ACENTO}`,
      }
    : { color: OSCURO }

  return (
    <div className={`overflow-hidden py-1.5 ${contorno ? 'bg-oscuro-800/55' : 'bg-acento/80'}`}>
      <div ref={pistaRef} className={`login-marquee ${lenta ? 'login-marquee-lenta' : ''}`}>
        {[0, 1].map((copia) => (
          <div key={copia} className="flex shrink-0 items-center">
            {secuencia.map((frase, i) => (
              <span
                key={`${copia}-${i}`}
                className="inline-flex shrink-0 items-center gap-3 whitespace-nowrap px-3 text-sm leading-none tracking-[0.14em] sm:text-base"
                style={{ ...display, ...texto }}
              >
                {frase}
                <span className="text-[0.55em] opacity-60" style={contorno ? { color: ACENTO, WebkitTextStroke: 0 } : undefined}>
                  ●
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const Login = () => {
  const [usuarios, setUsuarios] = useState([])
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [segundosBloqueo, setSegundosBloqueo] = useState(0)
  const [mostrarOcultos, setMostrarOcultos] = useState(false)
  const elegirFrase = (lista) => lista[Math.floor(Math.random() * lista.length)]
  const [mensaje, setMensaje] = useState(() => elegirFrase(marca.mensajesLogin))
  const [cintillas, setCintillas] = useState({
    principal: marca.cintillaPrincipal,
    contorno: marca.cintillaContorno,
  })
  const toquesRef = useRef(0)

  const { loginConCodigo } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let vigente = true
    configuracionService
      .obtenerModoNegocio()
      .then((modo) => {
        if (!vigente || modo !== 'tienda') return
        if (marca.mensajesLoginTienda?.length) setMensaje(elegirFrase(marca.mensajesLoginTienda))
        if (marca.cintillaPrincipalTienda?.length) {
          setCintillas({
            principal: marca.cintillaPrincipalTienda,
            contorno: marca.cintillaContornoTienda?.length
              ? marca.cintillaContornoTienda
              : marca.cintillaContorno,
          })
        }
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [])

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
    if (nuevo.length === LARGO_CODIGO) entrar(nuevo)
  }

  const borrar = () => {
    if (entrando) return
    setCodigo((c) => c.slice(0, -1))
    setError('')
  }

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
    <div className="relative min-h-screen overflow-hidden bg-oscuro-800">
      <div className="pointer-events-none absolute inset-x-0 top-6 z-20 opacity-90 sm:top-8">
        <Cintilla frases={cintillas.principal} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 opacity-80 sm:bottom-8">
        <Cintilla frases={cintillas.contorno} contorno lenta />
      </div>

      <div className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-[420px] flex-col overflow-hidden lg:min-h-screen">
        {marca.heroImagen ? (
          <>
            <img
              src={marca.heroImagen}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[center_60%]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-oscuro-800/55 via-oscuro-800/35 to-oscuro-800/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-marca-600 via-oscuro-800 to-oscuro-900" />
        )}

        <div className="relative z-10 flex flex-1 flex-col items-center justify-start px-8 pb-6 pt-24 text-center lg:justify-center lg:pb-0 lg:pt-0 lg:-translate-y-10">
          <div onClick={tocarTaza} className="cursor-default">
            <marca.Logo className="w-56 text-white sm:w-72" />
          </div>
          <p className="mt-8 font-script text-3xl text-acento-claro sm:text-4xl">{mensaje.saludo}</p>
          <h1 className="mt-2 max-w-md text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl">
            {mensaje.linea}
            <span className="mt-1 block text-acento">{mensaje.acento}</span>
          </h1>
        </div>
      </section>

      <section className="relative flex flex-col overflow-hidden bg-oscuro-800 text-white lg:min-h-screen" style={{ fontFamily: 'Outfit, Inter, sans-serif' }}>
        <div className="relative z-10 flex flex-1 items-start justify-center px-5 pb-4 pt-8 sm:px-10 lg:items-center lg:py-20">
        <div className="w-full max-w-lg">
          {!seleccionado ? (
            <div className="space-y-6">
              <div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Inicia sesión
                </h2>
                <p className="mt-2 text-sm text-white/80">
                  Elige tu usuario e ingresa tu código.
                </p>
                {marca.avisoLogin && (
                  <p className="mt-3 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90">
                    {marca.avisoLogin}
                  </p>
                )}
              </div>

              {cargandoUsuarios ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-marca-500" />
                </div>
              ) : visibles.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/30 bg-marca-100 px-5 py-10 text-center text-sm text-marca-700">
                  Todavía no hay usuarios con código asignado. Un administrador debe
                  configurarlos desde Empleados.
                </p>
              ) : (
                // Con muchos usuarios el scroll queda en la lista, no en la página
                <div className="login-usuarios -m-1 flex max-h-[calc(100dvh-28rem)] min-h-[9rem] flex-col gap-3 overflow-y-auto overscroll-contain p-1 pr-2 lg:max-h-[calc(100dvh-19rem)]">
                  {visibles.map((u) => (
                    <button
                      key={u.id_usuario}
                      type="button"
                      onClick={() => {
                        setSeleccionado(u)
                        setCodigo('')
                        setError('')
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-marca-200 bg-marca-100 px-4 py-3 text-left shadow-sm transition-all hover:border-acento"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-marca-600 text-sm font-semibold text-white">
                        {iniciales(u.nombre_completo)}
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-medium leading-tight text-oscuro-800">
                          {u.nombre_completo}
                        </span>
                        <span
                          className={`mt-1 inline-flex text-[11px] px-2 py-0.5 rounded-full ${
                            COLOR_ROL[u.rol] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ETIQUETA_ROL[u.rol] || u.rol}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {error && !seleccionado && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={volver}
                  className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Otro usuario
                </button>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white break-words">
                  Hola, {seleccionado.nombre_completo}
                </h2>
              </div>

              <div className="flex justify-center gap-3">
                {Array.from({ length: LARGO_CODIGO }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-3.5 w-3.5 rounded-full transition-all ${
                      i < codigo.length ? 'scale-110 bg-white' : 'bg-white/35'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-700">
                  {error}
                </div>
              )}

              {bloqueado && (
                <p className="flex items-center justify-center gap-2 text-sm text-white/80">
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
                    className="h-16 rounded-2xl border border-marca-200 bg-marca-100 text-2xl font-medium text-oscuro-800 shadow-sm transition-colors hover:border-acento hover:bg-marca-200 disabled:opacity-40"
                  >
                    {n}
                  </button>
                ))}
                <span />
                <button
                  type="button"
                  onClick={() => teclear('0')}
                  disabled={entrando || bloqueado}
                  className="h-16 rounded-2xl border border-marca-200 bg-marca-100 text-2xl font-medium text-oscuro-800 shadow-sm transition-colors hover:border-acento hover:bg-marca-200 disabled:opacity-40"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={borrar}
                  disabled={entrando || bloqueado || codigo.length === 0}
                  className="flex h-16 items-center justify-center rounded-2xl border border-marca-200 bg-marca-100 text-marca-600 shadow-sm transition-colors hover:border-acento hover:bg-marca-200 disabled:opacity-40"
                  aria-label="Borrar"
                >
                  <Delete className="w-6 h-6" />
                </button>
              </div>

              {entrando && (
                <p className="flex items-center justify-center gap-2 text-sm text-white/80">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </p>
              )}
            </div>
          )}
        </div>
        </div>

        <div className="pointer-events-none z-30 mt-6 flex items-center gap-2 px-5 pb-16 text-white/55 lg:absolute lg:bottom-20 lg:left-5 lg:right-8 lg:mt-0 lg:px-0 lg:pb-0">
          <img src={logoProthec} alt="" className="h-6 w-auto" />

          <a
            href="https://prothec.com.mx/"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto"
          >
            <span className="text-xs tracking-wide">
              Desarrollado por Prothec v6.3.5
            </span>
          </a>
        </div>
      </section>
      </div>
    </div>
  )
}

export default Login
