# Research: Trip Request Cancellation

## Decision 1: Extend `TripRequestRepository` with a cancellation-specific write method

- **Decision**: Add `cancelById(id)` to `TripRequestRepository` and implement it in `PrismaTripRequestRepository` as a status-only update that returns the updated `TripRequest`.
- **Rationale**: The current repository boundary already isolates Prisma for creation and retrieval. A cancellation-specific method preserves that abstraction and matches the only new state transition the project needs, without introducing a broader write API that the assignment does not require.
- **Alternatives considered**:
  - Add a generic `updateStatus(id, status)` method: rejected because it creates a wider mutation surface than the current scope needs.
  - Use Prisma directly in the cancellation service: rejected because it would bypass the existing repository boundary.

## Decision 2: Use the existing `findById()` read path to classify `404` versus `409` before writing

- **Decision**: Keep cancellation orchestration in a dedicated service that first calls `findById(id)`, throws `TRIP_REQUEST_NOT_FOUND` when absent, throws `TRIP_REQUEST_ALREADY_CANCELED` when the current status is already `canceled`, and calls `cancelById(id)` only for `pending` requests.
- **Rationale**: The repository already exposes `findById()`, and the service layer is the current place for endpoint-specific business rules. Reusing the lookup keeps status validation explicit and avoids overloading persistence code with HTTP-oriented branching.
- **Alternatives considered**:
  - Encode not-found and already-canceled branching inside one repository write call: rejected because it would hide business rules inside persistence and make service behavior less explicit.
  - Put the branching logic in the controller: rejected because controllers already delegate orchestration to services in the existing architecture.

## Decision 3: Add an explicit `TRIP_REQUEST_ALREADY_CANCELED` application error helper

- **Decision**: Extend `AppError` support with `TRIP_REQUEST_ALREADY_CANCELED` mapped to HTTP `409` and expose a dedicated helper for cancellation services and controllers to use.
- **Rationale**: Conflict on repeated cancellation is a domain outcome, not a transport detail. The centralized error handler already owns envelope formatting, so the service should raise an application error and let the handler produce the canonical response.
- **Alternatives considered**:
  - Return ad hoc `409` responses directly from the controller: rejected because it duplicates error transformation logic outside the centralized handler.
  - Throw raw Prisma or generic errors for repeated cancellation: rejected because that would not preserve the canonical business error contract.

## Decision 4: Reuse the existing trip request response mapper and success envelope helper unchanged

- **Decision**: Keep `mapTripRequestToResponse()` as the single serializer for successful cancellation results and continue using `sendSuccessResponse()` for the HTTP `200` envelope.
- **Rationale**: Cancellation returns the same canonical trip request shape already used by creation and retrieval. Reusing the same mapper prevents response drift and preserves UTC ISO 8601 serialization already proven by the repository and integration tests.
- **Alternatives considered**:
  - Add a cancellation-specific response mapper: rejected because the response shape is identical.
  - Shape the success payload inline in the controller: rejected because it duplicates canonical field mapping.

## Decision 5: Prove persistence and immutability through PostgreSQL integration tests

- **Decision**: Add `PATCH /trip-requests/:id/cancel` integration tests that seed real records through the existing database helper, assert the HTTP response, then query the database again to confirm the record still exists and only `status` changed. Use an injected throwing repository only for the `INTERNAL_SERVER_ERROR` path.
- **Rationale**: The feature's key risk is state persistence, not routing syntax. Real database tests prove that cancellation updates the stored row correctly, while injected doubles keep the unexpected-failure path deterministic and aligned with the existing test style.
- **Alternatives considered**:
  - Mock persistence for all cancellation tests: rejected because it would not prove the stored status transition or record survival in PostgreSQL.
  - Force infrastructure failures in every error-path test: rejected because it is slower and less deterministic than a targeted throwing repository.

## Decision 6: Preserve existing creation and retrieval wiring while extending the app factory

- **Decision**: Keep `createApp()` as the single composition root, preserve the current holidays-provider wiring unchanged, and add cancellation dependencies through the same router registration path used by creation and retrieval.
- **Rationale**: The application already composes all endpoint dependencies centrally. Extending that wiring is lower risk than introducing a second bootstrap path or refactoring unrelated features during cancellation work.
- **Alternatives considered**:
  - Build a separate cancellation-only Express app: rejected because it would duplicate bootstrap and error-handler wiring.
  - Refactor the existing features while adding cancellation: rejected because it is outside the requested scope.
