
import React, { useState, useMemo } from 'react';
import { UserRole, SaleStatus } from '../types';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { InfoIcon } from './icons/InfoIcon';

const GeneralCalculations: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.AFFILIATE);
    const [context, setContext] = useState<'HEADER' | 'DASHBOARD' | 'PERFORMANCE'>('HEADER');
    
    const [confirmedStatuses, setConfirmedStatuses] = useState<SaleStatus[]>(['Consegnato', 'Svincolato']);
    const [pendingStatuses, setPendingStatuses] = useState<SaleStatus[]>(['In attesa', 'Contattato', 'Confermato', 'Spedito', 'Giacenza']);
    const [includedCosts, setIncludedCosts] = useState<string[]>(['COGS', 'Shipping', 'Logistics', 'Commissions']);

    const allStatuses: SaleStatus[] = ['In attesa', 'Contattato', 'Confermato', 'Spedito', 'Svincolato', 'Consegnato', 'Giacenza', 'Annullato', 'Cancellato', 'Duplicato', 'Non raggiungibile', 'Non ritirato', 'Test'];
    const allCosts = [
        { id: 'COGS', label: 'Costo Merce (Acquisto)' },
        { id: 'Shipping', label: 'Costo Spedizione Reale' },
        { id: 'Logistics', label: 'Costo Logistica (Fulfillment)' },
        { id: 'Fees', label: 'Commissioni Piattaforma' },
        { id: 'Commissions', label: 'Commissioni Affiliato' },
        { id: 'CC', label: 'Commissioni Customer Care' }
    ];

    const toggleStatus = (status: SaleStatus, type: 'confirmed' | 'pending') => {
        if (type === 'confirmed') {
            setConfirmedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
        } else {
            setPendingStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
        }
    };

    const toggleCost = (costId: string) => {
        setIncludedCosts(prev => prev.includes(costId) ? prev.filter(c => c !== costId) : [...prev, costId]);
    };

    const formula = useMemo(() => {
        let baseVal = "";
        let pendingVal = "";
        
        switch (selectedRole) {
            case UserRole.AFFILIATE:
                baseVal = "Commissione Affiliato";
                pendingVal = "Commissione Affiliato";
                break;
            case UserRole.CUSTOMER_CARE:
                baseVal = "Commissione Fissa per Ordine (Assegnato)";
                pendingVal = "Commissione Fissa (Assegnato + Nuovi Lead)";
                break;
            case UserRole.LOGISTICS:
                baseVal = "Costo Logistica Fisso";
                pendingVal = "Costo Logistica Fisso";
                break;
            default:
                baseVal = "Prezzo di Vendita";
                pendingVal = "Prezzo di Vendita";
        }

        const subtractCosts = includedCosts.length > 0 ? ` - (${includedCosts.join(' + ')})` : "";
        const confirmedStr = confirmedStatuses.join(', ');
        const pendingStr = pendingStatuses.join(', ');

        return {
            available: `Σ [${baseVal}${selectedRole === UserRole.ADMIN ? subtractCosts : ""}] | Stato ∈ {${confirmedStr}} - Σ [Payouts Approvati/Pendenti]`,
            pending: `Σ [${pendingVal}${selectedRole === UserRole.ADMIN ? subtractCosts : ""}] | Stato ∈ {${pendingStr}}`
        };
    }, [selectedRole, confirmedStatuses, pendingStatuses, includedCosts]);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-on-surface tracking-tight uppercase italic flex items-center gap-3">
                        <CalculatorIcon className="w-8 h-8 text-primary" />
                        Analizzatore Logiche di Calcolo
                    </h2>
                    <p className="text-sm text-gray-500 italic mt-1">Simula e visualizza come la piattaforma genera i saldi e le performance.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Pannello di Configurazione */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">1. Seleziona Ruolo</h3>
                        <div className="space-y-2">
                            {Object.values(UserRole).map(role => (
                                <button 
                                    key={role} 
                                    onClick={() => setSelectedRole(role)}
                                    className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${selectedRole === role ? 'bg-primary text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                >
                                    {role.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">2. Seleziona Contesto</h3>
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                            {['HEADER', 'DASHBOARD', 'PERFORMANCE'].map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setContext(c as any)}
                                    className={`flex-1 py-2 rounded-lg text-[10px] font-black tracking-tighter transition-all ${context === c ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pannello Dettagli Calcolo */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <CalculatorIcon className="w-48 h-48" />
                        </div>
                        
                        <h3 className="text-xl font-black text-primary mb-6 flex items-center gap-2">
                            <InfoIcon className="w-5 h-5" />
                            Logica Applicata per: {selectedRole} ({context})
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Stati per Saldo "Disponibile / Maturato"</h4>
                                <div className="flex flex-wrap gap-2">
                                    {allStatuses.map(status => (
                                        <button 
                                            key={status} 
                                            onClick={() => toggleStatus(status, 'confirmed')}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border-2 ${confirmedStatuses.includes(status) ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-100 text-gray-300'}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Stati per Saldo "In Attesa / Pendente"</h4>
                                <div className="flex flex-wrap gap-2">
                                    {allStatuses.map(status => (
                                        <button 
                                            key={status} 
                                            onClick={() => toggleStatus(status, 'pending')}
                                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border-2 ${pendingStatuses.includes(status) ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white border-gray-100 text-gray-300'}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {(selectedRole === UserRole.ADMIN || selectedRole === UserRole.MANAGER) && (
                            <div className="mt-10 pt-10 border-t border-dashed">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Parametri di Costo Sottratti (Net Profit)</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {allCosts.map(cost => (
                                        <label key={cost.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200">
                                            <input 
                                                type="checkbox" 
                                                checked={includedCosts.includes(cost.id)} 
                                                onChange={() => toggleCost(cost.id)}
                                                className="w-5 h-5 text-primary rounded-lg focus:ring-primary border-gray-300"
                                            />
                                            <span className="text-xs font-bold text-gray-700">{cost.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-3xl border border-green-200 shadow-sm">
                            <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-4">Formula Saldo Disponibile</h4>
                            <div className="bg-white/50 p-4 rounded-xl font-mono text-sm font-bold text-green-800 border border-green-200">
                                {formula.available}
                            </div>
                            <p className="mt-4 text-xs text-green-700/70 leading-relaxed italic">
                                * Questo valore rappresenta il capitale effettivamente prelevabile o già maturato. I payout vengono sottratti immediatamente dalla richiesta.
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-3xl border border-orange-200 shadow-sm">
                            <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4">Formula Saldo In Attesa</h4>
                            <div className="bg-white/50 p-4 rounded-xl font-mono text-sm font-bold text-orange-800 border border-orange-200">
                                {formula.pending}
                            </div>
                            <p className="mt-4 text-xs text-orange-700/70 leading-relaxed italic">
                                * Capitale potenziale basato sugli ordini ancora in lavorazione o spediti ma non ancora confermati come consegnati.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneralCalculations;
