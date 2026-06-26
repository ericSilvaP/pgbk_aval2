import { Router } from 'express'

import type { TripRequestRoutesDependencies } from './trip-request.routes.js'
import { createTripRequestRouter } from './trip-request.routes.js'

export function createRouter(dependencies: TripRequestRoutesDependencies): Router {
  const router = Router()

  router.get('/health', (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        status: 'ok',
      },
    })
  })

  router.use(createTripRequestRouter(dependencies))

  return router
}
