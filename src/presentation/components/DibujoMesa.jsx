import { SILLA, formaMesa } from '../utils/mesasPlano'

const COLORES = {
  libre: { mesa: 'fill-white stroke-gray-300', silla: 'fill-gray-200', numero: 'fill-gray-600' },
  cocina: { mesa: 'fill-marca-100 stroke-marca-500', silla: 'fill-marca-300', numero: 'fill-marca-800' },
  cobrar: { mesa: 'fill-amber-100 stroke-amber-500', silla: 'fill-amber-300', numero: 'fill-amber-800' },
}

export default function DibujoMesa({ capacidad, numero, estado = 'libre', className = '' }) {
  const forma = formaMesa(capacidad)
  const color = COLORES[estado] || COLORES.libre
  const { mesa } = forma
  const centro = mesa.tipo === 'circulo'
    ? { x: mesa.cx, y: mesa.cy }
    : { x: mesa.x + mesa.w / 2, y: mesa.y + mesa.h / 2 }

  return (
    <svg viewBox={`0 0 ${forma.w} ${forma.h}`} className={`block w-full h-full overflow-visible ${className}`}>
      {forma.sillas.map((s, i) => (
        <rect
          key={i}
          x={s.x - SILLA.w / 2}
          y={s.y - SILLA.h / 2}
          width={SILLA.w}
          height={SILLA.h}
          rx="3"
          transform={`rotate(${s.rot} ${s.x} ${s.y})`}
          className={color.silla}
        />
      ))}
      {mesa.tipo === 'circulo' ? (
        <circle cx={mesa.cx} cy={mesa.cy} r={mesa.r} strokeWidth="2" className={color.mesa} />
      ) : (
        <rect x={mesa.x} y={mesa.y} width={mesa.w} height={mesa.h} rx="4" strokeWidth="2" className={color.mesa} />
      )}
      <text
        x={centro.x}
        y={centro.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="16"
        fontWeight="700"
        className={color.numero}
      >
        {numero}
      </text>
    </svg>
  )
}
