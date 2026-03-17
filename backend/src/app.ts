import express, { Application } from 'express'
import cors from 'cors'
import compression from 'compression'
import 'express-async-errors'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { httpLogger } from './middleware/logger'
import { systemRouter } from './modules/system'
import { initRouter } from './modules/init'
import { domainRouter } from './modules/domain'
import { registrarRouter } from './modules/registrar'
import { cloudflareRouter } from './modules/cloudflare'
import { groupRouter } from './modules/group'
import { userRouter } from './modules/user'
import { reminderRouter } from './modules/reminder'
import { dnsRouter } from './modules/dns'
import { visibilityRouter } from './modules/visibility'

export const createApp = (): Application => {
  const app = express()

  // HTTP request logging
  app.use(httpLogger)

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN,
      credentials: env.CORS_ORIGIN !== '*',
    })
  )

  // Body parsing and compression
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(compression())

  // API routes - System & Health
  app.use(env.API_PREFIX, systemRouter)

  // Init routes (for first-time setup)
  app.use(`${env.API_PREFIX}/init`, initRouter)

  // Domain management routes
  app.use(`${env.API_PREFIX}/domains`, domainRouter)

  // Registrar management routes
  app.use(`${env.API_PREFIX}/registrars`, registrarRouter)

  // Cloudflare configuration routes
  app.use(`${env.API_PREFIX}/cloudflare`, cloudflareRouter)

  // Admin group routes
  app.use(`${env.API_PREFIX}/groups`, groupRouter)

  // User management routes
  app.use(`${env.API_PREFIX}/users`, userRouter)

  // Reminder routes
  app.use(`${env.API_PREFIX}/reminders`, reminderRouter)

  // DNS record routes
  app.use(`${env.API_PREFIX}/dns-records`, dnsRouter)

  // Visibility rules routes
  app.use(`${env.API_PREFIX}/visibility`, visibilityRouter)

  // Error handling
  app.use(errorHandler)

  return app
}
