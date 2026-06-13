import React, { useState, useEffect } from 'react';
import { Plus, Download, Eye, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency, formatDate, downloadCSV } from '../../lib/utils';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Table } from '../../components/ui/Table';
import { StatCard } from '../../components/ui/StatCard';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import type { Invoice, Supplier, Expense, JournalEntry, Account, Payment } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface KPIStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;
  receivables: number;
  payables: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

interface ExpenseForm {
  description: string;
  amount: number;
  expense_date: string;
  account_id: string;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'credit';
  vendor_name: string;
  notes: string;
}

export function AccountingPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const toast = useUiStore((state) => state.toast);

  // Overview
  const [kpis, setKpis] = useState<KPIStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashBalance: 0,
    receivables: 0,
    payables: 0,
  });
  const [plData, setPlData] = useState<MonthlyData[]>([]);

  // Cash Book
  const [cashTransactions, setCashTransactions] = useState<any[]>([]);
  const [cashDateFrom, setCashDateFrom] = useState('');
  const [cashDateTo, setCashDateTo] = useState('');

  // Receivables
  const [receivables, setReceivables] = useState<(Customer & { outstanding_balance: number; days_overdue: number })[]>([]);
  const [receivablesTotal, setReceivablesTotal] = useState(0);

  // Payables
  const [payables, setPayables] = useState<Supplier[]>([]);
  const [payablesTotal, setPayablesTotal] = useState(0);

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    account_id: '',
    payment_method: 'cash',
    vendor_name: '',
    notes: '',
  });

  // Journal
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showJournalModal, setShowJournalModal] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'cashbook') {
      loadCashTransactions();
    } else if (activeTab === 'receivables') {
      loadReceivables();
    } else if (activeTab === 'payables') {
      loadPayables();
    } else if (activeTab === 'expenses') {
      loadExpenses();
      loadAccounts();
    } else if (activeTab === 'journal') {
      loadJournalEntries();
    }
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadKPIs(),
        loadPLData(),
      ]);
    } catch (error) {
      console.error('Error loading accounting data:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadKPIs = async () => {
    try {
      // Total Revenue (paid invoices)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid');
      const totalRevenue = invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;

      // Total Expenses
      const { data: expensesList } = await supabase
        .from('expenses')
        .select('amount');
      const totalExpenses = expensesList?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Receivables (outstanding invoices)
      const { data: unpaidInvoices } = await supabase
        .from('invoices')
        .select('balance_due')
        .in('status', ['issued', 'partial', 'overdue']);
      const receivables = unpaidInvoices?.reduce((sum, i) => sum + (i.balance_due || 0), 0) || 0;

      // Payables (outstanding purchase orders)
      const { data: unpaidPOs } = await supabase
        .from('purchase_orders')
        .select('total_amount, paid_amount');
      const payables = unpaidPOs?.reduce((sum, po) => sum + ((po.total_amount || 0) - (po.paid_amount || 0)), 0) || 0;

      // Cash Balance (sum of received payments minus paid expenses)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, type');
      let cashBalance = 0;
      payments?.forEach(p => {
        if (p.type === 'received') cashBalance += p.amount;
        else cashBalance -= p.amount;
      });

      setKpis({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        cashBalance,
        receivables,
        payables,
      });
    } catch (error) {
      console.error('Error loading KPIs:', error);
    }
  };

  const loadPLData = async () => {
    try {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d;
      });

      const data: MonthlyData[] = [];

      for (const month of months) {
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString();

        // Revenue
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('status', 'paid')
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd);
        const revenue = invoiceData?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;

        // Expenses
        const { data: expenseData } = await supabase
          .from('expenses')
          .select('amount')
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd);
        const expenses = expenseData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        data.push({
          month: month.toLocaleDateString('en-AE', { month: 'short' }),
          revenue,
          expenses,
        });
      }

      setPlData(data);
    } catch (error) {
      console.error('Error loading P&L data:', error);
    }
  };

  const loadCashTransactions = async () => {
    try {
      let query = supabase
        .from('payments')
        .select('*, customer:customers(name), invoice:invoices(invoice_number)')
        .order('payment_date', { ascending: false });

      if (cashDateFrom) query = query.gte('payment_date', cashDateFrom);
      if (cashDateTo) query = query.lte('payment_date', cashDateTo);

      const { data } = await query;
      setCashTransactions(data || []);
    } catch (error) {
      console.error('Error loading cash transactions:', error);
      toast.error('Error loading cash transactions');
    }
  };

  const loadReceivables = async () => {
    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('*, outstanding_balance')
        .gt('outstanding_balance', 0);

      const withDaysOverdue = customers?.map(c => ({
        ...c,
        days_overdue: Math.floor((Date.now() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24)),
      })) || [];

      const total = withDaysOverdue.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);

      setReceivables(withDaysOverdue);
      setReceivablesTotal(total);
    } catch (error) {
      console.error('Error loading receivables:', error);
      toast.error('Error loading receivables');
    }
  };

  const loadPayables = async () => {
    try {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .gt('outstanding_balance', 0);

      const total = data?.reduce((sum, s) => sum + (s.outstanding_balance || 0), 0) || 0;
      setPayables(data || []);
      setPayablesTotal(total);
    } catch (error) {
      console.error('Error loading payables:', error);
      toast.error('Error loading payables');
    }
  };

  const loadExpenses = async () => {
    try {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Error loading expenses');
    }
  };

  const loadAccounts = async () => {
    try {
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'expense');
      setAccounts(data || []);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadJournalEntries = async () => {
    try {
      const { data } = await supabase
        .from('journal_entries')
        .select('*, lines:journal_lines(*, account:accounts(name, code))')
        .order('entry_date', { ascending: false })
        .limit(50);
      setJournalEntries(data || []);
    } catch (error) {
      console.error('Error loading journal entries:', error);
      toast.error('Error loading journal entries');
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.account_id) {
      toast.warning('Please fill all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('expenses').insert([
        {
          ...expenseForm,
          expense_number: `EXP-${Date.now()}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);

      if (error) throw error;

      toast.success('Expense added successfully');
      setShowExpenseModal(false);
      setExpenseForm({
        description: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        account_id: '',
        payment_method: 'cash',
        vendor_name: '',
        notes: '',
      });
      loadExpenses();
      loadKPIs();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Error adding expense');
    }
  };

  const handleExportCashBook = () => {
    const data = cashTransactions.map(t => ({
      'Date': formatDate(t.payment_date),
      'Type': t.type === 'received' ? 'Receipt' : 'Payment',
      'Reference': t.reference_number || '-',
      'Amount': formatCurrency(t.amount),
      'Method': t.payment_method,
      'Notes': t.notes || '-',
    }));
    downloadCSV(data, 'cash_book');
  };

  const handleExportReceivables = () => {
    const data = receivables.map(c => ({
      'Customer': c.name,
      'Outstanding': formatCurrency(c.outstanding_balance),
      'Days Overdue': c.days_overdue,
    }));
    downloadCSV(data, 'receivables');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Accounting</h1>
          <p className="text-sm text-slate-500 mt-1">Financial management and reporting</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'cashbook', label: 'Cash Book' },
          { id: 'receivables', label: 'Receivables' },
          { id: 'payables', label: 'Payables' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'journal', label: 'Journal' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Revenue" value={formatCurrency(kpis.totalRevenue)} color="success" loading={loading} />
            <StatCard title="Total Expenses" value={formatCurrency(kpis.totalExpenses)} color="danger" loading={loading} />
            <StatCard title="Net Profit" value={formatCurrency(kpis.netProfit)} color={kpis.netProfit >= 0 ? 'success' : 'danger'} loading={loading} />
            <StatCard title="Cash Balance" value={formatCurrency(kpis.cashBalance)} color="primary" loading={loading} />
            <StatCard title="Receivables" value={formatCurrency(kpis.receivables)} color="warning" loading={loading} />
            <StatCard title="Payables" value={formatCurrency(kpis.payables)} color="info" loading={loading} />
          </div>

          {/* P&L Chart */}
          <Card title="Profit & Loss - Last 6 Months">
            {loading ? (
              <SkeletonTable rows={4} cols={2} />
            ) : plData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={plData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#22C55E" fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="expenses" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No data" description="P&L data will appear here" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* CASH BOOK TAB */}
      {activeTab === 'cashbook' && (
        <div className="space-y-4">
          <Card>
            <div className="flex gap-4 mb-4">
              <Input
                type="date"
                value={cashDateFrom}
                onChange={(e) => setCashDateFrom(e.target.value)}
                placeholder="From Date"
              />
              <Input
                type="date"
                value={cashDateTo}
                onChange={(e) => setCashDateTo(e.target.value)}
                placeholder="To Date"
              />
              <Button variant="secondary" onClick={loadCashTransactions}>Filter</Button>
              <Button leftIcon={<Download size={16} />} onClick={handleExportCashBook}>Export</Button>
            </div>

            {cashTransactions.length > 0 ? (
              <Table
                columns={[
                  { key: 'payment_date', label: 'Date', render: (v) => formatDate(v) },
                  { key: 'type', label: 'Type', render: (v) => <Badge>{v === 'received' ? 'Receipt' : 'Payment'}</Badge> },
                  { key: 'reference_number', label: 'Reference' },
                  { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
                  { key: 'payment_method', label: 'Method' },
                  { key: 'notes', label: 'Notes' },
                ]}
                data={cashTransactions}
              />
            ) : (
              <EmptyState title="No transactions" description="Cash transactions will appear here" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* RECEIVABLES TAB */}
      {activeTab === 'receivables' && (
        <div className="space-y-4">
          <Card>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-slate-600">Total Receivables: <span className="font-bold text-slate-900">{formatCurrency(receivablesTotal)}</span></p>
            </div>

            {receivables.length > 0 ? (
              <Table
                columns={[
                  { key: 'name', label: 'Customer' },
                  { key: 'outstanding_balance', label: 'Amount Due', render: (v) => formatCurrency(v) },
                  { key: 'days_overdue', label: 'Days Overdue', render: (v) => <Badge variant={v > 30 ? 'danger' : 'warning'}>{v} days</Badge> },
                  { key: 'phone', label: 'Phone' },
                ]}
                data={receivables}
              />
            ) : (
              <EmptyState title="No receivables" description="All invoices are paid" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* PAYABLES TAB */}
      {activeTab === 'payables' && (
        <div className="space-y-4">
          <Card>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-slate-600">Total Payables: <span className="font-bold text-slate-900">{formatCurrency(payablesTotal)}</span></p>
            </div>

            {payables.length > 0 ? (
              <Table
                columns={[
                  { key: 'name', label: 'Supplier' },
                  { key: 'outstanding_balance', label: 'Amount Due', render: (v) => formatCurrency(v) },
                  { key: 'contact_person', label: 'Contact' },
                  { key: 'phone', label: 'Phone' },
                ]}
                data={payables}
              />
            ) : (
              <EmptyState title="No payables" description="All purchase orders are settled" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button leftIcon={<Plus size={16} />} onClick={() => setShowExpenseModal(true)}>Add Expense</Button>
          </div>

          <Card>
            {expenses.length > 0 ? (
              <Table
                columns={[
                  { key: 'expense_number', label: 'Ref' },
                  { key: 'description', label: 'Description' },
                  { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
                  { key: 'expense_date', label: 'Date', render: (v) => formatDate(v) },
                  { key: 'vendor_name', label: 'Vendor' },
                  { key: 'payment_method', label: 'Method' },
                ]}
                data={expenses}
              />
            ) : (
              <EmptyState title="No expenses" description="Add your first expense to get started" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* JOURNAL TAB */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <Card>
            {journalEntries.length > 0 ? (
              <div className="space-y-2">
                {journalEntries.map(entry => (
                  <div key={entry.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => { setSelectedEntry(entry); setShowJournalModal(true); }}>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{entry.entry_number}</p>
                        <p className="text-sm text-slate-500">{entry.description}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-sm text-slate-600">{formatDate(entry.entry_date)}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(entry.total_debit)}</p>
                      </div>
                      <Eye size={18} className="text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No journal entries" description="Journal entries will appear here" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Add Expense"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Description"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            placeholder="Enter expense description"
          />
          <Input
            label="Amount"
            type="number"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) })}
            placeholder="0.00"
          />
          <Input
            label="Date"
            type="date"
            value={expenseForm.expense_date}
            onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
          />
          <Select
            label="Category (Account)"
            value={expenseForm.account_id}
            onChange={(e) => setExpenseForm({ ...expenseForm, account_id: e.target.value })}
            options={accounts.map(a => ({ value: a.id, label: a.name }))}
          />
          <Select
            label="Payment Method"
            value={expenseForm.payment_method}
            onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value as any })}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cheque', label: 'Cheque' },
              { value: 'credit', label: 'Credit' },
            ]}
          />
          <Input
            label="Vendor"
            value={expenseForm.vendor_name}
            onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
            placeholder="Vendor name"
          />
          <Input
            label="Notes"
            value={expenseForm.notes}
            onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
            placeholder="Additional notes"
            multiline
            rows={3}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
            <Button onClick={handleAddExpense}>Save Expense</Button>
          </div>
        </div>
      </Modal>

      {/* Journal Entry Details Modal */}
      <Modal
        isOpen={showJournalModal}
        onClose={() => { setShowJournalModal(false); setSelectedEntry(null); }}
        title={selectedEntry ? `Journal Entry ${selectedEntry.entry_number}` : 'Journal Entry'}
        size="md"
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-500 uppercase">Date</p>
                <p className="font-medium text-slate-900">{formatDate(selectedEntry.entry_date)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Description</p>
                <p className="font-medium text-slate-900">{selectedEntry.description}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 mb-3">Lines</p>
              <div className="space-y-2">
                {selectedEntry.lines?.map(line => (
                  <div key={line.id} className="flex justify-between items-center p-2 bg-slate-50 rounded text-sm">
                    <span className="text-slate-700">{(line as any).account?.name}</span>
                    <div className="flex gap-4">
                      {line.debit > 0 && <span className="text-slate-900 font-medium">Dr: {formatCurrency(line.debit)}</span>}
                      {line.credit > 0 && <span className="text-slate-900 font-medium">Cr: {formatCurrency(line.credit)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-4 text-sm border-t border-slate-200 pt-3">
              <div><span className="text-slate-600">Total Debit:</span> <span className="font-medium">{formatCurrency(selectedEntry.total_debit)}</span></div>
              <div><span className="text-slate-600">Total Credit:</span> <span className="font-medium">{formatCurrency(selectedEntry.total_credit)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
