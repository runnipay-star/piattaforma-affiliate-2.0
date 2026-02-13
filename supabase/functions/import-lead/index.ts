
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXCHANGE_RATES = {
  'USD': 0.92,
  'GBP': 1.18,
  'EUR': 1.00
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = (globalThis as any).Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json().catch(() => ({}));
    
    const { 
        uid, key, name, tel, zip, ua, ip, offer, 
        selectedVariants, variantId, variantName,
        ip_country, ip_city, ip_region, ip_flag 
    } = payload;

    const subId = payload.subId || payload.sub_id || null;
    
    const street = payload['customer_street_address'] || payload['street-address'] || payload['street'] || ''
    const houseNumber = payload['customer_house_number'] || payload['house-number'] || payload['house_number'] || ''
    const city = payload['customer_city'] || payload['address-level2'] || payload['city'] || ''
    const province = String(payload['customer_province'] || payload['address-level1'] || payload['province'] || '').toUpperCase().substring(0, 2)

    if (!uid || !key || !name || !tel) {
        throw new Error("Dati obbligatori mancanti: uid, key, name e tel sono richiesti.");
    }

    // 1. IDENTIFICAZIONE AFFILIATO
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    let profile = null;

    if (isUUID) {
        const { data } = await supabaseClient.from('profiles').select('id, name, short_id').eq('id', key).maybeSingle();
        profile = data;
    } else {
        const { data } = await supabaseClient.from('profiles').select('id, name, short_id').eq('short_id', key).maybeSingle();
        profile = data;
    }

    if (!profile) throw new Error(`Partner con identificativo "${key}" non trovato.`);

    // 2. RECUPERO DATI PRODOTTO
    const { data: product } = await supabaseClient.from('products').select('*').eq('id', uid).maybeSingle();
    if (!product) throw new Error(`Prodotto ID "${uid}" non trovato.`);

    let originalPrice = Number(product.price || 0);
    let originalComm = Number(product.commission_value || 0);
    let qty = 1;
    let appliedBundleId = null;

    if (offer && product.bundle_options) {
        const offerStr = String(offer).trim();
        const offerNum = parseInt(offerStr);
        let bundle = product.bundle_options.find((b: any) => 
            String(b.id) === offerStr || b.quantity === offerNum
        );
        if (bundle) {
            originalPrice = Number(bundle.price || 0);
            originalComm = Number(bundle.commissionValue || 0);
            qty = Number(bundle.quantity || 1);
            appliedBundleId = bundle.id;
        }
    }

    const shippingCharge = Number(product.shipping_charge || 0);
    const totalOriginalAmount = originalPrice + shippingCharge;
    
    if (product.affiliate_commission_overrides?.[profile.id]) {
        originalComm = parseFloat(product.affiliate_commission_overrides[profile.id]);
    }

    const productCurrency = (product.currency || 'EUR') as keyof typeof EXCHANGE_RATES;
    const rate = EXCHANGE_RATES[productCurrency] || 1.0;
    const saleAmountEur = totalOriginalAmount * rate;
    const commissionAmountEur = originalComm * rate;

    let cleanPhone = String(tel).replace(/\D/g, '');
    if (cleanPhone.length > 10 && cleanPhone.startsWith('39')) cleanPhone = cleanPhone.substring(2);

    // 3. SALVATAGGIO NEL DATABASE
    const { data: insertedSale, error: insertErr } = await supabaseClient
        .from('sales')
        .insert([{
            id: (globalThis as any).crypto.randomUUID(),
            product_id: uid, 
            product_name: product.name,
            affiliate_id: profile.id, 
            affiliate_name: profile.name,
            sale_amount: saleAmountEur, 
            commission_amount: commissionAmountEur,
            quantity: qty, 
            bundle_id: appliedBundleId,
            status: 'In attesa', 
            customer_name: name, 
            customer_phone: cleanPhone,
            customer_street_address: street, 
            customer_house_number: houseNumber,
            customer_city: city, 
            customer_province: province, 
            customer_zip: zip,
            sub_id: subId, 
            user_agent: ua || 'API_MWS_V2', 
            ip_address: ip || '0.0.0.0',
            sale_date: new Date().toISOString(), 
            payment_method: 'cod',
            selected_variants: selectedVariants || null, 
            variant_id: variantId || null,
            variant_name: variantName || null, 
            currency: 'EUR',
            ip_country: ip_country || null,
            ip_city: ip_city || null,
            ip_region: ip_region || null,
            ip_flag: ip_flag || null
        }])
        .select('*').single();

    if (insertErr) throw new Error(`Database Error: ${insertErr.message}`);

    // 4. INVIO AL WEBHOOK GLOBALE (NOTIFICA NUOVO ORDINE)
    try {
        const { data: settings } = await supabaseClient
            .from('settings')
            .select('value')
            .eq('key', 'global_webhook_url')
            .maybeSingle();

        const globalWebhookUrl = settings?.value;

        if (globalWebhookUrl && globalWebhookUrl.startsWith('http')) {
            console.log(`[Webhook Global] Invio notifica a: ${globalWebhookUrl}`);
            
            await fetch(globalWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'NEW_ORDER_COD',
                    order_id: insertedSale.id,
                    product_name: insertedSale.product_name,
                    customer_name: insertedSale.customer_name,
                    customer_phone: insertedSale.customer_phone,
                    amount: insertedSale.sale_amount,
                    payment_method: 'cod',
                    affiliate_name: insertedSale.affiliate_name,
                    affiliate_short_id: profile.short_id,
                    sub_id: insertedSale.sub_id,
                    geo: {
                        country: insertedSale.ip_country,
                        city: insertedSale.ip_city
                    },
                    timestamp: insertedSale.sale_date
                })
            }).catch(e => console.error("[Webhook Error] Fallito invio asincrono:", e));
        }
    } catch (whErr) {
        console.warn("[Webhook Global] Errore configurazione:", whErr);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        order_id: insertedSale.id,
        quantity: insertedSale.quantity,
        status: insertedSale.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Import Lead Error]", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
})
