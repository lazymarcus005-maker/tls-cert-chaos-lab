ได้ ผมเพิ่ม section **Dashboard** เข้า README แล้ว

แนะนำทำเป็น 2 ระดับ:

## MVP ง่ายสุด

ใช้:

```text
Prometheus + Grafana + x509-certificate-exporter + NGINX Ingress metrics
```

ดูได้ทันทีว่า:

```text
Active cert profile: valid / expired / wrong-host / broken-chain
Cert status: VALID / EXPIRED / UNKNOWN_CA / HOSTNAME_MISMATCH
Days until expiry
Latest rotation status
Test pass/fail
Gateway 502/503
TLS handshake error
mTLS rejection
```

## ถ้าอยากมีหน้า control center เอง

ทำเป็น web dashboard:

```text
React + Vite + Tailwind + shadcn/ui
Backend: Go/Fiber หรือ Node/Fastify
Data: Prometheus API + Loki API + Kubernetes API
```

หน้า UI ที่ควรมี:

```text
/dashboard      ภาพรวม cert/test/gateway health
/certificates   ดู cert profile, issuer, SAN, expiry, serial
/test-cases     positive/negative test matrix
/rotation       กด rotate cert profile
/logs           TLS/gateway/app error logs
/settings       namespace, host, CA path
```

API คร่าว ๆ:

```text
GET  /api/status
GET  /api/cert/current
GET  /api/tests/latest
GET  /api/rotations
POST /api/rotate/:profile
POST /api/tests/run
```

ผมแนะนำเริ่มจาก **Grafana dashboard ก่อน** เพราะเร็วและ practical กว่า แล้วค่อยทำ custom UI สำหรับกด rotate/run test ทีหลัง.
