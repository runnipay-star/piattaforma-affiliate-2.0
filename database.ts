
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Product, Affiliate, Manager, LogisticsUser, CustomerCareUser, Sale, Notification, Ticket, TicketReply, Transaction, User, UserRole, TicketStatus, Admin, PlatformSettings, StockExpense, SaleStatus, StaffMessage } from './types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://radhkbocafjpglgmbpyy.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZGhrYm9jYWZqcGdsZ21icHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NzcwNDcsImV4cCI6MjA4MjE1MzA0N30.BtUupmNUJ1CA8X8FGRSyh6VgNXLSYM-WrajbsUED5FM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'mws-auth-session-v4',
    storage: window.localStorage
  }
});

// Generatore UUID universale per duplicazione e nuovi inserimenti
export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const generateShortId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const uploadFile = async (path: string, file: File) => {
    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(path, file, {
            upsert: true,
            cacheControl: '3600'
        });
    
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);
    
    return publicUrl;
};

export const fetchStaffMessages = async (saleId: string): Promise<StaffMessage[]> => {
    try {
        const { data, error } = await supabase
            .from('staff_chat')
            .select('*')
            .eq('sale_id', saleId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return (data as any[]).map(m => ({
            ...m,
            read_by: m.read_by || []
        })) as StaffMessage[];
    } catch (e) {
        console.error("Fetch staff messages error:", e);
        return [];
    }
};

export const fetchGloballyUsedUnlockOrderIds = async (): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('staff_chat')
            .select('message')
            .ilike('message', '%MESSAGGIO SVINCOLO URGENTE%');
        
        if (error) throw error;
        
        const ids: string[] = [];
        data?.forEach((m: any) => {
            const parts = m.message.split("all'ordine ");
            if (parts.length > 1) {
                const match = parts[1].match(/S-\d+-[A-Z0-9]+/);
                if (match) ids.push(match[0]);
            }
        });
        return [...new Set(ids)];
    } catch (e) {
        console.error("Fetch global unlock IDs error:", e);
        return [];
    }
};

export const sendStaffMessage = async (msg: Omit<StaffMessage, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('staff_chat')
        .insert({
            ...msg,
            read_by: [msg.sender_id]
        })
        .select()
        .single();
    
    if (error) throw error;
    return data as StaffMessage;
};

export const markStaffMessagesAsRead = async (saleId: string, userId: string) => {
    try {
        const { data } = await supabase
            .from('staff_chat')
            .select('id, read_by')
            .eq('sale_id', saleId);
        
        if (data) {
            for (const m of data) {
                const readBy = new Set(m.read_by || []);
                if (!readBy.has(userId)) {
                    readBy.add(userId);
                    await supabase
                        .from('staff_chat')
                        .update({ read_by: Array.from(readBy) })
                        .eq('id', m.id);
                }
            }
        }
    } catch (e) {
        console.warn("Could not mark messages as read.", e);
    }
};

export const checkStorageConnectivity = async () => {
    try {
        const { data, error } = await supabase.storage.getBucket('product-images');
        if (error) return { success: false, error: error.message, isRlsError: true };
        return { success: true, name: data.name, public: data.public };
    } catch (e: any) {
        return { success: false, error: e.message, isRlsError: true };
    }
};

const mapStockExpenseFromDB = (e: any): StockExpense => ({
    id: e.id,
    productId: e.product_id,
    quantity: Number(e.quantity || 0),
    unitCost: Number(e.unit_cost || 0),
    totalCost: Number(e.total_cost || 0),
    payer: e.payer,
    notes: e.notes,
    date: e.date,
    createdAt: e.created_at
});

export const fetchAllInitialData = async () => {
    const tables = ['products', 'profiles', 'sales', 'notifications', 'tickets', 'transactions', 'stock_expenses'];
    const results = await Promise.allSettled(tables.map(t => {
        if (t === 'tickets') return supabase.from(t).select('*, ticket_replies(*)');
        return supabase.from(t).select('*');
    }));

    const getData = (index: number) => {
        const res = results[index];
        if (res.status === 'fulfilled') {
            return (res.value as any).data || [];
        }
        return [];
    };

    return { 
        products: (getData(0) as any[]).map(mapProductFromDB), 
        profilesList: (getData(1) as any[]).map(mapProfileFromDB), 
        sales: (getData(2) as any[]).map(mapSaleFromDB), 
        notifications: (getData(3) as any[]).map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            createdAt: n.created_at || n.createdAt,
            targetRoles: n.target_roles || [],
            readBy: n.read_by || [],
            eventType: n.event_type,
            linkTo: n.link_to,
            targetUserId: n.target_user_id 
        })), 
        tickets: (getData(4) as any[]).map((t: any) => ({ ...t, replies: t.ticket_replies || [] })), 
        transactions: (getData(5) as any[]).map(t => ({
            id: t.id,
            userId: t.user_id,
            type: t.type,
            amount: Number(t.amount || 0),
            status: t.status,
            createdAt: t.created_at,
            notes: t.notes,
            fromUserId: t.from_user_id,
            from_user_name: t.from_user_name,
            toUserId: t.to_user_id,
            to_user_name: t.to_user_name,
            paymentMethod: t.payment_method,
            paymentDetails: t.payment_details,
            currency: t.currency
        })), 
        stockExpenses: (getData(6) as any[]).map(mapStockExpenseFromDB)
    };
};

