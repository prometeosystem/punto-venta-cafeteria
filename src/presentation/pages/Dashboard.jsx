import { TrendingUp, DollarSign, Package, Users } from 'lucide-react'

const Dashboard = () => {
  const stats = [
    {
      title: 'Ventas Hoy',
      value: '$12,450',
      change: '+12.5%',
      icon: DollarSign,
      color: 'matcha',
    },
    {
      title: 'Productos Vendidos',
      value: '234',
      change: '+8.2%',
      icon: Package,
      color: 'coffee',
    },
    {
      title: 'Clientes Nuevos',
      value: '18',
      change: '+5.1%',
      icon: Users,
      color: 'green',
    },
    {
      title: 'Crecimiento',
      value: '24.8%',
      change: '+2.3%',
      icon: TrendingUp,
      color: 'matcha',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Resumen general de tu cafetería</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colorClasses = {
            matcha: 'bg-matcha-100 text-matcha-600',
            coffee: 'bg-coffee-100 text-coffee-600',
            green: 'bg-green-100 text-green-600',
          }

          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Gráficos y actividades recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ventas de la Semana
          </h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Gráfico de ventas (integrar con librería de gráficos)</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Productos Más Vendidos
          </h2>
          <div className="space-y-3">
            {[
              { name: 'Café Americano', sales: 45, revenue: '$675' },
              { name: 'Cappuccino', sales: 32, revenue: '$640' },
              { name: 'Latte', sales: 28, revenue: '$560' },
              { name: 'Matcha Latte', sales: 24, revenue: '$600' },
            ].map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.sales} ventas</p>
                </div>
                <p className="font-semibold text-matcha-600">{product.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actividades recientes */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Actividades Recientes
        </h2>
        <div className="space-y-3">
          {[
            { action: 'Nueva venta', detail: 'Pedido #1234 - $45.00', time: 'Hace 5 min' },
            { action: 'Producto agregado', detail: 'Croissant de Almendra', time: 'Hace 15 min' },
            { action: 'Cliente nuevo', detail: 'María González registrada', time: 'Hace 1 hora' },
            { action: 'Inventario actualizado', detail: 'Leche - 50 unidades', time: 'Hace 2 horas' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-500">{activity.detail}</p>
              </div>
              <p className="text-xs text-gray-400">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard

