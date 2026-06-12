import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { Customer, CustomerType } from '../../types';

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  customerId?: string;
  initialData?: Customer;
}

interface FormData {
  name: string;
  code: string;
  type: CustomerType;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_number: string;
  credit_limit: number;
  discount_percentage: number;
  notes: string;
  is_active: boolean;
}

const defaultForm: FormData = {
  name: '',
  code: '',
  type: 'retail',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  tax_number: '',
  credit_limit: 0,
  discount_percentage: 0,
  notes: '',
  is_active: true,
};

const customerTypes: Array<{ value: CustomerType; label: string }> = [
  { value: 'retail', label: 'Retail' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'builder', label: 'Builder' },
  { value: 'architect', label: 'Architect' },
  { value: 'interior_designer', label: 'Interior Designer' },
  { value: 'corporate', label: 'Corporate' },
];

export function CustomerForm({ isOpen, onClose, onSaved, customerId, initialData }: CustomerFormProps) {
  const [form, setForm] = useState<FormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const toast = useUiStore.getState().toast;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm(initialData as FormData);
      } else {
        setForm(defaultForm);
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      setForm(prev => ({ ...prev, [name]: Number(value) || 0 }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const generateCode = async () => {
    try {
      const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' });
      const newCode = `CUST-${String((count || 0) + 1).padStart(4, '0')}`;
      setForm(prev => ({ ...prev, code: newCode }));
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (form.credit_limit < 0) {
      toast.error('Credit limit cannot be negative');
      return;
    }
    if (form.discount_percentage < 0 || form.discount_percentage > 100) {
      toast.error('Discount percentage must be between 0 and 100');
      return;
    }

    setLoading(true);
    try {
      if (customerId) {
        const { error } = await supabase
          .from('customers')
          .update(form)
          .eq('id', customerId);
        if (error) throw error;
        toast.success('Customer updated successfully');
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([form]);
        if (error) throw error;
        toast.success('Customer created successfully');
      }
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerId ? 'Edit Customer' : 'New Customer'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>
            {customerId ? 'Update' : 'Create'} Customer
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <Input
              label="Customer Name *"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter customer name"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Customer Code</label>
                <div className="flex gap-2">
                  <Input
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="Auto-generated"
                    className="flex-1"
                  />
                  {!customerId && (
                    <Button variant="secondary" onClick={generateCode} size="sm">Generate</Button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Customer Type *</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {customerTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="customer@example.com"
            />
            <Input
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+971 50 123 4567"
            />
          </div>
        </div>

        {/* Address Information */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Address Information</h3>
          <div className="space-y-4">
            <Input
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Street address"
            />
            <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* Business Information */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Business Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tax Number"
              name="tax_number"
              value={form.tax_number}
              onChange={handleChange}
              placeholder="VAT/Tax ID"
            />
            <Input
              label="Credit Limit"
              name="credit_limit"
              type="number"
              value={form.credit_limit}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
            <Input
              label="Discount %"
              name="discount_percentage"
              type="number"
              value={form.discount_percentage}
              onChange={handleChange}
              step="0.01"
              min="0"
              max="100"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Additional notes about this customer"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Status */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
            className="rounded border-slate-200"
          />
          <span className="text-sm font-medium text-slate-700">Active</span>
        </label>
      </div>
    </Modal>
  );
}
