import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Package, Users, FileText, ShoppingCart,
  Building2, Truck, Shield, CreditCard, UserCheck, BarChart2, Settings,
  FolderOpen, X, ArrowRight, ClipboardList
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { cn } from '../../lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  path: string;
  keywords?: string[];
}

const commands: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, path: '/dashboard', keywords: ['home', 'overview'] },
  { id: 'products', label: 'Products', description: 'Manage inventory products', icon: <Package size={15} />, path: '/inventory/products', keywords: ['inventory', 'stock', 'items'] },
  { id: 'categories', label: 'Product Categories', icon: <Package size={15} />, path: '/inventory/categories' },
  { id: 'stock', label: 'Stock Operations', icon: <ClipboardList size={15} />, path: '/inventory/stock', keywords: ['warehouse', 'stock in', 'stock out'] },
  { id: 'customers', label: 'Customers', description: 'Manage customer profiles', icon: <Users size={15} />, path: '/customers', keywords: ['clients', 'buyers'] },
  { id: 'quotations', label: 'Quotations', icon: <FileText size={15} />, path: '/quotations', keywords: ['quotes', 'estimates'] },
  { id: 'pos', label: 'Point of Sale', description: 'Create new sale', icon: <ShoppingCart size={15} />, path: '/sales/pos', keywords: ['billing', 'invoice', 'sale'] },
  { id: 'invoices', label: 'Invoices', icon: <FileText size={15} />, path: '/sales/invoices', keywords: ['bills', 'sales'] },
  { id: 'suppliers', label: 'Suppliers', icon: <Building2 size={15} />, path: '/suppliers', keywords: ['vendors', 'procurement'] },
  { id: 'purchases', label: 'Purchase Orders', icon: <FileText size={15} />, path: '/purchases', keywords: ['po', 'buying'] },
  { id: 'projects', label: 'Projects', icon: <FolderOpen size={15} />, path: '/projects', keywords: ['construction', 'work'] },
  { id: 'delivery', label: 'Delivery', icon: <Truck size={15} />, path: '/delivery', keywords: ['dispatch', 'shipping'] },
  { id: 'warranty', label: 'Warranty', icon: <Shield size={15} />, path: '/warranty', keywords: ['guarantee', 'claims'] },
  { id: 'accounting', label: 'Accounting', icon: <CreditCard size={15} />, path: '/accounting', keywords: ['finance', 'ledger', 'cash'] },
  { id: 'employees', label: 'Employees', icon: <UserCheck size={15} />, path: '/employees', keywords: ['staff', 'hr', 'payroll'] },
  { id: 'reports', label: 'Reports', icon: <BarChart2 size={15} />, path: '/reports', keywords: ['analytics', 'export'] },
  { id: 'settings', label: 'Settings', icon: <Settings size={15} />, path: '/settings', keywords: ['config', 'preferences', 'company'] },
];

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette } = useUiStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.keywords?.some(k => k.toLowerCase().includes(query.toLowerCase()))
      )
    : commands;

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        commandPaletteOpen ? closeCommandPalette() : useUiStore.getState().openCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, closeCommandPalette]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected(s => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected(s => Math.max(s - 1, 0));
      } else if (e.key === 'Enter' && filtered[selected]) {
        navigate(filtered[selected].path);
        closeCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, filtered, selected, navigate, closeCommandPalette]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeCommandPalette} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-modal overflow-hidden animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search or jump to..."
            className="flex-1 text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
          />
          <button onClick={closeCommandPalette} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">No results found</div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === selected ? 'bg-primary-50' : 'hover:bg-slate-50'
                )}
                onClick={() => { navigate(item.path); closeCommandPalette(); }}
                onMouseEnter={() => setSelected(i)}
              >
                <span className={cn('p-1.5 rounded-lg', i === selected ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500')}>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', i === selected ? 'text-primary-900' : 'text-slate-800')}>
                    {item.label}
                  </p>
                  {item.description && <p className="text-xs text-slate-400 truncate">{item.description}</p>}
                </div>
                {i === selected && <ArrowRight size={13} className="text-primary-400 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-2xs text-slate-400">
          <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-slate-100 border border-slate-200 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-slate-100 border border-slate-200 font-mono">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-slate-100 border border-slate-200 font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
