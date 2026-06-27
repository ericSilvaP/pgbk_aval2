import type { RequestHandler } from 'express'
import { Router } from 'express'

export interface TripRequestRoutesDependencies {
  createTripRequestController: RequestHandler
  listTripRequestsController: RequestHandler
  getTripRequestByIdController: RequestHandler
  cancelTripRequestController: RequestHandler
}

export function createTripRequestRouter(dependencies: TripRequestRoutesDependencies): Router {
  const router = Router()

  router.get('/trip-requests', dependencies.listTripRequestsController)
  router.get('/trip-requests/:id', dependencies.getTripRequestByIdController)
  router.patch('/trip-requests/:id/cancel', dependencies.cancelTripRequestController)
  router.post('/trip-requests', dependencies.createTripRequestController)

  return router
}
