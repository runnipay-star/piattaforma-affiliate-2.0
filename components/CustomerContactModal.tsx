import React, { useState, useEffect, useMemo } from 'react';
import { Sale, User, UserRole, SaleStatus, Product, ContactHistoryItem, ContactAction } from '../types';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { ClockIcon } from './icons/ClockIcon';

interface CustomerContactModalProps {
  sale: Sale;
  template: string;
  user: User;
  products: Product[];
  onUpdate: (saleId: string, newStatus: SaleStatus) => void;
  onUpdateAddress: (saleId: string, addressParts: { street: string; houseNumber: string; city: string; province: string; zip: string; }) => Promise<void>;
  onUpdateNotes: (saleId: string, notes: string) => Promise<void>;
  onLogContact: (saleId: string, historyItem: ContactHistoryItem) => Promise<void>;
  onLastWarning?: (saleId: string, historyItem: ContactHistoryItem) => Promise<void>;
  onClose: () => void;
  isFromSolleciti?: boolean;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || '-'}</dd>
    </div>
);

const CustomerContactModal: React.FC<CustomerContactModalProps> = ({ sale, template, user, products, onUpdate, onUpdateAddress, onUpdateNotes, onLogContact, onLastWarning, onClose, isFromSolleciti = false }) => {
  const [notes, setNotes] = useState(sale.notes || '');
  const [address, setAddress] = useState({
    street: sale.customer_street_address || '',
    houseNumber: sale.customer_house_number || '',
    city: sale.customer_city || '',
    province: sale.customer_province || '',
    zip: sale.customer_zip || '',
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isProcessingTransition, setIsProcessingTransition] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  
  const isCustomerCare = user.role === UserRole.CUSTOMER_CARE || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;

  const [contactType, setContactType] = useState<'welcome' | 'out_of_stock' | 'last_warning' | 'refund' | 'failed_delivery'> (isFromSolleciti ? 'last_warning' : 'welcome');
  const [selectedGiacenzaOption, setSelectedGiacenzaOption] = useState<'redelivery' | 'pickup' | 'find_depot'>('redelivery');

  const handleAddressFieldChange = (field: keyof typeof address, value: string) => {
    setAddress(prev => ({...prev, [field]: value}));
  };

  const getCleanedPhone = (phone: string | undefined): string => {
    if (!phone) return '';
    let cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length === 10 && cleanedPhone.startsWith('3')) {
        cleanedPhone = `39${cleanedPhone}`;
    }
    return cleanedPhone;
  };

  const product = products.find(p => p.id === sale.productId);

  const stockInfo = useMemo(() => {
    if (!product) return null;

    if (sale.selectedVariants && sale.selectedVariants.length > 0) {
        return sale.selectedVariants.map(sv => {
            const v = product.variants?.find(pv => pv.id === sv.variantId);
            return {
                name: sv.variantName,
                quantity: v ? v.stockQuantity : 0
            };
        });
    } else if (sale.variantId) {
        const v = product.variants?.find(pv => pv.id === sale.variantId);
        return [{
            name: sale.variantName || 'Variante',
            quantity: v ? v.stockQuantity : 0
        }];
    } else {
        return [{
            name: 'Stock Prodotto',
            quantity: product.stockQuantity || 0
        }];
    }
  }, [product, sale]);

  const isOutOfStockDetected = useMemo(() => {
      return stockInfo?.some(s => s.quantity <= 0);
  }, [stockInfo]);
  
  useEffect(() => {
    let message = '';
    const customer = sale.customerName || 'Cliente';
    const productName = sale.productName || 'il tuo prodotto';
    const tracking = sale.trackingCode || '[CODICE SPEDIZIONE]';

    let finalAmountText = `€${sale.saleAmount.toFixed(2)}`;
    if (product && !product.freeShipping && (product.shippingCharge || 0) > 0) {
        const shippingCharge = product.shippingCharge || 0;
        const productPrice = sale.saleAmount - shippingCharge;
        finalAmountText = `€${productPrice.toFixed(2)} (prodotto) + €${shippingCharge.toFixed(2)} (spedizione), per un totale di €${sale.saleAmount.toFixed(2)}`;
    }
    
    if (sale.status === 'Giacenza') {
        switch (selectedGiacenzaOption) {
            case 'redelivery':
                message = `Ciao ${customer},\n\nti informiamo che il corriere non è riuscito a consegnare il tuo ordine oggi.\n\nNon preoccuparti, verrà effettuato un nuovo tentativo di consegna domani.\n\nTi ricordiamo che l'importo da saldare al corriere è di ${finalAmountText}.\n\nAssicurati di essere reperibile.\nGrazie.`;
                break;
            case 'pickup':
                message = `Ciao ${customer},\n\nIl tuo ordine è in giacenza presso la sede del corriere.\n\nHai 5 giorni per ritirarlo di persona.\n\nTrovi la sede e gli orari qui:\nSito: *https://spediamo.it/*\nCodice Tracciamento: *${tracking}*\n\nProcedi al più presto per evitare il reso.\n\nGrazie.`;
                break;
            case 'find_depot':
                message = `Ciao ${customer},\n\nIl tuo ordine è in giacenza.\n\nPer trovare la sede del ritiro, usa questi dati sul sito del corriere:\n\nSito: *https://spediamo.it/*\nCodice di Spedizione: *${tracking}*`;
                break;
        }
    } else {
        if (contactType === 'out_of_stock') {
            message = `Ciao ${customer}, ti contattiamo per il tuo ordine di *${productName}*.\n\nPurtroppo abbiamo appena terminato l'ultimo stock in magazzino! Il prossimo carico arriverà tra circa 3 giorni.\n\nTi ricordiamo che l'importo totale da pagare al corriere sarà di *${finalAmountText}*.\n\nSe per te va bene possiamo spedirtelo non appena arriva, ti chiediamo solo di portare pazienza per 3 giorni. Va bene per te?`;
        } else if (contactType === 'last_warning') {
            message = `⚠️ *ULTIMO AVVISO* ⚠️\n\nCiao ${customer}, ti abbiamo contattato per confermare il tuo ordine di *${productName}* ma non abbiamo ricevuto risposta.\n\nTi informiamo che questo è l'ultimo tentativo di contatto. Se non confermi entro oggi saremo costretti ad annullare la tua richiesta per liberare lo stock ad altri clienti.\n\nRispondi ora a questo messaggio per confermare la spedizione!`;
        } else if (contactType === 'refund') {
            message = `Ciao ${customer}, ti contattiamo in merito alla tua richiesta di rimborso per l'ordine di *${productName}*.\n\nTi ricordiamo che, ai sensi dell’art. 52 del Codice del Consumo, hai diritto di recedere entro *14 giorni* dalla ricezione del prodotto.\n\n*PROCEDURA DI RESO:*\n1. Puoi rispedire il pacco andando in un qualsiasi ufficio postale.\n2. L'indirizzo di destinazione è lo *stesso indirizzo del mittente* che trovi sull'etichetta del pacco che hai ricevuto.\n3. Le spese di restituzione sono a carico del cliente.\n\n*TERMINI E CONDIZIONI:*\n- Il prodotto deve essere restituito *integro, non utilizzato e nella confezione originale*.\n- Le spese di spedizione iniziali e il contributo per il contrassegno *non sono rimborsabili*.\n- Il diritto di recesso è escluso per prodotti personalizzati o sigillati per motivi igienici se aperti (es. intimo).\n\n*RIMBORSO:*\nUna volta inviato il pacco, inviaci pure qui il tuo *codice IBAN*. Procederemo al bonifico entro 14 giorni da quando riceveremo il pacco, previa verifica delle condizioni sopra indicate.\n\nGrazie.`;
        } else if (contactType === 'failed_delivery') {
            message = `Ciao ${customer}, ti informiamo che il corriere ha tentato la consegna del tuo ordine di *${productName}* oggi ma non ha trovato nessuno.\n\nNon preoccuparti, verrà effettuato un nuovo tentativo di consegna domani.\n\nTi ricordiamo di preparare l'importo esatto di *${finalAmountText}* per il contrassegno, così da velocizzare la consegna.\n\nAssicurati di essere reperibile. Grazie!`;
        } else {
            message = template
                .replace('{customerName}', customer)
                .replace('{productName}', productName)
                .replace('{saleAmount}', finalAmountText);
        }
    }
    
    setEditableMessage(message);
  }, [sale, products, selectedGiacenzaOption, template, contactType]);
    
  const handleContactClick = async () => {
    let action: ContactAction;

    if (sale.status === 'Giacenza') {
        action = `giacenza_${selectedGiacenzaOption}` as ContactAction;
    } else {
        if (contactType === 'last_warning') action = 'last_warning';
        else if (contactType === 'out_of_stock') action = 'out_of_stock_delay';
        else if (contactType === 'refund') action = 'refund_request';
        else if (contactType === 'failed_delivery') action = 'welcome_message'; // Si può mappare su un'azione specifica se definita in tipi
        else action = 'welcome_message';
    }
    
    const newHistoryItem: ContactHistoryItem = {
        id: `c_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
        action: action,
        message: editableMessage,
    };
    
    await onLogContact(sale.id, newHistoryItem);

    const cleanedPhone = getCleanedPhone(sale.customerPhone);
    const encodedMessage = encodeURIComponent(editableMessage);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanedPhone}&text=${encodedMessage}`;

    const width = 850;
    const height = 900;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    const windowFeatures = `popup=yes,width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`.replace(/\s/g, '');

    const popup = window.open(whatsappUrl, 'MWS_WhatsApp_Contact', windowFeatures);
    if (popup) {
        popup.focus();
    } else {
        alert("Il blocco pop-up è attivo nel tuo browser.");
    }
  };

  const handleTransitionToExpiry = async () => {
      if (!window.confirm("Confermi di voler spostare l'ordine in SCADENZA 24H? Verrà registrato l'ultimo avviso nella cronologia.")) return;
      
      setIsProcessingTransition(true);
      try {
          const newHistoryItem: ContactHistoryItem = {
              id: `c_${Date.now()}`,
              userId: user.id,
              userName: user.name,
              timestamp: new Date().toISOString(),
              action: 'last_warning',
              message: "Ordine spostato manualmente in scadenza 24h tramite tasto rapido.",
          };
          
          if (onLastWarning) {
              // Utilizziamo la funzione atomica passata da App.tsx
              await onLastWarning(sale.id, newHistoryItem);
          } else {
              // Fallback se la prop non è definita
              await onLogContact(sale.id, newHistoryItem);
              await onUpdate(sale.id, 'Contattato');
          }
          
          onClose();
      } catch (e: any) {
          alert("Errore durante lo spostamento: " + e.message);
      } finally {
          setIsProcessingTransition(false);
      }
  };

  const handleAddressUpdate = async () => {
    setIsSavingAddress(true);
    await onUpdateAddress(sale.id, address);
    setIsSavingAddress(false);
  };

  const handleNotesUpdate = async () => {
      setIsSavingNotes(true);
      await onUpdateNotes(sale.id, notes);
      setIsSavingNotes(false);
  };

  const handleStatusUpdate = async (newStatus: SaleStatus) => {
    if (notes !== (sale.notes || '')) {
      await handleNotesUpdate();
    }
    onUpdate(sale.id, newStatus);
  };
  
  const getActionLabel = (action: ContactAction): string => {
    const labels: Record<ContactAction, string> = {
        'welcome_message': 'Messaggio di Benvenuto',
        'giacenza_redelivery': 'Giacenza - Nuova Consegna',
        'giacenza_pickup': 'Giacenza - Ritiro in Sede',
        'giacenza_find_depot': 'Giacenza - Trova Sede',
        'out_of_stock_delay': 'Stock Esaurito (Attesa 3gg)',
        'last_warning': '⚠️ ULTIMO AVVISO',
        'refund_request': 'Richiesta Rimborso (T&C)',
    };
    return labels[action] || 'Azione Sconosciuta';
  }

  const renderMessageEditor = () => (
    <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-base leading-6 font-black text-gray-800 uppercase italic tracking-wider">Editor Messaggio WhatsApp</h3>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Puoi modificare il testo</span>
        </div>
        <textarea
            value={editableMessage}
            onChange={(e) => setEditableMessage(e.target.value)}
            rows={8}
            className="w-full p-4 text-sm text-gray-700 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none shadow-inner"
            placeholder="Scrivi qui il messaggio personalizzato..."
        />
    </div>
  );

  return (
    <div className="p-2 space-y-6 max-h-[75vh] overflow-y-auto pr-4">
      {sale.status === 'Giacenza' ? (
          <div>
            <h3 className="text-lg leading-6 font-bold text-primary mb-2">Gestione Giacenza</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <button onClick={() => setSelectedGiacenzaOption('redelivery')} className={`p-2 text-xs font-bold rounded-lg border-2 transition-all ${selectedGiacenzaOption === 'redelivery' ? 'border-primary bg-primary text-white shadow-md' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>Nuova Consegna</button>
                <button onClick={() => setSelectedGiacenzaOption('pickup')} className={`p-2 text-xs font-bold rounded-lg border-2 transition-all ${selectedGiacenzaOption === 'pickup' ? 'border-primary bg-primary text-white shadow-md' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>Ritiro Sede</button>
                <button onClick={() => setSelectedGiacenzaOption('find_depot')} className={`p-2 text-xs font-bold rounded-lg border-2 transition-all ${selectedGiacenzaOption === 'find_depot' ? 'border-primary bg-primary text-white shadow-md' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>Trova Deposito</button>
            </div>
            {renderMessageEditor()}
          </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="text-lg leading-6 font-bold text-primary border-b pb-2 uppercase tracking-tighter italic">Dati Cliente</h3>
                <DetailRow label="Nome" value={sale.customerName} />
                <DetailRow label="Telefono" value={sale.customerPhone} />
                
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Verifica Magazzino Disponibile</p>
                    <div className="space-y-2">
                        {stockInfo?.map((s, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-700 truncate mr-2">{s.name}:</span>
                                <span className={`text-xs font-black px-3 py-1 rounded-lg ${
                                    s.quantity <= 0 ? 'bg-red-100 text-red-600 animate-pulse border border-red-200' :
                                    s.quantity <= 10 ? 'bg-orange-100 text-orange-600 border border-orange-200' :
                                    'bg-green-100 text-green-600 border border-green-200'
                                }`}>
                                    {s.quantity <= 0 ? 'ESAURITO' : `${s.quantity} pz`}
                                </span>
                            </div>
                        ))}
                    </div>
                    {isOutOfStockDetected && (
                        <p className="mt-3 text-[9px] font-bold text-red-600 uppercase bg-red-50 p-2 rounded-lg border border-red-100 text-center italic">
                            ⚠️ Attenzione: Stock insufficiente. Invia il messaggio di attesa.
                        </p>
                    )}
                </div>

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3">Seleziona Tipo Messaggio WhatsApp</label>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setContactType('welcome')} 
                                className={`flex-1 py-2 text-[10px] font-black rounded-lg border-2 transition-all ${contactType === 'welcome' ? 'border-primary bg-primary text-white shadow-sm' : 'border-gray-200 bg-white text-gray-400'}`}
                            >
                                BENVENUTO
                            </button>
                            <button 
                                onClick={() => setContactType('out_of_stock')} 
                                className={`flex-1 py-2 text-[10px] font-black rounded-lg border-2 transition-all ${contactType === 'out_of_stock' ? 'border-orange-500 bg-orange-500 text-white shadow-lg' : (isOutOfStockDetected ? 'border-orange-300 bg-orange-50 text-orange-400' : 'border-gray-200 bg-white text-gray-400')}`}
                            >
                                📦 STOCK FINITO
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setContactType('refund')} 
                                className={`flex-1 py-2 text-[10px] font-black rounded-lg border-2 transition-all ${contactType === 'refund' ? 'border-slate-700 bg-slate-700 text-white shadow-lg' : 'border-gray-200 bg-white text-gray-400'}`}
                            >
                                💸 RIMBORSO
                            </button>
                            <button 
                                onClick={() => setContactType('failed_delivery')} 
                                className={`flex-1 py-2 text-[10px] font-black rounded-lg border-2 transition-all ${contactType === 'failed_delivery' ? 'border-blue-600 bg-blue-600 text-white shadow-lg' : 'border-gray-200 bg-white text-gray-400'}`}
                            >
                                🚚 CONS. FALLITA
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setContactType('last_warning')} 
                                className={`flex-1 py-2 text-[10px] font-black rounded-lg border-2 transition-all ${contactType === 'last_warning' ? 'border-red-600 bg-red-600 text-white shadow-xl animate-pulse' : 'border-red-100 bg-white text-red-400'}`}
                            >
                                ⚠️ ULTIMO AVVISO
                            </button>
                        </div>
                    </div>
                </div>

                {isCustomerCare && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Modifica Indirizzo</label>
                        <div className="space-y-2">
                            <input type="text" value={address.street} onChange={e => handleAddressFieldChange('street', e.target.value)} placeholder="Indirizzo" className="block w-full input-style" />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={address.houseNumber} onChange={e => handleAddressFieldChange('houseNumber', e.target.value)} placeholder="Civico" className="block w-full input-style" />
                                <input type="text" value={address.zip} onChange={e => handleAddressFieldChange('zip', e.target.value)} placeholder="CAP" className="block w-full input-style" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={address.city} onChange={e => handleAddressFieldChange('city', e.target.value)} placeholder="Città" className="block w-full input-style" />
                                <input type="text" value={address.province} onChange={e => handleAddressFieldChange('province', e.target.value)} placeholder="PR" maxLength={2} className="block w-full input-style" />
                            </div>
                        </div>
                        <button onClick={handleAddressUpdate} disabled={isSavingAddress} className="mt-3 w-full bg-secondary text-primary font-black py-2 text-xs rounded-lg hover:brightness-110 transition-all uppercase tracking-widest">{isSavingAddress ? 'Salvataggio...' : 'Conferma Nuovo Indirizzo'}</button>
                    </div>
                )}
            </div>
            {renderMessageEditor()}
          </div>
      )}
      
      <div className="pt-4 border-t border-gray-100 space-y-4">
        {isFromSolleciti && (
             <button 
                onClick={handleTransitionToExpiry} 
                disabled={isProcessingTransition}
                className="inline-flex items-center justify-center gap-3 w-full bg-red-600 text-white font-black py-5 px-6 rounded-xl hover:bg-red-700 transition-all shadow-xl active:scale-95 border-b-4 border-red-800 disabled:opacity-50"
            >
                <ClockIcon className="w-6 h-6" />
                <span className="uppercase tracking-widest">⚠️ SPOSTA IN SCADENZA 24H (Attiva Timer)</span>
            </button>
        )}

        <div className="pt-2 text-center">
            <button onClick={() => handleContactClick()} className="inline-flex items-center justify-center gap-3 w-full bg-green-600 text-white font-black py-4 px-6 rounded-xl hover:bg-green-700 transition-all shadow-lg active:scale-95">
                <WhatsAppIcon className="w-6 h-6" />
                <span className="uppercase tracking-widest">Contatta su WhatsApp</span>
            </button>
            {isFromSolleciti && <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic text-center">Usa questo tasto solo per inviare il messaggio senza attivare il timer di scadenza</p>}
        </div>
      </div>

      {(sale.contactHistory && sale.contactHistory.length > 0) && (
        <div className="pt-6 border-t border-gray-100">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Cronologia Comunicazioni</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {sale.contactHistory.map(item => (
                    <div key={item.id} className={`p-3 border rounded-xl flex flex-col gap-1 ${item.action === 'last_warning' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-gray-400">{new Date(item.timestamp).toLocaleString('it-IT')}</span>
                            <span className={`text-[10px] font-black uppercase ${item.action === 'last_warning' ? 'text-red-600' : 'text-primary'}`}>{item.userName}</span>
                        </div>
                        <p className={`text-xs font-bold ${item.action === 'last_warning' ? 'text-red-700' : 'text-gray-700'}`}>{getActionLabel(item.action)}</p>
                    </div>
                )).reverse()}
            </div>
        </div>
      )}

      {isCustomerCare && (
        <div className="pt-6 border-t border-gray-100">
          <h3 className="text-lg leading-6 font-bold text-primary mb-4 uppercase italic tracking-tighter">Aggiorna Stato Ordine</h3>
          <div className="mb-4">
            <label htmlFor="contact-notes" className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Note per il Reparto Logistica</label>
            <div className="flex items-start gap-2">
                <textarea id="contact-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="block w-full input-style resize-none" placeholder="Esempio: Il cliente ha chiesto di consegnare dopo le 14:00..." />
                <button onClick={handleNotesUpdate} disabled={isSavingNotes} className="bg-gray-100 text-gray-600 font-bold py-2 px-3 rounded-lg border hover:bg-gray-200 flex-shrink-0">{isSavingNotes ? '...' : 'Salva'}</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button onClick={() => handleStatusUpdate('Confermato')} className="bg-green-600 text-white font-black py-3 text-xs rounded-xl hover:bg-green-700 transition-all shadow-md uppercase">Confermato</button>
            <button onClick={() => handleStatusUpdate('Contattato')} className="bg-sky-600 text-white font-black py-3 text-xs rounded-xl hover:bg-sky-700 transition-all shadow-md uppercase">Contattato</button>
            <button onClick={() => handleStatusUpdate('Cancellato')} className="bg-red-600 text-white font-black py-3 text-xs rounded-xl hover:bg-red-700 shadow-md uppercase">Cancellato</button>
            <button onClick={() => handleStatusUpdate('Non raggiungibile')} className="bg-gray-500 text-white font-black py-3 text-xs rounded-xl hover:bg-gray-600 shadow-md uppercase">NON REPERIBILE</button>
          </div>
        </div>
      )}
       <style>{`.input-style { px-3 py-2 bg-white border-2 border-gray-100 rounded-xl shadow-sm focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none sm:text-sm transition-all } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }`}</style>
    </div>
  );
};

export default CustomerContactModal;