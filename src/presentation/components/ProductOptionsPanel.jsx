/**
 * Panel de opciones de producto para el POS.
 * Incluye leche, extras, proteína y tipo de preparación (frío/frapeada).
 */
import {
  EXTRAS_DISPONIBLES,
  LECHE_PRECIOS,
  PROTEINA_SCOOP_PRECIO,
  tieneScoopProteina,
} from '../utils/productOptionsConfig'

const ProductOptionsPanel = ({
  product,
  opciones,
  onChange,
  onConfirm,
  onCancel,
}) => {
  const llevaLeche = Boolean(product.lleva_leche === true || product.lleva_leche === 1 || product.lleva_leche === '1')
  const llevaExtras = Boolean(product.lleva_extras === true || product.lleva_extras === 1 || product.lleva_extras === '1')
  const llevaProteina = Boolean(
    product.lleva_proteina === true || product.lleva_proteina === 1 ||
    product.lleva_proteina === '1' || product.categoria === 'runner_proteina'
  )
  const esBebidaFria = product.categoria === 'Bebidas Frías' || product.categoria === 'bebidas_frias' || product.categoria === 'bebida_fria'

  const toggleExtra = (extraId) => {
    const extras = opciones.extras || []
    const nuevos = extras.includes(extraId)
      ? extras.filter((e) => e !== extraId)
      : [...extras, extraId]
    onChange({ ...opciones, extras: nuevos })
  }

  const toggleScoop = () => {
    onChange({
      ...opciones,
      tipoProteina: tieneScoopProteina(opciones.tipoProteina) ? null : 'scoop',
    })
  }

  return (
    <div className="bg-gray-50 border rounded-lg p-4 mt-2 space-y-3">
      {llevaLeche && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Tipo de leche</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'entera', label: 'Entera' },
              { value: 'deslactosada', label: `Deslactosada (+$${LECHE_PRECIOS.deslactosada})` },
              { value: 'almendras', label: `Almendras (+$${LECHE_PRECIOS.almendras})` },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...opciones, tipoLeche: opt.value })}
                className={`px-3 py-1 rounded text-sm border ${
                  opciones.tipoLeche === opt.value ? 'bg-matcha-500 text-white border-matcha-500' : 'bg-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {llevaExtras && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Extras</p>
          <div className="flex gap-2 flex-wrap">
            {EXTRAS_DISPONIBLES.map((extra) => (
              <button
                key={extra.id}
                type="button"
                onClick={() => toggleExtra(extra.id)}
                className={`px-3 py-1 rounded text-sm border ${
                  (opciones.extras || []).includes(extra.id) ? 'bg-matcha-500 text-white border-matcha-500' : 'bg-white'
                }`}
              >
                {extra.label} (+${extra.precio})
              </button>
            ))}
          </div>
        </div>
      )}

      {llevaProteina && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Proteína extra</p>
          <button
            type="button"
            onClick={toggleScoop}
            className={`px-3 py-1 rounded text-sm border ${
              tieneScoopProteina(opciones.tipoProteina) ? 'bg-matcha-500 text-white border-matcha-500' : 'bg-white'
            }`}
          >
            Scoop de proteína (+${PROTEINA_SCOOP_PRECIO})
          </button>
        </div>
      )}

      {esBebidaFria && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Preparación *</p>
          <div className="flex gap-2">
            {[
              { value: 'heladas', label: 'Frío' },
              { value: 'frapeadas', label: 'Frapeada' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...opciones, tipoPreparacion: opt.value })}
                className={`px-3 py-1 rounded text-sm border ${
                  opciones.tipoPreparacion === opt.value ? 'bg-matcha-500 text-white border-matcha-500' : 'bg-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onConfirm} className="flex-1 bg-matcha-500 text-white py-2 rounded-lg text-sm font-medium">
          Agregar al carrito
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg text-sm">
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default ProductOptionsPanel
