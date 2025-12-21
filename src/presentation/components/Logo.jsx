const Logo = ({ className = '' }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="text-matcha-600"
        >
          <path
            d="M8 4C8 4 6 6 6 10C6 14 8 16 8 16M16 4C16 4 18 6 18 10C18 14 16 16 16 16M8 20C8 20 10 18 12 18C14 18 16 20 16 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="font-script text-2xl font-semibold text-gray-900">
          Zona 2
        </h1>
      </div>
      <p className="text-xs font-medium text-gray-600 tracking-wider uppercase">
        COFFEE RECOVERY
      </p>
    </div>
  )
}

export default Logo

