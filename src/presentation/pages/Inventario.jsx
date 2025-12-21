import { AlertTriangle, CheckCircle, Package } from 'lucide-react'

const Inventario = () => {
  const items = [
    {
      id: 1,
      name: 'Café en Grano',
      category: 'Insumos',
      stock: 45,
      minStock: 20,
      unit: 'kg',
      status: 'ok',
    },
    {
      id: 2,
      name: 'Leche',
      category: 'Lácteos',
      stock: 8,
      minStock: 15,
      unit: 'litros',
      status: 'low',
    },
    {
      id: 3,
      name: 'Azúcar',
      category: 'Endulzantes',
      stock: 25,
      minStock: 10,
      unit: 'kg',
      status: 'ok',
    },
    {
      id: 4,
      name: 'Vasos Desechables',
      category: 'Utensilios',
      stock: 5,
      minStock: 50,
      unit: 'paquetes',
      status: 'critical',
    },
  ]

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
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
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
                {items.filter(i => i.status === 'low').length}
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
                {items.filter(i => i.status === 'critical').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de inventario */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Items de Inventario
          </h2>
          <button className="btn-primary">Agregar Item</button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-2 rounded-lg ${getStatusColor(item.status)}`}>
                  {getStatusIcon(item.status)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {item.stock} {item.unit}
                  </p>
                  <p className="text-xs text-gray-500">
                    Mín: {item.minStock} {item.unit}
                  </p>
                </div>
                <div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      item.status
                    )}`}
                  >
                    {item.status === 'ok'
                      ? 'Normal'
                      : item.status === 'low'
                      ? 'Bajo'
                      : 'Crítico'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button className="btn-outline text-sm py-1 px-3">
                  Actualizar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Inventario

