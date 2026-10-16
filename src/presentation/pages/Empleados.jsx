import { useState } from 'react'
import { Plus, Search, Mail, Phone, Users, Loader2, X, Edit, Trash2, KeyRound } from 'lucide-react'
import { useUsuarios } from '../hooks/useUsuarios'
import { useAuth } from '../context/AuthContext'
import { usePreferencias } from '../context/PreferenciasContext'
import Swal from 'sweetalert2'
import { CODIGO_DEFAULT, problemaCodigo } from '../utils/codigoAcceso'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_POR_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const formularioVacio = () => ({
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  correo: '',
  codigo: '',
  celular: '',
  dia: '',
  mes: '',
  rol: 'vendedor',
  activo: true,
})

const Empleados = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false)
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false)
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null)
  const [empleadoEditando, setEmpleadoEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState(formularioVacio)

  const { usuarios, estadisticas, loading, crearUsuario, editarUsuario, eliminarUsuario, obtenerUsuarios, restablecerCodigo } = useUsuarios()
  const { usuario: usuarioActual } = useAuth()
  const { modoRestaurante } = usePreferencias()

  const esSuperadmin = (u) => u?.rol === 'superadministrador'
  const soyYo = (u) => u?.id_usuario === usuarioActual?.id_usuario

  // El superadministrador no se muestra al resto del personal; él sí se ve a sí mismo
  const visibles = usuarios.filter((user) => !esSuperadmin(user) || soyYo(user))

  /**
   * Solo el superadministrador puede desactivar (el backend lo exige igual), y
   * nadie puede desactivarse a sí mismo ni dejar al sistema sin superadmin.
   */
  const puedeDesactivar = (empleado) => {
    if (!esSuperadmin(usuarioActual)) return false
    if (soyYo(empleado)) return false
    if (esSuperadmin(empleado)) return false
    return empleado.activo === 1 || empleado.activo === true
  }

  /**
   * Si el empleado olvidó su código, vuelve a 123456 y al entrar se le pide
   * elegir otro. Sin código no aparece en el login, así que esto también lo devuelve.
   */
  const handleCodigo = async (empleado) => {
    const { isConfirmed } = await Swal.fire({
      position: 'top',
      heightAuto: false,
      title: 'Restablecer código',
      text: `El código de ${getFullName(empleado)} volverá a ser ${CODIGO_DEFAULT}. Al entrar se le pedirá elegir uno nuevo.`,
      showCancelButton: true,
      confirmButtonText: 'Restablecer',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'rgb(var(--marca-500))',
    })

    if (!isConfirmed) return

    try {
      await restablecerCodigo(empleado.id_usuario)
      await Swal.fire({
        icon: 'success',
        title: `Código: ${CODIGO_DEFAULT}`,
        text: 'Se le pedirá cambiarlo al iniciar sesión',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar',
        text: err?.detail || err?.message || 'Intenta de nuevo',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    }
  }

  // Filtrar empleados
  const filteredEmployees = visibles.filter((user) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.nombre_completo?.toLowerCase().includes(searchLower) ||
      user.nombre?.toLowerCase().includes(searchLower) ||
      user.apellido_paterno?.toLowerCase().includes(searchLower) ||
      user.apellido_materno?.toLowerCase().includes(searchLower) ||
      user.correo?.toLowerCase().includes(searchLower) ||
      user.celular?.includes(searchTerm) ||
      user.rol?.toLowerCase().includes(searchLower)
    )
  })

  // Usar estadísticas del backend si están disponibles, sino calcular localmente
  const stats = estadisticas
    ? [
        { 
          title: 'Total Empleados', 
          value: estadisticas.total_empleados?.toString() || '0', 
          subtitle: 'Empleados activos', 
          icon: Users,
          color: 'bg-gray-100 text-gray-600'
        },
        { 
          title: 'Vendedores', 
          value: estadisticas.vendedores?.toString() || '0', 
          subtitle: 'Activos', 
          icon: Users,
          color: 'bg-marca-100 text-marca-600'
        },
        { 
          title: 'Cocina', 
          value: estadisticas.cocina?.toString() || '0', 
          subtitle: 'Empleados', 
          icon: Users,
          color: 'bg-amber-100 text-amber-600'
        },
        { 
          title: 'Administradores', 
          value: estadisticas.administradores?.toString() || '0', 
          subtitle: 'Empleados', 
          icon: Users,
          color: 'bg-purple-100 text-purple-600'
        },
      ]
    : [
        // Fallback: calcular localmente si no hay estadísticas del backend
        { 
          title: 'Total Empleados', 
          value: usuarios.filter(u => u.activo === 1).length.toString(), 
          subtitle: 'Empleados activos', 
          icon: Users,
          color: 'bg-gray-100 text-gray-600'
        },
        { 
          title: 'Vendedores', 
          value: usuarios.filter(u => u.activo === 1 && u.rol === 'vendedor').length.toString(), 
          subtitle: 'Activos', 
          icon: Users,
          color: 'bg-marca-100 text-marca-600'
        },
        { 
          title: 'Cocina', 
          value: usuarios.filter(u => u.activo === 1 && u.rol === 'cocina').length.toString(), 
          subtitle: 'Empleados', 
          icon: Users,
          color: 'bg-amber-100 text-amber-600'
        },
        { 
          title: 'Administradores', 
          value: usuarios.filter(u => u.activo === 1 && (u.rol === 'administrador' || u.rol === 'superadministrador')).length.toString(), 
          subtitle: 'Empleados', 
          icon: Users,
          color: 'bg-purple-100 text-purple-600'
        },
      ]

  // Función para obtener nombre completo (usar nombre_completo del backend si está disponible)
  const getFullName = (usuario) => {
    return usuario.nombre_completo || 
           `${usuario.nombre || ''} ${usuario.apellido_paterno || ''} ${usuario.apellido_materno || ''}`.trim()
  }

  const getRolColor = (rol) => {
    switch (rol) {
      case 'vendedor':
        return 'bg-marca-100 text-marca-700'
      case 'cocina':
        return 'bg-amber-100 text-amber-700'
      case 'mesero':
        return 'bg-rose-100 text-rose-700'
      case 'administrador':
        return 'bg-purple-100 text-purple-700'
      case 'superadministrador':
        return 'bg-purple-600 text-white'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getRolLabel = (rol) => {
    const labels = {
      vendedor: 'Vendedor',
      cocina: 'Cocina',
      mesero: 'Mesero',
      administrador: 'Administrador',
      superadministrador: 'Super Administrador',
    }
    return labels[rol] || rol
  }

  // Abrir modal para crear empleado
  const abrirModalCrear = () => {
    setEmpleadoEditando(null)
    setFormData(formularioVacio())
    setMostrarModalCrear(true)
  }

  // Abrir modal para editar empleado
  const abrirModalEditar = (empleado) => {
    setEmpleadoEditando(empleado)
    setFormData({
      nombre: empleado.nombre || '',
      apellido_paterno: empleado.apellido_paterno || '',
      apellido_materno: empleado.apellido_materno || '',
      correo: empleado.correo || '',
      codigo: '',
      celular: empleado.celular || '',
      dia: empleado.dia ? String(empleado.dia) : '',
      mes: empleado.mes ? String(empleado.mes) : '',
      rol: empleado.rol || 'vendedor',
      activo: empleado.activo === 1 || empleado.activo === true,
    })
    setMostrarModalCrear(true)
  }

  // Abrir modal de detalles
  const abrirModalDetalles = (empleado) => {
    setEmpleadoSeleccionado(empleado)
    setMostrarModalDetalles(true)
  }

  // Cerrar modales
  const cerrarModalCrear = () => {
    setMostrarModalCrear(false)
    setEmpleadoEditando(null)
    setFormData(formularioVacio())
  }

  const cerrarModalDetalles = () => {
    setMostrarModalDetalles(false)
    setEmpleadoSeleccionado(null)
  }

  // Guardar empleado (crear o editar)
  const handleGuardar = async (e) => {
    e.preventDefault()
    setGuardando(true)

    try {
      // Validaciones
      if (!formData.nombre.trim()) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El nombre es requerido',
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        setGuardando(false)
        return
      }

      // El correo es opcional; si viene, que sea válido
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (formData.correo.trim() && !emailRegex.test(formData.correo.trim())) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El formato del correo no es válido',
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        setGuardando(false)
        return
      }

      // El código de acceso sólo se pide al dar de alta; después se cambia
      // con el botón de la llave. Vacío, el backend asigna el de por defecto.
      const codigo = (formData.codigo || '').trim()
      if (!empleadoEditando && codigo) {
        const problema = problemaCodigo(codigo)
        if (problema) {
          await Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: problema,
            confirmButtonColor: 'rgb(var(--marca-500))',
          })
          setGuardando(false)
          return
        }
      }

      // ============================================
      // PASO 3: PREPARAR LOS DATOS PARA ENVIAR
      // ============================================
      
      // Los opcionales viajan siempre, en null cuando se vacían: si se omiten
      // el backend los interpreta como "no cambiar" y no se podrían borrar.
      const opcional = (valor) => valor?.trim() || null

      const dia = formData.dia ? Number(formData.dia) : null
      const mes = formData.mes ? Number(formData.mes) : null
      if ((dia == null) !== (mes == null)) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'Indica el día y el mes, o deja ambos vacíos',
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        setGuardando(false)
        return
      }

      const empleadoData = {
        nombre: formData.nombre.trim(),
        apellido_paterno: opcional(formData.apellido_paterno),
        apellido_materno: opcional(formData.apellido_materno),
        correo: opcional(formData.correo),
        celular: opcional(formData.celular),
        dia,
        mes,
        rol: formData.rol,
        activo: formData.activo,
      }

      // El código sólo viaja al crear; al editar se cambia con la llave
      if (!empleadoEditando) {
        empleadoData.codigo = codigo || null
      }

      if (empleadoEditando) {
        // Editar empleado existente
        await editarUsuario(empleadoEditando.id_usuario, empleadoData)
        await Swal.fire({
          icon: 'success',
          title: '¡Empleado actualizado!',
          text: 'El empleado se ha actualizado correctamente',
          confirmButtonColor: 'rgb(var(--marca-500))',
          timer: 2000,
        })
      } else {
        // Crear nuevo empleado
        await crearUsuario(empleadoData)
        await Swal.fire({
          icon: 'success',
          title: '¡Empleado creado!',
          text: 'El empleado se ha creado correctamente',
          confirmButtonColor: 'rgb(var(--marca-500))',
          timer: 2000,
        })
      }

      cerrarModalCrear()
      await obtenerUsuarios()
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error al guardar empleado:', error)
      }
      
      // Extraer mensaje de error de diferentes formatos posibles
      let errorMsg = 'Error al guardar el empleado'
      
      // Manejar errores de validación 422 de FastAPI
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail
        
        if (Array.isArray(detail)) {
          // Error de validación con múltiples campos
          const errores = detail.map(err => {
            const campo = err.loc ? err.loc.slice(1).join('.') : 'campo'
            return `${campo}: ${err.msg}`
          }).join('\n')
          errorMsg = `Error de validación:\n${errores}`
        } else if (typeof detail === 'string') {
          errorMsg = detail
        } else {
          errorMsg = JSON.stringify(detail)
        }
      } else if (error?.detail) {
        // Error de FastAPI directo
        if (Array.isArray(error.detail)) {
          const errores = error.detail.map(err => {
            const campo = err.loc ? err.loc.slice(1).join('.') : 'campo'
            return `${campo}: ${err.msg}`
          }).join('\n')
          errorMsg = `Error de validación:\n${errores}`
        } else if (typeof error.detail === 'string') {
          errorMsg = error.detail
        } else {
          errorMsg = JSON.stringify(error.detail)
        }
      } else if (error?.message) {
        errorMsg = error.message
      } else if (error?.error) {
        errorMsg = error.error
      } else if (typeof error === 'string') {
        errorMsg = error
      } else if (error?.response?.data?.error) {
        errorMsg = error.response.data.error
      } else if (error?.response?.data?.message) {
        errorMsg = error.response.data.message
      }
      
      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar empleado',
        text: errorMsg,
        confirmButtonColor: 'rgb(var(--marca-500))',
        width: '500px',
      })
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar empleado (desactivar)
  const handleEliminar = async (empleado) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar empleado?',
      text: `¿Estás seguro de que deseas desactivar a "${getFullName(empleado)}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'rgb(var(--marca-500))',
      cancelButtonColor: '#6b7280',
    })

    if (result.isConfirmed) {
      try {
        await eliminarUsuario(empleado.id_usuario)
        await Swal.fire({
          icon: 'success',
          title: '¡Empleado desactivado!',
          text: 'El empleado se ha desactivado correctamente',
          confirmButtonColor: 'rgb(var(--marca-500))',
          timer: 2000,
        })
        await obtenerUsuarios()
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error al desactivar empleado:', error)
        }
        
        // Extraer mensaje de error de diferentes formatos posibles
        let errorMsg = 'Error al desactivar el empleado'
        
        // Manejar errores de validación 422 de FastAPI
        if (error?.response?.data?.detail) {
          const detail = error.response.data.detail
          
          if (Array.isArray(detail)) {
            const errores = detail.map(err => {
              const campo = err.loc ? err.loc.slice(1).join('.') : 'campo'
              return `${campo}: ${err.msg}`
            }).join('\n')
            errorMsg = `Error de validación:\n${errores}`
          } else if (typeof detail === 'string') {
            errorMsg = detail
          } else {
            errorMsg = JSON.stringify(detail)
          }
        } else if (error?.detail) {
          if (Array.isArray(error.detail)) {
            const errores = error.detail.map(err => {
              const campo = err.loc ? err.loc.slice(1).join('.') : 'campo'
              return `${campo}: ${err.msg}`
            }).join('\n')
            errorMsg = `Error de validación:\n${errores}`
          } else if (typeof error.detail === 'string') {
            errorMsg = error.detail
          } else {
            errorMsg = JSON.stringify(error.detail)
          }
        } else if (error?.message) {
          errorMsg = error.message
        } else if (error?.error) {
          errorMsg = error.error
        } else if (typeof error === 'string') {
          errorMsg = error
        } else if (error?.response?.data?.error) {
          errorMsg = error.response.data.error
        } else if (error?.response?.data?.message) {
          errorMsg = error.response.data.message
        }
        
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMsg,
          confirmButtonColor: 'rgb(var(--marca-500))',
          width: '500px',
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`shrink-0 rounded-lg p-1.5 sm:p-2.5 ${stat.color}`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">{stat.title}</p>
                  <p className="text-lg font-bold leading-tight text-gray-900 sm:text-2xl">{stat.value}</p>
                  <p className="hidden sm:block text-xs text-gray-500 mt-0.5">{stat.subtitle}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Búsqueda y acciones */}
      <div className="card">
        <div className="flex gap-2 items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar empleados..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={abrirModalCrear}
            className="btn-primary shrink-0 flex h-[42px] w-[42px] items-center justify-center p-0"
            aria-label="Nuevo empleado"
            title="Nuevo empleado"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabla de empleados */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-marca-600" />
          </div>
        ) : (
          <>
          <ul className="md:hidden divide-y divide-gray-100">
            {filteredEmployees.length === 0 ? (
              <li className="py-8 text-center text-sm text-gray-500">No se encontraron empleados</li>
            ) : (
              filteredEmployees.map((employee) => {
                const initials = `${employee.nombre?.charAt(0) || ''}${employee.apellido_paterno?.charAt(0) || ''}`.toUpperCase() || 'U'
                return (
                  <li key={employee.id_usuario}>
                    <button
                      type="button"
                      onClick={() => abrirModalDetalles(employee)}
                      className="flex w-full items-center gap-2.5 py-2 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-500 text-sm font-semibold text-white">
                        {initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">{getFullName(employee)}</span>
                        <span className="block truncate text-[11px] text-gray-500">{getRolLabel(employee.rol)}</span>
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Empleado</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Rol</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Correo</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Celular</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">
                    No se encontraron empleados
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const initials = `${employee.nombre?.charAt(0) || ''}${employee.apellido_paterno?.charAt(0) || ''}`.toUpperCase() || 'U'
                  const activo = employee.activo === 1 || employee.activo === true
                  return (
                    <tr
                      key={employee.id_usuario}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 shrink-0 bg-marca-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">{initials}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => abrirModalDetalles(employee)}
                            className="font-medium text-gray-900 hover:text-marca-700 truncate text-left"
                            title="Ver detalles"
                          >
                            {getFullName(employee)}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRolColor(employee.rol)}`}>
                          {getRolLabel(employee.rol)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            activo ? 'bg-marca-100 text-marca-700' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1.5 max-w-[220px]">
                          {employee.correo ? (
                            <>
                              <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                              <span className="truncate">{employee.correo}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                        {employee.celular ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                            {employee.celular}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => abrirModalDetalles(employee)}
                            className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Ver detalles"
                          >
                            Detalles
                          </button>
                          <button
                            onClick={() => abrirModalEditar(employee)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleCodigo(employee)}
                            className={`p-2 rounded-lg transition-colors border ${
                              employee.tiene_codigo
                                ? 'border-gray-300 hover:bg-gray-100 text-gray-600'
                                : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700'
                            }`}
                            title={
                              !employee.tiene_codigo
                                ? `Sin código. Restablecer a ${CODIGO_DEFAULT} para que vuelva al inicio`
                                : employee.debe_cambiar_codigo
                                  ? `Tiene el código por defecto (${CODIGO_DEFAULT}) pendiente de cambiar`
                                  : 'Restablecer código si lo olvidó'
                            }
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          {puedeDesactivar(employee) && (
                            <button
                              onClick={() => handleEliminar(employee)}
                              className="p-2 rounded-lg hover:bg-red-100 transition-colors border border-gray-300"
                              title="Desactivar"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
          </>
        )}
      </div>

      {/* Modal Crear/Editar Empleado */}
      {mostrarModalCrear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {empleadoEditando ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h2>
              <button
                onClick={cerrarModalCrear}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardar} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="input w-full"
                    placeholder="Ej: Juan"
                  />
                </div>

                {/* Apellido Paterno */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido Paterno
                  </label>
                  <input
                    type="text"
                    value={formData.apellido_paterno}
                    onChange={(e) => setFormData({ ...formData, apellido_paterno: e.target.value })}
                    className="input w-full"
                    placeholder="Ej: Pérez"
                  />
                </div>

                {/* Apellido Materno */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido Materno
                  </label>
                  <input
                    type="text"
                    value={formData.apellido_materno}
                    onChange={(e) => setFormData({ ...formData, apellido_materno: e.target.value })}
                    className="input w-full"
                    placeholder="Ej: García"
                  />
                </div>

                {/* Correo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    className="input w-full"
                    placeholder="ejemplo@cafeteria.com"
                  />
                </div>

                {/* Código de acceso: sólo al dar de alta. Después se cambia con
                    el botón de la llave, para no tener dos formas de hacerlo. */}
                {!empleadoEditando && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de acceso
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={formData.codigo}
                      onChange={(e) =>
                        setFormData({ ...formData, codigo: e.target.value.replace(/\D/g, '') })
                      }
                      className="input w-full tracking-widest"
                      placeholder={`Vacío = ${CODIGO_DEFAULT}`}
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Si lo dejas vacío entra con {CODIGO_DEFAULT} y se le pide cambiarlo al iniciar sesión.
                    </p>
                  </div>
                )}

                {/* Celular */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Celular
                  </label>
                  <input
                    type="tel"
                    value={formData.celular}
                    onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                    className="input w-full"
                    placeholder="1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Día y mes
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.dia}
                      onChange={(e) => setFormData({ ...formData, dia: e.target.value })}
                      className="input w-full min-w-0"
                    >
                      <option value="">Día</option>
                      {Array.from({ length: formData.mes ? DIAS_POR_MES[Number(formData.mes) - 1] : 31 }, (_, i) => i + 1).map((dia) => (
                        <option key={dia} value={dia}>{dia}</option>
                      ))}
                    </select>
                    <select
                      value={formData.mes}
                      onChange={(e) => {
                        const mes = e.target.value
                        const maximo = mes ? DIAS_POR_MES[Number(mes) - 1] : 31
                        const dia = formData.dia && Number(formData.dia) > maximo ? '' : formData.dia
                        setFormData({ ...formData, mes, dia })
                      }}
                      className="input w-full min-w-0"
                    >
                      <option value="">Mes</option>
                      {MESES.map((nombre, indice) => (
                        <option key={nombre} value={indice + 1}>{nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                    className="input w-full"
                  >
                    <option value="vendedor">Vendedor</option>
                    {modoRestaurante && <option value="cocina">Cocina</option>}
                    {modoRestaurante && <option value="mesero">Mesero</option>}
                    <option value="administrador">Administrador</option>
                    {/* El backend lo rechaza igual; aquí solo se evita ofrecerlo */}
                    {esSuperadmin(usuarioActual) && (
                      <option value="superadministrador">Super Administrador</option>
                    )}
                  </select>
                </div>

                {/* Estado: solo al editar, para reactivar a alguien. Al crear siempre es activo. */}
                {empleadoEditando && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.activo}
                          onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                          className="w-4 h-4 text-marca-600 rounded focus:ring-marca-500"
                        />
                        <span className="text-sm text-gray-700">Activo</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={cerrarModalCrear}
                  className="btn-outline"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    empleadoEditando ? 'Actualizar' : 'Crear'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Detalles */}
      {mostrarModalDetalles && empleadoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Detalles del Empleado</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    cerrarModalDetalles()
                    abrirModalEditar(empleadoSeleccionado)
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
                  title="Editar"
                >
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={cerrarModalDetalles}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-marca-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-2xl">
                    {`${empleadoSeleccionado.nombre?.charAt(0) || ''}${empleadoSeleccionado.apellido_paterno?.charAt(0) || ''}`.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {getFullName(empleadoSeleccionado)}
                  </h3>
                  <p className="text-gray-600">{getRolLabel(empleadoSeleccionado.rol)}</p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${getRolColor(
                      empleadoSeleccionado.rol
                    )}`}
                  >
                    {empleadoSeleccionado.activo === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información Personal */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Información Personal
                  </h4>
                  
                  {empleadoSeleccionado.correo && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Correo</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900">{empleadoSeleccionado.correo}</p>
                      </div>
                    </div>
                  )}

                  {empleadoSeleccionado.celular && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Celular</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-gray-900">{empleadoSeleccionado.celular}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-600">ID Usuario</label>
                    <p className="text-gray-900 mt-1">{empleadoSeleccionado.id_usuario}</p>
                  </div>
                </div>

                {/* Información Laboral */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Información Laboral
                  </h4>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Rol</label>
                    <p className="text-gray-900 mt-1">{getRolLabel(empleadoSeleccionado.rol)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Estado</label>
                    <p className="text-gray-900 mt-1">
                      {empleadoSeleccionado.activo === 1 ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-200">
                {puedeDesactivar(empleadoSeleccionado) && (
                  <button
                    onClick={() => handleEliminar(empleadoSeleccionado)}
                    className="btn-outline text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Desactivar
                  </button>
                )}
                <button
                  onClick={() => {
                    cerrarModalDetalles()
                    abrirModalEditar(empleadoSeleccionado)
                  }}
                  className="btn-primary"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Empleados
