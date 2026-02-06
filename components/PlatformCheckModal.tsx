import React, { useState } from 'react';
import { Sale, PlatformSettings, User } from '../types';
import { supabase } from '../database';

interface PlatformCheckModalProps {
    user: User;
    sales: Sale[];
    settings: PlatformSettings;
    onClose: () => void;
}

const PlatformCheckModal: React.FC<PlatformCheckModalProps> = ({ onClose }) => {
    const [copied, setCopied] = useState(false);

    // SCRIPT GOD MODE DEFINITIVO v44.0
    const GOD_MODE_SQL = `-- MWS GOD MODE FIX v44.0
-- 1. Pulizia Triggers Obsoleti
DROP TRIGGER IF EXISTS sync_product_prices ON products;
DROP FUNCTION IF EXISTS sync_product_prices_fn();
DROP TRIGGER IF EXISTS ensure_shipping_card_trigger ON products;
DROP FUNCTION IF EXISTS ensure_shipping_card_fn();

-- 2. Correzione Tabella Prodotti (Inclusi Prezzi e Comm per Carta)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS shipping_cost_card numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_charge_card numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_card numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_value_card numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS fulfillment_cost_card numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee_card numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_care_commission_card numeric DEFAULT 0;

ALTER TABLE products ALTER COLUMN shipping_charge SET DEFAULT 0;
ALTER TABLE products ALTER COLUMN shipping_charge_card SET DEFAULT 0;

-- 3. Correzione Tabella Sales (Assicura colonne indirizzo complete)
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS customer_street_address text,
ADD COLUMN IF NOT EXISTS customer_house_number text,
ADD COLUMN IF NOT EXISTS customer_city text,
ADD COLUMN IF NOT EXISTS customer_province text,
ADD COLUMN IF NOT EXISTS customer_zip text,
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cod',
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS mollie_id text;

-- 4. Funzione Controllo Duplicati v2
CREATE OR REPLACE FUNCTION check_duplicate_lead_v2(p_phone text, p_product_id uuid)
RETURNS boolean AS $$
DECLARE
    found_dup boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM sales 
        WHERE customer_phone = p_phone 
        AND product_id = p_product_id 
        AND status NOT IN ('Annullato', 'Cancellato', 'Duplicato', 'Test')
        AND sale_date > (now() - interval '48 hours')
    ) INTO found_dup;
    RETURN found_dup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Reset permessi per Staff Chat
ALTER TABLE staff_chat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can see all messages" ON staff_chat;
CREATE POLICY "Staff can see all messages" ON staff_chat FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff can insert messages" ON staff_chat;
CREATE POLICY "Staff can insert messages" ON staff_chat FOR INSERT WITH CHECK (true);

-- 6. Indici Performance
CREATE INDEX IF NOT EXISTS idx_products_ref ON products(ref_number);
CREATE INDEX IF NOT EXISTS idx_sales_mollie ON sales(mollie_id);
`;

    const handleCopy = () => {
        navigator.clipboard.writeText(GOD_MODE_SQL);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="p-2 space-y-6">
            <div className="bg-red-50 border-2 border-red-100 p-6 rounded-2xl flex items-start gap-4">
                <div className="bg-red-600 text-white p-3 rounded-xl shadow-lg">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div>
                    <h3 className="text-xl font-black text-red-700 uppercase italic tracking-tight">FIX v44.0 - God Mode</h3>
                    <p className="text-red-600 text-sm font-medium leading-relaxed">
                        Questo script abilita il supporto completo ai costi operativi differenziati (Logistica, Fee, CC) per Carta/COD.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Codice SQL di Ripristino</p>
                    <button 
                        onClick={handleCopy}
                        className="bg-white border-2 border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg text-xs font-black hover:bg-gray-50 transition-all uppercase tracking-tighter"
                    >
                        {copied ? 'Copiato in Appunti!' : 'Copia Script SQL'}
                    </button>
                </div>
                <div className="relative group">
                    <pre className="p-5 bg-gray-900 text-green-400 rounded-2xl font-mono text-[11px] overflow-x-auto border-2 border-primary/20 shadow-inner h-64 custom-scrollbar">
                        {GOD_MODE_SQL}
                    </pre>
                </div>
            </div>

            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 space-y-3">
                <h4 className="text-sm font-black text-blue-700 uppercase italic">Istruzioni:</h4>
                <ol className="text-xs text-blue-800 space-y-2 font-medium">
                    <li>1. Clicca su <strong>"Copia Script SQL"</strong>.</li>
                    <li>2. Incollalo nell' <strong>SQL Editor</strong> di Supabase e premi <strong>"Run"</strong>.</li>
                    <li>3. Torna qui e ricarica la piattaforma.</li>
                </ol>
            </div>

            <div className="pt-4 border-t flex justify-end">
                <button onClick={onClose} className="bg-primary text-white font-black py-4 px-12 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                    HO ESEGUITO LO SCRIPT - CHIUDI
                </button>
            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }`}</style>
        </div>
    );
};

export default PlatformCheckModal;