import express, { type Express } from 'express'

import { createCreateTripRequestController } from './controllers/create-trip-request-controller.js'
import { errorHandler } from './errors/error-handler.js'
import type { HolidaysProvider } from './providers/holidays-provider.js'
import type { TripRequestRepository } from './repositories/trip-request-repository.js'
import { createRouter } from './routes/index.js'
import { createCreateTripRequestService } from './services/create-trip-request-service.js'

export interface AppDependencies {
  tripRequestRepository: TripRequestRepository
  holidaysProvider: HolidaysProvider
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express()
  const createTripRequest = createCreateTripRequestService(dependencies)

  app.use(express.json())
  app.use(
    createRouter({
      createTripRequestController: createCreateTripRequestController({
        createTripRequest,
      }),
    }),
  )
  app.use(errorHandler)

  return app
}
