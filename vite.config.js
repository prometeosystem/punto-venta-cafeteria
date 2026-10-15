import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// El título va aquí y no en src/marcas porque index.html se arma antes que el
// código de la app. Solo se empaqueta la carpeta de la marca elegida, así que
// en una compilación no aparecen textos ni imágenes de la otra.
const TITULOS = {
  zona2: 'Zona 2 Brunch and Run - Punto de Venta',
  prothec: 'POS Prothec - Punto de venta',
}

// loadEnv y no process.env: Vite no expone las variables de los archivos .env
// al proceso de configuración, así que en producción el base path del .env
// se ignoraba y los assets salían apuntando a la ruta equivocada.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const marca = env.VITE_MARCA || 'zona2'
  if (!TITULOS[marca]) throw new Error(`VITE_MARCA desconocida: ${marca}`)

  return {
    plugins: [
      react(),
      {
        name: 'titulo-de-marca',
        transformIndexHtml: (html) => html.replace('__TITULO__', TITULOS[marca]),
      },
    ],
    base: env.VITE_BASE_PATH || '/sistema/',
    build: {
      assetsDir: env.VITE_ASSETS_DIR || 'assets',
    },
    resolve: {
      alias: {
        '@marca': path.resolve(__dirname, `./src/marcas/${marca}`),
        '@': path.resolve(__dirname, './src'),
        '@domain': path.resolve(__dirname, './src/domain'),
        '@application': path.resolve(__dirname, './src/application'),
        '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
        '@presentation': path.resolve(__dirname, './src/presentation'),
      },
    },
  }
})
