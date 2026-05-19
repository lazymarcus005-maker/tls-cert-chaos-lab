import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../ui/index';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { path: '/certificates', label: 'Certificates', icon: '🔐' },
  { path: '/test-cases', label: 'Test Cases', icon: '✓' },
  { path: '/rotation', label: 'Rotation', icon: '↻' },
  { path: '/logs', label: 'Logs', icon: '≡' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            TLS
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">Chaos Lab</p>
            <p className="text-xs text-gray-500 leading-tight">Gateway Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800',
              )
            }
          >
            <span className="text-base leading-none w-5 text-center">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <div className="text-xs text-gray-600 space-y-0.5">
          <p className="font-medium text-gray-500">TLS Gateway Chaos Lab</p>
          <p>v1.0.0 · Mock Mode</p>
        </div>
      </div>
    </aside>
  );
}
