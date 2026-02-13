
import React, { useState, useEffect } from 'react';
import { Sale, SaleStatus, User, UserRole, Product, Affiliate, PlatformSettings, StaffMessage } from '../types';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import StaffChat from './StaffChat';
import Modal from './Modal';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { fetchStaffMessages, markStaffMessagesAsRead } from '../database';

interface OrderDetailProps {
  sale: Sale;
  user: User;
  products: Product[];
  affiliates: User[];
  allSales: Sale[];
  platformSettings?: PlatformSettings;
  onSave: (sale: Sale) => void;
  onSwitchOrder?: (sale: Sale) => void;
}

const ALL_STATUSES: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Annullato', 'Cancellato', 'Spedito', 'Svincolato', 'Consegnato', 'Non raggiungibile', 'Non ritirato', 'Giacenza'];

const DetailRow: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className = '' }) => (
  <div className={`py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-t border-gray-200 ${className}`}>
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || '-'}</dd>
  </div>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-lg leading-6 font-bold text-primary mb-2 mt-4">{title}</h3>
);

const InputField = ({ value, onChange, placeholder, className = "" }: any) => (
  <input 
    type="text" 
    value={value} 
    onChange={(e) => onChange(e.target.value)} 
    placeholder={placeholder}
    className={`block w-full px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${className}`}
  />
);

