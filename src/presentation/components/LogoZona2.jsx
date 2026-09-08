import logoMarkup from '../../assets/logo-zona2.svg?raw'

/**
 * Logo vectorizado de Zona 2, con fondo transparente.
 *
 * Se inserta en línea y no como <img> a propósito: el SVG pinta con
 * `currentColor`, y sólo estando dentro del documento puede heredar el color
 * del contenedor. Así una clase como `text-gray-900` o `text-white` lo adapta
 * al fondo sin necesidad de un segundo archivo.
 */
const LogoZona2 = ({ className = '' }) => (
  <div
    className={className}
    role="img"
    aria-label="Zona 2 Brunch and Run"
    dangerouslySetInnerHTML={{ __html: logoMarkup }}
  />
)

export default LogoZona2
