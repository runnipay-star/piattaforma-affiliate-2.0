
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

    const formData = await req.formData();
    const paymentId = formData.get("id");

    if (!paymentId) return new Response("No ID", { status: 400 });

    const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${mollieApiKey}` }
    });
    
    if (!mollieRes.ok) throw new Error(`Errore recupero Mollie: ${mollieRes.status}`);

    const payment = await mollieRes.json();
    const meta = payment.metadata;

    if (payment.status === "paid") {
      console.log(`[Mollie Webhook] Pagamento COMPLETATO per ${paymentId}. Creazione ordine CONFERMATO...`);
      
      const { data: insertedSale, error: insErr } = await supabase.from('sales').insert({
          id: (globalThis as any).crypto.randomUUID(),
          product_id: meta.productId,
          product_name: meta.productName,
          affiliate_id: meta.affiliateId,
          affiliate_name: meta.affiliateName,
          sale_amount: Number(meta.saleAmount),
          commission_amount: Number(meta.commissionAmount),
          quantity: Number(meta.quantity),
          bundle_id: meta.bundleId,
          sub_id: meta.subId || null,
          status: 'Confermato', // Impostato automaticamente su Confermato
          payment_method: 'card',
          payment_status: 'paid',
          mollie_id: payment.id,
          customer_name: meta.customerName,
          customer_phone: meta.customerPhone,
          customer_street_address: meta.customerStreet,
          customer_house_number: meta.customerHouseNumber,
          customer_city: meta.customerCity,
          customer_zip: meta.customerZip,
          customer_province: meta.customerProvince,
          sale_date: new Date().toISOString(),
          status_updated_at: new Date().toISOString(),
          selected_variants: meta.selectedVariants || null,
          variant_id: meta.variantId || null,
          variant_name: meta.variantName || null
      }).select().single();

      if (insErr) {
          console.error("Errore creazione ordine post-pagamento:", insErr.message);
      } else {
          console.log(`[Mollie Webhook] Ordine ${insertedSale.id} creato.`);
          
          // 1. Recupero impostazioni globali
          const { data: settingsData } = await supabase.from('settings').select('*');
          const settings: any = {};
          settingsData?.forEach((s: any) => settings[s.key] = s.value);

          // 2. Webhook specifico Affiliato (opzionale)
          if (meta.affiliateWebhook) {
              fetch(meta.affiliateWebhook, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ event: 'sale_paid', sale: insertedSale })
              }).catch(e => console.warn("Affiliate Webhook fallito:", e));
          }

          // 3. Webhook GLOBALE Piattaforma (Notifica nuovo lead)
          if (settings.global_webhook_url) {
              fetch(settings.global_webhook_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      event: 'new_lead_entry', 
                      source: 'mollie_payment',
                      sale: insertedSale 
                  })
              }).catch(e => console.warn("Global Webhook failed:", e));
          }

          // 4. Webhook FULFILLMENT / MAKE (Inviato automaticamente perché lo stato è Confermato)
          if (settings.make_webhook_url) {
              const { data: product } = await supabase.from('products').select('*').eq('id', meta.productId).single();
              fetch(settings.make_webhook_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      event: 'fulfillment_requested',
                      sale_details: insertedSale,
                      product_details: product || null,
                      sender_info: {
                          name: settings.sender_name,
                          address: settings.sender_address,
                          city: settings.sender_city,
                          zip: settings.sender_zip,
                          province: settings.sender_province
                      }
                  })
              }).catch(e => console.warn("Make Fulfillment Webhook failed:", e));
          }

          // 5. SCARICO MAGAZZINO AUTOMATICO
          if (meta.productId) {
              const qty = Number(meta.quantity) || 1;
              const { data: product } = await supabase.from('products').select('*').eq('id', meta.productId).single();
              
              if (product) {
                  if (meta.selectedVariants && Array.isArray(meta.selectedVariants)) {
                      const updatedVariants = product.variants.map((v: any) => {
                          const matchCount = meta.selectedVariants.filter((sv: any) => sv.variantId === v.id).length;
                          return matchCount > 0 ? { ...v, stockQuantity: (v.stockQuantity || 0) - matchCount } : v;
                      });
                      await supabase.from('products').update({ variants: updatedVariants }).eq('id', meta.productId);
                  } else if (meta.variantId) {
                      const updatedVariants = product.variants.map((v: any) => 
                          v.id === meta.variantId ? { ...v, stockQuantity: (v.stockQuantity || 0) - qty } : v
                      );
                      await supabase.from('products').update({ variants: updatedVariants }).eq('id', meta.productId);
                  } else {
                      await supabase.from('products').update({ stock_quantity: (product.stock_quantity || 0) - qty }).eq('id', meta.productId);
                  }
                  console.log(`[Mollie Webhook] Magazzino aggiornato per prodotto ${meta.productId}`);
              }
          }
      }
    }

    return new Response("OK", { status: 200 });

  } catch (error: any) {
    console.error(`[Mollie Webhook Exception] ${error.message}`);
    return new Response("Error", { status: 500 });
  }
})
