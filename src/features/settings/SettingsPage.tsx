import React, { useState, useEffect } from 'react';
import { Plus, Upload, Power, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { Tabs } from '../../components/ui/Tabs';
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
import type { CompanySettings, Branch, Profile } from '../../types';

interface CompanyForm extends Partial<CompanySettings> {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  tax_number: string;
  currency: string;
  currency_symbol: string;
}

interface BranchForm {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
}

interface UserForm {
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const showToast = useUiStore((state) => state.showToast);

  // Company
  const [company, setCompany] = useState<CompanyForm>({
    name: '',
    address: '',
    city: '',
    country: 'UAE',
    phone: '',
    email: '',
    website: '',
    tax_number: '',
    currency: 'AED',
    currency_symbol: 'د.إ',
  });
  const [companyLoading, setCompanyLoading] = useState(false);

  // Branches
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState<BranchForm>({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    is_active: true,
  });

  // Users
  const [users, setUsers] = useState<Profile[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  // Tax Settings
  const [taxRate, setTaxRate] = useState(5);

  // Invoice Template
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceTerms, setInvoiceTerms] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'company') {
      loadCompanySettings();
    } else if (activeTab === 'branches') {
      loadBranches();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'invoice') {
      loadInvoiceTemplate();
    }
  }, [activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCompanySettings(),
        loadBranches(),
        loadUsers(),
      ]);
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCompanySettings = async () => {
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (data) {
        setCompany(data);
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: true });

      setBranches(data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
      showToast('Error loading branches', 'error');
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Error loading users', 'error');
    }
  };

  const loadInvoiceTemplate = async () => {
    try {
      // In a real app, would fetch from a settings table
      setInvoiceNotes('Thank you for your business!');
      setInvoiceTerms('Payment due within 30 days of invoice date.');
      setPaymentInstructions('Please transfer payment to our account or pay in cash.');
    } catch (error) {
      console.error('Error loading invoice template:', error);
    }
  };

  const handleSaveCompany = async () => {
    setCompanyLoading(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update(company)
        .eq('id', company.id || (await supabase.from('company_settings').select('id').single()).data?.id);

      if (error) throw error;

      showToast('Company settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving company settings:', error);
      showToast('Error saving company settings', 'error');
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleSaveBranch = async () => {
    if (!branchForm.name || !branchForm.code) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    try {
      if (editingBranchId) {
        const { error } = await supabase
          .from('branches')
          .update(branchForm)
          .eq('id', editingBranchId);
        if (error) throw error;
        showToast('Branch updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('branches')
          .insert([branchForm]);
        if (error) throw error;
        showToast('Branch created successfully', 'success');
      }

      setShowBranchModal(false);
      resetBranchForm();
      loadBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      showToast('Error saving branch', 'error');
    }
  };

  const resetBranchForm = () => {
    setBranchForm({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      is_active: true,
    });
    setEditingBranchId(null);
  };

  const handleEditBranch = (branch: Branch) => {
    setBranchForm({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      is_active: branch.is_active,
    });
    setEditingBranchId(branch.id);
    setShowBranchModal(true);
  };

  const handleDeactivateBranch = async (branchId: string) => {
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active: false })
        .eq('id', branchId);

      if (error) throw error;

      showToast('Branch deactivated', 'success');
      loadBranches();
    } catch (error) {
      console.error('Error deactivating branch:', error);
      showToast('Error deactivating branch', 'error');
    }
  };

  const handleGenerateInvite = async () => {
    if (!inviteEmail) {
      showToast('Please enter an email address', 'warning');
      return;
    }

    // In a real app, this would call a server function to generate an invite link
    const mockLink = `${window.location.origin}/invite?token=${Math.random().toString(36).substring(7)}`;
    setInviteLink(mockLink);
  };

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    showToast('Invite link copied to clipboard', 'success');
  };

  const handleSaveInvoiceTemplate = async () => {
    try {
      // In a real app, would save to database
      showToast('Invoice template saved successfully', 'success');
    } catch (error) {
      console.error('Error saving invoice template:', error);
      showToast('Error saving invoice template', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system configuration</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'company', label: 'Company' },
          { id: 'branches', label: 'Branches' },
          { id: 'users', label: 'Users' },
          { id: 'tax', label: 'Tax Settings' },
          { id: 'invoice', label: 'Invoice Template' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* COMPANY TAB */}
      {activeTab === 'company' && (
        <Card>
          <div className="max-w-2xl space-y-4">
            <Input
              label="Company Name"
              value={company.name || ''}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              placeholder="Your company name"
            />
            <Input
              label="Address"
              value={company.address || ''}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
              placeholder="Street address"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={company.city || ''}
                onChange={(e) => setCompany({ ...company, city: e.target.value })}
                placeholder="City"
              />
              <Input
                label="Country"
                value={company.country || ''}
                onChange={(e) => setCompany({ ...company, country: e.target.value })}
                placeholder="Country"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                value={company.phone || ''}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                placeholder="+971 XX XXX XXXX"
              />
              <Input
                label="Email"
                type="email"
                value={company.email || ''}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                placeholder="info@company.com"
              />
            </div>
            <Input
              label="Website"
              value={company.website || ''}
              onChange={(e) => setCompany({ ...company, website: e.target.value })}
              placeholder="https://www.company.com"
            />
            <Input
              label="Tax Number"
              value={company.tax_number || ''}
              onChange={(e) => setCompany({ ...company, tax_number: e.target.value })}
              placeholder="VAT or Tax ID"
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Currency"
                value={company.currency || 'AED'}
                onChange={(e) => setCompany({ ...company, currency: e.target.value })}
                options={[
                  { value: 'AED', label: 'AED - United Arab Emirates Dirham' },
                  { value: 'USD', label: 'USD - US Dollar' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'GBP', label: 'GBP - British Pound' },
                ]}
              />
              <Input
                label="Currency Symbol"
                value={company.currency_symbol || ''}
                onChange={(e) => setCompany({ ...company, currency_symbol: e.target.value })}
                placeholder="د.إ"
              />
            </div>
            <div className="pt-4 flex gap-3 justify-end border-t border-slate-200">
              <Button variant="secondary">Cancel</Button>
              <Button onClick={handleSaveCompany} loading={companyLoading}>Save Company Settings</Button>
            </div>
          </div>
        </Card>
      )}

      {/* BRANCHES TAB */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button leftIcon={<Plus size={16} />} onClick={() => { resetBranchForm(); setShowBranchModal(true); }}>
              Add Branch
            </Button>
          </div>

          <Card>
            {loading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : branches.length > 0 ? (
              <Table
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'code', label: 'Code' },
                  { key: 'city', label: 'City', render: (_, row) => (row as any).address?.split(',')[0] || '-' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'email', label: 'Email' },
                  {
                    key: 'is_active',
                    label: 'Status',
                    render: (v) => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Active' : 'Inactive'}</Badge>,
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (_, row) => (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditBranch(row)}
                        >
                          Edit
                        </Button>
                        {row.is_active && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDeactivateBranch(row.id)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
                data={branches}
              />
            ) : (
              <EmptyState
                title="No branches"
                description="Add your first branch to get started"
                size="sm"
              />
            )}
          </Card>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button leftIcon={<Plus size={16} />} onClick={() => setShowUserModal(true)}>
              Add User
            </Button>
          </div>

          <Card>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> To add new users, invite them using the form below. They will receive an invitation link via email.
              </p>
            </div>

            {loading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : users.length > 0 ? (
              <Table
                columns={[
                  {
                    key: 'full_name',
                    label: 'User',
                    render: (v, row) => (
                      <div className="flex items-center gap-3">
                        <Avatar name={v} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900">{v}</p>
                          <p className="text-xs text-slate-500">{(row as any).email}</p>
                        </div>
                      </div>
                    ),
                  },
                  { key: 'role', label: 'Role', render: (v) => <Badge>{v}</Badge> },
                  {
                    key: 'is_active',
                    label: 'Status',
                    render: (v) => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Active' : 'Inactive'}</Badge>,
                  },
                  { key: 'last_login', label: 'Last Login', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: () => (
                      <Button size="sm" variant="secondary">Edit Role</Button>
                    ),
                  },
                ]}
                data={users}
              />
            ) : (
              <EmptyState
                title="No users"
                description="Add your first user to get started"
                size="sm"
              />
            )}
          </Card>
        </div>
      )}

      {/* TAX SETTINGS TAB */}
      {activeTab === 'tax' && (
        <Card>
          <div className="max-w-2xl space-y-4">
            <Input
              label="Default Tax Rate (%)"
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value))}
              min={0}
              max={100}
              step={0.1}
            />
            <div className="pt-4 flex gap-3 justify-end border-t border-slate-200">
              <Button variant="secondary">Cancel</Button>
              <Button>Save Tax Settings</Button>
            </div>
          </div>
        </Card>
      )}

      {/* INVOICE TEMPLATE TAB */}
      {activeTab === 'invoice' && (
        <div className="space-y-4">
          <Card title="Invoice Template Settings">
            <div className="space-y-4">
              <Input
                label="Invoice Notes"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Notes to include in all invoices"
                multiline
                rows={3}
              />
              <Input
                label="Payment Terms"
                value={invoiceTerms}
                onChange={(e) => setInvoiceTerms(e.target.value)}
                placeholder="e.g., Payment due within 30 days"
                multiline
                rows={3}
              />
              <Input
                label="Payment Instructions"
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Bank details, payment methods, etc."
                multiline
                rows={3}
              />
              <div className="pt-4 flex gap-3 justify-end border-t border-slate-200">
                <Button variant="secondary">Cancel</Button>
                <Button onClick={handleSaveInvoiceTemplate}>Save Template</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add/Edit Branch Modal */}
      <Modal
        isOpen={showBranchModal}
        onClose={() => { setShowBranchModal(false); resetBranchForm(); }}
        title={editingBranchId ? 'Edit Branch' : 'Add Branch'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Branch Name"
            value={branchForm.name}
            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
            placeholder="Branch name"
          />
          <Input
            label="Branch Code"
            value={branchForm.code}
            onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
            placeholder="e.g., BR001"
          />
          <Input
            label="Address"
            value={branchForm.address}
            onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
            placeholder="Full address"
          />
          <Input
            label="Phone"
            type="tel"
            value={branchForm.phone}
            onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
            placeholder="+971 XX XXX XXXX"
          />
          <Input
            label="Email"
            type="email"
            value={branchForm.email}
            onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
            placeholder="branch@company.com"
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => { setShowBranchModal(false); resetBranchForm(); }}>Cancel</Button>
            <Button onClick={handleSaveBranch}>{editingBranchId ? 'Update' : 'Add'} Branch</Button>
          </div>
        </div>
      </Modal>

      {/* Invite User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => { setShowUserModal(false); setInviteEmail(''); setInviteLink(''); }}
        title="Invite User"
        size="md"
      >
        <div className="space-y-4">
          {!inviteLink ? (
            <>
              <Input
                label="Email Address"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
              <p className="text-sm text-slate-600">
                The user will receive an invitation email with a link to set up their account.
              </p>
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancel</Button>
                <Button onClick={handleGenerateInvite}>Generate Invite Link</Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">Invitation link generated! Copy and share with the user.</p>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Input
                  value={inviteLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Copy size={14} />}
                  onClick={handleCopyInviteLink}
                >
                  Copy
                </Button>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <Button variant="secondary" onClick={() => { setShowUserModal(false); setInviteEmail(''); setInviteLink(''); }}>Done</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
