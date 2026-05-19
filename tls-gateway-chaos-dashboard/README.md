# TLS Gateway Chaos Lab — Dashboard

A full-stack monitoring and chaos-engineering dashboard for TLS certificate scenarios in a gateway-first microservices architecture. Built as a pnpm monorepo with a React + Vite frontend and a Fastify backend. All data is mocked in-memory — no real certificates, Kubernetes, or external dependencies are required.

---

## Architecture

```
tls-gateway-chaos-dashboard/
  apps/
    web/        React + Vite + TypeScript (port 5173, proxies /api → :3001)
    api/        Node.js + Fastify + TypeScript (port 3001)
  packages/
    shared/     Shared TypeScript types (CertProfile, TestCase, etc.)
  package.json
  pnpm-workspace.yaml
```

### Component overview

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, Vite 5, TypeScript | SPA with 6 dashboard pages |
| UI | Tailwind CSS 3, custom shadcn-style components | Dark-mode-first component library |
| Charts | Recharts 2 | Time-series, area, bar charts |
| Backend | Fastify 4, TypeScript | REST API, all data in-memory |
| Shared types | TypeScript package | Enums, interfaces shared between apps |
| Package manager | pnpm workspaces | Monorepo orchestration |

---

## Running locally

```bash
# Install all dependencies
pnpm install

# Start both API (port 3001) and web (port 5173) in parallel
pnpm dev

# Or start individually
pnpm dev:api    # only the Fastify API
pnpm dev:web    # only the Vite dev server
```

Navigate to http://localhost:5173 — the Vite dev server proxies all `/api/*` requests to the Fastify backend at `http://localhost:3001`.

---

## API Endpoints

All endpoints return JSON. Base path: `http://localhost:3001`

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Server heartbeat `{status:"ok"}` |
| GET | `/api/status` | Dashboard status + chart data |
| GET | `/api/certificates` | All 9 certificate profiles |
| GET | `/api/certificates/current` | Currently active certificate |
| POST | `/api/rotate` | Rotate active cert `{toProfile: CertProfile}` |
| GET | `/api/rotations` | Full rotation history |
| GET | `/api/test-cases` | All 23 test cases |
| POST | `/api/tests/run` | Run all (or filtered) tests `{filter?: "positive"|"negative"}` |
| POST | `/api/tests/:id/run` | Run a single test case |
| GET | `/api/logs` | Log entries (filterable) |
| GET | `/api/settings` | Current settings |
| PUT | `/api/settings` | Update settings |

### Log query parameters

`GET /api/logs?severity=error&component=gateway&errorCategory=TLS_CERT_EXPIRED&certProfile=expired&limit=50`

| Param | Values |
|---|---|
| `severity` | `error`, `warn`, `info`, `debug` |
| `component` | `gateway`, `app`, `service`, `minio` |
| `errorCategory` | Any `ErrorCategory` enum value |
| `certProfile` | Any `CertProfile` value |
| `limit` | Integer (default 200) |

---

## Certificate Profiles

| Profile | Status | Description |
|---|---|---|
| `valid` | VALID | Trusted, hostname matches, not expired |
| `expired` | EXPIRED | Past `notAfter` date by 500 days |
| `self-signed` | UNKNOWN_CA | Self-signed, not in trust store |
| `wrong-host` | HOSTNAME_MISMATCH | SAN does not include gateway hostname |
| `future` | NOT_YET_VALID | `notBefore` is 2027-06-01 |
| `broken-chain` | BROKEN_CHAIN | Intermediate CA is missing |
| `key-mismatch` | KEY_MISMATCH | Private key does not match cert public key |
| `mtls-client-valid` | VALID | Trusted mTLS client certificate |
| `mtls-client-invalid` | MTLS_FAILED | Untrusted mTLS client cert |

---

## How mock rotation works

`POST /api/rotate` with `{ toProfile }`:

1. Validates the target profile is a known `CertProfile`.
2. **Special case** — `key-mismatch`: always fails with `status: "failed"`. The active profile is **not** changed. The failed attempt is recorded in rotation history.
3. All other profiles succeed. `activeCertProfile` is updated in memory. A `RotationHistory` entry is prepended to the history array.
4. The response includes `{ success, rotation, activeCertProfile }`.

The Restore Valid Cert button on the Rotation page calls `POST /api/rotate` with `toProfile: "valid"`.

---

## How mock test execution works

`POST /api/tests/run` or `POST /api/tests/:id/run`:

The test execution logic in `apps/api/src/routes/tests.ts` evaluates each `TestCase` synchronously against the current `activeCertProfile`:

- **Positive tests** (`type: "positive"`) — pass only when `activeCertProfile` is `"valid"` or `"mtls-client-valid"`. Any other profile causes TLS-level failure and the test status becomes `FAIL`.
- **Negative tests** (`type: "negative"`) — pass when the expected TLS failure is observed. Concretely: if the active profile matches the test's `activeCertProfile` field, or if the active profile is any non-valid profile, the test passes (the chaos scenario is active). If the gateway is healthy (`valid`), the negative test fails because no error was observed.

Each run sets `status`, `actualResult`, `lastRunTime`, and `duration` on the test case object in memory.

---

## Environment variables

The API reads no environment variables in mock mode. These are placeholders for future Kubernetes/Prometheus integration:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Fastify listen port | `3001` |
| `PROMETHEUS_URL` | Prometheus query endpoint | configured via Settings page |
| `LOKI_URL` | Loki log query endpoint | configured via Settings page |
| `K8S_NAMESPACE` | Kubernetes namespace for cert-manager | configured via Settings page |

---

## Future integration plan

### Prometheus
Replace `generateChartData()` in `apps/api/src/mockData.ts` with real PromQL queries:
- `nginx_ingress_controller_ssl_expire_time_seconds` for cert expiry
- `nginx_ingress_controller_requests` filtered by status code for 4xx/5xx
- Custom TLS handshake error metrics from NGINX Ingress

### Loki
Replace mock log entries with Loki LogQL queries via the HTTP API (`/loki/api/v1/query_range`), using labels `{namespace="tls-chaos", component=~"gateway|app|service|minio"}`.

### Kubernetes API / cert-manager
- `GET /apis/cert-manager.io/v1/namespaces/{ns}/certificates` to list real certificates
- Watch `CertificateRequest` events to trigger rotation history updates
- Use cert-manager `Certificate.spec.secretName` to read active TLS secret and extract real X.509 fields

### NGINX Ingress
- Swap active certificate secret in Ingress TLS config via `kubectl patch`
- Monitor NGINX reload via `nginx_ingress_controller_config_hash` metric

### cert-manager automatic rotation simulation
- Implement a `CronJob`-style background task that calls `POST /api/rotate` on a configurable schedule to simulate cert-manager's automatic renewal cycle

---

## Dashboard pages

| Route | Page | Description |
|---|---|---|
| `/dashboard` | Dashboard | KPI cards + 4 Recharts charts |
| `/certificates` | Certificates | All 9 cert profiles, active highlighted |
| `/test-cases` | Test Cases | Tabbed table, per-row and bulk run buttons |
| `/rotation` | Rotation | Profile selector, confirmation dialog, history table |
| `/logs` | Logs | Filterable log viewer with auto-scroll |
| `/settings` | Settings | Editable form with save toast |
