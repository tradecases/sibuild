import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Search, Bell, LogOut, User, Settings, ChevronDown, Command
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { cn } from '../../lib/utils';

interface HeaderProps {
  collapsed: boolean;
}

export function Header({ collapsed }: HeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { toggleSidebar, openCommandPalette } = useUiStore();
  const [notifOpen, setNotifOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <header className={cn(
      'fixed top-0 right-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 transition-all duration-200',
      collapsed ? 'left-16' : 'left-64'
    )}>
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Command palette trigger */}
      <button
        onClick={openCommandPalette}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 text-slate-400 text-sm bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors flex-1 max-w-sm"
      >
        <Search size={14} />
        <span className="flex-1 text-left hidden sm:block">Quick search...</span>
        <div className="hidden sm:flex items-center gap-1 ml-auto">
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-2xs text-slate-400 font-mono shadow-sm">
            <Command size={9} />K
          </kbd>
        </div>
      </button>

      <div className="flex items-center gap-1 ml-auto">
        {/* Notifications */}
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-danger-500 rounded-full" />
        </button>

        {/* User menu */}
        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <Avatar name={user?.full_name ?? 'User'} src={user?.avatar_url} size="sm" />
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-none">{user?.full_name}</p>
                <p className="text-2xs text-slate-400 mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <ChevronDown size={13} className="text-slate-400 hidden md:block" />
            </button>
          }
          items={[
            {
              label: 'My Profile',
              icon: <User size={14} />,
              onClick: () => navigate('/settings/profile'),
            },
            {
              label: 'Settings',
              icon: <Settings size={14} />,
              onClick: () => navigate('/settings'),
            },
            {
              label: 'Sign Out',
              icon: <LogOut size={14} />,
              onClick: handleSignOut,
              variant: 'danger',
              divider: true,
            },
          ]}
        />
      </div>
    </header>
  );
}
