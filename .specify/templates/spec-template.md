# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`

**Created**: [DATE]

**Status**: Draft

**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: Include all constitution-mandated edge cases that apply.
-->

- What happens when `returnAt` is earlier than `departureAt`?
- What happens when `passengerCount` is zero or negative?
- What happens when `departureAt` falls on a national holiday returned by BrasilAPI?
- What happens when BrasilAPI is unavailable during creation or holiday lookup?
- What happens when a requested `trip-requests` identifier does not exist?
- What happens when a canceled trip request is canceled again?
- What happens when a valid ISO 8601 date includes a non-UTC offset?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Constitutional Requirements

- **CR-001**: System MUST remain a backend-only REST API; frontend and out-of-scope administrative workflows MUST NOT be specified.
- **CR-002**: System MUST preserve the required endpoints: `POST /trip-requests`, `GET /trip-requests`, `GET /trip-requests/:id`, `PATCH /trip-requests/:id/cancel`, and `GET /holidays/:year`.
- **CR-003**: Success responses MUST use `{ "success": true, "data": ... }` exactly; error responses MUST use `{ "success": false, "error": { "code": "...", "message": "..." } }` exactly.
- **CR-004**: Error messages and internal error codes MUST be in English; codes MUST include `VALIDATION_ERROR`, `TRIP_REQUEST_NOT_FOUND`, `TRIP_REQUEST_ALREADY_CANCELED`, `HOLIDAY_TRIP_NOT_ALLOWED`, `HOLIDAYS_API_UNAVAILABLE`, and `INTERNAL_SERVER_ERROR`.
- **CR-005**: Date fields `departureAt`, `returnAt`, and `createdAt` MUST be complete ISO 8601 UTC timestamps in the `YYYY-MM-DDTHH:mm:ss.sssZ` format after normalization.
- **CR-006**: National holidays MUST come only from BrasilAPI via `HOLIDAYS_API_BASE_URL`; no hardcoded, manual, or seed-loaded holiday data is allowed.
- **CR-007**: Tests MUST use Vitest and MUST NOT depend on the real BrasilAPI availability.

### Functional Requirements

- **FR-001**: System MUST create a trip request with `status: "pending"` after validating required fields, data types, dates, passenger count, and holiday rules.
- **FR-002**: System MUST list trip requests.
- **FR-003**: System MUST retrieve a trip request by identifier and return `TRIP_REQUEST_NOT_FOUND` with HTTP 404 when absent.
- **FR-004**: System MUST cancel an existing trip request by setting `status: "canceled"` and MUST reject repeated cancellation with `TRIP_REQUEST_ALREADY_CANCELED` and HTTP 409.
- **FR-005**: System MUST return national holidays for a given year from BrasilAPI or a cache populated from BrasilAPI during execution.
- **FR-006**: System MUST reject invalid input with `VALIDATION_ERROR` and HTTP 400 before persistence.
- **FR-007**: System MUST reject departure on a national holiday with `HOLIDAY_TRIP_NOT_ALLOWED` and HTTP 409 before persistence.
- **FR-008**: System MUST reject required BrasilAPI access failures with `HOLIDAYS_API_UNAVAILABLE` and HTTP 502.
- **FR-009**: System MUST convert unknown errors to `INTERNAL_SERVER_ERROR` and HTTP 500 without exposing sensitive internals.

### Key Entities *(include if feature involves data)*

- **TripRequest**: Institutional travel request with at least `id`, `requesterName`, `origin`, `destination`, `departureAt`, `returnAt`, `purpose`, `passengerCount`, `status`, and `createdAt`.
- **Holiday**: National holiday obtained from BrasilAPI and converted to the application's own model before returning or using in business rules.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: All required endpoints return the mandated HTTP status codes and response envelope formats.
- **SC-002**: Valid creation persists exactly one trip request with normalized UTC dates and `status: "pending"`.
- **SC-003**: Invalid creation, holiday departure, missing trip request, and repeated cancellation produce the mandated internal error codes.
- **SC-004**: Automated Vitest coverage passes without requiring the real BrasilAPI service to be available.

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- The API is consumed by institutional clients that can send JSON over HTTP.
- Authentication, authorization, user registration, approvals, vehicle/driver allocation, check-in/check-out, mileage control, reports, frontend, and mobile UI remain out of scope.
- The database runs from `docker-compose.yml` and is initialized through the documented `init:db` script.
- National holiday data depends on BrasilAPI through `HOLIDAYS_API_BASE_URL`, with tests using a controlled replacement.
