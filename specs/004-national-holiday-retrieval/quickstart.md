# Quickstart: National Holiday Retrieval

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

## Isolation Guarantees

- Automated validation for `GET /holidays/:year` does not call the real BrasilAPI service.
- The tests use injected `HolidaysProvider` doubles or controlled `fetch` implementations.
- Holiday data is not persisted in PostgreSQL.
- Trip-request data is not read or mutated by this endpoint.

## Validation Scenario 1: Successful `GET /holidays/:year`

Run the focused success-path integration test:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 200 with the standardized success envelope and strips unknown upstream fields"
```

Expected outcome:

- The test passes without any live network access.
- The validated request is `GET /holidays/2025`.
- The response is HTTP `200 OK`.
- The body matches `{ "success": true, "data": [ ... ] }`.
- Every holiday item contains exactly `date`, `name`, and `type`.
- Unknown upstream fields are excluded from the HTTP response.

Expected example response body:

```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-01",
      "name": "Confraternizacao Universal",
      "type": "national"
    },
    {
      "date": "2025-04-21",
      "name": "Tiradentes",
      "type": "national"
    }
  ]
}
```

## Validation Scenario 2: Empty holiday list still returns `200`

Run the focused empty-list test:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 200 with an empty data array when the provider returns no holidays"
```

Expected outcome:

- The test passes.
- The response is HTTP `200 OK`.
- The body matches `{ "success": true, "data": [] }`.

## Validation Scenario 3: Invalid year returns `VALIDATION_ERROR`

Run the focused invalid-year test coverage:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 400 with VALIDATION_ERROR and does not call the provider for invalid year"
```

Expected outcome:

- The test passes.
- Accepted values are only numeric four-digit years from `1000` to `9999`.
- Invalid examples include `0000`, `0999`, `10000`, `abcd`, `20a5`, `25`, and `202`.
- Each invalid request returns HTTP `400 Bad Request`.
- Each body uses the standardized error envelope with code `VALIDATION_ERROR`.
- The holidays provider double is never called for rejected input.

## Validation Scenario 4: Upstream non-success returns `HOLIDAYS_API_UNAVAILABLE`

Run the focused upstream non-success test:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 502 with HOLIDAYS_API_UNAVAILABLE when the upstream provider responds with a non-success status"
```

Expected outcome:

- The test passes.
- The response is HTTP `502 Bad Gateway`.
- The body uses the standardized error envelope with `HOLIDAYS_API_UNAVAILABLE`.

## Validation Scenario 5: Invalid upstream payload returns `HOLIDAYS_API_UNAVAILABLE`

Run the focused invalid-payload test:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 502 with HOLIDAYS_API_UNAVAILABLE when the upstream provider payload is invalid"
```

Expected outcome:

- The test passes.
- The response is HTTP `502 Bad Gateway`.
- The body uses the standardized error envelope with `HOLIDAYS_API_UNAVAILABLE`.

## Validation Scenario 6: Upstream timeout returns `HOLIDAYS_API_UNAVAILABLE`

Run the focused timeout test:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 502 with HOLIDAYS_API_UNAVAILABLE when the upstream request times out after 5000 ms"
```

Expected outcome:

- The test passes.
- The request is aborted after the fixed `5000` ms timeout.
- The response is HTTP `502 Bad Gateway`.
- The body uses the standardized error envelope with `HOLIDAYS_API_UNAVAILABLE`.

## Validation Scenario 7: Unexpected internal failures use the centralized `500` envelope

Run the focused internal-failure test:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 500 with the standardized internal error envelope and no leaked internal details for unexpected failures"
```

Expected outcome:

- The test passes.
- The response body is the standardized `INTERNAL_SERVER_ERROR` envelope.
- The response does not leak stack traces, upstream payload contents, connection details, or source file paths.

## Validation Scenario 8: Automated quality gates

Run the required project scripts:

```bash
npm run build
npm run lint
npm test
```

Expected outcome:

- Build completes successfully.
- ESLint completes successfully.
- Tests cover success, empty list, invalid year, upstream non-success, timeout, invalid payload, and unexpected internal failure.
- Tests remain deterministic and independent from live BrasilAPI availability.
- Existing trip-request creation, retrieval, and cancellation flows stay green.
