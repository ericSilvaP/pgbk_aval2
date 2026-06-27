import type { RequestHandler } from 'express'

import type { TripRequest } from '../repositories/trip-request-repository.js'
import { sendSuccessResponse } from '../responses/send-success-response.js'
import { mapTripRequestToResponse } from '../responses/trip-request-response-mapper.js'

export type ListTripRequestsHandler = () => Promise<TripRequest[]>

export interface ListTripRequestsControllerDependencies {
  listTripRequests: ListTripRequestsHandler
}

export function createListTripRequestsController(
  dependencies: ListTripRequestsControllerDependencies,
): RequestHandler {
  return (_request, response, next) => {
    void (async () => {
      const tripRequests = await dependencies.listTripRequests()

      sendSuccessResponse(response, tripRequests.map(mapTripRequestToResponse))
    })().catch(next)
  }
}
