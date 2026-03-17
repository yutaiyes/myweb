import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { AppError } from './errorHandler'
import { prisma } from '../config/database'
import { Role } from '@prisma/client'

// Supabase configuration
const SUPABASE_URL = 'https://jvyddfsojtsipmiwjcdr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eWRkZnNvanRzaXBtaXdqY2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNDE3NTAsImV4cCI6MjA3NzcxNzc1MH0.BvEXIgONC2GxAUzRIx8I7P3PsTH3p10vh68CEyRPRMg'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name: string | null
        role: Role
        groupId: string | null
      }
    }
  }
}

/**
 * Verify JWT token and attach user to request
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'Authorization header missing or invalid')
    }

    const token = authHeader.substring(7)

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      throw new AppError(401, 'Invalid or expired token')
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        groupId: true,
      },
    })

    if (!dbUser) {
      // Auto-create user if not exists (first login)
      const newUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: 'VIEWER',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          groupId: true,
        },
      })
      req.user = newUser
    } else {
      req.user = dbUser
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Require specific role(s)
 */
export const requireRole = (...roles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required')
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'Insufficient permissions')
    }

    next()
  }
}

/**
 * Require admin role (ADMIN or SUPER_ADMIN)
 */
export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN')

/**
 * Require super admin role
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN')

/**
 * Optional auth - attach user if token present, but don't require it
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.substring(7)

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return next()
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        groupId: true,
      },
    })

    if (dbUser) {
      req.user = dbUser
    }

    next()
  } catch {
    next()
  }
}
