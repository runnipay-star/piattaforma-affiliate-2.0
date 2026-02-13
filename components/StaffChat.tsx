
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StaffMessage, User, UserRole, PlatformSettings, Sale } from '../types';
import { fetchStaffMessages, sendStaffMessage, triggerWebhook, fetchGloballyUsedUnlockOrderIds } from '../database';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { EyeIcon } from './icons/EyeIcon';

interface StaffChatProps {
    sale: Sale;
    user: User;
    settings: PlatformSettings;
    allSales?: Sale[];
    onSwitchOrder?: (sale: Sale) => void;
}

const StaffChat: React.FC<StaffChatProps> = ({ sale, user, settings, allSales = [], onSwitchOrder }) => {
    const [messages, setMessages] = useState<StaffMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTargetOrderId, setSelectedTargetOrderId] = useState('');
    const [globalUsedIds, setGlobalUsedIds] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const isStaff = [UserRole.ADMIN, UserRole.MANAGER, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE].includes(user.role);
    const isCC = user.role === UserRole.CUSTOMER_CARE || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    const isGiacenza = sale.status === 'Giacenza';

    useEffect(() => {
        if (isStaff) {
            loadMessages();
            if (isGiacenza) {
                fetchGloballyUsedUnlockOrderIds().then(setGlobalUsedIds);
            }
        }
    }, [sale.id, isStaff, isGiacenza]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async () => {
        const data = await fetchStaffMessages(sale.id);
        setMessages(data);
    };

    // Helper per estrarre l'ID ordine da un testo
    const extractOrderId = (text: string): string | null => {
        const match = text.match(/S-\d+-[A-Z0-9]+/);
        return match ? match[0] : null;
    };

    // Identifica gli ordini già usati per svincoli in questa chat specifica
    const currentChatUsedIds = useMemo(() => {
        return messages
            .filter(m => m.message.includes('MESSAGGIO SVINCOLO URGENTE'))
            .map(m => extractOrderId(m.message))
            .filter(Boolean) as string[];
    }, [messages]);

    // Unione di ID usati localmente e globalmente per il filtro finale
    const allExclusionIds = useMemo(() => {
        return [...new Set([...currentChatUsedIds, ...globalUsedIds])];
    }, [currentChatUsedIds, globalUsedIds]);

    // Helper per confrontare le varianti selezionate
    const areVariantsEqual = (s1: Sale, s2: Sale) => {
        if (!s1.selectedVariants?.length && !s2.selectedVariants?.length) {
            return s1.variantId === s2.variantId;
        }
        if (s1.selectedVariants?.length !== s2.selectedVariants?.length) {
            return false;
        }
        const ids1 = s1.selectedVariants?.map(v => v.variantId).sort().join(',');
        const ids2 = s2.selectedVariants?.map(v => v.variantId).sort().join(',');
        return ids1 === ids2;
    };

    // Ordini suggeriti per lo svincolo (escludendo quelli già usati globalmente)
    const targetOrders = useMemo(() => {
        if (!isGiacenza || !allSales.length) return [];
        const currentCap = parseInt(sale.customer_zip || '0');
        return allSales
            .filter(s => {
                if (s.id === sale.id) return false;
                if (allExclusionIds.includes(s.id)) return false; // Esclusione Globale
                if (s.status !== 'Confermato') return false;
                if (s.productId !== sale.productId) return false;
                if ((s.quantity || 1) !== (sale.quantity || 1)) return false;
                if (!areVariantsEqual(s, sale)) return false;
                return true;
            })
            .sort((a, b) => {
                const capA = parseInt(a.customer_zip || '0');
                const capB = parseInt(b.customer_zip || '0');
                return Math.abs(capA - currentCap) - Math.abs(capB - currentCap);
            })
            .slice(0, 15);
    }, [allSales, sale, isGiacenza, allExclusionIds]);

    const handleSendMessage = async (text?: string, urgent?: boolean) => {
        const messageText = text || newMessage;
        const messageUrgent = urgent !== undefined ? urgent : isUrgent;

        if (!messageText.trim()) return;
        setIsLoading(true);

        const currentRole = String(user.role).toUpperCase();

        try {
            const payload: Omit<StaffMessage, 'id' | 'created_at'> = {
                sale_id: sale.id,
                sender_id: user.id,
                sender_name: user.name,
                sender_role: user.role,
                message: messageText,
                is_urgent: messageUrgent,
                read_by: [user.id]
            };

            const savedMsg = await sendStaffMessage(payload);
            setMessages(prev => [...prev, savedMsg]);
            
            // Se è un messaggio di svincolo, aggiorniamo gli ID usati per rimuoverlo subito dalla lista
            if (messageText.includes('MESSAGGIO SVINCOLO URGENTE')) {
                const targetId = extractOrderId(messageText);
                if (targetId) {
                    setGlobalUsedIds(prev => [...prev, targetId]);
                }
            }

            setNewMessage('');
            setIsUrgent(false);
            setSelectedTargetOrderId('');

            const webhookToUse = settings.staff_chat_webhook_url || settings.make_webhook_url;
            if (webhookToUse && (messageUrgent || messages.length === 0)) {
                await triggerWebhook(webhookToUse, {
                    event: 'staff_chat_message',
                    order_id: sale.id,
                    customer_name: sale.customerName,
                    product_name: sale.productName,
                    sender_name: user.name,
                    sender_role: currentRole,
                    message: messageText,
                    is_urgent: messageUrgent,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error("❌ Errore durante l'invio:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const prepareQuickAction = (text: string, urgent: boolean) => {
        setNewMessage(text);
        setIsUrgent(urgent);
    };

    const handleGenerateUnlockMessage = () => {
        if (!selectedTargetOrderId) return;
        const target = targetOrders.find(o => o.id === selectedTargetOrderId);
        if (!target) return;

        const tracking = sale.trackingCode || '[CODICE MANCANTE]';
        const msg = `⚠️ MESSAGGIO SVINCOLO URGENTE:\nQuesto Tracking code ${tracking} deve essere svincolato all'ordine ${target.id} (${target.customerName}, CAP ${target.customer_zip}). Procedere con urgenza.`;
        
        setNewMessage(msg);
        setIsUrgent(true);
    };

    const handleQuickViewOrder = (orderId: string) => {
        const found = allSales.find(s => s.id === orderId);
        if (found && onSwitchOrder) {
            onSwitchOrder(found);
        } else {
            alert("Ordine non trovato nella cache locale.");
        }
    };

    if (!isStaff) return null;

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl flex flex-col h-[550px] overflow-hidden shadow-inner">
            <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="font-black text-sm uppercase italic text-primary">Chat Interna Reparti</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full border border-gray-200 uppercase tracking-tighter">Accesso Riservato Staff</span>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center px-8 opacity-60">
                        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        <p className="italic text-sm">Nessuna conversazione per questo ordine.</p>
                        <p className="text-[10px] mt-1 font-bold uppercase">Scrivi per avvisare la logistica o il manager.</p>
                    </div>
                )}
                {messages.map(m => {
                    const linkedOrderId = extractOrderId(m.message);
                    return (
                        <div key={m.id} className={`flex flex-col ${m.sender_id === user.id ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-md transition-all ${
                                m.sender_id === user.id 
                                    ? 'bg-primary text-white rounded-tr-none' 
                                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                            } ${m.is_urgent ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}>
                                <div className="flex justify-between items-center gap-4 mb-1 border-b border-white/10 pb-1">
                                    <span className={`text-[9px] font-black uppercase tracking-wider ${m.sender_id === user.id ? 'text-white/80' : 'text-primary/70'}`}>
                                        {m.sender_name} <span className="opacity-50">|</span> {m.sender_role}
                                    </span>
                                    {m.is_urgent && <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black animate-pulse">URGENTE</span>}
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed py-1">{m.message}</p>
                                
                                {linkedOrderId && linkedOrderId !== sale.id && (
                                    <button 
                                        onClick={() => handleQuickViewOrder(linkedOrderId)}
                                        className={`mt-2 flex items-center gap-1.5 w-full justify-center p-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm ${
                                            m.sender_id === user.id 
                                                ? 'bg-white/20 text-white hover:bg-white/30' 
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                    >
                                        <EyeIcon className="w-3.5 h-3.5" />
                                        Vai all'ordine target: {linkedOrderId}
                                    </button>
                                )}

                                <p className={`text-[8px] mt-1 text-right font-bold ${m.sender_id === user.id ? 'text-white/50' : 'text-gray-400'}`}>
                                    {new Date(m.created_at).toLocaleString('it-IT', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </p>
                            </div>
                        </div>
                    )
                })}
                <div ref={chatEndRef} />
            </div>

            {/* Area Azioni Rapide */}
            {isCC && (
                <div className="bg-white border-t border-gray-100 p-3 flex flex-col gap-2 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)]">
                    {isGiacenza ? (
                        <div className="animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Procedura Svincolo Giacenza</span>
                                <div className="h-px flex-grow bg-red-100"></div>
                            </div>
                            <div className="flex flex-col gap-2 bg-red-50 p-2 rounded-xl border border-red-100">
                                <p className="text-[10px] font-bold text-red-700 px-1">Scegli l'ordine target compatibile (solo Confermati):</p>
                                <div className="flex gap-2 w-full">
                                    <select 
                                        value={selectedTargetOrderId}
                                        onChange={(e) => setSelectedTargetOrderId(e.target.value)}
                                        className="flex-grow min-w-0 p-2 bg-white border border-red-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-red-200 outline-none"
                                    >
                                        <option value="">Seleziona ordine...</option>
                                        {targetOrders.map(o => (
                                            <option key={o.id} value={o.id}>
                                                {o.id} - {o.customerName} ({o.customer_zip})
                                            </option>
                                        ))}
                                        {targetOrders.length === 0 && <option disabled>Nessun ordine compatibile</option>}
                                    </select>
                                    <button 
                                        onClick={handleGenerateUnlockMessage}
                                        disabled={!selectedTargetOrderId}
                                        className="flex-shrink-0 bg-red-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 uppercase tracking-tighter whitespace-nowrap shadow-sm"
                                    >
                                        Prepara Svincolo
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[9px] font-black text-primary/50 uppercase tracking-widest">Azioni Rapide Staff</span>
                                <div className="h-px flex-grow bg-gray-100"></div>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                <button 
                                    onClick={() => prepareQuickAction("⚠️ SOLLECITO URGENTE: L'ordine è confermato ma non ancora spedito.", true)}
                                    className="flex-shrink-0 flex items-center gap-2 bg-orange-50 text-orange-700 text-[10px] font-black py-2.5 px-4 rounded-xl border border-orange-200 hover:bg-orange-100 transition-all active:scale-95 shadow-sm"
                                >
                                    SOLLECITA SPEDIZIONE
                                </button>
                                <button 
                                    onClick={() => prepareQuickAction("❓ INFO LOGISTICA: Richieste informazioni specifiche su questo indirizzo.", false)}
                                    className="flex-shrink-0 flex items-center gap-2 bg-gray-50 text-gray-700 text-[10px] font-black py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
                                >
                                    CHIEDI INFO
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="p-4 bg-white border-t border-gray-200 space-y-3 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <input 
                            type="checkbox" 
                            id="urgent-check" 
                            checked={isUrgent} 
                            onChange={e => setIsUrgent(e.target.checked)} 
                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <label htmlFor="urgent-check" className={`text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${isUrgent ? 'text-red-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                            Segnala come Urgente
                        </label>
                    </div>
                </div>
                <form 
                    onSubmit={e => { e.preventDefault(); handleSendMessage(); }}
                    className="flex items-center gap-3"
                >
                    <input 
                        type="text" 
                        value={newMessage} 
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Scrivi un messaggio allo staff..."
                        className="flex-grow p-3.5 bg-gray-50 border border-gray-300 rounded-2xl text-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-gray-400 font-medium"
                    />
                    <button 
                        type="submit"
                        disabled={isLoading || !newMessage.trim()}
                        className="bg-primary text-white p-4 rounded-2xl hover:bg-primary-dark hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-primary/20 flex-shrink-0"
                    >
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default StaffChat;
