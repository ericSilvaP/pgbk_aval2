# Quickstart: Complete Trip Request Creation

## Prerequisites

- Node.js 20 or higher
- npm
- Docker and Docker Compose
- A local `.env` file based on `.env.example`

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

4. Apply the database schema and seed:

```bash
npm run init:db
```

## Run The API

```bash
npm run dev
```

The server should start on `http://localhost:3000` unless `PORT` is overridden.

## Validation Scenario 1: Successful `POST /trip-requests`

```bash
curl -i -X POST http://localhost:3000/trip-requests \
  -H 'Content-Type: application/json' \
  -d '{
    "requesterName": "Maria Silva",
    "origin": "Fortaleza",
    "destination": "Recife",
    "departureAt": "2026-07-10T08:00:00-03:00",
    "returnAt": "2026-07-12T18:30:00-03:00",
    "purpose": "Institutional meeting",
    "passengerCount": 2
  }'
```

Expected outcome:

- HTTP `201 Created`
- Body follows the standardized success envelope
- `status` is `pending`
- `departureAt`, `returnAt`, and `createdAt` are full UTC ISO 8601 timestamps
- The holidays provider is consulted with year `2026`
- A matching row exists in PostgreSQL

## Validation Scenario 2: Local validation failure

```bash
curl -i -X POST http://localhost:3000/trip-requests \
  -H 'Content-Type: application/json' \
  -d '{
    "requesterName": "Maria Silva",
    "origin": "Fortaleza",
    "destination": "Recife",
    "departureAt": "2026-07-12T18:30:00-03:00",
    "returnAt": "2026-07-10T08:00:00-03:00",
    "purpose": "Institutional meeting",
    "passengerCount": 2
  }'
```

Expected outcome:

- HTTP `400 Bad Request`
- Error envelope with `VALIDATION_ERROR`
- No holidays lookup occurs
- No row is created in PostgreSQL

## Validation Scenario 3: Holiday rejection

```bash
curl -i -X POST http://localhost:3000/trip-requests \
  -H 'Content-Type: application/json' \
  -d '{
    "requesterName": "Maria Silva",
    "origin": "Fortaleza",
    "destination": "Recife",
    "departureAt": "2026-12-25T08:00:00-03:00",
    "returnAt": "2026-12-27T18:30:00-03:00",
    "purpose": "Institutional meeting",
    "passengerCount": 2
  }'
```

Expected outcome:

- HTTP `409 Conflict`
- Error envelope with `HOLIDAY_TRIP_NOT_ALLOWED`
- No PostgreSQL row is created

## Validation Scenario 4: Holidays provider unavailable

Temporarily start the API with an unreachable provider base URL:

```bash
HOLIDAYS_API_BASE_URL=http://127.0.0.1:9 npm run dev
```

Then send the same request body from Scenario 1.

Expected outcome:

- HTTP `502 Bad Gateway`
- Error envelope with `HOLIDAYS_API_UNAVAILABLE`
- No PostgreSQL row is created

## Validation Scenario 5: PostgreSQL persistence verification

```bash
docker exec pgbk_aval2_postgres psql -U postgres -d trip_requests_db \
  -c 'SELECT id, requester_name, status, departure_at, return_at, created_at FROM trip_requests ORDER BY created_at DESC LIMIT 5;'
```

Expected outcome:

- Only successful requests appear in the result set
- Rejected local-validation, holiday, provider-failure, and repository-failure requests leave no new row

## Validation Scenario 6: Automated quality gates

```bash
npm run build
npm run lint
npm test
```

Expected outcome:

- Build completes successfully
- ESLint completes successfully
- Tests cover valid request handling
- Tests cover server-generated `pending` status
- Tests cover rejection of client `id`, `status`, and `createdAt`
- Tests cover missing required fields and invalid field types
- Tests cover invalid date-time values
- Tests cover `returnAt` after, equal to, and before `departureAt`
- Tests cover `passengerCount` equal to zero and below zero
- Tests cover national holiday rejection
- Tests cover holidays provider failure
- Tests cover repository failure through an injected throwing repository
- Tests cover no persistence after any rejected request
- Tests cover standardized success and error envelopes
- Tests do not call the real BrasilAPI
