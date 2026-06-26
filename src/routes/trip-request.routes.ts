import type { RequestHandler } from 'express'
import { Router } from 'express'

export interface TripRequestRoutesDependencies {
  createTripRequestController: RequestHandler
}

export function createTripRequestRouter(dependencies: TripRequestRoutesDependencies): Router {
  const router = Router()

  router.post('/trip-requests', dependencies.createTripRequestController)

  return router
}
