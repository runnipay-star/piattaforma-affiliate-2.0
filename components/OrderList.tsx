
import React, { useMemo, useState, useEffect, memo, lazy, Suspense, useRef } from 'react';
import { Sale, SaleStatus, User, UserRole, Affiliate, PlatformSettings, Product, StaffMessage } from '../types';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { TruckIcon } from './icons/TruckIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { SearchIcon } from './icons/SearchIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { FilterIcon } from './icons/FilterIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { WalletIcon } from './icons/WalletIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { createTestOrder, supabase, fetchStaffMessages } from '../database';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';

const SpediamoModal = lazy(() => import('./SpediamoModal'));
const ExportCSVModal = lazy(() => import('./ExportCSVModal'));

type PeriodType = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'custom' | 'all';

const formatCurrency = (amount: number, currency: string = 'EUR') => {
    const symbols: Record<string, string> = { 'EUR': '€', 'USD': '$', 'GBP': '£' };
    const symbol = symbols[currency] || '€';
    return `${symbol}${amount.toFixed(2)}`;
};

const OrderRow = memo(({ 
    sale, 
    isCustomerCare, 
    isAffiliate, 
    isLogistics,
    isAdmin,
    canEditStatus, 
    getStatusBadge, 
    formatDate, 
    displayAffiliateId, 
    onViewOrder, 
    onContactCustomer, 
    onSendToMake,
    onSendToSpediamo,
    canContact, 
    handleStatusChange, 
    optionsForRole,
    isStaff,
    currentUserId,
    refreshKey,
    isSelected,
    onToggleSelect,
    showCheckboxes,
    showCustomerDetails
}: any) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (isStaff) {
            fetchStaffMessages(sale.id).then(msgs => {
                const unread = msgs.filter(m => !m.read_by?.includes(currentUserId)).length;
                setUnreadCount(unread);
            });
        }
    }, [sale.id, isStaff, currentUserId, refreshKey]);

    const variantDisplay = sale.selectedVariants && sale.selectedVariants.length > 0 
    ? sale.selectedVariants.map((v: any) => v.variantName).join(', ') 
    : sale.variantName;

    const canFulfill = (isLogistics || isAdmin || !isAffiliate) && sale.status === 'Confermato';
    const orderQuantity = sale.quantity ?? 1;

    const hasLastWarning = sale.contactHistory?.some((h: any) => h.action === 'last_warning');

    const getExpiryData = () => {
        const lastWarning = sale.contactHistory?.filter((h: any) => h.action === 'last_warning')
                             .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        if (!lastWarning) return null;
        const warningTime = new Date(lastWarning.timestamp).getTime();
        const expiryTime = warningTime + (24 * 60 * 60 * 1000);
        const diff = expiryTime - Date.now();
        const isExpired = diff <= 0;
        
        const totalMinutes = Math.abs(Math.floor(diff / (1000 * 60)));
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        return { isExpired, text: `${hours}h ${mins}m`, warningTime };
    };

    const expiry = getExpiryData();

    const getPaymentBadge = () => {
        if (sale.paymentMethod === 'card') {
            return (
                <div className="flex flex-col">
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200 uppercase w-fit">CARTA</span>
                    <span className="text-[9px] font-bold text-green-600 mt-0.5 ml-1">✓ PAGATO</span>
                </div>
            );
        }
        return <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-100 uppercase">COD</span>;
    };

    return (
        <tr className={`hover:bg-gray-50 border-b border-gray-100 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
            {showCheckboxes && (
                <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => onToggleSelect(sale.id)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                    />
                </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap cursor-pointer relative" onClick={() => onViewOrder(sale)}>
                <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-900">{formatDate(sale.saleDate)}</div>
                    {unreadCount > 0 && (
                        <div className="relative flex items-center" title={`${unreadCount} messaggi non letti`}>
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-primary opacity-40" />
                            <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white shadow-sm animate-pulse"></span>
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 cursor-pointer" onClick={() => onViewOrder(sale)}>
                <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={sale.productName}>
                    {sale.productName}
                </div>
                {variantDisplay && <div className="text-xs text-gray-500 truncate" title={variantDisplay}>{variantDisplay}</div>}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-center cursor-pointer" onClick={() => onViewOrder(sale)}>
                <div className="text-sm font-bold text-gray-900">{orderQuantity}</div>
            </td>
            
            {showCustomerDetails && (
                <>
                <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onViewOrder(sale)}>
                    <div className="text-sm font-semibold text-gray-900 truncate" title={sale.customerName}>{sale.customerName || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onViewOrder(sale)}>
                    <div className="text-sm text-gray-500">{sale.customerPhone || '-'}</div>
                </td>
                </>
            )}

            {!isAffiliate && (
                <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onViewOrder(sale)}>
                    <div className="text-sm font-medium text-gray-900 truncate" title={sale.affiliateName}>{sale.affiliateName}</div>
                    <div className="text-xs text-gray-500 font-mono">{displayAffiliateId}</div>
                </td>
            )}

            {isAffiliate && (
                <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onViewOrder(sale)}>
                    <div className="text-sm text-gray-500 font-mono">{sale.subId || '-'}</div>
                </td>
            )}

            <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => onViewOrder(sale)}>
                <div className={`text-sm font-bold ${isAffiliate ? 'text-green-600' : 'text-gray-900'}`}>
                    {formatCurrency(isAffiliate ? (sale.commissionAmount || 0) : (sale.saleAmount || 0), sale.currency)}
                </div>
            </td>

            <td className="px-6 py-4 whitespace-nowrap">
                {getPaymentBadge()}
            </td>

            <td className="px-6 py-4 whitespace-nowrap">
                {canEditStatus ? (
                    <div className="flex items-center gap-2">
                        <select
                            value={sale.status}
                            onChange={(e) => handleStatusChange(sale.id, e.target.value as SaleStatus)}
                            onClick={(e) => e.stopPropagation()}
                            className={`text-xs font-bold rounded-full border-0 focus:ring-2 py-1 pl-2 pr-8 cursor-pointer shadow-sm ${getStatusBadge(sale.status)}`}
                        >
                            {optionsForRole.map((status: string) => (
                                <option key={status} value={status} className="bg-white text-gray-900 font-normal">{status}</option>
                            ))}
                        </select>
                        {sale.isBonus && <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-purple-600 text-white animate-pulse">BONUS</span>}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${getStatusBadge(sale.status)}`}>
                            {sale.status}
                        </span>
                        {sale.isBonus && <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-purple-600 text-white">BONUS</span>}
                    </div>
                )}
                {hasLastWarning && expiry ? (
                     <div className={`mt-1 flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border w-fit shadow-sm ${expiry.isExpired ? 'bg-red-600 text-white border-red-700' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                        <ClockIcon className="w-2.5 h-2.5" /> {expiry.isExpired ? `SCADUTO (${expiry.text})` : `Scade: ${expiry.text}`}
                    </div>
                ) : (
                    sale.status === 'Contattato' && (
                        <div className="mt-1 text-[9px] font-bold text-blue-400 uppercase tracking-tighter">In attesa avviso</div>
                    )
                )}
            </td>

            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                    {canFulfill && (
                         <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onSendToSpediamo(sale); }} 
                                className="bg-white text-primary border border-gray-200 font-black text-[10px] py-1 px-2 rounded-md hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-1"
                                title="Invia a Spediamo.it"
                            >
                                <TruckIcon className="w-3 h-3" /> SDA
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onSendToMake(sale); }} 
                                className="bg-indigo-600 text-white font-black text-[10px] py-1 px-2 rounded-md hover:bg-indigo-700 shadow-sm flex items-center gap-1 transition-all"
                                title="Invia a Make.com"
                            >
                                <PaperAirplaneIcon className="w-3 h-3" /> MAKE
                            </button>
                         </div>
                    )}
                    {canContact && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onContactCustomer(sale); }} 
                            className={`text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm flex items-center gap-1 transition-transform active:scale-95 ${hasLastWarning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            <WhatsAppIcon className="w-3 h-3" /> {hasLastWarning ? 'Ricontatta' : 'Contatta'}
                        </button>
                    )}
                     <button 
                        onClick={(e) => { e.stopPropagation(); onViewOrder(sale); }} 
                        className="bg-blue-50 text-blue-700 font-bold text-xs py-1.5 px-3 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        Dettagli
                    </button>
                </div>
            </td>
        </tr>
    );
});

