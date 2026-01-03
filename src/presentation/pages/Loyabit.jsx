import { ExternalLink } from 'lucide-react'

const Loyabit = () => {
  // URL de loyabit configurada desde variables de entorno
  const loyabitUrl = import.meta.env.VITE_LOYABIT_URL || 'https://www.loyabit.com/business/login'

  return (
    <div className="h-full w-full">
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loyabit</h1>
            <p className="text-gray-600 mt-1">Sistema externo integrado</p>
          </div>
          <a
            href={loyabitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir en nueva pestaña
          </a>
        </div>
      </div>

      {/* Iframe para mostrar loyabit dentro del sistema */}
      <div className="card p-0 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <iframe
          src={loyabitUrl}
          className="w-full h-full border-0"
          title="Loyabit"
          allow="camera *; microphone *; geolocation *; payment *; autoplay; fullscreen; encrypted-media; picture-in-picture; display-capture"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          loading="lazy"
        />
      </div>
    </div>
  )
}

export default Loyabit

