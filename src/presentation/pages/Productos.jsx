import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Loader2, X, Package } from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useInventario } from '../hooks/useInventario'
import { recetasService } from '../../application/services/recetasService'
import Swal from 'sweetalert2'
import ImageCropModal from '../components/ImageCropModal'

const Productos = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas las categorías')
  const [selectedStatus, setSelectedStatus] = useState('Todos los estados')
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    precio: '',
    activo: true,
    lleva_leche: false,
    lleva_extras: false,
    lleva_proteina: false,
  })
  const [usandoCategoriaNueva, setUsandoCategoriaNueva] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [imagen, setImagen] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [eliminarImagen, setEliminarImagen] = useState(false)
  const [mostrarCropModal, setMostrarCropModal] = useState(false)
  const [imagenParaRecortar, setImagenParaRecortar] = useState(null)
  const [recetas, setRecetas] = useState([])
  const [mostrarFormularioReceta, setMostrarFormularioReceta] = useState(false)
  const [recetaEditando, setRecetaEditando] = useState(null)
  const [formReceta, setFormReceta] = useState({
    tipo: 'existente', // 'existente' o 'nuevo'
    id_insumo: '',
    cantidad_necesaria: '',
    unidad_medida: '', // Unidad de medida va en la receta, no en el insumo
    insumo_nuevo: {
      nombre: '',
      descripcion: '',
    },
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
  ]
  const { productos, loading, crearProducto, editarProducto, eliminarProducto, obtenerProductos, obtenerProducto } = useProductos()
  const { insumos, obtenerInsumos } = useInventario()

  // Filtrar productos
  const filteredProducts = productos.filter((product) => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todas las categorías' || product.categoria === selectedCategory
    const matchesStatus = selectedStatus === 'Todos los estados' || 
                         (selectedStatus === 'Activo' && product.activo) ||
                         (selectedStatus === 'Inactivo' && !product.activo)
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Obtener categorías únicas
  const categories = ['Todas las categorías', ...new Set(productos.map(p => p.categoria))]
  const categoriasUnicas = [...new Set(productos.map(p => p.categoria))]

  // Los insumos ya se cargan automáticamente en useInventario
  // No necesitamos cargarlos nuevamente al abrir el modal

  // Cargar recetas y datos completos al editar producto
  useEffect(() => {
    const cargarRecetas = async () => {
      if (productoEditando?.id_producto) {
        try {
          // El endpoint ver_producto ahora incluye las recetas directamente
          const productoCompleto = await obtenerProducto(productoEditando.id_producto)
          
          // Actualizar formData con los datos completos del producto (incluyendo lleva_proteina)
          if (productoCompleto) {
            setFormData(prev => ({
              ...prev,
              lleva_leche: productoCompleto.lleva_leche !== undefined ? productoCompleto.lleva_leche : prev.lleva_leche,
              lleva_extras: productoCompleto.lleva_extras !== undefined ? productoCompleto.lleva_extras : prev.lleva_extras,
              lleva_proteina: productoCompleto.lleva_proteina !== undefined ? productoCompleto.lleva_proteina : prev.lleva_proteina,
            }))
          }
          
          // Si el producto tiene recetas, mapearlas al formato del formulario
          if (productoCompleto?.recetas && Array.isArray(productoCompleto.recetas)) {
            // Convertir recetas del formato del backend al formato del formulario
            const recetasMapeadas = productoCompleto.recetas.map(receta => ({
              id_insumo: receta.id_insumo,
              cantidad_necesaria: receta.cantidad_necesaria?.toString() || parseFloat(receta.cantidad_necesaria || 0).toString(),
              unidad_medida: receta.unidad_medida || '',
              insumo_nuevo: null,
              tipo: 'existente',
            }))
            setRecetas(recetasMapeadas)
            console.log('Recetas cargadas del producto:', recetasMapeadas)
          } else {
            // Si no hay recetas en el producto, intentar cargarlas del endpoint de recetas (fallback)
            try {
              const recetasData = await recetasService.obtenerRecetasProducto(productoEditando.id_producto)
              const recetasMapeadas = (recetasData || []).map(receta => ({
                id_insumo: receta.id_insumo,
                cantidad_necesaria: receta.cantidad_necesaria?.toString() || '',
                unidad_medida: receta.unidad_medida || '',
                insumo_nuevo: null,
                tipo: 'existente',
              }))
              setRecetas(recetasMapeadas)
            } catch (error) {
              console.error('Error al cargar recetas del endpoint de recetas:', error)
              setRecetas([])
            }
          }
        } catch (error) {
          console.error('Error al cargar producto completo:', error)
          // Fallback: intentar cargar recetas del endpoint de recetas
          try {
            const recetasData = await recetasService.obtenerRecetasProducto(productoEditando.id_producto)
            const recetasMapeadas = (recetasData || []).map(receta => ({
              id_insumo: receta.id_insumo,
              cantidad_necesaria: receta.cantidad_necesaria?.toString() || '',
              unidad_medida: receta.unidad_medida || '',
              insumo_nuevo: null,
              tipo: 'existente',
            }))
            setRecetas(recetasMapeadas)
          } catch (error2) {
            console.error('Error al cargar recetas:', error2)
            setRecetas([])
          }
        }
      } else {
        setRecetas([])
      }
    }
    cargarRecetas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoEditando])

  // Abrir modal para crear producto
  const abrirModalCrear = () => {
    setProductoEditando(null)
    setFormData({
      nombre: '',
      descripcion: '',
      categoria: '',
      precio: '',
      activo: true,
      lleva_leche: false,
      lleva_extras: false,
      lleva_proteina: false,
    })
    setUsandoCategoriaNueva(false)
    setImagen(null)
    setImagenPreview(null)
    setImagenParaRecortar(null)
    setEliminarImagen(false)
    setMostrarCropModal(false)
    setRecetas([])
    setMostrarFormularioReceta(false)
    setMostrarModalProducto(true)
  }

  // Abrir modal para editar producto
  const abrirModalEditar = async (producto) => {
    setProductoEditando(producto)
    const categoria = producto.categoria || ''
    const categoriasExistentes = [...new Set(productos.map(p => p.categoria))]
    setFormData({
      nombre: producto.nombre || '',
      descripcion: producto.descripcion || '',
      categoria: categoria,
      precio: producto.precio || '',
      activo: producto.activo !== undefined ? producto.activo : true,
      lleva_leche: producto.lleva_leche !== undefined ? producto.lleva_leche : false,
      lleva_extras: producto.lleva_extras !== undefined ? producto.lleva_extras : false,
      lleva_proteina: producto.lleva_proteina !== undefined ? producto.lleva_proteina : false,
    })
    // Determinar si la categoría es nueva o existente
    setUsandoCategoriaNueva(categoria && !categoriasExistentes.includes(categoria))
    // Cargar imagen existente si hay
    if (producto.id_producto && producto.tipo_imagen) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      setImagenPreview(`${apiUrl}/api/productos/imagen/${producto.id_producto}`)
    } else {
      setImagenPreview(null)
      setImagenParaRecortar(null)
    }
    setImagen(null)
    setEliminarImagen(false)
    setMostrarFormularioReceta(false)
    setMostrarModalProducto(true)
    // Las recetas se cargarán en el useEffect
  }

  // Guardar producto (crear o editar)
  const handleGuardar = async (e) => {
    e.preventDefault()
    setGuardando(true)

    try {
      // Validar que el precio sea un número válido
      const precio = parseFloat(formData.precio)
      if (isNaN(precio) || precio < 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El precio debe ser un número válido mayor o igual a 0',
          confirmButtonColor: '#10b981',
        })
        setGuardando(false)
        return
      }

      // Crear FormData para enviar datos (incluyendo imagen)
      const formDataToSend = new FormData()
      
      // Agregar campos básicos
      formDataToSend.append('nombre', formData.nombre.trim())
      if (formData.descripcion.trim()) {
        formDataToSend.append('descripcion', formData.descripcion.trim())
      }
      formDataToSend.append('categoria', formData.categoria.trim())
      formDataToSend.append('precio', precio.toString())
      formDataToSend.append('activo', formData.activo.toString())
      formDataToSend.append('lleva_leche', formData.lleva_leche.toString())
      formDataToSend.append('lleva_extras', formData.lleva_extras.toString())
      formDataToSend.append('lleva_proteina', formData.lleva_proteina.toString())

      // ⚠️ CRÍTICO: SIEMPRE enviar recetas como string JSON
      // Convertir recetas del estado al formato del backend
      // Si recetas es undefined/null, usar array vacío
      const recetasParaEnviar = recetas !== undefined && recetas !== null ? recetas : []
      
      const recetasData = recetasParaEnviar.map(receta => {
        if (receta.id_insumo) {
          // Insumo existente
          return {
            id_insumo: receta.id_insumo,
            cantidad_necesaria: parseFloat(receta.cantidad_necesaria),
            unidad_medida: receta.unidad_medida.trim(),
          }
        } else if (receta.insumo_nuevo) {
          // Insumo nuevo
          return {
            insumo_nuevo: {
              nombre: receta.insumo_nuevo.nombre.trim(),
              descripcion: receta.insumo_nuevo.descripcion?.trim() || null,
            },
            cantidad_necesaria: parseFloat(receta.cantidad_necesaria),
            unidad_medida: receta.unidad_medida.trim(),
          }
        }
        return null
      }).filter(r => r !== null)
      
      // ⚠️ CRÍTICO: Siempre enviar recetas como string JSON
      // Si está vacío al editar, eliminará todas las recetas
      // Si hay recetas, se reemplazarán todas
      const recetasJSON = JSON.stringify(recetasData)
      formDataToSend.append('recetas', recetasJSON)
      console.log('Enviando recetas:', recetasJSON)

      // Agregar imagen si hay una nueva
      // El backend espera el archivo con el nombre 'imagen'
      if (imagen) {
        // Asegurarse de que el archivo tenga el nombre correcto
        // El backend puede leer el filename y content_type del archivo
        formDataToSend.append('imagen', imagen, imagen.name)
        console.log('[DEBUG FRONTEND] Imagen a enviar:', {
          name: imagen.name,
          type: imagen.type,
          size: imagen.size,
        })
      }

      // Si se está editando y se quiere eliminar la imagen
      if (productoEditando && eliminarImagen) {
        formDataToSend.append('eliminar_imagen', 'true')
        console.log('[DEBUG FRONTEND] Marcando imagen para eliminar')
      }

      if (productoEditando) {
        // Editar producto existente
        const resultado = await editarProducto(productoEditando.id_producto, formDataToSend)
        
        // Verificar respuesta del servidor
        if (resultado?.error) {
          console.error('Error del servidor:', resultado.error)
        }
        if (resultado?.recetas_actualizadas !== undefined) {
          console.log(`Recetas actualizadas: ${resultado.recetas_actualizadas}`)
        }
        
        await Swal.fire({
          icon: 'success',
          title: '¡Producto actualizado!',
          text: 'El producto se ha actualizado correctamente',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
      } else {
        // Crear nuevo producto
        await crearProducto(formDataToSend)
        await Swal.fire({
          icon: 'success',
          title: '¡Producto creado!',
          text: 'El producto se ha creado correctamente',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
      }

      // Refrescar lista y cerrar modal
      await obtenerProductos()
      setMostrarModalProducto(false)
      setProductoEditando(null)
      setRecetas([])
      setImagen(null)
      setImagenPreview(null)
      setImagenParaRecortar(null)
      setEliminarImagen(false)
      setMostrarCropModal(false)
      setMostrarFormularioReceta(false)
    } catch (error) {
      console.error('Error al guardar producto:', error)
      const errorMsg = error.detail || error.message || 'Error al guardar el producto'
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

  // Funciones para gestionar recetas
  const abrirFormularioReceta = (receta = null) => {
    if (receta) {
      // Editar receta existente
      setRecetaEditando(receta)
      if (receta.id_insumo) {
        setFormReceta({
          tipo: 'existente',
          id_insumo: receta.id_insumo,
          cantidad_necesaria: receta.cantidad_necesaria?.toString() || '',
          unidad_medida: receta.unidad_medida || '',
          insumo_nuevo: {
            nombre: '',
            descripcion: '',
          },
        })
      } else {
        setFormReceta({
          tipo: 'nuevo',
          id_insumo: '',
          cantidad_necesaria: receta.cantidad_necesaria?.toString() || '',
          unidad_medida: receta.unidad_medida || '',
          insumo_nuevo: receta.insumo_nuevo || {
            nombre: '',
            descripcion: '',
          },
        })
      }
    } else {
      // Nueva receta
      setRecetaEditando(null)
      setFormReceta({
        tipo: 'existente',
        id_insumo: '',
        cantidad_necesaria: '',
        unidad_medida: '',
        insumo_nuevo: {
          nombre: '',
          descripcion: '',
        },
      })
    }
    setMostrarFormularioReceta(true)
  }

  const guardarReceta = () => {
    // Validar
    if (!formReceta.cantidad_necesaria || parseFloat(formReceta.cantidad_necesaria) <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La cantidad necesaria debe ser mayor a 0',
        confirmButtonColor: '#10b981',
      })
      return
    }

    if (formReceta.tipo === 'existente' && !formReceta.id_insumo) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debes seleccionar un insumo',
        confirmButtonColor: '#10b981',
      })
      return
    }

    if (formReceta.tipo === 'nuevo') {
      const nuevo = formReceta.insumo_nuevo
      if (!nuevo.nombre) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Debes completar el nombre del nuevo insumo',
          confirmButtonColor: '#10b981',
        })
        return
      }
    }

    // Validar unidad de medida (requerida en la receta)
    if (!formReceta.unidad_medida) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debes seleccionar una unidad de medida',
        confirmButtonColor: '#10b981',
      })
      return
    }

    // Guardar receta
    if (recetaEditando) {
      // Actualizar receta existente
      setRecetas(recetas.map(r => 
        r === recetaEditando ? {
          ...formReceta,
          cantidad_necesaria: parseFloat(formReceta.cantidad_necesaria),
        } : r
      ))
    } else {
      // Agregar nueva receta
      const nuevaReceta = {
        ...formReceta,
        cantidad_necesaria: parseFloat(formReceta.cantidad_necesaria),
      }
      if (formReceta.tipo === 'existente') {
        nuevaReceta.id_insumo = parseInt(formReceta.id_insumo)
        nuevaReceta.insumo_nuevo = null
      } else {
        nuevaReceta.id_insumo = null
      }
      setRecetas([...recetas, nuevaReceta])
    }

    // Limpiar formulario
    setMostrarFormularioReceta(false)
    setRecetaEditando(null)
      setFormReceta({
        tipo: 'existente',
        id_insumo: '',
        cantidad_necesaria: '',
        unidad_medida: '',
        insumo_nuevo: {
          nombre: '',
          descripcion: '',
        },
      })
  }

  const eliminarReceta = (index) => {
    setRecetas(recetas.filter((_, i) => i !== index))
  }

  const obtenerNombreInsumo = (idInsumo) => {
    const insumo = insumos.find(i => i.id_insumo === idInsumo)
    return insumo?.nombre || `Insumo #${idInsumo}`
  }

  const handleEliminar = async (idProducto) => {
    const result = await Swal.fire({
      title: '¿Desactivar producto?',
      text: 'Este producto se desactivará y no aparecerá en el punto de venta',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
    })

    if (result.isConfirmed) {
      try {
        await eliminarProducto(idProducto)
        await obtenerProductos()
        await Swal.fire({
          icon: 'success',
          title: 'Producto desactivado',
          text: 'El producto ha sido desactivado correctamente',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
      } catch (error) {
        const errorMsg = error.detail || error.message || 'Error al eliminar producto'
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600 mt-1">Gestiona tu catálogo de productos</p>
        </div>
        <button 
          onClick={abrirModalCrear}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input md:w-48"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select 
            className="input md:w-48"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option>Todos los estados</option>
            <option>Activo</option>
            <option>Inactivo</option>
          </select>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Producto
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Categoría
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Precio
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Estado
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id_producto}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{product.nombre}</p>
                      {product.descripcion && (
                        <p className="text-sm text-gray-500">{product.descripcion}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{product.categoria}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-matcha-600">
                        ${parseFloat(product.precio).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {product.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirModalEditar(product)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          aria-label="Editar"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleEliminar(product.id_producto)}
                          className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear/Editar Producto */}
      {mostrarModalProducto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => {
                  setMostrarModalProducto(false)
                  setProductoEditando(null)
                  setRecetas([])
                  setImagen(null)
                  setImagenPreview(null)
                  setImagenParaRecortar(null)
                  setEliminarImagen(false)
                  setMostrarCropModal(false)
                  setMostrarFormularioReceta(false)
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
                      Nombre del Producto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="input w-full"
                      placeholder="Ej: Americano M"
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {!usandoCategoriaNueva ? (
                        <select
                          required={!usandoCategoriaNueva}
                          value={formData.categoria}
                          onChange={(e) => {
                            const categoriaSeleccionada = e.target.value
                            if (categoriaSeleccionada === 'nueva') {
                              // Usuario quiere crear nueva categoría
                              setUsandoCategoriaNueva(true)
                              setFormData({ ...formData, categoria: '' })
                            } else {
                              // Usuario seleccionó una categoría existente
                              setFormData({ ...formData, categoria: categoriaSeleccionada })
                            }
                          }}
                          className="input flex-1"
                        >
                          <option value="">Selecciona una categoría</option>
                          {categoriasUnicas.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="nueva">➕ Crear nueva categoría</option>
                        </select>
                      ) : (
                        <div className="flex gap-2 flex-1">
                          <input
                            type="text"
                            required
                            value={formData.categoria}
                            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                            className="input flex-1"
                            placeholder="Escribe el nombre de la nueva categoría"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setUsandoCategoriaNueva(false)
                              setFormData({ ...formData, categoria: '' })
                            }}
                            className="btn-outline px-3"
                            title="Volver a seleccionar categoría existente"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Precio y Estado */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.precio}
                          onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                          className="input w-full pl-8"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

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

                  {/* Lleva Leche */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.lleva_leche}
                        onChange={(e) => setFormData({ ...formData, lleva_leche: e.target.checked })}
                        className="w-4 h-4 text-matcha-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Lleva Leche</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Marca esta opción si el producto contiene leche
                    </p>
                  </div>

                  {/* Lleva Extras */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.lleva_extras}
                        onChange={(e) => setFormData({ ...formData, lleva_extras: e.target.checked })}
                        className="w-4 h-4 text-matcha-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Lleva Extras</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Marca esta opción si el producto permite agregar extras (Tocino, huevo, jamón, chorizo)
                    </p>
                  </div>

                  {/* Lleva Proteína */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.lleva_proteina}
                        onChange={(e) => setFormData({ ...formData, lleva_proteina: e.target.checked })}
                        className="w-4 h-4 text-matcha-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Lleva Proteína/Creatina</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      Marca esta opción si el producto permite seleccionar proteína o creatina (para categoría runner_proteina)
                    </p>
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
                      placeholder="Ej: Pa' empezar el día."
                    />
                  </div>

                  {/* Imagen del Producto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imagen del Producto <span className="text-gray-400">(Opcional)</span>
                    </label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            // Validar tipo
                            if (!file.type.match('image/(jpeg|jpg|png|webp)')) {
                              Swal.fire({
                                icon: 'error',
                                title: 'Formato no permitido',
                                text: 'Solo se permiten imágenes JPEG, PNG o WebP',
                                confirmButtonColor: '#10b981',
                              })
                              e.target.value = ''
                              return
                            }
                            
                            // Validar tamaño (5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              Swal.fire({
                                icon: 'error',
                                title: 'Imagen demasiado grande',
                                text: 'El tamaño máximo permitido es 5MB',
                                confirmButtonColor: '#10b981',
                              })
                              e.target.value = ''
                              return
                            }
                            
                            // Guardar el archivo y preparar para recorte
                            setImagen(file)
                            setEliminarImagen(false)
                            
                            // Crear preview temporal
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setImagenPreview(reader.result)
                              // Guardar la imagen para recortar
                              setImagenParaRecortar(reader.result)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="input w-full"
                        id="imagen-producto-input"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          // Si hay una imagen seleccionada, abrir modal de recorte
                          if (imagenParaRecortar) {
                            setMostrarCropModal(true)
                          } else if (imagenPreview) {
                            // Si hay preview pero no imagenParaRecortar, cargarla
                            setImagenParaRecortar(imagenPreview)
                            setMostrarCropModal(true)
                          } else if (imagen) {
                            // Si hay archivo pero no preview, crear preview primero
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setImagenPreview(reader.result)
                              setImagenParaRecortar(reader.result)
                              setMostrarCropModal(true)
                            }
                            reader.readAsDataURL(imagen)
                          } else {
                            Swal.fire({
                              icon: 'info',
                              title: 'No hay imagen',
                              text: 'Primero selecciona una imagen',
                              confirmButtonColor: '#10b981',
                            })
                          }
                        }}
                        className={`w-full btn-outline flex items-center justify-center gap-2 ${
                          (!imagen && !imagenPreview) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={!imagen && !imagenPreview}
                      >
                        <Edit className="w-4 h-4" />
                        Editar Imagen
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos: JPEG, PNG, WebP. Máximo 5MB. Selecciona una imagen y luego haz clic en "Editar Imagen" para recortarla.
                    </p>
                    
                    {/* Preview de imagen */}
                    {imagenPreview && (
                      <div className="mt-3 relative inline-block">
                        <img
                          src={imagenPreview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                        />
                        {productoEditando && (
                          <button
                            type="button"
                            onClick={() => {
                              setImagen(null)
                              setImagenPreview(null)
                              setImagenParaRecortar(null)
                              setEliminarImagen(true)
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            title="Eliminar imagen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección de Recetas - Ocupa todo el ancho */}
              <div className="pt-6 border-t border-gray-200 mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Recetas (Insumos) <span className="text-gray-400">(Opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => abrirFormularioReceta()}
                    className="btn-outline text-sm py-1 px-3 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Receta
                  </button>
                </div>

                {/* Lista de recetas */}
                {recetas.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {recetas.map((receta, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {receta.id_insumo 
                              ? obtenerNombreInsumo(receta.id_insumo)
                              : receta.insumo_nuevo?.nombre || 'Nuevo insumo'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Cantidad: {receta.cantidad_necesaria} {receta.unidad_medida || ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => abrirFormularioReceta(receta)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarReceta(index)}
                            className="p-1 rounded hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario de receta */}
                {mostrarFormularioReceta && (
                  <div className="p-4 bg-matcha-50 rounded-lg border border-matcha-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">
                        {recetaEditando ? 'Editar Receta' : 'Nueva Receta'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarFormularioReceta(false)
                          setRecetaEditando(null)
                        }}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    {/* Tipo de insumo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de Insumo
                      </label>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tipo_insumo"
                            checked={formReceta.tipo === 'existente'}
                            onChange={() => setFormReceta({ ...formReceta, tipo: 'existente' })}
                            className="w-4 h-4 text-matcha-600"
                          />
                          <span className="text-sm text-gray-700">Insumo Existente</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tipo_insumo"
                            checked={formReceta.tipo === 'nuevo'}
                            onChange={() => setFormReceta({ ...formReceta, tipo: 'nuevo' })}
                            className="w-4 h-4 text-matcha-600"
                          />
                          <span className="text-sm text-gray-700">Crear Nuevo Insumo</span>
                        </label>
                      </div>
                    </div>

                    {/* Insumo existente */}
                    {formReceta.tipo === 'existente' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Insumo <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={formReceta.id_insumo}
                          onChange={(e) => setFormReceta({ ...formReceta, id_insumo: e.target.value })}
                          className="input w-full"
                        >
                          <option value="">Selecciona un insumo</option>
                          {insumos
                            .filter(i => i.activo)
                            .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }))
                            .map(insumo => (
                              <option key={insumo.id_insumo} value={insumo.id_insumo}>
                                {insumo.nombre} ({insumo.unidad_medida})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Insumo nuevo */}
                    {formReceta.tipo === 'nuevo' && (
                      <div className="space-y-3 p-3 bg-white rounded-lg border border-gray-200">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Datos del Nuevo Insumo</h4>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nombre <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formReceta.insumo_nuevo.nombre}
                            onChange={(e) => setFormReceta({
                              ...formReceta,
                              insumo_nuevo: { ...formReceta.insumo_nuevo, nombre: e.target.value }
                            })}
                            className="input w-full text-sm"
                            placeholder="Ej: Canela en polvo"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Descripción <span className="text-gray-400">(Opcional)</span>
                          </label>
                          <input
                            type="text"
                            value={formReceta.insumo_nuevo.descripcion}
                            onChange={(e) => setFormReceta({
                              ...formReceta,
                              insumo_nuevo: { ...formReceta.insumo_nuevo, descripcion: e.target.value }
                            })}
                            className="input w-full text-sm"
                            placeholder="Descripción del insumo"
                          />
                        </div>
                      </div>
                    )}

                    {/* Cantidad necesaria */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad Necesaria <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formReceta.cantidad_necesaria}
                        onChange={(e) => setFormReceta({ ...formReceta, cantidad_necesaria: e.target.value })}
                        className="input w-full"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Unidad de medida */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unidad de Medida <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formReceta.unidad_medida}
                        onChange={(e) => setFormReceta({ ...formReceta, unidad_medida: e.target.value })}
                        className="input w-full"
                      >
                        <option value="">Selecciona una unidad</option>
                        {unidadesMedida.map(unidad => (
                          <option key={unidad} value={unidad}>
                            {unidad.charAt(0).toUpperCase() + unidad.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Botones del formulario de receta */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarFormularioReceta(false)
                          setRecetaEditando(null)
                        }}
                        className="btn-outline flex-1 text-sm py-2"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={guardarReceta}
                        className="btn-primary flex-1 text-sm py-2"
                      >
                        {recetaEditando ? 'Actualizar' : 'Agregar'} Receta
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalProducto(false)
                    setProductoEditando(null)
                    setRecetas([])
                    setImagen(null)
                    setImagenPreview(null)
                    setImagenParaRecortar(null)
                    setEliminarImagen(false)
                    setMostrarCropModal(false)
                    setMostrarFormularioReceta(false)
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
                    productoEditando ? 'Actualizar' : 'Crear'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recorte de Imagen - Fuera del modal del producto para evitar problemas de z-index */}
      {mostrarCropModal && imagenParaRecortar && (
        <>
          {console.log('Renderizando ImageCropModal', { mostrarCropModal, tieneImagen: !!imagenParaRecortar })}
          <ImageCropModal
            imageSrc={imagenParaRecortar}
            onCropComplete={(croppedFile) => {
              console.log('Imagen recortada recibida')
              setImagen(croppedFile)
              setEliminarImagen(false)
              // Crear preview de la imagen recortada
              const reader = new FileReader()
              reader.onloadend = () => {
                setImagenPreview(reader.result)
              }
              reader.readAsDataURL(croppedFile)
            }}
            onClose={() => {
              console.log('Cerrando modal de recorte')
              setMostrarCropModal(false)
              setImagenParaRecortar(null)
            }}
          />
        </>
      )}
      {console.log('Estado actual:', { mostrarCropModal, tieneImagen: !!imagenParaRecortar })}
    </div>
  )
}

export default Productos




