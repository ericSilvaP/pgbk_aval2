# Research: Trip Request Retrieval

## Decision 1: Extend `TripRequestRepository` for read operations instead of adding a second persistence abstraction

- **Decision**: Add `findAll()` and `findById(id)` methods to `TripRequestRepository` and implement them in `PrismaTripRequestRepository` alongside the existing `create()` method.
- **Rationale**: The repository boundary already isolates Prisma from the route and service layers. Extending the same contract preserves a single persistence interface for trip requests and keeps retrieval logic aligned with the architecture introduced in Spec 001.
- **Alternatives considered**:
  - Use Prisma directly in retrieval services: rejected because it breaks the existing repository boundary.
  - Create a separate read-only repository abstraction: rejected because it adds unnecessary complexity for the same aggregate.

## Decision 2: Keep one service and one controller per retrieval endpoint

- **Decision**: Add a `listTripRequests` service and controller for `GET /trip-requests`, plus a `getTripRequestById` service and controller for `GET /trip-requests/:id`.
- **Rationale**: The current application already separates HTTP wiring from business logic for creation. Mirroring that pattern for list and get-by-id keeps responsibilities narrow and makes each endpoint independently testable.
- **Alternatives considered**:
  - Build a single generic retrieval service with branching behavior: rejected because it would mix collection and single-record semantics, especially around 404 handling.
  - Put repository calls directly in controllers: rejected because it weakens application-layer testability and duplicates orchestration concerns.

## Decision 3: Surface missing identifiers as an application error from the get-by-id service

- **Decision**: Add `TRIP_REQUEST_NOT_FOUND` to the existing `AppError` mapping and expose a dedicated helper for the get-by-id service to throw when `findById()` returns `null`.
- **Rationale**: Not-found is a domain outcome for single-record retrieval, and the centralized error handler already owns HTTP envelope formatting for `AppError` instances.
- **Alternatives considered**:
  - Return `null` from the controller and craft a 404 response there: rejected because it bypasses the centralized error path.
  - Throw raw errors from Prisma: rejected because it would leak persistence details into HTTP handling.

## Decision 4: Reuse the existing response mapper and success helper for both collection and single-item responses

- **Decision**: Keep `mapTripRequestToResponse()` as the single serializer for trip request records and pair it with `sendSuccessResponse()` for list and get-by-id responses.
- **Rationale**: The existing mapper already preserves canonical field names and UTC strings. Reusing it avoids serializer drift between creation and retrieval responses.
- **Alternatives considered**:
  - Duplicate response-shaping logic in each controller: rejected because it risks inconsistencies with the creation response contract.
  - Add a second mapper for retrieval: rejected because the response shape is identical.

## Decision 5: Use real PostgreSQL integration tests for success paths and injected repository doubles for unexpected failure paths

- **Decision**: Add retrieval integration tests under `tests/integration/trip-requests/`, seed records through the existing PostgreSQL helper, and use an injected throwing repository only for the `INTERNAL_SERVER_ERROR` path.
- **Rationale**: Successful retrieval and empty-state behavior must be proven against the real persistence layer, while the unexpected-failure path is easier and more deterministic through dependency injection.
- **Alternatives considered**:
  - Mock all persistence in retrieval tests: rejected because it would not prove PostgreSQL reads or UTC serialization from persisted rows.
  - Force production Prisma failures for every error-path test: rejected because it is slower and less deterministic than a repository double.

## Decision 6: Leave the creation and holiday flows untouched while reusing the app factory composition root

- **Decision**: Keep `createApp()` as the single composition root and preserve `createCreateTripRequestService()` plus the holidays provider wiring unchanged, while adding retrieval dependencies through the same router registration path.
- **Rationale**: The feature is explicitly read-only, but the existing app factory already composes the full application. Extending it is safer than introducing a separate read-only bootstrap.
- **Alternatives considered**:
  - Split retrieval into a second Express app: rejected because it would duplicate bootstrap logic and increase drift risk.
  - Refactor the creation flow during retrieval work: rejected because it is out of scope unless safe contract reuse is required.
