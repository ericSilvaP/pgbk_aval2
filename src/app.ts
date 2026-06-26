import express, { type Express } from 'express'

import {
  createCreateTripRequestController,
  type CreateTripRequestHandler,
} from './controllers/create-trip-request-controller.js'
import { createInternalServerError } from './errors/app-error.js'
import { errorHandler } from './errors/error-handler.js'
import type { HolidaysProvider } from './providers/holidays-provider.js'
import type { TripRequestRepository } from './repositories/trip-request-repository.js'
import { createRouter } from './routes/index.js'

export interface AppDependencies {
  tripRequestRepository: TripRequestRepository
  holidaysProvider: HolidaysProvider
  createTripRequestHandler?: CreateTripRequestHandler
}

function createMissingCreateTripRequestHandler(
  _dependencies: Pick<AppDependencies, 'tripRequestRepository' | 'holidaysProvider'>,
): CreateTripRequestHandler {
  return async () => {
    throw createInternalServerError()
  }
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express()
  const createTripRequestHandler =
    dependencies.createTripRequestHandler ??
    createMissingCreateTripRequestHandler({
      tripRequestRepository: dependencies.tripRequestRepository,
      holidaysProvider: dependencies.holidaysProvider,
    })

  app.use(express.json())
  app.use(
    createRouter({
      createTripRequestController: createCreateTripRequestController({
        createTripRequest: createTripRequestHandler,
      }),
    }),
  )
  app.use(errorHandler)

  return app
}