export const getSettings = async (): Promise<PlatformSettings> => {
    try {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;
        const settings: PlatformSettings = {};
        data?.forEach((s: any) => {
            if (s.key === 'blocked_ips') {
                try { settings.blocked_ips = JSON.parse(s.value); } catch (e) { settings.blocked_ips = []; }
            } else { (settings as any)[s.key] = s.value; }
        });
        return settings;
    } catch (e) { 
        console.warn("Settings fetch failed.");
        return {}; 
    }
};

export const updateSetting = (key: string, value: string) => supabase.from('settings').upsert({ key, value });

const mapProfileFromDB = (p: any): User => ({
    id: p.id,
    short_id: p.short_id,
    name: p.name || '',
    email: p.email || '',
    role: (p.role as UserRole) || UserRole.AFFILIATE,
    status: p.status || 'pending',
    isBlocked: p.is_blocked ?? false,
    currentBalance: Number(p.currentBalance || p["currentBalance"] || 0),
    privacyPolicyUrl: p.privacy_policy_url || ''
} as any);

const mapProductFromDB = (p: any): Product => ({
    id: p.id || '',
    name: p.name || 'Prodotto',
    description: p.description || '',
    price: Number(p.price || 0),
    commissionValue: Number(p.commission_value || 0),
    imageUrl: p.image_url || 'https://via.placeholder.com/400',
    galleryImageUrls: p.gallery_image_urls || [],
    niche: p.niche || 'Generale',
    refNumber: p.ref_number || 'REF',
    isActive: p.is_active ?? true,
    allowedAffiliateIds: p.allowed_affiliate_ids || null,
    costOfGoods: Number(p.cost_of_goods || 0),
    shippingCost: Number(p.shipping_cost || 0),
    shippingCharge: Number(p.shipping_charge || 0),
    shippingCostCard: Number(p.shipping_cost_card || 0),
    shippingChargeCard: Number(p.shipping_charge_card || 0),
    priceCard: Number(p.price_card || 0),
    commissionValueCard: Number(p.commission_value_card || 0),
    fulfillmentCost: Number(p.fulfillment_cost || 0),
    platformFee: Number(p.platform_fee || 0),
    customerCareCommission: Number(p.customer_care_commission || 0),
    fulfillmentCostCard: Number(p.fulfillment_cost_card || 0),
    platformFeeCard: Number(p.platform_fee_card || 0),
    customerCareCommissionCard: Number(p.customer_care_commission_card || 0),
    freeShipping: p.free_shipping ?? true,
    approvalTolerance: Number(p.approval_tolerance || 0),
    approvalFrequencyDays: Number(p.approval_frequency_days || 7),
    affiliateCommissionOverrides: p.affiliate_commission_overrides || {},
    stockQuantity: Number(p.stock_quantity || 0),
    variants: p.variants || [],
    createdAt: p.created_at || new Date().toISOString(),
    landingPages: p.landing_pages || [],
    creatives: p.creatives || [],
    variant_bundle_label: p.variant_bundle_label || 'Scegli la variante (Prodotto {n})',
    bundleOptions: p.bundle_options || [],
    weight: Number(p.weight || 0.5),
    height: Number(p.height || 10),
    width: Number(p.width || 10),
    depth: Number(p.depth || 10),
    shipmentType: Number(p.shipment_type || 1),
    package_content_type: p.package_content_type || 'GOODS',
    paccofacile_default_size: p.paccofacile_default_size || '',
    stockVisibilityRoles: p.stock_visibility_roles || null,
    currency: p.currency || 'EUR'
});

