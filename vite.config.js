import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const dashboardPreview = command === 'serve' && mode !== 'production' && env.VITE_ENABLE_DASHBOARD_PREVIEW === 'true'

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __DASHBOARD_PREVIEW__: JSON.stringify(dashboardPreview),
    },
  }
})
