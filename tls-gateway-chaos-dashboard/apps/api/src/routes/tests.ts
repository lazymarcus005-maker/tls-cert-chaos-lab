import { FastifyInstance } from 'fastify';
import { TestStatus } from '@tls-chaos/shared';
import { testCases, activeCertProfile } from '../mockData.js';

function runTest(id: string): void {
  const tc = testCases.find((t) => t.id === id);
  if (!tc) return;

  tc.status = TestStatus.RUNNING;
  tc.lastRunTime = new Date().toISOString();

  // Resolve immediately (synchronous mock)
  const profile = activeCertProfile;

  if (tc.type === 'positive') {
    // Positive tests pass only on valid or mtls-client-valid
    if (profile === 'valid' || profile === 'mtls-client-valid') {
      tc.status = TestStatus.PASS;
      tc.actualResult = `PASS: ${tc.expectedResult}`;
      tc.duration = Math.floor(Math.random() * 300) + 100;
    } else {
      tc.status = TestStatus.FAIL;
      tc.actualResult = `FAIL: TLS error on profile '${profile}' prevented successful connection`;
      tc.duration = Math.floor(Math.random() * 200) + 50;
    }
  } else {
    // Negative tests: pass when expected failure is observed
    const profileMatchesExpected = tc.activeCertProfile === profile;
    const notOnValid = profile !== 'valid' && profile !== 'mtls-client-valid';

    if (profileMatchesExpected || notOnValid) {
      tc.status = TestStatus.PASS;
      tc.actualResult = `PASS (expected failure observed): ${tc.expectedResult}`;
      tc.duration = Math.floor(Math.random() * 200) + 80;
    } else {
      tc.status = TestStatus.FAIL;
      tc.actualResult = `FAIL: Expected TLS error for profile '${tc.activeCertProfile}' but got success on profile '${profile}'`;
      tc.duration = Math.floor(Math.random() * 150) + 50;
    }
  }
}

export async function testRoutes(app: FastifyInstance) {
  app.get('/api/test-cases', async (_req, reply) => {
    return reply.send(testCases);
  });

  app.post('/api/tests/run', async (req, reply) => {
    const body = req.body as { filter?: 'positive' | 'negative' } | undefined;
    const filter = body?.filter;

    const targets = filter
      ? testCases.filter((t) => t.type === filter)
      : testCases;

    for (const t of targets) {
      runTest(t.id);
    }

    return reply.send({ ran: targets.length, testCases });
  });

  app.post<{ Params: { id: string } }>('/api/tests/:id/run', async (req, reply) => {
    const { id } = req.params;
    const tc = testCases.find((t) => t.id === id);
    if (!tc) {
      return reply.status(404).send({ error: `Test case ${id} not found` });
    }
    runTest(id);
    return reply.send(tc);
  });
}
