import axios from 'axios';
import type {
  Certificate,
  TestCase,
  RotationHistory,
  LogEntry,
  Settings,
  DashboardStatus,
  ChartData,
  CertProfile,
} from '@tls-chaos/shared';

const http = axios.create({ baseURL: '/api' });

export interface StatusResponse {
  status: DashboardStatus;
  chartData: ChartData;
}

export interface RotateResponse {
  success: boolean;
  rotation: RotationHistory;
  activeCertProfile: CertProfile;
}

export interface RunAllResponse {
  ran: number;
  testCases: TestCase[];
}

// Dashboard / status
export async function fetchStatus(): Promise<StatusResponse> {
  const res = await http.get<StatusResponse>('/status');
  return res.data;
}

// Certificates
export async function fetchCertificates(): Promise<Certificate[]> {
  const res = await http.get<Certificate[]>('/certificates');
  return res.data;
}

export async function fetchCurrentCertificate(): Promise<Certificate> {
  const res = await http.get<Certificate>('/certificates/current');
  return res.data;
}

// Rotation
export async function rotateCertificate(toProfile: CertProfile): Promise<RotateResponse> {
  const res = await http.post<RotateResponse>('/rotate', { toProfile });
  return res.data;
}

export async function fetchRotationHistory(): Promise<RotationHistory[]> {
  const res = await http.get<RotationHistory[]>('/rotations');
  return res.data;
}

// Tests
export async function fetchTestCases(): Promise<TestCase[]> {
  const res = await http.get<TestCase[]>('/test-cases');
  return res.data;
}

export async function runAllTests(filter?: 'positive' | 'negative'): Promise<RunAllResponse> {
  const res = await http.post<RunAllResponse>('/tests/run', filter ? { filter } : {});
  return res.data;
}

export async function runTestCase(id: string): Promise<TestCase> {
  const res = await http.post<TestCase>(`/tests/${id}/run`);
  return res.data;
}

// Logs
export interface LogFilters {
  severity?: string;
  component?: string;
  errorCategory?: string;
  testCaseId?: string;
  certProfile?: string;
  limit?: number;
}

export async function fetchLogs(filters?: LogFilters): Promise<LogEntry[]> {
  const res = await http.get<LogEntry[]>('/logs', { params: filters });
  return res.data;
}

// Settings
export async function fetchSettings(): Promise<Settings> {
  const res = await http.get<Settings>('/settings');
  return res.data;
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const res = await http.put<Settings>('/settings', settings);
  return res.data;
}
