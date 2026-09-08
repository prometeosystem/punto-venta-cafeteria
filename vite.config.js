import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// loadEnv y no process.env: Vite no expone las variables de los archivos .env
// al proceso de configuración, así que en producción el base path del .env
// se ignoraba y los assets salían apuntando a la ruta equivocada.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/sistema/',
    build: {
      assetsDir: env.VITE_ASSETS_DIR || 'assets',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@domain': path.resolve(__dirname, './src/domain'),
        '@application': path.resolve(__dirname, './src/application'),
        '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
        '@presentation': path.resolve(__dirname, './src/presentation'),
      },
    },
  }
})
