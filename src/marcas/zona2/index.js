import Logo from './Logo'
import LogoIcon from './LogoIcon'
import heroImagen from './hero.jpg'
import logoTicket from './logo-ticket.png'

export default {
  id: 'zona2',
  nombre: 'Zona 2 Brunch and Run',
  nombreTicket: 'ZONA 2',
  encabezadoWhatsapp: '*Zona 2* - Ticket',
  Logo,
  LogoIcon,
  heroImagen,
  logoTicket,
  // Es solo la palabra ZONA 2, así que con la mitad del papel ya se lee bien.
  logoTicketAncho: 0.5,
  avisoLogin: null,
  posConFotosPorDefecto: false,

  // Zona 2 ya tenía sus claves así; cambiarlas cerraría sesiones y borraría ajustes.
  almacen: { prefijo: 'zona2_', prefijoBase: '', baseImagenes: 'zona2-pos-img' },

  categoriasOrden: [
    'Bebidas Calientes',
    'Bebidas Frías',
    'Frappés',
    'Recovery Bar',
    'Clásicos',
    'Mini WOD',
    'Signature',
  ],
  categoriasComida: ['Clásicos', 'Mini WOD', 'Signature'],

  cintillaPrincipal: ['ZONA 2', 'NO ES SOLO CAFÉ', 'RECUPERA', 'RINDE', 'VUELVE AL RITMO'],
  cintillaContorno: [
    'CONSTANCIA',
    'EQUILIBRIO',
    'CAFÉ DE ESPECIALIDAD',
    'COMUNIDAD',
    'BRUNCH AND RUN',
    'VUELVE AL RITMO',
    'SIN PRISA',
    'A LA BARRA',
    'SOSTÉN',
    'RECUPERA',
  ],
  mensajesLogin: [
    { saludo: 'Buen turno', linea: 'ENTRA A LA BARRA', acento: 'Y ARRANCA EL DÍA.' },
    { saludo: 'Hoy se corre', linea: 'EL RITMO', acento: 'EMPIEZA AQUÍ.' },
    { saludo: 'Respira', linea: 'RECUPERA', acento: 'Y VUELVE MÁS FUERTE.' },
    { saludo: 'Café listo', linea: 'EL TURNO', acento: 'ES TUYO.' },
    { saludo: 'Sin prisa', linea: 'BAJA EL RITMO', acento: 'PARA SUBIRLO DESPUÉS.' },
    { saludo: 'A la barra', linea: 'EL DÍA', acento: 'YA ARRANCÓ.' },
    { saludo: 'Constancia', linea: 'UN CAFÉ', acento: 'Y A MOVERTE.' },
    { saludo: 'Equilibrio', linea: 'CAFÉ, COMIDA', acento: 'Y RITMO.' },
    { saludo: 'Buen día', linea: 'NO ES SOLO CAFÉ', acento: 'ES TU ZONA.' },
    { saludo: 'Listos', linea: 'RECUPERA ENERGÍA', acento: 'Y SIGUE.' },
    { saludo: 'En marcha', linea: 'VUELVE AL RITMO', acento: 'QUE TE MUEVE.' },
    { saludo: 'Aquí estamos', linea: 'EL ESFUERZO', acento: 'MERECE CAFÉ.' },
    { saludo: 'Suave', linea: 'SOSTÉN EL RITMO', acento: 'NO LO FUERCES.' },
    { saludo: 'A correr', linea: 'PRIMERO EL CAFÉ', acento: 'LUEGO EL KILÓMETRO.' },
    { saludo: 'Bienvenido', linea: 'TU ZONA', acento: 'TE ESPERA.' },
    { saludo: 'Otro día', linea: 'MISMO RITMO', acento: 'MEJOR CAFÉ.' },
    { saludo: 'En zona', linea: 'DONDE EL CUERPO', acento: 'APRENDE A SOSTENER.' },
    { saludo: 'Adelante', linea: 'HOY SE RECUPERA', acento: 'MAÑANA SE RINDE.' },
    { saludo: 'Tranquilo', linea: 'BAJA UN CAMBIO', acento: 'Y VUELVE FUERTE.' },
    { saludo: 'Brunch and run', linea: 'COME, BEBE', acento: 'Y SAL A MOVERTE.' },
    { saludo: 'Ya es hora', linea: 'ENTRA', acento: 'Y ARRANCA.' },
    { saludo: 'Paso a paso', linea: 'LA CONSTANCIA', acento: 'SE SIRVE CALIENTE.' },
  ],
}
