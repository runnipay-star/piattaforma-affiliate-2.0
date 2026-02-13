
import React, { useState, useEffect } from 'react';
import { PlatformSettings, User, UserRole, Product } from '../types';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { WrenchIcon } from './icons/WrenchIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { InfoIcon } from './icons/InfoIcon';
import { triggerWebhook } from '../database';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { WalletIcon } from './icons/WalletIcon';

interface SettingsPageProps {
    user: User;
    settings: PlatformSettings;
    products: Product[];
    onSaveAppearance: (settingsData: Partial<PlatformSettings>) => Promise<void>;
    onSaveIntegrations: (settingsData: Partial<PlatformSettings>) => Promise<void>;
    onSaveIpBlocklist: (ips: string[]) => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, settings, onSaveIntegrations, onSaveAppearance }) => {
    const isAdmin = user.role === UserRole.ADMIN;
    const isManager = user.role === UserRole.MANAGER;
    const [activeTab, setActiveTab] = useState<'logistica' | 'aspetto' | 'calcoli'>('aspetto');
    const [isTestingWebhook, setIsTestingWebhook] = useState(false);
    
    // State Integrations
    const [makeWebhookUrl, setMakeWebhookUrl] = useState(settings.make_webhook_url || '');
    const [staffChatWebhookUrl, setStaffChatWebhookUrl] = useState(settings.staff_chat_webhook_url || '');
    const [registrationWebhookUrl, setRegistrationWebhookUrl] = useState(settings.registration_webhook_url || '');
    const [globalWebhookUrl, setGlobalWebhookUrl] = useState(settings.global_webhook_url || '');
    const [spediamoKey, setSpediamoKey] = useState(settings.spediamo_api_key || '');
    const [paccofacileKey, setPaccofacileKey] = useState(settings.paccofacile_api_key || '');

    const [sender, setSender] = useState({
        name: settings.sender_name || '',
        address: settings.sender_address || '',
        houseNumber: settings.sender_house_number || '',
        city: settings.sender_city || '',
        zip: settings.sender_zip || '',
        province: settings.sender_province || '',
        phone: settings.sender_phone || '',
        email: settings.sender_email || ''
    });

    const [bank, setBank] = useState({
        iban: settings.sender_iban || '',
        header: settings.sender_iban_header || '',
        bankName: settings.sender_bank_name || '',
        bic: settings.sender_bic || ''
    });

    // State Appearance
    const [appearance, setAppearance] = useState({
        platform_logo: settings.platform_logo || '',
        logo_sidebar_open_width: settings.logo_sidebar_open_width || '80',
        logo_sidebar_open_height: settings.logo_sidebar_open_height || '56',
        logo_sidebar_closed_width: settings.logo_sidebar_closed_width || '56',
        logo_sidebar_closed_height: settings.logo_sidebar_closed_height || '56',
        logo_login_width: settings.logo_login_width || '128',
        logo_login_height: settings.logo_login_height || '128',
        sidebar_open_bg_color: settings.sidebar_open_bg_color || '#1a237e',
        sidebar_open_horizontal_align: settings.sidebar_open_horizontal_align || 'center',
        sidebar_open_vertical_align: settings.sidebar_open_vertical_align || 'center',
    });

    const handleSaveLogistics = async () => {
        await onSaveIntegrations({
            make_webhook_url: makeWebhookUrl,
            staff_chat_webhook_url: staffChatWebhookUrl,
            registration_webhook_url: registrationWebhookUrl,
            global_webhook_url: globalWebhookUrl,
            spediamo_api_key: spediamoKey,
            paccofacile_api_key: paccofacileKey,
            sender_name: sender.name,
            sender_address: sender.address,
            sender_house_number: sender.houseNumber,
            sender_city: sender.city,
            sender_zip: sender.zip,
            sender_province: sender.province.toUpperCase(),
            sender_phone: sender.phone,
            sender_email: sender.email,
            sender_iban: bank.iban,
            sender_iban_header: bank.header,
            sender_bank_name: bank.bankName,
            sender_bic: bank.bic
        });
        alert("Configurazione Logistica salvata!");
    };

    const handleTestWebhook = async () => {
        const url = globalWebhookUrl || staffChatWebhookUrl || makeWebhookUrl;
        if (!url) return alert("Inserisci prima un URL Webhook.");
        
        setIsTestingWebhook(true);
        try {
            const payload = {
                event: 'TEST_CONNECTION',
                message: "Questo è un messaggio di test da MWS",
                sender_name: "Sistema MWS",
                sender_role: "ADMIN",
                timestamp: new Date().toISOString()
            };
            await triggerWebhook(url, payload);
            alert("Segnale inviato con successo!");
        } catch (e) {
            alert("Errore invio test.");
        } finally {
            setIsTestingWebhook(false);
        }
    };

    const handleSaveAppearance = async () => {
        await onSaveAppearance(appearance);
        alert("Impostazioni estetiche aggiornate!");
    };

    if (!isAdmin && !isManager) return <div className="p-8 text-center font-bold text-red-600">Accesso negato. Solo Admin e Manager possono accedere.</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-on-surface uppercase italic">Impostazioni Piattaforma</h2>
                    <p className="text-gray-500">Configura l'identità visiva, le integrazioni e le regole della tua istanza MWS.</p>
                </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="border-b border-gray-100 bg-gray-50/50">
                    <nav className="flex gap-4 px-6">
                        <button 
                            onClick={() => setActiveTab('aspetto')} 
                            className={`py-4 px-2 border-b-4 font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'aspetto' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
                        >
                            <PhotoIcon className="w-4 h-4" /> Aspetto & Branding
                        </button>
                        <button 
                            onClick={() => setActiveTab('logistica')} 
                            className={`py-4 px-2 border-b-4 font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'logistica' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
                        >
                            <WrenchIcon className="w-4 h-4" /> Logistica & API
                        </button>
                        <button 
                            onClick={() => setActiveTab('calcoli')} 
                            className={`py-4 px-2 border-b-4 font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'calcoli' ? 'border-primary text-primary' : 'border-transparent text-gray-400'}`}
                        >
                            <CalculatorIcon className="w-4 h-4" /> Regole di Calcolo
                        </button>
                    </nav>
                </div>

                <div className="p-8">
                    {activeTab === 'aspetto' && (
                        <div className="space-y-10 animate-in fade-in duration-300">
                            <section>
                                <h3 className="text-lg font-black text-primary mb-6 border-b pb-2 uppercase italic tracking-wider">Identità Visiva & Logo</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">URL Logo Piattaforma (PNG/SVG consigliato)</label>
                                            <input 
                                                type="text" 
                                                value={appearance.platform_logo} 
                                                onChange={e => setAppearance({...appearance, platform_logo: e.target.value})} 
                                                placeholder="https://tuosito.it/logo.png" 
                                                className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none font-medium" 
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dimensioni Sidebar Aperta</h4>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[9px] text-gray-400 uppercase font-bold">Largh. (px)</label>
                                                        <input type="number" value={appearance.logo_sidebar_open_width} onChange={e => setAppearance({...appearance, logo_sidebar_open_width: e.target.value})} className="w-full p-2 border rounded-lg text-xs" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[9px] text-gray-400 uppercase font-bold">Alt. (px)</label>
                                                        <input type="number" value={appearance.logo_sidebar_open_height} onChange={e => setAppearance({...appearance, logo_sidebar_open_height: e.target.value})} className="w-full p-2 border rounded-lg text-xs" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dimensioni Sidebar Chiusa</h4>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-[9px] text-gray-400 uppercase font-bold">Largh. (px)</label>
                                                        <input type="number" value={appearance.logo_sidebar_closed_width} onChange={e => setAppearance({...appearance, logo_sidebar_closed_width: e.target.value})} className="w-full p-2 border rounded-lg text-xs" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[9px] text-gray-400 uppercase font-bold">Alt. (px)</label>
                                                        <input type="number" value={appearance.logo_sidebar_closed_height} onChange={e => setAppearance({...appearance, logo_sidebar_closed_height: e.target.value})} className="w-full p-2 border rounded-lg text-xs" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-gray-50 border border-dashed rounded-2xl">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Stile Header Sidebar</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Colore Sfondo</label>
                                                    <div className="flex items-center gap-3">
                                                        <input type="color" value={appearance.sidebar_open_bg_color} onChange={e => setAppearance({...appearance, sidebar_open_bg_color: e.target.value})} className="h-10 w-full p-1 border rounded-lg cursor-pointer" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Allineamento</label>
                                                    <select value={appearance.sidebar_open_horizontal_align} onChange={e => setAppearance({...appearance, sidebar_open_horizontal_align: e.target.value})} className="w-full p-2.5 border rounded-lg bg-white text-xs font-bold">
                                                        <option value="flex-start">Sinistra</option>
                                                        <option value="center">Centro</option>
                                                        <option value="flex-end">Destra</option>
                                                        <option value="space-between">Distanziati</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-6">
                                        <div className="flex-1 border-2 border-gray-200 rounded-3xl p-8 bg-slate-100 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                                            <span className="absolute top-4 left-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Anteprima Sidebar Aperta</span>
                                            
                                            <div 
                                                className="w-full max-w-[240px] min-h-[100px] rounded-xl shadow-2xl flex p-4 transition-all duration-300"
                                                style={{ 
                                                    backgroundColor: appearance.sidebar_open_bg_color,
                                                    justifyContent: appearance.sidebar_open_horizontal_align,
                                                    alignItems: appearance.sidebar_open_vertical_align,
                                                    gap: '12px'
                                                }}
                                            >
                                                <h1 className="text-3xl font-black text-[#ffab00] italic">MWS</h1>
                                                {appearance.platform_logo && (
                                                    <img 
                                                        src={appearance.platform_logo} 
                                                        alt="Logo" 
                                                        style={{
                                                            width: `${appearance.logo_sidebar_open_width}px`,
                                                            height: `${appearance.logo_sidebar_open_height}px`,
                                                            objectFit: 'contain'
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                                                 <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase mb-2">Sidebar Chiusa</span>
                                                    <div 
                                                        className="w-16 h-16 rounded-xl shadow-lg flex items-center justify-center"
                                                        style={{ backgroundColor: '#1a237e' }}
                                                    >
                                                        {appearance.platform_logo ? (
                                                            <img 
                                                                src={appearance.platform_logo} 
                                                                alt="Logo" 
                                                                style={{
                                                                    width: `${appearance.logo_sidebar_closed_width}px`,
                                                                    height: `${appearance.logo_sidebar_closed_height}px`,
                                                                    objectFit: 'contain'
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-white font-black text-xl italic">MWS</span>
                                                        )}
                                                    </div>
                                                 </div>
                                                 <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase mb-2">Schermata Login</span>
                                                    <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center border border-gray-200">
                                                         {appearance.platform_logo ? (
                                                            <img 
                                                                src={appearance.platform_logo} 
                                                                alt="Logo" 
                                                                style={{
                                                                    width: `${parseInt(appearance.logo_login_width)/2}px`, 
                                                                    height: `${parseInt(appearance.logo_login_height)/2}px`,
                                                                    objectFit: 'contain'
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-primary font-black text-2xl italic">MWS</span>
                                                        )}
                                                    </div>
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="pt-6 border-t flex justify-end">
                                <button onClick={handleSaveAppearance} className="bg-primary text-white font-black py-4 px-12 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-sm">
                                    APPLICA TUTTI I CAMBIAMENTI
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'logistica' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <section>
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h3 className="text-lg font-black text-primary uppercase italic tracking-wider">Webhooks & Automazioni</h3>
                                    <button 
                                        onClick={handleTestWebhook}
                                        disabled={isTestingWebhook}
                                        className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-xs font-black border border-indigo-200 hover:bg-indigo-100 transition-all disabled:opacity-50"
                                    >
                                        <PaperAirplaneIcon className="w-3 h-3" />
                                        {isTestingWebhook ? 'INVIO IN CORSO...' : 'INVIA TEST WEBHOOK'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <label className="block text-xs font-black text-primary uppercase tracking-widest mb-1">Webhook Nuovi Lead (Global)</label>
                                        <input type="text" value={globalWebhookUrl} onChange={e => setGlobalWebhookUrl(e.target.value)} placeholder="https://hook.eu1.make.com/..." className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none border-primary/20 font-bold" />
                                        <p className="mt-1 text-[10px] text-primary/60 font-bold uppercase">Invia una notifica per OGNI nuovo ordine "In attesa" che entra nel sistema (da API o Form).</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Make Webhook (Ordini Confermati)</label>
                                        <input type="text" value={makeWebhookUrl} onChange={e => setMakeWebhookUrl(e.target.value)} placeholder="https://hook.eu1.make.com/..." className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none" />
                                        <p className="mt-1 text-[9px] text-gray-500 uppercase font-bold">Invia dati ordini solo quando passano a "Confermato".</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Make Webhook (Staff Chat)</label>
                                        <input type="text" value={staffChatWebhookUrl} onChange={e => setStaffChatWebhookUrl(e.target.value)} placeholder="https://hook.eu1.make.com/..." className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none border-indigo-200" />
                                        <p className="mt-1 text-[9px] text-gray-500 uppercase font-bold">Invia messaggi della chat interna per notifiche push esterne.</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Webhook Registrazione (Mail Benvenuto)</label>
                                        <input type="text" value={registrationWebhookUrl} onChange={e => setRegistrationWebhookUrl(e.target.value)} placeholder="https://hook.eu1.make.com/..." className="w-full p-3 border rounded-xl bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none border-green-200" />
                                        <p className="mt-1 text-[9px] text-gray-500 uppercase font-bold">Invia i dati del partner appena registrato.</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-primary mb-4 border-b pb-2 uppercase italic tracking-wider">Configurazione Corrieri</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Spediamo.it API Key</label>
                                        <input type="password" value={spediamoKey} onChange={e => setSpediamoKey(e.target.value)} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PaccoFacile.it API Key</label>
                                        <input type="password" value={paccofacileKey} onChange={e => setPaccofacileKey(e.target.value)} className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none" />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-black text-primary mb-4 border-b pb-2 uppercase italic tracking-wider">Mittente Spedizioni</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ragione Sociale</label>
                                        <input type="text" value={sender.name} onChange={e => setSender({...sender, name: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Mittente</label>
                                        <input type="email" value={sender.email} onChange={e => setSender({...sender, email: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50" />
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Indirizzo (Via/Piazza)</label>
                                        <input type="text" value={sender.address} onChange={e => setSender({...sender, address: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Numero Civico</label>
                                        <input type="text" value={sender.houseNumber} onChange={e => setSender({...sender, houseNumber: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Città</label>
                                        <input type="text" value={sender.city} onChange={e => setSender({...sender, city: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CAP</label>
                                            <input type="text" maxLength={5} value={sender.zip} onChange={e => setSender({...sender, zip: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prov</label>
                                            <input type="text" maxLength={2} value={sender.province} onChange={e => setSender({...sender, province: e.target.value.toUpperCase()})} className="w-full p-3 border rounded-xl bg-gray-50" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Telefono Mittente</label>
                                        <input type="text" value={sender.phone} onChange={e => setSender({...sender, phone: e.target.value})} className="w-full p-3 border rounded-xl bg-gray-50" />
                                    </div>
                                </div>
                            </section>

                            <section className="p-6 border-2 border-primary/20 rounded-2xl bg-slate-50">
                                <h3 className="text-lg font-black text-primary mb-4 flex items-center gap-2 uppercase italic tracking-wider">
                                    <WalletIcon className="w-5 h-5" />
                                    Coordinate per Rimborso Contrassegno
                                </h3>
                                <p className="text-xs text-gray-500 mb-6 font-medium">Dati per accredito automatico incassi dei contrassegni.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Intestatario Conto (Header)</label>
                                        <input type="text" value={bank.header} onChange={e => setBank({...bank, header: e.target.value})} placeholder="Es: Moise Costel Daniel" className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none font-bold" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">IBAN</label>
                                        <input type="text" value={bank.iban} onChange={e => setBank({...bank, iban: e.target.value.replace(/\s/g, '').toUpperCase()})} placeholder="IT..." className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nome Banca</label>
                                        <input type="text" value={bank.bankName} onChange={e => setBank({...bank, bankName: e.target.value})} placeholder="Es: Poste Italiane" className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">BIC / SWIFT</label>
                                        <input type="text" value={bank.bic} onChange={e => setBank({...bank, bic: e.target.value.toUpperCase()})} placeholder="Es: BPPIITRRXXX" className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none font-mono" />
                                    </div>
                                </div>
                            </section>

                            <div className="pt-6 border-t flex justify-end">
                                <button onClick={handleSaveLogistics} className="bg-primary text-white font-black py-4 px-12 rounded-xl shadow-lg hover:scale-105 transition-all">
                                    SALVA CONFIGURAZIONE WEBHOOK E LOGISTICA
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'calcoli' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
                                <h4 className="text-blue-800 font-bold mb-2 flex items-center gap-2">
                                    <CalculatorIcon className="w-5 h-5" /> Logica di Calcolo Attiva
                                </h4>
                                <p className="text-blue-700 text-sm leading-relaxed">
                                    La piattaforma applica automaticamente le seguenti regole per garantire trasparenza tra performance e bilancio reale.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-6 border rounded-2xl bg-white shadow-sm">
                                    <h4 className="font-black text-gray-800 uppercase italic mb-4 flex items-center gap-2">
                                        <ChartBarIcon className="w-5 h-5 text-indigo-500" /> Performance & Dashboard
                                    </h4>
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 font-bold">✓</span>
                                            <span>Mostra il <strong>Maturato Totale</strong> (Somma commissioni ordini validi).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 font-bold">✓</span>
                                            <span>Mostra il volume degli ordini nel tempo.</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="p-6 border rounded-2xl bg-white shadow-sm">
                                    <h4 className="font-black text-gray-800 uppercase italic mb-4 flex items-center gap-2">
                                        <CalculatorIcon className="w-5 h-5 text-emerald-500" /> Header & Bilancio
                                    </h4>
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-500 font-bold">✓</span>
                                            <span>Mostra il <strong>Saldo Reale Prelevabile</strong>.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-red-500 font-bold">✕</span>
                                            <span><strong>Sottrae</strong> tutti i Payout approvati o in attesa.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
