import express, { type Express } from 'express'

import { createCancelTripRequestController } from './controllers/cancel-trip-request-controller.js'
import { createCreateTripRequestController } from './controllers/create-trip-request-controller.js'
import { createGetHolidaysController } from './controllers/get-holidays-controller.js'
import { createGetTripRequestByIdController } from './controllers/get-trip-request-by-id-controller.js'
import { createListTripRequestsController } from './controllers/list-trip-requests-controller.js'
import { errorHandler } from './errors/error-handler.js'
import type { HolidaysProvider } from './providers/holidays-provider.js'
import type { TripRequestRepository } from './repositories/trip-request-repository.js'
import { createRouter } from './routes/index.js'
import { createCancelTripRequestService } from './services/cancel-trip-request-service.js'
import { createCreateTripRequestService } from './services/create-trip-request-service.js'
import { createGetHolidaysService } from './services/get-holidays-service.js'
import { createGetTripRequestByIdService } from './services/get-trip-request-by-id-service.js'
import { createListTripRequestsService } from './services/list-trip-requests-service.js'

export interface AppDependencies {
  tripRequestRepository: TripRequestRepository
  holidaysProvider: HolidaysProvider
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express()
  const createTripRequest = createCreateTripRequestService(dependencies)
  const listTripRequests = createListTripRequestsService(dependencies)
  const getTripRequestById = createGetTripRequestByIdService(dependencies)
  const cancelTripRequest = createCancelTripRequestService(dependencies)
  const getHolidays = createGetHolidaysService(dependencies)

  app.use(express.json())
  app.use(
    createRouter({
      createTripRequestController: createCreateTripRequestController({
        createTripRequest,
      }),
      listTripRequestsController: createListTripRequestsController({
        listTripRequests,
      }),
      getTripRequestByIdController: createGetTripRequestByIdController({
        getTripRequestById,
      }),
      cancelTripRequestController: createCancelTripRequestController({
        cancelTripRequest,
      }),
      getHolidaysController: createGetHolidaysController({
        getHolidays,
      }),
    }),
  )
  app.use(errorHandler)

  return app
}
