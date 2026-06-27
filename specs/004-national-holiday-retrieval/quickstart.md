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

## Validation Scenario 1: Successful `GET /holidays/:year`

Run the focused integration test for a successful holiday lookup:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 200 with the standardized success envelope for a valid year"
```

Expected outcome:

- The test passes without any network access.
- The validated request is `GET /holidays/2025`.
- The response is HTTP `200 OK`.
- The body matches `{ "success": true, "data": [ ... ] }`.
- Every holiday item includes exactly `date`, `name`, and `type`.

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

Validation points:

- The route uses a path parameter, not a query parameter.
- The provider double is called exactly once with year `2025`.
- The success envelope is standardized.
- No holiday data is persisted to PostgreSQL.

## Validation Scenario 2: Empty holiday list still returns `200`

Run the focused empty-list test:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 200 with an empty data array when the provider returns no holidays"
```

Expected outcome:

- The test passes.
- The response is HTTP `200 OK`.
- The body matches `{ "success": true, "data": [] }`.
- The provider double is still called exactly once for the requested year.

## Validation Scenario 3: Invalid year returns `VALIDATION_ERROR`

Run the focused invalid-year test coverage:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 400 with VALIDATION_ERROR for invalid year values"
```

Expected outcome:

- The test passes.
- Invalid examples include `0000`, `0999`, `10000`, `abcd`, `20a5`, `25`, and `202`.
- Each invalid request returns HTTP `400 Bad Request`.
- Each body uses the standardized error envelope with code `VALIDATION_ERROR`.
- The holidays provider double is never called for invalid input.

## Validation Scenario 4: Upstream failures return `HOLIDAYS_API_UNAVAILABLE`

Run the focused upstream-failure coverage:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 502 with HOLIDAYS_API_UNAVAILABLE for provider failures"
```

Expected outcome:

- The test passes.
- Simulated unavailability, timeout, non-success status, and invalid payload cases each return HTTP `502 Bad Gateway`.
- Each response body uses:

```json
{
  "success": false,
  "error": {
    "code": "HOLIDAYS_API_UNAVAILABLE",
    "message": "Holidays API unavailable"
  }
}
```

- No network calls are made to the real BrasilAPI service.

## Validation Scenario 5: Unexpected internal failures use the centralized `500` envelope

Run the focused internal-failure test:

```bash
npm test -- tests/integration/holidays/get-holidays.test.ts -t "returns 500 with the centralized internal error envelope for unexpected failures"
```

Expected outcome:

- The test passes.
- The response body is the standardized `INTERNAL_SERVER_ERROR` envelope.
- The response does not leak stack traces, upstream payload contents, connection details, or source file paths.

## Validation Scenario 6: Automated quality gates

Run the required project scripts:

```bash
npm run build
npm run lint
npm test
```

Expected outcome:

- Build completes successfully.
- ESLint completes successfully.
- Tests cover success, empty list, invalid year, provider unavailability, timeout, non-success response, invalid payload, and unexpected internal failure.
- Tests remain deterministic and independent from live BrasilAPI availability.
- Existing trip-request creation, retrieval, and cancellation flows stay green.
