import { createHash } from 'node:crypto'
import * as bcrypt from 'bcryptjs'

const { PrismaClient } = require('@prisma/client') as {
  PrismaClient: new () => {
    user: any
    workspace: any
    workspaceMember: any
    refreshToken: any
    $disconnect: () => Promise<void>
  }
}

const prisma = new PrismaClient()
const DEFAULT_WORKSPACE_NAME = '默认工作区'
const DEFAULT_WORKSPACE_DESCRIPTION = 'MX工作便签默认工作区'

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping seed in production mode.')
    return
  }

  const email = process.env.SEED_OWNER_EMAIL || 'owner@example.com'
  const password = process.env.SEED_OWNER_PASSWORD || 'password123'
  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: '工作区拥有者',
      passwordHash,
    },
    create: {
      email,
      name: '工作区拥有者',
      passwordHash,
    },
  })

  const workspace = await prisma.workspace.upsert({
    where: { id: 'workspace-default' },
    update: {
      name: DEFAULT_WORKSPACE_NAME,
      description: DEFAULT_WORKSPACE_DESCRIPTION,
    },
    create: {
      id: 'workspace-default',
      name: DEFAULT_WORKSPACE_NAME,
      description: DEFAULT_WORKSPACE_DESCRIPTION,
    },
  })

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {
      role: 'owner',
      status: 'active',
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
      status: 'active',
    },
  })

  const seedRefreshToken = createHash('sha256').update('seed-refresh-token').digest('hex')
  await prisma.refreshToken.deleteMany({
    where: {
      userId: user.id,
      tokenHash: seedRefreshToken,
    },
  })

  console.log(`Seed completed for ${email}. Default password: ${password}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
