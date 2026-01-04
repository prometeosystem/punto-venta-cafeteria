import { useState } from 'react'
import { Plus, Search, Mail, Phone, Users, Loader2, X, Edit, Trash2 } from 'lucide-react'
import { useUsuarios } from '../hooks/useUsuarios'
import Swal from 'sweetalert2'

const Empleados = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false)
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false)
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null)
  const [empleadoEditando, setEmpleadoEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    correo: '',
    contrasena: '',
    celular: '',
    rol: 'vendedor',
    activo: true,
  })

  const { usuarios, estadisticas, loading, crearUsuario, editarUsuario, eliminarUsuario, obtenerUsuarios } = useUsuarios()

  // Filtrar empleados
  const filteredEmployees = usuarios.filter((user) => {
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
          color: 'bg-blue-100 text-blue-600'
        },
        { 
          title: 'Vendedores', 
          value: estadisticas.vendedores?.toString() || '0', 
          subtitle: 'Activos', 
          icon: Users,
          color: 'bg-green-100 text-green-600'
        },
        { 
          title: 'Cocina', 
          value: estadisticas.cocina?.toString() || '0', 
          subtitle: 'Empleados', 
          icon: Users,
          color: 'bg-orange-100 text-orange-600'
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
          color: 'bg-blue-100 text-blue-600'
        },
        { 
          title: 'Vendedores', 
          value: usuarios.filter(u => u.activo === 1 && u.rol === 'vendedor').length.toString(), 
          subtitle: 'Activos', 
          icon: Users,
          color: 'bg-green-100 text-green-600'
        },
        { 
          title: 'Cocina', 
          value: usuarios.filter(u => u.activo === 1 && u.rol === 'cocina').length.toString(), 
          subtitle: 'Empleados', 
          icon: Users,
          color: 'bg-orange-100 text-orange-600'
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
        return 'bg-green-100 text-green-700'
      case 'cocina':
        return 'bg-orange-100 text-orange-700'
      case 'administrador':
        return 'bg-purple-100 text-purple-700'
      case 'superadministrador':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getRolLabel = (rol) => {
    const labels = {
      vendedor: 'Vendedor',
      cocina: 'Cocina',
      administrador: 'Administrador',
      superadministrador: 'Super Administrador',
    }
    return labels[rol] || rol
  }

  // Abrir modal para crear empleado
  const abrirModalCrear = () => {
    setEmpleadoEditando(null)
    setFormData({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      correo: '',
      contrasena: '',
      celular: '',
      rol: 'vendedor',
      activo: true,
    })
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
      contrasena: '', // No mostramos la contraseña al editar
      celular: empleado.celular || '',
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
    setFormData({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      correo: '',
      contrasena: '',
      celular: '',
      rol: 'vendedor',
      activo: true,
    })
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
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      if (!formData.apellido_paterno.trim()) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El apellido paterno es requerido',
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      if (!formData.correo.trim()) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El correo es requerido',
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.correo.trim())) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El formato del correo no es válido',
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      // ============================================
      // PASO 1: OBTENER Y LIMPIAR LA CONTRASEÑA
      // ============================================
      
      // Obtener el valor crudo de formData.contrasena
      const contrasenaRaw = formData.contrasena
      
      // Variable para almacenar la contraseña final (debe ser string)
      let contrasenaFinal = ''
      
      // Verificar qué tipo de dato es
      console.log('🔍 Tipo de contrasenaRaw:', typeof contrasenaRaw)
      console.log('🔍 Valor de contrasenaRaw:', contrasenaRaw)
      console.log('🔍 Es objeto?', typeof contrasenaRaw === 'object' && contrasenaRaw !== null)
      
      // CASO 1: Si es un objeto/diccionario
      if (contrasenaRaw && typeof contrasenaRaw === 'object' && !Array.isArray(contrasenaRaw)) {
        console.log('⚠️ La contraseña es un objeto, extrayendo valor...')
        
        // Intentar obtener valorCompleto primero (es el campo más común)
        contrasenaFinal = contrasenaRaw.valorCompleto || ''
        
        // Si no está, buscar otros campos posibles
        if (!contrasenaFinal) {
          contrasenaFinal = contrasenaRaw.valor || 
                           contrasenaRaw.password || 
                           contrasenaRaw.contrasena || 
                           ''
        }
        
        // Si aún no hay valor, buscar el primer string válido en el objeto
        if (!contrasenaFinal) {
          for (let key in contrasenaRaw) {
            const value = contrasenaRaw[key]
            // Buscar un string que tenga entre 6 y 15 caracteres
            if (typeof value === 'string' && value.length >= 6 && value.length <= 15) {
              contrasenaFinal = value
              console.log(`✅ Encontrado valor en clave "${key}":`, value)
              break
            }
          }
        }
        
        // Si después de todo no encontramos un valor válido
        if (!contrasenaFinal) {
          await Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: 'No se pudo extraer la contraseña del objeto. Asegúrate de que el objeto tenga un campo "valorCompleto" o "valor" con el texto de la contraseña.',
            confirmButtonColor: '#10b981',
          })
          setGuardando(false)
          return
        }
        
        console.log('✅ Contraseña extraída del objeto:', contrasenaFinal)
      }
      // CASO 2: Si ya es un string
      else if (typeof contrasenaRaw === 'string') {
        console.log('✅ La contraseña ya es un string')
        contrasenaFinal = contrasenaRaw
      }
      // CASO 3: Otro tipo (number, boolean, etc.)
      else {
        console.log('⚠️ La contraseña es de otro tipo, convirtiendo a string...')
        contrasenaFinal = String(contrasenaRaw || '')
      }
      
      // ============================================
      // PASO 2: VALIDAR LA CONTRASEÑA
      // ============================================
      
      // Verificar que sea string
      if (typeof contrasenaFinal !== 'string') {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: `La contraseña debe ser un texto. Tipo recibido: ${typeof contrasenaFinal}`,
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }
      
      // Eliminar espacios en blanco al inicio y final
      contrasenaFinal = contrasenaFinal.trim()
      
      // Si es crear, la contraseña es requerida
      if (!empleadoEditando && !contrasenaFinal) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'La contraseña es requerida para crear un nuevo empleado',
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }
      
      // Validar longitud mínima
      if (contrasenaFinal && contrasenaFinal.length < 6) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: `La contraseña debe tener al menos 6 caracteres. Recibido: ${contrasenaFinal.length} caracteres.`,
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }
      
      // Validar longitud máxima
      if (contrasenaFinal && contrasenaFinal.length > 15) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: `La contraseña no puede tener más de 15 caracteres. Recibido: ${contrasenaFinal.length} caracteres.`,
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      // ============================================
      // PASO 3: PREPARAR LOS DATOS PARA ENVIAR
      // ============================================
      
      const empleadoData = {
        nombre: formData.nombre.trim(),
        apellido_paterno: formData.apellido_paterno.trim(),
        correo: formData.correo.trim(),
        rol: formData.rol,
        activo: formData.activo,
      }

      // Apellido materno es opcional - solo incluirlo si tiene valor
      if (formData.apellido_materno?.trim()) {
        empleadoData.apellido_materno = formData.apellido_materno.trim()
      }

      // Celular es opcional - solo incluirlo si tiene valor
      if (formData.celular?.trim()) {
        empleadoData.celular = formData.celular.trim()
      }

      // Solo incluir contraseña si se está creando o si se proporcionó una nueva
      if (!empleadoEditando || contrasenaFinal) {
        empleadoData.contrasena = contrasenaFinal // ✅ STRING SIMPLE, NO OBJETO
      }

      // ============================================
      // PASO 4: VERIFICACIÓN FINAL ANTES DE ENVIAR
      // ============================================
      
      console.log('📤 ===== DATOS A ENVIAR AL BACKEND =====')
      console.log('Tipo de contrasena:', typeof empleadoData.contrasena)
      console.log('Valor de contrasena:', empleadoData.contrasena)
      if (empleadoData.contrasena) {
        console.log('Longitud de contrasena:', empleadoData.contrasena.length)
      }
      console.log('Es string?', typeof empleadoData.contrasena === 'string')
      console.log('Datos completos:', JSON.stringify({
        ...empleadoData,
        contrasena: empleadoData.contrasena ? `[${empleadoData.contrasena.length} caracteres]` : 'no incluida'
      }, null, 2))
      console.log('========================================')
      
      // Verificación de seguridad adicional
      if (empleadoData.contrasena && typeof empleadoData.contrasena !== 'string') {
        console.error('❌ ERROR CRÍTICO: La contraseña no es un string. Tipo:', typeof empleadoData.contrasena)
        await Swal.fire({
          icon: 'error',
          title: 'Error interno',
          text: `ERROR CRÍTICO: La contraseña no es un string. Tipo: ${typeof empleadoData.contrasena}`,
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }
      
      if (empleadoData.contrasena && (empleadoData.contrasena.length < 6 || empleadoData.contrasena.length > 15)) {
        console.error('❌ ERROR CRÍTICO: La contraseña tiene longitud inválida:', empleadoData.contrasena.length)
        await Swal.fire({
          icon: 'error',
          title: 'Error interno',
          text: `ERROR CRÍTICO: La contraseña tiene longitud inválida: ${empleadoData.contrasena.length}`,
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      if (empleadoEditando) {
        // Editar empleado existente
        await editarUsuario(empleadoEditando.id_usuario, empleadoData)
        await Swal.fire({
          icon: 'success',
          title: '¡Empleado actualizado!',
          text: 'El empleado se ha actualizado correctamente',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
      } else {
        // Crear nuevo empleado
        await crearUsuario(empleadoData)
        await Swal.fire({
          icon: 'success',
          title: '¡Empleado creado!',
          text: 'El empleado se ha creado correctamente',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
      }

      cerrarModalCrear()
      await obtenerUsuarios()
    } catch (error) {
      console.error('Error al guardar empleado:', error)
      
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
        confirmButtonColor: '#10b981',
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
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
    })

    if (result.isConfirmed) {
      try {
        await eliminarUsuario(empleado.id_usuario)
        await Swal.fire({
          icon: 'success',
          title: '¡Empleado desactivado!',
          text: 'El empleado se ha desactivado correctamente',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
        await obtenerUsuarios()
      } catch (error) {
        console.error('Error al desactivar empleado:', error)
        
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
          confirmButtonColor: '#10b981',
          width: '500px',
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600 mt-1">Gestión de personal y turnos</p>
        </div>
        <button 
          onClick={abrirModalCrear}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Empleado
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Búsqueda */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar empleados..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de empleados */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No se encontraron empleados
            </div>
          ) : (
            filteredEmployees.map((employee) => {
              const initials = `${employee.nombre?.charAt(0) || ''}${employee.apellido_paterno?.charAt(0) || ''}`.toUpperCase() || 'U'
              return (
                <div key={employee.id_usuario} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-matcha-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {initials}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getFullName(employee)}
                      </h3>
                      <p className="text-sm text-gray-600">{getRolLabel(employee.rol)}</p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getRolColor(
                          employee.rol
                        )}`}
                      >
                        {employee.activo === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-200 pt-4">
                    {employee.correo && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{employee.correo}</span>
                      </div>
                    )}
                    {employee.celular && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{employee.celular}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                    <button 
                      onClick={() => abrirModalDetalles(employee)}
                      className="btn-outline flex-1 text-sm py-2"
                    >
                      Ver Detalles
                    </button>
                    <button
                      onClick={() => abrirModalEditar(employee)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleEliminar(employee)}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors border border-gray-300"
                      title="Desactivar"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

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
                    Apellido Paterno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
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
                    Correo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    className="input w-full"
                    placeholder="ejemplo@cafeteria.com"
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña {!empleadoEditando && <span className="text-red-500">*</span>}
                    {empleadoEditando && <span className="text-gray-500 text-xs">(dejar vacío para no cambiar)</span>}
                  </label>
                  <input
                    type="password"
                    required={!empleadoEditando}
                    value={formData.contrasena}
                    onChange={(e) => setFormData({ ...formData, contrasena: e.target.value })}
                    className="input w-full"
                    placeholder={empleadoEditando ? "Nueva contraseña (opcional)" : "Contraseña"}
                  />
                </div>

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
                    <option value="cocina">Cocina</option>
                    <option value="administrador">Administrador</option>
                    <option value="superadministrador">Super Administrador</option>
                  </select>
                </div>

                {/* Estado Activo */}
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
                        className="w-4 h-4 text-matcha-600 rounded focus:ring-matcha-500"
                      />
                      <span className="text-sm text-gray-700">Activo</span>
                    </label>
                  </div>
                </div>
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
                <div className="w-16 h-16 bg-matcha-500 rounded-full flex items-center justify-center">
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
                <button
                  onClick={() => handleEliminar(empleadoSeleccionado)}
                  className="btn-outline text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Desactivar
                </button>
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
