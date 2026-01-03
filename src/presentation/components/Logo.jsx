import { Coffee } from 'lucide-react'

const Logo = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 bg-matcha-400 rounded-full flex items-center justify-center">
        <Coffee className="w-6 h-6 text-white" />
      </div>
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-white">
          CaféPOS
        </h1>
        <p className="text-xs text-gray-400">
          Sistema de Gestión
        </p>
      </div>
    </div>
  )
}

export default Logo


