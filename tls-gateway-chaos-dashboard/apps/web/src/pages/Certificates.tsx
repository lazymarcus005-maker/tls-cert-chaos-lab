import React, { useEffect, useState } from 'react';
import { fetchCertificates, fetchCurrentCertificate } from '../api/client';
import { Certificate, CertificateStatus } from '@tls-chaos/shared';
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Spinner,
} from '../components/ui/index';
import { CertStatusBadge, ProfileBadge } from '../components/ui/statusHelpers';
import { cn } from '../components/ui/index';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-200 break-all">{value}</span>
    </div>
  );
}

function BoolBadge({ value, trueLabel = 'Yes', falseLabel = 'No' }: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return (
    <Badge variant={value ? 'green' : 'red'}>
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

function CertCard({ cert, isActive }: { cert: Certificate; isActive: boolean }) {
  return (
    <Card
      className={cn(
        'transition-all',
        isActive ? 'border-blue-600 ring-1 ring-blue-600/50 shadow-blue-900/20 shadow-lg' : '',
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <ProfileBadge profile={cert.profile} />
            {isActive && (
              <Badge variant="blue">Active</Badge>
            )}
          </div>
          <CertStatusBadge status={cert.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Subject" value={cert.subject} />
          <Field label="Issuer" value={cert.issuer} />
          <Field label="Serial Number" value={
            <span className="font-mono text-xs">{cert.serialNumber}</span>
          } />
          <Field label="SAN" value={
            <div className="flex flex-wrap gap-1">
              {cert.san.map((s) => (
                <span key={s} className="font-mono text-xs bg-gray-800 px-1.5 py-0.5 rounded">
                  {s}
                </span>
              ))}
            </div>
          } />
          <Field label="Not Before" value={new Date(cert.notBefore).toLocaleDateString()} />
          <Field label="Not After" value={new Date(cert.notAfter).toLocaleDateString()} />
          <Field label="Days Until Expiry" value={
            <span className={
              cert.daysUntilExpiry < 0
                ? 'text-red-400 font-semibold'
                : cert.daysUntilExpiry < 30
                ? 'text-yellow-400 font-semibold'
                : 'text-green-400'
            }>
              {cert.daysUntilExpiry < 0
                ? `Expired ${Math.abs(cert.daysUntilExpiry)} days ago`
                : `${cert.daysUntilExpiry} days`}
            </span>
          } />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Validation</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-xs text-gray-400">Trusted:</span>
              <BoolBadge value={cert.isTrusted} />
              <span className="text-xs text-gray-400">Chain:</span>
              <BoolBadge value={cert.chainValid} trueLabel="Valid" falseLabel="Broken" />
              <span className="text-xs text-gray-400">Hostname:</span>
              <BoolBadge value={cert.hostnameValid} />
              <span className="text-xs text-gray-400">Key Match:</span>
              <BoolBadge value={cert.keyMatchesCert} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Certificates() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [current, setCurrent] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCertificates(), fetchCurrentCertificate()])
      .then(([all, curr]) => {
        setCerts(all);
        setCurrent(curr);
      })
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

  if (error) {
    return <div className="p-6 text-red-400">Error: {error}</div>;
  }

  // Sort: active first, then by profile name
  const sorted = [...certs].sort((a, b) => {
    if (a.profile === current?.profile) return -1;
    if (b.profile === current?.profile) return 1;
    return a.profile.localeCompare(b.profile);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Certificates</h1>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{certs.length} profiles</span>
          {current && (
            <>
              <span>·</span>
              <span>Active: <span className="text-blue-400 font-medium">{current.profile}</span></span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sorted.map((cert) => (
          <CertCard
            key={cert.profile}
            cert={cert}
            isActive={cert.profile === current?.profile}
          />
        ))}
      </div>
    </div>
  );
}
