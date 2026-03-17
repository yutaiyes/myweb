import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../config/database'
import { validate } from '../middleware/validation'
import { z } from 'zod'

export const initRouter = Router()

// Supabase configuration
const SUPABASE_URL = 'https://jvyddfsojtsipmiwjcdr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eWRkZnNvanRzaXBtaXdqY2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNDE3NTAsImV4cCI6MjA3NzcxNzc1MH0.BvEXIgONC2GxAUzRIx8I7P3PsTH3p10vh68CEyRPRMg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Schema for creating super admin
const createSuperAdminSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
  }),
})

/**
 * Check if system needs initialization
 * GET /api/init/check
 */
initRouter.get('/check', async (_req: Request, res: Response) => {
  const superAdminCount = await prisma.user.count({
    where: { role: 'SUPER_ADMIN' },
  })

  res.json({
    needsInit: superAdminCount === 0,
    hasSuperAdmin: superAdminCount > 0,
  })
})

/**
 * Create first super admin
 * POST /api/init/super-admin
 * Requires valid Supabase token (user must be logged in)
 */
initRouter.post('/super-admin', validate(createSuperAdminSchema), async (req: Request, res: Response) => {
  // Check if super admin already exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  })

  if (existingSuperAdmin) {
    res.status(400).json({
      status: 'error',
      message: 'Super admin already exists. Initialization is not allowed.',
    })
    return
  }

  // Verify token from authorization header
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      message: 'Authorization header missing or invalid',
    })
    return
  }

  const token = authHeader.substring(7)

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    })
    return
  }

  const { name } = req.body

  // Create or update user as super admin
  const superAdmin = await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email!,
      name,
      role: 'SUPER_ADMIN',
    },
    update: {
      name,
      role: 'SUPER_ADMIN',
    },
  })

  res.status(201).json({
    status: 'success',
    message: 'Super admin created successfully',
    data: {
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: superAdmin.role,
    },
  })
})
