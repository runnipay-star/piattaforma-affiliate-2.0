
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../database';
import { FormSession, Sale, User, UserRole } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { DevicePhoneMobileIcon } from './icons/DevicePhoneMobileIcon';
import { ComputerDesktopIcon } from './icons/ComputerDesktopIcon';
import { ShoppingCartIcon } from './icons/icons/ShoppingCartIcon';
import { ShoppingBagIcon } from './icons/icons/ShoppingBagIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { EyeSlashIcon } from './icons/EyeSlashIcon';
import { EyeIcon } from './icons/EyeIcon';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

// Coordinate geografiche [Lon, Lat]
const COUNTRY_GEO: Record<string, [number, number]> = {
    'italy': [12.5674, 41.8719],
    'italia': [12.5674, 41.8719],
    'united states': [-95.7129, 37.0902],
    'usa': [-95.7129, 37.0902],
    'united kingdom': [-3.4360, 55.3781],
    'uk': [-3.4360, 55.3781],
    'france': [2.2137, 46.2276],
    'germany': [10.4515, 51.1657],
    'spain': [-3.7492, 40.4637],
    'netherlands': [5.2913, 52.1326],
    'switzerland': [8.2275, 46.8182],
    'brazil': [-51.9253, -14.2350],
    'india': [78.9629, 20.5937],
    'china': [104.1954, 35.8617],
    'australia': [133.7751, -25.2744],
    'canada': [-106.3468, 56.1304],
    'russia': [105.3188, 61.5240],
    'japan': [138.2529, 36.2048],
    'portugal': [-8.2245, 39.3999],
    'belgium': [4.4699, 50.5039],
    'austria': [14.5501, 47.5162],
    'romania': [24.9668, 45.9432],
    'greece': [21.8243, 39.0742],
};

const getStableJitter = (id: string, amount: number = 1.5): [number, number] => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const lonOffset = ((hash & 0xFF) / 255 - 0.5) * amount;
    const latOffset = (((hash >> 8) & 0xFF) / 255 - 0.5) * amount;
    return [lonOffset, latOffset];
};

