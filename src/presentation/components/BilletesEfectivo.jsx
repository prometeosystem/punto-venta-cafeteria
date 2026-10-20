import { useEffect, useState } from 'react'
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
const BilletesEfectivo = ({ montoRecibido, onChange }) => {
  const [conteo, setConteo] = useState({})

  useEffect(() => {
    if (!montoRecibido) setConteo({})
  }, [montoRecibido])

  const sumar = (valor) => {
    const actual = parseFloat(montoRecibido)
    onChange(String((Number.isFinite(actual) ? actual : 0) + valor))
    setConteo((prev) => ({ ...prev, [valor]: (prev[valor] || 0) + 1 }))
  }

  const borrar = () => {
    setConteo({})
    onChange('')
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {BILLETES.map(({ valor, imagen }) => (
          <button
            key={valor}
            type="button"
            onClick={() => sumar(valor)}
            className="relative aspect-[9/5] overflow-hidden rounded-md ring-1 ring-black/10 shadow-sm active:scale-95 transition-transform"
            aria-label={`Agregar billete de ${valor} pesos`}
          >
            <img src={imagen} alt="" className="w-full h-full object-cover" draggable="false" />
            {conteo[valor] > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-none text-white">
                {conteo[valor]}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={borrar}
          className="aspect-[9/5] rounded-md border-2 border-gray-300 bg-white text-gray-700 text-sm font-semibold leading-tight px-1 active:scale-95 transition-transform"
        >
          Borrar monto
        </button>
      </div>
    </div>
  )
}

export default BilletesEfectivo