const mapSaleFromDB = (s: any): Sale => ({
    id: s.id,
    productId: s.product_id,
    productName: s.product_name,
    affiliateId: String(s.affiliate_id || '').trim(),
    affiliateName: s.affiliate_name,
    saleAmount: Number(s.sale_amount || 0),
    commissionAmount: Number(s.commission_amount || 0),
    saleDate: s.sale_date,
    customerEmail: s.customer_email || '',
    customerName: s.customer_name,
    customerPhone: s.customer_phone,
    customer_street_address: s.customer_street_address,
    customer_house_number: s.customer_house_number,
    customer_city: s.customer_city,
    customer_province: s.customer_province,
    customer_zip: s.customer_zip,
    subId: s.sub_id,
    status: s.status,
    trackingCode: s.tracking_code,
    quantity: s.quantity,
    bundleId: s.bundle_id,
    variantId: s.variant_id,
    variantName: s.variant_name,
    selectedVariants: s.selected_variants,
    notes: s.notes,
    statusUpdatedAt: s.status_updated_at,
    lastContactedBy: s.last_contacted_by,
    lastContactedByName: s.last_contacted_by_name,
    user_agent: s.user_agent,
    ip_address: s.ip_address,
    contactHistory: s.contact_history || [],
    isBonus: s.is_bonus,
    webhookUrl: s.webhook_url,
    webhookStatus: s.webhook_status,
    paymentMethod: s.payment_method || 'cod',
    paymentStatus: s.payment_status || 'pending',
    mollieId: s.mollie_id,
    currency: s.currency || 'EUR'
});

export const getCurrentProfile = async (userId: string) => {
    try {
        let { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return mapProfileFromDB(data);
    } catch (e: any) { 
        console.error("Profile fetch error:", e.message);
        return null; 
    }
};

const PRODUCT_DB_FIELDS = [
    'name', 'description', 'price', 'commissionValue', 'imageUrl', 'galleryImageUrls', 
    'niche', 'refNumber', 'isActive', 'allowedAffiliateIds', 'costOfGoods', 
    'shippingCost', 'shippingCharge', 'shippingCostCard', 'shippingChargeCard',
    'priceCard', 'commissionValueCard',
    'fulfillmentCost', 'platformFee', 'customerCareCommission',
    'fulfillmentCostCard', 'platformFeeCard', 'customerCareCommissionCard',
    'freeShipping', 'approvalTolerance', 'approvalFrequencyDays', 
    'affiliateCommissionOverrides', 'stockQuantity', 'variants', 'landingPages', 
    'creatives', 'variant_bundle_label', 'bundleOptions', 'weight', 'height', 
    'width', 'depth', 'shipmentType', 'package_content_type', 'paccofacile_default_size', 
    'stockVisibilityRoles', 'currency'
];

export const updateProduct = async (id: string, updates: Partial<Product>) => {
    const dbUpdates: any = {};
    PRODUCT_DB_FIELDS.forEach(f => {
        const dbF = f.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if ((updates as any)[f] !== undefined) dbUpdates[dbF] = (updates as any)[f];
    });
    
    const { error } = await supabase.from('products').update(dbUpdates).eq('id', id);
    if (error) throw error;
};

export const addProduct = async (product: Partial<Product>) => {
    const productId = product.id || generateUUID();
    const dbUpdates: any = { id: productId };
    PRODUCT_DB_FIELDS.forEach(f => {
        const dbF = f.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if ((product as any)[f] !== undefined) dbUpdates[dbF] = (product as any)[f];
    });

    const { data, error } = await supabase.from('products').insert(dbUpdates).select().single();
    if (error) throw error;
    return data;
};

export const deleteProduct = (id: string) => supabase.from('products').delete().eq('id', id);

export const updateAffiliate = async (id: string, updates: Partial<User>) => {
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) throw error;
};

export const deleteAffiliate = (id: string) => supabase.from('profiles').delete().eq('id', id);

export const updateSale = (id: string, updates: Partial<Sale>) => {
    const mapped: any = {};
    const fields = [
        'productId', 'productName', 'status', 'trackingCode', 'notes', 
        'statusUpdatedAt', 'lastContactedBy', 'lastContactedByName', 'isBonus', 
        'customerName', 'customerPhone', 'customerEmail', 
        'customer_street_address', 'customer_house_number', 'customer_city', 'customer_province', 'customer_zip',
        'contactHistory', 'quantity', 'bundleId', 'variantId', 'variantName', 'selectedVariants',
        'paymentMethod', 'paymentStatus', 'currency'
    ];
    
    fields.forEach(f => {
        const dbF = f.includes('_') ? f : f.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if ((updates as any)[f] !== undefined) mapped[dbF] = (updates as any)[f];
    });
    return supabase.from('sales').update(mapped).eq('id', id);
};

export const createPayoutRequest = async (userId: string, amount: number, method: string, details: string) => {
    const { error } = await supabase.from('transactions').insert({
        id: generateUUID(),
        user_id: userId,
        type: 'Payout',
        amount,
        status: 'Pending',
        payment_method: method,
        payment_details: details
    });
    return { success: !error, error: error?.message };
};

