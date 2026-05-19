import React, { useEffect, useState } from 'react';
import { fetchTestCases, runAllTests, runTestCase } from '../api/client';
import { TestCase, TestStatus } from '@tls-chaos/shared';
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Button, Spinner, Tabs,
  Table, Thead, Tbody, Th, Td, Tr,
} from '../components/ui/index';
import { TestStatusBadge } from '../components/ui/statusHelpers';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/index';

type TabValue = 'all' | 'positive' | 'negative';

export function TestCases() {
  const [tests, setTests] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const { toasts, toast } = useToast();

  const load = async () => {
    try {
      const data = await fetchTestCases();
      setTests(data);
    } catch (e: any) {
      toast(`Failed to load tests: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRunAll = async (filter?: 'positive' | 'negative') => {
    setRunningAll(true);
    try {
      const res = await runAllTests(filter);
      setTests(res.testCases);
      const passed = res.testCases.filter((t) => t.status === TestStatus.PASS).length;
      const failed = res.testCases.filter((t) => t.status === TestStatus.FAIL).length;
      toast(`Ran ${res.ran} tests: ${passed} passed, ${failed} failed`, failed === 0 ? 'success' : 'warn');
    } catch (e: any) {
      toast(`Run failed: ${e.message}`, 'error');
    } finally {
      setRunningAll(false);
    }
  };

  const handleRunOne = async (id: string) => {
    setRunningId(id);
    try {
      const updated = await runTestCase(id);
      setTests((prev) => prev.map((t) => (t.id === id ? updated : t)));
      toast(`${updated.name}: ${updated.status.toUpperCase()}`, updated.status === TestStatus.PASS ? 'success' : 'error');
    } catch (e: any) {
      toast(`Failed: ${e.message}`, 'error');
    } finally {
      setRunningId(null);
    }
  };

  const filtered = tests.filter((t) =>
    activeTab === 'all' ? true : t.type === activeTab,
  );

  const positiveCount = tests.filter((t) => t.type === 'positive').length;
  const negativeCount = tests.filter((t) => t.type === 'negative').length;
  const passCount = filtered.filter((t) => t.status === TestStatus.PASS).length;
  const failCount = filtered.filter((t) => t.status === TestStatus.FAIL).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Test Cases</h1>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleRunAll('positive')}
            disabled={runningAll}
          >
            {runningAll ? <Spinner className="h-3 w-3" /> : null}
            Run Positive
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleRunAll('negative')}
            disabled={runningAll}
          >
            Run Negative
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleRunAll()}
            disabled={runningAll}
          >
            {runningAll ? <Spinner className="h-3 w-3" /> : null}
            Run All
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-4 flex-wrap text-sm">
        <span className="text-gray-400">Total: <span className="text-white font-semibold">{filtered.length}</span></span>
        <span className="text-green-400">Pass: <span className="font-semibold">{passCount}</span></span>
        <span className="text-red-400">Fail: <span className="font-semibold">{failCount}</span></span>
        <span className="text-gray-500">Not Run: <span className="font-semibold">{filtered.filter((t) => t.status === TestStatus.NOT_RUN).length}</span></span>
      </div>

      <Tabs
        active={activeTab}
        onChange={(v) => setActiveTab(v as TabValue)}
        tabs={[
          { label: 'All', value: 'all', count: tests.length },
          { label: 'Positive', value: 'positive', count: positiveCount },
          { label: 'Negative', value: 'negative', count: negativeCount },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Path</Th>
              <Th>Profile</Th>
              <Th>Status</Th>
              <Th>Duration</Th>
              <Th>Last Run</Th>
              <Th>Action</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map((tc) => (
              <Tr key={tc.id}>
                <Td className="max-w-xs">
                  <div>
                    <p className="font-medium text-gray-200 text-xs">{tc.name}</p>
                    {tc.errorCategory && (
                      <p className="text-xs text-red-400 mt-0.5">{tc.errorCategory}</p>
                    )}
                  </div>
                </Td>
                <Td>
                  <Badge variant={tc.type === 'positive' ? 'green' : 'orange'}>
                    {tc.type}
                  </Badge>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-gray-400">{tc.path}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-gray-400">{tc.activeCertProfile}</span>
                </Td>
                <Td>
                  <div className="space-y-1">
                    <TestStatusBadge status={tc.status} />
                    {tc.actualResult && tc.status !== TestStatus.NOT_RUN && (
                      <p className="text-xs text-gray-500 max-w-xs truncate" title={tc.actualResult}>
                        {tc.actualResult}
                      </p>
                    )}
                  </div>
                </Td>
                <Td>
                  {tc.duration !== null ? (
                    <span className="text-xs text-gray-400">{tc.duration}ms</span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </Td>
                <Td>
                  {tc.lastRunTime ? (
                    <span className="text-xs text-gray-500">
                      {new Date(tc.lastRunTime).toLocaleTimeString()}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">Never</span>
                  )}
                </Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRunOne(tc.id)}
                    disabled={runningId === tc.id || runningAll}
                  >
                    {runningId === tc.id ? <Spinner className="h-3 w-3" /> : 'Run'}
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
