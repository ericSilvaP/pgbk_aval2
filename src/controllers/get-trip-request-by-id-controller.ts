import type { RequestHandler } from 'express'

import { createTripRequestNotFoundError } from '../errors/app-error.js'
import type { TripRequest } from '../repositories/trip-request-repository.js'
import { sendSuccessResponse } from '../responses/send-success-response.js'
import { mapTripRequestToResponse } from '../responses/trip-request-response-mapper.js'

export type GetTripRequestByIdHandler = (id: string) => Promise<TripRequest>

export interface GetTripRequestByIdControllerDependencies {
  getTripRequestById: GetTripRequestByIdHandler
}

export function createGetTripRequestByIdController(
  dependencies: GetTripRequestByIdControllerDependencies,
): RequestHandler {
  return (request, response, next) => {
    void (async () => {
      const tripRequestId = request.params.id

      if (tripRequestId === undefined) {
        throw createTripRequestNotFoundError()
      }

      const tripRequest = await dependencies.getTripRequestById(tripRequestId)

      sendSuccessResponse(response, mapTripRequestToResponse(tripRequest))
    })().catch(next)
  }
}
