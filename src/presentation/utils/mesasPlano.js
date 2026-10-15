// Forma de cada tipo de mesa vista desde arriba: la mesa y una silla por persona.
// Las medidas están en las mismas unidades para todas, así una mesa de 6 se ve
// más grande que una de 2 cuando el plano las escala igual.

export const SILLA = { w: 18, h: 8 }

const redonda = (r, sillas) => {
  const c = r + 14
  const lugares = Array.from({ length: sillas }, (_, i) => {
    const angulo = -90 + (360 / sillas) * i
    const rad = (angulo * Math.PI) / 180
    return { x: c + (r + 8) * Math.cos(rad), y: c + (r + 8) * Math.sin(rad), rot: angulo + 90 }
  })
  return { w: c * 2, h: c * 2, mesa: { tipo: 'circulo', cx: c, cy: c, r }, sillas: lugares }
}

const FORMAS = {
  1: {
    w: 50, h: 58,
    mesa: { tipo: 'rect', x: 8, y: 16, w: 34, h: 34 },
    sillas: [{ x: 25, y: 8, rot: 0 }],
  },
  2: {
    w: 56, h: 68,
    mesa: { tipo: 'rect', x: 10, y: 16, w: 36, h: 36 },
    sillas: [{ x: 28, y: 8, rot: 0 }, { x: 28, y: 60, rot: 0 }],
  },
  3: redonda(23, 3),
  4: {
    w: 76, h: 76,
    mesa: { tipo: 'rect', x: 16, y: 16, w: 44, h: 44 },
    sillas: [
      { x: 38, y: 8, rot: 0 }, { x: 38, y: 68, rot: 0 },
      { x: 8, y: 38, rot: 90 }, { x: 68, y: 38, rot: 90 },
    ],
  },
  5: redonda(28, 5),
  6: {
    w: 112, h: 76,
    mesa: { tipo: 'rect', x: 8, y: 16, w: 96, h: 44 },
    sillas: [24, 56, 88].flatMap((x) => [{ x, y: 8, rot: 0 }, { x, y: 68, rot: 0 }]),
  },
}

export const CAPACIDADES = [1, 2, 3, 4, 5, 6]

export const formaMesa = (capacidad) => FORMAS[capacidad] || FORMAS[4]

// libre, cocina (comanda en curso) o cobrar (comanda terminada sin pagar)
export const estadoDeMesa = (mesa) => {
  if (!mesa?.cuenta) return 'libre'
  return mesa.cuenta.estado === 'terminada' ? 'cobrar' : 'cocina'
}
