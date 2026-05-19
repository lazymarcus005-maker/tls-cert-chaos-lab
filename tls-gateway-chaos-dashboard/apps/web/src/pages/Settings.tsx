import React, { useEffect, useState } from 'react';
import { fetchSettings, updateSettings } from '../api/client';
import { Settings as ISettings } from '@tls-chaos/shared';
import {
  Card, CardHeader, CardTitle, CardContent,
  Input, Toggle, Button, Spinner,
  ToastContainer,
} from '../components/ui/index';
import { useToast } from '../hooks/useToast';

export function Settings() {
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toasts, toast } = useToast();

  useEffect(() => {
    fetchSettings()
      .then(setSettings)
      .catch((e) => toast(`Load error: ${e.message}`, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      toast('Settings saved successfully', 'success');
    } catch (e: any) {
      toast(`Save error: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof ISettings>(key: K, value: ISettings[K]) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : null}
          Save Settings
        </Button>
      </div>

      {/* Environment */}
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide">
                Environment Name
              </label>
              <Input
                value={settings.environmentName}
                onChange={(v) => set('environmentName', v)}
                placeholder="e.g. TLS Chaos Lab (Dev)"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide">
                Kubernetes Namespace
              </label>
              <Input
                value={settings.kubernetesNamespace}
                onChange={(v) => set('kubernetesNamespace', v)}
                placeholder="e.g. tls-chaos"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gateway */}
      <Card>
        <CardHeader>
          <CardTitle>Gateway Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide">
                Gateway Hostname
              </label>
              <Input
                value={settings.gatewayHostname}
                onChange={(v) => set('gatewayHostname', v)}
                placeholder="gateway.tls-chaos.internal"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide">
                Gateway Port
              </label>
              <Input
                type="number"
                value={settings.gatewayPort}
                onChange={(v) => set('gatewayPort', parseInt(v, 10))}
                placeholder="443"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide">
                CA Bundle Path
              </label>
              <Input
                value={settings.caBundlePath}
                onChange={(v) => set('caBundlePath', v)}
                placeholder="/etc/ssl/certs/ca-bundle.pem"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide">
                Expiry Alert Threshold (Days)
              </label>
              <Input
                type="number"
                value={settings.expiryAlertThresholdDays}
                onChange={(v) => set('expiryAlertThresholdDays', parseInt(v, 10))}
                placeholder="30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observability */}
      <Card>
        <CardHeader>
          <CardTitle>Observability Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide">
                Prometheus URL
              </label>
              <Input
                value={settings.prometheusUrl}
                onChange={(v) => set('prometheusUrl', v)}
                placeholder="http://prometheus:9090"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 uppercase tracking-wide">
                Loki URL
              </label>
              <Input
                value={settings.lokiUrl}
                onChange={(v) => set('lokiUrl', v)}
                placeholder="http://loki:3100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-gray-200">Enable mTLS</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Require mutual TLS for client connections. Clients must present a valid certificate.
                </p>
              </div>
              <Toggle
                checked={settings.enableMtls}
                onChange={(v) => set('enableMtls', v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Spinner className="h-4 w-4" /> : null}
          Save Settings
        </Button>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
