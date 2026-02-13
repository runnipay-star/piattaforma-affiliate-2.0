
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const mollieApiKey = (globalThis as any).Deno.env.get('MOLLIE_API_KEY');
    const supabaseUrl = (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!mollieApiKey) throw new Error("MOLLIE_API_KEY non configurata nelle impostazioni Supabase.");

    const body = await req.json().catch(() => ({}));
    
    // MAPPING CAMPI MWS -> PARAMETRI FUNZIONE (Estremamente permissivo)
    const productId = body.uid || body.productId || body.id_prodotto;
    const affiliateId = body.key || body.affiliateId || body.id_affiliato;
    const customerName = body.name || body.customerName || body.nome_completo;
    const tel = body.tel || body.phone || body.customerPhone || body.telefono;
    
    const { 
        affiliateName, offer, redirectUrl, webhookUrl, 
        selectedVariants, variantId, variantName 
    } = body;

    // Recupero indirizzo (mapping aliases)
    const street = body.customer_street_address || body['street-address'] || body.street || '';
    const houseNumber = body.customer_house_number || body['house-number'] || body.house_number || '';
    const city = body.customer_city || body.city || '';
    const zip = body.customer_zip || body.zip || '';
    const province = body.customer_province || body.province || '';
    const subId = body.subId || body.sub_id || null;

    // Validazione robusta con errore specifico per campo mancante
    if (!productId) throw new Error("Dati obbligatori mancanti: ID Prodotto (uid).");
    if (!affiliateId) throw new Error("Dati obbligatori mancanti: ID Affiliato (key).");
    if (!tel) throw new Error("Dati obbligatori mancanti: Numero di Telefono (tel).");

    const { data: product, error: pErr } = await supabase.from('products').select('*').eq('id', productId).single();
    if (pErr || !product) throw new Error(`Prodotto con ID "${productId}" non trovato nel database.`);

    // Valori base (COD fallback)
    let basePrice = Number(product.price_card || product.price || 0);
    let commAmount = Number(product.commission_value_card || product.commission_value || 0);
    let qty = 1;
    let bundleId = null;

    // Gestione Bundle
    if (offer && product.bundle_options) {
        const offerStr = String(offer).trim();
        const offerNum = parseInt(offerStr);
        let bundle = product.bundle_options.find((b: any) => 
            String(b.id) === offerStr || b.quantity === offerNum
        );
        if (bundle) {
            basePrice = Number(bundle.price_card || bundle.price || 0);
            commAmount = Number(bundle.commission_value_card || bundle.commissionValue || 0);
            qty = Number(bundle.quantity || 1);
            bundleId = bundle.id;
        }
    }

    const shippingChargeCard = Number(product.shipping_charge_card || 0);
    const finalPrice = basePrice + shippingChargeCard;
    const finalCurrency = product.currency || 'EUR';

    if (finalPrice <= 0) throw new Error("Il prezzo calcolato dell'ordine non è valido (0 o inferiore).");

    // Creazione pagamento Mollie
    const mollieRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mollieApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: { currency: finalCurrency, value: finalPrice.toFixed(2) },
        description: `Ordine ${product.name} - MWS Ref: ${product.ref_number || 'N/A'}`,
        redirectUrl: redirectUrl || "https://mws-platform.eu/success",
        webhookUrl: "https://radhkbocafjpglgmbpyy.supabase.co/functions/v1/mollie-webhook",
        metadata: { 
            productId,
            productName: product.name,
            affiliateId,
            affiliateName: affiliateName || body.affiliateName || 'Partner MWS',
            saleAmount: finalPrice,
            commissionAmount: commAmount,
            quantity: qty,
            bundleId,
            subId,
            affiliateWebhook: webhookUrl,
            customerName,
            customerPhone: tel,
            customerStreet: street,
            customerHouseNumber: houseNumber,
            customerCity: city,
            customerZip: zip,
            customerProvince: province,
            selectedVariants: selectedVariants || null,
            variantId: variantId || null,
            variantName: variantName || null,
            currency: finalCurrency
        }
      })
    });

    const mollieData = await mollieRes.json();
    if (mollieData.error || !mollieData._links) {
        throw new Error(mollieData.detail || "Errore API Mollie: Verifica la tua API Key di produzione.");
    }
    
    return new Response(JSON.stringify({ checkoutUrl: mollieData._links.checkout.href }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[Create Payment Error]", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
})
