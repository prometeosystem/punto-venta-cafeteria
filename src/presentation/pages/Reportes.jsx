import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, Calendar, Loader2, ShoppingCart, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import { useVentas } from '../hooks/useVentas'
import { useReportes } from '../hooks/useReportes'
import { useAuth } from '../context/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Importar Recharts
import {
  LineChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const RechartsAvailable = true

const Reportes = () => {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [ventas, setVentas] = useState([])
  const [ventasPorDia, setVentasPorDia] = useState([])
  const [productosMasVendidos, setProductosMasVendidos] = useState([])
  const [comprasRecomendadas, setComprasRecomendadas] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingGraficos, setLoadingGraficos] = useState(false)
  const [loadingRecomendaciones, setLoadingRecomendaciones] = useState(false)
  const { obtenerVentas } = useVentas()
  const { obtenerVentasPorDia, obtenerProductosMasVendidos, obtenerComprasRecomendadas } = useReportes()
  const { usuario } = useAuth()

  // Establecer fechas por defecto (mes actual)
  useEffect(() => {
    const hoy = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    setFechaInicio(primerDiaMes.toISOString().split('T')[0])
    setFechaFin(hoy.toISOString().split('T')[0])
  }, [])

  // Cargar datos cuando cambian las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      cargarDatos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin])

  // Cargar recomendaciones al montar el componente
  useEffect(() => {
    cargarRecomendaciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    setLoadingGraficos(true)
    try {
      // Cargar ventas
      const dataVentas = await obtenerVentas(fechaInicio, fechaFin)
      setVentas(dataVentas || [])

      // Cargar datos para gráficos
      const [ventasDia, productos] = await Promise.all([
        obtenerVentasPorDia(fechaInicio, fechaFin),
        obtenerProductosMasVendidos(fechaInicio, fechaFin, 10)
      ])
      setVentasPorDia(ventasDia || [])
      setProductosMasVendidos(productos || [])
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

  // Calcular estadísticas
  const ventasTotales = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0)
  const pedidosTotales = ventas.length
  const ticketPromedio = pedidosTotales > 0 ? ventasTotales / pedidosTotales : 0
  const productosVendidos = ventas.reduce((sum, v) => {
    return sum + (v.detalles?.reduce((dSum, d) => dSum + d.cantidad, 0) || 0)
  }, 0)

  // Formatear fecha para gráficos
  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  }

  // Obtener color de urgencia
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

  // Generar PDF de recomendaciones
  const generarPDF = () => {
    if (!comprasRecomendadas || !comprasRecomendadas.recomendaciones) {
      return
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Colores del sistema (verde matcha y café)
    const colorMatcha = [90, 143, 90] // #5a8f5a
    const colorCoffee = [139, 111, 71] // #8b6f47
    const colorMatchaLight = [184, 221, 198] // #b8ddc6
    const colorCoffeeLight = [232, 221, 208] // #e8ddd0

    // Header con gradiente
    doc.setFillColor(...colorMatcha)
    doc.rect(0, 0, pageWidth, 50, 'F')
    
    // Logo/Icono (círculo con taza de café)
    doc.setFillColor(...colorCoffeeLight)
    doc.circle(25, 25, 12, 'F')
    doc.setTextColor(...colorCoffee)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('☕', 25, 30, { align: 'center' })
    
    // Título del sistema
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...colorCoffeeLight)
    doc.text('Sistema de Control Inteligente', 50, 20)
    
    
    // Subtítulo
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Cafetería', 50, 28)
    doc.setTextColor(...colorCoffeeLight)
    
    // Fecha y hora (bajado más)
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
    
    // Usuario que generó (bajado más)
    const nombreUsuario = usuario 
      ? `${usuario.nombre || ''} ${usuario.apellido_paterno || ''}`.trim() || 'Usuario'
      : 'Usuario'
    doc.text(`Generado por: ${nombreUsuario}`, pageWidth - 20, 42, { align: 'right' })
    
    // Título del reporte
    doc.setFillColor(...colorCoffeeLight)
    doc.rect(0, 55, pageWidth, 15, 'F')
    doc.setTextColor(...colorCoffee)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Recomendaciones de Compra - Próximo Mes', pageWidth / 2, 66, { align: 'center' })
    
    // Resumen
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
    doc.text(`Costo estimado total: $${resumen.total_costo_estimado.toFixed(2)}`, pageWidth - 15, yPos + 15, { align: 'right' })
    doc.text(`Período analizado: ${resumen.periodo_analisis_dias} días`, pageWidth - 15, yPos + 21, { align: 'right' })
    
    yPos = 115

    // Tabla de recomendaciones
    const tableData = comprasRecomendadas.recomendaciones.map(rec => [
      rec.nombre,
      `${rec.stock_actual} ${rec.unidad_medida}`,
      `${rec.stock_minimo} ${rec.unidad_medida}`,
      `${rec.cantidad_recomendada.toFixed(2)} ${rec.unidad_medida}`,
      `$${rec.costo_estimado.toFixed(2)}`,
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
        // Colorear urgencia
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

    // Footer
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

    // Guardar PDF
    const nombreArchivo = `Recomendaciones_Compra_${ahora.toISOString().split('T')[0]}.pdf`
    doc.save(nombreArchivo)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-600 mt-1">Análisis y estadísticas de tu negocio</p>
      </div>

      {/* Filtros de fecha */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
            <div>
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
          <button 
            onClick={cargarDatos}
            disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Calendar className="w-4 h-4" />
            {loading ? 'Cargando...' : 'Generar Reporte'}
          </button>
        </div>
      </div>

      {/* Resumen de reportes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ventas Totales</p>
                <p className="text-2xl font-bold text-gray-900">${ventasTotales.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Período seleccionado
                </p>
              </div>
              <div className="p-3 bg-matcha-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-matcha-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Productos Vendidos</p>
                <p className="text-2xl font-bold text-gray-900">{productosVendidos}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Unidades totales
                </p>
              </div>
              <div className="p-3 bg-coffee-100 rounded-lg">
                <Package className="w-6 h-6 text-coffee-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ticket Promedio</p>
                <p className="text-2xl font-bold text-gray-900">${ticketPromedio.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Por venta
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pedidos Totales</p>
                <p className="text-2xl font-bold text-gray-900">{pedidosTotales}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Ventas realizadas
                </p>
              </div>
              <div className="p-3 bg-matcha-100 rounded-lg">
                <Package className="w-6 h-6 text-matcha-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ventas por Día */}
        <div className="card">
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
                    <stop offset="5%" stopColor="#5a8f5a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#5a8f5a" stopOpacity={0.1} />
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
                  formatter={(value) => `$${value.toFixed(2)}`}
                  labelFormatter={(label) => formatearFecha(label)}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="total_ventas" 
                  stroke="#5a8f5a" 
                  strokeWidth={3}
                  fill="url(#colorVentas)"
                  dot={{ fill: '#5a8f5a', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                  name="Ventas ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="text-sm">Recharts no está instalado</p>
              <p className="text-xs mt-1">Ejecuta: npm install recharts</p>
            </div>
          )}
        </div>

        {/* Gráfico de Productos Más Vendidos */}
        <div className="card">
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
                    <stop offset="5%" stopColor="#5a8f5a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#5a8f5a" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <Bar 
                  dataKey="cantidad_vendida" 
                  fill="url(#colorBarras)" 
                  name="Cantidad Vendida"
                  stroke="#5a8f5a"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p className="text-sm">Recharts no está instalado</p>
              <p className="text-xs mt-1">Ejecuta: npm install recharts</p>
            </div>
          )}
        </div>
      </div>

      {/* Recomendaciones de Compra */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Recomendaciones de Compra - Próximo Mes
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Análisis basado en consumo histórico de los últimos 3 meses
            </p>
          </div>
          <div className="flex gap-2">
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
            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600 mb-1">Insumos Recomendados</p>
                <p className="text-2xl font-bold text-blue-900">
                  {comprasRecomendadas.resumen.total_insumos_recomendados}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-600 mb-1">Urgentes</p>
                <p className="text-2xl font-bold text-red-900">
                  {comprasRecomendadas.resumen.insumos_urgentes}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 mb-1">Costo Estimado</p>
                <p className="text-2xl font-bold text-green-900">
                  ${comprasRecomendadas.resumen.total_costo_estimado.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Período Analizado</p>
                <p className="text-sm font-semibold text-gray-900">
                  {comprasRecomendadas.resumen.periodo_analisis_dias} días
                </p>
              </div>
            </div>

            {/* Lista de Recomendaciones */}
            <div className="overflow-x-auto">
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
                          {rec.consumo_promedio_diario.toFixed(2)} {rec.unidad_medida}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {rec.consumo_proyectado_mes.toFixed(2)} {rec.unidad_medida}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-matcha-600">
                            {rec.cantidad_recomendada.toFixed(2)} {rec.unidad_medida}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-green-600">
                            ${rec.costo_estimado.toFixed(2)}
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

      {/* Tabla de reporte detallado */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Reporte Detallado
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Fecha
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Ventas
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Pedidos
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Ticket Promedio
                </th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-500">
                    No hay ventas en el período seleccionado
                  </td>
                </tr>
              ) : (
                ventas.slice(0, 20).map((venta) => {
                  const fecha = new Date(venta.fecha_venta)
                  const fechaFormateada = fecha.toLocaleDateString('es-MX')
                  const productosEnVenta = venta.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0
                  return (
                    <tr
                      key={venta.id_venta}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-900">{fechaFormateada}</td>
                      <td className="py-3 px-4 font-semibold text-matcha-600">
                        ${parseFloat(venta.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{productosEnVenta}</td>
                      <td className="py-3 px-4 text-gray-600">
                        ${parseFloat(venta.total).toFixed(2)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reportes
