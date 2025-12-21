import { Plus, Search, Edit, Trash2 } from 'lucide-react'

const Productos = () => {
  const products = [
    {
      id: 1,
      name: 'Café Americano',
      category: 'Bebidas Calientes',
      price: 15,
      stock: 50,
      status: 'activo',
    },
    {
      id: 2,
      name: 'Cappuccino',
      category: 'Bebidas Calientes',
      price: 20,
      stock: 45,
      status: 'activo',
    },
    {
      id: 3,
      name: 'Matcha Latte',
      category: 'Bebidas Calientes',
      price: 25,
      stock: 12,
      status: 'activo',
    },
    {
      id: 4,
      name: 'Croissant',
      category: 'Panadería',
      price: 18,
      stock: 0,
      status: 'inactivo',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600 mt-1">Gestiona tu catálogo de productos</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
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
            />
          </div>
          <select className="input md:w-48">
            <option>Todas las categorías</option>
            <option>Bebidas Calientes</option>
            <option>Bebidas Frías</option>
            <option>Panadería</option>
            <option>Postres</option>
          </select>
          <select className="input md:w-48">
            <option>Todos los estados</option>
            <option>Activo</option>
            <option>Inactivo</option>
          </select>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="card overflow-x-auto">
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
                Stock
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
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <p className="font-medium text-gray-900">{product.name}</p>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600">{product.category}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-matcha-600">
                    ${product.price.toFixed(2)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-sm font-medium ${
                      product.stock > 10
                        ? 'text-green-600'
                        : product.stock > 0
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {product.stock} unidades
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.status === 'activo'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {product.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Editar"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Productos

