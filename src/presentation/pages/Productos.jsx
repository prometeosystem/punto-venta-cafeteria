import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { proveedoresService } from '../../application/services/proveedoresService'
import Swal from 'sweetalert2'

const Productos = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas las categorías')
  const [selectedProveedor, setSelectedProveedor] = useState('todos')
  const [filtroLista, setFiltroLista] = useState('todos')
  const [filtroArea, setFiltroArea] = useState('todos')
  const [proveedores, setProveedores] = useState([])
  const [idsProductoProveedor, setIdsProductoProveedor] = useState(null)

  const { productos, loading, eliminarProducto, obtenerProductos } = useProductos()

  useEffect(() => {
    let cancelado = false
    proveedoresService
      .listar(true)
      .then((lista) => {
        if (!cancelado) setProveedores(Array.isArray(lista) ? lista : [])
      })
      .catch(() => {
        if (!cancelado) setProveedores([])
      })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (selectedProveedor === 'todos') {
      setIdsProductoProveedor(null)
      return
    }

    let cancelado = false
    proveedoresService
      .obtener(Number(selectedProveedor))
      .then((proveedor) => {
        if (cancelado) return
        const ids = new Set(
          (proveedor.items || [])
            .filter((item) => item.tipo_item === 'producto')
            .map((item) => Number(item.id_item))
        )
        setIdsProductoProveedor(ids)
      })
      .catch(() => {
        if (!cancelado) setIdsProductoProveedor(new Set())
      })

    return () => {
      cancelado = true
    }
  }, [selectedProveedor])

  const productoActivo = (product) => product.activo === 1 || product.activo === true
  const productoConFoto = (product) => Boolean(product.tipo_imagen)
  const resumenProductos = [
    { id: 'todos', label: 'Total', valor: productos.length },
    { id: 'activos', label: 'Activos', valor: productos.filter(productoActivo).length },
    { id: 'inactivos', label: 'Inactivos', valor: productos.filter((p) => !productoActivo(p)).length },
    { id: 'con-foto', label: 'Con foto', valor: productos.filter(productoConFoto).length },
    { id: 'sin-foto', label: 'Sin foto', valor: productos.filter((p) => !productoConFoto(p)).length },
  ]
  const filtrosArea = [
    { id: 'todos', label: 'Todos' },
    { id: 'barra', label: 'Barra' },
    { id: 'cocina', label: 'Cocina' },
  ]

  // Filtrar productos
  const filteredProducts = productos.filter((product) => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'Todas las categorías' || product.categoria === selectedCategory
    const matchesResumen = filtroLista === 'todos'
      || (filtroLista === 'activos' && productoActivo(product))
      || (filtroLista === 'inactivos' && !productoActivo(product))
      || (filtroLista === 'con-foto' && productoConFoto(product))
      || (filtroLista === 'sin-foto' && !productoConFoto(product))
    const matchesArea = filtroArea === 'todos'
      || (filtroArea === 'cocina' && product.area === 'cocina')
      || (filtroArea === 'barra' && product.area !== 'cocina')
    const matchesProveedor =
      !idsProductoProveedor || idsProductoProveedor.has(Number(product.id_producto))
    return matchesSearch && matchesCategory && matchesResumen && matchesArea && matchesProveedor
  })

  // Obtener categorías únicas
  const categories = ['Todas las categorías', ...new Set(productos.map(p => p.categoria))]

  const handleEliminar = async (idProducto) => {
    const result = await Swal.fire({
      title: '¿Desactivar producto?',
      text: 'Este producto se desactivará y no aparecerá en el punto de venta',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'rgb(var(--marca-500))',
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
          confirmButtonColor: 'rgb(var(--marca-500))',
          timer: 2000,
        })
      } catch (error) {
        const errorMsg = error.detail || error.message || 'Error al eliminar producto'
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
      {/* Filtros, búsqueda y alta */}
      <div className="card space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {resumenProductos.map((item) => {
            const activo = filtroLista === item.id
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltroLista(item.id === 'todos' || activo ? 'todos' : item.id)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  activo
                    ? 'border-marca-500 bg-marca-50'
                    : 'border-gray-200 bg-white hover:border-marca-300'
                }`}
              >
                <span className="block text-lg font-semibold text-gray-900 tabular-nums leading-none">
                  {item.valor}
                </span>
                <span className="mt-1 block text-xs text-gray-500">{item.label}</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0">
            {filtrosArea.map((item) => {
              const activo = filtroArea === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setFiltroArea(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    activo
                      ? 'border-marca-500 bg-marca-50 text-marca-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-marca-300'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
          <select
            className="input lg:w-48"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="input lg:w-48"
            value={selectedProveedor}
            onChange={(e) => setSelectedProveedor(e.target.value)}
          >
            <option value="todos">Todos los proveedores</option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id_proveedor} value={String(proveedor.id_proveedor)}>
                {proveedor.nombre}
              </option>
            ))}
          </select>
          <button
            onClick={() => navigate('/productos/nuevo')}
            className="btn-primary flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-marca-600" />
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
                      <span className="block text-[11px] text-gray-400">
                        {product.area === 'cocina' ? 'Cocina' : 'Barra'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-marca-600">
                        ${parseFloat(product.precio).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.activo
                            ? 'bg-marca-100 text-marca-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {product.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/productos/${product.id_producto}/editar`)}
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
    </div>
  )
}

export default Productos
