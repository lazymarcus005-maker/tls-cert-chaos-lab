เอา prompt นี้ไปใช้ vibe code ได้เลย:

```text
Build a full-stack internal dashboard for a project called “TLS Gateway Chaos Lab”.

Context:
This lab simulates TLS/SSL certificate failure scenarios across:

App / Client
→ Internet / Gateway / Ingress
→ Kubernetes Microservices
→ MinIO or S3-compatible storage

The dashboard should help DevOps, QA, Security, and developers visualize certificate status, run test cases, rotate certificate profiles, and inspect TLS-related errors.

Tech stack:
- Frontend: React + Vite + TypeScript
- UI: Tailwind CSS + shadcn/ui
- Charts: Recharts
- Backend: Node.js + Fastify + TypeScript
- Runtime data source: mock data first
- Design it so Prometheus, Loki, and Kubernetes API can be plugged in later
- No real Kubernetes mutation required in the first version; simulate rotate/run actions with mock state

Main pages:

1. /dashboard
Show summary cards:
- Active certificate profile
- Certificate status
- Days until expiry
- Latest rotation status
- Latest test run result
- Gateway health
- TLS error count
- Upstream 502/503 count

Show charts:
- TLS handshake errors over time
- Gateway 4xx/5xx over time
- Test pass/fail trend
- Certificate expiry timeline

2. /certificates
Show certificate profiles:
- valid
- expired
- self-signed
- wrong-host
- future
- broken-chain
- key-mismatch
- mtls-client-valid
- mtls-client-invalid

Each profile should show:
- Status
- Subject
- Issuer
- SAN
- Serial number
- Not before
- Not after
- Days until expiry
- Is trusted
- Chain valid
- Hostname valid
- Key matches cert

3. /test-cases
Show positive and negative TLS test matrix.

Positive test cases:
- POS-001 Valid gateway TLS
- POS-002 Trusted custom CA
- POS-003 Valid certificate rotation
- POS-004 Gateway to service over HTTP
- POS-005 Gateway to service over HTTPS
- POS-006 Valid mTLS
- POS-007 Service to MinIO HTTPS valid
- POS-008 Certificate nearing expiry alert

Negative test cases:
- NEG-001 Expired gateway cert
- NEG-002 Self-signed untrusted cert
- NEG-003 Wrong hostname
- NEG-004 Not-yet-valid cert
- NEG-005 Broken chain
- NEG-006 Key/cert mismatch
- NEG-007 Unsupported TLS version
- NEG-008 Weak cipher rejected
- NEG-009 Invalid upstream service cert
- NEG-010 Expired upstream service cert
- NEG-011 Invalid mTLS client cert
- NEG-012 Missing mTLS client cert
- NEG-013 Service to MinIO invalid cert
- NEG-014 Rotation valid to invalid
- NEG-015 CA bundle removed from app

Each test case should show:
- ID
- Name
- Type: positive or negative
- Path: client-gateway, gateway-service, service-minio, mtls, rotation
- Active cert profile used
- Expected result
- Actual result
- Status: pass, fail, not-run, running
- Last run time
- Duration
- Error category

Add buttons:
- Run all tests
- Run positive tests
- Run negative tests
- Run single test
These can update mock state.

4. /rotation
Allow selecting a certificate profile and clicking “Rotate Certificate”.
Show:
- Current active profile
- Target profile
- Rotation status
- Rotation history table
- Recovery action button: “Restore valid cert”

Rotation history fields:
- Timestamp
- From profile
- To profile
- Status
- Triggered by
- Message

5. /logs
Show mock gateway/app logs.
Filters:
- severity
- component: gateway, app, service, minio
- error category
- test case ID
- cert profile

Log examples should include:
- certificate has expired
- self-signed certificate
- hostname mismatch
- unable to get local issuer certificate
- client certificate required
- upstream TLS handshake failed
- cert and private key mismatch

6. /settings
Show editable mock settings:
- environment name
- Kubernetes namespace
- gateway hostname
- gateway port
- CA bundle path
- Prometheus URL
- Loki URL
- enable mTLS
- expiry alert threshold days

Backend API design:
Implement mock APIs:

GET /api/status
GET /api/certificates
GET /api/certificates/current
POST /api/rotate
GET /api/rotations
GET /api/test-cases
POST /api/tests/run
POST /api/tests/:id/run
GET /api/logs
GET /api/settings
PUT /api/settings

Data model examples:

CertificateStatus enum:
VALID
EXPIRING_SOON
EXPIRED
NOT_YET_VALID
UNKNOWN_CA
HOSTNAME_MISMATCH
BROKEN_CHAIN
KEY_MISMATCH
MTLS_FAILED
UPSTREAM_TLS_FAILED

TestStatus enum:
pass
fail
not-run
running

ErrorCategory enum:
TLS_CERT_EXPIRED
TLS_UNKNOWN_CA
TLS_HOSTNAME_MISMATCH
TLS_CHAIN_INVALID
TLS_CERT_NOT_YET_VALID
TLS_CLIENT_CERT_MISSING
TLS_CLIENT_CERT_INVALID
UPSTREAM_TLS_HANDSHAKE_FAILED
TLS_KEY_CERT_MISMATCH
TLS_VERSION_UNSUPPORTED
TLS_CIPHER_MISMATCH

UI requirements:
- Clean dark-mode-first dashboard
- Use responsive layout
- Use cards, badges, tables, tabs, dialogs, dropdowns
- Use shadcn/ui components
- Use icons from lucide-react
- Use Recharts for charts
- Use clear color semantics:
  - green for valid/pass/healthy
  - yellow for warning/expiring
  - red for invalid/fail/error
  - blue for running/info
- Do not expose destructive actions without confirmation dialog
- Show toast notifications when running tests or rotating certs
- Include loading states and empty states

Important behavior:
- Mock rotation should update active certificate profile.
- Rotating to valid should set cert status to VALID.
- Rotating to expired should set cert status to EXPIRED.
- Rotating to wrong-host should set cert status to HOSTNAME_MISMATCH.
- Rotating to self-signed should set cert status to UNKNOWN_CA.
- Rotating to future should set cert status to NOT_YET_VALID.
- Rotating to broken-chain should set cert status to BROKEN_CHAIN.
- Rotating to key-mismatch should set rotation status failed and keep previous active profile.
- Running tests should simulate realistic pass/fail results based on active cert profile.
- Negative test should pass when the expected TLS failure is observed.
- Positive test should pass only when the active cert profile is valid.
- Add fake time-series data for charts.

Architecture requirements:
- Use a monorepo structure:

tls-gateway-chaos-dashboard/
  apps/
    web/
    api/
  packages/
    shared/
  README.md
  package.json
  pnpm-workspace.yaml

- Put shared TypeScript types in packages/shared.
- Frontend should call backend APIs, not import backend mock data directly.
- Backend should keep mock state in memory for now.
- Include clear README with setup instructions.

README should include:
- Project overview
- Architecture
- How to run locally
- API endpoints
- Environment variables
- How mock rotation works
- How mock test execution works
- Future integration plan:
  - Prometheus
  - Loki
  - Kubernetes API
  - cert-manager
  - NGINX Ingress metrics

Deliverables:
- Complete source code
- README.md
- Mock data
- Working local dev command
- Type-safe API models
- Usable dashboard UI
```


```text
Start by generating the complete project structure and minimal working version first. Prioritize a working dashboard over perfect implementation. Use mock data and make all pages navigable.
```
