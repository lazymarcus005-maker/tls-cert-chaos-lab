// CertificateStatus enum
export enum CertificateStatus {
  VALID = 'VALID',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  NOT_YET_VALID = 'NOT_YET_VALID',
  UNKNOWN_CA = 'UNKNOWN_CA',
  HOSTNAME_MISMATCH = 'HOSTNAME_MISMATCH',
  BROKEN_CHAIN = 'BROKEN_CHAIN',
  KEY_MISMATCH = 'KEY_MISMATCH',
  MTLS_FAILED = 'MTLS_FAILED',
  UPSTREAM_TLS_FAILED = 'UPSTREAM_TLS_FAILED',
}

export enum TestStatus {
  PASS = 'pass',
  FAIL = 'fail',
  NOT_RUN = 'not-run',
  RUNNING = 'running',
}

export enum ErrorCategory {
  TLS_CERT_EXPIRED = 'TLS_CERT_EXPIRED',
  TLS_UNKNOWN_CA = 'TLS_UNKNOWN_CA',
  TLS_HOSTNAME_MISMATCH = 'TLS_HOSTNAME_MISMATCH',
  TLS_CHAIN_INVALID = 'TLS_CHAIN_INVALID',
  TLS_CERT_NOT_YET_VALID = 'TLS_CERT_NOT_YET_VALID',
  TLS_CLIENT_CERT_MISSING = 'TLS_CLIENT_CERT_MISSING',
  TLS_CLIENT_CERT_INVALID = 'TLS_CLIENT_CERT_INVALID',
  UPSTREAM_TLS_HANDSHAKE_FAILED = 'UPSTREAM_TLS_HANDSHAKE_FAILED',
  TLS_KEY_CERT_MISMATCH = 'TLS_KEY_CERT_MISMATCH',
  TLS_VERSION_UNSUPPORTED = 'TLS_VERSION_UNSUPPORTED',
  TLS_CIPHER_MISMATCH = 'TLS_CIPHER_MISMATCH',
}

export type CertProfile =
  | 'valid'
  | 'expired'
  | 'self-signed'
  | 'wrong-host'
  | 'future'
  | 'broken-chain'
  | 'key-mismatch'
  | 'mtls-client-valid'
  | 'mtls-client-invalid';

export interface Certificate {
  profile: CertProfile;
  status: CertificateStatus;
  subject: string;
  issuer: string;
  san: string[];
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  daysUntilExpiry: number;
  isTrusted: boolean;
  chainValid: boolean;
  hostnameValid: boolean;
  keyMatchesCert: boolean;
}

export interface TestCase {
  id: string;
  name: string;
  type: 'positive' | 'negative';
  path: 'client-gateway' | 'gateway-service' | 'service-minio' | 'mtls' | 'rotation';
  activeCertProfile: CertProfile;
  expectedResult: string;
  actualResult: string;
  status: TestStatus;
  lastRunTime: string | null;
  duration: number | null;
  errorCategory: ErrorCategory | null;
}

export interface RotationHistory {
  id: string;
  timestamp: string;
  fromProfile: CertProfile;
  toProfile: CertProfile;
  status: 'success' | 'failed';
  triggeredBy: string;
  message: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  severity: 'info' | 'warn' | 'error' | 'debug';
  component: 'gateway' | 'app' | 'service' | 'minio';
  message: string;
  errorCategory: ErrorCategory | null;
  testCaseId: string | null;
  certProfile: CertProfile | null;
}

export interface Settings {
  environmentName: string;
  kubernetesNamespace: string;
  gatewayHostname: string;
  gatewayPort: number;
  caBundlePath: string;
  prometheusUrl: string;
  lokiUrl: string;
  enableMtls: boolean;
  expiryAlertThresholdDays: number;
}

export interface DashboardStatus {
  activeCertProfile: CertProfile;
  certStatus: CertificateStatus;
  daysUntilExpiry: number;
  latestRotationStatus: string;
  latestTestRunResult: string;
  gatewayHealth: 'healthy' | 'degraded' | 'down';
  tlsErrorCount: number;
  upstream502503Count: number;
}

export interface TimeSeriesPoint {
  time: string;
  value: number;
}

export interface ChartData {
  tlsHandshakeErrors: TimeSeriesPoint[];
  gateway4xx5xx: TimeSeriesPoint[];
  testPassFail: { time: string; pass: number; fail: number }[];
  certExpiryTimeline: { profile: CertProfile; daysUntilExpiry: number }[];
}
