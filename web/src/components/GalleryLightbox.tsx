import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui'
import { ImageThumb } from './ImageThumb'
import { cn } from '@/lib/utils'

// Visor ampliado para galerías: imagen a pantalla, navegación con flechas,
// teclado (←/→) y cierre con Esc o clic fuera.
export function GalleryLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[]
  index: number | null
  onClose: () => void
  onNavigate?: (index: number) => void
}) {
  const { t } = useTranslation()
  const open = index !== null

  useEffect(() => {
    if (!open || images.length < 2) return
    function onKey(e: KeyboardEvent) {
      if (index === null) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onNavigate?.((index - 1 + images.length) % images.length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNavigate?.((index + 1) % images.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, index, images.length, onNavigate])

  const hasNav = images.length > 1

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        hideCloseButton
        className="max-w-[min(94vw,1100px)] gap-0 border-line bg-panel p-2 text-carbon sm:rounded-card sm:p-3"
      >
        <DialogTitle className="sr-only">{t('public.galleryTitle')}</DialogTitle>

        <div className="relative flex items-center justify-center overflow-hidden rounded-[10px]">
          {index !== null && images[index] && (
            <ImageThumb
              src={images[index]}
              alt={`${t('public.galleryTitle')} ${index + 1}`}
              className="max-h-[82vh] w-auto max-w-full rounded-[10px]"
              fit="contain"
            />
          )}

          <button
            type="button"
            aria-label={t('public.lightboxClose')}
            onClick={onClose}
            className="absolute right-2 top-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-card border border-line bg-panel/90 text-carbon transition-colors hover:bg-paper"
          >
            <X className="h-5 w-5" />
          </button>

          {hasNav && index !== null && (
            <>
              <button
                type="button"
                aria-label={t('public.lightboxPrev')}
                onClick={() => onNavigate?.((index - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-line bg-panel/90 text-carbon transition-colors hover:bg-paper"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label={t('public.lightboxNext')}
                onClick={() => onNavigate?.((index + 1) % images.length)}
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-line bg-panel/90 text-carbon transition-colors hover:bg-paper"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {hasNav && index !== null && (
            <span
              className={cn(
                'absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-control border border-line bg-panel/90 px-2.5 py-1',
                'font-mono text-xs text-ink-soft',
              )}
            >
              {t('public.lightboxCounter', { current: index + 1, total: images.length })}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}