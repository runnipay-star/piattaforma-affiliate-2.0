
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FALLBACK_RATES: Record<string, number> = {
  'USD': 0.92,
  'GBP': 1.18,
  'EUR': 1.00
};

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

    console.log(`[Mollie Webhook] Analisi pagamento: ${paymentId}`);

    const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${mollieApiKey}` }
    });
    const payment = await mollieRes.json();
    
    if (payment.error) {
        console.error("[Mollie API Error]", payment.error);
        return new Response("OK", { status: 200 });
    }

    const meta = payment.metadata;

    if (payment.status === "paid") {
      const originalValue = parseFloat(payment.amount.value);
      const originalCurrency = payment.amount.currency;
      
      let finalSaleAmountEur: number | null = null;
      let actualExchangeRate: number;

      const settled = payment.amountSettled || payment.settlementAmount;

      if (settled && settled.currency === 'EUR') {
        finalSaleAmountEur = parseFloat(settled.value);
        actualExchangeRate = finalSaleAmountEur / originalValue;
        console.log(`[Conversione Mollie] ${originalValue} ${originalCurrency} -> ${finalSaleAmountEur} EUR`);
      } else {
        const rate = FALLBACK_RATES[originalCurrency] || 1.0;
        finalSaleAmountEur = Number((originalValue * rate).toFixed(2));
        actualExchangeRate = rate;
      }

      const originalCommission = Number(meta.commissionAmount || 0);
      const finalCommissionAmountEur = Number((originalCommission * actualExchangeRate).toFixed(2));

      // REGISTRAZIONE ORDINE
      const { data: insertedSale, error: insErr } = await supabase.from('sales').insert({
          id: (globalThis as any).crypto.randomUUID(),
          product_id: meta.productId,
          product_name: meta.productName,
          affiliate_id: meta.affiliateId,
          affiliate_name: meta.affiliateName,
          sale_amount: finalSaleAmountEur, 
          commission_amount: finalCommissionAmountEur,
          quantity: Number(meta.quantity || 1),
          bundle_id: meta.bundleId || null,
          sub_id: meta.subId || null,
          status: 'Confermato',
          payment_method: 'card',
          payment_status: 'paid',
          mollie_id: payment.id,
          customer_name: meta.customerName,
          customer_phone: meta.customerPhone,
          customer_street_address: meta.customerStreet || '',
          customer_house_number: meta.customerHouseNumber || '',
          customer_city: meta.customerCity || '',
          customer_province: meta.customerProvince || '',
          customer_zip: meta.customerZip || '',
          sale_date: new Date().toISOString(),
          currency: 'EUR',
          user_agent: 'MOLLIE_WEBHOOK_V4_SECURE'
      }).select().single();

      if (insErr) {
          console.error("[DB ERROR Mollie Webhook]", insErr.message);
      } else {
          // INVIO AL WEBHOOK GLOBALE PER ORDINE PAGATO CON CARTA
          try {
              const { data: settData } = await supabase.from('settings').select('value').eq('key', 'global_webhook_url').maybeSingle();
              const whUrl = settData?.value;
              if (whUrl && whUrl.startsWith('http')) {
                  console.log(`[Webhook Global] Notifica ordine pagato (CARD): ${whUrl}`);
                  await fetch(whUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          event: 'NEW_ORDER_PAID_CARD',
                          order_id: insertedSale.id,
                          product_name: insertedSale.product_name,
                          customer_name: insertedSale.customer_name,
                          amount: insertedSale.sale_amount,
                          payment_method: 'card',
                          affiliate_name: insertedSale.affiliate_name,
                          sub_id: insertedSale.sub_id,
                          timestamp: insertedSale.sale_date
                      })
                  });
              }
          } catch (whErr) {
              console.warn("[Webhook Global] Notifica carta fallita:", whErr);
          }
      }
    }

    return new Response("OK", { status: 200 });

  } catch (error: any) {
    console.error("[Webhook Exception]", error.message);
    return new Response("Internal Error", { status: 500 });
  }
})
