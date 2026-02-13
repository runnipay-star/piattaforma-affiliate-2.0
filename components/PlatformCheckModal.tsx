
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

    // SCRIPT GOD MODE DEFINITIVO v47.1 - FIX TYPE INCOMPATIBILITY (UUID vs TEXT)
    const GOD_MODE_SQL = `-- MWS GOD MODE FIX v47.1
-- 1. Tabella form_sessions per Live Traffic (Corretto tipo product_id in text)
CREATE TABLE IF NOT EXISTS form_sessions (
    session_id text PRIMARY KEY,
    product_id text REFERENCES products(id),
    product_name text,
    affiliate_id text,
    affiliate_name text,
    updated_at timestamptz DEFAULT now(),
    ip_country text,
    ip_city text,
    ip_region text,
    ip_flag text,
    user_agent text
);

-- 2. Permessi pubblici per Heartbeat
ALTER TABLE form_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can upsert sessions" ON form_sessions;
CREATE POLICY "Public can upsert sessions" ON form_sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update sessions" ON form_sessions;
CREATE POLICY "Public can update sessions" ON form_sessions FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Staff can read sessions" ON form_sessions;
CREATE POLICY "Staff can read sessions" ON form_sessions FOR SELECT USING (true);

-- 3. Campi Geo su Tabella Sales (FORZA CREAZIONE)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ip_country text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ip_city text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ip_region text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ip_flag text;

-- 4. Pulizia e tipi dati
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_charge numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_charge_card numeric DEFAULT 0;

-- 5. Indici Performance
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON form_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_sales_geo ON sales(ip_country);
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
                    <h3 className="text-xl font-black text-red-700 uppercase italic tracking-tight">FIX v47.1 - RISOLUZIONE ERRORI DATABASE</h3>
                    <p className="text-red-600 text-sm font-medium leading-relaxed">
                        Lo script qui sotto corregge l'errore di incompatibilità dei tipi e abilita le colonne geografiche mancanti. Copialo ed eseguilo nel SQL Editor di Supabase.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Codice SQL di Ripristino</p>
                    <button onClick={handleCopy} className="bg-white border-2 border-gray-200 text-gray-600 px-4 py-1.5 rounded-lg text-xs font-black hover:bg-gray-50 transition-all uppercase tracking-tighter">
                        {copied ? 'Copiato!' : 'Copia Script SQL'}
                    </button>
                </div>
                <pre className="p-5 bg-gray-900 text-green-400 rounded-2xl font-mono text-[11px] overflow-x-auto border-2 border-primary/20 shadow-inner h-64 custom-scrollbar">
                    {GOD_MODE_SQL}
                </pre>
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
