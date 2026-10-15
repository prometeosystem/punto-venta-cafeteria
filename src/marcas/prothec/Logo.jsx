import icono from '../../assets/logo-prothec.png'

/**
 * Antorcha de Prothec con el nombre a un lado. Es un SVG con viewBox para que
 * escale con el ancho del contenedor, igual que el logo de la otra marca, y el
 * texto pinta con `currentColor`.
 */
const Logo = ({ className = '' }) => (
  <div className={className} role="img" aria-label="POS Prothec">
    <svg viewBox="0 0 300 92" className="block h-auto w-full" fill="currentColor" aria-hidden="true">
      <image href={icono} x="0" y="0" width="54" height="92" />
      <text x="70" y="54" fontSize="48" fontWeight="700" letterSpacing="-1" fontFamily="Outfit, Inter, sans-serif">
        Prothec
      </text>
      <text x="72" y="82" fontSize="15" letterSpacing="5.2" opacity="0.7" fontFamily="Inter, sans-serif">
        PUNTO DE VENTA
      </text>
    </svg>
  </div>
)

export default Logo
