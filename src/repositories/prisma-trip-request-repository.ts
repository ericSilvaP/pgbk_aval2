import type { PrismaClient } from '@prisma/client'

import type {
  CreateTripRequestRecord,
  TripRequest,
  TripRequestRepository,
} from './trip-request-repository.js'

type PrismaTripRequestClient = Pick<PrismaClient, 'tripRequest'>

export class PrismaTripRequestRepository implements TripRequestRepository {
  public constructor(private readonly prisma: PrismaTripRequestClient) {}

  public async create(input: CreateTripRequestRecord): Promise<TripRequest> {
    const tripRequest = await this.prisma.tripRequest.create({
      data: {
        requesterName: input.requesterName,
        origin: input.origin,
        destination: input.destination,
        departureAt: new Date(input.departureAt),
        returnAt: new Date(input.returnAt),
        purpose: input.purpose,
        passengerCount: input.passengerCount,
        status: input.status,
      },
    })

    return {
      id: tripRequest.id,
      requesterName: tripRequest.requesterName,
      origin: tripRequest.origin,
      destination: tripRequest.destination,
      departureAt: tripRequest.departureAt.toISOString(),
      returnAt: tripRequest.returnAt.toISOString(),
      purpose: tripRequest.purpose,
      passengerCount: tripRequest.passengerCount,
      status: tripRequest.status,
      createdAt: tripRequest.createdAt.toISOString(),
    }
  }
}
