import React, { useState, useEffect } from 'react';
import { Plus, Edit, UserCheck, UserX, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import type { CompanySettings, Branch, Profile, Brand } from '../../types';

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
  password: string;
  role: string;
  branch_id: string;
  is_active: boolean;
}

interface BrandForm {
  name: string;
  description: string;
  is_active: boolean;
}

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin - Full system access' },
  { value: 'manager', label: 'Manager - Operational management' },
  { value: 'sales', label: 'Sales Executive - Sales and quotations' },
  { value: 'inventory', label: 'Inventory Manager - Inventory and warehouse' },
  { value: 'accountant', label: 'Accountant - Financial management' },
  { value: 'delivery', label: 'Delivery - Delivery operations' },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  sales: 'Sales Executive',
  inventory: 'Inventory Manager',
  accountant: 'Accountant',
  delivery: 'Delivery',
};

const CURRENCY_OPTIONS = [
  { value: 'BDT', label: 'BDT - Bangladeshi Taka' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: '৳',
  AED: 'AED',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  SAR: 'SAR',
};

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const toast = useUiStore((state) => state.toast);

  // Company
  const [company, setCompany] = useState<CompanyForm>({
    name: '',
    address: '',
    city: '',
    country: 'Bangladesh',
    phone: '',
    email: '',
    website: '',
    tax_number: '',
    currency: 'BDT',
    currency_symbol: '৳',
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserForm>({
    full_name: '',
    email: '',
    password: '',
    role: 'sales',
    branch_id: '',
    is_active: true,
  });
  const [savingUser, setSavingUser] = useState(false);

  // Brands
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [brandForm, setBrandForm] = useState<BrandForm>({
    name: '',
    description: '',
    is_active: true,
  });

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
    } else if (activeTab === 'brands') {
      loadBrands();
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
        loadBrands(),
        loadUsers(),
      ]);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error loading settings');
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
      toast.error('Error loading branches');
    }
  };

  const loadBrands = async () => {
    try {
      const { data } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: true });

      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
      toast.error('Error loading brands');
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
      toast.error('Error loading users');
    }
  };

  const loadInvoiceTemplate = async () => {
    try {
      const { data } = await supabase
        .from('company_settings')
        .select('invoice_notes, invoice_terms')
        .single();

      if (data) {
        setInvoiceNotes(data.invoice_notes || 'Thank you for your business!');
        setInvoiceTerms(data.invoice_terms || 'Payment due within 30 days of invoice date.');
      }
      setPaymentInstructions('Please transfer payment to our account or pay in cash.');
    } catch (error) {
      console.error('Error loading invoice template:', error);
    }
  };

  const handleSaveCompany = async () => {
    setCompanyLoading(true);
    try {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .single();

      const { error } = await supabase
        .from('company_settings')
        .update(company)
        .eq('id', company.id || existing?.id);

      if (error) throw error;

      toast.success('Company settings saved successfully');
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error('Error saving company settings');
    } finally {
      setCompanyLoading(false);
    }
  };

  const handleSaveBranch = async () => {
    if (!branchForm.name || !branchForm.code) {
      toast.warning('Please fill all required fields');
      return;
    }

    try {
      if (editingBranchId) {
        const { error } = await supabase
          .from('branches')
          .update(branchForm)
          .eq('id', editingBranchId);
        if (error) throw error;
        toast.success('Branch updated successfully');
      } else {
        const { error } = await supabase
          .from('branches')
          .insert([branchForm]);
        if (error) throw error;
        toast.success('Branch created successfully');
      }

      setShowBranchModal(false);
      resetBranchForm();
      loadBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      toast.error('Error saving branch');
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

      toast.success('Branch deactivated');
      loadBranches();
    } catch (error) {
      console.error('Error deactivating branch:', error);
      toast.error('Error deactivating branch');
    }
  };

  // Brand management functions
  const resetBrandForm = () => {
    setBrandForm({
      name: '',
      description: '',
      is_active: true,
    });
    setEditingBrandId(null);
  };

  const handleEditBrand = (brand: Brand) => {
    setBrandForm({
      name: brand.name,
      description: brand.description || '',
      is_active: brand.is_active,
    });
    setEditingBrandId(brand.id);
    setShowBrandModal(true);
  };

  const handleSaveBrand = async () => {
    if (!brandForm.name) {
      toast.warning('Please enter brand name');
      return;
    }

    try {
      if (editingBrandId) {
        const { error } = await supabase
          .from('brands')
          .update(brandForm)
          .eq('id', editingBrandId);
        if (error) throw error;
        toast.success('Brand updated successfully');
      } else {
        const { error } = await supabase
          .from('brands')
          .insert([brandForm]);
        if (error) throw error;
        toast.success('Brand created successfully');
      }

      setShowBrandModal(false);
      resetBrandForm();
      loadBrands();
    } catch (error) {
      console.error('Error saving brand:', error);
      toast.error('Error saving brand');
    }
  };

  const handleDeactivateBrand = async (brandId: string) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update({ is_active: false })
        .eq('id', brandId);

      if (error) throw error;

      toast.success('Brand deactivated');
      loadBrands();
    } catch (error) {
      console.error('Error deactivating brand:', error);
      toast.error('Error deactivating brand');
    }
  };

  // User management functions
  const resetUserForm = () => {
    setUserForm({
      full_name: '',
      email: '',
      password: '',
      role: 'sales',
      branch_id: '',
      is_active: true,
    });
    setEditingUserId(null);
  };

  const handleEditUser = (user: Profile) => {
    setUserForm({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
      branch_id: user.branch_id || '',
      is_active: user.is_active,
    });
    setEditingUserId(user.id);
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.full_name || !userForm.email) {
      toast.warning('Please fill all required fields');
      return;
    }

    if (!editingUserId && !userForm.password) {
      toast.warning('Please enter a password for new users');
      return;
    }

    if (userForm.password && userForm.password.length < 6) {
      toast.warning('Password must be at least 6 characters');
      return;
    }

    setSavingUser(true);
    try {
      if (editingUserId) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: userForm.full_name,
            role: userForm.role,
            branch_id: userForm.branch_id || null,
            is_active: userForm.is_active,
          })
          .eq('id', editingUserId);

        if (error) throw error;
        toast.success('User updated successfully');
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userForm.email,
          password: userForm.password,
          options: {
            data: {
              full_name: userForm.full_name,
              role: userForm.role,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          await supabase
            .from('profiles')
            .update({
              branch_id: userForm.branch_id || null,
              is_active: userForm.is_active,
            })
            .eq('id', authData.user.id);
        }

        toast.success('User created successfully');
      }

      setShowUserModal(false);
      resetUserForm();
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Email already registered');
      } else {
        toast.error('Error saving user');
      }
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: Profile) => {
    try {
      const newStatus = !user.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(newStatus ? 'User activated' : 'User deactivated');
      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Error updating user status');
    }
  };

  const handleSaveInvoiceTemplate = async () => {
    try {
      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .single();

      const { error } = await supabase
        .from('company_settings')
        .update({
          invoice_notes: invoiceNotes,
          invoice_terms: invoiceTerms,
        })
        .eq('id', existing?.id);

      if (error) throw error;
      toast.success('Invoice template saved successfully');
    } catch (error) {
      console.error('Error saving invoice template:', error);
      toast.error('Error saving invoice template');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'danger';
      case 'manager':
        return 'warning';
      case 'sales':
        return 'info';
      case 'inventory':
        return 'success';
      case 'accountant':
        return 'default';
      case 'delivery':
        return 'secondary';
      default:
        return 'default';
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
          { id: 'brands', label: 'Brands' },
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
                placeholder="+880 XX XXX XXXX"
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
                value={company.currency || 'BDT'}
                onChange={(e) => setCompany({
                  ...company,
                  currency: e.target.value,
                  currency_symbol: CURRENCY_SYMBOLS[e.target.value] || e.target.value
                })}
                options={CURRENCY_OPTIONS}
              />
              <Input
                label="Currency Symbol"
                value={company.currency_symbol || ''}
                onChange={(e) => setCompany({ ...company, currency_symbol: e.target.value })}
                placeholder="৳"
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

      {/* BRANDS TAB */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button leftIcon={<Plus size={16} />} onClick={() => { resetBrandForm(); setShowBrandModal(true); }}>
              Add Brand
            </Button>
          </div>

          <Card>
            {loading ? (
              <SkeletonTable rows={5} cols={4} />
            ) : brands.length > 0 ? (
              <Table
                columns={[
                  { key: 'name', label: 'Brand Name' },
                  { key: 'description', label: 'Description', render: (v) => v || '-' },
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
                          onClick={() => handleEditBrand(row)}
                        >
                          Edit
                        </Button>
                        {row.is_active && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDeactivateBrand(row.id)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
                data={brands}
              />
            ) : (
              <EmptyState
                title="No brands"
                description="Add your first brand to categorize products"
                size="sm"
              />
            )}
          </Card>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Shield size={16} />
              <span>Manage user roles and access permissions</span>
            </div>
            <Button leftIcon={<Plus size={16} />} onClick={() => { resetUserForm(); setShowUserModal(true); }}>
              Add User
            </Button>
          </div>

          {/* Role Legend */}
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <Badge variant={getRoleBadgeVariant(key)}>{label}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
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
                  {
                    key: 'role',
                    label: 'Role',
                    render: (v) => <Badge variant={getRoleBadgeVariant(v)}>{ROLE_LABELS[v] || v}</Badge>
                  },
                  {
                    key: 'is_active',
                    label: 'Status',
                    render: (v) => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Active' : 'Inactive'}</Badge>,
                  },
                  { key: 'last_login', label: 'Last Login', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (_, row) => (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Edit size={14} />}
                          onClick={() => handleEditUser(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={row.is_active ? 'secondary' : 'primary'}
                          leftIcon={row.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                          onClick={() => handleToggleUserStatus(row)}
                        >
                          {row.is_active ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
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
            placeholder="+880 XX XXX XXXX"
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

      {/* Add/Edit Brand Modal */}
      <Modal
        isOpen={showBrandModal}
        onClose={() => { setShowBrandModal(false); resetBrandForm(); }}
        title={editingBrandId ? 'Edit Brand' : 'Add Brand'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Brand Name"
            value={brandForm.name}
            onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
            placeholder="Brand name"
          />
          <Input
            label="Description"
            value={brandForm.description}
            onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
            placeholder="Brand description (optional)"
            multiline
            rows={3}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="brand_is_active"
              checked={brandForm.is_active}
              onChange={(e) => setBrandForm({ ...brandForm, is_active: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="brand_is_active" className="text-sm text-slate-700">
              Brand is active
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => { setShowBrandModal(false); resetBrandForm(); }}>Cancel</Button>
            <Button onClick={handleSaveBrand}>{editingBrandId ? 'Update' : 'Add'} Brand</Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => { setShowUserModal(false); resetUserForm(); }}
        title={editingUserId ? 'Edit User' : 'Add User'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={userForm.full_name}
            onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
            placeholder="User's full name"
          />
          <Input
            label="Email Address"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            placeholder="user@example.com"
            disabled={!!editingUserId}
          />
          {!editingUserId && (
            <Input
              label="Password"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              placeholder="Minimum 6 characters"
            />
          )}
          <Select
            label="Role"
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            options={ROLE_OPTIONS}
          />
          <Select
            label="Branch"
            value={userForm.branch_id}
            onChange={(e) => setUserForm({ ...userForm, branch_id: e.target.value })}
            options={[
              { value: '', label: 'No specific branch' },
              ...branches.filter(b => b.is_active).map(b => ({ value: b.id, label: b.name })),
            ]}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={userForm.is_active}
              onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700">
              User is active (can log in)
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => { setShowUserModal(false); resetUserForm(); }}>Cancel</Button>
            <Button onClick={handleSaveUser} loading={savingUser}>{editingUserId ? 'Update' : 'Add'} User</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
