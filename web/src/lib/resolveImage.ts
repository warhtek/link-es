// Resolución de URLs de imágenes para el <img>: primero el atajo local (Drive,
// Dropbox), y solo para enlaces de Google Photos se consulta al backend, que es
// quien puede seguir la redirección y extraer la imagen directa. Cada URL se
// resuelve una sola vez y se recuerda en memoria.

import { API_URL } from './api'
import { normalizeImageUrl } from './image'

const cache = new Map<string, string>()

const PHOTOS_SHORT = /photos\.app\.goo\.gl\//
const PHOTOS_PAGE = /photos\.google\.com\/(?:share|photo|album)\//

export async function resolveImageUrl(url: string): Promise<string> {
  const trimmed = url.trim()
  if (!trimmed) return trimmed

  const cached = cache.get(trimmed)
  if (cached !== undefined) return cached

  const fast = normalizeImageUrl(trimmed)
  if (fast !== trimmed) {
    cache.set(trimmed, fast)
    return fast
  }

  if (!PHOTOS_SHORT.test(trimmed) && !PHOTOS_PAGE.test(trimmed)) {
    cache.set(trimmed, trimmed)
    return trimmed
  }

  try {
    const res = await fetch(`${API_URL}/public/providers/image-url?u=${encodeURIComponent(trimmed)}`)
    if (!res.ok) throw new Error('unresolvable_image_url')
    const data = (await res.json()) as { url: string }
    cache.set(trimmed, data.url)
    return data.url
  } catch {
    cache.set(trimmed, trimmed)
    return trimmed
  }
}