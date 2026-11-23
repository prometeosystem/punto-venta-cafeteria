import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const ESTADO_INICIAL = {
  area: '',
  categoria: '',
  activo: '',
  canal: '',
  descripcion: '',
  nombre_prefijo: '',
  nombre_sufijo: '',
  precio_modo: '',
  precio_valor: '',
}

/**
 * Modal para aplicar los mismos cambios a varios productos.
 * Todo campo vacío / "Sin cambio" se deja como está en cada producto.
 */
export default function EdicionMasivaProductos({
  cantidad,
  categorias,
  modoTienda,
  guardando,
  onGuardar,
  onCerrar,
}) {
  const [form, setForm] = useState(ESTADO_INICIAL)
  const [error, setError] = useState('')
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const construirPayload = () => {
    const payload = {}
    if (form.area) payload.area = form.area
    if (form.categoria.trim()) payload.categoria = form.categoria.trim()
    if (form.activo) payload.activo = form.activo === 'true'
    if (form.canal) payload.canal = form.canal
    if (form.descripcion.trim()) payload.descripcion = form.descripcion.trim()
    if (form.nombre_prefijo) payload.nombre_prefijo = form.nombre_prefijo
    if (form.nombre_sufijo) payload.nombre_sufijo = form.nombre_sufijo
    if (form.precio_modo && form.precio_valor !== '') {
      payload.precio_modo = form.precio_modo
      payload.precio_valor = Number(form.precio_valor)
    }
    return payload
  }

  const enviar = (e) => {
    e.preventDefault()
    if (form.precio_modo && form.precio_valor === '') {
      setError('Escribe el valor del precio o quita el tipo de cambio')
      return
    }
    const payload = construirPayload()
    if (Object.keys(payload).length === 0) {
      setError('Elige al menos un campo a cambiar')
      return
    }
    setError('')
    onGuardar(payload)
  }

  const etiquetaValor =
    form.precio_modo === 'porcentaje'
      ? 'Porcentaje (ej. 10 sube 10%, -5 baja 5%)'
      : form.precio_modo === 'monto'
        ? 'Monto a sumar (negativo para restar)'
        : 'Nuevo precio'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <form
        onSubmit={enviar}
        className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Editar {cantidad} productos</h2>
            <p className="text-sm text-gray-500">
              Solo se cambian los campos que llenes; el resto queda igual en cada producto.
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {!modoTienda && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700">Área</span>
              <select className="input" value={form.area} onChange={set('area')}>
                <option value="">Sin cambio</option>
                <option value="barra">Barra</option>
                <option value="cocina">Cocina</option>
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Estado</span>
            <select className="input" value={form.activo} onChange={set('activo')}>
              <option value="">Sin cambio</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
          <label className="col-span-2 block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Categoría</span>
            <input
              className="input"
              list="categorias-masivo"
              placeholder="Sin cambio"
              value={form.categoria}
              onChange={set('categoria')}
            />
            <datalist id="categorias-masivo">
              {categorias.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </div>

        <fieldset className="space-y-2 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-medium text-gray-700">Precio</legend>
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.precio_modo} onChange={set('precio_modo')} aria-label="Tipo de cambio de precio">
              <option value="">Sin cambio</option>
              <option value="fijo">Fijar precio</option>
              <option value="porcentaje">Subir/bajar %</option>
              <option value="monto">Sumar/restar monto</option>
            </select>
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder={form.precio_modo ? etiquetaValor : '—'}
              disabled={!form.precio_modo}
              value={form.precio_valor}
              onChange={set('precio_valor')}
              aria-label={etiquetaValor}
            />
          </div>
          {form.precio_modo && <p className="text-xs text-gray-500">{etiquetaValor}</p>}
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-medium text-gray-700">Nombre</legend>
          <p className="text-xs text-gray-500">
            Cada producto conserva su nombre; aquí solo se le agrega texto al inicio o al final.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Prefijo" value={form.nombre_prefijo} onChange={set('nombre_prefijo')} />
            <input className="input" placeholder="Sufijo" value={form.nombre_sufijo} onChange={set('nombre_sufijo')} />
          </div>
        </fieldset>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Descripción (reemplaza la actual)</span>
          <textarea
            className="input min-h-[70px]"
            placeholder="Sin cambio"
            value={form.descripcion}
            onChange={set('descripcion')}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={guardando}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Aplicar a {cantidad}
          </button>
        </div>
      </form>
    </div>
  )
}
