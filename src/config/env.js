const normalizeBasePath = (value) => {
  const raw = String(value ?? '/').trim()
  if (!raw || raw === '/') return '/'
  const prefixed = raw.startsWith('/') ? raw : `/${raw}`
  return prefixed.endsWith('/') ? prefixed : `${prefixed}/`
}

export const appConfig = Object.freeze({
  appName: String(import.meta.env.VITE_APP_NAME ?? 'Vue Patchouli').trim(),
  appBasePath: normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH),
  apiBaseUrl: String(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, ''),
  defaultFarmerPhotoUrl: String(
    import.meta.env.VITE_DEFAULT_FARMER_PHOTO_URL
      ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
  ).trim(),
})

export { normalizeBasePath }
