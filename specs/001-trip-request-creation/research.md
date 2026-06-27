# Research: Complete Trip Request Creation

## Decision 1: Keep Prisma behind a dedicated repository abstraction

- **Decision**: Implement a `TripRequestRepository` contract and a Prisma-backed repository for trip request persistence.
- **Rationale**: Prisma is already approved, configured, and aligned with the existing schema. A repository boundary keeps database access out of routes and makes persistence replaceable in application-level tests.
- **Alternatives considered**:
  - Use Prisma directly in the route: rejected because it violates the required route/application/database separation.
  - Use `pg` directly: rejected because the team-approved access library is already Prisma.

## Decision 2: Use an application factory with injected dependencies

- **Decision**: Make `src/app.ts` the application factory that accepts injected implementations for `TripRequestRepository` and `HolidaysProvider`.
- **Rationale**: Application-level HTTP tests need a controlled repository failure path and holiday-provider doubles without changing production route behavior.
- **Alternatives considered**:
  - Hardcode dependencies inside controllers: rejected because it makes repository/provider failure testing brittle.
  - Monkey-patch production modules in tests: rejected because it hides integration boundaries and weakens determinism.

## Decision 3: Perform local validation before provider or repository access

- **Decision**: Validate required fields, reject `id`/`status`/`createdAt`, parse date-time values, normalize them to UTC, validate `returnAt >= departureAt`, and validate `passengerCount > 0` before calling `HolidaysProvider` or persistence.
- **Rationale**: The constitution requires all mandatory validation before persistence, and the feature scope now includes the complete release-ready creation flow.
- **Alternatives considered**:
  - Delay some validation until after holiday lookup: rejected because invalid local data should never reach external integrations.
  - Let the repository catch invalid dates or passenger counts: rejected because business validation belongs in the application layer.

## Decision 4: Isolate national holiday lookup behind `HolidaysProvider`

- **Decision**: Introduce a `HolidaysProvider` abstraction plus a production implementation backed by `HOLIDAYS_API_BASE_URL`.
- **Rationale**: The constitution requires a single external holiday source and replaceable integration boundaries. The abstraction also lets tests avoid the real BrasilAPI.
- **Alternatives considered**:
  - Call BrasilAPI directly from the service without an abstraction: rejected because it spreads integration details into business logic.
  - Seed holidays into PostgreSQL: rejected because the constitution explicitly forbids hardcoded or seed-loaded holiday data.

## Decision 5: Use Zod for request-shape and date-string validation, then service-level business validation

- **Decision**: Use Zod schemas for request shape and reserved-field rejection, then perform normalized date ordering and `passengerCount > 0` business checks inside the creation service.
- **Rationale**: This splits transport validation from business validation while keeping both pre-persistence and deterministic.
- **Alternatives considered**:
  - Put all validation inside one large schema: rejected because holiday lookup and normalized date comparison are more clearly expressed in application logic.
  - Validate only in the controller: rejected because business rules should remain testable without direct HTTP concerns.

## Decision 6: Cover the full flow with Vitest + Supertest and real PostgreSQL persistence

- **Decision**: Use Vitest + Supertest integration tests against the Express app, assert persistence against the real PostgreSQL database, inject `HolidaysProvider` doubles, and inject a throwing repository for the HTTP error-path test.
- **Rationale**: The acceptance criteria require proof of both HTTP behavior and durable persistence, while tests must never call the real BrasilAPI.
- **Alternatives considered**:
  - Mock persistence completely: rejected because it cannot prove PostgreSQL writes or no-write guarantees.
  - Use the real BrasilAPI in tests: rejected because the user and constitution require test isolation.
