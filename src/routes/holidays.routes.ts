import type { RequestHandler } from 'express'
import { Router } from 'express'

export interface HolidaysRoutesDependencies {
  getHolidaysController: RequestHandler
}

export function createHolidaysRouter(dependencies: HolidaysRoutesDependencies): Router {
  const router = Router()

  router.get('/holidays/:year', dependencies.getHolidaysController)

  return router
}
