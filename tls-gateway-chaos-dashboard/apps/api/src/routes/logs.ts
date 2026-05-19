import { FastifyInstance } from 'fastify';
import { logEntries } from '../mockData.js';

export async function logRoutes(app: FastifyInstance) {
  app.get('/api/logs', async (req, reply) => {
    const query = req.query as {
      severity?: string;
      component?: string;
      errorCategory?: string;
      testCaseId?: string;
      certProfile?: string;
      limit?: string;
    };

    let results = [...logEntries];

    if (query.severity) {
      results = results.filter((l) => l.severity === query.severity);
    }
    if (query.component) {
      results = results.filter((l) => l.component === query.component);
    }
    if (query.errorCategory) {
      results = results.filter((l) => l.errorCategory === query.errorCategory);
    }
    if (query.testCaseId) {
      results = results.filter((l) => l.testCaseId === query.testCaseId);
    }
    if (query.certProfile) {
      results = results.filter((l) => l.certProfile === query.certProfile);
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 200;
    results = results.slice(0, limit);

    return reply.send(results);
  });
}