const getStatusBadge = (status: SaleStatus) => {
    const colorClass = {
        'Consegnato': 'bg-green-100 text-green-800',
        'Svincolato': 'bg-teal-100 text-teal-800',
        'Spedito': 'bg-indigo-700 text-white',
        'Confermato': 'bg-blue-100 text-blue-800',
        'Contattato': 'bg-cyan-100 text-cyan-800',
        'In attesa': 'bg-yellow-100 text-yellow-800',
        'Non raggiungibile': 'bg-amber-100 text-amber-800',
        'Non ritirato': 'bg-orange-100 text-orange-800',
        'Giacenza': 'bg-orange-100 text-orange-800',
        'Cancellato': 'bg-red-100 text-red-800',
        'Annullato': 'bg-red-100 text-red-800',
        'Duplicato': 'bg-gray-200 text-gray-700',
        'Test': 'bg-purple-100 text-purple-800',
    }[status] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{status}</span>;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ sale, user, products, affiliates, allSales, onSave, onSwitchOrder, platformSettings = {} }) => {
  const [currentStatus, setCurrentStatus] = useState<SaleStatus>(sale.status);
  const [isBonus, setIsBonus] = useState(!!sale.isBonus);
  const [trackingCode, setTrackingCode] = useState<string>(sale.trackingCode || '');
  
  const [customerName, setCustomerName] = useState(sale.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(sale.customerPhone || '');
  const [streetAddress, setStreetAddress] = useState(sale.customer_street_address || '');
  const [houseNumber, setHouseNumber] = useState(sale.customer_house_number || '');
  const [city, setCity] = useState(sale.customer_city || '');
  const [province, setProvince] = useState(sale.customer_province || '');
  const [zip, setZip] = useState(sale.customer_zip || '');

  const [error, setError] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isStaff = [UserRole.ADMIN, UserRole.MANAGER, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE].includes(user.role);
  const isEditable = isStaff;
  const isAdmin = user.role === UserRole.ADMIN;
  const isLogistics = user.role === UserRole.LOGISTICS;
  const isCustomerCare = user.role === UserRole.CUSTOMER_CARE;
  const product = products.find(p => p.id === sale.productId);

  const affiliateInfo = affiliates.find(a => a.id === sale.affiliateId);
  const displayAffiliateId = affiliateInfo?.short_id || affiliateInfo?.id || sale.affiliateId;

  const loadUnreadCount = async () => {
    if (isStaff) {
        const msgs = await fetchStaffMessages(sale.id);
        const unread = msgs.filter(m => !m.read_by?.includes(user.id)).length;
        setUnreadCount(unread);
    }
  };

  useEffect(() => {
    loadUnreadCount();
  }, [sale.id, isStaff, user.id]);

  useEffect(() => {
    setCurrentStatus(sale.status);
    setIsBonus(!!sale.isBonus);
    setTrackingCode(sale.trackingCode || '');
    setCustomerName(sale.customerName || '');
    setCustomerPhone(sale.customerPhone || '');
    setStreetAddress(sale.customer_street_address || '');
    setHouseNumber(sale.customer_house_number || '');
    setCity(sale.customer_city || '');
    setProvince(sale.customer_province || '');
    setZip(sale.customer_zip || '');
  }, [sale.id]);

  const handleOpenChat = async () => {
      setIsChatOpen(true);
      if (unreadCount > 0) {
          setUnreadCount(0);
          await markStaffMessagesAsRead(sale.id, user.id);
      }
  };

  const getWhatsAppLink = (phone: string | undefined): string => {
    if (!phone) return '';
    let cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length === 10 && cleanedPhone.startsWith('3')) {
        cleanedPhone = `39${cleanedPhone}`;
    }
    return `https://wa.me/${cleanedPhone}`;
  }

  const handleSave = () => {
    if (currentStatus === 'Spedito' && !trackingCode.trim()) {
      setError('Il codice di tracciamento è obbligatorio per lo stato "Spedito".');
      return;
    }
    setError('');
    
    const updates: Partial<Sale> = {
      status: currentStatus,
      isBonus,
      trackingCode: trackingCode.trim() ? trackingCode.trim() : undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customer_street_address: streetAddress.trim(),
      customer_house_number: houseNumber.trim(),
      customer_city: city.trim(),
      customer_province: province.trim().toUpperCase(),
      customer_zip: zip.trim(),
      statusUpdatedAt: new Date().toISOString(),
    };

    if (user.role === UserRole.CUSTOMER_CARE) {
        updates.lastContactedBy = user.id;
        updates.lastContactedByName = user.name;
    }

    onSave({ ...sale, ...updates });
  };

  const hasChanges = 
    currentStatus !== sale.status || 
    trackingCode !== (sale.trackingCode || '') || 
    isBonus !== !!sale.isBonus ||
    customerName !== (sale.customerName || '') ||
    customerPhone !== (sale.customerPhone || '') ||
    streetAddress !== (sale.customer_street_address || '') ||
    houseNumber !== (sale.customer_house_number || '') ||
    city !== (sale.customer_city || '') ||
    province !== (sale.customer_province || '') ||
    zip !== (sale.customer_zip || '');

  const variantDisplay = sale.selectedVariants && sale.selectedVariants.length > 0 
      ? sale.selectedVariants.map(v => v.variantName).join(', ') 
      : sale.variantName;

  const orderQuantity = sale.quantity ?? 1;

  const handleTrackingCodeChange = (val: string) => {
    setTrackingCode(val);
    if (val.trim() !== '' && ['In attesa', 'Contattato', 'Confermato', 'Giacenza'].includes(currentStatus)) {
        setCurrentStatus('Spedito');
    }
  };

  return (
    <div>
      <style>{`
        .toggle-checkbox:checked { right: 0; border-color: #4caf50; }
        .toggle-checkbox:checked + .toggle-label { background-color: #4caf50; }
      `}</style>
      <div className="max-h-[75vh] overflow-y-auto pr-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <SectionTitle title="Riepilogo Ordine" />
              <dl>
                  <DetailRow label="ID Ordine" value={<span className="font-mono">{sale.id}</span>} className="border-t-0" />
                  <DetailRow label="Data Ordine" value={new Date(sale.saleDate).toLocaleString('it-IT')} />
                  
                  {(sale.variantName || (sale.selectedVariants && sale.selectedVariants.length > 0)) && (
                    <DetailRow 
                      label="Variante/i Prodotto" 
                      value={
                        <div className="flex flex-wrap gap-2">
                          {sale.selectedVariants && sale.selectedVariants.length > 0 ? (
                            sale.selectedVariants.map((v, i) => (
                              <span key={i} className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-lg text-xs font-black uppercase">
                                {i+1}. {v.variantName}
                              </span>
                            ))
                          ) : (
                            <span className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-black uppercase shadow-sm">
                              {sale.variantName}
                            </span>
                          )}
                        </div>
                      } 
                    />
                  )}

                  <DetailRow label="Quantità Totale" value={<span className="font-black text-primary text-base">{orderQuantity} pz</span>} />
                  
                  <DetailRow label="Pagamento" value={
                      sale.paymentMethod === 'card' ? (
                          <div className="flex items-center gap-2">
                              <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase shadow-sm">CARTA</span>
                              <span className="text-green-600 font-bold text-xs uppercase tracking-tighter">✓ PAGATO</span>
                          </div>
                      ) : (
                          <span className="bg-orange-50 text-orange-700 text-[10px] font-black px-3 py-1 rounded-lg border border-orange-200 uppercase">CONTRASSEGNO (COD)</span>
                      )
                  } />

                  <DetailRow label="Stato" value={
                      isEditable && !['Duplicato', 'Test'].includes(sale.status) ? (
                          <select value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value as SaleStatus)} className="block w-full max-w-xs px-3 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
                              {ALL_STATUSES.map(status => (
                                  <option key={status} value={status}>{status}</option>
                              ))}
                          </select>
                      ) : (
                          <span className="flex items-center gap-2">
                              {getStatusBadge(sale.status)}
                              {sale.isBonus && <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800">BONUS</span>}
                          </span>
                      )
                  } />
                  
                  <div className="mt-4 p-4 bg-gray-50 border rounded-xl border-dashed">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dettaglio Economico (Costi basati su Metodo Pagamento)</p>
                      {isAdmin && product ? (
                          (() => {
                              const isCard = sale.paymentMethod === 'card';
                              const affiliateCommission = sale.commissionAmount;
                              
                              // Logica di fallback per i costi se i campi carta sono 0
                              const logisticsCommission = isCard ? (product.fulfillmentCostCard || product.fulfillmentCost || 0) : (product.fulfillmentCost || 0);
                              const shippingCost = isCard ? (product.shippingCostCard || product.shippingCost || 0) : (product.shippingCost || 0);
                              const customerCareCommission = isCard ? (product.customerCareCommissionCard || product.customerCareCommission || 0) : (product.customerCareCommission || 0);
                              
                              const cogs = (product.costOfGoods || 0) * orderQuantity;
                              const directCosts = affiliateCommission + logisticsCommission + cogs + shippingCost + customerCareCommission;
                              const netProfit = sale.saleAmount - directCosts;

                              return (
                                  <div className="space-y-2 text-sm">
                                      <div className="flex justify-between"><span>Vendita Lorda:</span><span className="font-bold">€{sale.saleAmount.toFixed(2)}</span></div>
                                      <div className="flex justify-between text-red-600"><span>Comm. Affiliato (Reale):</span><span>-€{affiliateCommission.toFixed(2)}</span></div>
                                      <div className="flex justify-between text-red-500"><span>Logistica ({isCard ? 'Carta' : 'COD'}):</span><span>-€{logisticsCommission.toFixed(2)}</span></div>
                                      <div className="flex justify-between text-red-500"><span>Spedizione ({isCard ? 'Carta' : 'COD'}):</span><span>-€{shippingCost.toFixed(2)}</span></div>
                                      <div className="flex justify-between text-red-500"><span>C. Care ({isCard ? 'Carta' : 'COD'}):</span><span>-€{customerCareCommission.toFixed(2)}</span></div>
                                      <div className="flex justify-between text-red-500"><span>COGS Merce:</span><span>-€{cogs.toFixed(2)}</span></div>
                                      <div className="pt-2 border-t flex justify-between font-black text-primary text-base">
                                          <span>UTILE NETTO REALE:</span>
                                          <span>€{netProfit.toFixed(2)}</span>
                                      </div>
                                  </div>
                              );
                          })()
                      ) : (
                          <div className="space-y-2">
                              {!isLogistics && !isCustomerCare && (
                                  <>
                                      <div className="flex justify-between"><span>Prezzo Ordine:</span><span className="font-bold">€{sale.saleAmount.toFixed(2)}</span></div>
                                      <div className="flex justify-between text-green-600 font-bold"><span>Tua Commissione Affiliato:</span><span>€{sale.commissionAmount.toFixed(2)}</span></div>
                                  </>
                              )}
                              {isLogistics && product && (
                                  <div className="flex justify-between text-indigo-600 font-bold">
                                      <span>Tua Commissione Logistica:</span>
                                      <span>€{(sale.paymentMethod === 'card' ? (product.fulfillmentCostCard || product.fulfillmentCost || 0) : (product.fulfillmentCost || 0)).toFixed(2)}</span>
                                  </div>
                              )}
                              {isCustomerCare && product && (
                                  <div className="flex justify-between text-indigo-600 font-bold">
                                      <span>Tua Commissione C. Care:</span>
                                      <span>€{(sale.paymentMethod === 'card' ? (product.customerCareCommissionCard || product.customerCareCommission || 0) : (product.customerCareCommission || 0)).toFixed(2)}</span>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </dl>
            </div>
            
            <div>
              <SectionTitle title="Dettagli Cliente" />
              <dl>
                <DetailRow label="Nome Cliente" value={
                  isEditable ? <InputField value={customerName} onChange={setCustomerName} placeholder="Nome e Cognome" /> : customerName
                } className="border-t-0" />
                
                <DetailRow label="Telefono Cliente" value={
                  isEditable ? (
                    <div className="flex items-center gap-2">
                      <InputField value={customerPhone} onChange={setCustomerPhone} placeholder="Numero di Telefono" />
                      {customerPhone && (
                        <a href={getWhatsAppLink(customerPhone)} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors">
                          <WhatsAppIcon className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  ) : (
                    sale.customerPhone ? (
                      <div className="flex items-center gap-2">
                          <span>{sale.customerPhone}</span>
                          <a href={getWhatsAppLink(sale.customerPhone)} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors">
                          <WhatsAppIcon className="w-5 h-5" />
                          </a>
                      </div>
                      ) : ('-')
                  )
                } />

                <DetailRow label="Indirizzo" value={
                  isEditable ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-3">
                           <InputField value={streetAddress} onChange={setStreetAddress} placeholder="Via/Piazza" />
                        </div>
                        <InputField value={houseNumber} onChange={setHouseNumber} placeholder="Civico" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <InputField value={city} onChange={setCity} placeholder="Città" />
                        <InputField value={province} onChange={setProvince} placeholder="PR" className="uppercase" />
                        <InputField value={zip} onChange={setZip} placeholder="CAP" />
                      </div>
                    </div>
                  ) : `${sale.customer_street_address || ''} ${sale.customer_house_number || ''}, ${sale.customer_city || ''} (${sale.customer_province || ''})`
                } />
              </dl>
            </div>

            <div>
              <SectionTitle title="Dettagli Prodotto & Affiliazione" />
              <dl>
                <DetailRow label="Prodotto" value={sale.productName} className="border-t-0" />
                <DetailRow label="Affiliato" value={<span>{sale.affiliateName} (<span className="font-mono text-primary font-bold">{displayAffiliateId}</span>)</span>} />
              </dl>
            </div>
          </div>

          <div className="lg:col-span-1">
             {isEditable && 
                <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3">Gestione Bonus</p>
                    <div className="flex items-center">
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" name="isBonusDetail" id="isBonusDetail" checked={isBonus} onChange={() => setIsBonus(!isBonus)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="isBonusDetail" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                        <label htmlFor="isBonusDetail" className={`text-sm ${isBonus ? 'text-purple-600 font-bold uppercase' : 'text-gray-500 font-medium'}`}>{isBonus ? 'Bonus Abilitato' : 'Bonus Disabilitato'}</label>
                    </div>
                </div>
            }

            {isStaff && (
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 shadow-sm">
                    <SectionTitle title="Comunicazione Reparti" />
                    <p className="text-xs text-gray-500 mb-6 leading-relaxed">Usa la chat interna per coordinarti con Logistica o Customer Care.</p>
                    <button 
                        onClick={handleOpenChat}
                        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-primary text-primary font-black py-4 rounded-xl hover:bg-primary hover:text-white transition-all shadow-md active:scale-95 relative group overflow-visible"
                    >
                        <ChatBubbleLeftRightIcon className="w-6 h-6" />
                        <span className="uppercase tracking-widest text-xs">APRI CHAT INTERNA</span>
                        {unreadCount > 0 && (
                            <span className="absolute -top-3 -right-3 min-w-[24px] h-6 bg-red-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-bounce z-10">
                                <span className="text-[11px] text-white font-black px-1">{unreadCount}</span>
                            </span>
                        )}
                    </button>
                </div>
            )}
            
            <div className="mt-8 space-y-4">
              <SectionTitle title="Tracking & Info" />
              <dl className="text-sm">
                <div className="flex justify-between py-2 border-t">
                  <span className="text-gray-500">Tracking Code:</span>
                  {isEditable ? (
                    <InputField value={trackingCode} onChange={handleTrackingCodeChange} placeholder="Codice Tracking" className="max-w-[150px]" />
                  ) : (
                    <span className="font-mono font-bold">{sale.trackingCode || '-'}</span>
                  )}
                </div>
                <div className="flex justify-between py-2 border-t">
                  <span className="text-gray-500">Sub ID:</span>
                  <span className="font-mono">{sale.subId || '-'}</span>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
      {isEditable && hasChanges && !['Duplicato', 'Test'].includes(sale.status) && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-right">
            {error && <p className="text-red-500 text-sm mb-2 text-right">{error}</p>}
            <button
                onClick={handleSave}
                className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200 shadow-md active:scale-95"
            >
                Salva Modifiche Ordine
            </button>
        </div>
      )}

      {isStaff && (
          <Modal 
            isOpen={isChatOpen} 
            onClose={() => {
                setIsChatOpen(false);
                loadUnreadCount();
            }} 
            title={`Chat Interna - Ordine ${sale.id}`}
            size="2xl"
          >
              <StaffChat sale={sale} user={user} settings={platformSettings} allSales={allSales} onSwitchOrder={(s) => {
                  if (onSwitchOrder) onSwitchOrder(s);
                  setIsChatOpen(false);
              }} />
          </Modal>
      )}
    </div>
  );
};

export default OrderDetail;
