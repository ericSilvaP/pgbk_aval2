import { z } from 'zod'

import { createValidationError } from '../errors/app-error.js'

const clientManagedFieldNames = ['id', 'status', 'createdAt'] as const

export const createTripRequestSchema = z.object({
  requesterName: z.string(),
  origin: z.string(),
  destination: z.string(),
  departureAt: z.string(),
  returnAt: z.string(),
  purpose: z.string(),
  passengerCount: z.number(),
})

export type CreateTripRequestInput = z.infer<typeof createTripRequestSchema>

function hasClientManagedFields(input: unknown): boolean {
  if (typeof input !== 'object' || input === null) {
    return false
  }

  return clientManagedFieldNames.some((fieldName) => Object.hasOwn(input, fieldName))
}

export function parseCreateTripRequestInput(input: unknown): CreateTripRequestInput {
  if (hasClientManagedFields(input)) {
    throw createValidationError('id, status, and createdAt must not be provided')
  }

  const parsedInput = createTripRequestSchema.safeParse(input)

  if (!parsedInput.success) {
    throw createValidationError('Request body is invalid', { cause: parsedInput.error })
  }

  return parsedInput.data
}
