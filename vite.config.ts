import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Host yang boleh mengakses dev server (proteksi anti DNS rebinding).
// Urutan sumber: ALLOWED_HOSTS dari .env (dipisah koma), jika kosong memakai
// ALLOWED_HOSTS_FALLBACK. Vite hanya menerima Host header yang terdaftar di sini
// maupun yang resolve ke IP LAN, jadi domain yang tidak dikenal akan ditolak.
export default defineConfig(({ mode }) => {
  // Prefix kosong agar variabel non-VITE_* ikut terbaca. Nilai dari process.env
  // container Compose juga tetap ter-merge oleh loadEnv.
  const env = loadEnv(mode, process.cwd(), '')

  const apiTarget = env.VITE_API_TARGET || 'http://localhost:4001'

  const parseHosts = (value: string) =>
    value
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean)

  const fromEnv = parseHosts(env.ALLOWED_HOSTS || '')
  const fromFallback = parseHosts(env.ALLOWED_HOSTS_FALLBACK || '')
  const allowedHosts = fromEnv.length > 0 ? fromEnv : fromFallback

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5174,
      // `undefined` mengembalikan ke default Vite (localhost + IP LAN saja).
      allowedHosts: allowedHosts.length > 0 ? allowedHosts : undefined,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
