<!--
Sync Impact Report
Version change: 1.0.0 -> 1.0.1
Modified principles:
- I. Functional compliance over technical preferences -> I. Functional compliance over technical preferences
- II. Minimal scope and no unnecessary complexity -> II. Minimal scope and no unnecessary complexity
- III. Mandatory stack and strict typing -> III. Mandatory stack and strict typing
- IV. Stable REST contracts -> IV. Stable REST contracts
- V. Standardized responses at all times -> V. Standardized responses at all times
- VI. Centralized error handling -> VI. Centralized error handling
- VII. Mandatory validation before persistence -> VII. Mandatory validation before persistence
- VIII. Dates normalized to UTC -> VIII. Dates normalized to UTC
- IX. BrasilAPI as the only holiday source -> IX. BrasilAPI as the only holiday source
- X. Isolated external integrations -> X. Isolated external integrations
- XI. Isolated and real persistence -> XI. Isolated and real persistence
- XII. Reproducible database initialization -> XII. Reproducible database initialization
- XIII. Environment-based configuration -> XIII. Environment-based configuration
- XIV. Minimum separation of responsibilities -> XIV. Minimum separation of responsibilities
- XV. Mandatory and deterministic tests -> XV. Mandatory and deterministic tests
- XVI. Naming and language -> XVI. Naming and language
- XVII. Executable documentation -> XVII. Executable documentation
- XVIII. Mandatory scripts -> XVIII. Mandatory scripts
- XIX. Incremental version control -> XIX. Incremental version control
- XX. Responsible use of artificial intelligence -> XX. Responsible use of artificial intelligence
Added sections:
- None
Removed sections:
- None
Templates requiring updates:
- ✅ checked: .specify/templates/plan-template.md
- ✅ checked: .specify/templates/spec-template.md
- ✅ checked: .specify/templates/tasks-template.md
- ✅ checked: .specify/templates/commands/*.md (directory not present)
- ✅ checked: AGENTS.md
Follow-up TODOs:
- None
-->

# Project Constitution

## Project Identity

This project implements a REST API for simplified management of institutional trip
requests.

The system's primary resource MUST be `trip-requests`.

The system MUST allow users to:

- create trip requests;
- list trip requests;
- retrieve a trip request by identifier;
- cancel a trip request;
- retrieve national holidays;
- prevent trips whose departure date is a national holiday.

The application MUST be backend-only. No frontend MUST be implemented.

## Core Principles

### I. Functional compliance over technical preferences

Every implementation MUST fully comply with the functional contract defined for the
assignment.

Architecture decisions, libraries, and internal patterns MUST NOT change:

- mandatory route names;
- mandatory property names;
- HTTP status codes;
- internal error codes;
- response formats;
- business rules;
- mandatory scripts;
- mandatory environment variables.

The system MUST implement, at minimum:

- `POST /trip-requests`;
- `GET /trip-requests`;
- `GET /trip-requests/:id`;
- `PATCH /trip-requests/:id/cancel`;
- `GET /holidays/:year`.

Any functionality not explicitly requested MUST be treated as out of scope, except
when it is necessary to ensure project organization, testing, or execution.

Rationale: the assignment's functional contract takes precedence over technical
preferences to ensure objective evaluation and predictable behavior.

### II. Minimal scope and no unnecessary complexity

The project MUST remain simple, readable, and compatible with the academic objective
of the assignment.

The following MUST NOT be implemented:

- authentication;
- authorization;
- user registration;
- request approval workflows;
- vehicle allocation;
- driver allocation;
- check-in;
- check-out;
- mileage tracking;
- administrative reports;
- frontend.

Clean Architecture, DDD, and complex architectures are NOT REQUIRED.

Additional structure MUST be created only when it solves a real problem related to
organization, maintainability, testing, or separation of responsibility.

Rationale: minimal scope reduces risk, simplifies review, and avoids features that do
not belong to the required delivery.

### III. Mandatory stack and strict typing

The project MUST use:

- TypeScript;
- `strict: true`;
- Node.js 20 or higher;
- Vitest for testing;
- Git for version control;
- a real DBMS;
- Docker Compose to run the DBMS;
- BrasilAPI for national holiday lookup.

The HTTP framework is free to choose.

Database access MAY use:

- a native driver;
- direct SQL;
- a query builder;
- an ORM;
- an ODM;
- an equivalent library.

That choice MUST be documented in the README.

Memory-only persistence is NOT ALLOWED.

The project MUST include the following file:

```text
docker-compose.yml
```

Rationale: the mandatory stack ensures reproducibility, strong typing, and consistent
evaluation.

### IV. Stable REST contracts

Routes MUST represent resources and actions coherently.

The primary resource MUST use the name:

```text
trip-requests
```

A trip request MUST include, at minimum:

- `id`;
- `requesterName`;
- `origin`;
- `destination`;
- `departureAt`;
- `returnAt`;
- `purpose`;
- `passengerCount`;
- `status`;
- `createdAt`.

The only allowed states are:

- `pending`;
- `canceled`.

Every created trip request MUST start with:

```json
{
  "status": "pending"
}
```

Cancellation MUST change the status to:

```json
{
  "status": "canceled"
}
```

A canceled trip request MUST NOT be canceled again.

Rationale: stable REST contracts prevent divergence between implementation, tests, and
documentation.

### V. Standardized responses at all times

Every successful response MUST follow this exact format:

```json
{
  "success": true,
  "data": {}
}
```

The `data` field MUST contain the object or list returned by the operation.

Every error response MUST follow this exact format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A clear and objective error message"
  }
}
```

Error messages MUST be written in English.

Internal error codes MUST be written in English and in UPPER_SNAKE_CASE.

The following codes MUST exist:

- `VALIDATION_ERROR`;
- `TRIP_REQUEST_NOT_FOUND`;
- `TRIP_REQUEST_ALREADY_CANCELED`;
- `HOLIDAY_TRIP_NOT_ALLOWED`;
- `HOLIDAYS_API_UNAVAILABLE`;
- `INTERNAL_SERVER_ERROR`.

No route MAY define its own response format.

Rationale: standardized envelopes make clients, tests, and error handling
deterministic.

### VI. Centralized error handling

Errors MUST be handled by a centralized component.

Controllers, handlers, or routes MUST NOT duplicate error transformation logic.

The application MUST use the following HTTP status codes:

- `201 Created` for successful creation;
- `200 OK` for queries;
- `200 OK` for cancellation;
- `400 Bad Request` for invalid input;
- `404 Not Found` for a missing resource;
- `409 Conflict` for business rule violations;
- `502 Bad Gateway` for external API failures;
- `500 Internal Server Error` for unexpected errors.

Responses MUST NOT expose:

- stack traces;
- internal database messages;
- SQL queries;
- local file paths;
- credentials;
- sensitive technical details;
- unhandled error objects.

Unknown errors MUST be converted to `INTERNAL_SERVER_ERROR`.

Rationale: centralized handling reduces duplication and prevents leakage of internal
details.

### VII. Mandatory validation before persistence

No trip request MAY be persisted before all validations have completed.

Trip request creation MUST validate:

- presence of required fields;
- field types;
- valid date format;
- `returnAt` greater than or equal to `departureAt`;
- `passengerCount` greater than zero;
- a departure date that is not a national holiday.

When validation fails, no partial write MAY remain in the database.

Invalid data MUST generate:

```text
VALIDATION_ERROR
```

Departure on a national holiday MUST generate:

```text
HOLIDAY_TRIP_NOT_ALLOWED
```

Rationale: validating before persistence preserves consistency and prevents partial,
invalid records.

### VIII. Dates normalized to UTC

The following fields MUST be received, stored, and returned as complete ISO 8601
values:

- `departureAt`;
- `returnAt`;
- `createdAt`.

The required format is:

```text
YYYY-MM-DDTHH:mm:ss.sssZ
```

Valid ISO 8601 dates with another offset MUST be normalized to UTC before
persistence.

Example:

```text
2026-06-24T07:00:00-03:00
```

MUST be persisted as:

```text
2026-06-24T10:00:00.000Z
```

Holiday validation MUST use the calendar date extracted from the normalized
`departureAt` value in the following format:

```text
YYYY-MM-DD
```

Date comparisons MUST NOT depend on the machine's local time zone.

Rationale: UTC eliminates environment differences and makes holiday validation
deterministic.

### IX. BrasilAPI as the only holiday source

The application MUST obtain national holidays through BrasilAPI.

Expected external endpoint:

```text
GET /api/feriados/v1/{year}
```

The base URL MUST come from:

```text
HOLIDAYS_API_BASE_URL
```

Two strategies are allowed:

- real-time lookup;
- on-demand local mirroring.

For on-demand local mirroring:

- data MUST be fetched from BrasilAPI during execution;
- cache or mirroring MUST happen only after a real lookup;
- the system MAY reuse previously fetched data.

The following are prohibited:

- hardcoded holidays;
- manually inserted holidays;
- a fixed list in code;
- loading holidays through the `init:db` script;
- using data with no origin in BrasilAPI.

When the application needs to query BrasilAPI and it is unavailable, the trip request
MUST NOT be created.

That condition MUST return:

```text
HOLIDAYS_API_UNAVAILABLE
```

with HTTP:

```text
502 Bad Gateway
```

Rationale: a single external source avoids divergence and keeps tests free to replace
the integration with controlled doubles.

### X. Isolated external integrations

Calls to BrasilAPI MUST NOT be spread directly across routes.

The integration MUST be concentrated in a dedicated component, such as:

- `HolidaysClient`;
- `HolidaysService`;
- an equivalent adapter.

The component MUST be replaceable during tests.

Routes MUST NOT know details about:

- full URLs;
- timeout handling;
- external response conversion;
- cache rules;
- external HTTP error handling.

The application MUST convert external responses into its own model before returning
them.

Rationale: isolated integrations enable deterministic tests and prevent routes from
being coupled to the external provider.

### XI. Isolated and real persistence

DBMS access MUST be concentrated in dedicated components.

Routes MUST NOT contain SQL queries or detailed ORM calls when those concerns can be
delegated to a repository or persistence service.

The database MUST run through Docker Compose.

`DATABASE_URL` MUST be compatible with the service defined in:

```text
docker-compose.yml
```

The project MUST NOT depend on:

- a manually created database;
- manually created tables;
- machine-specific paths from a team member;
- undocumented configuration;
- external commands not present in the project's scripts.

Rationale: real and isolated persistence ensures reproducible execution and separation
of responsibilities.

### XII. Reproducible database initialization

The project MUST provide the following script:

```text
init:db
```

The script MUST:

- create the required structures;
- prepare the database for execution;
- insert at least 10 trip requests;
- be runnable multiple times;
- not fail because records already exist;
- not create holidays;
- not mirror holidays;
- not depend on manual editing.

The script MUST be idempotent.

The team MUST define explicitly how seed records are identified to avoid
duplication.

Rationale: reproducible initialization allows the API to be validated in a clean
clone without hidden manual steps.

### XIII. Environment-based configuration

The application MUST use:

```text
NODE_ENV=development
PORT=3000
DATABASE_URL=<functional value>
HOLIDAYS_API_BASE_URL=https://brasilapi.com.br
```

The `.env.example` file MUST:

- exist;
- contain all mandatory variables;
- provide functional values;
- be compatible with `docker-compose.yml`;
- allow the project to run without manual value edits.

Non-executable placeholders are PROHIBITED.

The project MUST adopt one of the following strategies:

- copy `.env.example` to `.env` without editing it;
- use the same values as defaults when `.env` does not exist.

Real secrets MUST NOT be versioned.

Rationale: executable configuration prevents drift between documentation, Docker, and
the application.

### XIV. Minimum separation of responsibilities

The project MUST separate, at minimum:

- HTTP routes;
- data validation;
- business rules;
- database access;
- holiday integration;
- error handling;
- response formatting;
- application configuration.

A route MUST coordinate the request, but it MUST NOT contain the entire
implementation.

Business rules MUST NOT depend directly on the HTTP framework.

The structure MUST allow rules to be tested without requiring a real HTTP port.

Rationale: minimum separation makes testing and maintenance easier without imposing a
complex architecture.

### XV. Mandatory and deterministic tests

All tests MUST use Vitest.

The following script MUST run the suite:

```text
test
```

The suite MUST cover, at minimum:

- valid creation;
- `returnAt` earlier than `departureAt`;
- `passengerCount` less than zero;
- `passengerCount` equal to zero;
- departure on a national holiday;
- lookup of a non-existent trip request;
- cancellation of an existing trip request;
- cancellation of an already canceled trip request.

Holiday tests MUST NOT depend on the real availability of BrasilAPI.

The external integration MUST be replaced by:

- a mock;
- a stub;
- a fake;
- a test HTTP server;
- an equivalent controlled implementation.

Tests MUST validate:

- HTTP status code;
- response format;
- internal error code;
- expected message when relevant;
- state change;
- persistence or absence of persistence.

Tests MUST NOT depend on execution order.

Each test MUST control its own data.

Rationale: deterministic tests uphold the REST contract and prevent dependency on real
external services.

### XVI. Naming and language

All technical content MUST be written in English.

This includes:

- variables;
- functions;
- methods;
- classes;
- interfaces;
- types;
- enums;
- files;
- directories;
- comments;
- logs;
- error messages;
- tests;
- scripts;
- database objects;
- DTOs;
- schemas;
- services;
- repositories;
- use cases;
- commit messages.

Mandatory conventions:

- camelCase for variables, functions, methods, properties, parameters, and local
  constants;
- PascalCase for classes, interfaces, types, and enums;
- kebab-case for files and directories;
- UPPER_SNAKE_CASE for internal error codes;
- English for technical identifiers.

Names defined by the contract MUST be preserved exactly:

- `trip-requests`;
- `requesterName`;
- `departureAt`;
- `returnAt`;
- `passengerCount`;
- `DATABASE_URL`;
- `HOLIDAYS_API_BASE_URL`.

Business data MAY remain in its original language, such as:

- people's names;
- city names;
- holiday names returned by BrasilAPI.

Rationale: consistent naming reduces ambiguity and preserves compatibility with the
evaluated contract.

### XVII. Executable documentation

The README MUST allow someone to run the project without help from the team.

The README MUST contain:

- team name, when applicable;
- full names of the team members;
- API description;
- technologies;
- DBMS;
- package manager;
- dependency installation;
- environment configuration;
- Docker Compose startup;
- database initialization and seeding;
- application execution;
- test execution;
- concise endpoint documentation;
- request body examples;
- relevant HTTP status codes.

Documented commands MUST work in a clean clone.

The README MUST NOT omit required steps.

Rationale: executable documentation is part of the delivery, not just supporting text.

### XVIII. Mandatory scripts

`package.json` MUST contain, at minimum:

```json
{
  "scripts": {
    "dev": "...",
    "start": "...",
    "init:db": "...",
    "test": "..."
  }
}
```

Each script MUST work according to its name.

The project MUST document only one primary package manager to avoid conflicting
commands.

Rationale: standardized scripts reduce dependence on local team knowledge.

### XIX. Incremental version control

Development MUST contain more than one meaningful commit.

Commit messages MUST:

- be in English;
- be clear;
- describe a specific change;
- represent understandable changes;
- avoid generic terms.

The following messages are forbidden as a complete description:

- `update`;
- `fix`;
- `final`;
- `changes`;
- `project`.

Commits MUST represent incremental evolution.

A Git checkpoint MUST exist before extensive AI-generated changes.

The `node_modules` directory MUST NOT be versioned.

Rationale: incremental history improves review, auditability, and recovery.

### XX. Responsible use of artificial intelligence

AI tools MAY assist with:

- planning;
- code generation;
- review;
- testing;
- documentation;
- refactoring.

AI-generated code MUST NOT be accepted without review.

The team MUST understand and be able to explain:

- REST resources;
- validation rules;
- date normalization;
- BrasilAPI integration;
- persistence;
- errors;
- responses;
- tests;
- technical decisions.

Every AI-generated change MUST be checked against:

- this constitution;
- the feature specification;
- the technical plan;
- the endpoint contract;
- automated tests;
- the evaluation criteria.

AI MUST NOT expand the scope without explicit authorization.

Rationale: AI can accelerate delivery, but the team remains responsible for
understanding, reviewing, and validating the result.

## Quality Gates

No task MAY be considered complete while:

- TypeScript still has errors;
- tests are failing;
- the REST contract is incorrect;
- responses do not follow the mandatory envelope;
- errors expose internal details;
- dates are not normalized;
- BrasilAPI cannot be replaced in tests;
- data is not persisted in the DBMS;
- the project depends on undocumented manual configuration;
- the README is incompatible with real execution.

Before integrating a change, the team MUST:

- install dependencies;
- start the database;
- initialize the database;
- run type checking;
- run tests;
- start the application;
- validate affected endpoints.

Concrete commands MUST use the package manager chosen by the team.

## Definition of Done

A feature is complete only when it:

- respects the specification;
- respects this constitution;
- includes validations;
- includes error handling;
- preserves the response standard;
- persists correctly;
- includes relevant tests;
- does not depend on the real BrasilAPI during tests;
- keeps identifiers in English;
- does not introduce out-of-scope complexity;
- updates documentation when necessary;
- passes all tests;
- works in a clean clone.

## Delivery Requirements

The final repository MUST be public on GitHub.

It MUST contain:

- complete source code;
- `README.md`;
- `.env.example`;
- `docker-compose.yml`;
- `package.json`;
- mandatory scripts;
- database creation structure;
- initial population with at least 10 trip requests;
- automated tests.

It MUST NOT contain:

- `node_modules`;
- real credentials;
- unnecessary local IDE files;
- versioned local database files;
- static holiday lists;
- frontend;
- out-of-scope functionality.

## Governance

This constitution takes precedence over informal decisions, AI-generated code, and
individual preferences.

Every specification, plan, and task list MUST be validated against these principles.

A constitution amendment MUST:

- identify clearly which principle changed;
- present the rationale;
- assess the impact on code, tests, and documentation;
- update the version;
- be recorded in Git.

Mandatory assignment rules MUST NOT be removed by team decision.

Rules MAY be added when they increase quality without contradicting the scope.

Versioning:

- MAJOR: removal of a principle or an incompatible change to a principle;
- MINOR: addition of a new principle or relevant section;
- PATCH: textual correction or clarification with no behavior change.

Compliance review MUST occur before planning, before task generation, and before any
feature is considered complete. Any conflict between generated artifacts and this
constitution MUST be resolved in favor of this constitution.

**Version**: 1.0.1 | **Ratified**: 2026-06-25 | **Last Amended**: 2026-06-25
