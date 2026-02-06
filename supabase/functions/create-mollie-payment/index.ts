
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const mollieApiKey = (globalThis as any).Deno.env.get('MOLLIE_API_KEY');
    const supabaseUrl = (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { productId, affiliateId, customerName, offer, redirectUrl, webhookUrl, tel, street, city, zip, province, selectedVariants, variantId, variantName } = body;
    const subId = body.subId || body.sub_id || null;

    if (!productId || !affiliateId || !tel) {
      throw new Error("Dati obbligatori mancanti.");
    }

    // 1. Recupera il prodotto
    const { data: product, error: pErr } = await supabase.from('products').select('*').eq('id', productId).single();
    if (pErr || !product) throw new Error("Prodotto non trovato nel database.");

    // Logica di fallback: Usa price_card se presente, altrimenti price (COD)
    let basePrice = Number(product.price_card || product.price);
    let commAmount = Number(product.commission_value_card || product.commission_value);
    let qty = 1;
    let bundleId = null;

    if (offer && product.bundle_options) {
        const offerStr = String(offer).trim();
        const offerNum = parseInt(offerStr);
        let bundle = product.bundle_options.find((b: any) => 
            String(b.id) === offerStr || b.quantity === offerNum
        );
        if (bundle) {
            basePrice = Number(bundle.price);
            commAmount = Number(bundle.commissionValue);
            qty = Number(bundle.quantity);
            bundleId = bundle.id;
        }
    }

    const shippingChargeCard = Number(product.shipping_charge_card || 0);
    const finalPrice = basePrice + shippingChargeCard;

    // 2. Creazione pagamento su Mollie
    const mollieRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mollieApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: { currency: "EUR", value: finalPrice.toFixed(2) },
        description: `Acquisto ${product.name} - MWS`,
        redirectUrl: redirectUrl || "https://mws-platform.eu/success",
        webhookUrl: "https://radhkbocafjpglgmbpyy.supabase.co/functions/v1/mollie-webhook",
        metadata: { 
            productId,
            productName: product.name,
            affiliateId,
            affiliateName: body.affiliateName || 'Partner MWS',
            saleAmount: finalPrice,
            commissionAmount: commAmount,
            quantity: qty,
            bundleId,
            subId,
            affiliateWebhook: webhookUrl,
            customerName,
            customerPhone: tel,
            customerStreet: street,
            customerHouseNumber: body.customer_house_number || body['house-number'] || '',
            customerCity: city,
            customerZip: zip,
            customerProvince: province,
            // VARIANTI
            selectedVariants: selectedVariants || null,
            variantId: variantId || null,
            variantName: variantName || null
        }
      })
    });

    const mollieData = await mollieRes.json();
    if (mollieData.error || !mollieData._links) {
        throw new Error(mollieData.detail || "Errore API Mollie");
    }
    
    return new Response(JSON.stringify({ checkoutUrl: mollieData._links.checkout.href }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error(`[Mollie Error] ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
})
