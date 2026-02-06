import React, { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Modal from './components/Modal';
import * as db from './database';
import { User, UserRole, Product, Affiliate, Sale, Manager, LogisticsUser, Notification, Transaction, Ticket, CustomerCareUser, Admin, PlatformSettings, StockExpense, TicketStatus, SaleStatus, ContactHistoryItem, View } from './types';

const AffiliateManager = lazy(() => import('./components/AffiliateManager'));
const AffiliateForm = lazy(() => import('./components/AffiliateForm'));
const ManagerList = lazy(() => import('./components/ManagerList'));
const ManagerForm = lazy(() => import('./components/ManagerForm'));
const OrderList = lazy(() => import('./components/OrderList'));
const OrderDetail = lazy(() => import('./components/OrderDetail'));
const CustomerCareUserModal = lazy(() => import('./components/CustomerContactModal'));
const ProductList = lazy(() => import('./components/ProductList'));
const ProductDetail = lazy(() => import('./components/ProductDetail'));
const ProductForm = lazy(() => import('./components/ProductForm'));
const NicheManager = lazy(() => import('./components/NicheManager'));
const Performance = lazy(() => import('./components/Performance'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const PaymentsPage = lazy(() => import('./components/PaymentsPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const InventoryPage = lazy(() => import('./components/InventoryPage'));
const AccountingPage = lazy(() => import('./components/AccountingPage'));
const AssistancePage = lazy(() => import('./components/AssistancePage'));
const TicketDetailView = lazy(() => import('./components/TicketDetailView'));
const NotificationListView = lazy(() => import('./components/NotificationListView'));
const NotificationDetailView = lazy(() => import('./components/NotificationDetailView'));
const NotificationPopupHost = lazy(() => import('./components/NotificationPopupHost'));
const NotificationManager = lazy(() => import('./components/NotificationManager'));
const PlatformCheckModal = lazy(() => import('./components/PlatformCheckModal'));
const GeneralCalculations = lazy(() => import('./components/GeneralCalculations'));

const ViewLoader = () => (
    <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>(() => {
    const hash = window.location.hash.replace('#', '');
    return (hash as View) || 'login';
  });
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [allProfiles, setAllProfiles] = useState<User[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({});
  const [stockExpenses, setStockExpenses] = useState<StockExpense[]>([]);

  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Sale | null>(null);
  const [viewingNotification, setViewingNotification] = useState<Notification | null>(null);
  const [contactingSale, setContactingSale] = useState<Sale | null>(null);
  const [contactingFromSolleciti, setContactingFromSolleciti] = useState(false);
  const [niches, setNiches] = useState<string[]>(['Generale']);
  
  const [isAffiliateFormOpen, setIsAffiliateFormOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [isManagerFormOpen, setIsManagerFormOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNicheManagerOpen, setIsNicheManagerOpen] = useState(false);
  const [isPlatformCheckOpen, setIsPlatformCheckOpen] = useState(false);
  
  const [automationStatus, setAutomationStatus] = useState<{message: string, type: 'info' | 'success' | 'error'} | null>(null);

  const fetchData = useCallback(async () => {
    try {
        const [data, settings] = await Promise.all([db.fetchAllInitialData(), db.getSettings()]);
        setProducts(data.products || []);
        setAllProfiles(data.profilesList || []);
        setAffiliates(data.profilesList.filter(p => p.role === UserRole.AFFILIATE) as Affiliate[]);
        setManagers(data.profilesList.filter(p => p.role === UserRole.MANAGER) as Manager[]);
        setSales(data.sales || []);
        setNotifications(data.notifications || []);
        setTickets(data.tickets as Ticket[] || []);
        setTransactions(data.transactions || []);
        setStockExpenses(data.stockExpenses || []);
        setPlatformSettings(settings || {});
        if (settings?.available_niches) {
            try { setNiches(JSON.parse(settings.available_niches)); } catch (e) { setNiches(['Generale']); }
        }
    } catch (error) { console.error(error); }
  }, []);

  useEffect(() => {
    window.location.hash = view;
  }, [view]);

  useEffect(() => {
    const handleHashChange = () => {
        const newView = window.location.hash.replace('#', '') as View;
        if (newView && newView !== view) {
            if (!user && newView !== 'login') {
                window.location.hash = 'login';
                return;
            }
            setView(newView);
        }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [view, user]);

  useEffect(() => {
    const startApp = async () => {
      const settings = await db.getSettings();
      setPlatformSettings(settings || {});
      
      const { data: { session } } = await db.supabase.auth.getSession();
      if (session?.user) {
        const profile = await db.getCurrentProfile(session.user.id);
        if (profile) { 
            setUser(profile); 
            fetchData();
            if (view === 'login') setView('dashboard');
        } else {
            setView('login');
        }
      } else {
        setView('login');
      }
      setLoading(false);
    };
    startApp();
  }, [fetchData]);

  useEffect(() => {
    if (platformSettings.platform_logo) {
      const favicon = document.getElementById('favicon') as HTMLLinkElement;
      if (favicon) {
        favicon.href = platformSettings.platform_logo;
      }
    }
  }, [platformSettings.platform_logo]);

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;
    await db.markNotificationAsRead(id, user.id);
    fetchData();
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await db.markAllNotificationsAsRead(user.id, [user.role]);
    fetchData();
  };

  const handleViewNotification = (n: Notification) => {
    setViewingNotification(n);
    handleMarkAsRead(n.id);
    setView('notification-detail');
  };

  const handleCreateNotification = async (data: Omit<Notification, 'id' | 'createdAt' | 'readBy'>) => {
      try {
          const { error } = await db.createNotification(data);
          if (error) throw error;
          fetchData();
          alert("Notifica inviata con successo!");
      } catch (e: any) {
          alert("Errore creazione notifica: " + e.message);
      }
  };

  const handleDeleteNotification = async (id: string) => {
      if (window.confirm("Sei sicuro di voler eliminare questa notifica per tutti gli utenti?")) {
          await db.deleteNotification(id);
          fetchData();
      }
  };

  const handleUpdateNotificationSetting = async (enabled: boolean) => {
      await db.updateSetting('notify_new_product', String(enabled));
      setPlatformSettings(prev => ({ ...prev, notify_new_product: String(enabled) }));
  };

  const handleNavigateToLink = (link: string) => {
    const [targetView, targetId] = link.split('/');
    if (targetView === 'product-detail' && targetId) {
        const product = products.find(p => p.id === targetId);
        if (product) {
            setViewingProduct(product);
            setView('product-detail');
        } else {
            setView('products');
        }
    } else {
        setView(targetView as View);
    }
  };

  const handleSaveProduct = async (productData: Partial<Product> & { imageFile?: File | null, newImageFiles?: File[] }) => {
    try {
        const productId = editingProduct?.id || crypto.randomUUID();
        let finalImageUrl = productData.imageUrl || '';
        let finalGalleryUrls = productData.galleryImageUrls || [];

        if (productData.imageFile) {
            const ext = productData.imageFile.name.split('.').pop();
            const fileName = `main_${Date.now()}.${ext}`;
            finalImageUrl = await db.uploadFile(`products/${productId}/${fileName}`, productData.imageFile);
        }

        if (productData.newImageFiles && productData.newImageFiles.length > 0) {
            const uploadPromises = productData.newImageFiles.map(async (file, idx) => {
                const ext = file.name.split('.').pop();
                const fileName = `gallery_${idx}_${Date.now()}.${ext}`;
                return await db.uploadFile(`products/${productId}/${fileName}`, file);
            });
            const uploadedUrls = await Promise.all(uploadPromises);
            finalGalleryUrls = [...finalGalleryUrls, ...uploadedUrls];
        }

        const finalProductData: Partial<Product> = {
            ...productData,
            id: productId,
            imageUrl: finalImageUrl,
            galleryImageUrls: finalGalleryUrls
        };
        
        delete (finalProductData as any).imageFile;
        delete (finalProductData as any).newImageFiles;

        let savedProduct;
        if (editingProduct) {
            await db.updateProduct(productId, finalProductData);
            savedProduct = { ...editingProduct, ...finalProductData };
        } else {
            savedProduct = await db.addProduct(finalProductData);
            if (platformSettings.notify_new_product === 'true') {
                await db.createNotification({
                    title: "🚀 Nuovo Prodotto Disponibile!",
                    message: `È stato aggiunto un nuovo prodotto in piattaforma: ${finalProductData.name}. Inizia subito a promuoverlo!`,
                    targetRoles: [UserRole.AFFILIATE],
                    eventType: 'new-product',
                    linkTo: `product-detail/${savedProduct.id}`
                });
            }
        }
        setIsProductFormOpen(false);
        setEditingProduct(null);
        fetchData();
    } catch (e: any) {
        console.error("Save product error:", e);
        alert("Errore salvataggio prodotto (Storage/DB): " + e.message);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Sei sicuro di voler eliminare definitivamente questo prodotto?")) {
        try {
            await db.deleteProduct(productId);
            fetchData();
            if (viewingProduct?.id === productId) setView('products');
        } catch (e: any) {
            alert("Errore durante l'eliminazione: " + e.message);
        }
    }
  };

  const handleAddNiche = async (newNiche: string) => {
    const updatedNiches = [...niches, newNiche];
    setNiches(updatedNiches);
    await db.updateSetting('available_niches', JSON.stringify(updatedNiches));
  };

  const handleDeleteNiche = async (nicheToDelete: string) => {
    const updatedNiches = niches.filter(n => n !== nicheToDelete);
    setNiches(updatedNiches);
    await db.updateSetting('available_niches', JSON.stringify(updatedNiches));
  };

  const handleSaveAffiliate = async (data: Partial<Affiliate>) => {
    try {
      if (editingAffiliate) {
        await db.updateAffiliate(editingAffiliate.id, data);
      } else {
        alert("Per creare un nuovo utente, chiedigli di registrarsi o usa una funzione RPC dedicata.");
      }
      setIsAffiliateFormOpen(false);
      setEditingAffiliate(null);
      fetchData();
    } catch (e: any) {
      alert("Errore salvataggio: " + e.message);
    }
  };

  const handleDeleteAffiliate = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo utente?")) {
      await db.deleteAffiliate(id);
      fetchData();
    }
  };

  const handleSaveManager = async (data: Partial<Manager>) => {
    try {
      if (editingManager) {
        await db.updateAffiliate(editingManager.id, data);
      } else {
        alert("Funzione di creazione manager non disponibile direttamente. Modifica il ruolo di un utente esistente.");
      }
      setIsManagerFormOpen(false);
      setEditingManager(null);
      fetchData();
    } catch (e: any) {
      alert("Errore salvataggio manager: " + e.message);
    }
  };

  const handleDeleteManager = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo manager?")) {
      await db.deleteAffiliate(id);
      fetchData();
    }
  };

  const handleMakeFulfillmentWebhook = async (sale: Sale) => {
    if (!platformSettings.make_webhook_url) return;
    setAutomationStatus({ message: `Inoltro a Make.com...`, type: 'info' });
    try {
        const product = products.find(p => p.id === sale.productId);
        const payload = {
            event: 'fulfillment_requested',
            sale_details: sale,
            product_details: product || null,
            sender_info: {
                name: platformSettings.sender_name,
                address: platformSettings.sender_address,
                city: platformSettings.sender_city,
                zip: platformSettings.sender_zip,
                province: platformSettings.sender_province
            }
        };

        const res = await db.triggerWebhook(platformSettings.make_webhook_url, payload);
        if (!res.success) throw new Error(res.error || "Errore Webhook");
        setAutomationStatus({ message: `Dati inviati a Make!`, type: 'success' });
    } catch (err: any) {
        setAutomationStatus({ message: `Errore Webhook: ${err.message}`, type: 'error' });
    }
    setTimeout(() => setAutomationStatus(null), 5000);
  };

  const handleStatusUpdate = async (saleId: string, newStatus: SaleStatus) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const oldStatus = sale.status;
    const updates: any = { 
        status: newStatus, 
        statusUpdatedAt: new Date().toISOString() 
    };

    if (user?.role === UserRole.CUSTOMER_CARE) {
        updates.lastContactedBy = user.id;
        updates.lastContactedByName = user.name;
    }

    await db.updateSale(saleId, updates);
    
    // --- GESTIONE MAGAZZINO ALLA CONFERMA ---
    const isConfirming = newStatus === 'Confermato' && oldStatus !== 'Confermato';
    const isCancellingConfirmed = oldStatus === 'Confermato' && ['Annullato', 'Cancellato', 'Non raggiungibile', 'Duplicato'].includes(newStatus);

    if (isConfirming || isCancellingConfirmed) {
        const product = products.find(p => p.id === sale.productId);
        if (product) {
            const quantity = sale.quantity || 1;
            const multiplier = isConfirming ? -1 : 1; // Sottrai se confermo, aggiungi se annullo

            if (sale.selectedVariants && sale.selectedVariants.length > 0) {
                 const updatedVariants = product.variants?.map(v => {
                     const matchCount = sale.selectedVariants?.filter(sv => sv.variantId === v.id).length || 0;
                     return matchCount > 0 ? { ...v, stockQuantity: (v.stockQuantity || 0) + (matchCount * multiplier) } : v;
                 });
                 await db.updateProduct(product.id, { variants: updatedVariants });
            } else if (sale.variantId) {
                 const updatedVariants = product.variants?.map(v => 
                     v.id === sale.variantId ? { ...v, stockQuantity: (v.stockQuantity || 0) + (quantity * multiplier) } : v
                 );
                 await db.updateProduct(product.id, { variants: updatedVariants });
            } else {
                 await db.updateProduct(product.id, { stockQuantity: (product.stockQuantity || 0) + (quantity * multiplier) });
            }
        }
    }

    if (newStatus === 'Confermato') {
        handleMakeFulfillmentWebhook(sale);
    }
    fetchData();
  };

  const handleUpdateAddress = async (saleId: string, addressParts: any) => {
      await db.updateSale(saleId, {
          customer_street_address: addressParts.street,
          customer_house_number: addressParts.houseNumber,
          customer_city: addressParts.city,
          customer_province: addressParts.province,
          customer_zip: addressParts.zip
      });
      fetchData();
      alert("Indirizzo aggiornato correttamente.");
  };

  const handleUpdateNotes = async (saleId: string, notes: string) => {
      await db.updateSale(saleId, { notes });
      fetchData();
  };

  const handleLogContact = async (saleId: string, historyItem: ContactHistoryItem) => {
      const sale = sales.find(s => s.id === saleId);
      if (sale) {
          const newHistory = [...(sale.contactHistory || []), historyItem];
          const updates: any = { contactHistory: newHistory };
          
          if (user?.role === UserRole.CUSTOMER_CARE) {
              updates.lastContactedBy = user.id;
              updates.lastContactedByName = user.name;
          }

          await db.updateSale(saleId, updates);
          fetchData();
      }
  };

  // NUOVA FUNZIONE ATOMICA PER ULTIMO AVVISO (RISOLVE IL PROBLEMA DELLO SPOSTAMENTO)
  const handleLastWarningTransition = async (saleId: string, historyItem: ContactHistoryItem) => {
      const sale = sales.find(s => s.id === saleId);
      if (sale) {
          const updates: any = {
              status: 'Contattato',
              statusUpdatedAt: new Date().toISOString(),
              contactHistory: [...(sale.contactHistory || []), historyItem]
          };

          if (user?.role === UserRole.CUSTOMER_CARE) {
              updates.lastContactedBy = user.id;
              updates.lastContactedByName = user.name;
          }

          await db.updateSale(saleId, updates);
          await fetchData(); // Attendiamo il refresh prima di permettere altre azioni
      }
  };

  const handlePayoutRequest = async (userId: string, amount: number, method: 'PayPal' | 'Bonifico Bancario' | 'Worldfili', details: string) => {
    const res = await db.createPayoutRequest(userId, amount, method, details);
    if(res.success) {
        await fetchData(); 
    }
    return res;
  };

  const allVisibleSales = useMemo(() => {
    if (!user) return [];
    let filtered = [...sales];
    if (user.role === UserRole.AFFILIATE) {
        filtered = sales.filter(s => 
            String(s.affiliateId) === String(user.id) || 
            String(s.affiliateId) === String(user.short_id)
        );
    }
    return filtered.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [user, sales]);

  const userNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter(n => n.targetRoles.includes(user.role) || n.targetUserId === user.id);
  }, [user, notifications]);

  const pendingAffiliatesCount = useMemo(() => {
    return affiliates.filter(a => (a.status || 'pending') === 'pending').length;
  }, [affiliates]);

  if (loading) return <ViewLoader />;
  if (!user || view === 'login') return <Login onLogin={(u) => { setUser(u); fetchData(); setView('dashboard'); }} platformSettings={platformSettings} />;

  return (
    <div className="bg-background min-h-screen">
      <Sidebar 
        user={user} onNavigate={setView} onLogout={() => { db.signOut(); setUser(null); setView('login'); }} currentView={view} 
        assistanceNotificationCount={tickets.filter(t => t.status === 'Aperto').length}
        pendingPaymentsCount={transactions.filter(t => t.type === 'Payout' && t.status === 'Pending').length}
        pendingAffiliatesCount={pendingAffiliatesCount}
        isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} platformSettings={platformSettings}
      />
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header user={user} fullUserObject={user as any} sales={allVisibleSales} products={products} notifications={userNotifications} transactions={transactions} onOpenCommissionDetails={()=>{}} onMarkAsRead={handleMarkAsRead} onMarkAllAsRead={handleMarkAllAsRead} onViewNotification={handleViewNotification} onOpenPlatformCheck={() => setIsPlatformCheckOpen(true)} />

        {automationStatus && (
            <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl border-l-8 ${automationStatus.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                <p className="font-bold text-sm uppercase">{automationStatus.message}</p>
            </div>
        )}

        <div className="p-4">
            <Suspense fallback={<ViewLoader />}>
                {view === 'dashboard' && <Dashboard user={user} products={products} affiliates={affiliates} sales={allVisibleSales} notifications={userNotifications} onRefreshData={fetchData} />}
                {view === 'performance' && <Performance user={user} sales={allVisibleSales} products={products} affiliates={affiliates} stockExpenses={stockExpenses} onRefreshData={fetchData} />}
                {view === 'products' && (
                    <ProductList 
                        products={products} 
                        userRole={user.role} 
                        niches={niches} 
                        onAddProduct={() => { setEditingProduct(null); setIsProductFormOpen(true); }} 
                        onEditProduct={(p) => { setEditingProduct(p); setIsProductFormOpen(true); }} 
                        onDeleteProduct={handleDeleteProduct} 
                        onViewProduct={(p) => { setViewingProduct(p); setView('product-detail'); }} 
                        onOpenNicheManager={() => setIsNicheManagerOpen(true)} 
                    />
                )}
                {view === 'product-detail' && viewingProduct && (
                    <ProductDetail 
                        product={viewingProduct} 
                        userRole={user.role} 
                        affiliates={affiliates} 
                        sales={allVisibleSales} 
                        currentAffiliate={user.role === UserRole.AFFILIATE ? (user as Affiliate) : undefined} 
                        onBack={() => setView('products')} 
                        onEdit={(p) => { setEditingProduct(p); setIsProductFormOpen(true); }} 
                        platformSettings={platformSettings} 
                    />
                )}
                {view === 'affiliates' && <AffiliateManager affiliates={affiliates} onAddAffiliate={() => { setEditingAffiliate(null); setIsAffiliateFormOpen(true); }} onEditAffiliate={(a) => { setEditingAffiliate(a); setIsAffiliateFormOpen(true); }} onDeleteAffiliate={handleDeleteAffiliate} onRefreshData={fetchData} />}
                {view === 'managers' && <ManagerList managers={managers} onAddManager={() => { setEditingManager(null); setIsManagerFormOpen(true); }} onEditManager={(m) => { setEditingManager(m); setIsManagerFormOpen(true); }} onDeleteManager={handleDeleteManager} />}
                {view === 'notifications' && (
                    (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) 
                    ? <NotificationManager 
                        notifications={notifications} 
                        allUsers={allProfiles} 
                        onCreateNotification={handleCreateNotification} 
                        onDeleteNotification={handleDeleteNotification}
                        autoNotificationEnabled={platformSettings.notify_new_product === 'true'}
                        onToggleAutoNotification={handleUpdateNotificationSetting}
                      />
                    : <NotificationListView user={user} notifications={userNotifications} onViewNotification={handleViewNotification} />
                )}
                {view === 'notification-detail' && viewingNotification && <NotificationDetailView notification={viewingNotification} onBack={() => setView('notifications')} onNavigateToLink={handleNavigateToLink} />}
                {view === 'magazzino' && <InventoryPage products={products} onUpdateStock={async (pid, upd) => { await db.updateProduct(pid, upd); fetchData(); }} />}
                {view === 'orders' && <OrderList user={user} sales={allVisibleSales} products={products} affiliates={affiliates} platformSettings={platformSettings} onViewOrder={(s) => setViewingOrder(s)} onContactCustomer={(s, isSolleciti) => { setContactingSale(s); setContactingFromSolleciti(!!isSolleciti); }} onSendToMake={handleMakeFulfillmentWebhook} onManageOrder={()=>{}} onOpenWhatsAppTemplateEditor={()=>{}} onRefreshData={fetchData} onUpdateSaleStatus={handleStatusUpdate} onUpdateSale={async(s)=>{ await db.updateSale(s.id, s); fetchData(); }} />}
                {view === 'pagamenti' && <PaymentsPage 
                    user={user} fullUserObject={user as any} allUsersWithBalance={allProfiles as any} transactions={transactions} sales={allVisibleSales} products={products} 
                    onPayoutRequest={handlePayoutRequest} 
                    onTransferFunds={async (f, t, a, n) => db.processTransfer(f, t, a, user.name, 'Utente', n)} 
                    onAdminTransferFunds={async (f, t, a) => db.processTransfer(f, t, a, 'Admin', 'Utente')} 
                    onAddBonus={async (t, a, n) => db.addBonus(t, 'Utente', a, n)} 
                    onApproveTransaction={async (id) => { await db.updateTransactionStatus(id, 'Completed'); fetchData(); }} 
                    onRejectTransaction={async (id) => { 
                        const trans = transactions.find(t => t.id === id);
                        await db.updateTransactionStatus(id, 'Rejected');
                        if (trans) {
                            await db.createNotification({
                                title: "❌ Payout Rifiutato",
                                message: `La tua richiesta di payout di €${trans.amount.toFixed(2)} è stata rifiutata. La cifra è stata riacreditata sul tuo saldo disponibile.`,
                                targetRoles: [], 
                                targetUserId: trans.userId,
                                eventType: 'payout-rejected'
                            });
                        }
                        fetchData(); 
                    }} 
                />}
                {view === 'contabilita' && <AccountingPage products={products} sales={allVisibleSales} stockExpenses={stockExpenses} transactions={transactions} onAddExpense={async (e) => { await db.addStockExpense(e); fetchData(); }} onDeleteExpense={async (id) => { await db.deleteStockExpense(id); fetchData(); }} />}
                {view === 'general-calculations' && <GeneralCalculations />}
                {view === 'assistenza' && <AssistancePage user={user} tickets={tickets} onOpenNewTicket={() => {}} onViewTicket={(t) => { setViewingTicket(t); setView('ticket-detail'); }} />}
                {view === 'ticket-detail' && viewingTicket && <TicketDetailView user={user} ticket={viewingTicket} onAddReply={async (id, msg) => { await db.addTicketReply(id, { userId: user.id, userName: user.name, message: msg }); fetchData(); }} onUpdateStatus={async (id, s) => { await db.updateTicketStatus(id, s); fetchData(); }} onBack={() => setView('assistenza')} />}
                {view === 'profile' && <ProfilePage user={user} fullUserObject={user as any} onUpdateProfile={async (u) => { await db.updateAffiliate(user.id, u); fetchData(); }} onChangePassword={async () => true} />}
                {view === 'settings' && <SettingsPage user={user} settings={platformSettings} products={products} onSaveAppearance={async(d)=>{ for(let k in d) await db.updateSetting(k, String((d as any)[k])); fetchData(); }} onSaveIntegrations={async(d)=>{ for(let k in d) await db.updateSetting(k, String((d as any)[k])); fetchData(); }} onSaveIpBlocklist={async(ips)=>{ await db.updateSetting('blocked_ips', JSON.stringify(ips)); fetchData(); }} />}
            </Suspense>
        </div>
        
        <Suspense fallback={null}>
            <NotificationPopupHost user={user} notifications={userNotifications} onViewNotification={handleViewNotification} />
        </Suspense>
      </main>

      <Modal isOpen={isAffiliateFormOpen} onClose={() => { setIsAffiliateFormOpen(false); setEditingAffiliate(null); }} title={editingAffiliate ? 'Modifica Affiliato' : 'Nuovo Affiliato'}>
        <AffiliateForm affiliate={editingAffiliate} onSave={handleSaveAffiliate} onClose={() => { setIsAffiliateFormOpen(false); setEditingAffiliate(null); }} currentUserRole={user.role} />
      </Modal>

      <Modal isOpen={isManagerFormOpen} onClose={() => { setIsManagerFormOpen(false); setEditingManager(null); }} title={editingManager ? 'Modifica Manager' : 'Nuovo Manager'}>
        <Suspense fallback={<ViewLoader />}>
            <ManagerForm manager={editingManager} onSave={handleSaveManager} onClose={() => { setIsManagerFormOpen(false); setEditingManager(null); }} />
        </Suspense>
      </Modal>

      <Modal isOpen={isProductFormOpen} onClose={() => { setIsProductFormOpen(false); setEditingProduct(null); }} title={editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'} size="4xl">
        <Suspense fallback={<ViewLoader />}>
            <ProductForm 
                product={editingProduct} 
                affiliates={affiliates} 
                niches={niches} 
                onSave={handleSaveProduct} 
                onClose={() => { setIsProductFormOpen(false); setEditingProduct(null); }} 
            />
        </Suspense>
      </Modal>

      <Modal isOpen={isNicheManagerOpen} onClose={() => setIsNicheManagerOpen(false)} title="Gestione Nicchie">
        <Suspense fallback={<ViewLoader />}>
            <NicheManager 
                niches={niches} 
                products={products} 
                onAddNiche={handleAddNiche} 
                onDeleteNiche={handleDeleteNiche} 
            />
        </Suspense>
      </Modal>

      <Modal isOpen={!!viewingOrder} onClose={() => { setViewingOrder(null); fetchData(); }} title="Dettaglio Ordine" size="5xl">
        {viewingOrder && (
            <Suspense fallback={<ViewLoader />}>
                <OrderDetail 
                    sale={viewingOrder} 
                    user={user} 
                    products={products} 
                    affiliates={allProfiles} 
                    allSales={allVisibleSales}
                    platformSettings={platformSettings}
                    onSave={async (s) => { 
                        await db.updateSale(s.id, s); 
                        setViewingOrder(null); 
                        fetchData(); 
                    }} 
                    onSwitchOrder={(s) => setViewingOrder(s)}
                />
            </Suspense>
        )}
      </Modal>

      <Modal isOpen={!!contactingSale} onClose={() => { setContactingSale(null); setContactingFromSolleciti(false); }} title="Contatta Cliente" size="3xl">
        {contactingSale && (
            <Suspense fallback={<ViewLoader />}>
                <CustomerCareUserModal 
                    sale={contactingSale} 
                    user={user} 
                    products={products} 
                    template={platformSettings.whatsapp_welcome_template || "Ciao {customerName}, grazie per aver acquistato {productName} ! L'importo totale da pagare al corriere è di {saleAmount}. Per confermare la spedizione, ti basta rispondere a questo messaggio con il testo: *Si, spedite*"}
                    onClose={() => { setContactingSale(null); setContactingFromSolleciti(false); }}
                    onUpdate={handleStatusUpdate}
                    onUpdateAddress={handleUpdateAddress}
                    onUpdateNotes={handleUpdateNotes}
                    onLogContact={handleLogContact}
                    onLastWarning={handleLastWarningTransition}
                    isFromSolleciti={contactingFromSolleciti}
                />
            </Suspense>
        )}
      </Modal>
      
      <Modal isOpen={isPlatformCheckOpen} onClose={() => setIsPlatformCheckOpen(false)} title="Diagnostica di Sistema" size="2xl">
          <Suspense fallback={<ViewLoader />}>
              <PlatformCheckModal user={user} sales={sales} settings={platformSettings} onClose={() => setIsPlatformCheckOpen(false)} />
          </Suspense>
      </Modal>
    </div>
  );
}

export default App;