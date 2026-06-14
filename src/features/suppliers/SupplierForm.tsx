import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import type { Supplier } from '../../types';

interface FormData {
  name: string;
  code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_number: string;
  payment_terms: number;
  credit_limit: number;
  discount_percentage: number;
  notes: string;
  is_active: boolean;
}

const defaultForm: FormData = {
  name: '',
  code: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'Bangladesh',
  tax_number: '',
  payment_terms: 30,
  credit_limit: 0,
  discount_percentage: 0,
  notes: '',
  is_active: true,
};

export function SupplierForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useUiStore();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<FormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadSupplier();
    }
  }, [id]);

  const loadSupplier = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setForm({
          name: data.name || '',
          code: data.code || '',
          contact_person: data.contact_person || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || 'Bangladesh',
          tax_number: data.tax_number || '',
          payment_terms: data.payment_terms || 30,
          credit_limit: data.credit_limit || 0,
          discount_percentage: data.discount_percentage || 0,
          notes: data.notes || '',
          is_active: data.is_active ?? true,
        });
      }
    } catch (err) {
      console.error('Error loading supplier:', err);
      toast({ message: 'Failed to load supplier', type: 'error' });
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ message: 'Supplier name is required', type: 'error' });
      return;
    }

    try {
      setSaving(true);

      if (isEditing) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            ...form,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
        toast({ message: 'Supplier updated successfully', type: 'success' });
      } else {
        // Generate supplier code if not provided
        const supplierData = { ...form };
        if (!supplierData.code) {
          const { count } = await supabase
            .from('suppliers')
            .select('*', { count: 'exact', head: true });
          supplierData.code = `SUP-${String((count || 0) + 1).padStart(4, '0')}`;
        }

        const { error } = await supabase
          .from('suppliers')
          .insert([supplierData]);

        if (error) throw error;
        toast({ message: 'Supplier created successfully', type: 'success' });
      }

      navigate('/suppliers');
    } catch (err) {
      console.error('Error saving supplier:', err);
      toast({ message: 'Failed to save supplier', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      setForm(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isEditing ? 'Edit Supplier' : 'New Supplier'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isEditing ? 'Update supplier information' : 'Add a new supplier to your network'}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/suppliers')}>
          Cancel
        </Button>
      </div>

      {/* Form */}
      <Card>
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Supplier Name *"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Company or business name"
              />
              <Input
                label="Supplier Code"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="Auto-generated if empty"
              />
              <Input
                label="Contact Person"
                name="contact_person"
                value={form.contact_person}
                onChange={handleChange}
                placeholder="Primary contact name"
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+880 XX XXX XXXX"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="supplier@example.com"
              />
              <Input
                label="Tax Number"
                name="tax_number"
                value={form.tax_number}
                onChange={handleChange}
                placeholder="VAT/TIN number"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Street Address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Full address"
                />
              </div>
              <Input
                label="City"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="City"
              />
              <Input
                label="Country"
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="Country"
              />
            </div>
          </div>

          {/* Financial Terms */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Financial Terms</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Payment Terms (days)"
                name="payment_terms"
                type="number"
                value={form.payment_terms}
                onChange={handleChange}
                min={0}
                placeholder="30"
              />
              <Input
                label="Credit Limit"
                name="credit_limit"
                type="number"
                value={form.credit_limit}
                onChange={handleChange}
                min={0}
                step="0.01"
                placeholder="0.00"
              />
              <Input
                label="Discount Percentage (%)"
                name="discount_percentage"
                type="number"
                value={form.discount_percentage}
                onChange={handleChange}
                min={0}
                max={100}
                step="0.1"
                placeholder="0"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Discount percentage applied to purchase orders from this supplier
            </p>
          </div>

          {/* Additional Info */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Additional notes about this supplier"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Active (can receive orders)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => navigate('/suppliers')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              {isEditing ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
