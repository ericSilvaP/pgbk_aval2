# Feature Specification: National Holiday Retrieval

**Feature Branch**: `[004-national-holiday-retrieval]`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Create a new feature specification for national holiday retrieval implementing `GET /holidays/:year` while preserving the project's existing response standards."

## Clarifications

### Session 2026-06-27

- Q: Which holiday fields should the API expose in successful responses? → A: Only `date`, `name`, and `type`.
- Q: Which year values count as valid four-digit years? → A: Only `1000` to `9999`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrieve holidays for a valid year (Priority: P1)

An API consumer requests Brazilian national holidays for a valid year and receives the result in the standard success envelope with `data` as an array of holiday items.

**Why this priority**: Retrieving the national holidays for a requested year is the primary business outcome of this feature and is the only direct value the endpoint must deliver.

**Independent Test**: Send `GET /holidays/2025` with a controlled successful holiday-provider response, then verify HTTP `200 OK`, the standard success envelope, `data` as an array, and the required holiday fields in each returned item.

**Acceptance Scenarios**:

1. **Given** the API consumer provides a valid four-digit numeric year from `1000` to `9999`, **When** `GET /holidays/:year` is requested and the holiday provider returns a valid response, **Then** the system returns HTTP `200 OK`.
2. **Given** holidays are successfully returned for the requested year, **When** the response body is inspected, **Then** it uses `{ "success": true, "data": [ ... ] }`.
3. **Given** holidays are successfully returned for the requested year, **When** each holiday item is inspected, **Then** it includes only `date`, `name`, and `type`.
4. **Given** the holiday provider returns no holidays for the requested year, **When** the request succeeds, **Then** the system still returns HTTP `200 OK` with `data` as an empty array.

---

### User Story 2 - Reject invalid year input (Priority: P2)

An API consumer receives a clear validation error when the requested year is not a valid four-digit numeric year from `1000` to `9999`.

**Why this priority**: Deterministic input validation prevents ambiguous requests and gives consumers immediate feedback before any holiday lookup is attempted.

**Independent Test**: Send `GET /holidays/:year` with values that are not exactly four numeric digits or fall outside `1000` to `9999`, then verify HTTP `400 Bad Request`, the standard error envelope, and `VALIDATION_ERROR`.

**Acceptance Scenarios**:

1. **Given** the API consumer provides a year value that is not exactly four numeric digits or falls outside `1000` to `9999`, **When** `GET /holidays/:year` is requested, **Then** the system returns HTTP `400 Bad Request`.
2. **Given** the API consumer provides an invalid year value, **When** the error response is inspected, **Then** it uses `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "A clear and objective error message" } }`.
3. **Given** the API consumer provides an invalid year value, **When** the request is rejected, **Then** the system does not treat it as a successful holiday retrieval.

---

### User Story 3 - Fail safely when holiday lookup cannot be completed (Priority: P3)

An API consumer receives standardized error responses when the holiday lookup cannot be completed because the external holiday provider fails or because an unexpected internal failure occurs.

**Why this priority**: Safe, predictable failure handling keeps the contract stable and prevents leakage of internal details while distinguishing provider failures from internal failures.

**Independent Test**: Simulate holiday-provider unavailability, timeout, non-success status, invalid payload, and an unexpected internal failure, then verify the required error code and HTTP status for each outcome.

**Acceptance Scenarios**:

1. **Given** the API consumer provides a valid year, **When** the external holiday provider is unavailable, **Then** the system returns HTTP `502 Bad Gateway` with error code `HOLIDAYS_API_UNAVAILABLE`.
2. **Given** the API consumer provides a valid year, **When** the external holiday provider times out, **Then** the system returns HTTP `502 Bad Gateway` with error code `HOLIDAYS_API_UNAVAILABLE`.
3. **Given** the API consumer provides a valid year, **When** the external holiday provider returns a non-success status, **Then** the system returns HTTP `502 Bad Gateway` with error code `HOLIDAYS_API_UNAVAILABLE`.
4. **Given** the API consumer provides a valid year, **When** the external holiday provider returns an invalid payload or holiday items missing required fields, **Then** the system returns HTTP `502 Bad Gateway` with error code `HOLIDAYS_API_UNAVAILABLE`.
5. **Given** an unexpected internal failure happens while processing a valid holiday request, **When** the API consumer receives the response, **Then** the system returns `INTERNAL_SERVER_ERROR` in the standard error envelope without leaking internal details.

### Edge Cases

- A year value shorter than four digits, longer than four digits, containing non-numeric characters, or numerically outside `1000` to `9999` is rejected with `VALIDATION_ERROR` and HTTP `400 Bad Request`.
- A successful holiday-provider response contains an empty list for the requested year; the system returns HTTP `200 OK` with `data: []`.
- A successful-looking holiday-provider response omits the `date`, `name`, or `type` field for at least one holiday item; the system returns `HOLIDAYS_API_UNAVAILABLE` with HTTP `502 Bad Gateway`.
- The holiday-provider response is not an array for the requested year; the system returns `HOLIDAYS_API_UNAVAILABLE` with HTTP `502 Bad Gateway`.
- The external holiday provider is unavailable, times out, or returns a non-success status; the system returns `HOLIDAYS_API_UNAVAILABLE` with HTTP `502 Bad Gateway`.
- An unexpected internal failure occurs while processing the request; the system returns `INTERNAL_SERVER_ERROR` without exposing stack traces, connection details, or internal implementation details.
- Holiday retrieval remains read-only: it does not require authentication, does not persist holidays, and does not create, update, cancel, or delete trip requests.

## Requirements *(mandatory)*

