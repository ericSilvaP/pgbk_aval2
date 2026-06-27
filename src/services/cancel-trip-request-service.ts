import {
  AppError,
  createTripRequestAlreadyCanceledError,
  createTripRequestNotFoundError,
} from '../errors/app-error.js'
import type {
  TripRequest,
  TripRequestRepository,
} from '../repositories/trip-request-repository.js'

export interface CancelTripRequestServiceDependencies {
  tripRequestRepository: TripRequestRepository
}

export type CancelTripRequestService = (id: string) => Promise<TripRequest>

export function createCancelTripRequestService(
  dependencies: CancelTripRequestServiceDependencies,
): CancelTripRequestService {
  const { tripRequestRepository } = dependencies

  return async (id): Promise<TripRequest> => {
    try {
      const tripRequest = await tripRequestRepository.findById(id)

      if (tripRequest === null) {
        throw createTripRequestNotFoundError()
      }

      if (tripRequest.status === 'canceled') {
        throw createTripRequestAlreadyCanceledError()
      }

      const canceledTripRequest = await tripRequestRepository.cancelById(id)

      return canceledTripRequest
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error
      }

      throw new AppError('INTERNAL_SERVER_ERROR', 'Internal server error', {
        cause: error instanceof Error ? error : new Error(String(error)),
      })
    }
  }
}
