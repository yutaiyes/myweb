import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { requireAuth } from '../middleware/auth.middleware'
import { AppError } from '../middleware/errorHandler'
import { z } from 'zod'
import { validate } from '../middleware/validation'

export const reminderRouter = Router()

// Schema for listing reminders
const listRemindersSchema = z.object({
  body: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    isClosed: z.boolean().optional(),
    domainId: z.string().optional(),
  }),
})

/**
 * List reminders
 * POST /api/reminders/list
 */
reminderRouter.post('/list', requireAuth, validate(listRemindersSchema), async (req: Request, res: Response) => {
  const { page, limit, isClosed, domainId } = req.body
  const user = req.user!

  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  // Non-super-admins can only see reminders for domains in their group
  if (user.role !== 'SUPER_ADMIN') {
    where.domain = { groupId: user.groupId }
  }

  if (isClosed !== undefined) {
    where.isClosed = isClosed
  }

  if (domainId) {
    where.domainId = domainId
  }

  const [reminders, total] = await Promise.all([
    prisma.expiryReminder.findMany({
      where,
      skip,
      take: limit,
      include: {
        domain: {
          select: {
            id: true,
            name: true,
            expirationDate: true,
            status: true,
          },
        },
      },
      orderBy: { remindAt: 'asc' },
    }),
    prisma.expiryReminder.count({ where }),
  ])

  res.json({
    data: reminders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * Get upcoming reminders count
 * GET /api/reminders/upcoming
 */
reminderRouter.get('/upcoming', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!

  const where: Record<string, unknown> = {
    isClosed: false,
    isSent: false,
  }

  // Non-super-admins can only see reminders for domains in their group
  if (user.role !== 'SUPER_ADMIN') {
    where.domain = { groupId: user.groupId }
  }

  const count = await prisma.expiryReminder.count({ where })

  // Get reminders for next 7 days
  const next7Days = await prisma.expiryReminder.findMany({
    where: {
      ...where,
      remindAt: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    include: {
      domain: {
        select: { id: true, name: true, expirationDate: true },
      },
    },
    orderBy: { remindAt: 'asc' },
    take: 10,
  })

  res.json({
    count,
    upcoming: next7Days,
  })
})

/**
 * Close a reminder
 * PUT /api/reminders/:id/close
 */
reminderRouter.put('/:id/close', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!
  const { reason } = req.body

  const reminder = await prisma.expiryReminder.findUnique({
    where: { id },
    include: { domain: true },
  })

  if (!reminder) {
    throw new AppError(404, 'Reminder not found')
  }

  // Check permission
  if (user.role !== 'SUPER_ADMIN' && reminder.domain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to close this reminder')
  }

  const updatedReminder = await prisma.expiryReminder.update({
    where: { id },
    data: {
      isClosed: true,
      closedAt: new Date(),
      closedReason: reason || 'Manually closed',
    },
  })

  res.json({
    status: 'success',
    data: updatedReminder,
  })
})

/**
 * Reopen a reminder
 * PUT /api/reminders/:id/reopen
 */
reminderRouter.put('/:id/reopen', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!

  const reminder = await prisma.expiryReminder.findUnique({
    where: { id },
    include: { domain: true },
  })

  if (!reminder) {
    throw new AppError(404, 'Reminder not found')
  }

  // Check permission
  if (user.role !== 'SUPER_ADMIN' && reminder.domain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to reopen this reminder')
  }

  const updatedReminder = await prisma.expiryReminder.update({
    where: { id },
    data: {
      isClosed: false,
      closedAt: null,
      closedReason: null,
    },
  })

  res.json({
    status: 'success',
    data: updatedReminder,
  })
})
