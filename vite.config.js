import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

const normalizeBasePath = (value) => {
  const raw = String(value ?? '/').trim()
  if (!raw || raw === '/') return '/'
  const prefixed = raw.startsWith('/') ? raw : `/${raw}`
  return prefixed.endsWith('/') ? prefixed : `${prefixed}/`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: normalizeBasePath(env.VITE_APP_BASE_PATH),
    plugins: [vue(), vueDevTools(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
