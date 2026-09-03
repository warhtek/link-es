import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'

async function main() {
  const targetEmail = process.argv[2]?.trim().toLowerCase() || 'admin@linkes.dev'

  console.log(`[make-admin] Buscando usuario: ${targetEmail}...`)

  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  })

  if (!user) {
    console.log(`[make-admin] El usuario no existe. Creando nuevo administrador: ${targetEmail}...`)
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'password123'
    const passwordHash = await bcrypt.hash(password, 10)

    const created = await prisma.user.create({
      data: {
        name: 'Administrador Link-ES',
        email: targetEmail,
        passwordHash,
        roles: ['ADMIN', 'CLIENT'],
        activeMode: 'CLIENT',
        city: 'San Salvador',
      },
    })
    console.log(`[make-admin] Administrador creado exitosamente con ID: ${created.id}`)
    console.log(`[make-admin] Credenciales: ${targetEmail} / ${password}`)
    return
  }

  const currentRoles = (user.roles as string[]) || []
  if (currentRoles.includes('ADMIN')) {
    console.log(`[make-admin] El usuario ${targetEmail} ya tiene el rol ADMIN.`)
    return
  }

  const updatedRoles = [...currentRoles, 'ADMIN']
  await prisma.user.update({
    where: { id: user.id },
    data: { roles: updatedRoles as never },
  })

  console.log(`[make-admin] Rol ADMIN agregado exitosamente a ${targetEmail}! Roles actuales:`, updatedRoles)
}

main()
  .catch((err) => {
    console.error('[make-admin] Error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
