import Fastify from 'fastify';
import cors from '@fastify/cors';
import { statusRoutes } from './routes/status.js';
import { certificateRoutes } from './routes/certificates.js';
import { rotateRoutes } from './routes/rotate.js';
import { testRoutes } from './routes/tests.js';
import { logRoutes } from './routes/logs.js';
import { settingsRoutes } from './routes/settings.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: '*' });

await app.register(statusRoutes);
await app.register(certificateRoutes);
await app.register(rotateRoutes);
await app.register(testRoutes);
await app.register(logRoutes);
await app.register(settingsRoutes);

app.get('/api/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

try {
  await app.listen({ port: 3001, host: '0.0.0.0' });
  console.log('TLS Chaos API running on http://localhost:3001');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
