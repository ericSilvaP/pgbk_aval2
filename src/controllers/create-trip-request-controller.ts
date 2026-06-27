import type { RequestHandler } from 'express'

import type { TripRequest } from '../repositories/trip-request-repository.js'
import { sendSuccessResponse } from '../responses/send-success-response.js'
import { mapTripRequestToResponse } from '../responses/trip-request-response-mapper.js'
import {
  parseCreateTripRequestInput,
  type CreateTripRequestInput,
} from '../validation/trip-request-schemas.js'

export type CreateTripRequestHandler = (input: CreateTripRequestInput) => Promise<TripRequest>

export interface CreateTripRequestControllerDependencies {
  createTripRequest: CreateTripRequestHandler
}

export function createCreateTripRequestController(
  dependencies: CreateTripRequestControllerDependencies,
): RequestHandler {
  return (request, response, next) => {
    void (async () => {
      const createTripRequestInput = parseCreateTripRequestInput(request.body)
      const tripRequest = await dependencies.createTripRequest(createTripRequestInput)

      sendSuccessResponse(response, mapTripRequestToResponse(tripRequest), 201)
    })().catch(next)
  }
}
