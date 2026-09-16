// Resuelve enlaces de servicios de fotos (Google Photos/Drive, Dropbox) hacia
// URLs directas que un <img> pueda cargar. El trabajo pesado (seguir
// redirecciones y leer el HTML) se hace aquí, en el servidor, porque el
// navegador no puede leer páginas de otras empresas por CORS.

const DRIVE_FILE = /drive\.google\.com\/file\/d\/([^/]+)/
const DRIVE_OPEN = /drive\.google\.com\/open\?id=([^&]+)/
const PHOTOS_SHORT = /photos\.app\.goo\.gl\//
const PHOTOS_PAGE = /photos\.google\.com\/(?:share|photo|album)\//

// Cache simple en memoria (_<ignored>). La resolución toca una página externa;
// repetirla en cada render es innecesario.
const cache = new Map<string, { expires: number; url: string | null }>()
const CACHE_TTL_MS = 30 * 60 * 1000

export function clientNormalizeImageUrl(url: string): string {
  let m = url.match(DRIVE_FILE)
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600`
  m = url.match(DRIVE_OPEN)
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600`

  if (/^https?:\/\/(?:www\.)?dropbox\.com\//i.test(url)) {
    return url.replace(/^https?:\/\/(?:www\.)?dropbox\.com/i, 'https://dl.dropboxusercontent.com')
  }
  return url
}

// Google Photos entrega su imagen directa en un servidor de contenido que se
// puede hotlinkear (lh3.googleusercontent.com). La página de la foto expone esa
// URL en og:image; aquí se extrae y se sube la resolución a w1600.
async function resolveGooglePhotos(url: string): Promise<string | null> {
  let res: Response
  try {
    res = await fetch(url, {
      redirect: 'follow',
      headers: {
        // Evitar que Google sirva una variante de consentimiento/cookies.
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept-Language': 'en',
      },
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const html = await res.text()
  const match = html.match(/<meta property="og:image" content="([^"]+)"/)
  if (!match) return null
  let direct = match[1]
  if (!/^https:\/\//i.test(direct)) return null
  // La URL trae una talla por defecto (=w600-h315-p-k); pedir resolución mayor.
  direct = direct.replace(/=w\d+-h\d+-[a-z]-?[a-z]?$/, '=w1600')
  return direct
}

export async function resolveImageUrl(url: string): Promise<string | null> {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null

  // Drive y Dropbox se resuelven en local, sin red.
  const local = clientNormalizeImageUrl(trimmed)
  if (local !== trimmed) return local

  // Solo vamos a la red para las fotos de Google compartidas.
  if (!PHOTOS_SHORT.test(trimmed) && !PHOTOS_PAGE.test(trimmed)) return trimmed

  const cached = cache.get(trimmed)
  if (cached && cached.expires > Date.now()) return cached.url

  const resolved = await resolveGooglePhotos(trimmed).catch(() => null)
  cache.set(trimmed, { expires: Date.now() + CACHE_TTL_MS, url: resolved })
  return resolved
}