export const processTransfer = async (fId: string, tId: string, amount: number, fName: string, tName: string, notes?: string) => {
    const { error } = await supabase.from('transactions').insert({
        id: generateUUID(),
        from_user_id: fId, to_user_id: tId, from_user_name: fName, to_user_name: tName,
        type: 'Transfer', amount, status: 'Completed', notes: notes || 'Trasferimento'
    });
    return { success: !error, error: error?.message };
};

export const addBonus = async (toId: string, toName: string, amount: number, notes: string) => {
    const { error } = await supabase.from('transactions').insert({
        id: generateUUID(),
        to_user_id: toId, to_user_name: toName, type: 'Bonus', amount, status: 'Completed', notes
    });
    return { success: !error, error: error?.message };
};

export const updateTransactionStatus = async (id: string, status: string) => supabase.from('transactions').update({ status }).eq('id', id);

export const createNotification = async (n: any) => {
    const dbPayload = {
        id: generateUUID(),
        title: n.title,
        message: n.message,
        target_roles: n.target_roles || [],
        event_type: n.eventType || 'manual',
        link_to: n.link_to || null,
        target_user_id: n.target_user_id || null,
        read_by: []
    };
    
    const res = await supabase.from('notifications').insert(dbPayload);
    
    if (res.error) {
        console.error("DATABASE ERROR:", res.error);
        throw res.error;
    }
    return res;
};

export const deleteNotification = (id: string) => supabase.from('notifications').delete().eq('id', id);

export const markNotificationAsRead = async (id: string, uId: string) => {
    const { data } = await supabase.from('notifications').select('read_by').eq('id', id).single();
    if (data) {
        const rb = new Set(data.read_by || []);
        rb.add(uId);
        await supabase.from('notifications').update({ read_by: Array.from(rb) }).eq('id', id);
    }
};

export const markAllNotificationsAsRead = async (uId: string, roles: UserRole[]) => {
    const { data } = await supabase.from('notifications').select('id, read_by, target_roles');
    if (data) {
        for (const n of data) {
            if (n.target_roles.some((r: any) => roles.includes(r))) {
                const rb = new Set(n.read_by || []);
                if (!rb.has(uId)) {
                    rb.add(uId);
                    await supabase.from('notifications').update({ read_by: Array.from(rb) }).eq('id', n.id);
                }
            }
        }
    }
};

export const createTicket = async (t: any) => supabase.from('tickets').insert({ ...t, id: generateUUID(), status: 'Aperto' });
export const addTicketReply = async (tId: string, r: any) => supabase.from('ticket_replies').insert({ ...r, id: generateUUID(), ticket_id: tId });
export const updateTicketStatus = (tId: string, s: string) => supabase.from('tickets').update({ status: s }).eq('id', tId);

export const triggerWebhook = async (url: string, payload: any) => {
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        return { success: response.ok, error: response.ok ? undefined : `HTTP error! status: ${response.status}` };
    } catch (e: any) { return { success: false, error: e.message }; }
};

export const approveUserRPC = async (uId: string) => supabase.rpc('approve_user_v1', { target_user_id: uId });
export const rejectUserRPC = async (uId: string) => supabase.rpc('reject_user_v1', { target_user_id: uId });
export const sendApprovalEmail = async (e: string, n: string) => ({ success: true });

export const createTestOrder = async (pId: string, pName: string, aId: string, aName: string) => {
    return supabase.from('sales').insert({
        id: `TEST-${Date.now()}`, product_id: pId, product_name: pName, affiliate_id: aId, affiliate_name: aName,
        sale_amount: 10, commission_amount: 5, status: 'Confermato', sale_date: new Date().toISOString()
    });
};

export const createSpediamoShipmentDirect = async (p: any) => supabase.functions.invoke('spediamo-proxy', { body: p });
export const createPaccoFacileShipmentDirect = async (p: any) => supabase.functions.invoke('paccofacile-proxy', { body: p });

export const addStockExpense = async (expense: Omit<StockExpense, 'id' | 'createdAt' | 'totalCost'>) => {
    const { error } = await supabase.from('stock_expenses').insert({
        id: generateUUID(),
        product_id: expense.productId,
        quantity: expense.quantity,
        unit_cost: expense.unitCost,
        total_cost: expense.quantity * expense.unitCost,
        payer: expense.payer,
        notes: expense.notes,
        date: expense.date
    });
    if (error) throw error;
};

export const deleteStockExpense = (id: string) => supabase.from('stock_expenses').delete().eq('id', id);

export const signOut = () => supabase.auth.signOut();
