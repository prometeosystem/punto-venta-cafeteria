import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Plus, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import Swal from 'sweetalert2'
import { opcionesProductoService } from '../../application/services/opcionesProductoService'
import { notificarOpcionesActualizadas } from '../hooks/useOpcionesProducto'

// Estos dos grupos tienen su propio bloque en el modal del punto de venta, así
// que no se pueden retirar sin dejar productos a medias.
const GRUPOS_FIJOS = ['leche', 'proteina']

/**
 * Administra los grupos de opciones que el punto de venta ofrece al agregar un
 * producto: qué opciones tiene cada grupo, a qué precio, y si se elige una sola
 * o varias. A qué producto se le ofrece cada grupo se define en Productos.
 */
const OpcionesProductoConfig = () => {
  const [grupos, setGrupos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(null)
  const [edicion, setEdicion] = useState({})
  const [nuevaOpcion, setNuevaOpcion] = useState({})
  const [nuevoGrupo, setNuevoGrupo] = useState({ nombre: '', seleccion: 'multiple' })

  const cargar = useCallback(async () => {
    try {
      const lista = await opcionesProductoService.listarGrupos(false)
      setGrupos(Array.isArray(lista) ? lista : [])
    } catch (error) {
      console.error('Error al cargar los grupos de opciones:', error)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const avisarError = (error, respaldo) => {
    Swal.fire({
      icon: 'error',
      title: 'No se pudo guardar',
      text: error?.response?.data?.detail || error?.message || respaldo,
      confirmButtonColor: '#10b981',
    })
  }

  const refrescar = async () => {
    await cargar()
    // El punto de venta recarga precios sin necesidad de refrescar la página
    notificarOpcionesActualizadas()
  }

  const guardarOpcion = async (opcion, cambios) => {
    setGuardando(opcion.id_opcion)
    try {
      await opcionesProductoService.editar(opcion.id_opcion, cambios)
      setEdicion((prev) => {
        const copia = { ...prev }
        delete copia[opcion.id_opcion]
        return copia
      })
      await refrescar()
    } catch (error) {
      avisarError(error, 'Intenta de nuevo')
    } finally {
      setGuardando(null)
    }
  }

  const agregarOpcion = async (grupo) => {
    const datos = nuevaOpcion[grupo.id_grupo] || { nombre: '', precio: '' }
    if (!datos.nombre.trim()) return
    setGuardando(`nueva-${grupo.id_grupo}`)
    try {
      await opcionesProductoService.crear({
        // 'tipo' se conserva porque las observaciones ya guardadas lo citan
        tipo: grupo.clave === 'leche' ? 'leche' : 'extra',
        nombre: datos.nombre.trim(),
        precio: parseFloat(datos.precio) || 0,
        activo: true,
        orden: (grupo.opciones?.length || 0) + 1,
        id_grupo: grupo.id_grupo,
      })
      setNuevaOpcion((prev) => ({ ...prev, [grupo.id_grupo]: { nombre: '', precio: '' } }))
      await refrescar()
    } catch (error) {
      avisarError(error, 'No se pudo agregar la opción')
    } finally {
      setGuardando(null)
    }
  }

  const agregarGrupo = async () => {
    if (!nuevoGrupo.nombre.trim()) return
    setGuardando('nuevo-grupo')
    try {
      await opcionesProductoService.crearGrupo({
        nombre: nuevoGrupo.nombre.trim(),
        seleccion: nuevoGrupo.seleccion,
        obligatorio: false,
        orden: grupos.length + 1,
      })
      setNuevoGrupo({ nombre: '', seleccion: 'multiple' })
      await refrescar()
    } catch (error) {
      avisarError(error, 'No se pudo crear el grupo')
    } finally {
      setGuardando(null)
    }
  }

  const cambiarSeleccion = async (grupo, seleccion) => {
    setGuardando(`grupo-${grupo.id_grupo}`)
    try {
      await opcionesProductoService.editarGrupo(grupo.id_grupo, { seleccion })
      await refrescar()
    } catch (error) {
      avisarError(error, 'No se pudo cambiar el tipo de selección')
    } finally {
      setGuardando(null)
    }
  }

  const cambiarDisponibilidadGrupo = async (grupo) => {
    if (grupo.activo) {
      const confirmacion = await Swal.fire({
        icon: 'question',
        title: `¿Retirar “${grupo.nombre}”?`,
        text: 'Dejará de ofrecerse en todos los productos que lo tengan asignado. Las ventas anteriores lo conservan.',
        showCancelButton: true,
        confirmButtonText: 'Sí, retirar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
      })
      if (!confirmacion.isConfirmed) return
    }
    setGuardando(`grupo-${grupo.id_grupo}`)
    try {
      await opcionesProductoService.editarGrupo(grupo.id_grupo, { activo: !grupo.activo })
      await refrescar()
    } catch (error) {
      avisarError(error, 'Intenta de nuevo')
    } finally {
      setGuardando(null)
    }
  }

  const cambiarDisponibilidadOpcion = async (opcion) => {
    if (opcion.activo) {
      const confirmacion = await Swal.fire({
        icon: 'question',
        title: `¿Quitar ${opcion.nombre} del menú?`,
        text: 'Dejará de ofrecerse al tomar órdenes. Las ventas anteriores lo conservan.',
        showCancelButton: true,
        confirmButtonText: 'Sí, quitar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc2626',
      })
      if (!confirmacion.isConfirmed) return
    }
    await guardarOpcion(opcion, { activo: !opcion.activo })
  }

  const valorEditado = (opcion, campo) =>
    edicion[opcion.id_opcion]?.[campo] ?? (campo === 'precio' ? String(opcion.precio) : opcion.nombre)

  const editar = (opcion, campo, valor) =>
    setEdicion((prev) => ({
      ...prev,
      [opcion.id_opcion]: { ...prev[opcion.id_opcion], [campo]: valor },
    }))

  const tieneCambios = (opcion) => {
    const pendiente = edicion[opcion.id_opcion]
    if (!pendiente) return false
    const nombreNuevo = pendiente.nombre ?? opcion.nombre
    const precioNuevo = parseFloat(pendiente.precio ?? opcion.precio)
    return nombreNuevo.trim() !== opcion.nombre || precioNuevo !== Number(opcion.precio)
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-2">
        <SlidersHorizontal className="w-5 h-5 text-matcha-600" />
        <h2 className="text-lg font-semibold text-gray-900">Grupos de opciones</h2>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Cada grupo es una sección del modal que aparece al agregar un producto: “Agrega Power”,
        “Extras Kids”, “Topping Especial”. Aquí defines sus opciones y precios; a qué productos se
        les ofrece cada grupo se elige en Productos.
      </p>

      {cargando ? (
        <div className="flex items-center gap-2 text-gray-500 py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando catálogo...
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => {
            const esFijo = GRUPOS_FIJOS.includes(grupo.clave)
            const ocupado = guardando === `grupo-${grupo.id_grupo}`
            return (
              <div
                key={grupo.id_grupo}
                className={`rounded-xl border p-3 ${
                  grupo.activo ? 'border-gray-200' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className={`text-sm font-semibold ${grupo.activo ? 'text-gray-900' : 'text-gray-400'}`}>
                    {grupo.nombre}
                  </h3>

                  <select
                    value={grupo.seleccion}
                    disabled={ocupado}
                    onChange={(e) => cambiarSeleccion(grupo, e.target.value)}
                    className="input py-1 text-xs w-auto"
                    title="Cómo se eligen las opciones de este grupo"
                  >
                    <option value="multiple">Varias a la vez</option>
                    <option value="unica">Solo una</option>
                  </select>

                  <span className="text-xs text-gray-400">
                    {grupo.opciones?.length || 0} opciones
                  </span>

                  <div className="ml-auto">
                    {esFijo ? (
                      <span className="text-[11px] text-gray-400" title="El punto de venta lo muestra en su propio bloque">
                        fijo
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => cambiarDisponibilidadGrupo(grupo)}
                        className={`p-1.5 rounded-lg border-2 disabled:opacity-50 ${
                          grupo.activo
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-matcha-200 text-matcha-700 hover:bg-matcha-50'
                        }`}
                        title={grupo.activo ? 'Retirar grupo' : 'Volver a ofrecer'}
                      >
                        {ocupado ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : grupo.activo ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  {(grupo.opciones || []).map((opcion) => (
                    <div
                      key={opcion.id_opcion}
                      className={`flex flex-wrap items-center gap-2 p-2 rounded-lg border ${
                        opcion.activo ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <input
                        type="text"
                        value={valorEditado(opcion, 'nombre')}
                        onChange={(e) => editar(opcion, 'nombre', e.target.value)}
                        className={`input flex-1 min-w-[140px] ${opcion.activo ? '' : 'text-gray-400'}`}
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={valorEditado(opcion, 'precio')}
                          onChange={(e) => editar(opcion, 'precio', e.target.value)}
                          className="input w-24"
                        />
                      </div>

                      {tieneCambios(opcion) && (
                        <button
                          type="button"
                          disabled={guardando === opcion.id_opcion}
                          onClick={() =>
                            guardarOpcion(opcion, {
                              nombre: valorEditado(opcion, 'nombre').trim(),
                              precio: parseFloat(valorEditado(opcion, 'precio')) || 0,
                            })
                          }
                          className="p-2 rounded-lg border-2 border-matcha-500 text-matcha-700 hover:bg-matcha-50 disabled:opacity-50"
                          title="Guardar cambios"
                        >
                          {guardando === opcion.id_opcion ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" strokeWidth={3} />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={guardando === opcion.id_opcion}
                        onClick={() => cambiarDisponibilidadOpcion(opcion)}
                        className={`p-2 rounded-lg border-2 disabled:opacity-50 ${
                          opcion.activo
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-matcha-200 text-matcha-700 hover:bg-matcha-50'
                        }`}
                        title={opcion.activo ? 'Quitar del menú' : 'Volver a ofrecer'}
                      >
                        {opcion.activo ? <X className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-dashed border-gray-300">
                    <input
                      type="text"
                      placeholder="Nueva opción"
                      value={nuevaOpcion[grupo.id_grupo]?.nombre || ''}
                      onChange={(e) =>
                        setNuevaOpcion((prev) => ({
                          ...prev,
                          [grupo.id_grupo]: { ...prev[grupo.id_grupo], nombre: e.target.value },
                        }))
                      }
                      className="input flex-1 min-w-[140px]"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={nuevaOpcion[grupo.id_grupo]?.precio || ''}
                        onChange={(e) =>
                          setNuevaOpcion((prev) => ({
                            ...prev,
                            [grupo.id_grupo]: { ...prev[grupo.id_grupo], precio: e.target.value },
                          }))
                        }
                        className="input w-24"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={
                        !(nuevaOpcion[grupo.id_grupo]?.nombre || '').trim() ||
                        guardando === `nueva-${grupo.id_grupo}`
                      }
                      onClick={() => agregarOpcion(grupo)}
                      className="p-2 rounded-lg border-2 border-blue-500/50 text-blue-600 hover:bg-blue-500/10 disabled:opacity-40"
                      title="Agregar opción"
                    >
                      {guardando === `nueva-${grupo.id_grupo}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" strokeWidth={3} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-dashed border-gray-300">
            <input
              type="text"
              placeholder="Nuevo grupo. Ej: Salsas"
              value={nuevoGrupo.nombre}
              onChange={(e) => setNuevoGrupo((prev) => ({ ...prev, nombre: e.target.value }))}
              className="input flex-1 min-w-[160px]"
            />
            <select
              value={nuevoGrupo.seleccion}
              onChange={(e) => setNuevoGrupo((prev) => ({ ...prev, seleccion: e.target.value }))}
              className="input w-auto"
            >
              <option value="multiple">Varias a la vez</option>
              <option value="unica">Solo una</option>
            </select>
            <button
              type="button"
              disabled={!nuevoGrupo.nombre.trim() || guardando === 'nuevo-grupo'}
              onClick={agregarGrupo}
              className="p-2 rounded-lg border-2 border-blue-500/50 text-blue-600 hover:bg-blue-500/10 disabled:opacity-40"
              title="Crear grupo"
            >
              {guardando === 'nuevo-grupo' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" strokeWidth={3} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OpcionesProductoConfig
