import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRegister } from '../lib/auth'
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

export function RegistroPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useRegister()

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })

  function setField(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    register.mutate(
      { ...form, phone: form.phone || undefined },
      { onSuccess: () => navigate('/perfil') },
    )
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <CardHeader>
          <CardTitle>{t('auth.registerTitle')}</CardTitle>
          <CardDescription>{t('auth.registerSubtitle')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <Field label={t('auth.name')}>
              <Input
                type="text"
                required
                autoComplete="name"
                minLength={2}
                value={form.name}
                onChange={setField('name')}
              />
            </Field>
            <Field label={t('auth.email')}>
              <Input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={setField('email')}
                placeholder={t('auth.emailPlaceholder')}
              />
            </Field>
            <Field label={`${t('auth.phone')} (${t('common.optional')})`}>
              <Input
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={setField('phone')}
                placeholder="+503 7000 0000"
              />
            </Field>
            <Field label={t('auth.password')} description={t('auth.passwordHint')}>
              <Input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={setField('password')}
              />
            </Field>

            {register.isError && (
              <Alert variant="destructive">{authErrorMessage(register.error, t)}</Alert>
            )}

            <Button type="submit" isLoading={register.isPending} className="w-full">
              {t('auth.registerSubmit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-ink-soft">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="font-medium text-moss hover:underline">
          {t('auth.goLogin')}
        </Link>
      </p>
    </main>
  )
}
