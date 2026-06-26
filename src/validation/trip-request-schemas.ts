import { z } from 'zod'

import { createValidationError } from '../errors/app-error.js'

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

export function parseCreateTripRequestInput(input: unknown): CreateTripRequestInput {
  const parsedInput = createTripRequestSchema.safeParse(input)

  if (!parsedInput.success) {
    throw createValidationError('Request body is invalid', { cause: parsedInput.error })
  }

  return parsedInput.data
}
