import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Plus, Tags } from 'lucide-react'
import Swal from 'sweetalert2'
import { movimientoCajaService } from '../../application/services/movimientoCajaService'

const ETIQUETA_APLICA = {
  ambos: 'Ambos',
  entrada: 'Entrada',
  salida: 'Salida',
}

const etiquetaAplica = (valor) => ETIQUETA_APLICA[valor] || valor

/**
 * Administra las categorías de entradas y salidas de caja.
 * En Configuración empieza cerrada. En su propia ruta se abre sola.
 */
const CategoriasMovimiento = ({ desplegado = false }) => {
  const [abierto, setAbierto] = useState(desplegado)
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(false)
  const [nueva, setNueva] = useState({ nombre: '', aplica_a: 'ambos' })
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    if (!abierto) return undefined
    let vivo = true
    const cargar = async () => {
      setCargando(true)
      try {
        const data = await movimientoCajaService.listarCategorias()
        if (vivo) setCategorias(data.categorias || [])
      } catch (error) {
        console.error('Error al cargar categorías de movimiento:', error)
      } finally {
        if (vivo) setCargando(false)
      }
    }
    cargar()
    return () => {
      vivo = false
    }
  }, [abierto, recarga])

  const crear = async () => {
    if (!nueva.nombre.trim()) return
    const result = await movimientoCajaService.crearCategoria({
      nombre: nueva.nombre.trim(),
      aplica_a: nueva.aplica_a,
    })
    if (result.error) {
      Swal.fire('Error', result.error, 'error')
      return
    }
    setNueva({ nombre: '', aplica_a: 'ambos' })
    setRecarga((valor) => valor + 1)
  }

  const desactivar = async (id) => {
    const confirm = await Swal.fire({
      title: '¿Desactivar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'rgb(var(--marca-500))',
      cancelButtonText: 'Cancelar',
    })
    if (!confirm.isConfirmed) return
    await movimientoCajaService.desactivarCategoria(id)
    setRecarga((valor) => valor + 1)
  }

  return (
    <div className="card min-w-0 overflow-hidden !p-4 sm:p-6">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 text-left"
      >
        <Tags className="w-5 h-5 text-marca-600 shrink-0" />
        <h2 className="flex-1 text-lg font-semibold text-gray-900">Categorías de movimiento</h2>
        {abierto ? (
          <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
        )}
      </button>

      {abierto && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-600">
            Administra las categorías usadas en entradas y salidas de caja.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              placeholder="Nombre"
              value={nueva.nombre}
              onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
              className="input min-w-0 sm:flex-1"
            />
            <select
              value={nueva.aplica_a}
              onChange={(e) => setNueva({ ...nueva, aplica_a: e.target.value })}
              className="input sm:w-40"
            >
              <option value="ambos">Ambos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
            </select>
            <button
              type="button"
              onClick={crear}
              className="btn-primary inline-flex shrink-0 items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear
            </button>
          </div>

          {cargando ? (
            <div className="flex items-center gap-2 py-6 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando categorías...
            </div>
          ) : categorias.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No hay categorías</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-100 sm:hidden">
                {categorias.map((categoria) => (
                  <li key={categoria.id_categoria_movimiento} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{categoria.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {etiquetaAplica(categoria.aplica_a)} · {categoria.activo ? 'Activa' : 'Inactiva'}
                      </p>
                    </div>
                    {categoria.activo && (
                      <button
                        type="button"
                        onClick={() => desactivar(categoria.id_categoria_movimiento)}
                        className="shrink-0 text-sm text-red-600"
                      >
                        Desactivar
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="hidden min-w-0 overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 text-white">
                    <tr>
                      <th className="p-3 text-left">Nombre</th>
                      <th className="p-3 text-left">Aplica a</th>
                      <th className="p-3 text-left">Estado</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((categoria) => (
                      <tr key={categoria.id_categoria_movimiento} className="border-b">
                        <td className="p-3">{categoria.nombre}</td>
                        <td className="p-3">{etiquetaAplica(categoria.aplica_a)}</td>
                        <td className="p-3">{categoria.activo ? 'Activa' : 'Inactiva'}</td>
                        <td className="p-3 text-right">
                          {categoria.activo && (
                            <button
                              type="button"
                              onClick={() => desactivar(categoria.id_categoria_movimiento)}
                              className="text-xs text-red-600"
                            >
                              Desactivar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoriasMovimiento
