import React, { useState, useMemo } from 'react';
import { Sale, Product, Affiliate, User, UserRole, SaleStatus, StockExpense } from '../types';
import SalesChart from './SalesChart';
import { RefreshIcon } from './icons/RefreshIcon';
import { SearchIcon } from './icons/SearchIcon';
import SearchableSelect from './SearchableSelect';
import { FilterIcon } from './icons/FilterIcon';

const StatCard: React.FC<{ title: string; value: string | number; color: string }> = ({ title, value, color }) => (
    <div className="bg-surface p-6 rounded-xl shadow-md flex flex-col border border-gray-100 transition-all hover:shadow-lg">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
        <p className={`text-3xl font-black mt-2 ${color}`}>{value}</p>
    </div>
);

type TimePeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom' | 'all';

const getPeriodRange = (period: TimePeriod, customStart?: string, customEnd?: string): [Date, Date] | null => {
    if (period === 'all') return null;
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    start.setHours(0, 0, 0, 0); 
    end.setHours(23, 59, 59, 999);

    switch (period) {
        case 'yesterday': 
            start.setDate(start.getDate() - 1); 
            end.setDate(end.getDate() - 1); 
            break;
        case 'this_week':
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff); 
            end.setDate(start.getDate() + 6);
            break;
        case 'this_month': 
            start.setDate(1); 
            end.setMonth(now.getMonth() + 1); 
            end.setDate(0); 
            break;
        case 'last_month':
            start.setMonth(now.getMonth() - 1); 
            start.setDate(1);
            end.setMonth(now.getMonth()); 
            end.setDate(0);
            break;
        case 'custom':
            if (!customStart) return null;
            start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            if (customEnd) {
                end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
            } else {
                end = new Date(start);
                end.setHours(23, 59, 59, 999);
            }
            break;
    }
    return [start, end];
};

interface PerformanceProps {
    user: User;
    sales: Sale[];
    products: Product[];
    affiliates: Affiliate[];
    stockExpenses: StockExpense[];
    onRefreshData: () => Promise<void>;
}

