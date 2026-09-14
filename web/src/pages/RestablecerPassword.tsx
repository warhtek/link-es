import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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

export function RestablecerPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [changed, setChanged] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError(t('auth.errors.validation'))
      return
    }
    if (password !== confirm) {
      setError(t('auth.resetMismatch'))
      return
    }
    setPending(true)
    api
      .resetPassword({ token, password })
      .then(() => setChanged(true))
      .catch((cause: unknown) => setError(authErrorMessage(cause, t)))
      .finally(() => setPending(false))
  }

  if (!token) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
        <Card className="p-6 sm:p-8">
          <CardContent>
            <Alert variant="destructive">{t('auth.resetMissingToken')}</Alert>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-ink-soft">
          <Link to="/recuperar-password" className="font-medium text-moss hover:underline">
            {t('auth.backToForgot')}
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <CardHeader>
          <CardTitle>{t('auth.resetTitle')}</CardTitle>
          <CardDescription>{t('auth.resetSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent>
          {changed ? (
            <div className="mt-6 space-y-4">
              <Alert variant="success">{t('auth.resetDone')}</Alert>
              <Button variant="outline" asChild className="w-full">
                <Link to="/login">{t('auth.backToLogin')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <Field label={t('auth.newPassword')} description={t('auth.passwordHint')}>
                <Input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Field label={t('auth.confirmPassword')}>
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </Field>

              {error && <Alert variant="destructive">{error}</Alert>}

              <Button type="submit" isLoading={pending} className="w-full">
                {t('auth.resetSubmit')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
