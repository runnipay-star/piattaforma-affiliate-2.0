
import React, { useState, useMemo } from 'react';
import { Product, Affiliate, FormFields, PlatformSettings, FormFieldConfig } from '../types';
import { DesktopIcon } from './icons/DesktopIcon';
import { MobileIcon } from './icons/MobileIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { EyeIcon } from './icons/EyeIcon';
import { CogIcon } from './icons/CogIcon';

interface FormGeneratorProps {
    product: Product;
    currentAffiliate?: Affiliate;
    platformSettings: PlatformSettings;
}

const FormGenerator: React.FC<FormGeneratorProps> = ({ product, currentAffiliate, platformSettings }) => {
    const [activeTab, setActiveTab] = useState<'fields' | 'style' | 'payment'>('fields');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [copied, setCopied] = useState(false);

    const [fields, setFields] = useState<FormFields>({
        name: { visible: true, required: true, width: 100, placeholder: 'Nome e Cognome' },
        phone: { visible: true, required: true, width: 100, placeholder: 'Numero di Telefono' },
        street_address: { visible: true, required: true, width: 70, placeholder: 'Via / Piazza' },
        house_number: { visible: true, required: true, width: 30, placeholder: 'Civico' },
        city: { visible: true, required: true, width: 50, placeholder: 'Città' },
        province: { visible: true, required: true, width: 20, placeholder: 'PR' },
        zip: { visible: true, required: true, width: 30, placeholder: 'CAP' },
        email: { visible: false, required: false, width: 100, placeholder: 'Email (Opzionale)' },
        sub_id: { visible: false, required: false, width: 100, placeholder: 'Sub ID (Tracking)' },
    });

    const [defaultSubId, setDefaultSubId] = useState('');
    const [showBundles, setShowBundles] = useState(true);
    const [formTitle, setFormTitle] = useState(`Completa il tuo ordine`);
    const [step1Title, setStep1Title] = useState('Scegli la tua Offerta');
    const [step2Title, setStep2Title] = useState('Dati di Spedizione');
    const [step3Title, setStep3Title] = useState('Metodo di Pagamento');
    const [buttonTextCod, setButtonTextCod] = useState('Ordina Ora');
    const [buttonTextCard, setButtonTextCard] = useState('Vai al Checkout');
    const [cardSavingsLabel, setCardSavingsLabel] = useState('(Risparmi €{amount})');
    const [popularOfferId, setPopularOfferId] = useState<string>(''); 
    const [globalFontSize, setGlobalFontSize] = useState(14);
    const [sectionHeaderSize, setSectionHeaderSize] = useState(1.5);
    const [paymentIconsUrl, setPaymentIconsUrl] = useState('https://radhkbocafjpglgmbpyy.supabase.co/storage/v1/object/public/product-images/gallery/ok.png');
    const [paymentIconsWidth, setPaymentIconsWidth] = useState(250);
    
    const [formColors, setFormColors] = useState({
        titleColor: '#1a237e',
        labelColor: '#4b5563',
        buttonBgColor: '#1a237e',
        buttonTextColor: '#ffffff',
        inputBorderColor: '#d1d5db',
        highlightColor: '#fffbeb',
        badgeBgColor: '#1a237e',
        badgeTextColor: '#ffffff',
        offerPriceColor: '#111827',
        sectionTitleColor: '#1a237e',
        savingsTextColor: '#10b981',
        highlightBorderColor: '#1a237e'
    });

    const [enableCod, setEnableCod] = useState(true);
    const [enableCard, setEnableCard] = useState(true);
    const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'cod' | 'card'>('cod');
    const [highlightPaymentMethod, setHighlightPaymentMethod] = useState<'none' | 'cod' | 'card'>('card');
    const [thankYouUrl, setThankYouUrl] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');

    const updateField = (name: keyof FormFields, key: keyof FormFieldConfig, value: any) => {
        setFields(prev => ({
            ...prev,
            [name]: { ...prev[name], [key]: value }
        }));
    };

    const affiliateIdentifier = currentAffiliate ? (currentAffiliate.short_id || currentAffiliate.id) : '[ID_AFFILIATO]';

    const generatedHtml = useMemo(() => {
        const renderInput = (id: string, config: FormFieldConfig, type = "text") => {
            if (!config.visible) {
                if (id === 'subId') {
                    return `<input type="hidden" name="subId" value="${defaultSubId}">`;
                }
                return '';
            }
            const widthStyle = `width: ${config.width}%;`;
            return `
    <div style="${widthStyle} padding: 0 5px; margin-bottom: 12px; box-sizing: border-box;">
        <label style="display: block; margin-bottom: 4px; font-size: 0.85em; font-weight: 700; color: ${formColors.labelColor}">${config.placeholder}</label>
        <input type="${type}" name="${id}" ${config.required ? 'required' : ''} placeholder="${config.placeholder}" value="${id === 'subId' ? defaultSubId : ''}" style="width: 100%; padding: 10px; border: 1px solid ${formColors.inputBorderColor}; border-radius: 8px; box-sizing: border-box; font-size: 1em; outline: none;">
    </div>`;
        };

        const renderOfferCard = (id: string, label: string, price: number, qty: number, isPopular: boolean) => {
            const unitPrice = product.price;
            const savings = (unitPrice * qty) - price;
            const savingsText = savings > 0 ? `<div style="color: ${formColors.savingsTextColor}; font-size: 0.9em; font-weight: 700; margin-top: 2px;">(Risparmi €${savings.toFixed(2)})</div>` : '';
            const cardBg = isPopular ? formColors.highlightColor : '#f9fafb';
            const borderStyle = isPopular ? `border: 2px solid ${formColors.highlightBorderColor}` : 'border: 1px solid #e5e7eb';
            const hideCardStyle = (!showBundles && qty > 1) ? 'display: none;' : '';
            
            return `
        <label style="display: block; position: relative; cursor: pointer; margin-bottom: 12px; ${borderStyle}; border-radius: 12px; background: ${cardBg}; padding: 16px; transition: all 0.2s; box-sizing: border-box; ${hideCardStyle}" class="mws-offer-card" data-id="${id}" data-price="${price}" data-qty="${qty}">
            ${isPopular ? `<div style="position: absolute; top: -12px; right: -2px; background: ${formColors.badgeBgColor}; color: ${formColors.badgeTextColor}; padding: 2px 10px; border-radius: 6px; font-size: 0.75em; font-weight: 900; text-transform: uppercase; z-index: 1;">LA PIÙ SCELTA</div>` : ''}
            <div style="display: flex; align-items: center; gap: 12px;">
                <input type="radio" name="offer" value="${id}" ${qty === 1 ? 'checked' : ''} style="width: 1.3em; height: 1.3em; cursor: pointer; accent-color: ${formColors.highlightBorderColor}; margin: 0;">
                <div style="flex-grow: 1;">
                    <div style="font-size: 1.4em; font-weight: 800; color: ${formColors.offerPriceColor};">Offerta ${qty}x - <span style="color: ${formColors.sectionTitleColor}">€${price.toFixed(2)}</span></div>
                    ${savingsText}
                </div>
            </div>
        </label>`;
        };

        const codShipping = product.freeShipping ? 0 : (product.shippingCharge || 0);
        const cardShipping = product.shippingChargeCard || 0;
        const savingsOnCard = codShipping - cardShipping;
        
        const displaySavings = cardSavingsLabel.replace('{amount}', savingsOnCard.toFixed(2));
        const savingsHtml = (savingsOnCard > 0 || cardSavingsLabel.includes('€')) ? `<span style="color: ${formColors.savingsTextColor}; font-weight: 800; margin-left: 4px;">${displaySavings}</span>` : '';

        const badgeHtml = `<div style="position: absolute; top: -10px; right: 10px; background: ${formColors.badgeBgColor}; color: ${formColors.badgeTextColor}; padding: 2px 8px; border-radius: 4px; font-size: 0.65em; font-weight: 900; text-transform: uppercase; z-index: 1;">PIÙ SCELTO</div>`;

        const sectionHeaderStyleString = `color: ${formColors.sectionTitleColor}; font-size: ${sectionHeaderSize}em; font-weight: 900; text-align: left;`;

        // Logica preselezionato nel codice generato
        const isCodSelected = enableCod && (defaultPaymentMethod === 'cod' || !enableCard);
        const isCardSelected = enableCard && (defaultPaymentMethod === 'card' || !enableCod);

        const paymentMethodsHtml = (enableCod || enableCard) ? `
    <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px">
        <h2 style="${sectionHeaderStyleString} margin-bottom: 15px;">${step3Title}</h2>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${enableCod ? `
            <label style="display: flex; align-items: center; position: relative; cursor: pointer; padding: 12px; border: 2px solid #eee; border-radius: 10px; transition: all 0.2s;" id="label-cod">
                ${highlightPaymentMethod === 'cod' ? badgeHtml : ''}
                <input type="radio" name="paymentMethod" value="cod" ${isCodSelected ? 'checked' : ''} style="margin-right: 10px; width: 1.1em; height: 1.1em; accent-color: ${formColors.sectionTitleColor}">
                <span style="font-size: 0.9em; font-weight: 700; color: ${formColors.labelColor}">Paga alla Consegna</span>
            </label>` : ''}
            ${enableCard ? `
            <label style="display: flex; flex-direction: column; position: relative; cursor: pointer; padding: 12px; border: 2px solid #eee; border-radius: 10px; transition: all 0.2s;" id="label-card">
                ${highlightPaymentMethod === 'card' ? badgeHtml : ''}
                <div style="display: flex; align-items: center; width: 100%;">
                    <input type="radio" name="paymentMethod" value="card" ${isCardSelected ? 'checked' : ''} style="margin-right: 10px; width: 1.1em; height: 1.1em; accent-color: #4338ca">
                    <span style="font-size: 0.9em; font-weight: 700; color: #4338ca">Carta Visa / Mastercard... ${savingsHtml}</span>
                </div>
                ${paymentIconsUrl ? `<img src="${paymentIconsUrl}" style="width: ${paymentIconsWidth}px; margin-top: 8px; margin-left: 28px; max-width: 100%; display: block;" alt="Metodi di Pagamento">` : ''}
            </label>` : ''}
            ${!enableCod && !enableCard ? '<input type="hidden" name="paymentMethod" value="cod">' : ''}
        </div>
    </div>
        ` : '';

        const variantsJson = JSON.stringify(product.variants || []);
        const variantLabelTemplate = product.variant_bundle_label || 'Seleziona Variante {n}';

        return `
<div id="mws-form-container" style="max-width: 500px; margin: 20px auto; font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: ${globalFontSize}px; box-sizing: border-box;">
<form id="mws-order-form" style="background: #ffffff; padding: 25px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #f0f0f0; box-sizing: border-box;">
    <input type="hidden" name="productId" value="${product.id}">
    <input type="hidden" name="affiliateId" value="${affiliateIdentifier}">
    <input type="hidden" name="redirectUrl" value="${thankYouUrl}">
    <input type="hidden" name="webhookUrl" value="${webhookUrl}">

    <h2 style="${sectionHeaderStyleString} margin: 0 0 20px 0; ${!showBundles ? 'display: none;' : ''}">${step1Title}</h2>
    
    <div style="margin-bottom: 15px; ${!showBundles ? 'display: none;' : ''}">
        ${renderOfferCard('1', 'Offerta 1x', product.price, 1, popularOfferId === '1')}
        ${showBundles ? (product.bundleOptions || []).map(b => renderOfferCard(b.id, `Offerta ${b.quantity}x`, b.price, b.quantity, popularOfferId === b.id)).join('') : ''}
    </div>

    <div id="mws-dynamic-variants" style="margin-bottom: 25px;"></div>

    <h2 style="${sectionHeaderStyleString} margin: 30px 0 20px 0;">${step2Title}</h2>
    
    <div style="display: flex; flex-wrap: wrap; margin: 0 -5px;">
        ${renderInput('customerName', fields.name)}
        ${renderInput('customerPhone', fields.phone, 'tel')}
        ${renderInput('customer_street_address', fields.street_address)}
        ${renderInput('customer_house_number', fields.house_number)}
        ${renderInput('customer_city', fields.city)}
        ${renderInput('customer_province', fields.province)}
        ${renderInput('customer_zip', fields.zip)}
        ${renderInput('customerEmail', fields.email, 'email')}
        ${renderInput('subId', fields.sub_id)}
    </div>

    ${paymentMethodsHtml}

    <div style="margin-top: 25px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; font-size: 1em; color: #64748b; margin-bottom: 5px;">
            <span>Importo Prodotti:</span>
            <span id="mws-summary-price">€0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1em; color: #64748b; margin-bottom: 8px;">
            <span>Costo Spedizione:</span>
            <span id="mws-summary-shipping" style="font-weight: 700;">Gratis</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.3em; font-weight: 900; color: ${formColors.sectionTitleColor}; border-top: 1px solid #e2e8f0; padding-top: 10px;">
            <span>TOTALE ORDINE:</span>
            <span id="mws-summary-total">€0.00</span>
        </div>
    </div>

    <div id="mws-error-msg" style="color: #ef4444; font-size: 0.85em; margin: 15px 0; text-align: center; font-weight: 700; min-height: 18px; padding: 10px; background: #fff1f2; border-radius: 8px; display: none;"></div>
    
    <div style="text-align: center;">
        <button type="submit" id="mws-submit-btn" style="width: 100%; margin-top: 15px; padding: 18px; background: ${formColors.buttonBgColor}; color: ${formColors.buttonTextColor}; border: none; border-radius: 12px; cursor: pointer; font-size: 1.3em; font-weight: 900; text-transform: uppercase; transition: transform 0.1s, opacity 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            ${buttonTextCod}
        </button>
    </div>
    
    <p style="text-align: center; color: #9ca3af; font-size: 0.75em; margin-top: 15px; font-weight: 500;">🔒 Pagamento criptato SSL</p>
</form>

<script type="module">
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient('https://radhkbocafjpglgmbpyy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZGhrYm9jYWZqcGdsZ21icHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NzcwNDcsImV4cCI6MjA4MjE1MzA0N30.BtUupmNUJ1CA8X8FGRSyh6VgNXLSYM-WrajbsUED5FM');

const form = document.getElementById('mws-order-form');
const btn = document.getElementById('mws-submit-btn');
const err = document.getElementById('mws-error-msg');
const variantsContainer = document.getElementById('mws-dynamic-variants');

const productVariants = ${variantsJson};
const variantLabelTemplate = "${variantLabelTemplate}";
const isBundlesVisible = ${showBundles};

// --- AUTO-FILL SUB ID FROM URL ---
const urlParams = new URLSearchParams(window.location.search);
const subIdFromUrl = urlParams.get('subid') || urlParams.get('sub_id') || urlParams.get('sid');
const subIdInput = form.querySelector('input[name="subId"]');
if (subIdInput && subIdFromUrl) {
    subIdInput.value = subIdFromUrl;
}

const pricing = {
    cod: ${codShipping},
    card: ${cardShipping}
};

const buttonTexts = {
    cod: "${buttonTextCod}",
    card: "${buttonTextCard}"
};

// --- VALIDAZIONE CAMPI ---
const regexLetters = /[^a-zA-Z\\sàèìòùÀÈÌÒÙáéíóúÁÉÍÓÚ]/g;
const regexNumbers = /\\D/g;

const nameInp = form.querySelector('input[name="customerName"]');
if(nameInp) nameInp.addEventListener('input', e => e.target.value = e.target.value.replace(regexLetters, ''));

const phoneInp = form.querySelector('input[name="customerPhone"]');
if(phoneInp) phoneInp.addEventListener('input', e => e.target.value = e.target.value.replace(regexNumbers, ''));

const cityInp = form.querySelector('input[name="customer_city"]');
if(cityInp) cityInp.addEventListener('input', e => e.target.value = e.target.value.replace(regexLetters, ''));

const zipInp = form.querySelector('input[name="customer_zip"]');
if(zipInp) zipInp.addEventListener('input', e => e.target.value = e.target.value.replace(regexNumbers, ''));

const provInp = form.querySelector('input[name="customer_province"]');
if(provInp) provInp.addEventListener('input', e => {
    let val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    e.target.value = val.substring(0, 2);
});

function renderVariantSelectors(qty) {
    if (!productVariants || productVariants.length === 0) {
        variantsContainer.innerHTML = '';
        return;
    }

    let html = '<h2 style="${sectionHeaderStyleString} margin: 20px 0 15px 0;">Seleziona Varianti</h2>';
    
    for (let i = 1; i <= qty; i++) {
        const label = variantLabelTemplate.replace('{n}', i);
        html += \`
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 0.85em; font-weight: 700; color: ${formColors.labelColor}">\${label}</label>
                <select name="selectedVariant_\${i}" required style="width: 100%; padding: 12px; border: 1px solid ${formColors.inputBorderColor}; border-radius: 10px; background: #fff; font-size: 1em; font-weight: 600; cursor: pointer; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center; background-size: 1em;">
                    <option value="" disabled selected>Scegli...</option>
                    \${productVariants.map(v => \`<option value="\${v.id}" \${v.stockQuantity <= 0 ? 'disabled' : ''}>\${v.name} \${v.stockQuantity <= 0 ? '(Esaurito)' : ''}</option>\`).join('')}
                </select>
            </div>
        \`;
    }
    variantsContainer.innerHTML = html;
}

function updateTotal() {
    let selectedOfferCard;
    if (isBundlesVisible) {
        selectedOfferCard = form.querySelector('input[name="offer"]:checked')?.closest('.mws-offer-card');
    }
    
    const basePrice = selectedOfferCard ? parseFloat(selectedOfferCard.getAttribute('data-price')) : ${product.price};
    const qty = selectedOfferCard ? parseInt(selectedOfferCard.getAttribute('data-qty')) : 1;
    
    if (window.lastQty !== qty) {
        renderVariantSelectors(qty);
        window.lastQty = qty;
    }

    const methodEl = form.querySelector('input[name="paymentMethod"]:checked');
    const method = methodEl ? methodEl.value : (form.querySelector('input[name="paymentMethod"][type="hidden"]')?.value || 'cod');
    
    const shipping = (method === 'card') ? pricing.card : pricing.cod;
    const total = basePrice + shipping;

    document.getElementById('mws-summary-price').innerText = '€' + basePrice.toFixed(2);
    document.getElementById('mws-summary-shipping').innerText = shipping === 0 ? 'GRATIS' : '€' + shipping.toFixed(2);
    document.getElementById('mws-summary-total').innerText = '€' + total.toFixed(2);

    btn.innerText = buttonTexts[method] || buttonTexts.cod;

    const lCod = document.getElementById('label-cod');
    const lCard = document.getElementById('label-card');
    if(lCod) lCod.style.borderColor = method === 'cod' ? '${formColors.highlightBorderColor}' : '#eee';
    if(lCard) lCard.style.borderColor = method === 'card' ? '#4338ca' : '#eee';
    
    form.querySelectorAll('.mws-offer-card').forEach(card => {
        const isSelected = card.querySelector('input').checked;
        if(isSelected) {
            card.style.borderColor = '${formColors.highlightBorderColor}';
            card.style.borderWidth = '2px';
        } else {
            card.style.borderColor = '#e5e7eb';
            card.style.borderWidth = '1px';
        }
    });
}

form.querySelectorAll('input[name="offer"]').forEach(el => el.addEventListener('change', updateTotal));
form.querySelectorAll('input[name="paymentMethod"]').forEach(el => el.addEventListener('change', updateTotal));

updateTotal();

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.getAttribute('data-loading') === 'true') return;

    form.setAttribute('data-loading', 'true');
    btn.disabled = true;
    btn.style.opacity = '0.7';
    const originalText = btn.innerText;
    btn.innerText = 'Elaborazione...';
    err.style.display = 'none';

    try {
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());
        
        const selectedVariants = [];
        const currentQty = (window.lastQty || 1);
        for (let i = 1; i <= currentQty; i++) {
            const vId = data[\`selectedVariant_\${i}\`];
            if (vId) {
                const vObj = productVariants.find(v => v.id === vId);
                selectedVariants.push({ variantId: vId, variantName: vObj ? vObj.name : '' });
            }
        }
        
        const finalPayload = { 
            ...data, 
            offer: isBundlesVisible ? data.offer : '1',
            selectedVariants: selectedVariants,
            variantId: selectedVariants.length === 1 ? selectedVariants[0].variantId : null,
            variantName: selectedVariants.length === 1 ? selectedVariants[0].variantName : null
        };

        if (data.paymentMethod === 'card') {
            const { data: res, error: callErr } = await supabase.functions.invoke('create-mollie-payment', {
                body: { 
                    ...finalPayload, 
                    tel: data.customerPhone, 
                    customerName: data.customerName, 
                    street: data.customer_street_address, 
                    city: data.customer_city, 
                    zip: data.customer_zip, 
                    province: data.customer_province 
                }
            });
            if (callErr) throw callErr;
            if (res.error) throw new Error(res.error);
            window.location.href = res.checkoutUrl;
        } else {
            const { data: res, error: callErr } = await supabase.functions.invoke('import-lead', {
                body: { 
                    ...finalPayload, 
                    uid: data.productId, 
                    key: data.affiliateId, 
                    name: data.customerName, 
                    tel: data.customerPhone, 
                    zip: data.customer_zip, 
                    customer_street_address: data.customer_street_address,
                    customer_house_number: data.customer_house_number,
                    customer_city: data.customer_city,
                    customer_province: data.customer_province
                }
            });
            
            if (callErr) throw new Error("Errore comunicazione server");
            if (res.success === false) throw new Error(res.error || "Errore sconosciuto");
            
            window.location.href = data.redirectUrl || '/grazie';
        }
    } catch (e) {
        err.style.display = 'block';
        err.innerText = "Attenzione: " + e.message;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerText = originalText;
        form.setAttribute('data-loading', 'false');
    }
});
</script>
</div>`.trim();
    }, [product, fields, defaultSubId, showBundles, formTitle, step1Title, step2Title, step3Title, buttonTextCod, buttonTextCard, cardSavingsLabel, popularOfferId, formColors, enableCod, enableCard, defaultPaymentMethod, highlightPaymentMethod, thankYouUrl, webhookUrl, affiliateIdentifier, globalFontSize, sectionHeaderSize, paymentIconsUrl, paymentIconsWidth]);

    return (
        <div className="bg-surface rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
                <div className="lg:col-span-5 border-r border-gray-100 flex flex-col">
                    <div className="flex border-b border-gray-100">
                        {[
                            { id: 'fields', label: 'Campi', icon: <EyeIcon className="w-4 h-4" /> },
                            { id: 'style', label: 'Stile & Offerte', icon: <div className="w-3 h-3 rounded-full bg-primary" /> },
                            { id: 'payment', label: 'Pagamento', icon: <CogIcon className="w-4 h-4" /> },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto max-h-[600px] custom-scrollbar">
                        {activeTab === 'fields' && (
                            <div className="space-y-4">
                                {(Object.entries(fields) as [keyof FormFields, FormFieldConfig][]).map(([name, config]) => (
                                    <div key={name} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black text-gray-700 uppercase">{name.replace('_', ' ')}</span>
                                            <input 
                                                type="checkbox" 
                                                checked={config.visible} 
                                                onChange={e => updateField(name as any, 'visible', e.target.checked)}
                                                className="w-5 h-5 text-primary rounded" 
                                            />
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Etichetta Campo</label>
                                                    <input 
                                                        type="text" 
                                                        value={config.placeholder} 
                                                        onChange={e => updateField(name as any, 'placeholder', e.target.value)}
                                                        className="w-full p-2 text-xs border rounded-lg"
                                                        placeholder="Etichetta..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Larghezza</label>
                                                    <select 
                                                        value={config.width} 
                                                        onChange={e => updateField(name as any, 'width', Number(e.target.value))}
                                                        className="w-full p-2 text-xs border rounded-lg"
                                                    >
                                                        <option value={100}>Larghezza Piena</option>
                                                        <option value={50}>Metà (50%)</option>
                                                        <option value={30}>Piccolo (30%)</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            {name === 'sub_id' && (
                                                <div className="pt-2 border-t border-gray-100">
                                                    <label className="block text-[9px] font-black text-primary uppercase mb-1 italic">Valore Predefinito (Es. FB, ADS_1)</label>
                                                    <input 
                                                        type="text" 
                                                        value={defaultSubId} 
                                                        onChange={e => setDefaultSubId(e.target.value)}
                                                        className="w-full p-2 text-xs border border-primary/20 bg-primary/5 rounded-lg font-bold"
                                                        placeholder="Nessuno"
                                                    />
                                                    <p className="mt-1 text-[8px] text-gray-400 leading-tight">Verrà usato se non viene passato alcun parametro "?subid=" nell'URL.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div className="space-y-6">
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Opzioni Visualizzazione</h4>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={showBundles} 
                                            onChange={e => setShowBundles(e.target.checked)} 
                                            className="w-5 h-5 text-blue-600 rounded border-blue-300 focus:ring-blue-500" 
                                        />
                                        <span className="text-xs font-black text-blue-800 uppercase group-hover:text-blue-600 transition-colors">Mostra Offerte Multi-Pack</span>
                                    </label>
                                    <p className="text-[9px] text-blue-400 font-bold leading-tight uppercase">Se disattivato, il cliente vedrà solo l'offerta base 1x.</p>
                                </div>

                                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Titoli Formulario</h4>
                                    <div>
                                        <label className="block text-[10px] font-black text-primary uppercase mb-1 tracking-widest">Step 1 (Offerta)</label>
                                        <input type="text" value={step1Title} onChange={e => setStep1Title(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-primary uppercase mb-1 tracking-widest">Step 2 (Spedizione)</label>
                                        <input type="text" value={step2Title} onChange={e => setStep2Title(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-primary uppercase mb-1 tracking-widest">Step 3 (Pagamento)</label>
                                        <input type="text" value={step3Title} onChange={e => setStep3Title(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dimensioni Font</h4>
                                    <div>
                                        <label className="block text-[10px] font-black text-primary uppercase mb-2 tracking-widest">Titoli Sezione ({sectionHeaderSize}em)</label>
                                        <input 
                                            type="range" 
                                            min="0.8" 
                                            max="3" 
                                            step="0.1"
                                            value={sectionHeaderSize} 
                                            onChange={e => setSectionHeaderSize(Number(e.target.value))}
                                            className="w-full accent-primary" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-primary uppercase mb-2 tracking-widest">Testo Globale ({globalFontSize}px)</label>
                                        <input 
                                            type="range" 
                                            min="10" 
                                            max="24" 
                                            value={globalFontSize} 
                                            onChange={e => setGlobalFontSize(Number(e.target.value))}
                                            className="w-full accent-primary" 
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personalizzazione Colori</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Colore Titoli</label>
                                            <input type="color" value={formColors.sectionTitleColor} onChange={e => setFormColors({...formColors, sectionTitleColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Colore Labels</label>
                                            <input type="color" value={formColors.labelColor} onChange={e => setFormColors({...formColors, labelColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Sfondo Highlight</label>
                                            <input type="color" value={formColors.highlightColor} onChange={e => setFormColors({...formColors, highlightColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Testo Offerte</label>
                                            <input type="color" value={formColors.offerPriceColor} onChange={e => setFormColors({...formColors, offerPriceColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Colore Testo Risparmio (Es. "Risparmi €...")</label>
                                            <input type="color" value={formColors.savingsTextColor} onChange={e => setFormColors({...formColors, savingsTextColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-blue-600 uppercase mb-3 tracking-widest">Evidenzia Offerta (Badge)</label>
                                        <select 
                                            value={popularOfferId} 
                                            onChange={e => setPopularOfferId(e.target.value)}
                                            className="w-full p-2.5 border border-blue-200 rounded-lg bg-white text-xs font-bold"
                                        >
                                            <option value="">Nessuna</option>
                                            <option value="1">Offerta 1x</option>
                                            {(product.bundleOptions || []).map(b => (
                                                <option key={b.id} value={b.id}>Offerta {b.quantity}x</option>
                                            ))}
                                        </select>
                                    </div>
                                    {popularOfferId && (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                                            <div>
                                                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Badge Sfondo</label>
                                                <input type="color" value={formColors.badgeBgColor} onChange={e => setFormColors({...formColors, badgeBgColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Badge Testo</label>
                                                <input type="color" value={formColors.badgeTextColor} onChange={e => setFormColors({...formColors, badgeTextColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1">Colore Bordo Evidenziato</label>
                                                <input type="color" value={formColors.highlightBorderColor} onChange={e => setFormColors({...formColors, highlightBorderColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pulsanti d'invio</h4>
                                    <div>
                                        <label className="block text-[10px] font-black text-primary uppercase mb-1">Pulsante Contrassegno (COD)</label>
                                        <input type="text" value={buttonTextCod} onChange={e => setButtonTextCod(e.target.value)} className="w-full p-3 border rounded-xl font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-indigo-600 uppercase mb-1">Pulsante Carta Visa / Mastercard...</label>
                                        <input type="text" value={buttonTextCard} onChange={e => setButtonTextCard(e.target.value)} className="w-full p-3 border rounded-xl font-bold italic" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Sfondo Pulsante</label>
                                            <input type="color" value={formColors.buttonBgColor} onChange={e => setFormColors({...formColors, buttonBgColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Testo Pulsante</label>
                                            <input type="color" value={formColors.buttonTextColor} onChange={e => setFormColors({...formColors, buttonTextColor: e.target.value})} className="w-full h-10 p-1 border rounded-lg cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'payment' && (
                            <div className="space-y-6">
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase mb-3 tracking-widest">Metodi di Checkout</p>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={enableCod} onChange={e => setEnableCod(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                                            <span className="text-sm font-bold text-indigo-900">Contrassegno (COD)</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={enableCard} onChange={e => setEnableCard(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
                                            <span className="text-sm font-bold text-indigo-900 italic">Mollie (Carta Visa / Mastercard...)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Metodo Preselezionato</label>
                                        <select 
                                            value={defaultPaymentMethod} 
                                            onChange={e => setDefaultPaymentMethod(e.target.value as any)}
                                            className="w-full p-2.5 border rounded-lg bg-white text-xs font-bold"
                                        >
                                            <option value="cod">Paga alla Consegna (COD)</option>
                                            <option value="card">Carta di Credito / Mollie</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Evidenzia Metodo (Badge)</label>
                                        <select 
                                            value={highlightPaymentMethod} 
                                            onChange={e => setHighlightPaymentMethod(e.target.value as any)}
                                            className="w-full p-2.5 border rounded-lg bg-white text-xs font-bold"
                                        >
                                            <option value="none">Nessuno</option>
                                            <option value="cod">Paga alla Consegna</option>
                                            <option value="card">Carta Visa / Mastercard...</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Etichetta Risparmio Carta</label>
                                        <input 
                                            type="text" 
                                            value={cardSavingsLabel} 
                                            onChange={e => setCardSavingsLabel(e.target.value)} 
                                            placeholder="(Risparmi €{amount})" 
                                            className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-primary/20 outline-none text-xs font-bold" 
                                        />
                                        <p className="mt-1 text-[9px] text-gray-400 uppercase font-medium">Usa <strong>{'{amount}'}</strong> per inserire il risparmio calcolato.</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Loghi Pagamento (Sotto opzione carta)</h4>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">URL Immagine Loghi</label>
                                        <input 
                                            type="text" 
                                            value={paymentIconsUrl} 
                                            onChange={e => setPaymentIconsUrl(e.target.value)}
                                            placeholder="https://..." 
                                            className="w-full p-2.5 border rounded-lg text-xs font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Larghezza Immagine ({paymentIconsWidth}px)</label>
                                        <input 
                                            type="range" 
                                            min="50" 
                                            max="500" 
                                            step="10"
                                            value={paymentIconsWidth} 
                                            onChange={e => setPaymentIconsWidth(Number(e.target.value))}
                                            className="w-full accent-blue-600"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">URL Thank You Page (Redirect)</label>
                                    <input type="url" value={thankYouUrl} onChange={e => setThankYouUrl(e.target.value)} placeholder="https://tuosito.it/grazie" className="w-full p-3 border rounded-xl text-sm" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(`<!-- MWS Conversion Form -->\n${generatedHtml}`);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
                        >
                            {copied ? 'CODICE COPIATO!' : 'COPIA CODICE HTML'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-7 bg-gray-100 flex flex-col items-center p-8">
                    <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                        <button onClick={() => setPreviewDevice('desktop')} className={`p-2 rounded-lg transition-all ${previewDevice === 'desktop' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}><DesktopIcon className="w-5 h-5" /></button>
                        <button onClick={() => setPreviewDevice('mobile')} className={`p-2 rounded-lg transition-all ${previewDevice === 'mobile' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}><MobileIcon className="w-5 h-5" /></button>
                    </div>

                    <div className={`transition-all duration-500 bg-white shadow-2xl overflow-y-auto custom-scrollbar ${previewDevice === 'mobile' ? 'w-[375px] h-[667px] border-[12px] border-slate-900 rounded-[3rem]' : 'w-full h-full max-h-[700px] rounded-2xl border border-gray-200'}`}>
                        <div className="p-4" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
                    </div>
                </div>
            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }`}</style>
        </div>
    );
};

export default FormGenerator;