const Performance: React.FC<PerformanceProps> = ({ user, sales = [], products = [], onRefreshData }) => {
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('this_month');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('all');
    const [searchSubId, setSearchSubId] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isAdminOrManager = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    const isAffiliate = user.role === UserRole.AFFILIATE;
    const isCustomerCare = user.role === UserRole.CUSTOMER_CARE;
    const isLogistics = user.role === UserRole.LOGISTICS;

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true); 
        try {
            await onRefreshData(); 
        } finally {
            setIsRefreshing(false);
        }
    };

    const productOptions = useMemo(() => {
        return [
            { value: 'all', label: 'Tutti i prodotti' },
            ...products.map(p => ({ value: p.id, label: p.name, refNumber: p.refNumber }))
        ];
    }, [products]);

    const finalFilteredSales = useMemo(() => {
        const range = getPeriodRange(timePeriod, customStartDate, customEndDate);
        const q = searchSubId.trim().toLowerCase();
        
        return sales.filter(s => {
            if (isAffiliate) {
                const sAffId = String(s.affiliateId || '');
                if (sAffId !== user.id && sAffId !== user.short_id) return false;
            }
            
            if (isCustomerCare) {
                if (s.lastContactedBy && s.lastContactedBy !== user.id) return false;
            }
            
            if (range) {
                const date = new Date(s.saleDate);
                if (date < range[0] || date > range[1]) return false;
            } else if (timePeriod === 'custom' && !customStartDate) {
                return false; 
            }

            if (selectedProductId !== 'all' && s.productId !== selectedProductId) return false;
            if (q && !String(s.subId || '').toLowerCase().includes(q)) return false;

            return true;
        });
    }, [sales, timePeriod, customStartDate, customEndDate, user, isAffiliate, isCustomerCare, selectedProductId, searchSubId]);

    const stats = useMemo(() => {
        let confirmedEarned = 0;
        let pendingEarned = 0;
        let totalCount = 0;
        let confirmedCount = 0;
        let waitingCount = 0;
        
        const excludedStatuses: SaleStatus[] = ['Annullato', 'Cancellato', 'Duplicato', 'Test', 'Non raggiungibile', 'Non ritirato', 'Svincolato'];
        const confirmedStatuses: SaleStatus[] = ['Consegnato'];
        const pendingStatuses: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Spedito', 'Giacenza'];

        finalFilteredSales.forEach(s => {
            if (s.status === 'Confermato') confirmedCount++;
            if (s.status === 'In attesa') waitingCount++;

            if (excludedStatuses.includes(s.status)) return;
            
            totalCount++;
            const prod = products.find(p => p.id === s.productId);
            let val = 0;
            
            if (isAdminOrManager) {
                val = (s.saleAmount || 0);
            } else if (isAffiliate) {
                val = s.commissionAmount;
            } else if (isCustomerCare) {
                val = (prod?.customerCareCommission || 0);
            } else if (isLogistics) {
                val = (prod?.fulfillmentCost || 0);
            }

            if (s.isBonus || confirmedStatuses.includes(s.status)) {
                confirmedEarned += val;
            } else if (pendingStatuses.includes(s.status)) {
                pendingEarned += val;
            }
        });

        const deliveredCount = finalFilteredSales.filter(s => confirmedStatuses.includes(s.status)).length;
        const deliveryRate = totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0;

        return { confirmed: confirmedEarned, pending: pendingEarned, totalCount, deliveryRate, confirmedCount, waitingCount };
    }, [finalFilteredSales, products, isAdminOrManager, isAffiliate, isCustomerCare, isLogistics]);

    const chartSales = useMemo(() => {
        const excluded = ['Annullato', 'Cancellato', 'Duplicato', 'Test', 'Non raggiungibile', 'Non ritirato', 'Svincolato'];
        return finalFilteredSales.filter(s => !excluded.includes(s.status)).map(s => {
            const p = products.find(prod => prod.id === s.productId);
            let amount = 0;

            if (isAdminOrManager) amount = (s.saleAmount || 0);
            else if (isAffiliate) amount = s.commissionAmount;
            else if (isCustomerCare) amount = (p?.customerCareCommission || 0); 
            else if (isLogistics) amount = p?.fulfillmentCost || 0;

            return { ...s, saleAmount: amount };
        });
    }, [finalFilteredSales, products, isAffiliate, isCustomerCare, isLogistics, isAdminOrManager]);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-on-surface tracking-tight uppercase italic">Performance Report</h2>
                    <p className="text-sm text-gray-500 italic mt-1">
                        {isAdminOrManager ? "Monitoraggio fatturato lordo generato dagli ordini." : "Analisi lorda delle commissioni generate."}
                    </p>
                </div>
                <button 
                    onClick={handleRefresh} 
                    disabled={isRefreshing} 
                    className="flex items-center gap-3 bg-primary text-white font-black py-3 px-6 rounded-xl shadow-lg hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50 group border-2 border-primary/20"
                >
                    <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    <span className="uppercase tracking-widest text-sm">Aggiorna Dati</span>
                </button>
            </div>

            <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">
                    <FilterIcon className="w-4 h-4" />
                    <h3>Filtri Analitici</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Periodo</label>
                            <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value as TimePeriod)} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm">
                                <option value="today">Oggi</option>
                                <option value="yesterday">Ieri</option>
                                <option value="this_week">Questa Settimana</option>
                                <option value="this_month">Questo Mese</option>
                                <option value="last_month">Mese Scorso</option>
                                <option value="custom">Data personalizzata</option>
                                <option value="all">Sempre</option>
                            </select>
                        </div>
                        
                        {timePeriod === 'custom' && (
                            <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-200">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Dal</label>
                                    <input 
                                        type="date" 
                                        value={customStartDate} 
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Al</label>
                                    <input 
                                        type="date" 
                                        value={customEndDate} 
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Seleziona Prodotto</label>
                        <SearchableSelect options={productOptions} value={selectedProductId} onChange={setSelectedProductId} />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Filtra Sub ID</label>
                        <div className="relative mt-1">
                            <input type="text" value={searchSubId} onChange={(e) => setSearchSubId(e.target.value)} placeholder="E.g. fb_ads" className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm" />
                            <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-2">
                     <StatCard title={isAdminOrManager ? "Fatturato Maturato" : "Commissioni Maturate"} value={`€${stats.confirmed.toFixed(2)}`} color="text-green-600" />
                </div>
                <StatCard title="Volume In Attesa" value={stats.waitingCount} color="text-orange-600" />
                <StatCard title="Volume Confermati" value={stats.confirmedCount} color="text-blue-600" />
                <StatCard title="Ordini Validi" value={stats.totalCount} color="text-indigo-600" />
                <StatCard title="Tasso Consegna" value={`${stats.deliveryRate.toFixed(1)}%`} color="text-purple-600" />
            </div>

            <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-6 text-gray-700 uppercase tracking-wider">Andamento Turnover</h3>
                <div className="h-80">
                    <SalesChart sales={chartSales} granularity={['today', 'yesterday'].includes(timePeriod) ? 'hour' : 'day'} />
                </div>
            </div>
        </div>
    );
};

export default Performance;