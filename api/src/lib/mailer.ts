import nodemailer, { type Transporter } from 'nodemailer'

// Sin SMTP configurado el correo se imprime en consola: suficiente en dev;
// en producción definir SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS y MAIL_FROM.
const transporter: Transporter | null = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    })
  : null

export async function sendMail(input: { to: string; subject: string; text: string }): Promise<void> {
  const from = process.env.MAIL_FROM ?? 'Link-ES <no-reply@link-es.dev>'
  if (!transporter) {
    console.info(`[mail:dev] Para: ${input.to}\n[mail:dev] ${input.subject}\n\n${input.text}\n`)
    return
  }
  await transporter.sendMail({ from, to: input.to, subject: input.subject, text: input.text })
}

export function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  return sendMail({
    to,
    subject: 'Recupera tu contraseña · Link-ES',
    text: [
      `Hola ${name},`,
      '',
      'Recibimos una solicitud para restablecer tu contraseña en Link-ES.',
      'Abre este enlace (válido por 1 hora):',
      resetUrl,
      '',
      'Si no fuiste tú, ignora este mensaje y tu contraseña seguirá igual.',
    ].join('\n'),
  })
}
