import { useState, useEffect } from 'react'
import { contabilidadService } from '../../application/services/contabilidadService'
import {
  Loader2, FileText, FileSpreadsheet, TrendingUp, TrendingDown, Scale, Receipt,
  Percent, Package, AlertCircle, Inbox, ArrowUpRight, ArrowDownRight, Coins,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Swal from 'sweetalert2'

const formatMoney = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const NOMBRES_METODO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  delivery: 'Delivery',
}

const nombreMetodo = (m) => NOMBRES_METODO[m] || (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Otro')

const TONOS = {
  ingreso: 'bg-marca-100 text-marca-700',
  egreso: 'bg-red-100 text-red-700',
  neutro: 'bg-gray-100 text-gray-700',
  aviso: 'bg-amber-100 text-amber-700',
}

const Kpi = ({ icono: Icono, etiqueta, valor, detalle, tono = 'neutro', colorValor = 'text-gray-900' }) => (
  <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
    <div className="flex items-center gap-2">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${TONOS[tono]}`}>
        <Icono className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <p className="truncate text-xs font-medium text-gray-500 sm:text-sm">{etiqueta}</p>
    </div>
    <p className={`mt-2 truncate text-lg font-bold leading-tight tabular-nums sm:text-2xl ${colorValor}`}>{valor}</p>
    {detalle && <div className="mt-0.5 truncate text-[11px] text-gray-400 sm:text-xs">{detalle}</div>}
  </div>
)

const Seccion = ({ titulo, extra, children, className = '' }) => (
  <section className={`card min-w-0 !p-4 sm:!p-5 ${className}`}>
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
      {extra}
    </div>
    {children}
  </section>
)

const SinDatos = ({ texto }) => <p className="py-4 text-center text-sm text-gray-400">{texto}</p>

const ListaBarras = ({ items, color = 'bg-marca-500', vacio = 'Sin datos' }) => {
  const total = items.reduce((acc, i) => acc + Number(i.total || 0), 0)
  if (items.length === 0 || total <= 0) return <SinDatos texto={vacio} />
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const porcentaje = (Number(item.total || 0) / total) * 100
        return (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-gray-700">{item.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold text-gray-900">{formatMoney(item.total)}</span>
                <span className="ml-1.5 text-xs text-gray-400">{porcentaje.toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(porcentaje, 1.5)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const iniciales = (nombre, apellido) =>
  `${(nombre || '').charAt(0)}${(apellido || '').charAt(0)}`.toUpperCase() || '?'

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
      const periodo =
        tab === 'diario'
          ? fecha
          : tab === 'mensual'
            ? `${anio}-${String(mes).padStart(2, '0')}`
            : `${fechaInicio}_a_${fechaFin}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_${tab === 'estado' ? 'estado_resultados' : tab}_${periodo}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      Swal.fire('Error', 'No se pudo exportar el reporte', 'error')
    }
  }

  const tabs = [
    { id: 'diario', label: 'Diario' },
    { id: 'mensual', label: 'Mensual' },
    { id: 'estado', label: 'Estado de resultados', corto: 'Resultados' },
  ]

  const metodosDiario = () => {
    if (!data?.ingresos) return []
    const { efectivo = 0, tarjeta = 0, transferencia = 0, total = 0 } = data.ingresos
    const items = [
      { label: 'Efectivo', total: efectivo },
      { label: 'Tarjeta', total: tarjeta },
      { label: 'Transferencia', total: transferencia },
    ]
    const otros = total - efectivo - tarjeta - transferencia
    if (otros > 0.01) items.push({ label: 'Delivery y otros', total: otros })
    return items.filter((i) => i.total > 0)
  }

  const renderDiario = () => {
    const egresos = Object.entries(data.egresos?.por_categoria || {})
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total)
    const propinas = Object.entries(data.propinas || {}).filter(([, t]) => Number(t) > 0)
    const totalPropinas = propinas.reduce((acc, [, t]) => acc + Number(t), 0)
    const usuarios = [...(data.ventas_por_usuario || [])].sort((a, b) => b.total - a.total)
    const maxUsuario = Math.max(...usuarios.map((u) => Number(u.total || 0)), 1)

    return (
      <>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <Kpi icono={TrendingUp} etiqueta="Ingresos" valor={formatMoney(data.ingresos.total)} tono="ingreso" />
          <Kpi icono={TrendingDown} etiqueta="Egresos" valor={formatMoney(data.egresos?.total)} tono="egreso" />
          <Kpi
            icono={Scale}
            etiqueta="Resultado neto"
            valor={formatMoney(data.resultado_neto)}
            colorValor={data.resultado_neto < 0 ? 'text-red-600' : 'text-marca-700'}
          />
          <Kpi
            icono={Receipt}
            etiqueta="Ticket promedio"
            valor={formatMoney(data.ticket_promedio)}
            detalle={`${data.num_tickets || 0} ${data.num_tickets === 1 ? 'ticket' : 'tickets'}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Seccion titulo="Ingresos por método de pago">
            <ListaBarras items={metodosDiario()} vacio="Sin ventas este día" />
          </Seccion>

          <Seccion titulo="Egresos por categoría">
            <ListaBarras items={egresos} color="bg-red-400" vacio="Sin egresos este día" />
          </Seccion>

          <Seccion titulo="Ventas por usuario">
            {usuarios.length === 0 ? (
              <SinDatos texto="Sin ventas este día" />
            ) : (
              <ul className="space-y-3">
                {usuarios.map((u, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-50 text-xs font-semibold text-marca-700">
                      {iniciales(u.nombre, u.apellido_paterno)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-gray-800">
                          {u.nombre} {u.apellido_paterno}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-gray-900">{formatMoney(u.total)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-marca-500"
                            style={{ width: `${(Number(u.total || 0) / maxUsuario) * 100}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {u.num_ventas} {u.num_ventas === 1 ? 'venta' : 'ventas'}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          <Seccion
            titulo="Propinas"
            extra={totalPropinas > 0 && (
              <span className="text-sm font-semibold tabular-nums text-gray-900">{formatMoney(totalPropinas)}</span>
            )}
          >
            {propinas.length === 0 ? (
              <div className="flex flex-col items-center py-3 text-gray-400">
                <Coins className="mb-1 h-7 w-7 opacity-60" />
                <p className="text-sm">Sin propinas este día</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {propinas.map(([metodo, total]) => (
                  <div key={metodo} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-[11px] text-gray-500">{nombreMetodo(metodo)}</p>
                    <p className="font-semibold tabular-nums text-gray-900">{formatMoney(total)}</p>
                  </div>
                ))}
              </div>
            )}
          </Seccion>
        </div>
      </>
    )
  }

  const renderMensual = () => {
    const variacion = Number(data.variacion_porcentaje || 0)
    const hayComparacion = Number(data.ingresos_mes_anterior || 0) > 0
    const metodos = Object.entries(data.ingresos_por_metodo || {})
      .map(([m, total]) => ({ label: nombreMetodo(m), total: Number(total || 0) }))
      .sort((a, b) => b.total - a.total)
    const productos = data.productos_mas_vendidos || []
    const maxProducto = Math.max(...productos.map((p) => Number(p.cantidad || 0)), 1)
    const diasConVenta = (data.ingresos_por_dia || []).filter((d) => Number(d.total) > 0).length
    const promedioDia = diasConVenta > 0 ? data.total_ingresos / diasConVenta : 0

    return (
      <>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <Kpi
            icono={TrendingUp}
            etiqueta="Ingresos"
            valor={formatMoney(data.total_ingresos)}
            tono="ingreso"
            detalle={hayComparacion ? (
              <span className={`inline-flex items-center gap-0.5 font-medium ${variacion < 0 ? 'text-red-600' : 'text-marca-700'}`}>
                {variacion < 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                {Math.abs(variacion).toFixed(1)}% vs mes anterior
              </span>
            ) : 'Sin mes anterior para comparar'}
          />
          <Kpi icono={TrendingDown} etiqueta="Egresos" valor={formatMoney(data.total_egresos)} tono="egreso" />
          <Kpi
            icono={Scale}
            etiqueta="Resultado neto"
            valor={formatMoney(data.resultado_neto)}
            colorValor={data.resultado_neto < 0 ? 'text-red-600' : 'text-marca-700'}
          />
          <Kpi
            icono={Receipt}
            etiqueta="Promedio por día"
            valor={formatMoney(promedioDia)}
            detalle={`${diasConVenta} ${diasConVenta === 1 ? 'día' : 'días'} con ventas`}
          />
        </div>

        <Seccion
          titulo="Ingresos por día"
          extra={data.incompleto && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Mes en curso
            </span>
          )}
        >
          {data.ingresos_por_dia?.length > 0 ? (
            <div className="h-56 w-full min-w-0 overflow-hidden sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ingresos_por_dia} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    tickFormatter={(v) => {
                      const parts = String(v).split('-')
                      return parts.length === 3 ? parts[2] : String(v).slice(-2)
                    }}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${Number(v).toLocaleString('es-MX')}`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    width={64}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--marca-50))' }}
                    formatter={(v) => [formatMoney(v), 'Ingresos']}
                    labelFormatter={(label) => `Día ${String(label)}`}
                  />
                  <Bar dataKey="total" fill="rgb(var(--marca-500))" radius={[4, 4, 0, 0]} minPointSize={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <SinDatos texto="No hay ventas registradas en este mes" />
          )}
        </Seccion>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Seccion titulo="Ingresos por método de pago">
            <ListaBarras items={metodos} vacio="Sin ventas este mes" />
          </Seccion>

          <Seccion titulo="Productos más vendidos">
            {productos.length === 0 ? (
              <SinDatos texto="Sin ventas este mes" />
            ) : (
              <ol className="space-y-2.5">
                {productos.map((p, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        i < 3 ? 'bg-marca-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate text-gray-800">{p.nombre}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-gray-900">{formatMoney(p.total)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-marca-400"
                            style={{ width: `${(Number(p.cantidad || 0) / maxProducto) * 100}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] text-gray-400">×{p.cantidad}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Seccion>
        </div>
      </>
    )
  }

  const renderEstado = () => {
    const ingresos = Number(data.ingresos || 0)
    const costo = Number(data.costo_ventas_estimado || 0)
    const utilidad = data.utilidad_bruta ?? ingresos - costo
    const margen = Number(data.margen_bruto_porcentaje || 0)
    const margenBarra = Math.min(Math.max(margen, 0), 100)
    const productos = [...(data.productos_con_costo || [])].sort((a, b) => b.costo_total - a.costo_total)
    const sinReceta = data.productos_sin_receta || []

    return (
      <>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <Kpi icono={TrendingUp} etiqueta="Ingresos" valor={formatMoney(ingresos)} tono="ingreso" />
          <Kpi icono={Package} etiqueta="Costo estimado" valor={formatMoney(costo)} tono="egreso" />
          <Kpi
            icono={Scale}
            etiqueta="Utilidad bruta"
            valor={formatMoney(utilidad)}
            colorValor={utilidad < 0 ? 'text-red-600' : 'text-marca-700'}
          />
          <Kpi icono={Percent} etiqueta="Margen bruto" valor={`${margen.toFixed(1)}%`} />
        </div>

        <Seccion titulo="De cada peso vendido">
          <div className="flex h-4 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-red-400" style={{ width: `${100 - margenBarra}%` }} />
            <div className="h-full bg-marca-500" style={{ width: `${margenBarra}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              Costo de insumos {(100 - margenBarra).toFixed(1)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-marca-500" />
              Margen {margenBarra.toFixed(1)}%
            </span>
          </div>
        </Seccion>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Seccion titulo="Costo por producto" className="lg:col-span-2">
            {productos.length === 0 ? (
              <SinDatos texto="Sin productos con receta vendidos en el periodo" />
            ) : (
              <div className="min-w-0 overflow-hidden">
                <table className="w-full table-fixed text-xs sm:text-sm">
                  <thead className="border-y border-gray-200 bg-gray-50 text-[11px] text-gray-500 sm:text-xs">
                    <tr>
                      <th className="w-[40%] px-2 py-2 text-left font-medium sm:px-5">Producto</th>
                      <th className="px-1 py-2 text-right font-medium">Cant.</th>
                      <th className="px-1 py-2 text-right font-medium">Unit.</th>
                      <th className="px-2 py-2 text-right font-medium sm:px-5">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productos.map((p, i) => (
                      <tr key={i}>
                        <td className="truncate px-2 py-2 text-gray-800 sm:px-5">{p.nombre}</td>
                        <td className="px-1 py-2 text-right tabular-nums text-gray-600">{p.cantidad_vendida}</td>
                        <td className="px-1 py-2 text-right tabular-nums text-gray-600">{formatMoney(p.costo_unitario)}</td>
                        <td className="truncate px-2 py-2 text-right font-semibold tabular-nums text-gray-900 sm:px-5">
                          {formatMoney(p.costo_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Seccion>

          <Seccion titulo="Sin receta" extra={sinReceta.length > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {sinReceta.length}
            </span>
          )}>
            {sinReceta.length === 0 ? (
              <SinDatos texto="Todos los productos vendidos tienen receta" />
            ) : (
              <>
                <p className="mb-2 text-xs text-gray-500">Estos productos no suman costo, así que el margen sale más alto de lo real.</p>
                <ul className="flex flex-wrap gap-1.5">
                  {sinReceta.map((nombre) => (
                    <li key={nombre} className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">{nombre}</li>
                  ))}
                </ul>
              </>
            )}
          </Seccion>
        </div>

        {data.nota && (
          <p className="flex items-start gap-2 text-xs text-gray-500">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            {data.nota}
          </p>
        )}
      </>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden lg:p-2 sm:space-y-5">
      <div className="card min-w-0 space-y-3 !p-3 sm:!p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 sm:inline-grid">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id)
                  setData(null)
                }}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.corto ? (
                  <>
                    <span className="sm:hidden">{t.corto}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </>
                ) : t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              onClick={() => exportar('pdf')}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 text-red-500" /> PDF
            </button>
            <button
              onClick={() => exportar('excel')}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileSpreadsheet className="h-4 w-4 text-marca-600" /> Excel
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-end">
          {tab === 'diario' && (
            <label className="min-w-0 sm:w-48">
              <span className="mb-1 block text-xs font-medium text-gray-600">Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input text-sm" />
            </label>
          )}
          {tab === 'mensual' && (
            <div className="grid grid-cols-[1fr_6rem] gap-2 sm:flex">
              <label className="min-w-0 sm:w-44">
                <span className="mb-1 block text-xs font-medium text-gray-600">Mes</span>
                <select value={mes} onChange={(e) => setMes(+e.target.value)} className="input text-sm">
                  {MESES.map((nombre, i) => (
                    <option key={nombre} value={i + 1}>{nombre}</option>
                  ))}
                </select>
              </label>
              <label className="min-w-0 sm:w-28">
                <span className="mb-1 block text-xs font-medium text-gray-600">Año</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={anio}
                  onChange={(e) => setAnio(+e.target.value)}
                  className="input text-sm"
                />
              </label>
            </div>
          )}
          {tab === 'estado' && (
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <label className="min-w-0 sm:w-44">
                <span className="mb-1 block text-xs font-medium text-gray-600">Desde</span>
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input text-sm" />
              </label>
              <label className="min-w-0 sm:w-44">
                <span className="mb-1 block text-xs font-medium text-gray-600">Hasta</span>
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="input text-sm" />
              </label>
            </div>
          )}
          <button onClick={cargar} disabled={loading} className="btn-primary py-2 text-sm disabled:opacity-50 sm:px-6">
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-marca-600" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">No se pudo cargar el reporte</p>
            <p className="mt-1 break-words text-sm">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-4 sm:space-y-5">
          {data.sin_actividad && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-gray-500">
              <Inbox className="h-5 w-5 shrink-0 opacity-70" />
              <p className="text-sm">Sin actividad en este periodo.</p>
            </div>
          )}

          {tab === 'diario' && data.ingresos && renderDiario()}
          {tab === 'mensual' && renderMensual()}
          {tab === 'estado' && renderEstado()}
        </div>
      )}
    </div>
  )
}

export default Contabilidad