const Globe3D: React.FC<{ sessions: FormSession[], activeOrders: Sale[], isFullScreen?: boolean, theme?: 'dark' | 'light' }> = ({ sessions, activeOrders, isFullScreen, theme = 'dark' }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [worldData, setWorldData] = useState<any>(null);
    
    const sessionsRef = useRef(sessions);
    const ordersRef = useRef(activeOrders);

    useEffect(() => {
        sessionsRef.current = sessions;
        ordersRef.current = activeOrders;
    }, [sessions, activeOrders]);

    useEffect(() => {
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
            .then(res => res.json())
            .then(data => {
                setWorldData(topojson.feature(data, data.objects.countries));
            });
    }, []);

    const getCoordsForCountry = (countryName?: string): [number, number] | null => {
        if (!countryName) return null;
        const normalized = countryName.toLowerCase().trim();
        return COUNTRY_GEO[normalized] || null;
    };

    useEffect(() => {
        if (!worldData || !svgRef.current) return;

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        const baseScale = isFullScreen 
            ? Math.min(width, height) / 1.4 
            : Math.min(width, height) / 1.7;

        const projection = d3.geoOrthographic()
            .scale(baseScale)
            .center([0, 0])
            .rotate([0, -20])
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);
        const svg = d3.select(svgRef.current);
        
        svg.selectAll("*").remove();

        const oceanColor = theme === 'dark' ? '#020617' : '#f8fafc';
        const countryColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
        const strokeColor = theme === 'dark' ? '#334155' : '#cbd5e1';
        const graticuleColor = theme === 'dark' ? '#ffffff' : '#000000';

        const ocean = svg.append("circle")
            .attr("cx", width / 2)
            .attr("cy", height / 2)
            .attr("r", projection.scale())
            .attr("fill", oceanColor)
            .attr("stroke", strokeColor)
            .attr("stroke-width", "0.5");

        const countries = svg.append("g")
            .selectAll("path")
            .data(worldData.features)
            .enter()
            .append("path")
            .attr("d", path as any)
            .attr("fill", countryColor)
            .attr("stroke", strokeColor)
            .attr("stroke-width", "0.3")
            .attr("class", "country");

        const graticule = svg.append("path")
            .datum(d3.geoGraticule())
            .attr("class", "graticule")
            .attr("d", path as any)
            .attr("fill", "none")
            .attr("stroke", graticuleColor)
            .attr("stroke-width", "0.1")
            .attr("opacity", "0.1");

        const markersGroup = svg.append("g");

        const drag = d3.drag<SVGSVGElement, unknown>()
            .on("drag", (event) => {
                const isShift = event.sourceEvent.shiftKey;
                const isRightClick = event.sourceEvent.button === 2;

                if (isShift || isRightClick) {
                    const translate = projection.translate();
                    projection.translate([translate[0] + event.dx, translate[1] + event.dy]);
                    ocean.attr("cx", projection.translate()[0]).attr("cy", projection.translate()[1]);
                } else {
                    const rotate = projection.rotate();
                    const k = 75 / projection.scale();
                    projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
                }
            });

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 10])
            .on("zoom", (event) => {
                projection.scale(baseScale * event.transform.k);
                ocean.attr("r", projection.scale());
            });

        svg.on("contextmenu", (e) => e.preventDefault());
        svg.call(drag as any);
        svg.call(zoom as any);

        const timer = d3.timer(() => {
            countries.attr("d", path as any);
            graticule.attr("d", path as any);
            const rotate = projection.rotate();

            const sessionMarkers = markersGroup.selectAll(".session-marker")
                .data(sessionsRef.current, (d: any) => d.session_id);

            sessionMarkers.enter()
                .append("circle")
                .attr("class", "session-marker")
                .attr("r", isFullScreen ? 6 : 4)
                .attr("fill", "#60a5fa")
                .attr("stroke", theme === 'dark' ? "#ffffff" : "#000000")
                .attr("stroke-width", 1)
                .style("filter", "drop-shadow(0 0 6px rgba(96,165,250,0.8))")
                .merge(sessionMarkers as any)
                .each(function(d: any) {
                    const baseCoords = getCoordsForCountry(d.ip_country);
                    if (!baseCoords) { d3.select(this).attr("opacity", 0); return; }
                    const [jLon, jLat] = getStableJitter(d.session_id, 2.5);
                    const finalCoords: [number, number] = [baseCoords[0] + jLon, baseCoords[1] + jLat];
                    const visible = d3.geoDistance(finalCoords, [-rotate[0], -rotate[1]]) < Math.PI / 2;
                    const projected = projection(finalCoords);
                    d3.select(this)
                        .attr("cx", projected ? projected[0] : -100)
                        .attr("cy", projected ? projected[1] : -100)
                        .attr("opacity", visible ? 1 : 0);
                });

            sessionMarkers.exit().remove();

            const orderPulses = markersGroup.selectAll(".order-pulse")
                .data(ordersRef.current, (d: any) => d.id);

            orderPulses.enter()
                .append("circle")
                .attr("class", "order-pulse")
                .attr("fill", "none")
                .attr("stroke", "#22c55e")
                .attr("stroke-width", 2.5)
                .merge(orderPulses as any)
                .each(function(d: any) {
                    const baseCoords = getCoordsForCountry(d.ip_country || 'Italy');
                    if (!baseCoords) { d3.select(this).attr("opacity", 0); return; }
                    const [jLon, jLat] = getStableJitter(d.id, 2.5);
                    const finalCoords: [number, number] = [baseCoords[0] + jLon, baseCoords[1] + jLat];
                    const visible = d3.geoDistance(finalCoords, [-rotate[0], -rotate[1]]) < Math.PI / 2;
                    const projected = projection(finalCoords);
                    const age = (Date.now() - new Date(d.saleDate).getTime()) / 5000;
                    const baseR = isFullScreen ? 12 : 8;
                    const r = baseR + (age * (isFullScreen ? 100 : 60));
                    const opacity = visible ? Math.max(0, 1 - age) : 0;
                    d3.select(this)
                        .attr("cx", projected ? projected[0] : -100)
                        .attr("cy", projected ? projected[1] : -100)
                        .attr("r", Math.max(0, r))
                        .attr("opacity", opacity);
                });

            orderPulses.exit().remove();
        });

        return () => timer.stop();
    }, [worldData, isFullScreen, theme]);

    return (
        <div className={`w-full h-full flex items-center justify-center rounded-3xl overflow-hidden relative shadow-2xl transition-all duration-700 ${theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-slate-100 border-slate-200'} border`}>
            <svg ref={svgRef} className="w-full h-full cursor-move" />
            <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_12px_#60a5fa]"></div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>Traffic Live</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-ping shadow-[0_0_12px_#22c55e]"></div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>Live Sales</span>
                </div>
            </div>
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 backdrop-blur-md px-4 py-2 rounded-full border pointer-events-none text-center ${theme === 'dark' ? 'bg-slate-900/60 border-white/10' : 'bg-white/60 border-slate-200 shadow-sm'}`}>
                <p className={`text-[8px] font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>Trascina per esplorare</p>
            </div>
        </div>
    );
};

