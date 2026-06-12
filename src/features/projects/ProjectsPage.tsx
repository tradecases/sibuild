import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import type { Project, Customer } from '../../types';

interface ProjectForm {
  name: string;
  customer_id: string;
  status: 'enquiry' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  budget: number;
  description: string;
  address: string;
  assigned_to: string;
}

interface ProjectWithCustomer extends Project {
  customer?: Customer;
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const showToast = useUiStore((state) => state.showToast);

  const [projects, setProjects] = useState<ProjectWithCustomer[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const [form, setForm] = useState<ProjectForm>({
    name: '',
    customer_id: '',
    status: 'enquiry',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: 0,
    description: '',
    address: '',
    assigned_to: '',
  });

  const [loading, setLoading] = useState(true);

  const statuses: Array<'enquiry' | 'active' | 'on_hold' | 'completed' | 'cancelled'> = [
    'enquiry',
    'active',
    'on_hold',
    'completed',
    'cancelled',
  ];

  useEffect(() => {
    loadProjects();
    loadCustomers();
    loadProfiles();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [search, statusFilter, projects]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('projects')
        .select('*, customer:customers(*)')
        .order('created_at', { ascending: false });
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Error loading projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true);
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true);
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    if (search) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.project_number?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  const handleSave = async () => {
    if (!form.name || !form.customer_id) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      if (editingId) {
        const { error } = await supabase
          .from('projects')
          .update(form)
          .eq('id', editingId);
        if (error) throw error;
        showToast('Project updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([
            {
              ...form,
              project_number: `PRJ-${Date.now()}`,
              created_by: userId,
            },
          ]);
        if (error) throw error;
        showToast('Project created successfully', 'success');
      }

      setShowModal(false);
      resetForm();
      loadProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      showToast('Error saving project', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      customer_id: '',
      status: 'enquiry',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      budget: 0,
      description: '',
      address: '',
      assigned_to: '',
    });
    setEditingId(null);
  };

  const handleEdit = (project: ProjectWithCustomer) => {
    setForm({
      name: project.name,
      customer_id: project.customer_id,
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budget: project.budget,
      description: project.description || '',
      address: project.address || '',
      assigned_to: project.assigned_to || '',
    });
    setEditingId(project.id);
    setShowModal(true);
  };

  const handleNavigateToDetail = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">{filteredProjects.length} projects</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => { resetForm(); setShowModal(true); }}>New Project</Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <Input
              leftIcon={<Search size={16} />}
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'enquiry', label: 'Enquiry' },
              { value: 'active', label: 'Active' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <Button variant="secondary" leftIcon={<Filter size={16} />}>More Filters</Button>
        </div>
      </Card>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          {loading ? (
            <SkeletonTable rows={5} cols={7} />
          ) : filteredProjects.length > 0 ? (
            <Table
              columns={[
                { key: 'project_number', label: 'Project#' },
                { key: 'name', label: 'Name' },
                {
                  key: 'customer_id',
                  label: 'Customer',
                  render: (_, row) => (row as any).customer?.name || '-',
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (v) => <StatusBadge status={v} />,
                },
                {
                  key: 'start_date',
                  label: 'Start Date',
                  render: (v) => v ? formatDate(v) : '-',
                },
                {
                  key: 'end_date',
                  label: 'End Date',
                  render: (v) => v ? formatDate(v) : '-',
                },
                { key: 'budget', label: 'Budget', render: (v) => formatCurrency(v) },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, row) => (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        rightIcon={<ChevronRight size={14} />}
                        onClick={() => handleNavigateToDetail(row.id)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(row)}
                      >
                        Edit
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={filteredProjects}
            />
          ) : (
            <EmptyState
              title="No projects found"
              description="Create a new project to get started"
              size="sm"
            />
          )}
        </Card>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {statuses.map(status => (
            <div key={status} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4 capitalize">
                {status.replace('_', ' ')} ({filteredProjects.filter(p => p.status === status).length})
              </h3>
              <div className="space-y-3">
                {filteredProjects
                  .filter(p => p.status === status)
                  .map(project => (
                    <div
                      key={project.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleNavigateToDetail(project.id)}
                    >
                      <p className="text-sm font-medium text-slate-900">{project.name}</p>
                      <p className="text-xs text-slate-600 mt-1">{project.customer?.name}</p>
                      <p className="text-xs text-slate-500 mt-2">{formatCurrency(project.budget)}</p>
                      {project.start_date && (
                        <p className="text-xs text-slate-500">{formatDate(project.start_date)}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New/Edit Project Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Edit Project' : 'New Project'}
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <Input
            label="Project Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Project name"
          />
          <Select
            label="Customer"
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            options={customers.map(c => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            options={[
              { value: 'enquiry', label: 'Enquiry' },
              { value: 'active', label: 'Active' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <Input
            label="Start Date"
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
          <Input
            label="End Date"
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
          <Input
            label="Budget"
            type="number"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: parseFloat(e.target.value) })}
            placeholder="0.00"
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Project location"
          />
          <Select
            label="Assign To"
            value={form.assigned_to}
            onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
            options={[
              { value: '', label: 'Unassigned' },
              ...profiles.map(p => ({ value: p.id, label: p.full_name })),
            ]}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Project details"
            multiline
            rows={3}
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'} Project</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
