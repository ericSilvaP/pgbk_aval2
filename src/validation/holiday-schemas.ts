import { z } from 'zod'

import { createValidationError } from '../errors/app-error.js'

const holidayYearSchema = z
  .string()
  .regex(/^\d{4}$/, 'year must be a four-digit number between 1000 and 9999')
  .transform((value) => Number(value))
  .refine((value) => value >= 1000 && value <= 9999, {
    message: 'year must be a four-digit number between 1000 and 9999',
  })

export function parseHolidayYearParam(input: unknown): number {
  const parsedInput = holidayYearSchema.safeParse(input)

  if (!parsedInput.success) {
    throw createValidationError('year must be a four-digit number between 1000 and 9999', {
      cause: parsedInput.error,
    })
  }

  return parsedInput.data
}
