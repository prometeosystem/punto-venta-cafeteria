import { Save, Bell, CreditCard, Store, Users } from 'lucide-react'

const Configuracion = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">Ajusta las preferencias de tu sistema</p>
      </div>

      {/* Información de la Cafetería */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-5 h-5 text-matcha-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Información de la Cafetería
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Cafetería
            </label>
            <input
              type="text"
              defaultValue="Zona 2 Coffee Recovery"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input type="text" className="input" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input type="tel" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input type="email" className="input" />
            </div>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Configuración de Pagos */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-matcha-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Métodos de Pago
          </h2>
        </div>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-gray-900">Efectivo</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-gray-900">Tarjeta de Débito/Crédito</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-gray-900">Transferencia Bancaria</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-gray-900">Pago Móvil</span>
          </label>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-matcha-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div>
              <p className="text-gray-900 font-medium">Stock Bajo</p>
              <p className="text-sm text-gray-500">
                Recibir alertas cuando el stock esté bajo
              </p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </label>
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div>
              <p className="text-gray-900 font-medium">Nuevos Pedidos</p>
              <p className="text-sm text-gray-500">
                Notificaciones cuando llegue un nuevo pedido
              </p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </label>
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div>
              <p className="text-gray-900 font-medium">Reportes Diarios</p>
              <p className="text-sm text-gray-500">
                Envío automático de reportes al final del día
              </p>
            </div>
            <input type="checkbox" className="w-4 h-4" />
          </label>
        </div>
      </div>

      {/* Usuarios */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-matcha-600" />
            <h2 className="text-lg font-semibold text-gray-900">Usuarios</h2>
          </div>
          <button className="btn-primary">Agregar Usuario</button>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Admin Principal', email: 'admin@zona2.com', role: 'Administrador' },
            { name: 'Cajero 1', email: 'cajero1@zona2.com', role: 'Cajero' },
            { name: 'Barista 1', email: 'barista1@zona2.com', role: 'Barista' },
          ].map((user, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-matcha-100 text-matcha-700 text-xs font-medium rounded">
                  {user.role}
                </span>
                <button className="text-sm text-matcha-600 hover:text-matcha-700 font-medium">
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Configuracion







