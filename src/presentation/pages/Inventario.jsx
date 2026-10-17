import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Package, Plus, Loader2, Edit, Trash2, Search, X } from 'lucide-react'
import { useInventario } from '../hooks/useInventario'
import VinculosProveedores from '../components/VinculosProveedores'
import { proveedoresService } from '../../application/services/proveedoresService'
import Swal from 'sweetalert2'

const Inventario = () => {
  const { insumos, loading, crearInsumo, editarInsumo, obtenerInsumos, obtenerInsumosBajoStock } = useInventario()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Leer parámetro de búsqueda de la URL al montar el componente
  useEffect(() => {
    const searchParam = searchParams.get('search')
    if (searchParam) {
      setSearchTerm(searchParam)
      // Limpiar el parámetro de la URL después de leerlo (opcional, para mantener la URL limpia)
      // setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const [mostrarModalInsumo, setMostrarModalInsumo] = useState(false)
  const [insumoEditando, setInsumoEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [listaProveedores, setListaProveedores] = useState([])
  const [vinculosProveedores, setVinculosProveedores] = useState([])
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    unidad_medida: '',
    cantidad_actual: '',
    cantidad_minima: '',
    precio_compra: '',
    unidad_compra_referencia: '',
    cantidad_compra_referencia: '',
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
        return 'bg-marca-100 text-marca-700'
      case 'low':
        return 'bg-amber-100 text-amber-700'
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

  const cargarProveedoresCatalogo = async () => {
    try {
      const lista = await proveedoresService.listar(true)
      setListaProveedores(Array.isArray(lista) ? lista : [])
    } catch {
      setListaProveedores([])
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
      unidad_compra_referencia: '',
      cantidad_compra_referencia: '',
      activo: true,
    })
    setVinculosProveedores([])
    setMostrarModalInsumo(true)
    cargarProveedoresCatalogo()
  }

  // Abrir modal para editar insumo
  const abrirModalEditar = async (insumo) => {
    setInsumoEditando(insumo)
    setFormData({
      nombre: insumo.nombre || '',
      descripcion: insumo.descripcion || '',
      unidad_medida: insumo.unidad_medida || '',
      cantidad_actual: insumo.cantidad_actual != null ? String(insumo.cantidad_actual) : '',
      cantidad_minima: insumo.cantidad_minima != null ? String(insumo.cantidad_minima) : '',
      precio_compra: insumo.precio_compra != null ? String(insumo.precio_compra) : '',
      unidad_compra_referencia: insumo.unidad_compra_referencia || '',
      cantidad_compra_referencia: insumo.cantidad_compra_referencia != null ? String(insumo.cantidad_compra_referencia) : '',
      activo: insumo.activo !== undefined ? insumo.activo : true,
    })
    setVinculosProveedores([])
    setMostrarModalInsumo(true)
    cargarProveedoresCatalogo()
    try {
      const vins = await proveedoresService.proveedoresDeItem('insumo', insumo.id_insumo)
      setVinculosProveedores(
        (Array.isArray(vins) ? vins : []).map((v) => ({
          id_proveedor: v.id_proveedor,
          precio_compra: v.precio_compra ?? '',
          es_preferido: !!v.es_preferido,
        })),
      )
    } catch {
      setVinculosProveedores([])
    }
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
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        setGuardando(false)
        return
      }

      if (isNaN(cantidadMinima) || cantidadMinima < 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'La cantidad mínima debe ser un número válido mayor o igual a 0',
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        setGuardando(false)
        return
      }

      if (isNaN(precioCompra) || precioCompra < 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El precio de compra debe ser un número válido mayor o igual a 0',
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        setGuardando(false)
        return
      }

      const unidadCompraRef = formData.unidad_compra_referencia?.trim()
      const rawCant = formData.cantidad_compra_referencia
      const cantidadCompraRef = rawCant !== '' && rawCant != null && !Number.isNaN(Number(rawCant)) ? Number(rawCant) : null

      // Solo requerir referencia de precio para productos nuevos o cuando precio_compra > 0
      const requiereRefPrecio = !insumoEditando || precioCompra > 0
      if (requiereRefPrecio) {
        if (!unidadCompraRef) {
          await Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: 'Debes seleccionar la unidad del precio (ej. kilogramos, litros)',
            confirmButtonColor: 'rgb(var(--marca-500))',
          })
          setGuardando(false)
          return
        }
        if (cantidadCompraRef == null || cantidadCompraRef <= 0) {
          await Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            text: 'La cantidad que cuesta el precio debe ser un número mayor a 0 (ej. 1)',
            confirmButtonColor: 'rgb(var(--marca-500))',
          })
          setGuardando(false)
          return
        }
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
      if (unidadCompraRef && cantidadCompraRef != null && cantidadCompraRef > 0) {
        insumoData.unidad_compra_referencia = unidadCompraRef
        insumoData.cantidad_compra_referencia = cantidadCompraRef
      }

      if (insumoEditando) {
        await editarInsumo(insumoEditando.id_insumo, insumoData)
        await proveedoresService.sincronizarItem(
          'insumo',
          insumoEditando.id_insumo,
          vinculosProveedores,
        )
        await Swal.fire({
          icon: 'success',
          title: '¡Insumo actualizado!',
          text: 'El insumo se ha actualizado correctamente',
          confirmButtonColor: 'rgb(var(--marca-500))',
          timer: 2000,
          position: 'top',
        })
      } else {
        const creado = await crearInsumo(insumoData)
        const idNuevo = creado?.id_insumo
        if (idNuevo) {
          await proveedoresService.sincronizarItem('insumo', idNuevo, vinculosProveedores)
        }
        await Swal.fire({
          icon: 'success',
          title: '¡Insumo creado!',
          text: 'El insumo se ha creado correctamente',
          confirmButtonColor: 'rgb(var(--marca-500))',
          timer: 2000,
          position: 'top',
        })
      }

      // Refrescar lista y cerrar modal
      await obtenerInsumos()
      setMostrarModalInsumo(false)
      setInsumoEditando(null)
    } catch (error) {
      console.error('Error al guardar insumo:', error)
      const errData = error?.response?.data || error
      const errorMsg = typeof errData === 'string' ? errData : (errData?.detail || errData?.error || errData?.message || error?.message || 'Error al guardar el insumo')
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
        confirmButtonColor: 'rgb(var(--marca-500))',
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
      confirmButtonColor: 'rgb(var(--marca-500))',
      cancelButtonColor: '#6b7280',
    })

    if (result.isConfirmed) {
      try {
        await editarInsumo(insumo.id_insumo, { activo: false })
        await Swal.fire({
          icon: 'success',
          title: '¡Insumo desactivado!',
          text: 'El insumo se ha desactivado correctamente',
          confirmButtonColor: 'rgb(var(--marca-500))',
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
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 rounded-lg bg-marca-100 p-1.5 sm:p-2.5">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-marca-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">Total</p>
              <p className="text-lg font-bold leading-tight text-gray-900 sm:text-2xl">{insumos.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 rounded-lg bg-amber-100 p-1.5 sm:p-2.5">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">Stock bajo</p>
              <p className="text-lg font-bold leading-tight text-amber-600 sm:text-2xl">
                {insumos.filter(i => getStatus(i) === 'low').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="shrink-0 rounded-lg bg-red-100 p-1.5 sm:p-2.5">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">Crítico</p>
              <p className="text-lg font-bold leading-tight text-red-600 sm:text-2xl">
                {insumos.filter(i => getStatus(i) === 'critical').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda y acciones */}
      <div className="card">
        <div className="flex gap-2 items-center">
          <div className="relative min-w-0 flex-1">
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
            type="button"
            onClick={abrirModalCrear}
            className="btn-primary shrink-0 flex h-[42px] w-[42px] items-center justify-center p-0"
            aria-label="Nuevo insumo"
            title="Nuevo insumo"
          >
            <Plus className="w-5 h-5" />
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
            <Loader2 className="w-8 h-8 animate-spin text-marca-600" />
          </div>
        ) : (
          <>
          <ul className="md:hidden divide-y divide-gray-100">
            {filteredInsumos.length === 0 ? (
              <li className="py-8 text-center text-sm text-gray-500">
                {searchTerm ? 'No se encontraron insumos' : 'No hay insumos registrados'}
              </li>
            ) : (
              filteredInsumos.map((item) => {
                const status = getStatus(item)
                const cantidad = parseFloat(item.cantidad_actual ?? 0).toFixed(4).replace(/\.?0+$/, '')
                return (
                  <li key={item.id_insumo}>
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(item)}
                      className="flex w-full items-center gap-2.5 py-2 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">{item.nombre}</span>
                        <span className={`block truncate text-[11px] ${
                          status === 'critical' ? 'text-red-600' : status === 'low' ? 'text-amber-600' : 'text-gray-500'
                        }`}>
                          {item.unidad_medida} · {status === 'ok' ? 'Normal' : status === 'low' ? 'Bajo' : 'Crítico'}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold text-gray-900 tabular-nums">{cantidad}</span>
                        <span className="block text-[11px] text-gray-400 tabular-nums">
                          ${parseFloat(item.precio_compra || 0).toFixed(2)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          <div className="hidden md:block overflow-x-auto">
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
                            {parseFloat(item.cantidad_actual ?? 0).toFixed(4).replace(/\.?0+$/, '')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {parseFloat(item.cantidad_minima ?? 0).toFixed(4).replace(/\.?0+$/, '')}
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
          </>
        )}
      </div>

      {/* Modal Crear/Editar Insumo */}
      {mostrarModalInsumo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-2 max-h-[min(96vh,820px)] flex flex-col">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">
                {insumoEditando ? 'Editar insumo' : 'Nuevo insumo'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalInsumo(false)
                  setInsumoEditando(null)
                  setVinculosProveedores([])
                }}
                className="p-1.5 rounded-md hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="flex flex-col min-h-0 flex-1">
              <div className="overflow-y-auto flex-1 px-3 py-3 sm:px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* Columna Izquierda */}
                <div className="space-y-3">
                  {/* Nombre */}
                  <div>
                    <label className="campo-label">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="campo"
                      placeholder="Ej: Café molido"
                    />
                  </div>

                  {/* Unidad de Medida */}
                  <div>
                    <label className="campo-label">
                      Unidad de Medida <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.unidad_medida}
                      onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                      className="campo"
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
                    <label className="campo-label">
                      Cantidad Actual <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.0001"
                      value={formData.cantidad_actual}
                      onChange={(e) => setFormData({ ...formData, cantidad_actual: e.target.value })}
                      className="campo"
                      placeholder="0.0000"
                    />
                  </div>

                  {/* Cantidad Mínima */}
                  <div>
                    <label className="campo-label">
                      Cantidad Mínima <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.0001"
                      value={formData.cantidad_minima}
                      onChange={(e) => setFormData({ ...formData, cantidad_minima: e.target.value })}
                      className="campo"
                      placeholder="0.0000"
                    />
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-3">
                  {/* Descripción */}
                  <div>
                    <label className="campo-label">
                      Descripción <span className="font-normal">opcional</span>
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="campo"
                      rows={3}
                      placeholder="Descripción del insumo"
                    />
                  </div>

                  {/* Precio de Compra */}
                  <div>
                    <label className="campo-label">
                      Precio de Compra <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93] text-sm">$</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.precio_compra}
                        onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value })}
                        className="campo pl-8"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Referencia del precio: "Este precio corresponde a..." */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="campo-label">
                        Unidad <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.unidad_compra_referencia}
                        onChange={(e) => setFormData({ ...formData, unidad_compra_referencia: e.target.value })}
                        className="campo"
                      >
                        <option value="">Selecciona unidad del precio</option>
                        {unidadesMedida.map(unidad => (
                          <option key={unidad} value={unidad}>
                            {unidad.charAt(0).toUpperCase() + unidad.slice(1).replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="campo-label">
                        Cantidad <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0.0001"
                        step="0.0001"
                        value={formData.cantidad_compra_referencia}
                        onChange={(e) => setFormData({ ...formData, cantidad_compra_referencia: e.target.value })}
                        className="campo"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="campo-label">
                      Estado
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="estado"
                          checked={formData.activo === true}
                          onChange={() => setFormData({ ...formData, activo: true })}
                          className="w-4 h-4 text-marca-600"
                        />
                        <span className="text-sm text-gray-700">Activo</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="estado"
                          checked={formData.activo === false}
                          onChange={() => setFormData({ ...formData, activo: false })}
                          className="w-4 h-4 text-marca-600"
                        />
                        <span className="text-sm text-gray-700">Inactivo</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-gray-200">
                <label className="campo-label">
                  Proveedores que lo surten
                </label>
                <VinculosProveedores
                  proveedores={listaProveedores}
                  vinculos={vinculosProveedores}
                  onChange={setVinculosProveedores}
                  compact
                />
              </div>
              </div>

              <div className="flex gap-2 px-3 py-2.5 sm:px-4 border-t shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalInsumo(false)
                    setInsumoEditando(null)
                    setVinculosProveedores([])
                  }}
                  className="btn-outline flex-1 py-2 text-sm"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="btn-primary flex-1 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    insumoEditando ? 'Guardar' : 'Crear'
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
