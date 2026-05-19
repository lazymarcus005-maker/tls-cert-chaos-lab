import React, { useEffect, useRef, useState } from 'react';
import { fetchLogs, LogFilters } from '../api/client';
import { LogEntry } from '@tls-chaos/shared';
import {
  Card, CardHeader, CardTitle, CardContent,
  Select, Badge, Button, Spinner,
} from '../components/ui/index';
import { SeverityBadge } from '../components/ui/statusHelpers';
import { cn } from '../components/ui/index';

const SEVERITIES = ['', 'error', 'warn', 'info', 'debug'];
const COMPONENTS = ['', 'gateway', 'app', 'service', 'minio'];
const ERROR_CATEGORIES = [
  '',
  'TLS_CERT_EXPIRED',
  'TLS_UNKNOWN_CA',
  'TLS_HOSTNAME_MISMATCH',
  'TLS_CHAIN_INVALID',
  'TLS_CERT_NOT_YET_VALID',
  'TLS_CLIENT_CERT_MISSING',
  'TLS_CLIENT_CERT_INVALID',
  'UPSTREAM_TLS_HANDSHAKE_FAILED',
  'TLS_KEY_CERT_MISMATCH',
  'TLS_VERSION_UNSUPPORTED',
  'TLS_CIPHER_MISMATCH',
];
const CERT_PROFILES = [
  '', 'valid', 'expired', 'self-signed', 'wrong-host', 'future',
  'broken-chain', 'key-mismatch', 'mtls-client-valid', 'mtls-client-invalid',
];

const componentColor: Record<string, string> = {
  gateway: 'text-blue-400',
  app: 'text-purple-400',
  service: 'text-cyan-400',
  minio: 'text-yellow-400',
};

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filters, setFilters] = useState<LogFilters>({
    severity: '',
    component: '',
    errorCategory: '',
    certProfile: '',
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const clean: LogFilters = {};
      if (filters.severity) clean.severity = filters.severity;
      if (filters.component) clean.component = filters.component;
      if (filters.errorCategory) clean.errorCategory = filters.errorCategory;
      if (filters.certProfile) clean.certProfile = filters.certProfile;
      const data = await fetchLogs(clean);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleFilter = (key: keyof LogFilters, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const clearFilters = () => {
    setFilters({ severity: '', component: '', errorCategory: '', certProfile: '' });
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Logs</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{logs.length} entries</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAutoScroll((v) => !v)}
          >
            {autoScroll ? 'Auto-scroll: On' : 'Auto-scroll: Off'}
          </Button>
          <Button variant="secondary" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Severity</label>
              <Select
                value={filters.severity ?? ''}
                onChange={(v) => handleFilter('severity', v)}
                className="w-28"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s || 'All'}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Component</label>
              <Select
                value={filters.component ?? ''}
                onChange={(v) => handleFilter('component', v)}
                className="w-28"
              >
                {COMPONENTS.map((c) => (
                  <option key={c} value={c}>{c || 'All'}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Error Category</label>
              <Select
                value={filters.errorCategory ?? ''}
                onChange={(v) => handleFilter('errorCategory', v)}
                className="w-56"
              >
                {ERROR_CATEGORIES.map((e) => (
                  <option key={e} value={e}>{e || 'All'}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Cert Profile</label>
              <Select
                value={filters.certProfile ?? ''}
                onChange={(v) => handleFilter('certProfile', v)}
                className="w-36"
              >
                {CERT_PROFILES.map((p) => (
                  <option key={p} value={p}>{p || 'All'}</option>
                ))}
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-320px)] font-mono text-xs">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-6 w-6" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No log entries match the current filters</div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-800/90 backdrop-blur-sm text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left w-40">Timestamp</th>
                    <th className="px-3 py-2 text-left w-16">Severity</th>
                    <th className="px-3 py-2 text-left w-20">Component</th>
                    <th className="px-3 py-2 text-left">Message</th>
                    <th className="px-3 py-2 text-left w-40">Error Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={cn(
                        'hover:bg-gray-800/30',
                        log.severity === 'error' ? 'bg-red-950/20' :
                        log.severity === 'warn' ? 'bg-yellow-950/10' : '',
                      )}
                    >
                      <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()} {new Date(log.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-1.5">
                        <SeverityBadge severity={log.severity} />
                      </td>
                      <td className={cn('px-3 py-1.5 font-semibold', componentColor[log.component] ?? 'text-gray-400')}>
                        {log.component}
                      </td>
                      <td className={cn(
                        'px-3 py-1.5 break-all',
                        log.severity === 'error' ? 'text-red-300' :
                        log.severity === 'warn' ? 'text-yellow-300' :
                        log.severity === 'debug' ? 'text-gray-500' : 'text-gray-300',
                      )}>
                        {log.message}
                        {log.testCaseId && (
                          <span className="ml-2 text-gray-600">[{log.testCaseId}]</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {log.errorCategory ? (
                          <span className="text-red-400 text-xs">{log.errorCategory}</span>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div ref={bottomRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
