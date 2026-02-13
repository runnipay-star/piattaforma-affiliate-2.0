
import React, { useState, useMemo } from 'react';
import { Notification, User, UserRole } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CogIcon } from './icons/CogIcon';
import Modal from './Modal';

interface NotificationManagerProps {
    notifications: Notification[];
    allUsers: Omit<User, 'notifications'>[];
    onCreateNotification: (notificationData: Omit<Notification, 'id' | 'createdAt' | 'readBy'>) => Promise<void>;
    onDeleteNotification: (notificationId: string) => void;
    autoNotificationEnabled: boolean;
    onToggleAutoNotification: (enabled: boolean) => void;
}

const NotificationForm: React.FC<{
    onSave: (data: { title: string, message: string, targetRoles: UserRole[] }) => Promise<void>;
    onClose: () => void;
}> = ({ onSave, onClose }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetRoles, setTargetRoles] = useState<UserRole[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const availableRoles = [UserRole.AFFILIATE, UserRole.MANAGER, UserRole.LOGISTICS, UserRole.ADMIN, UserRole.CUSTOMER_CARE];

    const handleRoleToggle = (role: UserRole) => {
        setTargetRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (title && message && targetRoles.length > 0) {
            setIsSubmitting(true);
            try {
                await onSave({ title, message, targetRoles });
                onClose();
            } catch (e) {
                console.error("Form Submit Error:", e);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            alert("Compila tutti i campi e seleziona almeno un destinatario.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titolo Notifica</label>
                <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Messaggio</label>
                <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Destinatari (Ruoli)</label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {availableRoles.map(role => (
                        <button
                            type="button"
                            key={role}
                            onClick={() => handleRoleToggle(role)}
                            className={`px-4 py-2 text-xs font-black rounded-full border-2 transition-all ${
                                targetRoles.includes(role)
                                ? 'bg-primary text-white border-primary shadow-md'
                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                            }`}
                        >
                            {role.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>
             <div className="mt-8 flex justify-end gap-4 border-t pt-6">
                <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-200">
                    Annulla
                </button>
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-primary text-on-primary font-black py-2 px-10 rounded-lg hover:bg-primary-dark transition-all shadow-lg disabled:opacity-50"
                >
                    {isSubmitting ? 'INVIO IN CORSO...' : 'INVIA NOTIFICA ORA'}
                </button>
            </div>
        </form>
    );
};


const NotificationManager: React.FC<NotificationManagerProps> = ({ notifications, allUsers, onCreateNotification, onDeleteNotification, autoNotificationEnabled, onToggleAutoNotification }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [viewingReaders, setViewingReaders] = useState<User[] | null>(null);
    const [viewingNotificationTitle, setViewingNotificationTitle] = useState('');
    
    const handleSaveNotification = async (data: { title: string, message: string, targetRoles: UserRole[] }) => {
        await onCreateNotification(data);
    };

    const handleViewReaders = (notification: Notification) => {
        const readers = allUsers.filter(u => notification.readBy.includes(u.id));
        setViewingReaders(readers as User[]);
        setViewingNotificationTitle(notification.title);
    };
    
    const sortedNotifications = useMemo(() => {
        return [...notifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [notifications]);

    return (
        <div className="p-8">
            <style>{`
                .toggle-checkbox:checked { right: 0; border-color: #4caf50; }
                .toggle-checkbox:checked + .toggle-label { background-color: #4caf50; }
            `}</style>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-on-surface uppercase italic">Gestione Notifiche</h2>
                    <p className="text-gray-500 text-sm">Invia comunicazioni massive o gestisci le automazioni.</p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-primary text-on-primary font-black py-3 px-6 rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-lg active:scale-95"
                >
                    <PlusIcon />
                    CREA NOTIFICA MANUALE
                </button>
            </div>

            {/* Pannello Automazioni */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4 text-primary font-black uppercase text-xs tracking-widest">
                    <CogIcon className="w-5 h-5" />
                    <h3>Impostazioni Automazione</h3>
                </div>
                <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <div>
                        <p className="font-bold text-gray-800">Notifica Nuovo Prodotto</p>
                        <p className="text-xs text-gray-500">Invia automaticamente una notifica a tutti gli affiliati quando viene aggiunto un nuovo prodotto.</p>
                    </div>
                    <div className="flex items-center">
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input 
                                type="checkbox" 
                                name="autoNotify" 
                                id="autoNotify" 
                                checked={autoNotificationEnabled} 
                                onChange={(e) => onToggleAutoNotification(e.target.checked)} 
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                            />
                            <label htmlFor="autoNotify" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                        <span className={`text-[10px] font-black uppercase ${autoNotificationEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                            {autoNotificationEnabled ? 'Attiva' : 'Disattivata'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="bg-surface rounded-2xl shadow-md overflow-hidden border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Data</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Contenuto</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Destinatari</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Letti</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Azioni</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedNotifications.map(n => (
                            <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-bold">{new Date(n.createdAt).toLocaleDateString('it-IT')}</td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-900">{n.title}</div>
                                    <div className="text-[10px] text-gray-400 max-w-xs truncate uppercase font-medium">{n.message}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-wrap gap-1">
                                        {n.targetRoles.map(r => <span key={r} className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">{r}</span>)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                    <button 
                                        onClick={() => handleViewReaders(n)} 
                                        className="bg-gray-100 hover:bg-primary hover:text-white px-3 py-1 rounded-lg text-xs font-black transition-all disabled:opacity-30" 
                                        disabled={n.readBy.length === 0}
                                    >
                                        {n.readBy.length}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => onDeleteNotification(n.id)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sortedNotifications.length === 0 && (
                    <div className="p-20 text-center text-gray-400 italic font-medium">
                        Nessuna notifica presente in archivio.
                    </div>
                )}
            </div>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Nuova Comunicazione Massiva" size="xl">
                <NotificationForm onSave={handleSaveNotification} onClose={() => setIsFormOpen(false)} />
            </Modal>
            
            <Modal isOpen={!!viewingReaders} onClose={() => setViewingReaders(null)} title={`Letture per: "${viewingNotificationTitle}"`}>
                {viewingReaders && (
                    <div className="max-h-96 overflow-y-auto space-y-2 p-2">
                        {viewingReaders.map(user => (
                            <div key={user.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{user.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{user.email}</p>
                                </div>
                                <span className="text-[10px] font-black uppercase bg-white border px-2 py-1 rounded-lg text-gray-400">{user.role}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default NotificationManager;
