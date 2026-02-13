
import React, { useState, useMemo } from 'react';
import { Product, UserRole } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CogIcon } from './icons/CogIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';

interface ProductListProps {
  products: Product[];
  userRole: UserRole;
  niches: string[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onDuplicateProduct: (product: Product) => void;
  onViewProduct: (product: Product) => void;
  onOpenNicheManager: () => void;
}

const ProductCard = ({ product, userRole, canSeeStock, totalStock, commissionDisplay, onViewProduct, onEditProduct, onDeleteProduct, onDuplicateProduct, isReadOnlyUser }: any) => {
    const currencySymbol = product.currency === 'USD' ? '$' : product.currency === 'GBP' ? '£' : '€';
    
    return (
    <div 
        onClick={() => onViewProduct(product)}
        className="bg-surface rounded-xl shadow-md overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer border border-gray-100"
    >
        <div className="relative">
            <img 
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105" 
                src={product.imageUrl} 
                alt={product.name} 
                loading="lazy"
            />
            <span className={`absolute top-2 right-2 px-2 py-1 inline-flex text-[10px] font-black uppercase rounded-full ${product.isActive ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
            {product.isActive ? 'Attivo' : 'Pausa'}
            </span>
            <div className="absolute top-2 left-2 flex flex-col gap-1">
                <span className="px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-secondary text-primary shadow-sm">
                    {product.niche}
                </span>
                <span className="px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-white text-primary border border-gray-200 shadow-sm flex items-center gap-1">
                    {product.currency === 'EUR' ? '🇮🇹 ITA' : product.currency === 'USD' ? '🇺🇸 USA' : '🇬🇧 UK'} ({currencySymbol})
                </span>
            </div>
        </div>
        <div className="p-4 flex flex-col flex-grow">
            <h3 className="text-base font-bold text-on-surface flex-grow line-clamp-2">{product.name}</h3>
            <div className="mt-3 flex justify-between items-center">
                <p className="text-xl font-black text-primary">{currencySymbol}{product.price.toFixed(2)}</p>
                {commissionDisplay && (
                    <span className="px-2 py-1 text-[10px] font-black uppercase rounded-lg bg-green-50 text-green-700 border border-green-100" title={commissionDisplay.label}>
                    +{currencySymbol}{commissionDisplay.value.toFixed(2)}
                    </span>
                )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onViewProduct(product); }}
                    className="flex-1 text-center bg-primary text-on-primary font-black py-2 rounded-xl hover:bg-primary-dark transition-all text-xs uppercase tracking-widest shadow-md"
                >
                    Vedi Kit
                </button>
                {!isReadOnlyUser && (
                    <div className="flex gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDuplicateProduct(product); }} 
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" 
                            title="Duplica (Crea per altro mercato)"
                        >
                            <DocumentDuplicateIcon className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEditProduct(product); }} 
                            className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl transition-all"
                            title="Modifica Prodotto"
                        >
                            <PencilIcon className="w-5 h-5" />
                        </button>
                        {/* Added: Delete button to utilize the onDeleteProduct prop */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteProduct(product.id); }} 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Elimina Prodotto"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
)};

const ProductList: React.FC<ProductListProps> = ({ products, userRole, niches, onAddProduct, onEditProduct, onDeleteProduct, onDuplicateProduct, onViewProduct, onOpenNicheManager }) => {
  const isReadOnlyUser = [UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE].includes(userRole);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('all');

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => selectedNiche === 'all' || p.niche === selectedNiche)
      .filter(p => selectedCurrency === 'all' || p.currency === selectedCurrency)
      .filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.refNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [products, searchQuery, selectedNiche, selectedCurrency]);

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-black text-on-surface uppercase italic">Catalogo Prodotti</h2>
            <p className="text-sm text-gray-500 font-medium">Seleziona un prodotto per ottenere form e API.</p>
        </div>
        {!isReadOnlyUser && (
          <div className="flex items-center gap-3">
            <button onClick={onOpenNicheManager} className="bg-white border-2 border-gray-200 text-gray-700 font-black py-2.5 px-5 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 text-xs uppercase shadow-sm"><CogIcon className="w-4 h-4" /> Nicchie</button>
            <button onClick={onAddProduct} className="bg-primary text-white font-black py-3 px-6 rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 text-xs uppercase shadow-lg shadow-primary/20"><PlusIcon className="w-4 h-4" /> Nuovo Prodotto</button>
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl shadow-sm p-5 mb-10 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Cerca</label>
            <input
              type="text"
              placeholder="Nome o Codice REF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nicchia</label>
            <select
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
            >
              <option value="all">Tutte le Nicchie</option>
              {niches.sort().map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Paese / Valuta</label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/10 outline-none transition-all font-bold text-sm"
            >
              <option value="all">Tutti i Paesi</option>
              <option value="EUR">🇮🇹 Italia (EUR)</option>
              <option value="USD">🇺🇸 USA (USD)</option>
              <option value="GBP">🇬🇧 UK (GBP)</option>
            </select>
          </div>
        </div>
      </div>
      
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => {
            let commVal = product.commissionValue;
            if (userRole === UserRole.LOGISTICS) commVal = product.fulfillmentCost || 0;
            if (userRole === UserRole.CUSTOMER_CARE) commVal = product.customerCareCommission || 0;

            return (
              <ProductCard 
                key={product.id}
                product={product}
                userRole={userRole}
                commissionDisplay={{ label: 'Comm', value: commVal }}
                onViewProduct={onViewProduct}
                onEditProduct={onEditProduct}
                /* Fixed: Using onDeleteProduct from props instead of the undefined variable handleDeleteProduct */
                onDeleteProduct={onDeleteProduct}
                onDuplicateProduct={onDuplicateProduct}
                isReadOnlyUser={isReadOnlyUser}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-surface rounded-3xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-bold uppercase tracking-widest">Nessun prodotto trovato</p>
        </div>
      )}
    </div>
  );
};

export default ProductList;
