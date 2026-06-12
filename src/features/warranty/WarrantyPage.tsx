import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatDate } from '../../lib/utils';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import type { Warranty, WarrantyClaim, Product, Customer, Invoice } from '../../types';

interface WarrantyWithDetails extends Warranty {
  product?: Product;
  customer?: Customer;
  status: 'active' | 'expired' | 'expiring_soon';
}

interface WarrantyRegistrationForm {
  product_id: string;
  customer_id: string;
  invoice_id: string;
  serial_number: string;
  purchase_date: string;
  warranty_period_months: number;
}

interface ClaimForm {
  warranty_id: string;
  issue_description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'rejected';
}

export function WarrantyPage() {
  const [activeTab, setActiveTab] = useState('registrations');
  const showToast = useUiStore((state) => state.showToast);

  // Registrations
  const [warranties, setWarranties] = useState<WarrantyWithDetails[]>([]);
  const [filteredWarranties, setFilteredWarranties] = useState<WarrantyWithDetails[]>([]);
  const [warrantySearch, setWarrantySearch] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [registrationForm, setRegistrationForm] = useState<WarrantyRegistrationForm>({
    product_id: '',
    customer_id: '',
    invoice_id: '',
    serial_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    warranty_period_months: 12,
  });

  // Claims
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<WarrantyClaim[]>([]);
  const [claimSearch, setClaimSearch] = useState('');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showClaimStatusModal, setShowClaimStatusModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);

  const [claimForm, setClaimForm] = useState<ClaimForm>({
    warranty_id: '',
    issue_description: '',
    status: 'open',
  });

  const [claimStatusForm, setClaimStatusForm] = useState<'open' | 'in_progress' | 'resolved' | 'rejected'>('open');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'registrations') {
      loadWarranties();
    } else if (activeTab === 'claims') {
      loadClaims();
    }
  }, [activeTab]);

  useEffect(() => {
    filterWarranties();
  }, [warrantySearch, warranties]);

  useEffect(() => {
    filterClaims();
  }, [claimSearch, claims]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadCustomers(),
        loadInvoices(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      showToast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadWarranties = async () => {
    try {
      const { data } = await supabase
        .from('warranties')
        .select('*, product:products(*), customer:customers(*)')
        .order('expiry_date', { ascending: true });

      const enriched = (data || []).map(w => {
        const now = new Date();
        const expiry = new Date(w.expiry_date);
        const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let status: 'active' | 'expired' | 'expiring_soon';
        if (daysUntilExpiry < 0) {
          status = 'expired';
        } else if (daysUntilExpiry <= 30) {
          status = 'expiring_soon';
        } else {
          status = 'active';
        }

        return { ...w, status };
      });

      setWarranties(enriched);
    } catch (error) {
      console.error('Error loading warranties:', error);
      showToast('Error loading warranties', 'error');
    }
  };

  const loadClaims = async () => {
    try {
      const { data } = await supabase
        .from('warranty_claims')
        .select('*, warranty:warranties(*, product:products(*), customer:customers(*))')
        .order('claim_date', { ascending: false });

      setClaims(data || []);
    } catch (error) {
      console.error('Error loading claims:', error);
      showToast('Error loading claims', 'error');
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
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

  const loadInvoices = async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const filterWarranties = () => {
    let filtered = warranties;

    if (warrantySearch) {
      filtered = filtered.filter(w =>
        w.product?.name?.toLowerCase().includes(warrantySearch.toLowerCase()) ||
        w.customer?.name?.toLowerCase().includes(warrantySearch.toLowerCase()) ||
        w.serial_number?.toLowerCase().includes(warrantySearch.toLowerCase())
      );
    }

    setFilteredWarranties(filtered);
  };

  const filterClaims = () => {
    let filtered = claims;

    if (claimSearch) {
      filtered = filtered.filter(c =>
        c.claim_number?.toLowerCase().includes(claimSearch.toLowerCase()) ||
        (c.warranty as any)?.product?.name?.toLowerCase().includes(claimSearch.toLowerCase())
      );
    }

    setFilteredClaims(filtered);
  };

  const handleRegisterWarranty = async () => {
    if (!registrationForm.product_id || !registrationForm.customer_id || !registrationForm.purchase_date) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    try {
      const purchaseDate = new Date(registrationForm.purchase_date);
      const expiryDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + registrationForm.warranty_period_months, purchaseDate.getDate());

      const { error } = await supabase.from('warranties').insert([
        {
          ...registrationForm,
          expiry_date: expiryDate.toISOString().split('T')[0],
          warranty_number: `WAR-${Date.now()}`,
        },
      ]);

      if (error) throw error;

      showToast('Warranty registered successfully', 'success');
      setShowRegisterModal(false);
      setRegistrationForm({
        product_id: '',
        customer_id: '',
        invoice_id: '',
        serial_number: '',
        purchase_date: new Date().toISOString().split('T')[0],
        warranty_period_months: 12,
      });
      loadWarranties();
    } catch (error) {
      console.error('Error registering warranty:', error);
      showToast('Error registering warranty', 'error');
    }
  };

  const handleAddClaim = async () => {
    if (!claimForm.warranty_id || !claimForm.issue_description) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    try {
      const { error } = await supabase.from('warranty_claims').insert([
        {
          ...claimForm,
          claim_number: `CLAIM-${Date.now()}`,
          claim_date: new Date().toISOString().split('T')[0],
          status: 'open',
        },
      ]);

      if (error) throw error;

      showToast('Claim created successfully', 'success');
      setShowClaimModal(false);
      setClaimForm({
        warranty_id: '',
        issue_description: '',
        status: 'open',
      });
      loadClaims();
    } catch (error) {
      console.error('Error creating claim:', error);
      showToast('Error creating claim', 'error');
    }
  };

  const handleUpdateClaimStatus = async () => {
    if (!selectedClaim) return;

    try {
      const updateData: any = { status: claimStatusForm };
      if (claimStatusForm === 'resolved') {
        updateData.resolved_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('warranty_claims')
        .update(updateData)
        .eq('id', selectedClaim.id);

      if (error) throw error;

      showToast('Claim status updated', 'success');
      setShowClaimStatusModal(false);
      setSelectedClaim(null);
      loadClaims();
    } catch (error) {
      console.error('Error updating claim:', error);
      showToast('Error updating claim', 'error');
    }
  };

  const expiringWarranties = warranties.filter(w => w.status === 'expiring_soon');
  const expiredWarranties = warranties.filter(w => w.status === 'expired');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Warranty Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track warranties and claims</p>
        </div>
      </div>

      {/* Alerts */}
      {expiringWarranties.length > 0 && (
        <Card className="bg-warning-50 border border-warning-200">
          <div className="flex gap-3">
            <AlertTriangle className="text-warning-600 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="font-medium text-warning-900">
                {expiringWarranties.length} warranty/warranties expiring within 30 days
              </p>
              <div className="mt-2 space-y-1">
                {expiringWarranties.slice(0, 3).map(w => (
                  <p key={w.id} className="text-sm text-warning-800">
                    {w.product?.name} ({w.customer?.name}) - Expires {formatDate(w.expiry_date)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Tabs
        tabs={[
          { id: 'registrations', label: 'Registrations' },
          { id: 'claims', label: 'Claims' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* REGISTRATIONS TAB */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                leftIcon={<Search size={16} />}
                placeholder="Search warranties..."
                value={warrantySearch}
                onChange={(e) => setWarrantySearch(e.target.value)}
              />
            </div>
            <Button leftIcon={<Plus size={16} />} onClick={() => setShowRegisterModal(true)}>
              Register Warranty
            </Button>
          </div>

          <Card>
            {loading ? (
              <SkeletonTable rows={5} cols={6} />
            ) : filteredWarranties.length > 0 ? (
              <Table
                columns={[
                  { key: 'warranty_number', label: 'Warranty#' },
                  {
                    key: 'product_id',
                    label: 'Product',
                    render: (_, row) => (row as any).product?.name || '-',
                  },
                  {
                    key: 'customer_id',
                    label: 'Customer',
                    render: (_, row) => (row as any).customer?.name || '-',
                  },
                  { key: 'purchase_date', label: 'Purchase Date', render: (v) => formatDate(v) },
                  { key: 'expiry_date', label: 'Expiry Date', render: (v) => formatDate(v) },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (_, row) => {
                      const status = (row as any).status;
                      const colors: Record<string, string> = {
                        active: 'bg-green-100 text-green-700',
                        expiring_soon: 'bg-yellow-100 text-yellow-700',
                        expired: 'bg-red-100 text-red-700',
                      };
                      return (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
                          {status === 'expiring_soon' ? 'Expiring Soon' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      );
                    },
                  },
                ]}
                data={filteredWarranties}
              />
            ) : (
              <EmptyState
                title="No warranties found"
                description="Register your first warranty to get started"
                size="sm"
              />
            )}
          </Card>
        </div>
      )}

      {/* CLAIMS TAB */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                leftIcon={<Search size={16} />}
                placeholder="Search claims..."
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
              />
            </div>
            <Button leftIcon={<Plus size={16} />} onClick={() => setShowClaimModal(true)}>
              New Claim
            </Button>
          </div>

          <Card>
            {loading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : filteredClaims.length > 0 ? (
              <div className="space-y-2">
                {filteredClaims.map(claim => (
                  <div
                    key={claim.id}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{claim.claim_number}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {(claim.warranty as any)?.product?.name} - {(claim.warranty as any)?.customer?.name}
                        </p>
                        <p className="text-sm text-slate-500 mt-2">{claim.issue_description}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <StatusBadge status={claim.status} />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedClaim(claim);
                            setClaimStatusForm(claim.status);
                            setShowClaimStatusModal(true);
                          }}
                        >
                          Update Status
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No claims found"
                description="Create a new warranty claim to get started"
                size="sm"
              />
            )}
          </Card>
        </div>
      )}

      {/* Register Warranty Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register Warranty"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Product"
            value={registrationForm.product_id}
            onChange={(e) => setRegistrationForm({ ...registrationForm, product_id: e.target.value })}
            options={products.map(p => ({ value: p.id, label: p.name }))}
          />
          <Select
            label="Customer"
            value={registrationForm.customer_id}
            onChange={(e) => setRegistrationForm({ ...registrationForm, customer_id: e.target.value })}
            options={customers.map(c => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Invoice (Optional)"
            value={registrationForm.invoice_id}
            onChange={(e) => setRegistrationForm({ ...registrationForm, invoice_id: e.target.value })}
            options={[
              { value: '', label: 'Select an invoice' },
              ...invoices.map(i => ({ value: i.id, label: i.invoice_number })),
            ]}
          />
          <Input
            label="Serial Number"
            value={registrationForm.serial_number}
            onChange={(e) => setRegistrationForm({ ...registrationForm, serial_number: e.target.value })}
            placeholder="Product serial number"
          />
          <Input
            label="Purchase Date"
            type="date"
            value={registrationForm.purchase_date}
            onChange={(e) => setRegistrationForm({ ...registrationForm, purchase_date: e.target.value })}
          />
          <Input
            label="Warranty Period (Months)"
            type="number"
            value={registrationForm.warranty_period_months}
            onChange={(e) => setRegistrationForm({ ...registrationForm, warranty_period_months: parseInt(e.target.value) })}
            min={1}
            max={60}
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowRegisterModal(false)}>Cancel</Button>
            <Button onClick={handleRegisterWarranty}>Register Warranty</Button>
          </div>
        </div>
      </Modal>

      {/* New Claim Modal */}
      <Modal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        title="New Warranty Claim"
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Warranty"
            value={claimForm.warranty_id}
            onChange={(e) => setClaimForm({ ...claimForm, warranty_id: e.target.value })}
            options={warranties.map(w => ({
              value: w.id,
              label: `${w.warranty_number} - ${w.product?.name} (${w.customer?.name})`,
            }))}
          />
          <Input
            label="Issue Description"
            value={claimForm.issue_description}
            onChange={(e) => setClaimForm({ ...claimForm, issue_description: e.target.value })}
            placeholder="Describe the issue"
            multiline
            rows={4}
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowClaimModal(false)}>Cancel</Button>
            <Button onClick={handleAddClaim}>Create Claim</Button>
          </div>
        </div>
      </Modal>

      {/* Update Claim Status Modal */}
      <Modal
        isOpen={showClaimStatusModal}
        onClose={() => { setShowClaimStatusModal(false); setSelectedClaim(null); }}
        title="Update Claim Status"
        size="sm"
      >
        {selectedClaim && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600">Claim: <span className="font-medium">{selectedClaim.claim_number}</span></p>
            </div>
            <Select
              label="Status"
              value={claimStatusForm}
              onChange={(e) => setClaimStatusForm(e.target.value as any)}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => { setShowClaimStatusModal(false); setSelectedClaim(null); }}>Cancel</Button>
              <Button onClick={handleUpdateClaimStatus}>Update Status</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
