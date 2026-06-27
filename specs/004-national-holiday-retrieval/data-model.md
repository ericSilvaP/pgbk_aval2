# Data Model: National Holiday Retrieval

## Entities

### Holiday

Brazilian national holiday returned by the API in successful responses.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `date` | string | BrasilAPI payload validated by provider | Civil date string returned as-is from the validated upstream payload |
| `name` | string | BrasilAPI payload validated by provider | Holiday name returned as-is |
| `type` | string | BrasilAPI payload validated by provider | Required by this feature; missing values invalidate the whole upstream payload |

Successful responses expose exactly these three fields for each item.

### HolidayCollection

Array returned in the standard success envelope for `GET /holidays/:year`.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `data` | `Holiday[]` | Yes | May be empty when the upstream provider returns no holidays for the requested year |

### HolidayYearRequest

Path-parameter input used by the holidays route.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `year` | string | Yes | Must be exactly four numeric digits and numerically between `1000` and `9999` |

## Validation Model

### Year Rules

1. The route accepts a required path parameter named `year`.
2. `year` must contain exactly four numeric characters.
3. The parsed numeric year must be greater than or equal to `1000`.
4. The parsed numeric year must be less than or equal to `9999`.
5. Invalid examples include `0000`, `0999`, `10000`, `abcd`, `20a5`, `25`, and `202`.
6. Any invalid `year` produces `VALIDATION_ERROR` with HTTP `400`.
7. Invalid `year` values must be rejected before any provider call is attempted.

### Provider Payload Rules

1. A successful upstream payload must be a JSON array.
2. Every item in that array must contain `date`, `name`, and `type` as strings.
3. The API response returns only `date`, `name`, and `type`, even if BrasilAPI provides additional fields.
4. An empty array is valid and returns HTTP `200`.
5. Any non-array payload or any item missing a required field is treated as `HOLIDAYS_API_UNAVAILABLE` with HTTP `502`.

## Service Contract

The feature adds one read-only service boundary.

| Method | Input | Return Type | Notes |
|--------|-------|-------------|-------|
| `getHolidays(year)` | validated `number` | `Promise<Holiday[]>` | Calls the provider once and returns the canonical holiday list |

## Provider Contract

The existing holidays provider remains the external integration boundary.

| Method | Input | Return Type | Notes |
|--------|-------|-------------|-------|
| `getNationalHolidays(year: number)` | validated `number` | `Promise<Holiday[]>` | Queries BrasilAPI via `HOLIDAYS_API_BASE_URL` and throws on transport, timeout, status, or payload failures |

## State Model

This feature is fully read-only.

- No PostgreSQL tables, columns, enums, or migrations change.
- No holiday records are persisted locally.
- No trip-request status, fields, or rows are created, updated, canceled, or deleted.

## Failure Model

- Invalid path parameter: `VALIDATION_ERROR` with HTTP `400`
- BrasilAPI unavailable: `HOLIDAYS_API_UNAVAILABLE` with HTTP `502`
- BrasilAPI timeout: `HOLIDAYS_API_UNAVAILABLE` with HTTP `502`
- BrasilAPI non-success status: `HOLIDAYS_API_UNAVAILABLE` with HTTP `502`
- BrasilAPI invalid JSON or invalid payload shape: `HOLIDAYS_API_UNAVAILABLE` with HTTP `502`
- Unexpected internal failure outside mapped validation or provider errors: `INTERNAL_SERVER_ERROR` with HTTP `500`

## Relationships

- `HolidayYearRequest` selects one calendar year.
- `HolidayCollection` contains zero or more `Holiday` items for that requested year.
- `HolidayCollection` is produced entirely from the validated provider response and has no persistence relationship with PostgreSQL entities.
