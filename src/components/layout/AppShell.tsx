import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';
import { ToastContainer } from '../ui/Toast';
import { useUiStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

export function AppShell() {
  const { sidebarCollapsed } = useUiStore();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={sidebarCollapsed} />
      <Header collapsed={sidebarCollapsed} />

      <main className={cn(
        'transition-all duration-200 pt-16',
        sidebarCollapsed ? 'pl-16' : 'pl-64'
      )}>
        <div className="min-h-[calc(100vh-4rem)] p-6">
          <Outlet />
        </div>
      </main>

      <CommandPalette />
      <ToastContainer />
    </div>
  );
}
