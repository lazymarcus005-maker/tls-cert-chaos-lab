import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchStatus, StatusResponse } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '../components/ui/index';
import {
  CertStatusBadge, HealthBadge, ProfileBadge,
} from '../components/ui/statusHelpers';
import { CertificateStatus } from '@tls-chaos/shared';

function StatCard({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}) {
  const accentBorder: Record<string, string> = {
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-500',
    red: 'border-l-red-500',
    blue: 'border-l-blue-500',
    gray: 'border-l-gray-600',
  };
  return (
    <Card className={`border-l-4 ${accentBorder[accent ?? 'gray']}`}>
      <CardContent className="py-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{title}</p>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:00`;
}

const chartTooltipStyle = {
  backgroundColor: '#111827',
  borderColor: '#374151',
  color: '#e5e7eb',
};

export function Dashboard() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchStatus()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-red-400">Error loading dashboard: {error}</div>
    );
  }

  const { status, chartData } = data;

  const expiryAccent =
    status.daysUntilExpiry < 0
      ? 'red'
      : status.daysUntilExpiry < 30
      ? 'yellow'
      : 'green';

  const tlsErrors = chartData.tlsHandshakeErrors.map((p) => ({
    ...p,
    time: formatTime(p.time),
  }));
  const gw45xx = chartData.gateway4xx5xx.map((p) => ({
    ...p,
    time: formatTime(p.time),
  }));
  const testPF = chartData.testPassFail.map((p) => ({
    ...p,
    time: formatTime(p.time),
  }));
  const certExpiry = chartData.certExpiryTimeline
    .slice()
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <span className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Cert Profile"
          value={<ProfileBadge profile={status.activeCertProfile} />}
          accent="blue"
        />
        <StatCard
          title="Certificate Status"
          value={<CertStatusBadge status={status.certStatus} />}
          accent={
            status.certStatus === CertificateStatus.VALID
              ? 'green'
              : status.certStatus === CertificateStatus.EXPIRING_SOON
              ? 'yellow'
              : 'red'
          }
        />
        <StatCard
          title="Days Until Expiry"
          value={
            <span
              className={
                status.daysUntilExpiry < 0
                  ? 'text-red-400'
                  : status.daysUntilExpiry < 30
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }
            >
              {status.daysUntilExpiry < 0
                ? `${Math.abs(status.daysUntilExpiry)} days ago`
                : `${status.daysUntilExpiry} days`}
            </span>
          }
          accent={expiryAccent}
        />
        <StatCard
          title="Gateway Health"
          value={<HealthBadge health={status.gatewayHealth} />}
          accent={
            status.gatewayHealth === 'healthy'
              ? 'green'
              : status.gatewayHealth === 'degraded'
              ? 'yellow'
              : 'red'
          }
        />
        <StatCard
          title="Latest Rotation"
          value={
            <span className="text-sm font-semibold text-gray-200 break-all">
              {status.latestRotationStatus}
            </span>
          }
          accent="blue"
        />
        <StatCard
          title="Latest Test Run"
          value={
            <span className="text-sm font-semibold text-gray-200 break-all">
              {status.latestTestRunResult}
            </span>
          }
          accent="gray"
        />
        <StatCard
          title="TLS Error Count"
          value={
            <span className={status.tlsErrorCount > 0 ? 'text-red-400' : 'text-green-400'}>
              {status.tlsErrorCount}
            </span>
          }
          sub="Last 24 hours"
          accent={status.tlsErrorCount > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Upstream 502/503 Count"
          value={
            <span className={status.upstream502503Count > 0 ? 'text-yellow-400' : 'text-green-400'}>
              {status.upstream502503Count}
            </span>
          }
          sub="Last 24 hours"
          accent={status.upstream502503Count > 0 ? 'yellow' : 'green'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>TLS Handshake Errors (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tlsErrors}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Errors"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gateway 4xx/5xx Responses (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={gw45xx}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="4xx/5xx"
                  stroke="#f59e0b"
                  fill="#f59e0b22"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Pass/Fail Trend (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={testPF}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend />
                <Bar dataKey="pass" name="Pass" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="fail" name="Fail" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certificate Expiry Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={certExpiry}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="profile"
                  stroke="#6b7280"
                  tick={{ fontSize: 10 }}
                  width={100}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar
                  dataKey="daysUntilExpiry"
                  name="Days Until Expiry"
                  fill="#3b82f6"
                  radius={[0, 2, 2, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
