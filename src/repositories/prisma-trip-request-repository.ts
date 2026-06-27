import type { PrismaClient } from '@prisma/client'

import type {
  CreateTripRequestRecord,
  TripRequest,
  TripRequestRepository,
} from './trip-request-repository.js'

type PrismaTripRequestClient = Pick<PrismaClient, 'tripRequest'>

type PersistedTripRequestRecord = {
  id: string
  requesterName: string
  origin: string
  destination: string
  departureAt: Date
  returnAt: Date
  purpose: string
  passengerCount: number
  status: TripRequest['status']
  createdAt: Date
}

function mapPersistedTripRequest(record: PersistedTripRequestRecord): TripRequest {
  return {
    id: record.id,
    requesterName: record.requesterName,
    origin: record.origin,
    destination: record.destination,
    departureAt: record.departureAt.toISOString(),
    returnAt: record.returnAt.toISOString(),
    purpose: record.purpose,
    passengerCount: record.passengerCount,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
  }
}

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

    return mapPersistedTripRequest(tripRequest)
  }

  public async findAll(): Promise<TripRequest[]> {
    const tripRequests = await this.prisma.tripRequest.findMany()

    return tripRequests.map(mapPersistedTripRequest)
  }

  public async findById(id: string): Promise<TripRequest | null> {
    const tripRequest = await this.prisma.tripRequest.findUnique({
      where: {
        id,
      },
    })

    if (tripRequest === null) {
      return null
    }

    return mapPersistedTripRequest(tripRequest)
  }

  public async cancelById(id: string): Promise<TripRequest> {
    const tripRequest = await this.prisma.tripRequest.update({
      where: {
        id,
      },
      data: {
        status: 'canceled',
      },
    })

    return mapPersistedTripRequest(tripRequest)
  }
}
