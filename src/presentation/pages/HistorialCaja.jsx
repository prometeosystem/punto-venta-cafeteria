import { useState, useEffect } from 'react'
import { cajaService } from '../../application/services/cajaService'
import { Loader2 } from 'lucide-react'

const formatMoney = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)

const colorDiferencia = (diferencia) =>
  diferencia < 0 ? 'text-red-600' : diferencia > 0 ? 'text-green-600' : 'text-gray-900'

const hayDiferencia = (s) => s.diferencia && Math.abs(s.diferencia) > 0

const EstadoSesion = ({ estado }) => (
  <span
    className={`px-2 py-1 rounded text-xs ${
      estado === 'abierta' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
    }`}
  >
    {estado}
  </span>
)

const HistorialCaja = ({ embedded = false }) => {
  const [sesiones, setSesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ fecha_desde: '', fecha_hasta: '' })

  const cargar = async () => {
    setLoading(true)
    try {
      const data = await cajaService.listarSesiones(filtros)
      setSesiones(data.sesiones || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  return (
    <div className={`min-w-0 max-w-full ${embedded ? '' : 'lg:p-2'}`}>
      <div className="card mb-4 !p-3 sm:mb-6 sm:!p-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
              className="input"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
              className="input"
            />
          </div>
          <button onClick={cargar} className="btn-primary col-span-2 sm:col-span-1">
            Filtrar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-matcha-500" />
        </div>
      ) : sesiones.length === 0 ? (
        <div className="card text-center text-gray-400">No hay sesiones de caja en este periodo</div>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {sesiones.map((s) => (
              <li
                key={s.id_sesion_caja}
                className={`rounded-lg border p-3 shadow-sm ${
                  hayDiferencia(s) ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900">
                    {new Date(s.fecha_apertura).toLocaleDateString('es-MX')}
                  </p>
                  <EstadoSesion estado={s.estado} />
                </div>
                <p className="mt-1 text-xs text-gray-600 break-words">
                  Abrió {s.nombre_usuario_apertura}
                  {s.nombre_usuario_cierre ? ` · Cerró ${s.nombre_usuario_cierre}` : ''}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-500">Inicial</dt>
                    <dd className="font-medium text-gray-900">{formatMoney(s.monto_inicial)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-500">Esperado</dt>
                    <dd className="font-medium text-gray-900">{formatMoney(s.monto_esperado)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-500">Contado</dt>
                    <dd className="font-medium text-gray-900">{formatMoney(s.monto_contado)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-gray-500">Diferencia</dt>
                    <dd className={`font-semibold ${colorDiferencia(s.diferencia)}`}>{formatMoney(s.diferencia)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block min-w-0 overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-900">
                <tr>
                  <th className="p-3 text-left font-semibold">Fecha</th>
                  <th className="p-3 text-left font-semibold">Apertura</th>
                  <th className="p-3 text-left font-semibold">Cierre</th>
                  <th className="p-3 text-right font-semibold">Inicial</th>
                  <th className="p-3 text-right font-semibold">Esperado</th>
                  <th className="p-3 text-right font-semibold">Contado</th>
                  <th className="p-3 text-right font-semibold">Diferencia</th>
                  <th className="p-3 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sesiones.map((s) => (
                  <tr key={s.id_sesion_caja} className={`border-b ${hayDiferencia(s) ? 'bg-red-50' : ''}`}>
                    <td className="p-3">{new Date(s.fecha_apertura).toLocaleDateString('es-MX')}</td>
                    <td className="p-3">{s.nombre_usuario_apertura}</td>
                    <td className="p-3">{s.nombre_usuario_cierre || '—'}</td>
                    <td className="p-3 text-right">{formatMoney(s.monto_inicial)}</td>
                    <td className="p-3 text-right">{formatMoney(s.monto_esperado)}</td>
                    <td className="p-3 text-right">{formatMoney(s.monto_contado)}</td>
                    <td className={`p-3 text-right font-medium ${colorDiferencia(s.diferencia)}`}>
                      {formatMoney(s.diferencia)}
                    </td>
                    <td className="p-3">
                      <EstadoSesion estado={s.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default HistorialCaja
