import type { Express } from 'express'

import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import { BrasilApiHolidaysProvider } from './providers/brasil-api-holidays-provider.js'
import { PrismaTripRequestRepository } from './repositories/prisma-trip-request-repository.js'

const tripRequestRepository = new PrismaTripRequestRepository(prisma)
const holidaysProvider = new BrasilApiHolidaysProvider({
  baseUrl: env.HOLIDAYS_API_BASE_URL,
})

export const app: Express = createApp({
  tripRequestRepository,
  holidaysProvider,
})

export { createApp } from './app.js'
