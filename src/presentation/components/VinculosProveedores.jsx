import { Plus, Trash2 } from 'lucide-react'

/**
 * Editor de proveedores que surten un producto o insumo.
 * vinculos: [{ id_proveedor, precio_compra, es_preferido }]
 */
const VinculosProveedores = ({
  proveedores = [],
  vinculos = [],
  onChange,
  compact = false,
}) => {
  const usados = new Set(vinculos.map((v) => Number(v.id_proveedor)))
  const disponibles = proveedores.filter((p) => p.activo !== 0 && p.activo !== false && !usados.has(p.id_proveedor))

  const actualizar = (index, patch) => {
    const next = vinculos.map((v, i) => (i === index ? { ...v, ...patch } : v))
    if (patch.es_preferido) {
      next.forEach((v, i) => {
        if (i !== index) v.es_preferido = false
      })
    }
    onChange(next)
  }

  const agregar = (idProveedor) => {
    if (!idProveedor) return
    onChange([
      ...vinculos,
      {
        id_proveedor: Number(idProveedor),
        precio_compra: '',
        es_preferido: vinculos.length === 0,
      },
    ])
  }

  const quitar = (index) => {
    const next = vinculos.filter((_, i) => i !== index)
    if (next.length && !next.some((v) => v.es_preferido)) {
      next[0].es_preferido = true
    }
    onChange(next)
  }

  const nombreDe = (id) =>
    proveedores.find((p) => p.id_proveedor === Number(id))?.nombre || `Proveedor #${id}`

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {vinculos.length === 0 && (
        <p className="text-sm text-gray-400 py-1">Sin proveedores ligados.</p>
      )}

      <ul className="space-y-2">
        {vinculos.map((v, index) => (
          <li
            key={`${v.id_proveedor}-${index}`}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2"
          >
            <span className="text-sm font-medium text-gray-800 flex-1 min-w-[8rem]">
              {nombreDe(v.id_proveedor)}
            </span>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              $
              <input
                type="number"
                min="0"
                step="0.01"
                className="campo h-9 w-24"
                placeholder="Costo"
                value={v.precio_compra ?? ''}
                onChange={(e) => actualizar(index, { precio_compra: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
              <input
                type="radio"
                name="prov-preferido"
                checked={!!v.es_preferido}
                onChange={() => actualizar(index, { es_preferido: true })}
              />
              Preferido
            </label>
            <button
              type="button"
              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
              onClick={() => quitar(index)}
              title="Quitar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      {disponibles.length > 0 ? (
        <div className="flex gap-2 items-center">
          <select
            className="campo flex-1"
            defaultValue=""
            key={vinculos.length}
            onChange={(e) => {
              agregar(e.target.value)
              e.target.value = ''
            }}
          >
            <option value="">+ Agregar proveedor…</option>
            {disponibles.map((p) => (
              <option key={p.id_proveedor} value={p.id_proveedor}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />
          {proveedores.length === 0
            ? 'Primero crea proveedores en el menú Proveedores.'
            : 'Todos los proveedores ya están ligados.'}
        </p>
      )}
    </div>
  )
}

export default VinculosProveedores
