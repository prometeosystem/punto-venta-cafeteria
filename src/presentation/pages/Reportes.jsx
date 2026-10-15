import { useState, useEffect, useMemo } from 'react'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  Coins,
  Percent,
  Eye,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useVentas } from '../hooks/useVentas'
import { servicioDe } from '../utils/tipoServicio'
import { useReportes } from '../hooks/useReportes'
import { useProductos } from '../hooks/useProductos'
import { useAuth } from '../context/AuthContext'
import { formatPrecio, formatMedida } from '../utils/numberFormatter'
import { METODOS_PAGO_DISPONIBLES } from '../utils/metodosPagoConfig'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const RechartsAvailable = true

const labelMetodoPago = (metodo) => {
  if (!metodo) return '—'
  if (metodo === 'mixto') return 'Efectivo y tarjeta'
  const found = METODOS_PAGO_DISPONIBLES.find((m) => m.id === metodo)
  return found?.label || String(metodo).replace(/-/g, ' ')
}

const Reportes = () => {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [ventas, setVentas] = useState([])
  const [ventasPorDia, setVentasPorDia] = useState([])
  const [productosMasVendidos, setProductosMasVendidos] = useState([])
  const [comprasRecomendadas, setComprasRecomendadas] = useState(null)
  const [totalPropinas, setTotalPropinas] = useState(0)
  const [totalDescuentos, setTotalDescuentos] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingGraficos, setLoadingGraficos] = useState(false)
  const [loadingRecomendaciones, setLoadingRecomendaciones] = useState(false)
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false)
  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [busquedaVentas, setBusquedaVentas] = useState('')
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('')
  const [filtroTipoServicio, setFiltroTipoServicio] = useState('')
  const [paginaVentas, setPaginaVentas] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(10)
  const { obtenerVentas, obtenerVenta } = useVentas()
  const { obtenerVentasPorDia, obtenerProductosMasVendidos, obtenerComprasRecomendadas, obtenerPropinasPorFecha, obtenerDescuentosPorFecha } = useReportes()
  const { productos } = useProductos()
  const { usuario } = useAuth()

  useEffect(() => {
    const hoy = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    setFechaInicio(primerDiaMes.toISOString().split('T')[0])
    setFechaFin(hoy.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      cargarDatos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin])

  useEffect(() => {
    cargarRecomendaciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    setLoadingGraficos(true)
    try {
      const dataVentas = await obtenerVentas(fechaInicio, fechaFin)
      setVentas(dataVentas || [])

      const [ventasDia, productosData, propinasData, descuentosData] = await Promise.all([
        obtenerVentasPorDia(fechaInicio, fechaFin),
        obtenerProductosMasVendidos(fechaInicio, fechaFin, 10),
        obtenerPropinasPorFecha(fechaInicio, fechaFin),
        obtenerDescuentosPorFecha(fechaInicio, fechaFin)
      ])
      setVentasPorDia(ventasDia || [])
      setProductosMasVendidos(productosData || [])
      setTotalPropinas(propinasData?.total_propinas ?? 0)
      setTotalDescuentos(descuentosData?.total_descuentos ?? 0)
    } catch (error) {
      console.error('Error al cargar datos:', error)
    } finally {
      setLoading(false)
      setLoadingGraficos(false)
    }
  }

  const cargarRecomendaciones = async () => {
    setLoadingRecomendaciones(true)
    try {
      const data = await obtenerComprasRecomendadas(3)
      setComprasRecomendadas(data)
    } catch (error) {
      console.error('Error al cargar recomendaciones:', error)
    } finally {
      setLoadingRecomendaciones(false)
    }
  }

  const ventasTotales = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0)
  const pedidosTotales = ventas.length
  const ticketPromedio = pedidosTotales > 0 ? ventasTotales / pedidosTotales : 0
  const productosVendidos = ventas.reduce((sum, v) => {
    return sum + (v.detalles?.reduce((dSum, d) => dSum + (d.cantidad || 0), 0) || 0)
  }, 0)

  const conteoPorMetodo = useMemo(() => {
    const counts = {}
    ventas.forEach((v) => {
      const key = v.metodo_pago || 'otro'
      counts[key] = (counts[key] || 0) + 1
    })
    return METODOS_PAGO_DISPONIBLES.map((m) => ({
      ...m,
      cantidad: counts[m.id] || 0,
    })).filter((m) => m.cantidad > 0 || ['efectivo', 'tarjeta', 'delivery'].includes(m.id))
  }, [ventas])

  const nombreProductoDetalle = (detalle) => {
    if (detalle.producto_nombre) return detalle.producto_nombre
    if (detalle.id_producto == null || detalle.id_producto === '') {
      return detalle.nombre_producto || 'Producto personalizado'
    }
    const producto = productos.find((p) => p.id_producto === detalle.id_producto)
    return producto?.nombre || detalle.nombre_producto || `Producto #${detalle.id_producto}`
  }

  const resumenProductos = (venta) => {
    const detalles = venta.detalles || []
    if (detalles.length === 0) return '—'
    const nombres = detalles.map((d) => {
      const nombre = nombreProductoDetalle(d)
      return d.cantidad > 1 ? `${d.cantidad}× ${nombre}` : nombre
    })
    if (nombres.length <= 2) return nombres.join(', ')
    return `${nombres.slice(0, 2).join(', ')} +${nombres.length - 2}`
  }

  const cantidadProductos = (venta) =>
    (venta.detalles || []).reduce((sum, d) => sum + (Number(d.cantidad) || 0), 0)

  const tieneDescuento = (venta) => parseFloat(venta.total_descuento || 0) > 0
  const tienePropina = (venta) => parseFloat(venta.monto_propina || 0) > 0

  const nombreCliente = (venta) =>
    venta.nombre_cliente || venta.cliente_nombre || 'Sin nombre'

  const ventasFiltradas = useMemo(() => {
    const q = busquedaVentas.trim().toLowerCase()
    return ventas.filter((venta) => {
      if (filtroMetodoPago && venta.metodo_pago !== filtroMetodoPago) return false

      const tipo = venta.tipo_servicio || ''
      if (filtroTipoServicio === 'comer-aqui' && tipo !== 'comer-aqui') return false
      if (filtroTipoServicio === 'para-llevar' && tipo !== 'para-llevar' && tipo !== 'delivery') return false

      if (!q) return true

      const cliente = nombreCliente(venta).toLowerCase()
      const metodo = labelMetodoPago(venta.metodo_pago).toLowerCase()
      const vendedor = String(venta.vendedor_nombre || '').toLowerCase()
      const id = String(venta.id_venta || '')
      const productosTxt = resumenProductos(venta).toLowerCase()
      const total = String(venta.total || '')

      return (
        cliente.includes(q) ||
        metodo.includes(q) ||
        vendedor.includes(q) ||
        id.includes(q) ||
        productosTxt.includes(q) ||
        total.includes(q)
      )
    })
  }, [ventas, busquedaVentas, filtroMetodoPago, filtroTipoServicio, productos])

  const totalPaginas = Math.max(1, Math.ceil(ventasFiltradas.length / tamanoPagina))
  const paginaActual = Math.min(paginaVentas, totalPaginas)
  const ventasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * tamanoPagina
    return ventasFiltradas.slice(inicio, inicio + tamanoPagina)
  }, [ventasFiltradas, paginaActual, tamanoPagina])

  useEffect(() => {
    setPaginaVentas(1)
  }, [busquedaVentas, filtroMetodoPago, filtroTipoServicio, tamanoPagina, fechaInicio, fechaFin])

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return ''
    const parts = String(fechaStr).split('T')[0].split('-')
    if (parts.length !== 3) return fechaStr
    const fecha = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  }

  const formatearFechaHora = (fechaStr) => {
    if (!fechaStr) return '—'
    return new Date(fechaStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getUrgenciaColor = (urgencia) => {
    switch (urgencia) {
      case 'alta':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'media':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'baja':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const abrirModalDetalles = async (venta) => {
    setMostrarModalDetalles(true)
    setCargandoDetalle(true)
    setVentaDetalle(null)
    try {
      const completa = await obtenerVenta(venta.id_venta)
      setVentaDetalle({
        ...completa,
        vendedor_nombre: completa.vendedor_nombre_completo || completa.vendedor_nombre || venta.vendedor_nombre,
      })
    } catch (error) {
      console.error('Error al cargar detalle de venta:', error)
      setVentaDetalle({
        ...venta,
        error: true,
      })
    } finally {
      setCargandoDetalle(false)
    }
  }

  const generarPDF = () => {
    if (!comprasRecomendadas || !comprasRecomendadas.recomendaciones) {
      return
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    const colorMatcha = [90, 143, 90]
    const colorCoffee = [139, 111, 71]
    const colorMatchaLight = [184, 221, 198]
    const colorCoffeeLight = [232, 221, 208]

    doc.setFillColor(...colorMatcha)
    doc.rect(0, 0, pageWidth, 50, 'F')

    doc.setFillColor(...colorCoffeeLight)
    doc.circle(25, 25, 12, 'F')
    doc.setTextColor(...colorCoffee)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('☕', 25, 30, { align: 'center' })

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...colorCoffeeLight)
    doc.text('Sistema de Control Inteligente', 50, 20)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Cafetería', 50, 28)
    doc.setTextColor(...colorCoffeeLight)

    const ahora = new Date()
    const fechaHora = ahora.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    doc.setFontSize(9)
    doc.text(`Generado: ${fechaHora}`, pageWidth - 20, 35, { align: 'right' })

    const nombreUsuario = usuario
      ? `${usuario.nombre || ''} ${usuario.apellido_paterno || ''}`.trim() || 'Usuario'
      : 'Usuario'
    doc.text(`Generado por: ${nombreUsuario}`, pageWidth - 20, 42, { align: 'right' })

    doc.setFillColor(...colorCoffeeLight)
    doc.rect(0, 55, pageWidth, 15, 'F')
    doc.setTextColor(...colorCoffee)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Recomendaciones de Compra - Próximo Mes', pageWidth / 2, 66, { align: 'center' })

    let yPos = 80
    doc.setFillColor(...colorMatchaLight)
    doc.roundedRect(10, yPos, pageWidth - 20, 25, 3, 3, 'F')

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen', 15, yPos + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const resumen = comprasRecomendadas.resumen
    doc.text(`Total de insumos recomendados: ${resumen.total_insumos_recomendados}`, 15, yPos + 15)
    doc.text(`Insumos urgentes: ${resumen.insumos_urgentes}`, 15, yPos + 21)
    doc.text(`Costo estimado total: $${formatPrecio(resumen.total_costo_estimado)}`, pageWidth - 15, yPos + 15, { align: 'right' })
    doc.text(`Período analizado: ${resumen.periodo_analisis_dias} días`, pageWidth - 15, yPos + 21, { align: 'right' })

    yPos = 115

    const tableData = comprasRecomendadas.recomendaciones.map(rec => [
      rec.nombre,
      `${rec.stock_actual} ${rec.unidad_medida}`,
      `${rec.stock_minimo} ${rec.unidad_medida}`,
      `${formatMedida(rec.cantidad_recomendada)} ${rec.unidad_medida}`,
      `$${formatPrecio(rec.costo_estimado)}`,
      rec.urgencia.toUpperCase()
    ])

    autoTable(doc, {
      startY: yPos,
      margin: { left: 20, right: 20 },
      head: [['Insumo', 'Stock Actual', 'Stock Mínimo', 'Cantidad Recomendada', 'Costo Estimado', 'Urgencia']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: colorMatcha,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0]
      },
      alternateRowStyles: {
        fillColor: colorMatchaLight
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 28, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
        3: { cellWidth: 32, halign: 'center' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 23, halign: 'center' }
      },
      styles: {
        cellPadding: 3,
        lineColor: colorMatcha,
        lineWidth: 0.1
      },
      didParseCell: function (data) {
        if (data.column.index === 5) {
          if (data.cell.text[0] === 'ALTA') {
            data.cell.styles.textColor = [220, 38, 38]
            data.cell.styles.fontStyle = 'bold'
          } else if (data.cell.text[0] === 'MEDIA') {
            data.cell.styles.textColor = [217, 119, 6]
            data.cell.styles.fontStyle = 'bold'
          } else if (data.cell.text[0] === 'BAJA') {
            data.cell.styles.textColor = [34, 197, 94]
            data.cell.styles.fontStyle = 'bold'
          }
        }
      }
    })

    const finalY = doc.lastAutoTable?.finalY || yPos + 50
    if (finalY < pageHeight - 30) {
      doc.setFillColor(...colorCoffee)
      doc.rect(0, pageHeight - 20, pageWidth, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Sistema de Control Inteligente - Cafetería', pageWidth / 2, pageHeight - 12, { align: 'center' })
      doc.text('Este documento fue generado automáticamente por el sistema', pageWidth / 2, pageHeight - 6, { align: 'center' })
    }

    const nombreArchivo = `Recomendaciones_Compra_${ahora.toISOString().split('T')[0]}.pdf`
    doc.save(nombreArchivo)
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 sm:space-y-6">
      {/* Filtros de fecha */}
      <div className="card min-w-0 overflow-hidden !p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              className="input"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              className="input"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Resumen de reportes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4 min-w-0">
              <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">Ventas totales</p>
              <p className="text-lg font-bold leading-tight text-gray-900 sm:text-2xl">${formatPrecio(ventasTotales)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4 min-w-0">
              <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">Descuentos</p>
              <p className="text-lg font-bold leading-tight text-amber-600 sm:text-2xl">${formatPrecio(totalDescuentos)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4 min-w-0">
              <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">Propinas</p>
              <p className="text-lg font-bold leading-tight text-matcha-600 sm:text-2xl">${formatPrecio(totalPropinas)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4 min-w-0">
              <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">Ticket promedio</p>
              <p className="text-lg font-bold leading-tight text-gray-900 sm:text-2xl">${formatPrecio(ticketPromedio)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4 min-w-0">
              <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">Productos vendidos</p>
              <p className="text-lg font-bold leading-tight text-gray-900 sm:text-2xl">{productosVendidos}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4 min-w-0">
              <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">Ventas</p>
              <p className="text-lg font-bold leading-tight text-gray-900 sm:text-2xl">{pedidosTotales}</p>
            </div>
            {conteoPorMetodo.map((metodo) => (
              <div key={metodo.id} className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 sm:p-4 min-w-0">
                <p className="truncate text-[11px] leading-tight text-gray-500 sm:text-sm">{metodo.label}</p>
                <p className="text-lg font-bold leading-tight text-gray-900 sm:text-2xl">{metodo.cantidad}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        <div className="card min-w-0 overflow-hidden !p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ventas por Día
          </h2>
          {loadingGraficos ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-matcha-600" />
            </div>
          ) : ventasPorDia.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No hay datos para mostrar</p>
            </div>
          ) : RechartsAvailable ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={ventasPorDia}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3d6b4f" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3d6b4f" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={formatearFecha}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke="#6b7280"
                />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value) => `$${formatPrecio(value)}`}
                  labelFormatter={(label) => formatearFecha(label)}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="total_ventas"
                  stroke="#3d6b4f"
                  strokeWidth={3}
                  fill="url(#colorVentas)"
                  dot={{ fill: '#3d6b4f', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                  name="Ventas ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="text-sm">Recharts no está instalado</p>
            </div>
          )}
        </div>

        <div className="card min-w-0 overflow-hidden !p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Productos Más Vendidos
          </h2>
          {loadingGraficos ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-matcha-600" />
            </div>
          ) : productosMasVendidos.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No hay datos para mostrar</p>
            </div>
          ) : RechartsAvailable ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productosMasVendidos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="nombre"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke="#6b7280"
                />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <defs>
                  <linearGradient id="colorBarras" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3d6b4f" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3d6b4f" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <Bar
                  dataKey="cantidad_vendida"
                  fill="url(#colorBarras)"
                  name="Cantidad Vendida"
                  stroke="#3d6b4f"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="text-sm">Recharts no está instalado</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de ventas detalladas (arriba de recomendaciones) */}
      <div className="card min-w-0 overflow-hidden !p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Ventas del período
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4 min-w-0">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              className="input pl-9 pr-9"
              placeholder="Buscar por cliente, producto, total o ticket..."
              value={busquedaVentas}
              onChange={(e) => setBusquedaVentas(e.target.value)}
            />
            {busquedaVentas && (
              <button
                type="button"
                onClick={() => setBusquedaVentas('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <div>
            <select
              className="input"
              value={filtroMetodoPago}
              onChange={(e) => setFiltroMetodoPago(e.target.value)}
            >
              <option value="">Todos los métodos de pago</option>
              {METODOS_PAGO_DISPONIBLES.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="input"
              value={filtroTipoServicio}
              onChange={(e) => setFiltroTipoServicio(e.target.value)}
            >
              <option value="">Todos los tipos de servicio</option>
              <option value="comer-aqui">Comer aquí</option>
              <option value="para-llevar">Para llevar</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <p className="text-sm text-gray-600">
            {ventasFiltradas.length === 0
              ? 'Sin resultados'
              : `Mostrando ${(paginaActual - 1) * tamanoPagina + 1}–${Math.min(paginaActual * tamanoPagina, ventasFiltradas.length)} de ${ventasFiltradas.length}`}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap" htmlFor="tamano-pagina-ventas">
              Por página
            </label>
            <select
              id="tamano-pagina-ventas"
              className="input py-1.5 w-auto min-w-[5rem]"
              value={tamanoPagina}
              onChange={(e) => setTamanoPagina(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500 lg:hidden">
            <Loader2 className="w-6 h-6 animate-spin text-matcha-600 mx-auto" />
          </div>
        ) : ventas.length === 0 ? (
          <p className="py-8 text-center text-gray-500 lg:hidden">No hay ventas en el período seleccionado</p>
        ) : ventasFiltradas.length === 0 ? (
          <p className="py-8 text-center text-gray-500 lg:hidden">No hay ventas que coincidan con la búsqueda o filtros</p>
        ) : (
          <ul className="lg:hidden divide-y divide-gray-100">
            {ventasPaginadas.map((venta) => (
              <li key={venta.id_venta} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">Ticket {venta.id_venta}</p>
                    <p className="text-xs text-gray-500">{formatearFechaHora(venta.fecha_venta)}</p>
                    <p className="mt-0.5 truncate text-sm text-gray-700">
                      {nombreCliente(venta)} · {cantidadProductos(venta)} {cantidadProductos(venta) === 1 ? 'producto' : 'productos'}
                    </p>
                    <p className="text-xs capitalize text-gray-500">{labelMetodoPago(venta.metodo_pago)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-matcha-600">${formatPrecio(venta.total)}</p>
                    <button
                      type="button"
                      onClick={() => abrirModalDetalles(venta)}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg border border-matcha-200 px-2.5 py-1 text-xs font-medium text-matcha-700"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="hidden lg:block min-w-0 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Ticket</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Cliente</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Productos</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Método de pago</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900" title="Descuento">Dto.</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900" title="Propina">Prop.</th>                
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Total</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-matcha-600 mx-auto" />
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-gray-500">
                    No hay ventas en el período seleccionado
                  </td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-gray-500">
                    No hay ventas que coincidan con la búsqueda o filtros
                  </td>
                </tr>
              ) : (
                ventasPaginadas.map((venta) => (
                  <tr
                    key={venta.id_venta}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-900 font-medium tabular-nums">
                      {venta.id_venta}
                    </td>
                    <td className="py-3 px-4 text-gray-900 whitespace-nowrap">
                      {formatearFechaHora(venta.fecha_venta)}
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {nombreCliente(venta)}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-900 font-medium">
                      {cantidadProductos(venta)}
                    </td>
                    <td className="py-3 px-4 text-gray-700 capitalize">
                      {labelMetodoPago(venta.metodo_pago)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tieneDescuento(venta) ? (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700"
                          title={`Descuento: $${formatPrecio(venta.total_descuento)}`}
                        >
                          <Percent className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tienePropina(venta) ? (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-matcha-100 text-matcha-700"
                          title={`Propina: $${formatPrecio(venta.monto_propina)}`}
                        >
                          <Coins className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-matcha-600 whitespace-nowrap">
                      ${formatPrecio(venta.total)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => abrirModalDetalles(venta)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-matcha-700 border border-matcha-200 rounded-lg hover:bg-matcha-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {ventasFiltradas.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Página {paginaActual} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaginaVentas((p) => Math.max(1, p - 1))}
                disabled={paginaActual <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPaginaVentas((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual >= totalPaginas}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recomendaciones de Compra */}
      <div className="card min-w-0 overflow-hidden !p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Recomendaciones de Compra - Próximo Mes
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Análisis basado en consumo histórico de los últimos 3 meses
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={generarPDF}
              disabled={!comprasRecomendadas || !comprasRecomendadas.recomendaciones || comprasRecomendadas.recomendaciones.length === 0}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
            <button
              onClick={cargarRecomendaciones}
              disabled={loadingRecomendaciones}
              className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Loader2 className={`w-4 h-4 ${loadingRecomendaciones ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {loadingRecomendaciones ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
          </div>
        ) : comprasRecomendadas && comprasRecomendadas.recomendaciones ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
              <div className="min-w-0 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
                <p className="text-xs text-blue-600 mb-1 sm:text-sm">Insumos</p>
                <p className="text-lg font-bold text-blue-900 sm:text-2xl">
                  {comprasRecomendadas.resumen.total_insumos_recomendados}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
                <p className="text-xs text-red-600 mb-1 sm:text-sm">Urgentes</p>
                <p className="text-lg font-bold text-red-900 sm:text-2xl">
                  {comprasRecomendadas.resumen.insumos_urgentes}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
                <p className="text-xs text-green-600 mb-1 sm:text-sm">Costo estimado</p>
                <p className="text-lg font-bold leading-tight text-green-900 sm:text-2xl">
                  ${formatPrecio(comprasRecomendadas.resumen.total_costo_estimado)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <p className="text-xs text-gray-600 mb-1 sm:text-sm">Período</p>
                <p className="text-lg font-semibold text-gray-900 sm:text-2xl">
                  {comprasRecomendadas.resumen.periodo_analisis_dias} días
                </p>
              </div>
            </div>

            <ul className="lg:hidden divide-y divide-gray-100">
              {comprasRecomendadas.recomendaciones.length === 0 ? (
                <li className="py-8 text-center text-gray-500">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <p>No hay recomendaciones de compra en este momento</p>
                </li>
              ) : (
                comprasRecomendadas.recomendaciones.map((rec) => (
                  <li key={rec.id_insumo} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{rec.nombre}</p>
                        <p className="text-xs text-gray-500">
                          Stock {rec.stock_actual} {rec.unidad_medida} · mín. {rec.stock_minimo}
                        </p>
                        <p className="text-sm text-matcha-700">
                          Pedir {formatMedida(rec.cantidad_recomendada)} {rec.unidad_medida}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getUrgenciaColor(rec.urgencia)}`}>
                          {rec.urgencia}
                        </span>
                        <p className="mt-1 font-semibold text-green-600">${formatPrecio(rec.costo_estimado)}</p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <div className="hidden lg:block min-w-0 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Insumo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Stock Actual</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Stock Mínimo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Consumo/Día</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Proyección Mes</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Cantidad Recomendada</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Costo Estimado</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Urgencia</th>
                  </tr>
                </thead>
                <tbody>
                  {comprasRecomendadas.recomendaciones.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-gray-500">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                        <p>No hay recomendaciones de compra en este momento</p>
                        <p className="text-sm mt-1">El inventario está bien abastecido</p>
                      </td>
                    </tr>
                  ) : (
                    comprasRecomendadas.recomendaciones.map((rec) => (
                      <tr
                        key={rec.id_insumo}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">{rec.nombre}</div>
                          <div className="text-xs text-gray-500">{rec.unidad_medida}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {rec.stock_actual} {rec.unidad_medida}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {rec.stock_minimo} {rec.unidad_medida}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatMedida(rec.consumo_promedio_diario)} {rec.unidad_medida}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatMedida(rec.consumo_proyectado_mes)} {rec.unidad_medida}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-matcha-600">
                            {formatMedida(rec.cantidad_recomendada)} {rec.unidad_medida}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-green-600">
                            ${formatPrecio(rec.costo_estimado)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getUrgenciaColor(rec.urgencia)}`}>
                            {rec.urgencia.toUpperCase()}
                          </span>
                          {rec.dias_restantes_estimados < 30 && rec.dias_restantes_estimados > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              ~{rec.dias_restantes_estimados} días restantes
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No se pudieron cargar las recomendaciones</p>
          </div>
        )}
      </div>

      {/* Modal de detalles de venta */}
      {mostrarModalDetalles && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">
                Detalle de venta{ventaDetalle?.id_venta ? ` #${ventaDetalle.id_venta}` : ''}
              </h2>
              <button
                type="button"
                onClick={() => setMostrarModalDetalles(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {cargandoDetalle ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
                </div>
              ) : ventaDetalle?.error ? (
                <div className="py-8 text-center text-gray-500">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p>No se pudieron cargar los detalles</p>
                </div>
              ) : ventaDetalle ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Fecha y hora</p>
                      <p className="font-medium text-gray-900">
                        {formatearFechaHora(ventaDetalle.fecha_venta)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Cliente</p>
                      <p className="font-medium text-gray-900">
                        {nombreCliente(ventaDetalle)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Quién atendió</p>
                      <p className="font-medium text-gray-900">
                        {ventaDetalle.vendedor_nombre || ventaDetalle.vendedor_nombre_completo || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Método de pago</p>
                      <p className="font-medium text-gray-900">
                        {labelMetodoPago(ventaDetalle.metodo_pago)}
                      </p>
                    </div>
                    {ventaDetalle.tipo_servicio && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tipo de servicio</p>
                        <p className="font-medium text-gray-900">
                          {servicioDe(ventaDetalle.tipo_servicio, ventaDetalle.metodo_pago)?.texto}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total</p>
                      <p className="text-xl font-bold text-matcha-600">
                        ${formatPrecio(ventaDetalle.total)}
                      </p>
                    </div>
                    {(ventaDetalle.total_descuento != null && parseFloat(ventaDetalle.total_descuento) > 0) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Descuento</p>
                        <p className="font-medium text-amber-700">
                          -${formatPrecio(ventaDetalle.total_descuento)}
                          {ventaDetalle.descuento_tipo === 'porcentaje' && ventaDetalle.descuento_valor != null && (
                            <span className="text-gray-500 text-sm ml-1">({ventaDetalle.descuento_valor}%)</span>
                          )}
                        </p>
                      </div>
                    )}
                    {(ventaDetalle.monto_propina != null && parseFloat(ventaDetalle.monto_propina) > 0) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Propina</p>
                        <p className="font-medium text-matcha-700">
                          +${formatPrecio(ventaDetalle.monto_propina)}
                        </p>
                      </div>
                    )}
                  </div>

                  {ventaDetalle.comentarios && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-gray-900 mb-1">Comentarios</p>
                      <p className="text-sm text-gray-700 italic">{ventaDetalle.comentarios}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-lg font-semibold text-gray-900 mb-3">Productos vendidos</p>
                    <div className="space-y-3">
                      {ventaDetalle.detalles?.length > 0 ? (
                        ventaDetalle.detalles.map((detalle, index) => (
                          <div
                            key={detalle.id_detalle || index}
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900">{nombreProductoDetalle(detalle)}</p>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {detalle.cantidad} × ${formatPrecio(detalle.precio_unitario)} = ${formatPrecio(detalle.subtotal)}
                                </p>
                                {detalle.observaciones && (
                                  <p className="text-xs text-gray-500 mt-2">{detalle.observaciones}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Sin productos registrados</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reportes
