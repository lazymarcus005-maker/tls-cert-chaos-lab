import React from 'react';
import { CertificateStatus, TestStatus, CertProfile } from '@tls-chaos/shared';
import { Badge } from './index';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange';

export function certStatusVariant(status: CertificateStatus): BadgeVariant {
  switch (status) {
    case CertificateStatus.VALID:
      return 'green';
    case CertificateStatus.EXPIRING_SOON:
      return 'yellow';
    case CertificateStatus.EXPIRED:
      return 'red';
    case CertificateStatus.NOT_YET_VALID:
      return 'orange';
    case CertificateStatus.UNKNOWN_CA:
      return 'yellow';
    case CertificateStatus.HOSTNAME_MISMATCH:
      return 'orange';
    case CertificateStatus.BROKEN_CHAIN:
      return 'red';
    case CertificateStatus.KEY_MISMATCH:
      return 'red';
    case CertificateStatus.MTLS_FAILED:
      return 'purple';
    case CertificateStatus.UPSTREAM_TLS_FAILED:
      return 'red';
    default:
      return 'gray';
  }
}

export function testStatusVariant(status: TestStatus): BadgeVariant {
  switch (status) {
    case TestStatus.PASS:
      return 'green';
    case TestStatus.FAIL:
      return 'red';
    case TestStatus.RUNNING:
      return 'blue';
    case TestStatus.NOT_RUN:
      return 'gray';
    default:
      return 'gray';
  }
}

export function healthVariant(health: 'healthy' | 'degraded' | 'down'): BadgeVariant {
  switch (health) {
    case 'healthy':
      return 'green';
    case 'degraded':
      return 'yellow';
    case 'down':
      return 'red';
    default:
      return 'gray';
  }
}

export function severityVariant(severity: string): BadgeVariant {
  switch (severity) {
    case 'error':
      return 'red';
    case 'warn':
      return 'yellow';
    case 'info':
      return 'blue';
    case 'debug':
      return 'gray';
    default:
      return 'gray';
  }
}

export function profileLabel(profile: CertProfile): string {
  const map: Record<CertProfile, string> = {
    'valid': 'Valid',
    'expired': 'Expired',
    'self-signed': 'Self-Signed',
    'wrong-host': 'Wrong Host',
    'future': 'Future (Not Yet Valid)',
    'broken-chain': 'Broken Chain',
    'key-mismatch': 'Key Mismatch',
    'mtls-client-valid': 'mTLS Client (Valid)',
    'mtls-client-invalid': 'mTLS Client (Invalid)',
  };
  return map[profile] ?? profile;
}

export function CertStatusBadge({ status }: { status: CertificateStatus }) {
  return <Badge variant={certStatusVariant(status)}>{status.replace(/_/g, ' ')}</Badge>;
}

export function TestStatusBadge({ status }: { status: TestStatus }) {
  return <Badge variant={testStatusVariant(status)}>{status.toUpperCase()}</Badge>;
}

export function HealthBadge({ health }: { health: 'healthy' | 'degraded' | 'down' }) {
  return <Badge variant={healthVariant(health)}>{health.toUpperCase()}</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge variant={severityVariant(severity)}>{severity.toUpperCase()}</Badge>;
}

export function ProfileBadge({ profile }: { profile: CertProfile }) {
  const isGood = profile === 'valid' || profile === 'mtls-client-valid';
  return <Badge variant={isGood ? 'green' : 'orange'}>{profileLabel(profile)}</Badge>;
}
