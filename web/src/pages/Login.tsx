import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLogin } from '../lib/auth'
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

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    login.mutate(
      { email, password },
      { onSuccess: () => navigate('/perfil') },
    )
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <CardHeader>
          <CardTitle>{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent>
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
            <Field label={t('auth.password')}>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>

            {login.isError && (
              <Alert variant="destructive">{authErrorMessage(login.error, t)}</Alert>
            )}

            <Button type="submit" isLoading={login.isPending} className="w-full">
              {t('auth.loginSubmit')}
            </Button>
          </form>
        </CardContent>

        <p className="mt-3 text-center text-sm">
          <Link to="/recuperar-password" className="font-medium text-moss hover:underline">
            {t('auth.forgotLink')}
          </Link>
        </p>
      </Card>

      <p className="mt-4 text-center text-sm text-ink-soft">
        {t('auth.noAccount')}{' '}
        <Link to="/registro" className="font-medium text-moss hover:underline">
          {t('auth.goRegister')}
        </Link>
      </p>
    </main>
  )
}
