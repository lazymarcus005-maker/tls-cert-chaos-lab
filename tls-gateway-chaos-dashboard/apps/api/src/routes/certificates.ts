import { FastifyInstance } from 'fastify';
import { activeCertProfile, certificates } from '../mockData.js';

export async function certificateRoutes(app: FastifyInstance) {
  app.get('/api/certificates', async (_req, reply) => {
    return reply.send(certificates);
  });

  app.get('/api/certificates/current', async (_req, reply) => {
    const cert = certificates.find((c) => c.profile === activeCertProfile);
    if (!cert) {
      return reply.status(404).send({ error: 'Current certificate not found' });
    }
    return reply.send(cert);
  });
}
