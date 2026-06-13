import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { Table } from '../../components/ui/Table';
import type { Project, Quotation, Invoice, Payment } from '../../types';

interface ProjectStats {
  totalQuoted: number;
  totalInvoiced: number;
  totalPaid: number;
  remainingBudget: number;
  quotationCount: number;
  invoiceCount: number;
}

interface ProjectWithDetails extends Project {
  customer?: any;
  assigned_profile?: any;
  quotations?: Quotation[];
  invoices?: Invoice[];
  payments?: Payment[];
}

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const toast = useUiStore((state) => state.toast);

  const [project, setProject] = useState<ProjectWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<ProjectStats>({
    totalQuoted: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    remainingBudget: 0,
    quotationCount: 0,
    invoiceCount: 0,
  });
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'quotations') {
      loadQuotations();
    } else if (activeTab === 'invoices') {
      loadInvoices();
    } else if (activeTab === 'payments') {
      loadPayments();
    }
  }, [activeTab, projectId]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('*, customer:customers(*), assigned_profile:profiles(full_name)')
        .eq('id', projectId)
        .single();

      if (projectData) {
        setProject(projectData);
        await loadStats(projectData);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Error loading project');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (proj: ProjectWithDetails) => {
    try {
      // Quotations
      const { data: quoteData } = await supabase
        .from('quotations')
        .select('id, total_amount')
        .eq('project_id', projectId);

      const totalQuoted = quoteData?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;

      // Invoices
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount')
        .eq('project_id', projectId);

      const totalInvoiced = invoiceData?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
      const totalPaid = invoiceData?.reduce((sum, i) => sum + (i.paid_amount || 0), 0) || 0;

      setStats({
        totalQuoted,
        totalInvoiced,
        totalPaid,
        remainingBudget: proj.budget - totalInvoiced,
        quotationCount: quoteData?.length || 0,
        invoiceCount: invoiceData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadQuotations = async () => {
    try {
      const { data } = await supabase
        .from('quotations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      setQuotations(data || []);
    } catch (error) {
      console.error('Error loading quotations:', error);
      toast.error('Error loading quotations');
    }
  };

  const loadInvoices = async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Error loading invoices');
    }
  };

  const loadPayments = async () => {
    try {
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id')
        .eq('project_id', projectId);

      const invoiceIds = invoiceData?.map(i => i.id) || [];

      if (invoiceIds.length > 0) {
        const { data } = await supabase
          .from('payments')
          .select('*')
          .in('invoice_id', invoiceIds)
          .order('payment_date', { ascending: false });

        setPayments(data || []);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Error loading payments');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard rows={3} cols={4} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <EmptyState
          title="Project not found"
          description="The project you're looking for doesn't exist"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate('/projects')}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">{project.project_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<Share2 size={16} />}>Share</Button>
          <Button leftIcon={<Edit size={16} />}>Edit Project</Button>
        </div>
      </div>

      {/* Project Info */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Customer</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{project.customer?.name || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Status</p>
            <div className="mt-1">
              <StatusBadge status={project.status} />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Dates</p>
            <p className="text-sm text-slate-900 mt-1">
              {project.start_date ? formatDate(project.start_date) : '-'} to {project.end_date ? formatDate(project.end_date) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Budget</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{formatCurrency(project.budget)}</p>
          </div>
        </div>

        {project.description && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-600">{project.description}</p>
          </div>
        )}

        {project.address && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 uppercase font-medium">Location</p>
            <p className="text-sm text-slate-900 mt-1">{project.address}</p>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Quoted"
          value={formatCurrency(stats.totalQuoted)}
          subtitle={`${stats.quotationCount} quotations`}
          color="primary"
          loading={false}
        />
        <StatCard
          title="Total Invoiced"
          value={formatCurrency(stats.totalInvoiced)}
          subtitle={`${stats.invoiceCount} invoices`}
          color="success"
          loading={false}
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(stats.totalPaid)}
          color="accent"
          loading={false}
        />
        <StatCard
          title="Remaining Budget"
          value={formatCurrency(stats.remainingBudget)}
          color={stats.remainingBudget >= 0 ? 'success' : 'danger'}
          loading={false}
        />
      </div>

      {/* Content Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'quotations', label: 'Quotations' },
          { id: 'invoices', label: 'Invoices' },
          { id: 'payments', label: 'Payments' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card title="Project Summary">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-700">Project Manager</span>
                <span className="font-medium text-slate-900">{project.assigned_profile?.full_name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-700">Start Date</span>
                <span className="font-medium text-slate-900">{project.start_date ? formatDate(project.start_date) : 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <span className="text-slate-700">End Date</span>
                <span className="font-medium text-slate-900">{project.end_date ? formatDate(project.end_date) : 'Not set'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Budget Utilization</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${Math.min((stats.totalInvoiced / project.budget) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900">
                    {Math.round((stats.totalInvoiced / project.budget) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Quick Stats">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-slate-600 uppercase">Quotations</p>
                <p className="text-2xl font-bold text-blue-600">{stats.quotationCount}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-slate-600 uppercase">Invoices</p>
                <p className="text-2xl font-bold text-green-600">{stats.invoiceCount}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-slate-600 uppercase">Payments</p>
                <p className="text-2xl font-bold text-amber-600">{payments.length}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-slate-600 uppercase">Budget Used</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round((stats.totalInvoiced / project.budget) * 100)}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* QUOTATIONS TAB */}
      {activeTab === 'quotations' && (
        <Card>
          {quotations.length > 0 ? (
            <Table
              columns={[
                { key: 'quotation_number', label: 'Quote#' },
                { key: 'total_amount', label: 'Amount', render: (v) => formatCurrency(v) },
                { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
                { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
                { key: 'valid_until', label: 'Valid Until', render: (v) => v ? formatDate(v) : '-' },
              ]}
              data={quotations}
            />
          ) : (
            <EmptyState
              title="No quotations"
              description="No quotations created for this project yet"
              size="sm"
            />
          )}
        </Card>
      )}

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <Card>
          {invoices.length > 0 ? (
            <Table
              columns={[
                { key: 'invoice_number', label: 'Invoice#' },
                { key: 'total_amount', label: 'Amount', render: (v) => formatCurrency(v) },
                { key: 'paid_amount', label: 'Paid', render: (v) => formatCurrency(v) },
                { key: 'balance_due', label: 'Due', render: (v) => formatCurrency(v) },
                { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
                { key: 'invoice_date', label: 'Date', render: (v) => formatDate(v) },
              ]}
              data={invoices}
            />
          ) : (
            <EmptyState
              title="No invoices"
              description="No invoices created for this project yet"
              size="sm"
            />
          )}
        </Card>
      )}

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <Card>
          {payments.length > 0 ? (
            <Table
              columns={[
                { key: 'payment_number', label: 'Payment#' },
                { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
                { key: 'payment_method', label: 'Method' },
                { key: 'payment_date', label: 'Date', render: (v) => formatDate(v) },
                { key: 'reference_number', label: 'Reference' },
                { key: 'notes', label: 'Notes' },
              ]}
              data={payments}
            />
          ) : (
            <EmptyState
              title="No payments"
              description="No payments recorded for this project yet"
              size="sm"
            />
          )}
        </Card>
      )}
    </div>
  );
}
