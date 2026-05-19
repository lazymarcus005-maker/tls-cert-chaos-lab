import React, { useEffect, useState } from 'react';
import {
  fetchRotationHistory,
  fetchCurrentCertificate,
  rotateCertificate,
} from '../api/client';
import { CertProfile, RotationHistory } from '@tls-chaos/shared';
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Button, Dialog, Select, Spinner,
  Table, Thead, Tbody, Th, Td, Tr,
  ToastContainer,
} from '../components/ui/index';
import { ProfileBadge } from '../components/ui/statusHelpers';
import { useToast } from '../hooks/useToast';

const ALL_PROFILES: { value: CertProfile; label: string }[] = [
  { value: 'valid', label: 'valid — Trusted, correct hostname, not expired' },
  { value: 'expired', label: 'expired — Certificate past notAfter date' },
  { value: 'self-signed', label: 'self-signed — Unknown CA, not in trust store' },
  { value: 'wrong-host', label: 'wrong-host — Hostname mismatch (SAN does not match)' },
  { value: 'future', label: 'future — Not yet valid (notBefore in future)' },
  { value: 'broken-chain', label: 'broken-chain — Intermediate CA missing' },
  { value: 'key-mismatch', label: 'key-mismatch — Private key does not match cert (will fail)' },
  { value: 'mtls-client-valid', label: 'mtls-client-valid — Valid mTLS client certificate' },
  { value: 'mtls-client-invalid', label: 'mtls-client-invalid — Untrusted mTLS client cert' },
];

export function Rotation() {
  const [history, setHistory] = useState<RotationHistory[]>([]);
  const [currentProfile, setCurrentProfile] = useState<CertProfile>('valid');
  const [targetProfile, setTargetProfile] = useState<CertProfile>('expired');
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toasts, toast } = useToast();

  const load = async () => {
    try {
      const [hist, curr] = await Promise.all([
        fetchRotationHistory(),
        fetchCurrentCertificate(),
      ]);
      setHistory(hist);
      setCurrentProfile(curr.profile);
    } catch (e: any) {
      toast(`Load error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRotate = async () => {
    setConfirmOpen(false);
    setRotating(true);
    try {
      const res = await rotateCertificate(targetProfile);
      setHistory((prev) => [res.rotation, ...prev]);
      setCurrentProfile(res.activeCertProfile);
      if (res.success) {
        toast(`Rotated to '${targetProfile}' successfully`, 'success');
      } else {
        toast(`Rotation to '${targetProfile}' failed: ${res.rotation.message}`, 'error');
      }
    } catch (e: any) {
      toast(`Rotation error: ${e.message}`, 'error');
    } finally {
      setRotating(false);
    }
  };

  const handleRestoreValid = async () => {
    setRotating(true);
    try {
      const res = await rotateCertificate('valid');
      setHistory((prev) => [res.rotation, ...prev]);
      setCurrentProfile(res.activeCertProfile);
      toast('Restored to valid certificate', 'success');
    } catch (e: any) {
      toast(`Restore error: ${e.message}`, 'error');
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">Certificate Rotation</h1>
        <Button
          variant="success"
          size="sm"
          onClick={handleRestoreValid}
          disabled={rotating || currentProfile === 'valid'}
        >
          {rotating ? <Spinner className="h-3 w-3" /> : null}
          Restore Valid Cert
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current profile */}
        <Card>
          <CardHeader>
            <CardTitle>Current Active Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <div className="space-y-3">
                <ProfileBadge profile={currentProfile} />
                <p className="text-xs text-gray-500">
                  This is the certificate profile currently loaded in the gateway.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rotate control */}
        <Card>
          <CardHeader>
            <CardTitle>Rotate To Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 uppercase tracking-wide">
                  Target Profile
                </label>
                <Select
                  value={targetProfile}
                  onChange={(v) => setTargetProfile(v as CertProfile)}
                  className="w-full"
                  disabled={rotating}
                >
                  {ALL_PROFILES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2">
                  <ProfileBadge profile={currentProfile} />
                </div>
                <span className="text-gray-500">→</span>
                <div className="flex items-center gap-2">
                  <ProfileBadge profile={targetProfile} />
                </div>
              </div>

              {targetProfile === 'key-mismatch' && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-xs text-red-400">
                  Warning: The key-mismatch profile will always fail rotation. The previous profile will be preserved.
                </div>
              )}

              <Button
                variant="danger"
                onClick={() => setConfirmOpen(true)}
                disabled={rotating || targetProfile === currentProfile}
                className="w-full"
              >
                {rotating ? <Spinner className="h-4 w-4" /> : null}
                Rotate Certificate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rotation History */}
      <Card>
        <CardHeader>
          <CardTitle>Rotation History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Timestamp</Th>
                  <Th>From</Th>
                  <Th>To</Th>
                  <Th>Status</Th>
                  <Th>Triggered By</Th>
                  <Th>Message</Th>
                </tr>
              </Thead>
              <Tbody>
                {history.map((entry) => (
                  <Tr key={entry.id}>
                    <Td>
                      <span className="text-xs font-mono text-gray-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono text-gray-400">{entry.fromProfile}</span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono text-gray-400">{entry.toProfile}</span>
                    </Td>
                    <Td>
                      <Badge variant={entry.status === 'success' ? 'green' : 'red'}>
                        {entry.status}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-400">{entry.triggeredBy}</span>
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-400 max-w-xs block truncate" title={entry.message}>
                        {entry.message}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Certificate Rotation"
      >
        <div className="space-y-4">
          <p className="text-gray-300 text-sm">
            You are about to rotate the active certificate profile from{' '}
            <span className="text-blue-400 font-semibold">{currentProfile}</span> to{' '}
            <span className="text-orange-400 font-semibold">{targetProfile}</span>.
          </p>
          {targetProfile !== 'valid' && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 text-xs text-yellow-300">
              This profile will introduce TLS errors in the gateway. Only proceed if you are running a chaos test.
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRotate}>
              Confirm Rotation
            </Button>
          </div>
        </div>
      </Dialog>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
