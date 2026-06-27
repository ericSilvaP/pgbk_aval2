import type { RequestHandler } from 'express'
import { Router } from 'express'

export interface TripRequestRoutesDependencies {
  createTripRequestController: RequestHandler
  listTripRequestsController: RequestHandler
}

export function createTripRequestRouter(dependencies: TripRequestRoutesDependencies): Router {
  const router = Router()

  router.get('/trip-requests', dependencies.listTripRequestsController)
  router.post('/trip-requests', dependencies.createTripRequestController)

  return router
}
