import type { GetTripRequestByIdHandler } from '../controllers/get-trip-request-by-id-controller.js'
import { createTripRequestNotFoundError } from '../errors/app-error.js'
import type { TripRequestRepository } from '../repositories/trip-request-repository.js'

export interface GetTripRequestByIdServiceDependencies {
  tripRequestRepository: TripRequestRepository
}

export function createGetTripRequestByIdService(
  dependencies: GetTripRequestByIdServiceDependencies,
): GetTripRequestByIdHandler {
  const { tripRequestRepository } = dependencies

  return async (id) => {
    const tripRequest = await tripRequestRepository.findById(id)

    if (tripRequest === null) {
      throw createTripRequestNotFoundError()
    }

    return tripRequest
  }
}
