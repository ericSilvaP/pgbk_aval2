import type { RequestHandler } from 'express'

import { createTripRequestNotFoundError } from '../errors/app-error.js'
import type { TripRequest } from '../repositories/trip-request-repository.js'
import { sendSuccessResponse } from '../responses/send-success-response.js'
import { mapTripRequestToResponse } from '../responses/trip-request-response-mapper.js'

export type CancelTripRequestHandler = (id: string) => Promise<TripRequest>

export interface CancelTripRequestControllerDependencies {
  cancelTripRequest: CancelTripRequestHandler
}

export function createCancelTripRequestController(
  dependencies: CancelTripRequestControllerDependencies,
): RequestHandler {
  return (request, response, next) => {
    void (async () => {
      const tripRequestId = request.params.id

      if (tripRequestId === undefined) {
        throw createTripRequestNotFoundError()
      }

      const tripRequest = await dependencies.cancelTripRequest(tripRequestId)

      sendSuccessResponse(response, mapTripRequestToResponse(tripRequest))
    })().catch(next)
  }
}
