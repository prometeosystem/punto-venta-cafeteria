import { useState, useEffect } from 'react'
import { contabilidadService } from '../../application/services/contabilidadService'
import { Download, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Swal from 'sweetalert2'

const formatMoney = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)

const Contabilidad = () => {
  const [tab, setTab] = useState('diario')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      let result
      if (tab === 'diario') {
        result = await contabilidadService.resumenDiario(fecha)
      } else if (tab === 'mensual') {
        result = await contabilidadService.resumenMensual(anio, mes)
      } else {
        if (!fechaInicio || !fechaFin) {
          throw new Error('Selecciona fecha inicio y fecha fin')
        }
        result = await contabilidadService.estadoResultados(fechaInicio, fechaFin)
      }
      if (result?.error) {
        throw new Error(result.error)
      }
      setData(result)
    } catch (e) {
      const msg =
        e.response?.data?.detail ||
        e.response?.data?.error ||
        e.message ||
        'Error al consultar contabilidad'
      setError(typeof msg === 'string' ? msg : 'Error al consultar contabilidad')
      setData(null)
      if (import.meta.env.DEV) console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const exportar = async (formato) => {
    try {
      const params =
        tab === 'diario'
          ? { fecha }
          : tab === 'mensual'
            ? { anio, mes }
            : { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
      const blob =
        formato === 'pdf'
          ? await contabilidadService.exportarPdf(tab === 'estado' ? 'estado_resultados' : tab, params)
          : await contabilidadService.exportarExcel(tab === 'estado' ? 'estado_resultados' : tab, params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_${tab}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      Swal.fire('Error', 'No se pudo exportar el reporte', 'error')
    }
  }

  const tabs = [
    { id: 'diario', label: 'Diario' },
    { id: 'mensual', label: 'Mensual' },
    { id: 'estado', label: 'Estado de resultados' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-end mb-6">
        <div className="flex gap-2">
          <button onClick={() => exportar('pdf')} className="flex items-center gap-1 text-sm border px-3 py-2 rounded">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => exportar('excel')} className="flex items-center gap-1 text-sm border px-3 py-2 rounded">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              setData(null)
            }}
            className={`px-4 py-2 rounded-lg ${tab === t.id ? 'bg-matcha-500 text-white' : 'bg-gray-100'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        {tab === 'diario' && (
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="border rounded px-3 py-2" />
        )}
        {tab === 'mensual' && (
          <>
            <input type="number" value={anio} onChange={(e) => setAnio(+e.target.value)} className="border rounded px-3 py-2 w-24" />
            <input type="number" min={1} max={12} value={mes} onChange={(e) => setMes(+e.target.value)} className="border rounded px-3 py-2 w-20" />
          </>
        )}
        {tab === 'estado' && (
          <>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border rounded px-3 py-2" />
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="border rounded px-3 py-2" />
          </>
        )}
        <button onClick={cargar} disabled={loading} className="bg-coffee-800 text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          Cargando...
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          <p className="font-medium">No se pudo cargar el reporte</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {data.sin_actividad && (
            <p className="text-gray-500 italic bg-gray-50 border border-gray-200 rounded-lg p-4">
              Sin actividad en este periodo.
            </p>
          )}

          {tab === 'diario' && data.ingresos && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Ingresos total</p>
                  <p className="text-xl font-bold">{formatMoney(data.ingresos.total)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Efectivo</p>
                  <p className="text-xl font-bold">{formatMoney(data.ingresos.efectivo)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Egresos</p>
                  <p className="text-xl font-bold text-red-600">{formatMoney(data.egresos?.total)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Resultado neto</p>
                  <p className="text-xl font-bold text-matcha-600">{formatMoney(data.resultado_neto)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Tarjeta</p>
                  <p className="text-lg font-bold">{formatMoney(data.ingresos.tarjeta)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Transferencia</p>
                  <p className="text-lg font-bold">{formatMoney(data.ingresos.transferencia)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Tickets</p>
                  <p className="text-lg font-bold">{data.num_tickets || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Ticket promedio</p>
                  <p className="text-lg font-bold">{formatMoney(data.ticket_promedio)}</p>
                </div>
              </div>
              {data.ventas_por_usuario?.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow">
                  <h2 className="font-semibold text-coffee-800 mb-2">Ventas por usuario</h2>
                  <div className="space-y-1">
                    {data.ventas_por_usuario.map((v, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{v.nombre} {v.apellido_paterno}</span>
                        <span>{v.num_ventas} · {formatMoney(v.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'mensual' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Ingresos</p>
                  <p className="text-xl font-bold">{formatMoney(data.total_ingresos)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Egresos</p>
                  <p className="text-xl font-bold text-red-600">{formatMoney(data.total_egresos)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-sm text-gray-500">Resultado neto</p>
                  <p className="text-xl font-bold text-matcha-600">{formatMoney(data.resultado_neto)}</p>
                </div>
              </div>

              {data.ingresos_por_dia?.length > 0 ? (
                <div className="bg-white rounded-lg p-4 shadow">
                  <h2 className="text-sm font-semibold text-coffee-800 mb-3">Ingresos por día</h2>
                  <div className="w-full" style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={data.ingresos_por_dia}
                        margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="dia"
                          tickFormatter={(v) => {
                            const s = String(v)
                            // "2026-08-31" -> "31"
                            const parts = s.split('-')
                            return parts.length === 3 ? parts[2] : s.slice(-2)
                          }}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          tickFormatter={(v) => `$${Number(v).toLocaleString('es-MX')}`}
                          tick={{ fontSize: 11 }}
                          width={72}
                        />
                        <Tooltip
                          formatter={(v) => [formatMoney(v), 'Ingresos']}
                          labelFormatter={(label) => `Día ${String(label)}`}
                        />
                        <Bar dataKey="total" fill="#5a8f5a" radius={[4, 4, 0, 0]} minPointSize={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {data.incompleto && (
                    <p className="text-xs text-amber-600 mt-2">Mes en curso — datos parciales</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic bg-gray-50 border border-gray-200 rounded-lg p-4">
                  No hay ventas registradas en este mes.
                </p>
              )}

              {data.ingresos_por_metodo && Object.keys(data.ingresos_por_metodo).length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow">
                  <h2 className="text-sm font-semibold text-coffee-800 mb-3">Ingresos por método de pago</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(data.ingresos_por_metodo).map(([metodo, total]) => (
                      <div key={metodo} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                        <span className="text-sm text-gray-600 capitalize">{metodo}</span>
                        <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.productos_mas_vendidos?.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow">
                  <h2 className="text-sm font-semibold text-coffee-800 mb-3">Productos más vendidos</h2>
                  <div className="space-y-1.5">
                    {data.productos_mas_vendidos.map((p, i) => (
                      <div key={i} className="flex justify-between text-sm border-b border-gray-50 last:border-0 py-1">
                        <span className="text-gray-700">{p.nombre} <span className="text-gray-400">×{p.cantidad}</span></span>
                        <span className="tabular-nums text-gray-800">{formatMoney(p.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'estado' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm">Ingresos</p>
                <p className="text-xl font-bold">{formatMoney(data.ingresos)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm">Costo estimado</p>
                <p className="text-xl font-bold">{formatMoney(data.costo_ventas_estimado)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm">Margen bruto</p>
                <p className="text-xl font-bold">{data.margen_bruto_porcentaje}%</p>
              </div>
              {data.nota && <p className="sm:col-span-3 text-xs text-gray-500">{data.nota}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Contabilidad
