# dora-frontend

Angular 20 frontend for the DORA (Digital Operational Resilience Act) incident management platform.

Spec: [LLD-01 Local Dev Baseline](../dora-docs/low-level-design/LLD-01-local-dev-baseline.md)

## Prerequisites

- Node 20.x (recommend managing via [nvm](https://github.com/nvm-sh/nvm) or [mise](https://mise.jdx.dev/))
- Angular CLI 20: `npm install -g @angular/cli@20`
- Docker Desktop (required for the full stack via `docker compose`)

## One-command quickstart

```bash
npm install && npm start
```

The dev server starts at http://localhost:4200. It proxies `/api` to `http://localhost:8080`. The API must be running or the health check will show the error state. To run the full stack:

```bash
# From dora-workspace/
docker compose up
```

## API codegen

TypeScript client classes are generated from the OpenAPI contract at `../dora-api/src/main/resources/openapi.yaml`:

```bash
npm run codegen
```

Output is written to `src/generated/api/` (gitignored — always rebuild from the spec).

## Tests

```bash
npm test
# or for a single CI run (no watch):
npm test -- --watch=false
```

## Lint and format

```bash
npm run lint
npm run format
```

## Service URLs (local stack)

| Service            | URL                          |
|--------------------|------------------------------|
| Angular dev server | http://localhost:4200        |
| API (Spring Boot)  | http://localhost:8080        |
| Swagger UI         | http://localhost:8080/swagger-ui.html |
| MinIO console      | http://localhost:9001        |
| MailHog UI         | http://localhost:8025        |
