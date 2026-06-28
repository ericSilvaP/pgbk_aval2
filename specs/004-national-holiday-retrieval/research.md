# Research: National Holiday Retrieval

## Decision 1: Preserve the existing `HolidaysProvider` abstraction and harden its holiday DTO

- **Decision**: Reuse `src/providers/holidays-provider.ts` and `src/providers/brasil-api-holidays-provider.ts` as the only BrasilAPI integration boundary, but change the holiday DTO contract so `date`, `name`, and `type` are all required and the provider rejects any non-array or malformed item payload.
- **Rationale**: The project already depends on an injectable holiday provider for trip creation. Reusing that boundary keeps `createApp()` unchanged structurally, lets the new endpoint share the same production integration, and gives tests a stable injection point. Tightening the DTO at the provider boundary ensures malformed upstream payloads are classified uniformly before they reach controllers or services.
- **Alternatives considered**:
  - Add a second holidays client just for `GET /holidays/:year`: rejected because it would duplicate the BrasilAPI integration and create drift between trip validation and holiday retrieval.
  - Leave `type` optional and patch missing fields later in the controller: rejected because the feature explicitly requires `type` in every successful item and mandates `502` for invalid upstream payloads.

## Decision 2: Validate the `year` path parameter before any provider call

- **Decision**: Add a dedicated year parser for `GET /holidays/:year` that accepts only values matching four numeric digits and the numeric range `1000` to `9999`, and raises `VALIDATION_ERROR` with HTTP `400` for values such as `0000`, `0999`, `10000`, `abcd`, `20a5`, `25`, and `202`.
- **Rationale**: The route contract depends on a required path parameter, and invalid values must fail deterministically without touching the external provider. A dedicated parser matches the existing Zod-based validation style and keeps route-level validation distinct from upstream error handling.
- **Alternatives considered**:
  - Coerce `year` with `Number()` and rely on `Number.isInteger()`: rejected because it would accept malformed strings too loosely and would not enforce exact four-digit formatting.
  - Validate inside the provider: rejected because invalid path input is an API contract failure, not an upstream integration concern.

## Decision 3: Introduce a dedicated holiday retrieval service and controller

- **Decision**: Add one service that accepts a validated year, calls `holidaysProvider.getNationalHolidays(year)`, maps provider failures to `HOLIDAYS_API_UNAVAILABLE`, and returns a read-only holiday array to a controller that emits the standard success envelope.
- **Rationale**: Existing features use a service/controller split, and the service layer is already where cross-boundary orchestration lives. Keeping provider failure mapping in the service avoids ad hoc route logic and keeps the controller limited to request parsing plus success response emission.
- **Alternatives considered**:
  - Call the provider directly from the controller: rejected because it would mix transport parsing with integration error mapping.
  - Add repository or persistence involvement: rejected because the feature must not persist holidays.

## Decision 4: Treat all upstream transport, timeout, status, and payload failures as the same `502` contract

- **Decision**: Classify fetch rejections, explicit abort timeouts, non-`2xx` responses, non-JSON payloads, non-array payloads, and array items missing `date`, `name`, or `type` as `HOLIDAYS_API_UNAVAILABLE` with HTTP `502`.
- **Rationale**: The specification collapses all provider-side failures into one public contract. The existing `HolidaysProviderError` type is the right seam for that classification, and the holiday retrieval service can wrap any thrown provider error into the standardized application error without leaking upstream details.
- **Alternatives considered**:
  - Expose different error codes for timeout versus invalid payload: rejected because the feature explicitly requires one external-failure code.
  - Bubble raw provider errors to centralized error handling: rejected because that would produce `500` instead of the required `502`.

## Decision 5: Keep routing additive and isolate the new endpoint from trip-request routes

- **Decision**: Register the holidays endpoint through its own router module and mount it from `src/routes/index.ts`, leaving `src/routes/trip-request.routes.ts` responsible only for trip-request routes.
- **Rationale**: The project already has a clear trip-request router. Adding a second small router keeps resource boundaries explicit and lowers regression risk for existing endpoints.
- **Alternatives considered**:
  - Append `GET /holidays/:year` directly to `trip-request.routes.ts`: rejected because it would blur resource ownership and make the router less cohesive.
  - Create a second Express app for holidays: rejected because it would duplicate bootstrap and error-handler wiring.

## Decision 6: Use deterministic integration tests through dependency injection and controlled fetch stubs

- **Decision**: Add `tests/integration/holidays/get-holidays.test.ts` that exercises the route through `createApp()` with injected provider doubles for success, invalid-year short-circuiting, provider failure, and unexpected service failure; use a provider instance with stubbed `fetchImplementation` only where a timeout or invalid-payload path is specifically better proven at the provider level.
- **Rationale**: The application factory already supports dependency injection, and the repository-free nature of this endpoint makes pure HTTP integration tests fast and deterministic. Controlled doubles satisfy the requirement that tests never call the real BrasilAPI while still validating the complete Express route and envelope behavior.
- **Alternatives considered**:
  - Hit the real BrasilAPI in integration tests: rejected because the specification explicitly forbids network dependency.
  - Test only the service without routing: rejected because the feature contract centers on HTTP status and standardized envelopes.

## Decision 7: Resolve the route-text inconsistency in favor of `GET /holidays/:year`

- **Decision**: Treat the implementation contract as `GET /holidays/:year` even though one user instruction line abbreviated it as `GET /holidays/`.
- **Rationale**: The specification, constitution, and clarified requirements consistently require a mandatory `year` path parameter, invalid year examples, and lookup for a requested year. Those requirements are only coherent with the parameterized route.
- **Alternatives considered**:
  - Implement `GET /holidays/` with `year` as a query string: rejected because it would violate the approved specification and constitution.
  - Treat the inconsistency as unresolved and stop planning: rejected because the stronger, repeated contract language already resolves it.
