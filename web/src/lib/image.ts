// Convierte enlaces de compartir (Google Drive, Dropbox) en URLs directas
// que el elemento <img> pueda cargar sin problemas. Si la URL no necesita
// transformación, se devuelve tal cual.

const DRIVE_FILE = /drive\.google\.com\/file\/d\/([^/]+)/
const DRIVE_OPEN = /drive\.google\.com\/open\?id=([^&]+)/

export function normalizeImageUrl(url: string): string {
  let m = url.match(DRIVE_FILE)
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600`
  m = url.match(DRIVE_OPEN)
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600`

  if (/^https?:\/\/(?:www\.)?dropbox\.com\//i.test(url)) {
    return url.replace(/^https?:\/\/(?:www\.)?dropbox\.com/i, 'https://dl.dropboxusercontent.com')
  }

  return url
}
