import { Router } from 'express'

import type { HolidaysRoutesDependencies } from './holidays.routes.js'
import { createHolidaysRouter } from './holidays.routes.js'
import type { TripRequestRoutesDependencies } from './trip-request.routes.js'
import { createTripRequestRouter } from './trip-request.routes.js'

export interface RouterDependencies
  extends TripRequestRoutesDependencies,
    HolidaysRoutesDependencies {}

export function createRouter(dependencies: RouterDependencies): Router {
  const router = Router()

  router.get('/health', (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        status: 'ok',
      },
    })
  })

  router.use(createHolidaysRouter(dependencies))
  router.use(createTripRequestRouter(dependencies))

  return router
}