const LiveTrafficMonitor: React.FC<{ user: User }> = ({ user }) => {
    const [sessions, setSessions] = useState<FormSession[]>([]);
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [activeOrderPulses, setActiveOrderPulses] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [privacyMode, setPrivacyMode] = useState(user.role === UserRole.AFFILIATE);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    const isAffiliate = user.role === UserRole.AFFILIATE;

    useEffect(() => {
        fetchInitialData();
        const sessionSub = supabase.channel('live-traffic-sessions').on('postgres_changes', { event: '*', table: 'form_sessions' }, (payload) => {
            const newSession = payload.new as FormSession;
            if (isAffiliate && newSession.affiliate_id !== user.id && newSession.affiliate_id !== user.short_id) return;
            fetchActiveSessions();
        }).subscribe();

        const salesSub = supabase.channel('live-traffic-sales').on('postgres_changes', { event: 'INSERT', table: 'sales' }, (payload) => {
            const newSale = payload.new as any;
            if (isAffiliate && newSale.affiliate_id !== user.id && newSale.affiliate_id !== user.short_id) return;
            const mappedSale: Sale = {
                id: newSale.id, productId: newSale.product_id, productName: newSale.product_name, affiliateId: newSale.affiliate_id,
                affiliateName: newSale.affiliate_name, saleAmount: Number(newSale.sale_amount), commissionAmount: Number(newSale.commission_amount),
                saleDate: newSale.sale_date, customerEmail: newSale.customer_email || '', customerName: newSale.customer_name, subId: newSale.sub_id || null,
                status: newSale.status, ip_country: newSale.ip_country, currency: newSale.currency
            };
            handleNewOrderEvent(mappedSale);
        }).subscribe();

        const interval = setInterval(fetchActiveSessions, 15000);
        return () => {
            sessionSub.unsubscribe();
            salesSub.unsubscribe();
            clearInterval(interval);
        };
    }, [user.id, user.short_id, isAffiliate]);

    const fetchInitialData = async () => {
        await Promise.all([fetchActiveSessions(), fetchRecentSales()]);
        setLoading(false);
    };

    const fetchActiveSessions = async () => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
        let query = supabase.from('form_sessions').select('*').gt('updated_at', fiveMinutesAgo);
        if (isAffiliate) query = query.or(`affiliate_id.eq.${user.id},affiliate_id.eq.${user.short_id}`);
        const { data } = await query.order('updated_at', { ascending: false });
        if (data) setSessions(data);
    };

    const fetchRecentSales = async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60000).toISOString();
        let query = supabase.from('sales').select('*').gt('sale_date', oneHourAgo);
        if (isAffiliate) query = query.or(`affiliate_id.eq.${user.id},affiliate_id.eq.${user.short_id}`);
        const { data } = await query.order('sale_date', { ascending: false });
        if (data) setRecentSales(data.map(s => ({
            id: s.id, productId: s.product_id, productName: s.product_name, affiliateId: s.affiliate_id, affiliateName: s.affiliate_name,
            saleAmount: Number(s.sale_amount), commissionAmount: Number(s.commission_amount), saleDate: s.sale_date, customerEmail: s.customer_email || '',
            customerName: s.customer_name, subId: s.sub_id || null, status: s.status, ip_country: s.ip_country, currency: s.currency
        })));
    };

    const handleNewOrderEvent = (sale: Sale) => {
        setActiveOrderPulses(prev => [...prev, sale]);
        setRecentSales(prev => [sale, ...prev]);
        setTimeout(() => setActiveOrderPulses(prev => prev.filter(p => p.id !== sale.id)), 5000);
    };

    const maskString = (str: string) => {
        if (!str || !privacyMode) return str || '---';
        if (str.length <= 3) return str[0] + '***';
        return str[0] + '***' + str[str.length - 1];
    };

    const getDeviceIcon = (ua: string) => {
        if (/Mobi|Android|iPhone/i.test(ua)) return <DevicePhoneMobileIcon className="w-4 h-4 text-blue-500" />;
        return <ComputerDesktopIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />;
    };

    const getTimeSince = (date: string) => {
        const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (diff < 60) return `${diff}s`;
        return `${Math.floor(diff / 60)}m`;
    };

    return (
        <div className={`${isFullScreen ? `fixed inset-0 z-[100] p-8 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}` : 'p-8 h-full flex flex-col'} animate-in fade-in duration-700 transition-colors duration-500`}>
            {/* HEADER CONTROLLI - UNA SOLA RIGA */}
            <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
                <div className="shrink-0 text-center lg:text-left">
                    <h2 className={`text-3xl font-black uppercase italic flex items-center gap-3 tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        <div className={`w-4 h-4 bg-red-600 rounded-full ${!isFullScreen && 'animate-pulse'}`}></div>
                        MWS Live Traffic
                    </h2>
                </div>
                
                <div className={`flex items-center gap-3 overflow-x-auto no-scrollbar shrink-0 p-1.5 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <button 
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shrink-0 ${theme === 'dark' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {theme === 'dark' ? 'Mod. Chiara' : 'Mod. Scura'}
                    </button>

                    <button 
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shrink-0 ${isFullScreen ? 'bg-red-600 text-white' : 'bg-primary text-white hover:bg-primary-dark'}`}
                    >
                        {isFullScreen ? (
                            <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" /></svg> ESCI</>
                        ) : (
                            <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg> FULL SCREEN</>
                        )}
                    </button>

                    {!isAffiliate && (
                        <button 
                            onClick={() => setPrivacyMode(!privacyMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shrink-0 ${privacyMode ? 'bg-indigo-600 text-white' : (theme === 'dark' ? 'bg-white text-slate-500 hover:bg-gray-50' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}`}
                        >
                            {privacyMode ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                            PRIVACY {privacyMode ? 'ON' : 'OFF'}
                        </button>
                    )}

                    <div className={`px-4 py-2 rounded-xl shadow-lg border flex items-center gap-3 shrink-0 ${theme === 'dark' ? 'bg-white border-white/10' : 'bg-white border-slate-100'}`}>
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <ShoppingCartIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[8px] font-black text-gray-400 uppercase leading-none block">SESSIONI</span>
                            <p className="text-sm font-black text-primary leading-none mt-0.5">{sessions.length}</p>
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl shadow-lg border flex items-center gap-3 shrink-0 ${theme === 'dark' ? 'bg-white border-white/10' : 'bg-white border-slate-100'}`}>
                        <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
                            <ShoppingBagIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-[8px] font-black text-gray-400 uppercase leading-none block">ORDINI 1H</span>
                            <p className="text-sm font-black text-green-600 leading-none mt-0.5">{recentSales.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AREA PRINCIPALE - SPLIT SCREEN */}
            <div className={`flex flex-col lg:flex-row gap-6 flex-grow overflow-hidden`}>
                {/* SINISTRA: LISTA UTENTI */}
                <div className="lg:w-1/4 w-full flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className={`text-[10px] font-black uppercase tracking-widest italic ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>Live Visitors</h3>
                        <span className={`text-[8px] font-bold uppercase ${theme === 'dark' ? 'text-primary/50' : 'text-primary/70'}`}>Update: 15s</span>
                    </div>
                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-3 space-y-3">
                        {sessions.length > 0 ? (
                            sessions.map(session => (
                                <div key={session.session_id} className={`rounded-2xl p-4 shadow-sm border transition-all group border-b-4 ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-primary/20 border-b-primary/10' : 'bg-white border-slate-200 hover:border-primary/30 border-b-primary/20'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border group-hover:bg-primary group-hover:text-white transition-all ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                                {getDeviceIcon(session.user_agent || '')}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-[8px] font-black uppercase tracking-tight ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>Product</p>
                                                <p className={`text-[11px] font-black truncate max-w-[120px] ${theme === 'dark' ? 'text-gray-200' : 'text-slate-800'}`}>{maskString(session.product_name)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-green-600 animate-pulse uppercase">Live</span>
                                            <p className={`text-[8px] font-bold mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-slate-400'}`}>{getTimeSince(session.updated_at)} fa</p>
                                        </div>
                                    </div>
                                    <div className={`pt-2 border-t flex items-center justify-between ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                                        <div className="flex items-center gap-2">
                                            {session.ip_flag && <img src={session.ip_flag} className="w-3.5 h-2.5 rounded-sm shadow-sm" alt="Flag" />}
                                            <span className={`text-[10px] font-black truncate max-w-[100px] ${theme === 'dark' ? 'text-gray-400' : 'text-slate-600'}`}>{session.ip_city || 'City'}, {session.ip_country || 'Country'}</span>
                                        </div>
                                        <MapPinIcon className="w-3 h-3 text-red-400 opacity-50 group-hover:opacity-100" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={`h-full flex flex-col items-center justify-center text-center p-8 rounded-3xl border-2 border-dashed ${theme === 'dark' ? 'bg-white/5 border-white/10 text-gray-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                <p className="font-black text-[10px] uppercase tracking-widest">Waiting for traffic...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* DESTRA: MAPPAMONDO CENTRALE E GRANDE */}
                <div className="lg:w-3/4 w-full h-[500px] lg:h-full relative">
                    <Globe3D sessions={sessions} activeOrders={activeOrderPulses} isFullScreen={isFullScreen} theme={theme} />
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme === 'dark' ? '#1e293b' : '#cbd5e1'}; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            `}</style>
        </div>
    );
};

export default LiveTrafficMonitor;
