
import React, { useState } from 'react';
import { Sale, Product, PlatformSettings } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';
import { createPaccoFacileShipmentDirect } from '../database';

interface PaccoFacileModalProps {
    sale: Sale;
    product: Product;
    settings: PlatformSettings;
    onClose: () => void;
    onSuccess: (trackingCode: string) => Promise<void>;
}

const EditableField: React.FC<{ label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; maxLength?: number; type?: string }> = ({ label, value, onChange, required=false, placeholder, maxLength, type="text" }) => (
    <div>
        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 tracking-wider">{label}</label>
        <input 
            type={type} 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            required={required}
            placeholder={placeholder}
            maxLength={maxLength}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary sm:text-sm transition-all font-medium"
        />
    </div>
);

const PaccoFacileModal: React.FC<PaccoFacileModalProps> = ({ sale, product, settings, onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const cleanPhone = (p: string) => (p || '').replace(/\D/g, '').trim().substring(0, 15);
    const cleanProvince = (p: string) => (p || '').replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase().trim();
    const cleanZip = (z: string) => (z || '').replace(/\D/g, '').padStart(5, '0').substring(0, 5);
    const cleanStr = (s: string, max: number = 35) => (s || '').trim().substring(0, max);

    const [sender, setSender] = useState({
        name: cleanStr(settings.sender_name || 'Logistica MWS', 35),
        street: cleanStr(settings.sender_address || '', 35),
        city: cleanStr(settings.sender_city || '', 30),
        zip: cleanZip(settings.sender_zip || ''),
        province: cleanProvince(settings.sender_province || ''),
        phone: cleanPhone(settings.sender_phone || '3330000000'),
        email: cleanStr(settings.sender_email || 'logistica@mws.it', 50),
    });

    const [recipient, setRecipient] = useState({
        name: cleanStr(sale.customerName || '', 35),
        street: cleanStr(`${sale.customer_street_address || ''} ${sale.customer_house_number || ''}`, 35),
        city: cleanStr(sale.customer_city || '', 30),
        zip: cleanZip(sale.customer_zip || ''),
        province: cleanProvince(sale.customer_province || ''),
        phone: cleanPhone(sale.customerPhone || ''),
        email: cleanStr(sale.customerEmail || 'ordine@mws.it', 50),
    });

    const [numColli, setNumColli] = useState(1);
    const [pkg, setPkg] = useState({
        weight: Number(product.weight || 0.5),
        length: Math.max(1, Math.round(Number(product.depth || 10))),
        width: Math.max(1, Math.round(Number(product.width || 10))),
        height: Math.max(1, Math.round(Number(product.height || 10))),
    });

    const handleCreateShipment = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            if (!settings.paccofacile_api_key) {
                throw new Error("Configurazione mancante: Inserisci la tua API Key di PaccoFacile nelle Impostazioni.");
            }

            const payload = {
                order_id: sale.id,
                apiKey: settings.paccofacile_api_key,
                sender: { ...sender, country: "IT" },
                recipient: { ...recipient, country: "IT" },
                parcels: Array.from({ length: numColli }).map(() => ({
                    weight: Number(pkg.weight) || 0.5,
                    length: Number(pkg.length) || 10,
                    width: Number(pkg.width) || 10,
                    height: Number(pkg.height) || 10
                })),
                cod_amount: Number(sale.saleAmount) || 0,
                notes: cleanStr(sale.notes || "", 100)
            };

            const { data, error: functionError } = await createPaccoFacileShipmentDirect(payload);

            if (functionError) throw new Error(functionError.message || "Errore durante l'invio alla Edge Function.");
            
            if (data?.tracking_code) {
                await onSuccess(data.tracking_code);
                setSuccessMsg(`Spedizione creata! Tracking: ${data.tracking_code}`);
                setTimeout(() => onClose(), 3000);
            } else if (data?.success) {
                setSuccessMsg(`Richiesta inoltrata con successo.`);
                setTimeout(() => onClose(), 2000);
            } else {
                throw new Error(data?.error || "Risposta dal corriere non valida.");
            }
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (successMsg) {
        return (
            <div className="text-center p-12 bg-white rounded-xl">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase italic">SUCCESSO</h3>
                <p className="text-gray-600 mb-8 font-medium">{successMsg}</p>
                <button onClick={onClose} className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-lg">CHIUDI</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-3 p-1">
            <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-6 rounded-2xl text-white shadow-xl flex items-center justify-between border-b-4 border-blue-400">
                <div>
                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">CONTRASSEGNO</p>
                    <p className="text-4xl font-black italic">€{(sale.saleAmount || 0).toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Integrazione Diretta</p>
                    <p className="text-xl font-bold italic text-white/90">PACCOFACILE.IT API</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* MITTENTE */}
                <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-200">
                    <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span> DATI MITTENTE
                    </h4>
                    <EditableField label="Nome/Azienda" value={sender.name} onChange={v => setSender(p=>({...p, name:v}))} />
                    <EditableField label="Indirizzo" value={sender.street} onChange={v => setSender(p=>({...p, street:v}))} />
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <EditableField label="Città" value={sender.city} onChange={v => setSender(p=>({...p, city:v}))} />
                        </div>
                        <div className="col-span-1">
                            <EditableField label="CAP" value={sender.zip} onChange={v => setSender(p=>({...p, zip:v}))} maxLength={5} />
                        </div>
                        <div className="col-span-1">
                            <EditableField label="Prov." value={sender.province} onChange={v => setSender(p=>({...p, province: cleanProvince(v)}))} maxLength={2} />
                        </div>
                    </div>
                </div>

                {/* DESTINATARIO */}
                <div className="space-y-4 p-5 bg-blue-50/30 rounded-2xl border border-blue-100">
                    <h4 className="font-black text-blue-500 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                         <span className="w-2 h-2 bg-blue-500 rounded-full"></span> DATI DESTINATARIO
                    </h4>
                    <EditableField label="Nome Cliente" value={recipient.name} onChange={v => setRecipient(p=>({...p, name:v}))} />
                    <EditableField label="Indirizzo" value={recipient.street} onChange={v => setRecipient(p=>({...p, street:v}))} />
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <EditableField label="Città" value={recipient.city} onChange={v => setRecipient(p=>({...p, city:v}))} />
                        </div>
                        <div className="col-span-1">
                            <EditableField label="CAP" value={recipient.zip} onChange={v => setRecipient(p=>({...p, zip:v}))} maxLength={5} />
                        </div>
                        <div className="col-span-1">
                            <EditableField label="Prov." value={recipient.province} onChange={v => setRecipient(p=>({...p, province: cleanProvince(v)}))} maxLength={2} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-widest">PACCHI E PESO</h4>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border shadow-sm">
                        <label className="text-[10px] font-black text-primary uppercase">N. Colli:</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="10" 
                            value={numColli} 
                            onChange={e => setNumColli(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 text-sm font-black text-center focus:outline-none"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <EditableField label="Peso (KG)" value={pkg.weight.toString()} onChange={v => setPkg(p=>({...p, weight: parseFloat(v) || 0.5}))} type="number" />
                    <EditableField label="Lunghezza (CM)" value={pkg.length.toString()} onChange={v => setPkg(p=>({...p, length: parseInt(v) || 10}))} type="number" />
                    <EditableField label="Larghezza (CM)" value={pkg.width.toString()} onChange={v => setPkg(p=>({...p, width: parseInt(v) || 10}))} type="number" />
                    <EditableField label="Altezza (CM)" value={pkg.height.toString()} onChange={v => setPkg(p=>({...p, height: parseInt(v) || 10}))} type="number" />
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <XCircleIcon className="w-6 h-6 text-red-500" />
                    <p className="text-xs text-red-700 font-bold">{error}</p>
                </div>
            )}

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
                <button onClick={onClose} className="text-gray-400 font-black text-xs uppercase px-6 py-2 hover:text-gray-600">Annulla</button>
                <button 
                    onClick={handleCreateShipment} 
                    disabled={isLoading}
                    className="bg-primary text-white font-black py-4 px-12 rounded-xl shadow-xl disabled:bg-gray-300 active:scale-95 transition-transform"
                >
                    {isLoading ? "Elaborazione..." : "GENERA SPEDIZIONE DIRETTA"}
                </button>
            </div>
        </div>
    );
};

export default PaccoFacileModal;
