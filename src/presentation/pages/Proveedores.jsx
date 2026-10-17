import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Plus, Loader2, Truck, PackagePlus, Search, Trash2, History,
} from 'lucide-react'
import { proveedoresService } from '../../application/services/proveedoresService'
import { inventarioService } from '../../application/services/inventarioService'
import { productosService } from '../../application/services/productosService'
import {
  FRECUENCIAS_VISITA,
  DIAS_SEMANA,
  OPCIONES_ENTREGA,
  parseDiasVisita,
  serializarDiasVisita,
  etiquetaDiasVisita,
  etiquetaEntrega,
} from '../utils/proveedorFrecuencia'
import Swal from 'sweetalert2'

const formVacio = {
  nombre: '',
  telefono: '',
  whatsapp: '',
  correo: '',
  frecuenciaVisita: '',
  diasSemana: [],
  tiempo_entrega_dias: '',
  notas: '',
  activo: true,
}

const urgenciaClass = {
  alta: 'bg-red-100 text-red-700',
  media: 'bg-amber-100 text-amber-800',
  baja: 'bg-gray-100 text-gray-700',
}

const Proveedores = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const volverA = location.state?.volverA || null
  const [tab, setTab] = useState('lista') // lista | comprar | detalle
  const [proveedores, setProveedores] = useState([])
  const [sugerencias, setSugerencias] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [insumos, setInsumos] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalProv, setModalProv] = useState(false)
  const [form, setForm] = useState(formVacio)
  const [editId, setEditId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [pedido, setPedido] = useState({}) // key tipo-id -> {cantidad, precio, checked}
  const [itemNuevo, setItemNuevo] = useState({ tipo_item: 'insumo', id_item: '', precio_compra: '', es_preferido: true })
  const [busqueda, setBusqueda] = useState('')

  const cargar = async () => {
    setLoading(true)
    try {
      const [prov, sug, ins, prods] = await Promise.all([
        proveedoresService.listar(true),
        proveedoresService.porComprar(),
        inventarioService.obtenerInsumos(),
        productosService.obtenerProductos(),
      ])
      setProveedores(Array.isArray(prov) ? prov : [])
      setSugerencias(Array.isArray(sug) ? sug : [])
      setInsumos(Array.isArray(ins) ? ins : [])
      setProductos(Array.isArray(prods) ? prods : [])
    } catch (err) {
      Swal.fire('Error', err.response?.data?.detail || 'No se pudieron cargar proveedores', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  useEffect(() => {
    if (!location.state?.abrirAlta) return
    setEditId(null)
    setForm(formVacio)
    setModalProv(true)
  }, [location.state])

  const abrirDetalle = async (id) => {
    setLoading(true)
    try {
      const [det, hist] = await Promise.all([
        proveedoresService.obtener(id),
        proveedoresService.historial(id),
      ])
      setSeleccionado(det)
      setHistorial(Array.isArray(hist) ? hist : [])
      setTab('detalle')
    } catch (err) {
      Swal.fire('Error', err.response?.data?.detail || 'No se pudo abrir el proveedor', 'error')
    } finally {
      setLoading(false)
    }
  }

  const guardarProveedor = async () => {
    if (!form.nombre.trim()) {
      Swal.fire({ position: 'top', icon: 'warning', title: 'Atención', text: 'El nombre es obligatorio' })
      return
    }
    if (form.frecuenciaVisita === 'dias_fijos' && !(form.diasSemana || []).length) {
      Swal.fire({
        position: 'top',
        icon: 'warning',
        title: 'Atención',
        text: 'Elige al menos un día de la semana',
      })
      return
    }
    setGuardando(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        telefono: form.telefono || null,
        whatsapp: form.whatsapp || null,
        correo: form.correo || null,
        dias_visita: serializarDiasVisita(form.frecuenciaVisita, form.diasSemana),
        tiempo_entrega_dias:
          form.tiempo_entrega_dias === '' ? null : Number(form.tiempo_entrega_dias),
        notas: form.notas || null,
        activo: !!form.activo,
      }
      let creado = null
      if (editId) await proveedoresService.editar(editId, payload)
      else creado = await proveedoresService.crear(payload)
      setModalProv(false)
      if (!editId && volverA) {
        navigate(volverA, { state: { proveedorCreado: creado?.id_proveedor } })
        return
      }
      setForm(formVacio)
      setEditId(null)
      await cargar()
      if (seleccionado?.id_proveedor === editId) {
        await abrirDetalle(editId)
      }
    } catch (err) {
      Swal.fire({
        position: 'top',
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.detail || 'No se pudo guardar',
      })
    } finally {
      setGuardando(false)
    }
  }

  const formDesdeProveedor = (p) => {
    const parsed = parseDiasVisita(p.dias_visita)
    return {
      nombre: p.nombre || '',
      telefono: p.telefono || '',
      whatsapp: p.whatsapp || '',
      correo: p.correo || '',
      frecuenciaVisita: parsed.modo || '',
      diasSemana: parsed.dias || [],
      tiempo_entrega_dias:
        p.tiempo_entrega_dias === null || p.tiempo_entrega_dias === undefined
          ? ''
          : String(p.tiempo_entrega_dias),
      notas: p.notas || '',
      activo: !!p.activo,
    }
  }

  const ligarItem = async () => {
    if (!seleccionado || !itemNuevo.id_item) return
    try {
      await proveedoresService.agregarItem(seleccionado.id_proveedor, {
        tipo_item: itemNuevo.tipo_item,
        id_item: Number(itemNuevo.id_item),
        precio_compra: itemNuevo.precio_compra === '' ? null : Number(itemNuevo.precio_compra),
        es_preferido: !!itemNuevo.es_preferido,
      })
      setItemNuevo({ tipo_item: 'insumo', id_item: '', precio_compra: '', es_preferido: true })
      await abrirDetalle(seleccionado.id_proveedor)
    } catch (err) {
      Swal.fire('Error', err.response?.data?.detail || 'No se pudo ligar el ítem', 'error')
    }
  }

  const desligar = async (idItem) => {
    const ok = await Swal.fire({
      title: '¿Quitar del catálogo?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
    })
    if (!ok.isConfirmed) return
    await proveedoresService.quitarItem(idItem)
    await abrirDetalle(seleccionado.id_proveedor)
  }

  const sugerenciasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return sugerencias
    const q = busqueda.toLowerCase()
    return sugerencias.filter(
      (s) =>
        s.nombre_item?.toLowerCase().includes(q) ||
        s.proveedor_nombre?.toLowerCase().includes(q),
    )
  }, [sugerencias, busqueda])

  const togglePedido = (s) => {
    const key = `${s.tipo_item}-${s.id_item}-${s.id_proveedor}`
    setPedido((prev) => {
      if (prev[key]?.checked) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return {
        ...prev,
        [key]: {
          checked: true,
          id_proveedor: s.id_proveedor,
          tipo_item: s.tipo_item,
          id_item: s.id_item,
          nombre_item: s.nombre_item,
          unidad_medida: s.unidad_medida,
          cantidad: s.cantidad_sugerida,
          precio_unitario: s.precio_compra || 0,
        },
      }
    })
  }

  const recibirSeleccionados = async () => {
    const items = Object.values(pedido).filter((p) => p.checked)
    if (!items.length) {
      Swal.fire('Atención', 'Marca al menos un producto a recibir', 'warning')
      return
    }
    const porProv = {}
    items.forEach((i) => {
      if (!porProv[i.id_proveedor]) porProv[i.id_proveedor] = []
      porProv[i.id_proveedor].push(i)
    })
    const ids = Object.keys(porProv)
    if (ids.length > 1) {
      Swal.fire('Atención', 'Recibe de un solo proveedor a la vez', 'warning')
      return
    }
    const idProv = Number(ids[0])
    const total = items.reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unitario), 0)
    const ok = await Swal.fire({
      title: 'Recibir compra',
      html: `Se subirá el stock y se registrará egreso de caja por <b>$${total.toFixed(2)}</b>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Recibir',
    })
    if (!ok.isConfirmed) return

    try {
      const res = await proveedoresService.recibirCompra({
        id_proveedor: idProv,
        registrar_en_caja: true,
        items: items.map((i) => ({
          tipo_item: i.tipo_item,
          id_item: i.id_item,
          cantidad: Number(i.cantidad),
          unidad_medida: i.unidad_medida,
          precio_unitario: Number(i.precio_unitario),
          nombre_item: i.nombre_item,
        })),
      })
      await Swal.fire('Listo', `Compra #${res.id_compra} por $${Number(res.total).toFixed(2)}`, 'success')
      setPedido({})
      await cargar()
    } catch (err) {
      Swal.fire('Error', err.response?.data?.detail || 'No se pudo recibir la compra', 'error')
    }
  }

  const catalogoItems = itemNuevo.tipo_item === 'insumo' ? insumos : productos.filter((p) => p.es_reventa || true)

  if (loading && !proveedores.length && tab === 'lista') {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-marca-500" />
      </div>
    )
  }

  const volverAlProducto = () => {
    if (volverA) navigate(volverA)
  }

  return (
    <div className="space-y-4">
      {volverA && (
        <button
          type="button"
          onClick={volverAlProducto}
          className="text-sm text-marca-700 hover:underline"
        >
          ← Volver al producto
        </button>
      )}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'lista' ? 'bg-marca-100 text-marca-800' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('lista')}
          >
            Proveedores
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'comprar' ? 'bg-marca-100 text-marca-800' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setTab('comprar')}
          >
            Por comprar
          </button>
          {tab === 'detalle' && seleccionado && (
            <span className="px-3 py-1.5 rounded-lg text-sm bg-oscuro-800 text-white">
              {seleccionado.nombre}
            </span>
          )}
        </div>
        {tab === 'lista' && (
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={() => {
              setEditId(null)
              setForm(formVacio)
              setModalProv(true)
            }}
          >
            <Plus className="w-4 h-4" />
            Nuevo proveedor
          </button>
        )}
        {tab === 'comprar' && (
          <button type="button" className="btn-primary flex items-center gap-2" onClick={recibirSeleccionados}>
            <PackagePlus className="w-4 h-4" />
            Recibir seleccionados
          </button>
        )}
      </div>

      {tab === 'lista' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {proveedores.length === 0 ? (
            <p className="p-6 text-gray-500 text-sm">Aún no hay proveedores. Crea el primero.</p>
          ) : (
            proveedores.map((p) => (
              <button
                key={p.id_proveedor}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3"
                onClick={() => abrirDetalle(p.id_proveedor)}
              >
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{p.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {[p.telefono, p.dias_visita].filter(Boolean).join(' · ') || 'Sin contacto'}
                      {!p.activo ? ' · Inactivo' : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-marca-600">Ver</span>
              </button>
            ))
          )}
        </div>
      )}

      {tab === 'comprar' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 w-full"
              placeholder="Filtrar por producto o proveedor"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          {sugerenciasFiltradas.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              Nada urgente. Ligá insumos/productos a cada proveedor para ver sugerencias.
            </p>
          ) : (
            <ul className="divide-y">
              {sugerenciasFiltradas.map((s) => {
                const key = `${s.tipo_item}-${s.id_item}-${s.id_proveedor}`
                const sel = pedido[key]
                return (
                  <li key={key} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="flex items-start gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!!sel?.checked}
                        onChange={() => togglePedido(s)}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{s.nombre_item}</p>
                        <p className="text-xs text-gray-500">
                          {s.proveedor_nombre} · stock {s.stock_actual} / mín {s.stock_minimo} {s.unidad_medida}
                        </p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${urgenciaClass[s.urgencia] || urgenciaClass.baja}`}>
                          {s.urgencia}
                        </span>
                      </div>
                    </label>
                    {sel?.checked && (
                      <div className="flex gap-2 items-center text-sm">
                        <input
                          type="number"
                          className="campo w-24"
                          min="0.001"
                          step="any"
                          value={sel.cantidad}
                          onChange={(e) =>
                            setPedido((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], cantidad: e.target.value },
                            }))
                          }
                        />
                        <span>×</span>
                        <input
                          type="number"
                          className="campo w-24"
                          min="0"
                          step="any"
                          value={sel.precio_unitario}
                          onChange={(e) =>
                            setPedido((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], precio_unitario: e.target.value },
                            }))
                          }
                        />
                      </div>
                    )}
                    {!sel?.checked && (
                      <p className="text-sm text-gray-600 whitespace-nowrap">
                        Sug. {s.cantidad_sugerida} · ${Number(s.costo_estimado || 0).toFixed(2)}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'detalle' && seleccionado && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold">{seleccionado.nombre}</h2>
                <p className="text-sm text-gray-500">
                  {[seleccionado.telefono, seleccionado.whatsapp, seleccionado.correo].filter(Boolean).join(' · ') || 'Sin contacto'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Visita: {etiquetaDiasVisita(seleccionado.dias_visita)}
                  {' · '}
                  Entrega: {etiquetaEntrega(seleccionado.tiempo_entrega_dias)}
                </p>
                {seleccionado.notas && <p className="text-sm text-gray-600 mt-1">{seleccionado.notas}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100"
                  onClick={() => {
                    setEditId(seleccionado.id_proveedor)
                    setForm(formDesdeProveedor(seleccionado))
                    setModalProv(true)
                  }}
                >
                  Editar
                </button>
                <button type="button" className="px-3 py-1.5 text-sm rounded-lg bg-gray-100" onClick={() => setTab('lista')}>
                  Volver
                </button>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-800 mb-1">Qué le compras</h3>
            <p className="text-xs text-gray-500 mb-2">
              Lo habitual es ligar proveedores desde Productos o Insumos. Aquí puedes revisar o ajustar.
            </p>
            <ul className="divide-y border rounded-lg mb-4">
              {(seleccionado.items || []).length === 0 && (
                <li className="p-3 text-sm text-gray-500">
                  Sin ítems. Ábrelos en Productos/Insumos y elige este proveedor, o ligálos aquí abajo.
                </li>
              )}
              {(seleccionado.items || []).map((it) => (
                <li key={it.id_proveedor_item} className="px-3 py-2 flex justify-between gap-2 text-sm">
                  <div>
                    <span className="font-medium">{it.nombre_item}</span>
                    <span className="text-gray-500"> · {it.tipo_item}</span>
                    {it.es_preferido ? <span className="ml-2 text-xs text-marca-700">preferido</span> : null}
                    <p className="text-xs text-gray-500">
                      Stock {it.stock_actual} / mín {it.stock_minimo} · costo ${Number(it.precio_compra || 0).toFixed(2)}
                    </p>
                  </div>
                  <button type="button" className="text-red-500" onClick={() => desligar(it.id_proveedor_item)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="grid sm:grid-cols-4 gap-2 items-end">
              <label className="campo-label">
                Tipo
                <select
                  className="campo"
                  value={itemNuevo.tipo_item}
                  onChange={(e) => setItemNuevo({ ...itemNuevo, tipo_item: e.target.value, id_item: '' })}
                >
                  <option value="insumo">Insumo</option>
                  <option value="producto">Producto</option>
                </select>
              </label>
              <label className="campo-label sm:col-span-2">
                Ítem
                <select
                  className="campo"
                  value={itemNuevo.id_item}
                  onChange={(e) => setItemNuevo({ ...itemNuevo, id_item: e.target.value })}
                >
                  <option value="">Seleccionar…</option>
                  {catalogoItems.map((c) => (
                    <option
                      key={c.id_insumo || c.id_producto}
                      value={c.id_insumo || c.id_producto}
                    >
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo-label">
                Precio compra
                <input
                  type="number"
                  className="campo"
                  value={itemNuevo.precio_compra}
                  onChange={(e) => setItemNuevo({ ...itemNuevo, precio_compra: e.target.value })}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm mt-2">
              <input
                type="checkbox"
                checked={itemNuevo.es_preferido}
                onChange={(e) => setItemNuevo({ ...itemNuevo, es_preferido: e.target.checked })}
              />
              Proveedor preferido de este ítem
            </label>
            <button type="button" className="btn-primary mt-3" onClick={ligarItem}>
              Ligar ítem
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <History className="w-4 h-4" /> Historial de compras
            </h3>
            {historial.length === 0 ? (
              <p className="text-sm text-gray-500">Sin compras registradas.</p>
            ) : (
              <ul className="divide-y text-sm">
                {historial.map((c) => (
                  <li key={c.id_compra} className="py-2">
                    <div className="flex justify-between">
                      <span>#{c.id_compra} · {c.usuario_nombre}</span>
                      <span className="font-medium">${Number(c.total).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {(c.detalles || []).map((d) => `${d.nombre_item} × ${d.cantidad}`).join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {modalProv && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-3 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-md my-4 flex flex-col max-h-[min(94vh,720px)]">
            <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
              <h3 className="text-sm font-semibold text-gray-800">
                {editId ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => (volverA && !editId ? volverAlProducto() : setModalProv(false))}>
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-3 space-y-3">
              {[
                ['nombre', 'Nombre *'],
                ['telefono', 'Teléfono'],
                ['whatsapp', 'WhatsApp'],
                ['correo', 'Correo'],
              ].map(([key, label]) => (
                <label key={key} className="campo-label">
                  {label}
                  <input
                    className="campo"
                    type="text"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}

              <label className="campo-label">
                Frecuencia de visita
                <select
                  className="campo"
                  value={form.frecuenciaVisita}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      frecuenciaVisita: e.target.value,
                      diasSemana: e.target.value === 'dias_fijos' ? form.diasSemana : [],
                    })
                  }
                >
                  <option value="">Sin definir</option>
                  {FRECUENCIAS_VISITA.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>

              {form.frecuenciaVisita === 'dias_fijos' && (
                <div>
                  <p className="campo-label">Días de la semana</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DIAS_SEMANA.map((d) => {
                      const on = (form.diasSemana || []).includes(d.id)
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            const dias = form.diasSemana || []
                            setForm({
                              ...form,
                              diasSemana: on ? dias.filter((x) => x !== d.id) : [...dias, d.id],
                            })
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                            on
                              ? 'border-marca-500 bg-marca-50 text-marca-800'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <label className="campo-label">
                Tiempo de entrega
                <select
                  className="campo"
                  value={form.tiempo_entrega_dias}
                  onChange={(e) => setForm({ ...form, tiempo_entrega_dias: e.target.value })}
                >
                  <option value="">Sin definir</option>
                  {OPCIONES_ENTREGA.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Servirá para avisos tipo “el proveedor llega mañana”.
                </span>
              </label>

              <label className="campo-label">
                Notas
                <textarea
                  className="campo"
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
                Activo
              </label>
            </div>
            <div className="flex gap-2 px-3 py-2.5 border-t shrink-0">
              <button
                type="button"
                className="btn-outline flex-1 py-2 text-sm"
                onClick={() => (volverA && !editId ? volverAlProducto() : setModalProv(false))}
              >
                {volverA && !editId ? 'Volver al producto' : 'Cancelar'}
              </button>
              <button type="button" className="btn-primary flex-1 py-2 text-sm" onClick={guardarProveedor} disabled={guardando}>
                {guardando ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Proveedores
