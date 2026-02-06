
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = (globalThis as any).Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    console.log("Payload ricevuto:", JSON.stringify(payload));

    const { uid, key, name, tel, zip, ua, ip, offer, selectedVariants, variantId, variantName } = payload
    const subId = payload.subId || payload.sub_id || null;
    
    const street = payload['customer_street_address'] || payload['street-address'] || payload['street'] || ''
    const houseNumber = payload['customer_house_number'] || payload['house-number'] || payload['house_number'] || ''
    const city = payload['customer_city'] || payload['address-level2'] || payload['city'] || ''
    const province = String(payload['customer_province'] || payload['address-level1'] || payload['province'] || '').toUpperCase().substring(0, 2)

    if (!uid || !key || !name || !tel) {
        throw new Error("Dati obbligatori mancanti nel payload.");
    }

    // 1. RICERCA PROFILO
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
    let profile = null;

    if (isUUID) {
        const { data } = await supabaseClient.from('profiles').select('id, name').eq('id', key).maybeSingle();
        profile = data;
    } else {
        const { data } = await supabaseClient.from('profiles').select('id, name').eq('short_id', key).maybeSingle();
        profile = data;
    }

    if (!profile) {
        throw new Error(`Partner identificato come "${key}" non trovato.`);
    }

    // 2. RECUPERO PRODOTTO
    const { data: product, error: pErr } = await supabaseClient.from('products').select('*').eq('id', uid).maybeSingle();
    if (pErr || !product) throw new Error(`Prodotto ID "${uid}" non trovato.`);

    // 3. CALCOLO PREZZI (COD usa sempre i campi base)
    let saleAmount = Number(product.price);
    let commAmount = Number(product.commission_value);
    let qty = 1;
    let appliedBundleId = null;

    if (offer && product.bundle_options) {
        const offerStr = String(offer).trim();
        const offerNum = parseInt(offerStr);
        let bundle = product.bundle_options.find((b: any) => 
            String(b.id) === offerStr || b.quantity === offerNum
        );
        
        if (bundle) {
            saleAmount = Number(bundle.price);
            commAmount = Number(bundle.commissionValue);
            qty = Number(bundle.quantity);
            appliedBundleId = bundle.id;
        }
    }

    if (!product.free_shipping) {
        saleAmount += Number(product.shipping_charge || 0);
    }

    if (product.affiliate_commission_overrides?.[profile.id]) {
        commAmount = parseFloat(product.affiliate_commission_overrides[profile.id]);
    }

    let cleanPhone = String(tel).replace(/\D/g, '');
    if (cleanPhone.length > 10 && cleanPhone.startsWith('39')) cleanPhone = cleanPhone.substring(2);

    // 4. INSERIMENTO DB
    const { data: insertedSale, error: insertErr } = await supabaseClient
        .from('sales')
        .insert([{
            id: (globalThis as any).crypto.randomUUID(),
            product_id: uid,
            product_name: product.name,
            affiliate_id: profile.id,
            affiliate_name: profile.name,
            sale_amount: saleAmount,
            commission_amount: commAmount,
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
            variant_name: variantName || null
        }])
        .select('*').single();

    if (insertErr) throw new Error(`Database Error: ${insertErr.message}`);

    // 5. NOTIFICA WEBHOOK GLOBALE (MAKE)
    const { data: globalHook } = await supabaseClient.from('settings').select('value').eq('key', 'global_webhook_url').maybeSingle();
    if (globalHook?.value) {
        fetch(globalHook.value, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                event: 'new_lead_entry', 
                source: 'api_form',
                sale: insertedSale,
                product: product
            })
        }).catch(e => console.warn("Global Webhook failed:", e));
    }

    return new Response(JSON.stringify({ success: true, order_id: insertedSale.id, status: insertedSale.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
