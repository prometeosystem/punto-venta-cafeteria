import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { movimientoCajaService } from '../../application/services/movimientoCajaService'
import { Plus, ArrowLeft } from 'lucide-react'
import Swal from 'sweetalert2'

const CategoriasMovimiento = () => {
  const [categorias, setCategorias] = useState([])
  const [nueva, setNueva] = useState({ nombre: '', aplica_a: 'ambos' })

  const cargar = async () => {
    const data = await movimientoCajaService.listarCategorias()
    setCategorias(data.categorias || [])
  }

  useEffect(() => { cargar() }, [])

  const crear = async () => {
    if (!nueva.nombre.trim()) return
    const result = await movimientoCajaService.crearCategoria(nueva)
    if (result.error) Swal.fire('Error', result.error, 'error')
    else { setNueva({ nombre: '', aplica_a: 'ambos' }); cargar() }
  }

  const desactivar = async (id) => {
    const confirm = await Swal.fire({ title: '¿Desactivar?', icon: 'warning', showCancelButton: true })
    if (confirm.isConfirmed) {
      await movimientoCajaService.desactivarCategoria(id)
      cargar()
    }
  }

  return (
    <div className="p-6">
      <Link
        to="/configuracion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-matcha-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Configuración
      </Link>

      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4">
        <input placeholder="Nombre" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} className="border rounded px-3 py-2 flex-1" />
        <select value={nueva.aplica_a} onChange={(e) => setNueva({ ...nueva, aplica_a: e.target.value })} className="border rounded px-3 py-2">
          <option value="ambos">Ambos</option>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
        <button onClick={crear} className="bg-matcha-500 text-white px-4 py-2 rounded flex items-center gap-2"><Plus className="w-4 h-4" /> Crear</button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead className="bg-coffee-800 text-white">
            <tr><th className="p-3 text-left">Nombre</th><th className="p-3 text-left">Aplica a</th><th className="p-3 text-left">Estado</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id_categoria_movimiento} className="border-b">
                <td className="p-3">{c.nombre}</td>
                <td className="p-3">{c.aplica_a}</td>
                <td className="p-3">{c.activo ? 'Activa' : 'Inactiva'}</td>
                <td className="p-3">{c.activo && <button onClick={() => desactivar(c.id_categoria_movimiento)} className="text-red-600 text-xs">Desactivar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CategoriasMovimiento
