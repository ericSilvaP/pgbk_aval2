# pgbk_aval2

REST API for institutional trip requests.

## Stack

- Node.js 20+
- TypeScript with `strict: true`
- Express 4
- Prisma Client 6
- PostgreSQL 16 via Docker Compose
- Zod 3 for request validation
- Vitest + Supertest for automated tests
- BrasilAPI as the production national-holidays source

Automated tests never call the real BrasilAPI. They inject `HolidaysProvider` doubles.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local environment variables:

```bash
cp .env.example .env
```

3. Start PostgreSQL:

```bash
docker compose up -d postgres
```

4. Apply migrations and seed the database:

```bash
npm run init:db
```

## Environment Variables

- `NODE_ENV`: `development`, `test`, or `production`
- `PORT`: API port, defaults to `3000`
- `DATABASE_URL`: PostgreSQL connection string
- `HOLIDAYS_API_BASE_URL`: BrasilAPI base URL used by the production `HolidaysProvider`

The default `.env.example` values match `docker-compose.yml`:

- PostgreSQL host port: `5434`
- Database name: `trip_requests_db`
- Holiday provider base URL: `https://brasilapi.com.br`

## Scripts

- `npm run dev`: start the API in watch mode
- `npm run build`: compile TypeScript to `dist/`
- `npm start`: run the compiled server
- `npm run init:db`: apply migrations and seed PostgreSQL
- `npm run lint`: run ESLint
- `npm test`: run Vitest integration tests

## Endpoint

### `POST /trip-requests`

Creates a trip request after local validation and national-holiday validation.

Request body:

```json
{
  "requesterName": "Maria Silva",
  "origin": "Fortaleza",
  "destination": "Recife",
  "departureAt": "2026-07-10T08:00:00-03:00",
  "returnAt": "2026-07-12T18:30:00-03:00",
  "purpose": "Institutional meeting",
  "passengerCount": 2
}
```

Rules:

- `id`, `status`, and `createdAt` are server-managed and must not be sent by the client.
- `departureAt` and `returnAt` must be valid date-time strings.
- `returnAt` must be equal to or later than `departureAt`.
- `passengerCount` must be greater than zero.
- The normalized UTC departure civil date must not match a national holiday.

Success response: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "9d716459-4fc8-4bd1-82d7-9df1f5569dd7",
    "requesterName": "Maria Silva",
    "origin": "Fortaleza",
    "destination": "Recife",
    "departureAt": "2026-07-10T11:00:00.000Z",
    "returnAt": "2026-07-12T21:30:00.000Z",
    "purpose": "Institutional meeting",
    "passengerCount": 2,
    "status": "pending",
    "createdAt": "2026-06-26T15:45:10.123Z"
  }
}
```

Validation error response: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "returnAt must be equal to or later than departureAt"
  }
}
```

Holiday rejection response: `409 Conflict`

```json
{
  "success": false,
  "error": {
    "code": "HOLIDAY_TRIP_NOT_ALLOWED",
    "message": "departureAt cannot fall on a national holiday"
  }
}
```

Holiday-provider unavailable response: `502 Bad Gateway`

```json
{
  "success": false,
  "error": {
    "code": "HOLIDAYS_API_UNAVAILABLE",
    "message": "national holidays are temporarily unavailable"
  }
}
```

Unexpected repository failure response: `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

Internal stack traces never appear in HTTP response bodies.

## Testing Notes

- Validation failures do not call `HolidaysProvider.getNationalHolidays()`.
- Validation failures do not call `TripRequestRepository.create()`.
- Holiday rejections and holiday-provider failures do not call `TripRequestRepository.create()`.
- Tests use injected `HolidaysProvider` fakes and never access the real BrasilAPI.

## Feature References

- Spec: `specs/001-trip-request-creation/spec.md`
- Plan: `specs/001-trip-request-creation/plan.md`
- Task list: `specs/001-trip-request-creation/tasks.md`
- OpenAPI contract: `specs/001-trip-request-creation/contracts/post-trip-requests.openapi.yaml`
- Quickstart: `specs/001-trip-request-creation/quickstart.md`
