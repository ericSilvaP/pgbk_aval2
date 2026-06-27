import type { CancelTripRequestHandler } from '../controllers/cancel-trip-request-controller.js'
import {
  AppError,
  createTripRequestAlreadyCanceledError,
  createTripRequestNotFoundError,
} from '../errors/app-error.js'
import type { TripRequestRepository } from '../repositories/trip-request-repository.js'

export interface CancelTripRequestServiceDependencies {
  tripRequestRepository: TripRequestRepository
}

export function createCancelTripRequestService(
  dependencies: CancelTripRequestServiceDependencies,
): CancelTripRequestHandler {
  const { tripRequestRepository } = dependencies

  return async (id) => {
    try {
      const tripRequest = await tripRequestRepository.findById(id)

      if (tripRequest === null) {
        throw createTripRequestNotFoundError()
      }

      if (tripRequest.status === 'canceled') {
        throw createTripRequestAlreadyCanceledError()
      }

      return await tripRequestRepository.cancelById(id)
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('INTERNAL_SERVER_ERROR', 'Internal server error', {
        cause: error,
      })
    }
  }
}
