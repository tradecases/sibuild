import React, { useState, useEffect } from 'react';
import { Plus, Grid3x3, List, Edit2, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { useUiStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { Table, Column } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { ProductForm } from './ProductForm';
import type { Product } from '../../types';

type ViewMode = 'list' | 'grid';

export function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });
  const toast = useUiStore.getState().toast;

  useEffect(() => {
    loadCategories();
    loadBrands();
    loadProducts();
  }, [page, search, selectedCategory, selectedBrand, selectedStatus]);

  const loadCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('id, name').eq('is_active', true);
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const { data } = await supabase.from('brands').select('id, name').eq('is_active', true);
      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*, category:categories(name), brand:brands(name)', { count: 'exact' });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }
      if (selectedBrand) {
        query = query.eq('brand_id', selectedBrand);
      }
      if (selectedStatus === 'active') {
        query = query.eq('is_active', true);
      } else if (selectedStatus === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      setProducts(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      toast.success('Product deleted successfully');
      setDeleteConfirm({ open: false });
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleProductSaved = () => {
    setFormOpen(false);
    setPage(1);
    loadProducts();
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      label: 'Product Name',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
            📦
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.sku || 'N/A'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (_, row) => (
        <p className="text-sm">{(row.category as any)?.name || 'N/A'}</p>
      ),
    },
    {
      key: 'brand',
      label: 'Brand',
      render: (_, row) => (
        <p className="text-sm">{(row.brand as any)?.name || 'N/A'}</p>
      ),
    },
    {
      key: 'selling_price',
      label: 'Selling Price',
      align: 'right',
      render: (value) => (
        <p className="font-medium">{formatCurrency(value as number)}</p>
      ),
    },
    {
      key: 'cost_price',
      label: 'Cost Price',
      align: 'right',
      render: (value) => (
        <p className="text-sm text-slate-600">{formatCurrency(value as number)}</p>
      ),
    },
    {
      key: 'stock_levels',
      label: 'Stock',
      align: 'right',
      render: (_, row) => {
        const total = row.stock_levels?.reduce((sum, sl) => sum + (sl.quantity || 0), 0) || 0;
        return <p className="font-medium">{total} units</p>;
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <Badge variant={value ? 'success' : 'danger'} dot>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      align: 'right',
      render: (value) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => navigate(`/inventory/products/${value}`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => navigate(`/inventory/products/${value}/edit`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm({ open: true, id: value as string })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const gridView = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map(product => (
        <div
          key={product.id}
          className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-card transition-shadow group cursor-pointer"
          onClick={() => navigate(`/inventory/products/${product.id}`)}
        >
          <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-4xl group-hover:bg-slate-200 transition-colors">
            📦
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-slate-900 line-clamp-2">{product.name}</h3>
              <Badge
                variant={product.is_active ? 'success' : 'danger'}
                dot
                size="sm"
              >
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mb-3">{product.sku || 'N/A'}</p>
            <div className="space-y-1 mb-4 text-sm">
              <p className="text-slate-600">{formatCurrency(product.selling_price)}</p>
              <p className="text-xs text-slate-500">{(product.category as any)?.name || 'N/A'}</p>
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/inventory/products/${product.id}/edit`);
                }}
                className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm({ open: true, id: product.id });
                }}
                className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-danger-600 hover:bg-danger-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <Badge className="mt-2">{total} Products</Badge>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
          New Product
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search products..." />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Brands</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid3x3 size={18} />
            </button>
          </div>
        </div>
      </Card>

      {/* Content */}
      <Card>
        {loading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Start by creating your first product"
            action={{ label: 'New Product', onClick: () => setFormOpen(true), icon: <Plus size={16} /> }}
            size="lg"
          />
        ) : viewMode === 'list' ? (
          <>
            <Table columns={columns} data={products} onRowClick={(product) => navigate(`/inventory/products/${product.id}`)} />
            <div className="mt-6">
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </div>
          </>
        ) : (
          <>
            {gridView}
            <div className="mt-6">
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      <ProductForm isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={handleProductSaved} />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false })}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
