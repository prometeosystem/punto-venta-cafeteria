import { useState } from 'react'
import { AlertTriangle, CheckCircle, Package, Plus, Loader2, Edit, Trash2, Search, X } from 'lucide-react'
import { useInventario } from '../hooks/useInventario'
import Swal from 'sweetalert2'

const Inventario = () => {
  const { insumos, loading, crearInsumo, editarInsumo, obtenerInsumos, obtenerInsumosBajoStock } = useInventario()
  const [searchTerm, setSearchTerm] = useState('')
  const [mostrarModalInsumo, setMostrarModalInsumo] = useState(false)
  const [insumoEditando, setInsumoEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    unidad_medida: '',
    cantidad_actual: '',
    cantidad_minima: '',
    precio_compra: '',
    activo: true,
  })

  // Opciones de unidades de medida
  const unidadesMedida = [
    'gramos',
    'kilogramos',
    'mililitros',
    'litros',
    'unidades',
    'piezas',
    'onzas',
    'libras',
    'tazas',
    'cucharadas',
    'cucharaditas',
    'onzas_fluidas',
  ]

  // Filtrar insumos
  const filteredInsumos = insumos.filter((insumo) => {
    const matchesSearch = insumo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insumo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getStatus = (insumo) => {
    const cantidadActual = parseFloat(insumo.cantidad_actual || 0)
    const cantidadMinima = parseFloat(insumo.cantidad_minima || 0)
    
    if (cantidadActual <= 0) return 'critical'
    if (cantidadActual < cantidadMinima) return 'low'
    return 'ok'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 text-green-700'
      case 'low':
        return 'bg-yellow-100 text-yellow-700'
      case 'critical':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-5 h-5" />
      case 'low':
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />
      default:
        return null
    }
  }

  // Abrir modal para crear insumo
  const abrirModalCrear = () => {
    setInsumoEditando(null)
    setFormData({
      nombre: '',
      descripcion: '',
      unidad_medida: '',
      cantidad_actual: '',
      cantidad_minima: '',
      precio_compra: '',
      activo: true,
    })
    setMostrarModalInsumo(true)
  }

  // Abrir modal para editar insumo
  const abrirModalEditar = (insumo) => {
    setInsumoEditando(insumo)
    setFormData({
      nombre: insumo.nombre || '',
      descripcion: insumo.descripcion || '',
      unidad_medida: insumo.unidad_medida || '',
      cantidad_actual: insumo.cantidad_actual || '',
      cantidad_minima: insumo.cantidad_minima || '',
      precio_compra: insumo.precio_compra || '',
      activo: insumo.activo !== undefined ? insumo.activo : true,
    })
    setMostrarModalInsumo(true)
  }

  // Guardar insumo (crear o editar)
  const handleGuardar = async (e) => {
    e.preventDefault()
    setGuardando(true)

    try {
      // Validaciones
      const cantidadActual = parseFloat(formData.cantidad_actual)
      const cantidadMinima = parseFloat(formData.cantidad_minima)
      const precioCompra = parseFloat(formData.precio_compra)

      if (isNaN(cantidadActual) || cantidadActual < 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'La cantidad actual debe ser un número válido mayor o igual a 0',
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      if (isNaN(cantidadMinima) || cantidadMinima < 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'La cantidad mínima debe ser un número válido mayor o igual a 0',
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      if (isNaN(precioCompra) || precioCompra < 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El precio de compra debe ser un número válido mayor o igual a 0',
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      const insumoData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        unidad_medida: formData.unidad_medida.trim(),
        cantidad_actual: cantidadActual,
        cantidad_minima: cantidadMinima,
        precio_compra: precioCompra,
        activo: formData.activo,
      }

      if (insumoEditando) {
        // Editar insumo existente
        await editarInsumo(insumoEditando.id_insumo, insumoData)
        await Swal.fire({
          icon: 'success',
          title: '¡Insumo actualizado!',
          text: 'El insumo se ha actualizado correctamente',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
      } else {
        // Crear nuevo insumo
        await crearInsumo(insumoData)
        await Swal.fire({
          icon: 'success',
          title: '¡Insumo creado!',
          text: 'El insumo se ha creado correctamente',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
      }

      // Refrescar lista y cerrar modal
      await obtenerInsumos()
      setMostrarModalInsumo(false)
      setInsumoEditando(null)
    } catch (error) {
      console.error('Error al guardar insumo:', error)
      const errorMsg = error.detail || error.message || 'Error al guardar el insumo'
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
        confirmButtonColor: '#10b981',
      })
    } finally {
      setGuardando(false)
    }
  }

  // Eliminar insumo (desactivar)
  const handleEliminar = async (insumo) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar insumo?',
      text: `¿Estás seguro de que deseas desactivar "${insumo.nombre}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
    })

    if (result.isConfirmed) {
      try {
        await editarInsumo(insumo.id_insumo, { activo: false })
        await Swal.fire({
          icon: 'success',
          title: '¡Insumo desactivado!',
          text: 'El insumo se ha desactivado correctamente',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
        await obtenerInsumos()
      } catch (error) {
        console.error('Error al desactivar insumo:', error)
        const errorMsg = error.detail || error.message || 'Error al desactivar el insumo'
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMsg,
          confirmButtonColor: '#10b981',
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
        <p className="text-gray-600 mt-1">Control de stock y materiales</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de Items</p>
              <p className="text-2xl font-bold text-gray-900">{insumos.length}</p>
            </div>
            <div className="p-3 bg-matcha-100 rounded-lg">
              <Package className="w-6 h-6 text-matcha-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-600">
                {insumos.filter(i => getStatus(i) === 'low').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Crítico</p>
              <p className="text-2xl font-bold text-red-600">
                {insumos.filter(i => getStatus(i) === 'critical').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda y acciones */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar insumos..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={abrirModalCrear}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Lista de inventario */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Items de Inventario
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Insumo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Unidad</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Cantidad Actual</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Cantidad Mínima</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Precio Compra</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInsumos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">
                      {searchTerm ? 'No se encontraron insumos' : 'No hay insumos registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredInsumos.map((item) => {
                    const status = getStatus(item)
                    return (
                      <tr
                        key={item.id_insumo}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            {getStatusIcon(status)}
                            {status === 'ok' ? 'Normal' : status === 'low' ? 'Bajo' : 'Crítico'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{item.nombre}</p>
                          {item.descripcion && (
                            <p className="text-sm text-gray-500">{item.descripcion}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">{item.unidad_medida}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">
                            {parseFloat(item.cantidad_actual || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {parseFloat(item.cantidad_minima || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            ${parseFloat(item.precio_compra || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => abrirModalEditar(item)}
                              className="p-2 rounded hover:bg-gray-200 transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 text-gray-600" />
                            </button>
                            {item.activo && (
                              <button
                                onClick={() => handleEliminar(item)}
                                className="p-2 rounded hover:bg-red-100 transition-colors"
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
        )}
      </div>

      {/* Modal Crear/Editar Insumo */}
      {mostrarModalInsumo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {insumoEditando ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h2>
              <button
                onClick={() => {
                  setMostrarModalInsumo(false)
                  setInsumoEditando(null)
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleGuardar} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Izquierda */}
                <div className="space-y-4">
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
                      placeholder="Ej: Café molido"
                    />
                  </div>

                  {/* Unidad de Medida */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unidad de Medida <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.unidad_medida}
                      onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                      className="input w-full"
                    >
                      <option value="">Selecciona una unidad</option>
                      {unidadesMedida.map(unidad => (
                        <option key={unidad} value={unidad}>
                          {unidad.charAt(0).toUpperCase() + unidad.slice(1).replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad Actual */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad Actual <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.cantidad_actual}
                      onChange={(e) => setFormData({ ...formData, cantidad_actual: e.target.value })}
                      className="input w-full"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Cantidad Mínima */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad Mínima <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.cantidad_minima}
                      onChange={(e) => setFormData({ ...formData, cantidad_minima: e.target.value })}
                      className="input w-full"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-4">
                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción <span className="text-gray-400">(Opcional)</span>
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="input w-full resize-none"
                      rows={3}
                      placeholder="Descripción del insumo"
                    />
                  </div>

                  {/* Precio de Compra */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio de Compra <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.precio_compra}
                        onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value })}
                        className="input w-full pl-8"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="estado"
                          checked={formData.activo === true}
                          onChange={() => setFormData({ ...formData, activo: true })}
                          className="w-4 h-4 text-matcha-600"
                        />
                        <span className="text-sm text-gray-700">Activo</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="estado"
                          checked={formData.activo === false}
                          onChange={() => setFormData({ ...formData, activo: false })}
                          className="w-4 h-4 text-matcha-600"
                        />
                        <span className="text-sm text-gray-700">Inactivo</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalInsumo(false)
                    setInsumoEditando(null)
                  }}
                  className="btn-outline flex-1"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    insumoEditando ? 'Actualizar' : 'Crear'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventario
