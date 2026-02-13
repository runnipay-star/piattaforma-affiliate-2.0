
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
const TicketForm = lazy(() => import('./components/TicketForm'));
const NotificationListView = lazy(() => import('./components/NotificationListView'));
const NotificationDetailView = lazy(() => import('./components/NotificationDetailView'));
const NotificationManager = lazy(() => import('./components/NotificationManager'));
const PlatformCheckModal = lazy(() => import('./components/PlatformCheckModal'));
const GeneralCalculations = lazy(() => import('./components/GeneralCalculations'));
const LiveTrafficMonitor = lazy(() => import('./components/LiveTrafficMonitor'));

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
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);

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
        } else { setView('login'); }
      } else { setView('login'); }
      setLoading(false);
    };
    startApp();
  }, [fetchData]);

  if (loading) return <ViewLoader />;
  if (!user || view === 'login') return <Login onLogin={(u) => { setUser(u); fetchData(); setView('dashboard'); }} platformSettings={platformSettings} />;

  return (
    <div className="bg-background min-h-screen">
      <Sidebar 
        user={user} onNavigate={setView} onLogout={() => { db.signOut(); setUser(null); setView('login'); }} currentView={view} 
        assistanceNotificationCount={tickets.filter(t => t.status === 'Aperto').length}
        pendingPaymentsCount={transactions.filter(t => t.type === 'Payout' && t.status === 'Pending').length}
        pendingAffiliatesCount={affiliates.filter(a => (a.status || 'pending') === 'pending').length}
        isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} platformSettings={platformSettings}
      />
      <main className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header user={user} fullUserObject={user as any} sales={sales} products={products} notifications={notifications} transactions={transactions} onOpenCommissionDetails={()=>{}} onMarkAsRead={()=>{}} onMarkAllAsRead={()=>{}} onViewNotification={()=>{}} onOpenPlatformCheck={() => setIsPlatformCheckOpen(true)} />

        <div className="p-4">
            <Suspense fallback={<ViewLoader />}>
                {view === 'dashboard' && <Dashboard user={user} products={products} affiliates={affiliates} sales={sales} notifications={notifications} onRefreshData={fetchData} />}
                {view === 'live-traffic' && <LiveTrafficMonitor user={user} />}
                {view === 'performance' && <Performance user={user} sales={sales} products={products} affiliates={affiliates} stockExpenses={stockExpenses} onRefreshData={fetchData} />}
                {view === 'products' && (
                    <ProductList products={products} userRole={user.role} niches={niches} onAddProduct={() => { setEditingProduct(null); setIsProductFormOpen(true); }} onEditProduct={(p) => { setEditingProduct(p); setIsProductFormOpen(true); }} onDeleteProduct={async (id) => { if(window.confirm("Eliminare?")) await db.deleteProduct(id); fetchData(); }} onDuplicateProduct={p => { const cloned = {...p, id: db.generateUUID(), name: p.name+' (COPIA)', isActive: false}; setEditingProduct(cloned); setIsProductFormOpen(true); }} onViewProduct={(p) => { setViewingProduct(p); setView('product-detail'); }} onOpenNicheManager={() => setIsNicheManagerOpen(true)} />
                )}
                {view === 'product-detail' && viewingProduct && (
                    <ProductDetail product={viewingProduct} userRole={user.role} affiliates={affiliates} sales={sales} currentAffiliate={user.role === UserRole.AFFILIATE ? (user as Affiliate) : undefined} onBack={() => setView('products')} onEdit={(p) => { setEditingProduct(p); setIsProductFormOpen(true); }} platformSettings={platformSettings} />
                )}
                {view === 'magazzino' && <InventoryPage products={products} onUpdateStock={async(id, u)=>{await db.updateProduct(id, u); fetchData();}} />}
                {view === 'affiliates' && <AffiliateManager affiliates={affiliates} onAddAffiliate={() => { setEditingAffiliate(null); setIsAffiliateFormOpen(true); }} onEditAffiliate={(a) => { setEditingAffiliate(a); setIsAffiliateFormOpen(true); }} onDeleteAffiliate={async (id) => { if(window.confirm("Eliminare?")) await db.deleteAffiliate(id); fetchData(); }} onRefreshData={fetchData} />}
                {view === 'orders' && <OrderList user={user} sales={sales} products={products} affiliates={affiliates} platformSettings={platformSettings} onViewOrder={(s) => { setViewingOrder(s); }} onContactCustomer={(s, isSol) => { setContactingSale(s); setContactingFromSolleciti(!!isSol); }} onSendToMake={db.triggerWebhook as any} onManageOrder={()=>{}} onOpenWhatsAppTemplateEditor={()=>{}} onRefreshData={fetchData} onUpdateSaleStatus={async(id, s)=>{await db.updateSale(id, {status: s}); fetchData();}} onUpdateSale={async(s)=>{ await db.updateSale(s.id, s); fetchData(); }} />}
                {view === 'pagamenti' && <PaymentsPage user={user} fullUserObject={user as any} allUsersWithBalance={allProfiles as any} transactions={transactions} sales={sales} products={products} onPayoutRequest={db.createPayoutRequest} onTransferFunds={async(f,t,a,n)=>db.processTransfer(f,t,a,user.name,'Utente',n)} onAdminTransferFunds={async(f,t,a)=>db.processTransfer(f,t,a,'Admin','Utente')} onAddBonus={async(t,a,n)=>db.addBonus(t,'Utente',a,n)} onApproveTransaction={async(id)=>{await db.updateTransactionStatus(id,'Completed');fetchData();}} onRejectTransaction={async(id)=>{await db.updateTransactionStatus(id,'Rejected');fetchData();}} />}
                {view === 'contabilita' && <AccountingPage products={products} sales={sales} stockExpenses={stockExpenses} transactions={transactions} onAddExpense={db.addStockExpense} onDeleteExpense={async(id)=>{await db.deleteStockExpense(id); fetchData();}} />}
                {view === 'general-calculations' && <GeneralCalculations />}
                {view === 'assistenza' && <AssistancePage user={user} tickets={tickets} onOpenNewTicket={() => setIsTicketFormOpen(true)} onViewTicket={(t) => { setViewingTicket(t); setView('ticket-detail'); }} />}
                {view === 'ticket-detail' && viewingTicket && <TicketDetailView user={user} ticket={viewingTicket} onAddReply={async(id, m)=>{await db.addTicketReply(id, {user_id: user.id, user_name: user.name, message: m}); fetchData();}} onUpdateStatus={async (id, s) => { await db.updateTicketStatus(id, s); fetchData(); }} onBack={() => setView('assistenza')} />}
                {view === 'profile' && <ProfilePage user={user} fullUserObject={user as any} onUpdateProfile={async(d)=>{await db.updateAffiliate(user.id, d); fetchData();}} onChangePassword={async(c, n)=>{const {error}=await db.supabase.auth.updateUser({password: n}); return !error;}} />}
                {view === 'settings' && <SettingsPage user={user} settings={platformSettings} products={products} onSaveAppearance={async(d)=>{for(let k in d) await db.updateSetting(k,String((d as any)[k]));fetchData();}} onSaveIntegrations={async(d)=>{for(let k in d) await db.updateSetting(k,String((d as any)[k]));fetchData();}} onSaveIpBlocklist={async(ips)=>{await db.updateSetting('blocked_ips',JSON.stringify(ips));fetchData();}} />}
                {view === 'notifications' && ((user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) ? <NotificationManager notifications={notifications} allUsers={allProfiles} onCreateNotification={async(d)=>{await db.createNotification(d); fetchData();}} onDeleteNotification={async(id)=>{await db.deleteNotification(id); fetchData();}} autoNotificationEnabled={platformSettings.notify_new_product === 'true'} onToggleAutoNotification={async(v)=>{await db.updateSetting('notify_new_product', String(v)); fetchData();}} /> : <NotificationListView user={user} notifications={notifications} onViewNotification={(n)=>{setViewingNotification(n); setView('notification-detail');}} />)}
                {view === 'notification-detail' && viewingNotification && <NotificationDetailView notification={viewingNotification} onBack={() => setView('notifications')} onNavigateToLink={(l)=>{setView(l as any);}} />}
            </Suspense>
        </div>
      </main>

      <Modal isOpen={isProductFormOpen} onClose={() => { setIsProductFormOpen(false); setEditingProduct(null); }} title={editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'} size="4xl">
        <Suspense fallback={<ViewLoader />}>
            <ProductForm 
                product={editingProduct} 
                allProducts={products} 
                affiliates={affiliates} 
                niches={niches} 
                onSave={async(d)=>{
                    // FIX: Verifica se il prodotto esiste già nel database per decidere tra INSERT o UPDATE
                    const isExisting = products.some(p => p.id === d.id);
                    if (isExisting && d.id) {
                        await db.updateProduct(d.id, d);
                    } else {
                        await db.addProduct(d);
                    }
                    setIsProductFormOpen(false); 
                    fetchData();
                }} 
                onClose={() => { setIsProductFormOpen(false); setEditingProduct(null); }} 
            />
        </Suspense>
      </Modal>

      <Modal isOpen={isAffiliateFormOpen} onClose={() => { setIsAffiliateFormOpen(false); setEditingAffiliate(null); }} title={editingAffiliate ? 'Modifica Utente' : 'Nuovo Utente'}>
          <Suspense fallback={<ViewLoader />}><AffiliateForm affiliate={editingAffiliate} onSave={async(d)=>{await db.updateAffiliate(d.id!, d); setIsAffiliateFormOpen(false); fetchData();}} onClose={() => setIsAffiliateFormOpen(false)} currentUserRole={user.role} /></Suspense>
      </Modal>

      <Modal isOpen={isPlatformCheckOpen} onClose={() => setIsPlatformCheckOpen(false)} title="Diagnostica di Sistema" size="3xl">
          <Suspense fallback={<ViewLoader />}><PlatformCheckModal user={user} sales={sales} settings={platformSettings} onClose={() => setIsPlatformCheckOpen(false)} /></Suspense>
      </Modal>

      {viewingOrder && (
          <Modal isOpen={!!viewingOrder} onClose={() => setViewingOrder(null)} title={`Dettaglio Ordine ${viewingOrder.id}`} size="5xl">
              <Suspense fallback={<ViewLoader />}><OrderDetail sale={viewingOrder} user={user} products={products} affiliates={allProfiles} allSales={sales} platformSettings={platformSettings} onSave={async(s)=>{await db.updateSale(s.id, s); setViewingOrder(null); fetchData();}} onSwitchOrder={(s) => setViewingOrder(s)} /></Suspense>
          </Modal>
      )}

      {contactingSale && (
          <Modal isOpen={!!contactingSale} onClose={() => setContactingSale(null)} title="Contatta Cliente" size="5xl">
              <Suspense fallback={<ViewLoader />}><CustomerCareUserModal sale={contactingSale} template={platformSettings.whatsapp_welcome_template || ''} user={user} products={products} onUpdate={async(id, s)=>{await db.updateSale(id, {status: s}); fetchData();}} onUpdateAddress={async(id, parts) => { await db.updateSale(id, { customer_street_address: parts.street, customer_house_number: parts.houseNumber, customer_city: parts.city, customer_province: parts.province, customer_zip: parts.zip }); fetchData(); }} onUpdateNotes={async(id, n) => { await db.updateSale(id, { notes: n }); fetchData(); }} onLogContact={async(id, item) => { const s = sales.find(x => x.id === id); const h = s?.contactHistory || []; await db.updateSale(id, { contactHistory: [...h, item] }); fetchData(); }} onClose={() => setContactingSale(null)} isFromSolleciti={contactingFromSolleciti} /></Suspense>
          </Modal>
      )}
    </div>
  );
}

export default App;
