
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const timestamp = new Date().toISOString();
  console.log(`[Proxy v14] Richiesta ricevuta: ${req.method} @ ${timestamp}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 1. RILEVAMENTO IP PUBLICO (Essenziale per Whitelisting)
  let serverIp = "0.0.0.0";
  try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      serverIp = ipData.ip;
  } catch(e) {
      serverIp = "Rilevamento fallito";
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
        return new Response(JSON.stringify({ success: false, error: "Dati mancanti" }), { headers: corsHeaders, status: 200 });
    }

    const { action, apiKey, shipment, isSandbox } = body;
    const rawKey = String(apiKey || '').trim();

    if (!rawKey) {
        return new Response(JSON.stringify({ success: false, error: "Chiave API non configurata nel profilo." }), { headers: corsHeaders, status: 200 });
    }

    if (action === 'create-shipment') {
      const host = isSandbox ? "sandbox.spediamo.it" : "www.spediamo.it";
      const targetUrl = `https://${host}/api/v1/shipments`;
      
      const cleanPhone = (p: any) => String(p || '').replace(/\D/g, '').substring(0, 15);
      const cleanProvince = (p: any) => String(p || '').replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 2);
      const cleanZip = (z: any) => String(z || '').replace(/\D/g, '').padStart(5, '0').substring(0, 5);

      const payload = {
        shipment: {
          type: "DOMESTIC",
          courier: "SDA",
          reference_number: String(shipment.orderId || ""),
          cash_on_delivery: true,
          cash_on_delivery_amount: Number(shipment.cashOnDeliveryAmount || 0),
          sender_name: String(shipment.senderName || '').trim().substring(0, 35),
          sender_address: String(shipment.senderAddress || '').trim().substring(0, 35),
          sender_town: String(shipment.senderTown || '').trim().substring(0, 30),
          sender_zip_code: cleanZip(shipment.senderPostalCode),
          sender_province: cleanProvince(shipment.senderProvince),
          sender_country_code: "IT",
          sender_phone: cleanPhone(shipment.senderPhone),
          sender_email: String(shipment.senderEmail || '').trim(),
          recipient_name: String(shipment.recipientName || '').trim().substring(0, 35),
          recipient_address: String(shipment.recipientAddress || '').trim().substring(0, 35),
          recipient_town: String(shipment.recipientTown || '').trim().substring(0, 30),
          recipient_zip_code: cleanZip(shipment.recipientPostalCode),
          recipient_province: cleanProvince(shipment.recipientProvince),
          recipient_country_code: "IT",
          recipient_phone: cleanPhone(shipment.recipientPhone),
          recipient_email: String(shipment.recipientEmail || '').trim(),
          parcels: (shipment.packages || []).map((p: any) => ({
            weight: Number(p.weight) || 1,
            width: Math.round(Number(p.width)) || 10,
            height: Math.round(Number(p.height)) || 10,
            length: Math.round(Number(p.length)) || 10,
            description: "Merci"
          }))
        }
      };

      console.log(`[Proxy v14] Tentativo chiamata a Spediamo (IP: ${serverIp})`);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': rawKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'MWS-Logistics-v14' // Identificativo API pulito
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      const cfRay = response.headers.get('cf-ray') || 'NON_DISPONIBILE';

      if (!response.ok) {
        console.error(`[Proxy v14] Errore Spediamo: ${response.status} | IP: ${serverIp}`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: response.status === 403 ? "Accesso Negato (Firewall)" : `Errore ${response.status}`,
          details: `STATUS: ${response.status}\nSERVER_IP: ${serverIp}\nCF_RAY: ${cfRay}\nRESPONSE: ${responseText.substring(0, 150)}`
        }), { headers: corsHeaders, status: 200 });
      }

      return new Response(JSON.stringify({ success: true, data: JSON.parse(responseText) }), { headers: corsHeaders, status: 200 });
    }

    return new Response(JSON.stringify({ success: false, error: "Azione non valida" }), { headers: corsHeaders, status: 200 });

  } catch (error: any) {
    console.error(`[Proxy v14 Exception] ${error.message}`);
    return new Response(JSON.stringify({ success: false, error: "Eccezione Proxy", details: error.message }), { headers: corsHeaders, status: 200 });
  }
})
