import billete20 from '../../assets/billetes/20.webp'
import billete50 from '../../assets/billetes/50.webp'
import billete100 from '../../assets/billetes/100.webp'
import billete200 from '../../assets/billetes/200.webp'
import billete500 from '../../assets/billetes/500.webp'

const BILLETES = [
  { valor: 20, imagen: billete20 },
  { valor: 50, imagen: billete50 },
  { valor: 100, imagen: billete100 },
  { valor: 200, imagen: billete200 },
  { valor: 500, imagen: billete500 },
]

// Los billetes se suman: el cliente puede pagar con 200 + 50
const BilletesEfectivo = ({ total, montoRecibido, onChange }) => {
  const sumar = (valor) => {
    const actual = parseFloat(montoRecibido)
    onChange(String((Number.isFinite(actual) ? actual : 0) + valor))
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {BILLETES.map(({ valor, imagen }) => (
          <button
            key={valor}
            type="button"
            onClick={() => sumar(valor)}
            className="aspect-[9/5] overflow-hidden rounded-md ring-1 ring-black/10 shadow-sm active:scale-95 transition-transform"
            aria-label={`Agregar billete de ${valor} pesos`}
          >
            <img src={imagen} alt="" className="w-full h-full object-cover" draggable="false" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(total.toFixed(2))}
          className="aspect-[9/5] rounded-md border-2 border-matcha-500 bg-matcha-50 text-matcha-700 text-sm font-semibold active:scale-95 transition-transform"
        >
          Exacto
        </button>
      </div>
      {montoRecibido !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-xs font-medium text-gray-500 hover:text-gray-800 underline underline-offset-2"
        >
          Borrar monto
        </button>
      )}
    </div>
  )
}

export default BilletesEfectivo
