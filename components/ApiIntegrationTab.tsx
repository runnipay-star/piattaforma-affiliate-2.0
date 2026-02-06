import React, { useState } from 'react';
import { Product, Affiliate } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface ApiIntegrationTabProps {
    product: Product;
    currentAffiliate?: Affiliate;
}

const ApiIntegrationTab: React.FC<ApiIntegrationTabProps> = ({ product, currentAffiliate }) => {
    const [copied, setCopied] = useState<string | null>(null);

    // URL REALE DI SUPABASE (Fallback tecnico per admin)
    const REAL_SUPABASE_ENDPOINT = `https://radhkbocafjpglgmbpyy.supabase.co/functions/v1/import-lead`;
    
    // URL PROFESSIONALE (Il tuo gateway su Cloudflare)
    const displayEndpoint = `https://api.mws-platform.eu/v1/import-lead`;
    
    const affiliateKey = currentAffiliate?.short_id || 'IL_TUO_ID_AFFILIATO';

    const samplePayload = {
        "uid": product.id,
        "key": affiliateKey,
        "name": "Mario Rossi",
        "tel": "3331234567",
        "street-address": "Via Roma",
        "house-number": "12/A",
        "address-level2": "Milano",
        "address-level1": "MI",
        "zip": "20100",
        "ua": "Mozilla/5.0...",
        "ip": "1.2.3.4",
        "offer": "1" 
    };

    const sampleResponse = {
        "success": true,
        "order_id": "S-1712345678-ABCDEF",
        "quantity": 1,
        "status": "In attesa"
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header Informativo Produzione */}
            <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl flex items-start gap-4 border-b-4 border-indigo-800">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md shrink-0">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                    <h4 className="font-black text-lg uppercase tracking-tight mb-1 italic">MWS API GATEWAY ATTIVO</h4>
                    <p className="text-indigo-100 text-xs leading-relaxed font-medium">
                        L'integrazione è ora filtrata tramite il dominio professionale <strong>mws-platform.eu</strong>. 
                        Questo garantisce massima velocità, sicurezza e protezione della tua infrastruttura.
                    </p>
                </div>
            </div>

            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest italic">1. Endpoint Ufficiale (Produzione)</h3>
                    <span className="text-[10px] font-black text-white bg-primary px-3 py-1 rounded-full uppercase shadow-sm">Metodo: POST</span>
                </div>
                
                <div className="space-y-4">
                    <div className="relative group">
                        <code className="block p-5 bg-gray-900 text-emerald-400 rounded-2xl font-mono text-xs break-all border-2 border-emerald-500/30 shadow-2xl">
                            {displayEndpoint}
                        </code>
                        <button 
                            onClick={() => handleCopy(displayEndpoint, 'alias')}
                            className="absolute right-3 top-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl text-white transition-all active:scale-95"
                        >
                            {copied === 'alias' ? <span className="text-[10px] font-black uppercase px-2">Copiato!</span> : <ClipboardIcon className="w-5 h-5" />}
                        </button>
                    </div>

                    <div className="flex justify-center">
                        <button 
                            onClick={() => handleCopy(REAL_SUPABASE_ENDPOINT, 'real')}
                            className="text-[9px] font-black text-gray-300 hover:text-primary uppercase tracking-widest flex items-center gap-2 px-6 py-2 hover:bg-primary/5 rounded-full transition-all"
                        >
                            {copied === 'real' ? 'COPIATO!' : 'Mostra endpoint di emergenza'}
                        </button>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="space-y-4">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest italic">2. Payload Richiesta (JSON)</h3>
                    <div className="relative group">
                        <pre className="block p-5 bg-gray-900 text-blue-300 rounded-2xl font-mono text-[11px] overflow-x-auto border-2 border-primary shadow-xl leading-relaxed">
                            {JSON.stringify(samplePayload, null, 2)}
                        </pre>
                        <button 
                            onClick={() => handleCopy(JSON.stringify(samplePayload, null, 2), 'json')}
                            className="absolute right-4 top-4 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-all active:scale-95"
                        >
                            {copied === 'json' ? <span className="text-[10px] font-black uppercase px-2">Copiato!</span> : <ClipboardIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest italic">3. Risposta del Gateway</h3>
                    <div className="relative">
                        <pre className="block p-5 bg-slate-100 text-slate-600 rounded-2xl font-mono text-[11px] overflow-x-auto border-2 border-slate-200 shadow-inner leading-relaxed italic">
                            {JSON.stringify(sampleResponse, null, 2)}
                        </pre>
                        <div className="absolute top-4 right-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">application/json</div>
                    </div>
                </section>
            </div>

            <section className="p-6 bg-amber-50 rounded-3xl border-2 border-amber-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path></svg>
                    </div>
                    <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest">Guida al campo "offer"</h4>
                </div>
                <p className="text-xs text-amber-700 mb-6 font-medium">Invia il numero di pezzi desiderati nel campo <strong>"offer"</strong>. Il sistema calcolerà automaticamente il prezzo corretto impostato nel prodotto.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-4 bg-white border border-amber-100 rounded-2xl shadow-sm">
                        <span className="text-xs font-bold text-gray-600 uppercase italic">1 Pezzo</span>
                        <code className="text-xs font-mono font-black text-amber-600 bg-amber-50 px-4 py-1.5 rounded-lg border border-amber-100">"1"</code>
                    </div>
                    {product.bundleOptions && product.bundleOptions.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-4 bg-white border border-amber-100 rounded-2xl shadow-sm">
                            <span className="text-xs font-bold text-gray-600 uppercase italic">{b.quantity} Pezzi</span>
                            <code className="text-xs font-mono font-black text-amber-600 bg-amber-50 px-4 py-1.5 rounded-lg border border-amber-100">"{b.quantity}"</code>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default ApiIntegrationTab;