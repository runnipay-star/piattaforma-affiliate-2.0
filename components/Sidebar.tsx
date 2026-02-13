
import React from 'react';
import { User, UserRole, PlatformSettings, View } from '../types';
import { HomeIcon } from './icons/HomeIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CubeIcon } from './icons/CubeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { UserCogIcon } from './icons/UserCogIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { UserIcon } from './icons/UserIcon';
import { BellIcon } from './icons/BellIcon';
import { WalletIcon } from './icons/WalletIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { WrenchIcon } from './icons/WrenchIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { ChevronDoubleLeftIcon } from './icons/ChevronDoubleLeftIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { VariableIcon } from './icons/VariableIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

interface SidebarProps {
  user: User;
  onNavigate: (view: View) => void;
  onLogout: () => void;
  currentView: View;
  assistanceNotificationCount: number;
  pendingPaymentsCount: number;
  pendingAffiliatesCount: number;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  platformSettings: PlatformSettings;
}

interface NavItemProps {
  label: string;
  icon: React.ReactElement;
  view: View;
  roles: UserRole[];
  notificationCount?: number;
}

const NavLink: React.FC<{
    item: NavItemProps;
    isActive: boolean;
    isSidebarOpen: boolean;
    onClick: () => void;
}> = ({ item, isActive, isSidebarOpen, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
        isActive
            ? 'bg-primary text-on-primary shadow-lg'
            : 'text-gray-300 hover:bg-primary-dark hover:text-white'
        }`}
    >
        <div className="flex-shrink-0">{item.icon}</div>
        {isSidebarOpen && <span className="ml-4 font-semibold truncate">{item.label}</span>}
        {item.notificationCount && item.notificationCount > 0 ? (
        <span
            className={`ml-auto text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
            isActive ? 'bg-white text-primary' : 'bg-red-50 text-white'
            }`}
        >
            {item.notificationCount}
        </span>
        ) : null}
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({
  user,
  onNavigate,
  onLogout,
  currentView,
  assistanceNotificationCount,
  pendingPaymentsCount,
  pendingAffiliatesCount,
  isSidebarOpen,
  toggleSidebar,
  platformSettings,
}) => {
  const navItems: NavItemProps[] = [
    { label: 'Dashboard', icon: <HomeIcon />, view: 'dashboard', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE] },
    { label: 'Performance', icon: <ChartBarIcon />, view: 'performance', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE] },
    { label: 'Traffico Live', icon: <GlobeAltIcon />, view: 'live-traffic', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE] },
    { label: 'Prodotti', icon: <CubeIcon />, view: 'products', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE] },
    { label: 'Magazzino', icon: <ArchiveBoxIcon />, view: 'magazzino', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.LOGISTICS] },
    { label: 'Ordini', icon: <ClipboardListIcon />, view: 'orders', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE] },
    { label: 'Affiliati', icon: <UsersIcon />, view: 'affiliates', roles: [UserRole.ADMIN, UserRole.MANAGER], notificationCount: pendingAffiliatesCount },
    { label: 'Manager', icon: <UserCogIcon />, view: 'managers', roles: [UserRole.ADMIN] },
    { label: 'Pagamenti', icon: <WalletIcon />, view: 'pagamenti', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE], notificationCount: pendingPaymentsCount },
    { label: 'Contabilità', icon: <CalculatorIcon />, view: 'contabilita', roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { label: 'Calcoli Generali', icon: <VariableIcon />, view: 'general-calculations', roles: [UserRole.ADMIN] },
    { label: 'Notifiche', icon: <BellIcon />, view: 'notifications', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE] },
    { label: 'Assistenza', icon: <QuestionMarkCircleIcon />, view: 'assistenza', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE], notificationCount: assistanceNotificationCount },
    { label: 'Impostazioni', icon: <WrenchIcon />, view: 'settings', roles: [UserRole.ADMIN, UserRole.MANAGER] },
  ];

  const secondaryNavItems: NavItemProps[] = [
    { label: 'Profilo', icon: <UserIcon />, view: 'profile', roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE] },
  ];

  const visibleNavItems = navItems.filter(item => item.roles.includes(user.role));
  const visibleSecondaryNavItems = secondaryNavItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className={`fixed top-0 left-0 h-full bg-gradient-to-b from-primary to-primary-dark text-on-primary flex flex-col transition-all duration-300 ease-in-out z-40 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="relative flex items-center justify-center p-4 min-h-[6rem] border-b border-primary-light/20">
            <h1 className={`${isSidebarOpen ? 'text-3xl' : 'text-xl'} font-bold text-secondary italic transition-all`}>MWS</h1>
            <button onClick={toggleSidebar} className="absolute top-1/2 -right-3 transform -translate-y-1/2 p-1.5 rounded-full bg-primary-dark text-gray-300 hover:bg-secondary hover:text-primary border-2 border-primary transition-all">
                <ChevronDoubleLeftIcon className={`w-5 h-5 transition-transform duration-300 ${!isSidebarOpen && 'rotate-180'}`} />
            </button>
        </div>
      <nav className="flex-grow px-2 py-4 overflow-y-auto">
        <ul>
          {visibleNavItems.map(item => (
            <li key={item.view}>
                <NavLink item={item} isActive={currentView === item.view} isSidebarOpen={isSidebarOpen} onClick={() => onNavigate(item.view)} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-2 border-t border-primary-light/20">
        <ul>
             {visibleSecondaryNavItems.map(item => (
                <li key={item.view}>
                     <NavLink item={item} isActive={currentView === item.view} isSidebarOpen={isSidebarOpen} onClick={() => onNavigate(item.view)} />
                </li>
             ))}
             <li>
                <button onClick={onLogout} className="w-full flex items-center p-3 my-1 rounded-lg text-gray-300 hover:bg-primary-dark hover:text-white transition-colors duration-200">
                    <LogoutIcon />
                    {isSidebarOpen && <span className="ml-4 font-semibold">Logout</span>}
                </button>
             </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
