import React, { useMemo } from 'react';
import { User, UserRole, Sale, Notification, Product, SaleStatus, Transaction } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import NotificationBell from './NotificationBell';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface HeaderProps {
  user: User;
  fullUserObject: (User & { currentBalance?: number; }) | null;
  sales: Sale[];
  products: Product[];
  notifications: Notification[];
  transactions: Transaction[]; 
  onOpenCommissionDetails: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onViewNotification: (notification: Notification) => void;
  onOpenPlatformCheck: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, fullUserObject, sales, products, notifications, transactions, onOpenCommissionDetails, onMarkAsRead, onMarkAllAsRead, onViewNotification, onOpenPlatformCheck }) => {
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  const isAffiliate = user.role === UserRole.AFFILIATE;
  const isCustomerCare = user.role === UserRole.CUSTOMER_CARE;
  const isLogistics = user.role === UserRole.LOGISTICS;

  const { availableBalance, pendingRevenue } = useMemo(() => {
    let income = 0;
    let spending = 0;
    let pending = 0;

    const confirmedStatuses: SaleStatus[] = ['Consegnato'];
    const pendingStatuses: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Spedito', 'Giacenza'];
    const excludedStatuses: SaleStatus[] = ['Annullato', 'Cancellato', 'Duplicato', 'Test', 'Non raggiungibile', 'Non ritirato', 'Svincolato'];

    sales.forEach(sale => {
        if (excludedStatuses.includes(sale.status)) return;

        let amountForThisSale = 0;
        let belongsToUser = false;

        if (isAdmin) {
            // Per l'Admin il valore è il PREZZO DI VENDITA (Fatturato Lordo)
            amountForThisSale = sale.saleAmount;
            belongsToUser = true;
        } else {
            const product = products.find(p => p.id === sale.productId);
            if (isAffiliate) {
                const sAffId = String(sale.affiliateId || '');
                belongsToUser = (sAffId === user.id || sAffId === user.short_id);
                amountForThisSale = sale.commissionAmount;
            } else if (isCustomerCare) {
                belongsToUser = (sale.lastContactedBy === user.id);
                amountForThisSale = (product?.customerCareCommission || 0);
            } else if (isLogistics) {
                belongsToUser = true;
                amountForThisSale = product?.fulfillmentCost || 0;
            }
        }

        if (belongsToUser) {
            if (sale.isBonus || confirmedStatuses.includes(sale.status)) {
                income += amountForThisSale;
            } else if (pendingStatuses.includes(sale.status)) {
                pending += amountForThisSale;
            }
        }
    });

    // Calcolo uscite (Payout)
    transactions.forEach(t => {
        if (isAdmin) {
            // Per l'Admin contano solo i Payout effettivamente completati (Cassa Reale)
            if (t.type === 'Payout' && t.status === 'Completed') {
                spending += t.amount;
            }
        } else {
            // Per l'utente contano anche i Payout pendenti (Saldo impegnato)
            if (t.userId === user.id && t.type === 'Payout' && (t.status === 'Completed' || t.status === 'Pending')) {
                spending += t.amount;
            }
        }
    });

    return { 
        availableBalance: Math.max(0, income - spending), 
        pendingRevenue: pending 
    };
  }, [sales, products, transactions, user.id, user.short_id, user.role, isAdmin, isAffiliate, isLogistics, isCustomerCare]);

  return (
    <header className="bg-surface shadow-sm p-4 sticky top-0 z-20">
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 sm:gap-8">
        <div className="flex items-center gap-3 text-green-600" title={isAdmin ? "Cassa Piattaforma (Consegnati - Payout)" : "Saldo Prelevabile"}>
          <CheckCircleIcon className="w-7 h-7" />
          <div>
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{isAdmin ? 'Cassa Reale' : 'Saldo Disponibile'}</span>
              <p className="text-xl font-black">€{availableBalance.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-orange-500">
          <ClockIcon className="w-7 h-7" />
          <div>
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">In Attesa</span>
              <p className="text-xl font-black">€{pendingRevenue.toFixed(2)}</p>
          </div>
        </div>
        <button onClick={onOpenPlatformCheck} className="flex items-center gap-2 text-left rounded-xl p-2 hover:bg-gray-100 transition-colors text-blue-600 border border-transparent">
            <ShieldCheckIcon className="w-7 h-7" />
             <div>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sistema</span>
                <p className="text-base font-bold">Diagnostica</p>
            </div>
        </button>
        <NotificationBell user={user} notifications={notifications} onMarkAsRead={onMarkAsRead} onMarkAllAsRead={onMarkAllAsRead} onViewNotification={onViewNotification} />
      </div>
    </header>
  );
};

export default Header;