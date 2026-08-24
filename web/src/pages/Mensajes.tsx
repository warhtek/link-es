import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../components/RequireAuth'
import { BookingStatusBadge } from '../components/BookingStatusBadge'
import { inputClass } from './Login'
import {
  useConversationMessages,
  useConversations,
  useJoinConversation,
  useSendMessage,
} from '../lib/chat'
import { useMe } from '../lib/auth'

export function MensajesPage() {
  return (
    <RequireAuth>
      <MensajesContent />
    </RequireAuth>
  )
}

function MensajesContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id?: string }>()
  const conversations = useConversations()

  // Selección derivada de la URL; sin selección explícita se abre la más reciente.
  const list = conversations.data ?? []
  const effectiveId = routeId ?? list[0]?.id ?? null
  const selected = list.find((c) => c.id === effectiveId)

  const onBack = () => navigate('/mensajes', { replace: true })

  function select(id: string) {
    navigate(`/mensajes/${id}`, { replace: true })
  }

  return (
    <main className="lg:flex lg:h-[calc(100vh-53px)]">
      {/* Lista de conversaciones */}
      <div
        className={`min-w-0 flex-col border-line lg:flex lg:w-80 lg:border-r ${
          effectiveId ? 'hidden' : 'flex'
        }`}
        data-testid="conversation-list"
      >
        <header className="border-b border-line bg-panel px-4 py-3">
          <h1 className="font-display text-base font-semibold tracking-tight">
            {t('chat.title')}
          </h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <p className="p-5 text-sm text-ink-soft">{t('chat.empty')}</p>
          ) : (
            <ul>
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => select(c.id)}
                    data-testid={`conversation-${c.bookingCode ?? c.id}`}
                    className={`w-full cursor-pointer border-b border-line px-4 py-3 text-left hover:bg-moss-soft/40 ${
                      effectiveId === c.id ? 'bg-moss-soft' : 'bg-panel'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <b className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {c.counterpart.name}
                      </b>
                      {c.unreadCount > 0 && (
                        <span
                          className="shrink-0 rounded-full bg-clay px-2 py-0.5 font-mono text-[10px] font-bold text-panel"
                          data-testid="unread-badge"
                        >
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 block truncate text-xs text-ink-soft">
                      {c.lastMessage?.body ?? t('chat.noMessages')}
                    </span>
                    {c.bookingCode && (
                      <span className="mt-1 inline-block font-mono text-[10px] uppercase tracking-wide text-clay">
                        {c.bookingCode}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Hilo */}
      {effectiveId ? (
        selected && (
          <Thread key={selected.id} conversation={selected} onBack={onBack} />
        )
      ) : (
        <div className="hidden flex-1 items-center justify-center lg:flex">
          <p className="text-sm text-ink-soft">{t('chat.pickOne')}</p>
        </div>
      )}
    </main>
  )
}

interface Conversation {
  id: string
  counterpart: { type: 'client' | 'provider'; name: string }
  bookingCode: string | null
  bookingStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | null
}

function Thread({
  conversation,
  onBack,
}: {
  conversation: Conversation
  onBack: () => void
}) {
  const { t } = useTranslation()
  const me = useMe()
  const messages = useConversationMessages(conversation.id, me.data?.id)
  const sendMessage = useSendMessage()
  useJoinConversation(conversation.id)

  const [body, setBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.data?.length])

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    setBody('')
    sendMessage.mutate({ conversationId: conversation.id, body: trimmed })
  }

  const myId = me.data?.id
  const fmtTime = (iso: string) =>
    new Intl.DateTimeFormat(t('chat.locale'), { timeStyle: 'short' }).format(new Date(iso))

  return (
    <section className="flex min-w-0 flex-1 flex-col" data-testid="thread">
      {/* Cabecera del hilo */}
      <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('chat.back')}
          className="cursor-pointer rounded-control border border-line bg-paper px-2 py-1 font-mono text-xs lg:hidden"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{conversation.counterpart.name}</h2>
          {conversation.bookingCode && (
            <div className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wide text-clay">
                {conversation.bookingCode}
              </span>
              {conversation.bookingStatus && (
                <BookingStatusBadge status={conversation.bookingStatus} />
              )}
            </div>
          )}
        </div>
      </header>

      {/* Mensajes */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4" data-testid="message-list">
        {messages.isLoading ? (
          <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">…</p>
        ) : messages.data && messages.data.length > 0 ? (
          messages.data.map((m) => {
            const own = m.senderId === myId
            return (
              <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%] sm:max-w-[70%]">
                  <div
                    className={`rounded-card px-3 py-2 text-sm ${
                      own
                        ? 'bg-moss text-panel'
                        : 'border border-line bg-panel text-carbon'
                    }`}
                    data-testid={own ? 'msg-own' : 'msg-other'}
                  >
                    {m.body}
                  </div>
                  <span className={`mt-0.5 block font-mono text-[10px] text-ink-soft ${own ? 'text-right' : ''}`}>
                    {fmtTime(m.createdAt)}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <p className="py-10 text-center text-sm text-ink-soft">{t('chat.noMessagesYet')}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Enviar */}
      <form onSubmit={onSubmit} className="flex gap-2 border-t border-line bg-panel px-4 py-3">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('chat.placeholder')}
          aria-label={t('chat.placeholder')}
          maxLength={2000}
          data-testid="chat-input"
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={!body.trim() || sendMessage.isPending}
          data-testid="chat-send"
          className="shrink-0 cursor-pointer rounded-control bg-moss px-4 py-2 text-sm font-medium text-panel hover:opacity-90 disabled:opacity-50"
        >
          ➤
        </button>
      </form>
    </section>
  )
}

// Enlace reutilizable hacia el chat desde reservas/solicitudes.
export function ChatLink({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/mensajes/${conversationId}`}
      className="inline-block cursor-pointer rounded-control border border-line bg-paper px-2.5 py-1 text-xs font-medium hover:bg-moss-soft"
    >
      💬 {t('chat.open')}
    </Link>
  )
}
