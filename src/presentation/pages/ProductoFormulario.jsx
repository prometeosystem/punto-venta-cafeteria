import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, Plus, Edit, Trash2, X } from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useInventario } from '../hooks/useInventario'
import { recetasService } from '../../application/services/recetasService'
import { opcionesProductoService } from '../../application/services/opcionesProductoService'
import { notificarOpcionesActualizadas } from '../hooks/useOpcionesProducto'
import { esProductoComida } from '../utils/productOptionsConfig'
import { API_BASE_URL } from '../../infrastructure/api'
import Swal from 'sweetalert2'
import ImageCropModal from '../components/ImageCropModal'
import VinculosProveedores from '../components/VinculosProveedores'
import { proveedoresService } from '../../application/services/proveedoresService'
import { usePreferencias } from '../context/PreferenciasContext'

const claveBorradorProducto = (idProducto) => `borrador-producto-${idProducto || 'nuevo'}`

const leerBorradorProducto = (idProducto) => {
  try {
    const raw = sessionStorage.getItem(claveBorradorProducto(idProducto))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Grupos con banderas en tablas propias
const GRUPOS_CON_BANDERA = {
  leche: 'lleva_leche',
  extras: 'lleva_extras',
  proteina: 'lleva_proteina',
}

const ProductoFormulario = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { idProducto } = useParams()
  const esEdicion = Boolean(idProducto)
  const { modoTienda } = usePreferencias()
  const conservarBorrador = useRef(Boolean(leerBorradorProducto(idProducto)))
  const borradorActivo = useRef(true)
  const codigoBarrasRef = useRef(null)

  const [formData, setFormData] = useState(() => {
    const borrador = leerBorradorProducto(idProducto)
    if (borrador?.formData) return borrador.formData
    return {
    nombre: '',
    descripcion: '',
    categoria: '',
    precio: '',
    activo: true,
    lleva_leche: false,
    lleva_extras: false,
    lleva_proteina: false,
    area: 'barra',
    codigo_barras: '',
    precio_compra: '',
    stock_actual: '',
    stock_minimo: '',
    es_reventa: false,
  }
  })

  const [usandoCategoriaNueva, setUsandoCategoriaNueva] = useState(
    () => !idProducto && !!leerBorradorProducto(idProducto)?.usandoCategoriaNueva
  )
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [imagen, setImagen] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [eliminarImagen, setEliminarImagen] = useState(false)
  const [mostrarCropModal, setMostrarCropModal] = useState(false)
  const [imagenParaRecortar, setImagenParaRecortar] = useState(null)
  const [recetas, setRecetas] = useState(() => leerBorradorProducto(idProducto)?.recetas || [])
  const [mostrarFormularioReceta, setMostrarFormularioReceta] = useState(false)
  const [recetaEditando, setRecetaEditando] = useState(null)
  const [formReceta, setFormReceta] = useState({
    tipo: 'existente',
    id_insumo: '',
    cantidad_necesaria: '',
    unidad_medida: '',
    insumo_nuevo: {
      nombre: '',
      descripcion: '',
    },
  })

  const [listaProveedores, setListaProveedores] = useState([])
  const [vinculosProveedores, setVinculosProveedores] = useState(
    () => leerBorradorProducto(idProducto)?.vinculosProveedores || []
  )
  const [gruposOpcion, setGruposOpcion] = useState([])
  const [gruposMarcados, setGruposMarcados] = useState(
    () => leerBorradorProducto(idProducto)?.gruposMarcados || []
  )

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

  const { productos, crearProducto, editarProducto, obtenerProducto } = useProductos()
  const { insumos } = useInventario()

  // Cargar grupos de opciones
  useEffect(() => {
    opcionesProductoService
      .listarGrupos(true)
      .then((lista) => setGruposOpcion(Array.isArray(lista) ? lista : []))
      .catch((error) => console.error('Error al cargar los grupos de opciones:', error))
  }, [])

  // Cargar catálogo de proveedores
  const cargarProveedoresCatalogo = async () => {
    try {
      const lista = await proveedoresService.listar(true)
      setListaProveedores(Array.isArray(lista) ? lista : [])
    } catch {
      setListaProveedores([])
    }
  }

  useEffect(() => {
    cargarProveedoresCatalogo()
  }, [])

  useEffect(() => {
    if (cargando || !borradorActivo.current) return
    sessionStorage.setItem(
      claveBorradorProducto(idProducto),
      JSON.stringify({
        formData,
        usandoCategoriaNueva,
        recetas,
        vinculosProveedores,
        gruposMarcados,
      })
    )
  }, [cargando, idProducto, formData, usandoCategoriaNueva, recetas, vinculosProveedores, gruposMarcados])

  useEffect(() => {
    const idNuevo = location.state?.proveedorCreado
    if (!idNuevo) return
    setVinculosProveedores((prev) => {
      if (prev.some((v) => Number(v.id_proveedor) === Number(idNuevo))) return prev
      return [
        ...prev,
        {
          id_proveedor: Number(idNuevo),
          precio_compra: '',
          es_preferido: prev.length === 0,
        },
      ]
    })
    cargarProveedoresCatalogo()
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    codigoBarrasRef.current?.focus()
  }, [])

  const irACrearProveedor = () => {
    navigate('/proveedores', {
      state: { volverA: location.pathname, abrirAlta: true },
    })
  }

  // Cargar producto si es edición
  useEffect(() => {
    const cargarProducto = async () => {
      if (!esEdicion) return

      setCargando(true)
      try {
        const producto = await obtenerProducto(idProducto)
        if (!producto) {
          await Swal.fire({
            icon: 'error',
            title: 'Producto no encontrado',
            text: 'El producto que buscas no existe',
            confirmButtonColor: 'rgb(var(--marca-500))',
          })
          navigate('/productos')
          return
        }

        const categoria = producto.categoria || ''

        if (producto.tipo_imagen) {
          setImagenPreview(`${API_BASE_URL}/api/productos/imagen/${idProducto}`)
        }

        if (conservarBorrador.current) return

        setFormData({
          nombre: producto.nombre || '',
          descripcion: producto.descripcion || '',
          categoria: categoria,
          precio: producto.precio || '',
          // MySQL suele mandar 0/1; los radios comparan con booleanos
          activo:
            producto.activo == null
              ? true
              : !(producto.activo === false || producto.activo === 0 || producto.activo === '0'),
          lleva_leche: producto.lleva_leche !== undefined ? producto.lleva_leche : false,
          lleva_extras: producto.lleva_extras !== undefined ? producto.lleva_extras : false,
          lleva_proteina: producto.lleva_proteina !== undefined ? producto.lleva_proteina : false,
          area: producto.area || 'barra',
          codigo_barras: producto.codigo_barras || '',
          precio_compra: producto.precio_compra ?? '',
          stock_actual: producto.stock_actual ?? '',
          stock_minimo: producto.stock_minimo ?? '',
          es_reventa: !!producto.es_reventa,
          canal: producto.canal === 'tienda' ? 'tienda' : 'restaurante',
        })

        // Cargar grupos marcados
        try {
          const asignaciones = await opcionesProductoService.gruposPorProducto()
          setGruposMarcados(asignaciones?.[idProducto] || [])
        } catch (error) {
          console.error('Error al cargar los grupos del producto:', error)
        }

        // Cargar recetas
        if (producto?.recetas && Array.isArray(producto.recetas)) {
          const recetasMapeadas = producto.recetas.map((receta) => ({
            id_insumo: receta.id_insumo,
            cantidad_necesaria:
              receta.cantidad_necesaria?.toString() ||
              parseFloat(receta.cantidad_necesaria || 0).toString(),
            unidad_medida: receta.unidad_medida || '',
            insumo_nuevo: null,
            tipo: 'existente',
          }))
          setRecetas(recetasMapeadas)
        }

        // Cargar vínculos con proveedores
        try {
          const vins = await proveedoresService.proveedoresDeItem('producto', idProducto)
          setVinculosProveedores(
            (Array.isArray(vins) ? vins : []).map((v) => ({
              id_proveedor: v.id_proveedor,
              precio_compra: v.precio_compra ?? '',
              es_preferido: !!v.es_preferido,
            }))
          )
        } catch {
          setVinculosProveedores([])
        }
      } catch (error) {
        console.error('Error al cargar producto:', error)
        await Swal.fire({
          icon: 'error',
          title: 'Error al cargar',
          text: 'No se pudo cargar el producto',
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        navigate('/productos')
      } finally {
        setCargando(false)
      }
    }

    cargarProducto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idProducto, esEdicion])

  const alternarGrupo = useCallback((idGrupo) => {
    setGruposMarcados((prev) =>
      prev.includes(idGrupo) ? prev.filter((id) => id !== idGrupo) : [...prev, idGrupo]
    )
  }, [])

  const guardarGrupos = async (idProd) => {
    try {
      await opcionesProductoService.asignarGruposAProducto(idProd, gruposMarcados)
      notificarOpcionesActualizadas()
    } catch (error) {
      console.error('Error al guardar los grupos del producto:', error)
      await Swal.fire({
        icon: 'warning',
        title: 'El producto se guardó, pero sus opciones no',
        text:
          error?.response?.data?.detail || 'Vuelve a abrir el producto e inténtalo de nuevo.',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    }
  }

  const categoriasUnicas = [...new Set(productos.map((p) => p.categoria).filter(Boolean))]
  const opcionesCategoria = formData.categoria && !categoriasUnicas.includes(formData.categoria)
    ? [formData.categoria, ...categoriasUnicas]
    : categoriasUnicas

  const areaSugerida = (categoria) => {
    const enCategoria = productos.filter((p) => p.categoria === categoria)
    if (!enCategoria.length) return esProductoComida(categoria) ? 'cocina' : 'barra'
    const enCocina = enCategoria.filter((p) => p.area === 'cocina').length
    return enCocina > enCategoria.length / 2 ? 'cocina' : 'barra'
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    setGuardando(true)

    try {
      const precio = parseFloat(formData.precio)
      if (isNaN(precio) || precio < 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Error de validación',
          text: 'El precio debe ser un número válido mayor o igual a 0',
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        setGuardando(false)
        return
      }

      const formDataToSend = new FormData()

      formDataToSend.append('nombre', formData.nombre.trim())
      if (formData.descripcion.trim()) {
        formDataToSend.append('descripcion', formData.descripcion.trim())
      }
      formDataToSend.append('categoria', formData.categoria.trim())
      formDataToSend.append('precio', precio.toString())
      formDataToSend.append('activo', (esEdicion ? formData.activo : true).toString())
      formDataToSend.append(
        'canal',
        esEdicion ? (formData.canal === 'tienda' ? 'tienda' : 'restaurante') : (modoTienda ? 'tienda' : 'restaurante'),
      )
      if (!modoTienda) formDataToSend.append('area', formData.area)
      formDataToSend.append('codigo_barras', (formData.codigo_barras || '').trim())
      const esReventa = modoTienda ? true : !!formData.es_reventa
      formDataToSend.append('es_reventa', esReventa.toString())
      if (formData.precio_compra !== '' && formData.precio_compra != null) {
        formDataToSend.append('precio_compra', String(formData.precio_compra))
      }
      if (formData.stock_actual !== '' && formData.stock_actual != null) {
        formDataToSend.append('stock_actual', String(formData.stock_actual))
      }
      if (formData.stock_minimo !== '' && formData.stock_minimo != null) {
        formDataToSend.append('stock_minimo', String(formData.stock_minimo))
      }

      if (!modoTienda) {
        const clavesMarcadas = new Set(
          gruposOpcion.filter((g) => gruposMarcados.includes(g.id_grupo)).map((g) => g.clave)
        )
        Object.entries(GRUPOS_CON_BANDERA).forEach(([clave, bandera]) => {
          formDataToSend.append(bandera, clavesMarcadas.has(clave).toString())
        })
      }

      const recetasParaEnviar = modoTienda
        ? null
        : recetas !== undefined && recetas !== null
          ? recetas
          : []

      const recetasData = (recetasParaEnviar || [])
        .map((receta) => {
          if (receta.id_insumo) {
            return {
              id_insumo: receta.id_insumo,
              cantidad_necesaria: parseFloat(receta.cantidad_necesaria),
              unidad_medida: receta.unidad_medida.trim(),
            }
          } else if (receta.insumo_nuevo) {
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
        })
        .filter((r) => r !== null)

      if (recetasParaEnviar !== null) {
        const recetasJSON = JSON.stringify(recetasData)
        formDataToSend.append('recetas', recetasJSON)
      }

      if (imagen) {
        formDataToSend.append('imagen', imagen, imagen.name)
      }

      if (esEdicion && eliminarImagen) {
        formDataToSend.append('eliminar_imagen', 'true')
      }

      if (esEdicion) {
        await editarProducto(idProducto, formDataToSend)
        if (!modoTienda) await guardarGrupos(idProducto)
        await proveedoresService.sincronizarItem('producto', idProducto, vinculosProveedores)

        await Swal.fire({
          icon: 'success',
          title: '¡Producto actualizado!',
          text: 'El producto se ha actualizado correctamente',
          confirmButtonColor: 'rgb(var(--marca-500))',
          timer: 2000,
          position: 'top',
        })
      } else {
        const creado = await crearProducto(formDataToSend)
        if (creado?.id_producto) {
          if (!modoTienda) await guardarGrupos(creado.id_producto)
          await proveedoresService.sincronizarItem(
            'producto',
            creado.id_producto,
            vinculosProveedores
          )
        }
        await Swal.fire({
          icon: 'success',
          title: '¡Producto creado!',
          text: 'El producto se ha creado correctamente',
          confirmButtonColor: 'rgb(var(--marca-500))',
          timer: 2000,
          position: 'top',
        })
      }

      borradorActivo.current = false
      sessionStorage.removeItem(claveBorradorProducto(idProducto))
      navigate('/productos')
    } catch (error) {
      console.error('Error al guardar producto:', error)
      const errorMsg = error.detail || error.message || 'Error al guardar el producto'
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

  const abrirFormularioReceta = (receta = null) => {
    if (receta) {
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
    if (!formReceta.cantidad_necesaria || parseFloat(formReceta.cantidad_necesaria) <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La cantidad necesaria debe ser mayor a 0',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }

    if (formReceta.tipo === 'existente' && !formReceta.id_insumo) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debes seleccionar un insumo',
        confirmButtonColor: 'rgb(var(--marca-500))',
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
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        return
      }
    }

    if (!formReceta.unidad_medida) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debes seleccionar una unidad de medida',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }

    if (recetaEditando) {
      setRecetas(
        recetas.map((r) =>
          r === recetaEditando
            ? {
                ...formReceta,
                cantidad_necesaria: parseFloat(formReceta.cantidad_necesaria),
              }
            : r
        )
      )
    } else {
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
    const insumo = insumos.find((i) => i.id_insumo === idInsumo)
    return insumo?.nombre || `Insumo #${idInsumo}`
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-marca-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barra superior sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            borradorActivo.current = false
            sessionStorage.removeItem(claveBorradorProducto(idProducto))
            navigate('/productos')
          }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 flex-1 truncate">
          {esEdicion ? 'Editar producto' : 'Nuevo producto'}
        </h1>
        <button
          type="submit"
          form="form-producto"
          disabled={guardando}
          className="btn-primary py-2 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
        >
          {guardando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando…
            </>
          ) : (
            'Guardar'
          )}
        </button>
      </div>

      {/* Contenido del formulario con scroll */}
      <form
        id="form-producto"
        onSubmit={handleGuardar}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-6"
      >
        {/* Sección: Datos básicos */}
        <section className="card">
          <div className="space-y-4">
            <div>
              <label className="campo-label" htmlFor="codigo-barras-producto">
                Código de barras
              </label>
              <input
                id="codigo-barras-producto"
                ref={codigoBarrasRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formData.codigo_barras}
                onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  document.getElementById('nombre-producto')?.focus()
                }}
                className="campo w-full"
                placeholder="Escanea o escribe el código"
              />
            </div>

            <div>
              <label className="campo-label" htmlFor="nombre-producto">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre-producto"
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="campo w-full"
                placeholder="Ej: Americano M"
              />
            </div>

            <div>
              <label className="campo-label">
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
                        setUsandoCategoriaNueva(true)
                        setFormData({ ...formData, categoria: '' })
                      } else {
                        setFormData({
                          ...formData,
                          categoria: categoriaSeleccionada,
                          ...(!esEdicion && categoriaSeleccionada
                            ? { area: areaSugerida(categoriaSeleccionada) }
                            : {}),
                        })
                      }
                    }}
                    className="campo flex-1"
                  >
                    <option value="">Selecciona una categoría</option>
                    {opcionesCategoria.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
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
                      className="campo flex-1"
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

            {!modoTienda && (
            <div>
              <label className="campo-label">
                Área de preparación
              </label>
              <div className="grid grid-cols-2 gap-2 max-w-xs">
                {[
                  { id: 'cocina', texto: 'Cocina' },
                  { id: 'barra', texto: 'Barra' },
                ].map(({ id, texto }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormData({ ...formData, area: id })}
                    className={`py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      formData.area === id
                        ? 'border-marca-500 bg-marca-50 text-marca-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                En Comandas, cada área solo ve sus productos.
              </p>
            </div>
            )}

            <div className={esEdicion ? 'grid grid-cols-2 gap-4' : ''}>
              <div>
                <label className="campo-label">
                  Precio <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]">
                    $
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    className="campo w-full pl-8"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {esEdicion && (
              <div>
                <label className="campo-label">Estado</label>
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
              )}
            </div>

            {!modoTienda && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!formData.es_reventa}
                onChange={(e) => setFormData({ ...formData, es_reventa: e.target.checked })}
              />
              Producto de reventa (stock propio, sin receta)
            </label>
            )}

            {(modoTienda || formData.es_reventa) && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="campo-label">
                    Costo compra
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="campo w-full"
                    value={formData.precio_compra}
                    onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value })}
                  />
                </div>
                <div>
                  <label className="campo-label">Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="campo w-full"
                    value={formData.stock_actual}
                    onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                  />
                </div>
                <div>
                  <label className="campo-label">
                    Stock mín.
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="campo w-full"
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="campo-label">
                Descripción <span className="text-gray-400">(Opcional)</span>
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="campo w-full resize-none"
                rows={3}
                placeholder="Ej: Pa' empezar el día."
              />
            </div>
          </div>
        </section>

        {/* Sección: Imagen */}
        <section className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Imagen</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    if (!file.type.match('image/(jpeg|jpg|png|webp)')) {
                      Swal.fire({
                        icon: 'error',
                        title: 'Formato no permitido',
                        text: 'Solo se permiten imágenes JPEG, PNG o WebP',
                        confirmButtonColor: 'rgb(var(--marca-500))',
                      })
                      e.target.value = ''
                      return
                    }

                    if (file.size > 5 * 1024 * 1024) {
                      Swal.fire({
                        icon: 'error',
                        title: 'Imagen demasiado grande',
                        text: 'El tamaño máximo permitido es 5MB',
                        confirmButtonColor: 'rgb(var(--marca-500))',
                      })
                      e.target.value = ''
                      return
                    }

                    setImagen(file)
                    setEliminarImagen(false)

                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setImagenPreview(reader.result)
                      setImagenParaRecortar(reader.result)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                className="campo w-full"
                id="imagen-producto-input"
              />
              <button
                type="button"
                onClick={() => {
                  if (imagenParaRecortar) {
                    setMostrarCropModal(true)
                  } else if (imagenPreview) {
                    setImagenParaRecortar(imagenPreview)
                    setMostrarCropModal(true)
                  } else if (imagen) {
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
                      confirmButtonColor: 'rgb(var(--marca-500))',
                    })
                  }
                }}
                className={`w-full btn-outline flex items-center justify-center gap-2 ${
                  !imagen && !imagenPreview ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!imagen && !imagenPreview}
              >
                <Edit className="w-4 h-4" />
                Editar Imagen
              </button>
              <p className="text-xs text-gray-500">
                Formatos: JPEG, PNG, WebP. Máximo 5MB. Selecciona una imagen y luego haz clic en
                "Editar Imagen" para recortarla.
              </p>
            </div>

            {imagenPreview && (
              <div className="relative">
                <img
                  src={imagenPreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                />
                {esEdicion && (
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
        </section>

        {!modoTienda && (
        <>
        {/* Sección: Opciones del producto */}
        <section className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-2">Opciones del producto</h2>
          <p className="text-xs text-gray-500 mb-3">
            Al agregar el producto en el punto de venta sólo aparecerán los grupos marcados aquí.
            Sus opciones y precios se editan en Configuración.
          </p>

          {gruposOpcion.length === 0 ? (
            <p className="text-xs text-gray-400">Cargando grupos...</p>
          ) : (
            <div className="space-y-2">
              {gruposOpcion.map((grupo) => {
                const marcado = gruposMarcados.includes(grupo.id_grupo)
                const opciones = (grupo.opciones || []).filter((o) => o.activo)
                return (
                  <label
                    key={grupo.id_grupo}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      marcado ? 'border-marca-400 bg-marca-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternarGrupo(grupo.id_grupo)}
                      className="w-4 h-4 mt-0.5 text-marca-600 rounded"
                    />
                    <span className="min-w-0">
                      <span className="text-sm font-medium text-gray-700">{grupo.nombre}</span>
                      <span className="ml-2 text-[11px] text-gray-400">
                        {grupo.seleccion === 'unica' ? 'elige una' : 'varias'}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {opciones.length
                          ? opciones.map((o) => o.nombre).join(', ')
                          : 'Sin opciones configuradas'}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </section>

        {/* Sección: Recetas */}
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Recetas (insumos)</h2>
              <p className="text-xs text-gray-500">Opcional</p>
            </div>
            <button
              type="button"
              onClick={() => abrirFormularioReceta()}
              className="btn-outline text-sm py-1 px-3 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Agregar Receta
            </button>
          </div>

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

          {mostrarFormularioReceta && (
            <div className="p-4 bg-marca-50 rounded-lg border border-marca-200 space-y-4">
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

              <div>
                <label className="campo-label">
                  Tipo de Insumo
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo_insumo"
                      checked={formReceta.tipo === 'existente'}
                      onChange={() => setFormReceta({ ...formReceta, tipo: 'existente' })}
                      className="w-4 h-4 text-marca-600"
                    />
                    <span className="text-sm text-gray-700">Insumo Existente</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo_insumo"
                      checked={formReceta.tipo === 'nuevo'}
                      onChange={() => setFormReceta({ ...formReceta, tipo: 'nuevo' })}
                      className="w-4 h-4 text-marca-600"
                    />
                    <span className="text-sm text-gray-700">Crear Nuevo Insumo</span>
                  </label>
                </div>
              </div>

              {formReceta.tipo === 'existente' && (
                <div>
                  <label className="campo-label">
                    Insumo <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formReceta.id_insumo}
                    onChange={(e) => setFormReceta({ ...formReceta, id_insumo: e.target.value })}
                    className="campo w-full"
                  >
                    <option value="">Selecciona un insumo</option>
                    {insumos
                      .filter((i) => i.activo)
                      .sort((a, b) =>
                        (a.nombre || '').localeCompare(b.nombre || '', 'es', {
                          sensitivity: 'base',
                        })
                      )
                      .map((insumo) => (
                        <option key={insumo.id_insumo} value={insumo.id_insumo}>
                          {insumo.nombre} ({insumo.unidad_medida})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {formReceta.tipo === 'nuevo' && (
                <div className="space-y-3 p-3 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">
                    Datos del Nuevo Insumo
                  </h4>
                  <div>
                    <label className="campo-label">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formReceta.insumo_nuevo.nombre}
                      onChange={(e) =>
                        setFormReceta({
                          ...formReceta,
                          insumo_nuevo: { ...formReceta.insumo_nuevo, nombre: e.target.value },
                        })
                      }
                      className="campo w-full text-sm"
                      placeholder="Ej: Canela en polvo"
                    />
                  </div>
                  <div>
                    <label className="campo-label">
                      Descripción <span className="text-gray-400">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formReceta.insumo_nuevo.descripcion}
                      onChange={(e) =>
                        setFormReceta({
                          ...formReceta,
                          insumo_nuevo: {
                            ...formReceta.insumo_nuevo,
                            descripcion: e.target.value,
                          },
                        })
                      }
                      className="campo w-full text-sm"
                      placeholder="Descripción del insumo"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="campo-label">
                  Cantidad Necesaria <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formReceta.cantidad_necesaria}
                  onChange={(e) =>
                    setFormReceta({ ...formReceta, cantidad_necesaria: e.target.value })
                  }
                  className="campo w-full"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="campo-label">
                  Unidad de Medida <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formReceta.unidad_medida}
                  onChange={(e) =>
                    setFormReceta({ ...formReceta, unidad_medida: e.target.value })
                  }
                  className="campo w-full"
                >
                  <option value="">Selecciona una unidad</option>
                  {unidadesMedida.map((unidad) => (
                    <option key={unidad} value={unidad}>
                      {unidad.charAt(0).toUpperCase() + unidad.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

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
        </section>
        </>
        )}

        {/* Sección: Proveedores */}
        <section className="card">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-base font-semibold text-gray-800">Proveedores</h2>
            <button
              type="button"
              onClick={irACrearProveedor}
              className="btn-outline text-sm py-1.5 px-3 flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Crear proveedor
            </button>
          </div>
          <VinculosProveedores
            proveedores={listaProveedores}
            vinculos={vinculosProveedores}
            onChange={setVinculosProveedores}
            compact
          />
        </section>
      </form>

      {/* Modal de Recorte de Imagen */}
      {mostrarCropModal && imagenParaRecortar && (
        <ImageCropModal
          imageSrc={imagenParaRecortar}
          onCropComplete={(croppedFile) => {
            setImagen(croppedFile)
            setEliminarImagen(false)
            const reader = new FileReader()
            reader.onloadend = () => {
              setImagenPreview(reader.result)
            }
            reader.readAsDataURL(croppedFile)
          }}
          onClose={() => {
            setMostrarCropModal(false)
            setImagenParaRecortar(null)
          }}
        />
      )}
    </div>
  )
}

export default ProductoFormulario
