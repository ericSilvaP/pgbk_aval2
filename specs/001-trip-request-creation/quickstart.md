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
- Body follows the success envelope from [post-trip-requests.openapi.yaml](./contracts/post-trip-requests.openapi.yaml)
- `status` is `pending`
- `departureAt`, `returnAt`, and `createdAt` are full UTC ISO 8601 timestamps
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

## Validation Scenario 3: PostgreSQL persistence verification

```bash
docker exec pgbk_aval2_postgres psql -U postgres -d trip_requests_db \
  -c 'SELECT id, requester_name, status, departure_at, return_at, created_at FROM trip_requests ORDER BY created_at DESC LIMIT 3;'
```

Expected outcome:

- Only successful requests appear in the result set
- Rejected local-validation, holiday, provider-failure, and repository-failure requests leave no new row

## Validation Scenario 4: Automated tests

```bash
npm test
```

Expected outcome:

- Tests cover valid request handling
- Tests cover server-generated `pending` status
- Tests cover rejection of client `id`, `status`, and `createdAt`
- Tests cover `returnAt` after, equal to, and before `departureAt`
- Tests cover `passengerCount` equal to zero and below zero
- Tests cover national holiday rejection
- Tests cover holidays provider failure
- Tests cover repository failure through an injected throwing repository
- Tests cover no persistence after any rejected request
- Tests cover standardized success and error envelopes
- Tests do not call the real BrasilAPI
