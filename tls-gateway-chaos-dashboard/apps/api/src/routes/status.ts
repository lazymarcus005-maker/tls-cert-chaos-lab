import { FastifyInstance } from 'fastify';
import { CertificateStatus } from '@tls-chaos/shared';
import {
  activeCertProfile,
  certificates,
  rotationHistory,
  testCases,
  generateChartData,
} from '../mockData.js';

export async function statusRoutes(app: FastifyInstance) {
  app.get('/api/status', async (_req, reply) => {
    const cert = certificates.find((c) => c.profile === activeCertProfile);
    const latestRotation = rotationHistory[0];
    const latestTest = testCases
      .filter((t) => t.lastRunTime !== null)
      .sort((a, b) =>
        (b.lastRunTime ?? '') > (a.lastRunTime ?? '') ? 1 : -1,
      )[0];

    const certStatus = cert?.status ?? CertificateStatus.UNKNOWN_CA;
    const daysUntilExpiry = cert?.daysUntilExpiry ?? 0;

    const tlsErrorLogs = [
      'EXPIRED', 'UNKNOWN_CA', 'HOSTNAME_MISMATCH', 'BROKEN_CHAIN',
      'KEY_MISMATCH', 'MTLS_FAILED', 'UPSTREAM_TLS_FAILED',
    ];
    const isBad = tlsErrorLogs.includes(certStatus);

    const status = {
      activeCertProfile,
      certStatus,
      daysUntilExpiry,
      latestRotationStatus: latestRotation
        ? `${latestRotation.status} (${latestRotation.toProfile})`
        : 'No rotations yet',
      latestTestRunResult: latestTest
        ? `${latestTest.status} - ${latestTest.name}`
        : 'No tests run yet',
      gatewayHealth: isBad
        ? (certStatus === CertificateStatus.EXPIRED || certStatus === CertificateStatus.KEY_MISMATCH
          ? 'down'
          : 'degraded')
        : 'healthy',
      tlsErrorCount: isBad ? 12 : 0,
      upstream502503Count: isBad ? 5 : 0,
    };

    const chartData = generateChartData();

    return reply.send({ status, chartData });
  });
}
