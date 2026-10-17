import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import Swal from 'sweetalert2'
import { useAuth } from '../context/AuthContext'
import { authService } from '../../application/services/authService'
import { problemaCodigo, soloDigitos } from '../utils/codigoAcceso'

const NOMBRE_ROL = {
  vendedor: 'Vendedor',
  cocina: 'Cocina',
  mesero: 'Mesero',
  administrador: 'Administrador',
  superadministrador: 'Super administrador',
}

const DATOS_VACIOS = { nombre: '', apellido_paterno: '', apellido_materno: '', correo: '', celular: '' }

const aviso = (icon, title, text) =>
  Swal.fire({ icon, title, text, confirmButtonColor: 'rgb(var(--marca-500))', timer: icon === 'success' ? 1500 : undefined, showConfirmButton: icon !== 'success' })

const MiPerfil = () => {
  const { usuario, actualizarPerfil, cambiarCodigo, logout } = useAuth()
  const navigate = useNavigate()
  const [datos, setDatos] = useState(DATOS_VACIOS)
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [codigo, setCodigo] = useState({ actual: '', nuevo: '', confirmar: '' })
  const [guardandoCodigo, setGuardandoCodigo] = useState(false)

  // La sesión guarda solo lo básico: los datos completos se piden al abrir
  useEffect(() => {
    authService
      .getCurrentUser()
      .then((perfil) => {
        setDatos({
          nombre: perfil.nombre || '',
          apellido_paterno: perfil.apellido_paterno || '',
          apellido_materno: perfil.apellido_materno || '',
          correo: perfil.correo || '',
          celular: perfil.celular || '',
        })
      })
      .catch(() => aviso('error', 'No se pudieron cargar tus datos'))
  }, [])

  const campo = (clave) => ({
    value: datos[clave],
    onChange: (e) => setDatos({ ...datos, [clave]: e.target.value }),
  })

  const guardarDatos = async (e) => {
    e.preventDefault()
    if (!datos.nombre.trim()) return aviso('error', 'El nombre es obligatorio')

    setGuardandoDatos(true)
    try {
      await actualizarPerfil({
        nombre: datos.nombre.trim(),
        apellido_paterno: datos.apellido_paterno.trim() || null,
        apellido_materno: datos.apellido_materno.trim() || null,
        correo: datos.correo.trim() || null,
        celular: datos.celular.trim() || null,
      })
      aviso('success', 'Datos guardados')
    } catch (err) {
      const detalle = err?.response?.data?.detail
      aviso('error', 'No se pudieron guardar', typeof detalle === 'string' ? detalle : 'Revisa los datos e intenta de nuevo')
    } finally {
      setGuardandoDatos(false)
    }
  }

  const guardarCodigo = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(codigo.actual)) return aviso('error', 'Escribe tu código actual')
    const problema = problemaCodigo(codigo.nuevo, { permitirDefault: false })
    if (problema) return aviso('error', problema)
    if (codigo.nuevo !== codigo.confirmar) return aviso('error', 'Los códigos nuevos no coinciden')

    setGuardandoCodigo(true)
    try {
      await cambiarCodigo(codigo.actual, codigo.nuevo)
      setCodigo({ actual: '', nuevo: '', confirmar: '' })
      aviso('success', 'Código actualizado')
    } catch (err) {
      aviso('error', 'No se pudo cambiar', err?.response?.data?.detail || 'Intenta de nuevo')
    } finally {
      setGuardandoCodigo(false)
    }
  }

  const campoCodigo = (clave, etiqueta) => (
    <div>
      <label className="campo-label">{etiqueta}</label>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={codigo[clave]}
        onChange={(e) => setCodigo({ ...codigo, [clave]: soloDigitos(e.target.value) })}
        className="campo tracking-[0.4em] placeholder:tracking-normal"
      />
    </div>
  )

  const salir = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Mis datos</h2>
          <p className="text-sm text-gray-500">
            Rol: <span className="font-medium text-gray-700">{NOMBRE_ROL[usuario?.rol] || usuario?.rol}</span>
          </p>
        </div>

        <form onSubmit={guardarDatos} className="space-y-3">
          <div>
            <label className="campo-label">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input className="campo" {...campo('nombre')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="campo-label">Apellido paterno</label>
              <input className="campo" {...campo('apellido_paterno')} />
            </div>
            <div>
              <label className="campo-label">Apellido materno</label>
              <input className="campo" {...campo('apellido_materno')} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="campo-label">Correo</label>
              <input type="email" className="campo" {...campo('correo')} />
            </div>
            <div>
              <label className="campo-label">Celular</label>
              <input type="tel" inputMode="tel" className="campo" {...campo('celular')} />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={guardandoDatos} className="btn-primary disabled:opacity-60">
              {guardandoDatos ? 'Guardando…' : 'Guardar datos'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">Cambiar código de acceso</h2>
        <p className="text-sm text-gray-500 mb-4">Los 6 dígitos con los que inicias sesión.</p>
        <form onSubmit={guardarCodigo} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {campoCodigo('actual', 'Código actual')}
            {campoCodigo('nuevo', 'Nuevo')}
            {campoCodigo('confirmar', 'Repite el nuevo')}
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={guardandoCodigo} className="btn-primary disabled:opacity-60">
              {guardandoCodigo ? 'Guardando…' : 'Cambiar código'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex justify-end">
        <button
          onClick={salir}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-red-200 px-4 py-3 font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default MiPerfil
