import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Star, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency } from '../../lib/utils';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import type { Product, Category, Brand } from '../../types';

interface ProductWithDetails extends Product {
  category?: Category;
  brand?: Brand;
  images?: Array<{ url: string; alt_text: string }>;
  stock_levels?: Array<{ quantity: number; warehouse?: { name: string } }>;
}

export function CatalogPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });

  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [search, selectedCategory, selectedBrand, priceRange, products]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadCategories(),
        loadBrands(),
      ]);
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*), brand:brands(*), images:product_images(*), stock_levels(*)')
        .eq('is_active', true)
        .order('name', { ascending: true });

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      setBrands(data || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Search
    if (search) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Category
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    // Brand
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand_id === selectedBrand);
    }

    // Price range
    filtered = filtered.filter(p =>
      p.selling_price >= priceRange.min && p.selling_price <= priceRange.max
    );

    setFilteredProducts(filtered);
  };

  const getTotalStock = (product: ProductWithDetails): number => {
    return product.stock_levels?.reduce((sum, sl) => sum + (sl.quantity || 0), 0) || 0;
  };

  const getAvailabilityBadge = (product: ProductWithDetails) => {
    const stock = getTotalStock(product);
    if (stock === 0) {
      return <Badge variant="danger">Out of Stock</Badge>;
    } else if (stock < (product.reorder_level || 10)) {
      return <Badge variant="warning">Low Stock</Badge>;
    } else {
      return <Badge variant="success">In Stock</Badge>;
    }
  };

  const getPriceRange = (product: ProductWithDetails): string => {
    const minPrice = product.min_selling_price || product.selling_price;
    const maxPrice = product.selling_price;

    if (minPrice === maxPrice) {
      return formatCurrency(maxPrice);
    }

    return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Product Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">Browse our complete product showroom</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Search */}
          <Card>
            <div className="space-y-4">
              <Input
                leftIcon={<Search size={16} />}
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* Categories */}
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Categories</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === ''
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`block w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        selectedCategory === cat.id
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat.name}
                      <span className="text-xs text-slate-500 ml-2">
                        ({products.filter(p => p.category_id === cat.id).length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brands */}
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Brands</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => setSelectedBrand('')}
                    className={`block w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                      selectedBrand === ''
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    All Brands
                  </button>
                  {brands.map(brand => (
                    <button
                      key={brand.id}
                      onClick={() => setSelectedBrand(brand.id)}
                      className={`block w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        selectedBrand === brand.id
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {brand.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">Price Range</p>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: parseFloat(e.target.value) })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              {/* Reset Filters */}
              {(search || selectedCategory || selectedBrand || priceRange.min > 0 || priceRange.max < 100000) && (
                <Button
                  variant="secondary"
                  fullWidth
                  leftIcon={<X size={14} />}
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('');
                    setSelectedBrand('');
                    setPriceRange({ min: 0, max: 100000 });
                  }}
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-600">
              Showing <span className="font-semibold">{filteredProducts.length}</span> products
            </p>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} rows={4} cols={1} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <Card
                  key={product.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => { setSelectedProduct(product); setShowDetailModal(true); }}
                >
                  {/* Image */}
                  <div className="w-full h-48 bg-slate-200 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].alt_text || product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-slate-300">
                        <span className="text-slate-500">No image</span>
                      </div>
                    )}
                  </div>

                  {/* Featured Badge */}
                  {product.is_featured && (
                    <div className="absolute top-4 right-4">
                      <Star className="text-yellow-500 fill-yellow-500" size={20} />
                    </div>
                  )}

                  {/* Content */}
                  <div className="space-y-2">
                    {product.brand && (
                      <p className="text-xs text-slate-500 font-medium uppercase">{product.brand.name}</p>
                    )}

                    <h3 className="font-semibold text-slate-900 line-clamp-2">{product.name}</h3>

                    {product.category && (
                      <p className="text-xs text-slate-600">{product.category.name}</p>
                    )}

                    {/* Price */}
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-lg font-bold text-slate-900">{getPriceRange(product)}</p>
                    </div>

                    {/* Availability */}
                    <div className="flex items-center justify-between pt-2">
                      {getAvailabilityBadge(product)}
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Eye size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                          setShowDetailModal(true);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                title="No products found"
                description="Try adjusting your filters or search terms"
                size="md"
              />
            </Card>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedProduct(null); }}
        title={selectedProduct?.name || 'Product Details'}
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-6">
            {/* Image Gallery */}
            {selectedProduct.images && selectedProduct.images.length > 0 && (
              <div className="space-y-2">
                <div className="w-full h-64 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={selectedProduct.images[0].url}
                    alt={selectedProduct.images[0].alt_text || selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedProduct.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {selectedProduct.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img.url}
                        alt={img.alt_text || `Image ${idx + 1}`}
                        className="w-16 h-16 rounded-lg object-cover cursor-pointer"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Product Info */}
            <div className="grid grid-cols-2 gap-4">
              {selectedProduct.brand && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">Brand</p>
                  <p className="font-medium text-slate-900">{selectedProduct.brand.name}</p>
                </div>
              )}
              {selectedProduct.category && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">Category</p>
                  <p className="font-medium text-slate-900">{selectedProduct.category.name}</p>
                </div>
              )}
              {selectedProduct.sku && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">SKU</p>
                  <p className="font-medium text-slate-900">{selectedProduct.sku}</p>
                </div>
              )}
              {selectedProduct.unit && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">Unit</p>
                  <p className="font-medium text-slate-900">{selectedProduct.unit?.name}</p>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="border-t border-slate-200 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">Selling Price</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(selectedProduct.selling_price)}</p>
                </div>
                {selectedProduct.min_selling_price !== selectedProduct.selling_price && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium">Min Price</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(selectedProduct.min_selling_price)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium">Tax Rate</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedProduct.tax_rate}%</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedProduct.description && (
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-700">{selectedProduct.description}</p>
              </div>
            )}

            {/* Specifications */}
            {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-900 mb-3">Specifications</p>
                <div className="space-y-2">
                  {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-slate-600">{key}</span>
                      <span className="font-medium text-slate-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability by Warehouse */}
            {selectedProduct.stock_levels && selectedProduct.stock_levels.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-900 mb-3">Availability</p>
                <div className="space-y-2">
                  {selectedProduct.stock_levels.map((level, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-slate-50 rounded">
                      <span className="text-slate-700">{level.warehouse?.name || 'Warehouse'}</span>
                      <span className={`font-medium ${level.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {level.quantity} in stock
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {selectedProduct.tags && selectedProduct.tags.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
