
import React, { useMemo, useState, useEffect } from 'react';
import { Product, UserRole, Affiliate, Sale, PlatformSettings } from '../types';
import FormGenerator from './FormGenerator';
import { PencilIcon } from './icons/PencilIcon';
import { LinkIcon } from './icons/LinkIcon';
import { CodeBracketIcon } from './icons/CodeBracketIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import ApiIntegrationTab from './ApiIntegrationTab';
import { CubeIcon } from './icons/CubeIcon';
import { WalletIcon } from './icons/WalletIcon';
import { PhotoIcon } from './icons/PhotoIcon';

interface ProductDetailProps {
  product: Product;
  userRole: UserRole;
  affiliates: Affiliate[];
  sales: Sale[];
  currentAffiliate?: Affiliate;
  onBack: () => void;
  onEdit: (product: Product) => void;
  platformSettings: PlatformSettings;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, userRole, affiliates, sales, currentAffiliate, onBack, onEdit, platformSettings }) => {
  const isManagerOrAdmin = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;
  const [activeTab, setActiveTab] = useState<'details' | 'resources' | 'form' | 'api'>('details');
  const [mainImage, setMainImage] = useState(product.imageUrl);

  // Aggiorna l'immagine principale se il prodotto cambia (es. dopo una modifica)
  useEffect(() => {
    setMainImage(product.imageUrl);
  }, [product.imageUrl]);

  const currencySymbol = useMemo(() => {
    if (product.currency === 'USD') return '$';
    if (product.currency === 'GBP') return '£';
    return '€';
  }, [product.currency]);

  const affiliatePerformance = useMemo(() => {
    const salesForThisProduct = sales.filter(s => s.productId === product.id);
    if (salesForThisProduct.length === 0) return { rate: 0, total: 0 };

    const totalLeads = salesForThisProduct.length;
    const deliveredLeads = salesForThisProduct.filter(s => s.status === 'Consegnato').length;
    return {
        rate: (deliveredLeads / totalLeads) * 100,
        total: totalLeads
    };
  }, [product, sales]);

  const allImages = useMemo(() => {
    const gallery = product.galleryImageUrls || [];
    return [product.imageUrl, ...gallery].filter(Boolean);
  }, [product.imageUrl, product.galleryImageUrls]);

  let commissionLabel = 'Tua Commissione';
  let commissionValue: number | undefined = product.commissionValue;

  if (userRole === UserRole.LOGISTICS) {
      commissionLabel = 'Comm. Logistica';
      commissionValue = product.fulfillmentCost || 0;
  } else if (userRole === UserRole.CUSTOMER_CARE) {
      commissionLabel = 'Comm. C. Care';
      commissionValue = product.customerCareCommission || 0;
  }

  const formatExternalUrl = (url: string) => {
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  return (
    <div className="p-8">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="text-primary hover:text-primary-dark mr-4 p-2 rounded-full hover:bg-gray-100 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
        </button>
        <div>
            <h2 className="text-3xl font-black text-on-surface tracking-tight uppercase italic">{product.name}</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{product.isActive ? 'Prodotto Attivo' : 'In Pausa'}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">REF: {product.refNumber}</span>
                <span className="text-[10px] font-black bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm text-primary uppercase">{product.currency || 'EUR'} ({currencySymbol})</span>
            </div>
        </div>
        {isManagerOrAdmin && (
            <button onClick={() => onEdit(product)} className="ml-auto bg-secondary text-primary font-bold py-2.5 px-5 rounded-xl hover:bg-secondary-light transition-all flex items-center gap-2 shadow-sm">
                < PencilIcon className="w-4 h-4" /> Modifica
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
           <div className="bg-surface rounded-2xl shadow-xl overflow-hidden border border-gray-100 min-h-[600px]">
            <div className="bg-gradient-to-b from-primary to-primary-dark border-b border-white/10">
                <nav className="-mb-px flex gap-2 px-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('details')} className={`whitespace-nowrap py-4 px-4 border-b-4 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'details' ? 'border-secondary text-secondary' : 'border-transparent text-white/60 hover:text-white'}`}>
                        Descrizione
                    </button>
                    <button onClick={() => setActiveTab('resources')} className={`whitespace-nowrap py-4 px-4 border-b-4 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'resources' ? 'border-secondary text-secondary' : 'border-transparent text-white/60 hover:text-white'}`}>
                        Marketing Kit
                    </button>
                    <button onClick={() => setActiveTab('form')} className={`whitespace-nowrap py-4 px-4 border-b-4 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'form' ? 'border-secondary text-secondary' : 'border-transparent text-white/60 hover:text-white'}`}>
                        <ClipboardListIcon className="w-4 h-4" /> Generatore Form
                    </button>
                    <button onClick={() => setActiveTab('api')} className={`whitespace-nowrap py-4 px-4 border-b-4 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'api' ? 'border-secondary text-secondary' : 'border-transparent text-white/60 hover:text-white'}`}>
                        <CodeBracketIcon className="w-4 h-4" /> Integrazione API
                    </button>
                </nav>
            </div>
            
            <div className="p-0">
                {activeTab === 'details' && (
                    <div className="p-8 space-y-10 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Prezzo Base 1x</p>
                                <p className="text-2xl font-black text-primary italic">{currencySymbol}{product.price.toFixed(2)}</p>
                            </div>
                            <div className="p-5 bg-green-50 rounded-2xl border border-green-100 shadow-inner">
                                <p className="text-[10px] font-black text-green-400 uppercase mb-1 tracking-widest">{commissionLabel}</p>
                                <p className="text-2xl font-black text-green-600 italic">{currencySymbol}{(commissionValue || 0).toFixed(2)}</p>
                            </div>
                            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 shadow-inner">
                                <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest">Approvazione Target</p>
                                <p className="text-2xl font-black text-blue-600 italic">{100 - (product.approvalTolerance || 0)}%</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                                    <CubeIcon className="w-4 h-4 text-primary" />
                                    Varianti Disponibili
                                </h4>
                                <div className="space-y-2">
                                    {product.variants && product.variants.length > 0 ? (
                                        product.variants.map((v) => (
                                            <div key={v.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                <span className="text-sm font-bold text-gray-700">{v.name}</span>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${v.stockQuantity > 10 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                    {v.stockQuantity > 0 ? `${v.stockQuantity} pz` : 'Esaurito'}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500 italic">
                                            Prodotto senza varianti (Taglia/Colore Unico)
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                                    <WalletIcon className="w-4 h-4 text-secondary" />
                                    Offerte Multi-Pack
                                </h4>
                                <div className="space-y-2">
                                    {product.bundleOptions && product.bundleOptions.length > 0 ? (
                                        product.bundleOptions.map((b) => (
                                            <div key={b.id} className="p-3 bg-secondary/5 border border-secondary/10 rounded-xl shadow-sm flex justify-between items-center">
                                                <div>
                                                    <span className="text-sm font-black text-gray-800">Offerta {b.quantity}x</span>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Prezzo Cliente: {currencySymbol}{b.price.toFixed(2)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-secondary">{currencySymbol}{b.commissionValue.toFixed(2)}</span>
                                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Tua Comm.</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs text-gray-500 italic">
                                            Nessuna offerta multi-pack configurata
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                             <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Dettagli Descrittivi</h4>
                             <div className="prose prose-blue max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: product.description }} />
                        </div>
                    </div>
                )}

                {activeTab === 'resources' && (
                     <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in duration-300">
                        <div className="space-y-4">
                            <h4 className="font-black text-gray-800 uppercase text-xs tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                                Landing Pages Ufficiali
                            </h4>
                            <ul className="space-y-3">
                                {product.landingPages && product.landingPages.length > 0 ? (
                                    product.landingPages.map((link, i) => (
                                        <li key={i}>
                                            <a 
                                                href={formatExternalUrl(link.url)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-primary/10 border border-gray-200 hover:border-primary/30 transition-all group cursor-pointer"
                                            >
                                                <span className="font-bold text-sm text-gray-700 group-hover:text-primary">{link.label}</span>
                                                <LinkIcon className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                                            </a>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-gray-400 text-xs italic p-4 bg-gray-50 rounded-xl">Nessun link configurato</li>
                                )}
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="font-black text-gray-800 uppercase text-xs tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-secondary rounded-full"></div>
                                Creatività & Asset
                            </h4>
                            <ul className="space-y-3">
                                {product.creatives && product.creatives.length > 0 ? (
                                    product.creatives.map((link, i) => (
                                        <li key={i}>
                                            <a 
                                                href={formatExternalUrl(link.url)} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-secondary/10 border border-gray-200 hover:border-secondary/30 transition-all group cursor-pointer"
                                            >
                                                <span className="font-bold text-sm text-gray-700 group-hover:text-secondary-dark">{link.label}</span>
                                                <LinkIcon className="w-4 h-4 text-gray-400 group-hover:text-secondary-dark" />
                                            </a>
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-gray-400 text-xs italic p-4 bg-gray-50 rounded-xl">Nessuna creatività disponibile</li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'form' && (
                    <div className="p-2 animate-in fade-in duration-300">
                         <FormGenerator product={product} currentAffiliate={currentAffiliate} platformSettings={platformSettings} />
                    </div>
                )}

                {activeTab === 'api' && (
                    <div className="p-8 animate-in fade-in duration-300">
                        <ApiIntegrationTab product={product} currentAffiliate={currentAffiliate} />
                    </div>
                )}
            </div>
           </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
             <div className="bg-surface rounded-2xl shadow-lg overflow-hidden border border-gray-100 sticky top-24">
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                    <img src={mainImage} alt={product.name} className="w-full h-full object-cover transition-all duration-500"/>
                </div>
                
                <div className="p-6 border-t border-gray-50 space-y-6">
                    {/* Galleria Miniature */}
                    {allImages.length > 1 && (
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <PhotoIcon className="w-3 h-3" /> Galleria Prodotto
                            </h4>
                            <div className="grid grid-cols-4 gap-2">
                                {allImages.map((img, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setMainImage(img)}
                                        className={`aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-105 ${mainImage === img ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    >
                                        <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Media Performance</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[10px] font-black mb-1.5">
                                    <span className="text-gray-500 uppercase">Approvazione</span>
                                    <span className="text-primary">{affiliatePerformance.rate.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${affiliatePerformance.rate}%` }}></div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-3 border-t border-gray-50">
                                <span className="text-[10px] font-black text-gray-400 uppercase">Volume Lead</span>
                                <span className="text-sm font-black text-gray-800">{affiliatePerformance.total} ordini</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Nota Affiliato</p>
                        <p className="text-[11px] text-blue-800 leading-relaxed font-medium">Usa il generatore a sinistra per ottenere il codice da incollare sulla tua Landing Page.</p>
                    </div>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
