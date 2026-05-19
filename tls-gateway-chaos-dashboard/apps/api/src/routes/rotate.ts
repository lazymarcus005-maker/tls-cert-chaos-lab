import { FastifyInstance } from 'fastify';
import { CertProfile } from '@tls-chaos/shared';
import {
  activeCertProfile,
  setActiveCertProfile,
  rotationHistory,
  certificates,
} from '../mockData.js';

const validProfiles: CertProfile[] = [
  'valid', 'expired', 'self-signed', 'wrong-host', 'future',
  'broken-chain', 'key-mismatch', 'mtls-client-valid', 'mtls-client-invalid',
];

export async function rotateRoutes(app: FastifyInstance) {
  app.post<{ Body: { toProfile: string } }>('/api/rotate', async (req, reply) => {
    const { toProfile } = req.body ?? {};

    if (!toProfile || !validProfiles.includes(toProfile as CertProfile)) {
      return reply.status(400).send({ error: `Invalid profile: ${toProfile}` });
    }

    const target = toProfile as CertProfile;
    const prev = activeCertProfile;

    if (target === 'key-mismatch') {
      // key-mismatch rotation always fails
      const entry = {
        id: `rot-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromProfile: prev,
        toProfile: target,
        status: 'failed' as const,
        triggeredBy: 'api-user',
        message: 'Rotation rejected: private key does not match certificate public key',
      };
      rotationHistory.unshift(entry);
      return reply.send({ success: false, rotation: entry, activeCertProfile: prev });
    }

    setActiveCertProfile(target);

    const cert = certificates.find((c) => c.profile === target);
    const entry = {
      id: `rot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromProfile: prev,
      toProfile: target,
      status: 'success' as const,
      triggeredBy: 'api-user',
      message: `Certificate rotated to profile '${target}': ${cert?.subject ?? 'unknown'}`,
    };
    rotationHistory.unshift(entry);

    return reply.send({ success: true, rotation: entry, activeCertProfile: target });
  });

  app.get('/api/rotations', async (_req, reply) => {
    return reply.send(rotationHistory);
  });
}
