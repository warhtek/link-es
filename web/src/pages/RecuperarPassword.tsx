import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { authErrorMessage } from '../lib/errors'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from '@/components/ui'

export function RecuperarPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    // Respuesta genérica del backend: mostramos el mismo mensaje exista o no el correo.
    api
      .forgotPassword(email)
      .then(() => setSent(true))
      .catch((cause: unknown) => setError(authErrorMessage(cause, t)))
      .finally(() => setPending(false))
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <CardHeader>
          <CardTitle>{t('auth.forgotTitle')}</CardTitle>
          <CardDescription>{t('auth.forgotSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <Alert variant="success">{t('auth.forgotSent')}</Alert>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <Field label={t('auth.email')}>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                />
              </Field>

              {error && <Alert variant="destructive">{error}</Alert>}

              <Button type="submit" isLoading={pending} className="w-full">
                {t('auth.forgotSubmit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-ink-soft">
        <Link to="/login" className="font-medium text-moss hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </main>
  )
}
