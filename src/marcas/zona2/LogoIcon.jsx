import Logo from './Logo'

/** Versión compacta del logo para el sidebar comprimido. */
const LogoIcon = ({ className = '' }) => (
  <Logo className={`text-white ${className}`} />
)

export default LogoIcon
