import marca from '@marca'

/** Clave de localStorage con el prefijo de la marca. */
export const clave = (nombre) => `${marca.almacen.prefijo}${nombre}`

/**
 * Para las claves que en la marca original no llevaban prefijo (sesión,
 * barra superior, área de comandas). Otra marca sí lo pone, para no compartir
 * sesión con un sistema servido en el mismo dominio.
 */
export const claveBase = (nombre) => `${marca.almacen.prefijoBase}${nombre}`

export const CLAVE_TOKEN = claveBase('token')
export const CLAVE_USUARIO = claveBase('usuario')
