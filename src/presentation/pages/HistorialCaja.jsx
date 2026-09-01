import { useState, useEffect } from 'react'
import { cajaService } from '../../application/services/cajaService'
import { History, Loader2 } from 'lucide-react'

const formatMoney = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)

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
    <div className={embedded ? '' : 'p-6'}>
      {!embedded && (
        <div className="flex items-center gap-3 mb-6">
          <History className="w-8 h-8 text-matcha-500" />
          <h1 className="text-2xl font-bold text-coffee-800">Historial de Caja</h1>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mb-6">
        <input type="date" value={filtros.fecha_desde} onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })} className="border rounded px-3 py-2" />
        <input type="date" value={filtros.fecha_hasta} onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })} className="border rounded px-3 py-2" />
        <button onClick={cargar} className="bg-matcha-500 text-white px-4 py-2 rounded">Filtrar</button>
      </div>

      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin text-matcha-500" />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-coffee-800 text-white">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Apertura</th>
                <th className="p-3 text-left">Cierre</th>
                <th className="p-3 text-right">Inicial</th>
                <th className="p-3 text-right">Esperado</th>
                <th className="p-3 text-right">Contado</th>
                <th className="p-3 text-right">Diferencia</th>
                <th className="p-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sesiones.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-400">
                    No hay sesiones de caja en este periodo
                  </td>
                </tr>
              )}
              {sesiones.map((s) => (
                <tr key={s.id_sesion_caja} className={`border-b ${s.diferencia && Math.abs(s.diferencia) > 0 ? 'bg-red-50' : ''}`}>
                  <td className="p-3">{new Date(s.fecha_apertura).toLocaleDateString('es-MX')}</td>
                  <td className="p-3">{s.nombre_usuario_apertura}</td>
                  <td className="p-3">{s.nombre_usuario_cierre || '—'}</td>
                  <td className="p-3 text-right">{formatMoney(s.monto_inicial)}</td>
                  <td className="p-3 text-right">{formatMoney(s.monto_esperado)}</td>
                  <td className="p-3 text-right">{formatMoney(s.monto_contado)}</td>
                  <td className={`p-3 text-right font-medium ${s.diferencia < 0 ? 'text-red-600' : s.diferencia > 0 ? 'text-green-600' : ''}`}>
                    {formatMoney(s.diferencia)}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${s.estado === 'abierta' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                      {s.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default HistorialCaja
