import Logo from './Logo'

export default {
  id: 'prothec',
  nombre: 'POS Prothec',
  nombreTicket: 'POS PROTHEC',
  encabezadoWhatsapp: '*POS Prothec* - Ticket',
  Logo,
  heroImagen: null,
  logoTicket: null,
  logoTicketAncho: 0.5,
  avisoLogin: 'Demo abierta: todos los usuarios entran con el código 123456',
  posConFotosPorDefecto: true,

  // Con otro prefijo la demo no pisa la sesión de otro sistema en el mismo dominio.
  almacen: { prefijo: 'demo_', prefijoBase: 'demo_', baseImagenes: 'demo-pos-img' },

  categoriasOrden: ['Bebidas Calientes', 'Bebidas Frías', 'Frappés', 'Desayunos', 'Comidas', 'Postres'],
  categoriasComida: ['Desayunos', 'Comidas'],

  cintillaPrincipal: ['POS PROTHEC', 'COBRA EN SEGUNDOS', 'COMANDAS AL INSTANTE', 'CAJA CUADRADA', 'PRUÉBALO'],
  cintillaContorno: [
    'VENTAS',
    'COMANDAS',
    'MESAS',
    'COCINA',
    'BARRA',
    'CAJA',
    'PROPINAS',
    'INVENTARIO',
    'REPORTES',
    'CONTABILIDAD',
  ],
  mensajesLogin: [
    { saludo: 'Bienvenido', linea: 'TU NEGOCIO', acento: 'EN UNA SOLA PANTALLA.' },
    { saludo: 'Pruébalo', linea: 'COBRA, COMANDA', acento: 'Y CIERRA CAJA.' },
    { saludo: 'Demo abierta', linea: 'EXPLORA', acento: 'SIN MIEDO A ROMPER NADA.' },
    { saludo: 'Sin papeles', linea: 'LA COMANDA', acento: 'LLEGA SOLA A COCINA.' },
    { saludo: 'Al día', linea: 'TUS VENTAS', acento: 'EN TIEMPO REAL.' },
    { saludo: 'Cuentas claras', linea: 'LA CAJA', acento: 'CUADRA SOLA.' },
    { saludo: 'A tu medida', linea: 'PARA CAFETERÍAS', acento: 'Y RESTAURANTES.' },
  ],
}