interface OrderListProps {
  sales: Sale[];
  products: Product[];
  onViewOrder: (sale: Sale) => void;
  onContactCustomer: (sale: Sale, isSollecitiActive?: boolean) => void;
  onManageOrder: (sale: Sale) => void;
  user: User;
  affiliates: Affiliate[];
  platformSettings: PlatformSettings;
  onOpenWhatsAppTemplateEditor: () => void;
  onRefreshData: () => Promise<void>;
  onSendToMake: (sale: Sale) => void;
  onSendToSpediamo?: (sale: Sale) => void;
  onUpdateSaleStatus: (saleId: string, status: SaleStatus) => Promise<void>;
  onUpdateSale: (sale: Sale) => Promise<void>;
}

const ORDER_FILTERS_STORAGE_KEY = 'mws_order_filters_v3'; 

const MiniStatCard = ({ label, value, icon, colorClass, iconBgClass }: { label: string, value: string | number, icon: React.ReactNode, colorClass: string, iconBgClass: string }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 flex-1 min-w-[200px]">
        <div className={`p-3 rounded-xl ${iconBgClass} ${colorClass}`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight leading-none mb-1">{label}</p>
            <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
        </div>
    </div>
);

const OrderList: React.FC<OrderListProps> = ({ 
    sales, 
    products,
    onViewOrder, 
    onContactCustomer, 
    onSendToMake,
    user, 
    affiliates, 
    platformSettings,
    onRefreshData, 
    onUpdateSaleStatus 
}) => {
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem(ORDER_FILTERS_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (typeof parsed.statusFilter === 'string') {
                parsed.statusFilters = parsed.statusFilter === 'all' ? [] : [parsed.statusFilter];
                delete parsed.statusFilter;
            }
            return {
                ...parsed,
                statusFilters: Array.isArray(parsed.statusFilters) ? parsed.statusFilters : [],
                productIdFilter: parsed.productIdFilter || 'all',
                paymentMethodFilter: parsed.paymentMethodFilter || 'all'
            };
        } catch (e) {
            console.error("Errore caricamento filtri salvati", e);
        }
    }
    return { 
        searchQuery: '', 
        statusFilters: [] as string[],
        productIdFilter: 'all',
        paymentMethodFilter: 'all' as 'all' | 'cod' | 'card',
        periodFilter: 'all' as PeriodType,
        customStartDate: '',
        customEndDate: '',
        showOnlyUrgentReminders: false,
        showOnlyExpirations24h: false,
        expirationSubFilter: 'all' as 'all' | 'pending' | 'expired'
    };
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [spediamoSale, setSpediamoSale] = useState<Sale | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyStatusChoices, setCopyStatusChoices] = useState<SaleStatus[]>(['Spedito']);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<SaleStatus | ''>('');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const isStaff = [UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER_CARE, UserRole.LOGISTICS].includes(user.role);
  const isCC = user.role === UserRole.CUSTOMER_CARE || user.role === UserRole.ADMIN;
  const isAffiliate = user.role === UserRole.AFFILIATE;
  const showCheckboxes = isStaff;
  
  // LOGICA UNIFICATA PER VISIBILITÀ DETTAGLI CLIENTE
  const showCustomerDetails = [UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER_CARE, UserRole.LOGISTICS].includes(user.role);

  const statusOptions = [
    'In attesa', 'Contattato', 'Confermato', 'Spedito', 'Svincolato', 'Consegnato', 'Cancellato', 'Annullato', 'Test', 'Duplicato', 'Giacenza', 'Non raggiungibile', 'Non ritirato'
  ];

  const productOptions = useMemo(() => {
    return [
        { value: 'all', label: 'Tutti i prodotti' },
        ...products.map(p => ({ value: p.id, label: p.name, refNumber: p.refNumber }))
    ];
  }, [products]);

  useEffect(() => {
    localStorage.setItem(ORDER_FILTERS_STORAGE_KEY, JSON.stringify(filters));
    setCurrentPage(1); // Reset page on filter change
  }, [filters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStatusFilter = (status: string) => {
    setFilters(f => {
        const current = f.statusFilters || [];
        const next = current.includes(status) 
            ? current.filter(s => s !== status) 
            : [...current, status];
        return { ...f, statusFilters: next };
    });
  };

  const selectAllStatuses = () => {
    setFilters(f => ({ ...f, statusFilters: statusOptions }));
  };

  const clearStatuses = () => {
    setFilters(f => ({ ...f, statusFilters: [] }));
  };

  // CALCOLO CONTATORI PER FILTRI SPECIALI (URGENTI)
  const counters = useMemo(() => {
    const now = Date.now();
    const solleciti = sales.filter(s => {
        if (s.status !== 'Contattato') return false;
        const lastUpdate = s.statusUpdatedAt ? new Date(s.statusUpdatedAt).getTime() : new Date(s.saleDate).getTime();
        const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
        const hasLastWarning = s.contactHistory?.some(h => h.action === 'last_warning');
        return diffHours >= 10 && !hasLastWarning;
    }).length;

    const scadenzeTotali = sales.filter(s => {
        if (s.status !== 'Contattato') return false;
        return s.contactHistory?.some(h => h.action === 'last_warning');
    }).length;

    const scadenzeOltre24h = sales.filter(s => {
        if (s.status !== 'Contattato') return false;
        const lastWarning = s.contactHistory?.filter(h => h.action === 'last_warning')
                             .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        if (!lastWarning) return false;
        const warningTime = new Date(lastWarning.timestamp).getTime();
        return (now - warningTime) >= (24 * 60 * 60 * 1000);
    }).length;

    return { solleciti, scadenzeTotali, scadenzeOltre24h };
  }, [sales]);

  const allFilteredSales = useMemo(() => {
    let result = [...sales];
    const now = Date.now();

    if (filters.showOnlyUrgentReminders) {
        result = result.filter(s => {
            if (s.status !== 'Contattato') return false;
            const lastUpdate = s.statusUpdatedAt ? new Date(s.statusUpdatedAt).getTime() : new Date(s.saleDate).getTime();
            const diffHours = (now - lastUpdate) / (1000 * 60 * 60);
            if (diffHours < 10) return false;
            const hasLastWarning = s.contactHistory?.some(h => h.action === 'last_warning');
            return !hasLastWarning; 
        });
    } else if (filters.showOnlyExpirations24h) {
        result = result.filter(s => {
            if (s.status !== 'Contattato') return false;
            const lastWarning = s.contactHistory?.filter(h => h.action === 'last_warning')
                                 .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            if (!lastWarning) return false;
            
            const warningTime = new Date(lastWarning.timestamp).getTime();
            const isExpired = (now - warningTime) >= (24 * 60 * 60 * 1000);

            if (filters.expirationSubFilter === 'expired') return isExpired;
            if (filters.expirationSubFilter === 'pending') return !isExpired;
            return true;
        });
    } else {
        if (filters.periodFilter !== 'all') {
            const nowD = new Date();
            const today = new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate());
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            result = result.filter(s => {
                const saleDate = new Date(s.saleDate);
                const saleDay = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
                switch (filters.periodFilter) {
                    case 'today': return saleDay.getTime() === today.getTime();
                    case 'yesterday': return saleDay.getTime() === yesterday.getTime();
                    case 'this_week': {
                        const first = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
                        const monday = new Date(today.getFullYear(), today.getMonth(), first);
                        return saleDay >= monday;
                    }
                    case 'last_week': {
                        const firstLast = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1) - 7;
                        const mondayLast = new Date(today.getFullYear(), today.getMonth(), firstLast);
                        const sundayLast = new Date(mondayLast);
                        sundayLast.setDate(sundayLast.getDate() + 6);
                        return saleDay >= mondayLast && saleDay <= sundayLast;
                    }
                    case 'this_month': return saleDate.getMonth() === nowD.getMonth() && saleDate.getFullYear() === nowD.getFullYear();
                    case 'last_month': {
                        const firstDayLastMonth = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
                        const lastDayLastMonth = new Date(nowD.getFullYear(), nowD.getMonth(), 0, 23, 59, 59, 999);
                        return saleDate >= firstDayLastMonth && saleDate <= lastDayLastMonth;
                    }
                    case 'this_year': return saleDate.getFullYear() === nowD.getFullYear();
                    case 'custom': {
                        if (!filters.customStartDate) return true;
                        const start = new Date(filters.customStartDate);
                        const end = filters.customEndDate ? new Date(filters.customEndDate) : new Date();
                        end.setHours(23, 59, 59, 999);
                        return saleDate >= start && saleDate <= end;
                    }
                    default: return true;
                }
            });
        }
        if (filters.statusFilters && filters.statusFilters.length > 0) {
            result = result.filter(s => filters.statusFilters.includes(s.status));
        }

        // --- NUOVO FILTRO METODO PAGAMENTO ---
        if (filters.paymentMethodFilter && filters.paymentMethodFilter !== 'all') {
            result = result.filter(s => s.paymentMethod === filters.paymentMethodFilter);
        }
    }

    if (filters.productIdFilter && filters.productIdFilter !== 'all') {
        result = result.filter(s => s.productId === filters.productIdFilter);
    }

    if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        result = result.filter(s => 
            (s.customerName?.toLowerCase().includes(q)) || 
            (s.customerPhone?.includes(q)) ||
            (s.id.toLowerCase().includes(q)) ||
            (s.affiliateName?.toLowerCase().includes(q)) ||
            (s.trackingCode?.toLowerCase().includes(q)) ||
            (s.subId?.toLowerCase().includes(q))
        );
    }

    return result.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, filters]);

  // PAGINAZIONE
  const paginatedSales = useMemo(() => {
      const startIndex = (currentPage - 1) * pageSize;
      return allFilteredSales.slice(startIndex, startIndex + pageSize);
  }, [allFilteredSales, currentPage, pageSize]);

  const totalPages = Math.ceil(allFilteredSales.length / pageSize);

  // CALCOLO STATISTICHE PER LA NUOVA SEZIONE
  const summaryStats = useMemo(() => {
    let totalValue = 0;
    let inManagement = 0;
    let operative = 0;

    allFilteredSales.forEach(s => {
        totalValue += (isAffiliate ? (s.commissionAmount || 0) : (s.saleAmount || 0));
        if (['In attesa', 'Contattato'].includes(s.status)) inManagement++;
        if (['Confermato', 'Spedito', 'Svincolato', 'Consegnato'].includes(s.status)) operative++;
    });

    return { totalCount: allFilteredSales.length, totalValue, inManagement, operative };
  }, [allFilteredSales, isAffiliate]);

  const handleToggleSelect = (id: string) => {
      setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleSelectAll = () => {
      if (selectedIds.size === paginatedSales.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(paginatedSales.map(s => s.id)));
      }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkTargetStatus || selectedIds.size === 0) return;
    if (!window.confirm(`Sei sicuro di voler cambiare lo stato di ${selectedIds.size} ordini in "${bulkTargetStatus}"?`)) return;
    setIsBulkUpdating(true);
    const idsToUpdate = Array.from(selectedIds);
    try {
        await Promise.all(idsToUpdate.map(id => onUpdateSaleStatus(id, bulkTargetStatus as SaleStatus)));
        setSelectedIds(new Set());
        setBulkTargetStatus('');
        alert(`${idsToUpdate.length} ordini aggiornati.`);
    } catch (e: any) {
        alert("Errore aggiornamento massivo: " + e.message);
    } finally {
        setIsBulkUpdating(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    setRefreshKey(prev => prev + 1);
    setIsRefreshing(false);
  };

  const handleCopyTrackingCodes = () => {
    const targetSales = selectedIds.size > 0 
        ? allFilteredSales.filter(s => selectedIds.has(s.id))
        : allFilteredSales;
    
    const trackingCodes = targetSales
        .filter(s => copyStatusChoices.includes(s.status as SaleStatus) && s.trackingCode)
        .map(s => s.trackingCode);

    if (trackingCodes.length === 0) {
        alert(`Nessun codice di tracciamento trovato tra gli ordini selezionati/filtrati negli stati scelti.`);
        return;
    }

    const textToCopy = trackingCodes.join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert(`SUCCESSO: ${trackingCodes.length} codici di tracciamento copiati negli appunti.`);
        setIsCopyModalOpen(false);
    }).catch(err => {
        alert("Errore durante la copia: " + err);
    });
  };

  const toggleCopyStatusChoice = (status: SaleStatus) => {
    setCopyStatusChoices(prev => 
        prev.includes(status) 
            ? prev.filter(s => s !== status) 
            : [...prev, status]
    );
  };

  const getStatusBadge = (status: SaleStatus) => {
    const map: any = { 
        'Consegnato': 'bg-green-100 text-green-800', 
        'Spedito': 'bg-indigo-600 text-white', 
        'Confermato': 'bg-blue-100 text-blue-800',
        'Svincolato': 'bg-teal-100 text-teal-800',
        'In attesa': 'bg-yellow-100 text-yellow-800',
        'Contattato': 'bg-cyan-100 text-cyan-800',
        'Non raggiungibile': 'bg-amber-100 text-amber-800',
        'Giacenza': 'bg-orange-100 text-orange-800',
        'Non ritirato': 'bg-orange-100 text-orange-800',
        'Test': 'bg-purple-100 text-purple-800',
        'Cancellato': 'bg-red-100 text-red-800',
        'Annullato': 'bg-red-100 text-red-800',
        'Duplicato': 'bg-gray-200 text-gray-800'
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const canEditStatusGlobal = [UserRole.ADMIN, UserRole.MANAGER, UserRole.CUSTOMER_CARE, UserRole.LOGISTICS].includes(user.role);

  return (
    <div className="p-8 pb-24">
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-primary-dark uppercase italic tracking-tight">Gestione Ordini</h2>
        <p className="text-sm text-gray-500 mt-1 font-medium">Evasione e tracking della rete vendita</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <MiniStatCard 
            label="Ordini Filtrati" 
            value={summaryStats.totalCount} 
            icon={<ClipboardListIcon className="w-5 h-5" />} 
            colorClass="text-primary"
            iconBgClass="bg-primary/10"
          />
          <MiniStatCard 
            label={isAffiliate ? "Commissione Totale (Valore Nominale)" : "Fatturato Lordo (Valore Nominale)"} 
            value={`€${summaryStats.totalValue.toFixed(2)}`} 
            icon={<WalletIcon className="w-5 h-5" />} 
            colorClass="text-green-600"
            iconBgClass="bg-green-50"
          />
          <MiniStatCard 
            label="In Gestione (Attesa/Contatt.)" 
            value={summaryStats.inManagement} 
            icon={<ClockIcon className="w-5 h-5" />} 
            colorClass="text-orange-500"
            iconBgClass="bg-orange-50"
          />
          <MiniStatCard 
            label="Operativi (Conf/Sped/Cons)" 
            value={summaryStats.operative} 
            icon={<CheckCircleIcon className="w-5 h-5" />} 
            colorClass="text-indigo-600"
            iconBgClass="bg-indigo-50"
          />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          {isCC && (
              <>
              <button 
                  onClick={() => setFilters(f => ({...f, showOnlyUrgentReminders: !f.showOnlyUrgentReminders, showOnlyExpirations24h: false}))}
                  className={`relative flex items-center gap-2 font-black text-xs p-3 px-6 rounded-xl shadow-md transition-all border-2 ${filters.showOnlyUrgentReminders ? 'bg-red-600 text-white border-red-700 ring-4 ring-red-100 scale-105' : 'bg-white text-red-600 border-red-100 hover:border-red-200'}`}
              >
                  {counters.solleciti > 0 && (
                      <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-4 ring-white shadow-lg z-10">
                          {counters.solleciti}
                      </span>
                  )}
                  <FilterIcon className="w-4 h-4" />
                  SOLLECITI (+10h)
              </button>
              <button 
                  onClick={() => setFilters(f => ({...f, showOnlyExpirations24h: !f.showOnlyExpirations24h, showOnlyUrgentReminders: false}))}
                  className={`relative flex items-center gap-2 font-black text-xs p-3 px-6 rounded-xl shadow-md transition-all border-2 ${filters.showOnlyExpirations24h ? 'bg-orange-500 text-white border-orange-600 ring-4 ring-orange-100 scale-105' : 'bg-white text-orange-500 border-orange-100 hover:border-orange-200'}`}
              >
                  {counters.scadenzeTotali > 0 && (
                      <span className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-[10px] font-black text-white ring-4 ring-white shadow-lg z-10">
                          {counters.scadenzeTotali}
                      </span>
                  )}
                  <ClockIcon className="w-4 h-4" />
                  SCADENZA 24H
              </button>
              </>
          )}

          {isStaff && (
              <>
              <button 
                  onClick={() => setIsCopyModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white font-bold text-xs p-3 px-6 rounded-xl shadow-md hover:bg-blue-700 transition-all active:scale-95"
              >
                  <ClipboardIcon className="w-4 h-4" />
                  Copia Tracking
              </button>
              <button 
                  onClick={() => setIsExportModalOpen(true)} 
                  className="flex items-center gap-2 bg-emerald-600 text-white font-bold text-xs p-3 px-6 rounded-xl shadow-md hover:bg-emerald-700 transition-all active:scale-95"
              >
                  <DownloadIcon className="w-4 h-4" />
                  Esporta CSV
              </button>
              </>
          )}

          <button 
              onClick={handleRefresh} 
              disabled={isRefreshing} 
              className="flex items-center justify-center w-12 h-12 bg-white text-gray-700 rounded-xl shadow-md hover:bg-gray-50 transition-all border border-gray-200 active:scale-95 disabled:opacity-50"
              title="Aggiorna dati"
          >
              <RefreshIcon className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
      </div>

      <div className="bg-surface rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="p-4 border-b bg-gray-50/50 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center w-full">
                <div className="relative flex-1 w-full">
                    <input 
                        type="text" 
                        placeholder="Cerca cliente, telefono, tracking, ID o partner..." 
                        value={filters.searchQuery}
                        className="w-full pl-10 p-2.5 border border-gray-300 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-sm" 
                        onChange={(e) => setFilters(f => ({...f, searchQuery: e.target.value}))} 
                    />
                    <SearchIcon className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                </div>
                
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {filters.showOnlyExpirations24h ? (
                        <div className="flex bg-white border border-gray-300 rounded-xl p-1 shadow-sm h-[46px] items-center">
                            <button 
                                onClick={() => setFilters(f => ({...f, expirationSubFilter: 'all'}))}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filters.expirationSubFilter === 'all' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                            >
                                TUTTI ({counters.scadenzeTotali})
                            </button>
                            <button 
                                onClick={() => setFilters(f => ({...f, expirationSubFilter: 'pending'}))}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filters.expirationSubFilter === 'pending' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                            >
                                ATTIVI ({counters.scadenzeTotali - counters.scadenzeOltre24h})
                            </button>
                            <button 
                                onClick={() => setFilters(f => ({...f, expirationSubFilter: 'expired'}))}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filters.expirationSubFilter === 'expired' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                            >
                                SCADUTI (+24h) ({counters.scadenzeOltre24h})
                            </button>
                        </div>
                    ) : !filters.showOnlyUrgentReminders && (
                        <>
                        <div className="min-w-[180px] flex-1 md:flex-none">
                            <SearchableSelect 
                                options={productOptions} 
                                value={filters.productIdFilter} 
                                onChange={(val) => setFilters(f => ({...f, productIdFilter: val}))}
                                placeholder="Tutti i prodotti"
                            />
                        </div>

                        {/* --- NUOVO FILTRO PAGAMENTO --- */}
                        <select 
                            className="flex-1 md:flex-none p-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none font-bold text-sm text-gray-700 shadow-sm" 
                            value={filters.paymentMethodFilter}
                            onChange={(e) => setFilters(f => ({...f, paymentMethodFilter: e.target.value as any}))}
                        >
                            <option value="all">Tutti i pagamenti</option>
                            <option value="cod">Contrassegno (COD)</option>
                            <option value="card">Carta (Mollie)</option>
                        </select>

                        <select 
                            className="flex-1 md:flex-none p-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none font-bold text-sm text-gray-700 shadow-sm" 
                            value={filters.periodFilter}
                            onChange={(e) => setFilters(f => ({...f, periodFilter: e.target.value as PeriodType}))}
                        >
                            <option value="today">Oggi</option>
                            <option value="yesterday">Ieri</option>
                            <option value="this_week">Questa settimana</option>
                            <option value="last_week">Settimana scorsa</option>
                            <option value="this_month">Questo mese</option>
                            <option value="last_month">Mese scorso</option>
                            <option value="this_year">Questo anno</option>
                            <option value="custom">Data personalizzata</option>
                            <option value="all">Tutti i tempi</option>
                        </select>
                        
                        <div className="relative flex-1 md:flex-none" ref={statusDropdownRef}>
                            <button 
                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                className={`w-full md:w-auto min-w-[140px] flex items-center justify-between p-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none font-bold text-sm shadow-sm transition-all ${filters.statusFilters.length > 0 ? 'text-primary' : 'text-gray-700'}`}
                            >
                                <span className="truncate mr-2">
                                    {filters.statusFilters.length === 0 ? 'Tutti gli stati' : `Stati (${filters.statusFilters.length})`}
                                </span>
                                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isStatusDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 border-b border-gray-100 flex justify-between gap-2">
                                        <button onClick={selectAllStatuses} className="flex-1 py-1 text-[10px] font-black uppercase text-primary hover:bg-gray-50 rounded transition-colors">Tutti</button>
                                        <button onClick={clearStatuses} className="flex-1 py-1 text-[10px] font-black uppercase text-red-600 hover:bg-red-50 rounded transition-colors">Nessuno</button>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto p-2 custom-scrollbar">
                                        {statusOptions.map(status => (
                                            <label 
                                                key={status} 
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${filters.statusFilters.includes(status) ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={filters.statusFilters.includes(status)}
                                                    onChange={() => toggleStatusFilter(status)}
                                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                                                />
                                                <span className={`text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-full ${getStatusBadge(status as SaleStatus)}`}>
                                                    {status}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        </>
                    )}
                </div>
            </div>
            {filters.periodFilter === 'custom' && !filters.showOnlyUrgentReminders && !filters.showOnlyExpirations24h && (
                <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-3 rounded-lg border border-primary/10 shadow-inner animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <label className="text-xs font-bold text-gray-400 uppercase">Dal:</label>
                        <input type="date" className="p-1.5 border rounded-md text-sm outline-none" value={filters.customStartDate} onChange={(e) => setFilters(f => ({...f, customStartDate: e.target.value}))} />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <label className="text-xs font-bold text-gray-400 uppercase">Al:</label>
                        <input type="date" className="p-1.5 border rounded-md text-sm outline-none" value={filters.customEndDate} onChange={(e) => setFilters(f => ({...f, customEndDate: e.target.value}))} />
                    </div>
                </div>
            )}
        </div>
        
        {filters.showOnlyUrgentReminders && (
            <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
                <p className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
                    Finestra Solleciti: Ordini "Contattato" da oltre 10 ore SENZA Ultimo Avviso inviato.
                </p>
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{counters.solleciti} DA GESTIRE</span>
            </div>
        )}

        {filters.showOnlyExpirations24h && (
            <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-center justify-between">
                <p className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    Finestra Scadenze: Ordini con Ultimo Avviso inviato. Puoi monitorare il timer e cambiare lo stato manualmente.
                </p>
                <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{counters.scadenzeTotali} IN SCADENZA</span>
            </div>
        )}

        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {showCheckboxes && (
                            <th className="px-6 py-3 text-left">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.size > 0 && selectedIds.size === paginatedSales.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                                />
                            </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Prodotto</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Q.tà</th>
                        {showCustomerDetails && (
                            <>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Telefono</th>
                            </>
                        )}
                        {user.role !== UserRole.AFFILIATE && <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Partner</th>}
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {isAffiliate ? 'Commissione' : 'Totale'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Pagamento</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stato</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Azioni</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedSales.map(sale => (
                        <OrderRow 
                            key={sale.id}
                            sale={sale}
                            isAffiliate={user.role === UserRole.AFFILIATE}
                            isCustomerCare={user.role === UserRole.CUSTOMER_CARE}
                            isLogistics={user.role === UserRole.LOGISTICS}
                            isAdmin={user.role === UserRole.ADMIN}
                            canEditStatus={canEditStatusGlobal}
                            getStatusBadge={getStatusBadge}
                            formatDate={(d: string) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            handleStatusChange={onUpdateSaleStatus}
                            optionsForRole={statusOptions}
                            onViewOrder={onViewOrder}
                            onContactCustomer={() => onContactCustomer(sale, filters.showOnlyUrgentReminders)}
                            onSendToMake={onSendToMake}
                            onSendToSpediamo={(s: Sale) => setSpediamoSale(s)}
                            canContact={isCC}
                            displayAffiliateId={affiliates.find(a => a.id === sale.affiliateId)?.short_id || sale.affiliateId}
                            isStaff={isStaff}
                            currentUserId={user.id}
                            refreshKey={refreshKey}
                            isSelected={selectedIds.has(sale.id)}
                            onToggleSelect={handleToggleSelect}
                            showCheckboxes={showCheckboxes}
                            showCustomerDetails={showCustomerDetails}
                        />
                    ))}
                </tbody>
            </table>
        </div>
        
        {allFilteredSales.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
                <p className="mt-4 text-lg font-medium">Nessun ordine trovato.</p>
            </div>
        ) : (
            <div className="bg-gray-50 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest order-2 md:order-1">
                    Mostrando <span className="text-primary">{(currentPage - 1) * pageSize + 1}</span> - <span className="text-primary">{Math.min(currentPage * pageSize, allFilteredSales.length)}</span> di <span className="text-primary">{allFilteredSales.length}</span> ordini
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-4 order-1 md:order-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-xl px-3 h-[42px] shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase whitespace-nowrap">Righe per pagina:</span>
                        <select 
                            value={pageSize} 
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-transparent border-none font-bold text-sm text-primary focus:ring-0 p-0 pr-2"
                        >
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                            <option value={300}>300</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-all uppercase tracking-tighter h-[42px]"
                        >
                            Precedente
                        </button>
                        <div className="flex items-center px-4 bg-primary/10 rounded-lg h-[42px]">
                            <span className="text-xs font-black text-primary uppercase">Pagina {currentPage} di {totalPages}</span>
                        </div>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-all uppercase tracking-tighter h-[42px]"
                        >
                            Successiva
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-primary-dark text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between border-2 border-primary/20">
                  <div className="flex items-center gap-4">
                      <div className="bg-secondary text-primary font-black w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                          {selectedIds.size}
                      </div>
                      <div>
                          <p className="text-sm font-black uppercase tracking-widest italic">Ordini selezionati</p>
                          <p className="text-[10px] text-gray-300 font-bold uppercase">Applica modifica di massa</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3">
                      <select 
                        value={bulkTargetStatus}
                        onChange={(e) => setBulkTargetStatus(e.target.value as SaleStatus)}
                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm font-bold text-white focus:ring-2 focus:ring-secondary focus:bg-white focus:text-primary transition-all outline-none"
                      >
                          <option value="" className="text-gray-400">Scegli Nuovo Stato...</option>
                          {statusOptions.map(opt => <option key={opt} value={opt} className="text-primary">{opt}</option>)}
                      </select>
                      <button 
                        onClick={handleBulkStatusChange}
                        disabled={!bulkTargetStatus || isBulkUpdating}
                        className="bg-secondary text-primary font-black px-6 py-2 rounded-xl text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                      >
                          {isBulkUpdating ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                          APPLICA
                      </button>
                      <button onClick={() => setSelectedIds(new Set())} className="p-2 text-white/50 hover:text-white transition-colors">
                          <XCircleIcon className="w-6 h-6" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL COPIA TRACKING - SCELTA STATI MULTIPLI */}
      <Modal isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} title="Copia Codici di Tracciamento" size="md">
          <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm text-blue-700 font-medium">Scegli gli stati degli ordini di cui desideri copiare i codici di tracciamento. Verranno considerati solo gli ordini che hanno un codice inserito.</p>
              </div>
              
              <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Seleziona uno o più stati</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar border rounded-xl p-3 bg-gray-50">
                      {statusOptions.map(status => (
                          <label 
                            key={status} 
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${copyStatusChoices.includes(status as SaleStatus) ? 'bg-primary/10' : 'hover:bg-white'}`}
                          >
                              <input 
                                type="checkbox" 
                                checked={copyStatusChoices.includes(status as SaleStatus)}
                                onChange={() => toggleCopyStatusChoice(status as SaleStatus)}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                              />
                              <span className={`text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-full ${getStatusBadge(status as SaleStatus)}`}>
                                  {status}
                              </span>
                          </label>
                      ))}
                  </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={handleCopyTrackingCodes}
                    disabled={copyStatusChoices.length === 0}
                    className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-lg hover:brightness-110 transition-all uppercase tracking-widest text-sm disabled:opacity-50 disabled:grayscale"
                  >
                      COPIA CODICI ({copyStatusChoices.length} STATI)
                  </button>
                  <button 
                    onClick={() => setIsCopyModalOpen(false)}
                    className="w-full text-gray-400 font-bold py-2 hover:text-gray-600 transition-colors uppercase text-xs"
                  >
                      ANNULLA
                  </button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={!!spediamoSale} onClose={() => setSpediamoSale(null)} title="Inoltro a Spediamo.it (SDA)" size="4xl">
            {spediamoSale && (
                <Suspense fallback={<div className="p-12 text-center">Caricamento logistica...</div>}>
                    <SpediamoModal 
                        sale={spediamoSale} 
                        product={products.find(p => p.id === spediamoSale.productId)!} 
                        settings={platformSettings} 
                        onClose={() => setSpediamoSale(null)} 
                        onSuccess={async (track: string) => {
                            await onUpdateSaleStatus(spediamoSale.id, 'Spedito');
                            await supabase.from('sales').update({ tracking_code: track }).eq('id', spediamoSale.id);
                            handleRefresh();
                        }} 
                    />
                </Suspense>
            )}
      </Modal>

      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Esporta CSV" size="3xl">
            <Suspense fallback={<div className="p-12 text-center">Caricamento...</div>}>
                <ExportCSVModal sales={sales} products={products} platformSettings={platformSettings} onClose={() => setIsExportModalOpen(false)} />
            </Suspense>
      </Modal>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default memo(OrderList);
