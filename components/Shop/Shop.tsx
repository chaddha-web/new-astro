
import React, { useState } from 'react';
import { Product } from '../../types';
import ProductCard from './ProductCard';
import { Search } from 'lucide-react';

interface ShopProps {
  products: Product[];
  onBuy: (product: Product) => void;
}

const Shop: React.FC<ShopProps> = ({ products, onBuy }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'gemstone', label: 'Gemstones' },
    { id: 'rudraksha', label: 'Rudraksha' },
    { id: 'yantra', label: 'Yantras' },
    { id: 'pooja', label: 'Pooja Kits' }
  ];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 p-4 md:p-0 overflow-hidden">
        {/* Header Section */}
        <div className="text-center mb-6 mt-2">
            <h2 className="text-2xl md:text-3xl font-serif text-white mb-2">Spiritual Store</h2>
            <p className="text-mystic-300 text-sm">Authentic remedies, consecrated items & pooja essentials.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 max-w-md mx-auto w-full relative">
            <input 
                type="text" 
                placeholder="Search items (e.g. Coral, Yantra)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-mystic-800/50 border border-mystic-600 rounded-full px-5 py-3 text-white focus:outline-none focus:border-gold-500 pl-12 shadow-inner transition-colors"
            />
            <svg className="w-5 h-5 text-mystic-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>

        {/* Categories Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2 justify-start md:justify-center">
            {categories.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                        activeCategory === cat.id 
                        ? 'bg-gold-500 text-mystic-900 border-gold-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                        : 'bg-mystic-800/50 text-mystic-300 border-mystic-700 hover:border-gold-500/50 hover:text-white'
                    }`}
                >
                    {cat.label}
                </button>
            ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20 overflow-y-auto scrollbar-hide pr-1">
            {filteredProducts.map(product => (
                <ProductCard 
                    key={product.id} 
                    product={product} 
                    onBuy={onBuy} 
                />
            ))}
            {filteredProducts.length === 0 && (
                <div className="col-span-full text-center text-mystic-500 py-10 flex flex-col items-center">
                    <Search className="w-10 h-10 text-mystic-500 mb-2 opacity-50" />
                    <p>No items found matching your search.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default Shop;
