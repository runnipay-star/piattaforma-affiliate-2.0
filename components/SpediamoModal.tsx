
import React, { useState } from 'react';
import { Sale, Product, PlatformSettings } from '../types';
import { createSpediamoShipmentDirect } from '../database';

interface SpediamoModalProps {
    sale: Sale;
    product: Product;
    settings: PlatformSettings;
    onClose: () => void;
    onSuccess: (trackingCode: string) => Promise<void>;
}

const EditableField: React.FC<{ label: string; value: string; onChange: (value: string) => void; placeholder?: string; maxLength?: number; error?: boolean }> = ({ label, value, onChange, placeholder, maxLength, error }) => (
    <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">{label}</label>
        <input 
            type="text" 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            maxLength={maxLength}
            className={`mt-1 block w-full px-3 py-2 bg-white border ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 outline-none sm:text-sm font-medium transition-all`}
        />
    </div>
);

const SpediamoModal: React.FC<SpediamoModalProps> = ({ sale, product, settings, onClose, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [techDetails, setTechDetails] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isSandbox, setIsSandbox] = useState(false);
    const [copied, setCopied] = useState(false);

    const cleanStr = (s: any, limit: number) => String(s || '').trim().substring(0, limit);
    const cleanPhone = (ph: any) => String(ph || '').replace(/\D/g, '').substring(0, 15);
    const cleanZip = (z: any) => String(z || '').replace(/\D/g, '').padStart(5, '0').substring(0, 5);
    const cleanProvince = (p: any) => String(p || '').replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 2);

    const [sender, setSender] = useState({
        name: cleanStr(settings.sender_name, 35),
        address: cleanStr(settings.sender_address, 35),
        town: cleanStr(settings.sender_city, 30),
        zip: cleanZip(settings.sender_zip),
        province: cleanProvince(settings.sender_province),
        phone: cleanPhone(settings.sender_phone),
        email: cleanStr(settings.sender_email, 50),
    });

    const [recipient, setRecipient] = useState({
        name: cleanStr(sale.customerName, 35),
        address: cleanStr(`${sale.customer_street_address || ''} ${sale.customer_house_number || ''}`, 35),
        town: cleanStr(sale.customer_city, 30),
        zip: cleanZip(sale.customer_zip),
        province: cleanProvince(sale.customer_province),
        phone: cleanPhone(sale.customerPhone),
        email: cleanStr(sale.customerEmail, 50),
    });

    const handleCopyTechData = () => {
        const text = `Segnalazione Blocco 403 Spediamo.it\n----------------------------------\n${techDetails}\n----------------------------------\nAmbiente: ${isSandbox ? 'SANDBOX' : 'PRODUZIONE'}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handleCreateShipment = async () => {
        setIsLoading(true);
        setError('');
        setTechDetails('');
        
        try {
            const apiKey = settings.spediamo_api_key?.trim();
            if (!apiKey) throw new Error("Manca l'API Key nelle impostazioni.");

            // Descrizione che include la variante
            const variants = sale.selectedVariants && sale.selectedVariants.length > 0 
                ? sale.selectedVariants.map(v => v.variantName).join(', ') 
                : sale.variantName;
            const fullDesc = variants ? `${sale.productName} (${variants})` : sale.productName;

            const payload = {
                apiKey,
                action: 'create-shipment',
                isSandbox,
                shipment: {
                    orderId: sale.id,
                    cashOnDeliveryAmount: sale.saleAmount,
                    senderName: sender.name,
                    senderAddress: sender.address,
                    senderTown: sender.town,
                    senderPostalCode: sender.zip,
                    senderProvince: sender.province,
                    senderPhone: sender.phone,
                    senderEmail: sender.email,
                    recipientName: recipient.name,
                    recipientAddress: recipient.address,
                    recipientTown: recipient.town,
                    recipientPostalCode: recipient.zip,
                    recipientProvince: recipient.province,
                    recipientPhone: recipient.phone,
                    recipientEmail: recipient.email,
                    packages: [{
                        weight: Number(product.weight || 1),
                        width: Math.round(Number(product.width || 10)),
                        height: Math.round(Number(product.height || 10)),
                        length: Math.round(Number(product.depth || 10)),
                        description: fullDesc.substring(0, 35) // Limite caratteri SDA Spediamo
                    }]
                }
            };

            const response = await createSpediamoShipmentDirect(payload);
            const resData = response.data;

            if (resData?.success === false) {
                setTechDetails(resData.details || '');
                throw new Error(resData.error || "Richiesta rifiutata dal corriere.");
            }

            if (!resData?.success && response.error) {
                throw new Error("Errore di rete o timeout del server proxy.");
            }

            setSuccessMsg("Ordine inviato con successo a Spediamo.it!");
            const track = resData?.data?.shipment?.tracking_number || "SDA_PENDING";
            await onSuccess(track);
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (successMsg) {
        return (
            <div className="text-center p-12 bg-white rounded-xl">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-xl font-black italic mb-2 uppercase">Successo!</h3>
                <p className="text-gray-600 mb-6">{successMsg}</p>
                <button onClick={onClose} className="bg-primary text-white font-black py-4 px-12 rounded-xl w-full shadow-lg">CHIUDI</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 pb-6">
            <div className={`p-6 rounded-2xl text-white shadow-xl flex justify-between items-center border-b-4 ${isSandbox ? 'bg-orange-600 border-orange-800' : 'bg-slate-800 border-slate-900'}`}>
                <div>
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">{isSandbox ? 'AMBIENTE DI TEST' : 'LOGISTICA DIRETTA SDA'}</p>
                    <p className="text-3xl font-black italic">€{(sale.saleAmount || 0).toFixed(2)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">RIF. ORDINE</p>
                    <p className="text-lg font-mono font-bold text-secondary">{sale.id}</p>
                </div>
            </div>

            <div className="flex items-center justify-center gap-4 bg-gray-100 p-3 rounded-xl border border-gray-200">
                <span className={`text-[10px] font-black uppercase ${!isSandbox ? 'text-primary' : 'text-gray-400'}`}>Produzione</span>
                <button onClick={() => setIsSandbox(!isSandbox)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isSandbox ? 'bg-orange-500' : 'bg-slate-400'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSandbox ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-[10px] font-black uppercase ${isSandbox ? 'text-orange-600' : 'text-gray-400'}`}>Sandbox</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                    <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">MITTENTE</h4>
                    <EditableField label="Ragione Sociale" value={sender.name} onChange={v => setSender({...sender, name: v})} error={!sender.name} />
                    <EditableField label="Indirizzo" value={sender.address} onChange={v => setSender({...sender, address: v})} error={!sender.address} />
                    <div className="grid grid-cols-2 gap-4">
                        <EditableField label="Città" value={sender.town} onChange={v => setSender({...sender, town: v})} error={!sender.town} />
                        <EditableField label="Provincia" value={sender.province} onChange={v => setSender({...sender, province: cleanProvince(v)})} maxLength={2} error={!sender.province} />
                    </div>
                </div>

                <div className="p-6 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-4">
                    <h4 className="font-black text-blue-500 uppercase text-[10px] tracking-widest mb-2">DESTINATARIO</h4>
                    <EditableField label="Nome Cliente" value={recipient.name} onChange={v => setRecipient({...recipient, name: v})} error={!recipient.name} />
                    <EditableField label="Indirizzo" value={recipient.address} onChange={v => setRecipient({...recipient, address: v})} error={!recipient.address} />
                    <div className="grid grid-cols-2 gap-4">
                        <EditableField label="Città" value={recipient.town} onChange={v => setRecipient({...recipient, town: v})} error={!recipient.town} />
                        <EditableField label="CAP" value={recipient.zip} onChange={v => setRecipient({...recipient, zip: cleanZip(v)})} maxLength={5} error={!recipient.zip} />
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-red-100 rounded-full text-red-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <div className="flex-grow">
                            <p className="text-red-800 font-black uppercase text-sm mb-1">Connessione Bloccata</p>
                            <p className="text-red-700 text-sm font-medium mb-4">{error}</p>
                            
                            {techDetails && (
                                <div className="mt-4 space-y-4">
                                    <div className="bg-white/60 p-3 rounded-lg border border-red-100 font-mono text-[10px] text-red-900 overflow-x-auto">
                                        {techDetails}
                                    </div>
                                    <button 
                                        onClick={handleCopyTechData}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-black uppercase shadow-lg hover:bg-red-700 active:scale-95 transition-all"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                                        {copied ? "COPIATO!" : "COPIA DATI PER ASSISTENZA"}
                                    </button>
                                    <p className="text-[10px] text-red-500 italic">Invia questi dati a info@spediamo.it chiedendo di mettere l'IP in Whitelist.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
                <button onClick={onClose} className="text-gray-400 font-black text-[10px] uppercase px-4 hover:text-gray-600 transition-colors">Annulla</button>
                <button 
                    onClick={handleCreateShipment} 
                    disabled={isLoading}
                    className={`text-white font-black py-4 px-12 rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:bg-gray-300 ${isSandbox ? 'bg-orange-600' : 'bg-primary'}`}
                >
                    {isLoading ? "ELABORAZIONE..." : (isSandbox ? "INVIA TEST SANDBOX" : "CREA SPEDIZIONE SDA")}
                </button>
            </div>
        </div>
    );
};

export default SpediamoModal;
