import icono from '../../assets/logo-prothec.png'

/** Solo la antorcha, para el sidebar comprimido. */
const LogoIcon = ({ className = '' }) => (
  <img
    src={icono}
    alt="Prothec"
    className={`block object-contain ${className}`}
    draggable={false}
  />
)

export default LogoIcon