### Constitutional Requirements

- **CR-001**: This feature MUST remain limited to backend retrieval of Brazilian national holidays and MUST NOT expand into trip request creation, trip request listing, trip request retrieval by id, trip request cancellation, holiday persistence, holiday caching, authentication, authorization, or frontend behavior.
- **CR-002**: This feature MUST preserve the required endpoint `GET /holidays/:year`.
- **CR-003**: Successful holiday retrieval responses MUST use the standard success envelope exactly as `{ "success": true, "data": ... }`.
- **CR-004**: Holiday retrieval errors MUST use the standard error envelope exactly as `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- **CR-005**: Holiday retrieval error messages and internal error codes MUST remain in English and MUST include `VALIDATION_ERROR`, `HOLIDAYS_API_UNAVAILABLE`, and `INTERNAL_SERVER_ERROR` where applicable.
- **CR-006**: Brazilian national holidays for this feature MUST come only from BrasilAPI through the configured `HOLIDAYS_API_BASE_URL`.
- **CR-007**: Automated verification of this feature MUST NOT depend on live BrasilAPI availability.

### Functional Requirements

- **FR-001**: The system MUST allow API consumers to retrieve Brazilian national holidays through `GET /holidays/:year`.
- **FR-002**: The `year` path parameter MUST be required for holiday retrieval.
- **FR-003**: The `year` path parameter MUST be validated as exactly four numeric digits representing a year from `1000` to `9999`.
- **FR-004**: When the `year` path parameter is invalid, the system MUST return HTTP `400 Bad Request`.
- **FR-005**: An invalid `year` response MUST use the standard error envelope with error code `VALIDATION_ERROR` and a clear, objective message.
- **FR-006**: An invalid `year` request MUST be rejected as a validation failure rather than treated as a successful holiday retrieval.
- **FR-007**: When the `year` path parameter is valid, the system MUST query the configured `HOLIDAYS_API_BASE_URL` for Brazilian national holidays for that year.
- **FR-008**: The holiday lookup MUST target the BrasilAPI national holidays resource for the requested year.
- **FR-009**: When the external holiday lookup succeeds with a valid response, the system MUST return HTTP `200 OK`.
- **FR-010**: A successful holiday retrieval response MUST use the standard success envelope with `data` as an array.
- **FR-011**: Each holiday item in a successful response MUST include exactly `date`, `name`, and `type`.
- **FR-012**: If the external holiday source returns no holidays for the requested year, the system MUST still return HTTP `200 OK` with an empty `data` array.
- **FR-013**: Holiday retrieval MUST NOT require authentication or authorization.
- **FR-014**: Holiday retrieval MUST NOT persist holidays in PostgreSQL or any other local storage as part of this feature.
- **FR-015**: Holiday retrieval MUST NOT create, update, cancel, or delete trip requests.
- **FR-016**: If the external holiday provider is unavailable, times out, returns a non-success status, or returns an invalid response structure, the system MUST return HTTP `502 Bad Gateway`.
- **FR-017**: If the external holiday provider returns one or more holiday items without the required `date`, `name`, or `type` fields, the system MUST return HTTP `502 Bad Gateway`.
- **FR-018**: Every external holiday-provider failure covered by this feature MUST use the standard error envelope with error code `HOLIDAYS_API_UNAVAILABLE` and message `Holidays API unavailable`.
- **FR-019**: Unexpected internal failures that are not mapped validation errors or mapped external-provider failures MUST return HTTP `500 Internal Server Error` through the centralized error handler.
- **FR-020**: Unexpected internal failures MUST use the standard error envelope with error code `INTERNAL_SERVER_ERROR` and message `Internal server error`.
- **FR-021**: Unexpected internal failures MUST NOT expose stack traces, connection details, upstream payload contents, or other internal implementation details in the response.
- **FR-022**: Automated tests for this feature MUST use controlled doubles, stubs, mocks, or equivalent replacements so they do not call the real BrasilAPI service.

### Key Entities *(include if feature involves data)*

- **Holiday**: A Brazilian national holiday returned to API consumers with exactly `date`, `name`, and `type`.
- **HolidayCollection**: The array of `Holiday` items returned for a requested year in the standard success envelope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid holiday retrieval requests with a successful upstream result return HTTP `200 OK` with the standard success envelope and an array in `data`.
- **SC-002**: 100% of successful holiday items returned by the feature include exactly `date`, `name`, and `type`.
- **SC-003**: 100% of requests with a year that is not exactly four numeric digits or falls outside `1000` to `9999` return HTTP `400 Bad Request` with error code `VALIDATION_ERROR`.
- **SC-004**: 100% of external holiday-provider unavailability, timeout, non-success status, invalid response structure, and missing required holiday-field conditions return HTTP `502 Bad Gateway` with error code `HOLIDAYS_API_UNAVAILABLE`.
- **SC-005**: Automated verification of holiday retrieval can run without depending on live BrasilAPI availability.
- **SC-006**: 100% of unexpected internal failures return `INTERNAL_SERVER_ERROR` in the standard error envelope without exposing internal details.

## Assumptions

- A valid year for this feature is any path value that consists of exactly four numeric digits and represents a year from `1000` to `9999`.
- The configured holiday provider returns Brazilian national holidays for a single requested year and, when valid, supplies each holiday item with at least `date`, `name`, and `type`, while the API returns only those three fields.
- Holiday retrieval remains a read-only capability and does not introduce persistence, caching, trip-request side effects, authentication, authorization, or frontend behavior.
- Automated tests can replace the live holiday provider with a controlled alternative while preserving the same public API contract.
