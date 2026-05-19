import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Certificates } from './pages/Certificates';
import { TestCases } from './pages/TestCases';
import { Rotation } from './pages/Rotation';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/test-cases" element={<TestCases />} />
            <Route path="/rotation" element={<Rotation />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
