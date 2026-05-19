import { FastifyInstance } from 'fastify';
import { settings, updateSettings } from '../mockData.js';

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/api/settings', async (_req, reply) => {
    return reply.send(settings);
  });

  app.put('/api/settings', async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ error: 'Invalid settings body' });
    }
    updateSettings(body as any);
    return reply.send(settings);
  });
}
