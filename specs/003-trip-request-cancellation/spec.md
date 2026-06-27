# Feature Specification: Trip Request Cancellation

**Feature Branch**: `[003-trip-request-cancellation]`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Create a new feature specification for trip request cancellation implementing cancellation of an existing institutional trip request while preserving the project's existing response standards."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancel a pending trip request (Priority: P1)

An API consumer cancels an existing pending institutional trip request and receives the updated trip request in the standard success envelope with its status changed to `canceled`.

**Why this priority**: Canceling an active request is the primary business outcome of this feature and delivers immediate operational value without altering the rest of the trip request record.

**Independent Test**: Send a cancellation request for an existing pending trip request, then verify HTTP `200 OK`, the standard success envelope, `status: "canceled"`, unchanged non-status fields, and that the trip request remains persisted.

**Acceptance Scenarios**:

1. **Given** a persisted trip request exists with status `pending`, **When** the API consumer requests its cancellation, **Then** the system returns HTTP `200 OK` with `{ "success": true, "data": { ... } }`.
2. **Given** a persisted trip request exists with status `pending`, **When** the cancellation succeeds, **Then** the returned trip request has `status` set to `canceled`.
3. **Given** a persisted trip request exists with status `pending`, **When** the cancellation succeeds, **Then** the trip request remains stored and is not deleted from the system.
4. **Given** a persisted trip request exists with status `pending`, **When** the cancellation succeeds, **Then** `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, and `createdAt` remain unchanged.
5. **Given** a trip request is returned after cancellation, **When** its date fields are inspected, **Then** `departureAt`, `returnAt`, and `createdAt` are complete ISO 8601 UTC timestamps in the full `YYYY-MM-DDTHH:mm:ss.sssZ` shape.

---

### User Story 2 - Reject invalid cancellation targets (Priority: P2)

An API consumer tries to cancel a trip request that does not exist or has already been canceled and receives a standardized error response that explains why the cancellation cannot proceed.

**Why this priority**: Consumers need deterministic feedback for invalid cancellation attempts so they can distinguish missing records from business-rule conflicts and react correctly.

**Independent Test**: Send a cancellation request for a non-existing trip request and for an already canceled trip request, then verify the HTTP status, standard error envelope, and required internal error code for each case.

**Acceptance Scenarios**:

1. **Given** no persisted trip request matches the provided identifier, **When** the API consumer requests cancellation, **Then** the system returns HTTP `404 Not Found`.
2. **Given** no persisted trip request matches the provided identifier, **When** the error response is inspected, **Then** it uses `{ "success": false, "error": { "code": "TRIP_REQUEST_NOT_FOUND", "message": "Trip request not found" } }`.
3. **Given** a persisted trip request already has status `canceled`, **When** the API consumer requests cancellation again, **Then** the system returns HTTP `409 Conflict`.
4. **Given** a persisted trip request already has status `canceled`, **When** the error response is inspected, **Then** it uses `{ "success": false, "error": { "code": "TRIP_REQUEST_ALREADY_CANCELED", "message": "Trip request is already canceled" } }`.

---

### User Story 3 - Fail safely on unexpected cancellation errors (Priority: P3)

An API consumer receives a standardized internal error response when an unexpected failure happens during cancellation, without exposure of internal persistence details.

**Why this priority**: Safe failure handling preserves contract stability and prevents sensitive internal details from leaking to API consumers.

**Independent Test**: Trigger an unexpected failure during cancellation and verify the system returns the standard error envelope with `INTERNAL_SERVER_ERROR` while omitting internal storage details.

**Acceptance Scenarios**:

1. **Given** an unexpected failure occurs while processing a cancellation request, **When** the API consumer receives the response, **Then** the system returns `{ "success": false, "error": { "code": "INTERNAL_SERVER_ERROR", "message": "Internal server error" } }`.
2. **Given** an unexpected failure occurs while processing a cancellation request, **When** the error response is inspected, **Then** it does not expose stack traces, internal database messages, SQL statements, connection details, or similar internal details.

### Edge Cases

- A cancellation request targets an identifier that does not match any persisted trip request; the system returns `TRIP_REQUEST_NOT_FOUND` with HTTP `404 Not Found`.
- A cancellation request targets a trip request whose status is already `canceled`; the system returns `TRIP_REQUEST_ALREADY_CANCELED` with HTTP `409 Conflict` and leaves the record unchanged.
- A successfully canceled trip request must remain present in the persisted dataset, with only its `status` changed from `pending` to `canceled`.
- A trip request stored with timezone-aware date values must still return `departureAt`, `returnAt`, and `createdAt` as complete ISO 8601 UTC timestamps in the full `YYYY-MM-DDTHH:mm:ss.sssZ` shape after cancellation.
- An unexpected failure occurs after locating the trip request but before the cancellation result can be completed; the system returns `INTERNAL_SERVER_ERROR` without exposing internal persistence details.

## Requirements *(mandatory)*

### Constitutional Requirements

- **CR-001**: This feature MUST remain limited to backend cancellation of institutional trip requests and MUST NOT expand into trip request creation, trip request listing, trip request retrieval by id, holiday querying, authentication, authorization, approval flow, vehicle allocation, driver allocation, or frontend behavior.
- **CR-002**: The feature MUST preserve the required cancellation endpoint `PATCH /trip-requests/:id/cancel`.
- **CR-003**: Successful cancellation responses MUST use the standard success envelope exactly as `{ "success": true, "data": ... }`.
- **CR-004**: Cancellation errors MUST use the standard error envelope exactly as `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- **CR-005**: Cancellation responses for trip requests MUST use the canonical field names `id`, `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, `status`, and `createdAt`.
- **CR-006**: Returned `departureAt`, `returnAt`, and `createdAt` values MUST be complete ISO 8601 UTC timestamps in the `YYYY-MM-DDTHH:mm:ss.sssZ` format.
- **CR-007**: Cancellation error messages and internal error codes MUST remain in English and MUST include `TRIP_REQUEST_NOT_FOUND`, `TRIP_REQUEST_ALREADY_CANCELED`, and `INTERNAL_SERVER_ERROR` where applicable.

### Functional Requirements

- **FR-001**: The system MUST allow API consumers to cancel an existing institutional trip request through `PATCH /trip-requests/:id/cancel`.
- **FR-002**: When a persisted trip request matching the provided identifier exists with status `pending`, the system MUST complete the cancellation successfully.
- **FR-003**: A successful cancellation MUST change the trip request `status` from `pending` to `canceled`.
- **FR-004**: A successful cancellation MUST return HTTP `200 OK`.
- **FR-005**: A successful cancellation MUST return the standard success envelope with the updated trip request as `data`.
- **FR-006**: A successful cancellation response MUST include `id`, `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, `status`, and `createdAt`.
- **FR-007**: A successful cancellation MUST NOT delete the trip request from the persisted dataset.
- **FR-008**: A successful cancellation MUST NOT change `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, or `createdAt`.
- **FR-009**: A successful cancellation response MUST return `departureAt`, `returnAt`, and `createdAt` as complete ISO 8601 UTC timestamps in the full `YYYY-MM-DDTHH:mm:ss.sssZ` shape.
- **FR-010**: When no persisted trip request matches the provided identifier, the system MUST return HTTP `404 Not Found`.
- **FR-011**: A missing trip request response MUST use the standard error envelope with error code `TRIP_REQUEST_NOT_FOUND` and message `Trip request not found`.
- **FR-012**: When the targeted trip request already has status `canceled`, the system MUST reject the cancellation attempt.
- **FR-013**: An already canceled trip request MUST return HTTP `409 Conflict`.
- **FR-014**: An already canceled trip request response MUST use the standard error envelope with error code `TRIP_REQUEST_ALREADY_CANCELED` and message `Trip request is already canceled`.
- **FR-015**: A rejected repeated cancellation MUST leave the trip request unchanged.
- **FR-016**: Unexpected cancellation failures MUST return HTTP `500 Internal Server Error`.
- **FR-017**: Unexpected cancellation failures MUST use the standard error envelope with error code `INTERNAL_SERVER_ERROR` and message `Internal server error`.
- **FR-018**: Unexpected cancellation failures MUST NOT expose stack traces, internal database messages, SQL statements, connection details, local file paths, or similar internal details.

### Key Entities *(include if feature involves data)*

- **TripRequest**: A persisted institutional trip request exposed to API consumers with `id`, `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, `status`, and `createdAt`.
- **TripRequestCancellationResult**: The canonical trip request representation returned after a successful cancellation, identical to `TripRequest` except that `status` is `canceled`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of successful cancellation requests for existing pending trip requests return HTTP `200 OK` with the standard success envelope.
- **SC-002**: 100% of successful cancellations change only `status` from `pending` to `canceled` and leave all other canonical trip request fields unchanged.
- **SC-003**: 100% of cancellation requests for missing identifiers return HTTP `404 Not Found` with error code `TRIP_REQUEST_NOT_FOUND`.
- **SC-004**: 100% of repeated cancellation attempts against already canceled trip requests return HTTP `409 Conflict` with error code `TRIP_REQUEST_ALREADY_CANCELED`.
- **SC-005**: 100% of cancellation responses return `departureAt`, `returnAt`, and `createdAt` as complete ISO 8601 UTC timestamps in the full `YYYY-MM-DDTHH:mm:ss.sssZ` shape.
- **SC-006**: 100% of unexpected cancellation failures return `INTERNAL_SERVER_ERROR` in the standard error envelope without exposing internal persistence details.

## Assumptions

- The system already persists trip requests that use the canonical field set and the allowed statuses `pending` and `canceled`.
- Trip request identifiers are unique within the persisted dataset.
- Cancellation reuses the existing canonical trip request representation rather than introducing a new response shape.
- Cancellation does not introduce approval workflow changes, vehicle or driver allocation changes, holiday checks, authentication, authorization, or deletion behavior.
