
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Affiliate, FormFields, PlatformSettings, FormFieldConfig } from '../types';
import { DesktopIcon } from './icons/DesktopIcon';
import { MobileIcon } from './icons/MobileIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { EyeIcon } from './icons/EyeIcon';
import { CogIcon } from './icons/CogIcon';
import { WalletIcon } from './icons/WalletIcon';
import { PhotoIcon } from './icons/PhotoIcon';

interface FormGeneratorProps {
    product: Product;
    currentAffiliate?: Affiliate;
    platformSettings: PlatformSettings;
}

type LocalizationPreset = 'IT' | 'USA' | 'UK';

const FormGenerator: React.FC<FormGeneratorProps> = ({ product, currentAffiliate, platformSettings }) => {
    const [activeTab, setActiveTab] = useState<'fields' | 'style' | 'payment'>('fields');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [copied, setCopied] = useState(false);
    const [localization, setLocalization] = useState<LocalizationPreset>('IT');

    // CONFIGURAZIONE CAMPI
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

    // CONFIGURAZIONE STILE & TESTI
    const [defaultSubId, setDefaultSubId] = useState('');
    const [showBundles, setShowBundles] = useState(true);
    const [formTitle, setFormTitle] = useState(`Completa il tuo ordine`);
    const [step1Title, setStep1Title] = useState('Scegli la tua Offerta');
    const [step2Title, setStep2Title] = useState('Dati di Spedizione');
    const [step3Title, setStep3Title] = useState('Metodo di Pagamento');
    const [buttonTextCod, setButtonTextCod] = useState('Ordina Ora');
    const [buttonTextCard, setButtonTextCard] = useState('Vai al Checkout');
    const [cardSavingsLabel, setCardSavingsLabel] = useState('(Risparmi €{amount})');
    const [popularOfferId, setPopularOfferId] = useState<string>('1'); 
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

    // CONFIGURAZIONE PAGAMENTI
    const [enableCod, setEnableCod] = useState(true);
    const [enableCard, setEnableCard] = useState(true);
    const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'cod' | 'card'>('cod');
    const [highlightPaymentMethod, setHighlightPaymentMethod] = useState<'none' | 'cod' | 'card'>('card');
    const [thankYouUrl, setThankYouUrl] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');

    const applyLocalizationPreset = (preset: LocalizationPreset) => {
        setLocalization(preset);
        const newFields = { ...fields };
        
        if (preset === 'IT') {
            setFormTitle('Completa il tuo ordine');
            setStep1Title('Scegli la tua Offerta');
            setStep2Title('Dati di Spedizione');
            setStep3Title('Metodo di Pagamento');
            setButtonTextCod('Ordina Ora');
            setButtonTextCard('Vai al Checkout');
            setCardSavingsLabel('(Risparmi €{amount})');
            newFields.name.placeholder = 'Nome e Cognome';
            newFields.phone.placeholder = 'Numero di Telefono';
            newFields.street_address.placeholder = 'Via / Piazza';
            newFields.house_number.placeholder = 'Civico';
            newFields.city.placeholder = 'Città';
            newFields.province.placeholder = 'PR';
            newFields.zip.placeholder = 'CAP';
            newFields.email.placeholder = 'Email (Opzionale)';
        } else if (preset === 'USA') {
            setFormTitle('Complete Your Order');
            setStep1Title('Choose Your Offer');
            setStep2Title('Shipping Details');
            setStep3Title('Payment Method');
            setButtonTextCod('Order Now');
            setButtonTextCard('Proceed to Checkout');
            setCardSavingsLabel('(Save ${amount})');
            newFields.name.placeholder = 'Full Name';
            newFields.phone.placeholder = 'Phone Number';
            newFields.street_address.placeholder = 'Street Address';
            newFields.house_number.placeholder = 'Apt/Suite (Optional)';
            newFields.city.placeholder = 'City';
            newFields.province.placeholder = 'State';
            newFields.zip.placeholder = 'Zip Code';
            newFields.email.placeholder = 'Email Address';
        } else if (preset === 'UK') {
            setFormTitle('Complete Your Order');
            setStep1Title('Choose Your Offer');
            setStep2Title('Delivery Details');
            setStep3Title('Payment Method');
            setButtonTextCod('Order Now');
            setButtonTextCard('Proceed to Checkout');
            setCardSavingsLabel('(Save £{amount})');
            newFields.name.placeholder = 'Full Name';
            newFields.phone.placeholder = 'Phone Number';
            newFields.street_address.placeholder = 'Street Address';
            newFields.house_number.placeholder = 'House Number';
            newFields.city.placeholder = 'Town/City';
            newFields.province.placeholder = 'County';
            newFields.zip.placeholder = 'Postcode';
            newFields.email.placeholder = 'Email Address';
        }
        setFields(newFields);
    };

    useEffect(() => {
        if (product.currency === 'USD') applyLocalizationPreset('USA');
        else if (product.currency === 'GBP') applyLocalizationPreset('UK');
        else applyLocalizationPreset('IT');
    }, [product.currency, product.id]);

    const updateField = (name: keyof FormFields, key: keyof FormFieldConfig, value: any) => {
        setFields(prev => ({
            ...prev,
            [name]: { ...prev[name], [key]: value }
        }));
    };

    const updateColor = (key: keyof typeof formColors, value: string) => {
        setFormColors(prev => ({ ...prev, [key]: value }));
    };

    const affiliateIdentifier = currentAffiliate ? (currentAffiliate.short_id || currentAffiliate.id) : '[ID_AFFILIATO]';
    const affiliateName = currentAffiliate?.name || 'Partner MWS';

    const generatedHtml = useMemo(() => {
        const currencySymbol = product.currency === 'USD' ? '$' : product.currency === 'GBP' ? '£' : '€';
        const popularBadgeText = localization === 'IT' ? 'LA PIÙ SCELTA' : 'BEST VALUE';
        const productsSummaryText = localization === 'IT' ? 'Prezzo Prodotti:' : 'Items Total:';
        const shippingSummaryText = localization === 'IT' ? 'Spedizione:' : 'Shipping:';
        const totalSummaryText = localization === 'IT' ? 'TOTALE ORDINE:' : 'ORDER TOTAL:';
        const freeText = localization === 'IT' ? 'GRATIS' : 'FREE';
        const codText = localization === 'IT' ? 'Paga alla Consegna' : 'Cash on Delivery';
        const cardText = localization === 'IT' ? 'Paga con Carta' : 'Pay by Card';
        const processingText = localization === 'IT' ? 'Elaborazione...' : 'Processing...';
        const secureText = localization === 'IT' ? '🔒 Pagamento criptato SSL' : '🔒 Secure SSL Checkout';

        const renderInput = (id: string, config: FormFieldConfig, type = "text") => {
            if (!config.visible) {
                if (id === 'subId') return `<input type="hidden" name="subId" value="${defaultSubId}">`;
                return '';
            }
            const widthStyle = `width: ${config.width}%;`;
            return `
    <div style="${widthStyle} padding: 0 5px; margin-bottom: 12px; box-sizing: border-box;">
        <label style="display: block; margin-bottom: 4px; font-size: 0.85em; font-weight: 700; color: ${formColors.labelColor}">${config.placeholder}</label>
        <input type="${type}" name="${id}" ${config.required ? 'required' : ''} placeholder="${config.placeholder}" style="width: 100%; padding: 12px; border: 1.5px solid ${formColors.inputBorderColor}; border-radius: 10px; box-sizing: border-box; font-size: 1em; outline: none;">
    </div>`;
        };

        const renderOfferCard = (id: string, label: string, price: number, qty: number, isPopular: boolean) => {
            const unitPrice = product.price;
            const savings = (unitPrice * qty) - price;
            const savingsText = savings > 0 ? `<div style="color: ${formColors.savingsTextColor}; font-size: 0.9em; font-weight: 700; margin-top: 2px;">(${localization === 'IT' ? 'Risparmi' : 'Save'} ${currencySymbol}${savings.toFixed(2)})</div>` : '';
            
            // isDefaultChecked rimane fisso su ID '1'
            const isDefaultChecked = id === '1';
            
            const cardBg = isPopular ? formColors.highlightColor : '#ffffff';
            // MODIFICA: Il bordo viene applicato solo se l'offerta è quella 'Popolare'.
            // L'offerta di base (ID '1') non ha bordo a meno che non sia essa stessa la popolare.
            const borderStyle = isPopular ? `border: 2.5px solid ${formColors.highlightBorderColor}` : 'border: 1.5px solid #e5e7eb';
            
            return `
        <label style="display: block; position: relative; cursor: pointer; margin-bottom: 15px; ${borderStyle}; border-radius: 14px; background: ${cardBg}; padding: 18px; transition: all 0.2s; box-sizing: border-box;" class="mws-offer-card" data-id="${id}" data-price="${price}" data-qty="${qty}">
            ${isPopular ? `<div style="position: absolute; top: -14px; right: 12px; background: ${formColors.badgeBgColor}; color: ${formColors.badgeTextColor}; padding: 4px 14px; border-radius: 8px; font-size: 0.75em; font-weight: 900; text-transform: uppercase; z-index: 10; box-shadow: 0 3px 6px rgba(0,0,0,0.15);">${popularBadgeText}</div>` : ''}
            <div style="display: flex; align-items: center; gap: 14px;">
                <input type="radio" name="offer" value="${id}" ${isDefaultChecked ? 'checked' : ''} style="width: 1.4em; height: 1.4em; cursor: pointer; accent-color: ${formColors.highlightBorderColor}; margin: 0;">
                <div style="flex-grow: 1;">
                    <div style="font-size: 1.25em; font-weight: 800; color: ${formColors.offerPriceColor};">${localization === 'IT' ? 'Offerta' : 'Bundle'} ${qty}x - <span style="color: ${formColors.sectionTitleColor}">${currencySymbol}${price.toFixed(2)}</span></div>
                    ${savingsText}
                </div>
            </div>
        </label>`;
        };

        const codShipping = product.shippingCharge || 0;
        const cardShipping = product.shippingChargeCard || 0;
        const savingsOnCard = Math.max(0, codShipping - cardShipping);
        const displaySavings = cardSavingsLabel.replace('{amount}', savingsOnCard.toFixed(2));
        const savingsHtml = (savingsOnCard > 0) ? `<span style="color: ${formColors.savingsTextColor}; font-weight: 900; margin-left: 6px; text-decoration: underline; text-underline-offset: 3px; display: block; margin-top: 4px;">${displaySavings}</span>` : '';
        const badgeHtml = `<div style="position: absolute; top: -10px; right: 10px; background: ${formColors.badgeBgColor}; color: ${formColors.badgeTextColor}; padding: 2px 8px; border-radius: 4px; font-size: 0.65em; font-weight: 900; text-transform: uppercase; z-index: 1;">${localization === 'IT' ? 'PIÙ SCELTO' : 'RECOMMENDED'}</div>`;
        const sectionHeaderStyleString = `color: ${formColors.sectionTitleColor}; font-size: ${sectionHeaderSize}em; font-weight: 900; text-align: left;`;

        const paymentMethodsHtml = (enableCod || enableCard) ? `
    <div style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px">
        <h2 style="${sectionHeaderStyleString} margin-bottom: 18px;">${step3Title}</h2>
        <div style="display: flex; flex-direction: column; gap: 10px;">
            ${enableCod ? `
            <label style="display: flex; align-items: center; position: relative; cursor: pointer; padding: 15px; border: 2px solid #eee; border-radius: 12px; transition: all 0.2s;" id="label-cod">
                ${highlightPaymentMethod === 'cod' ? badgeHtml : ''}
                <input type="radio" name="paymentMethod" value="cod" ${defaultPaymentMethod === 'cod' ? 'checked' : ''} style="margin-right: 12px; width: 1.2em; height: 1.2em; accent-color: ${formColors.sectionTitleColor}">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 1em; font-weight: 700; color: ${formColors.labelColor}">${codText}</span>
                    ${codShipping > 0 ? `<span style="font-size: 0.8em; color: #6b7280;">${localization === 'IT' ? 'Spedizione' : 'Shipping'}: +${currencySymbol}${codShipping.toFixed(2)}</span>` : ''}
                </div>
            </label>` : ''}
            ${enableCard ? `
            <label style="display: flex; align-items: center; position: relative; cursor: pointer; padding: 15px; border: 2px solid #eee; border-radius: 12px; transition: all 0.2s;" id="label-card">
                ${highlightPaymentMethod === 'card' ? badgeHtml : ''}
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <div style="display: flex; align-items: center; width: 100%;">
                        <input type="radio" name="paymentMethod" value="card" ${defaultPaymentMethod === 'card' ? 'checked' : ''} style="margin-right: 12px; width: 1.2em; height: 1.2em; accent-color: #4338ca">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 1em; font-weight: 700; color: #4338ca">${cardText}</span>
                            ${savingsHtml}
                        </div>
                    </div>
                    ${paymentIconsUrl ? `<img src="${paymentIconsUrl}" style="width: ${paymentIconsWidth}px; margin-top: 10px; margin-left: 30px; max-width: 100%; display: block;" alt="Payments">` : ''}
                </div>
            </label>` : ''}
        </div>
    </div>` : '';

        return `
<div id="mws-form-container" style="max-width: 500px; margin: 20px auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: ${globalFontSize}px; box-sizing: border-box; color: #1e293b;">
<form id="mws-order-form" style="background: #ffffff; padding: 30px; border-radius: 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); border: 1.5px solid #f1f5f9; box-sizing: border-box;">
    <input type="hidden" name="uid" value="${product.id}">
    <input type="hidden" name="key" value="${affiliateIdentifier}">
    <input type="hidden" name="affiliateName" value="${affiliateName}">
    <input type="hidden" name="redirectUrl" value="${thankYouUrl}">
    <input type="hidden" name="webhookUrl" value="${webhookUrl}">
    <input type="hidden" name="currency" value="${product.currency || 'EUR'}">
    <input type="hidden" name="ip_country" id="geo_country">
    <input type="hidden" name="ip_city" id="geo_city">
    <input type="hidden" name="ip_flag" id="geo_flag">

    <h1 style="color: ${formColors.titleColor}; font-size: 1.8em; font-weight: 900; margin-bottom: 25px; text-align: center;">${formTitle}</h1>

    <h2 style="${sectionHeaderStyleString} margin-bottom: 18px; ${!showBundles ? 'display: none;' : ''}">${step1Title}</h2>
    <div style="margin-bottom: 25px; ${!showBundles ? 'display: none;' : ''}">
        ${renderOfferCard('1', '1x', product.price, 1, popularOfferId === '1')}
        ${(product.bundleOptions || []).map(b => renderOfferCard(b.id, `${b.quantity}x`, b.price, b.quantity, popularOfferId === b.id)).join('')}
    </div>

    <h2 style="${sectionHeaderStyleString} margin: 35px 0 18px 0;">${step2Title}</h2>
    <div style="display: flex; flex-wrap: wrap; margin: 0 -5px;">
        ${renderInput('name', fields.name)}
        ${renderInput('tel', fields.phone, 'tel')}
        ${renderInput('customer_street_address', fields.street_address)}
        ${renderInput('customer_house_number', fields.house_number)}
        ${renderInput('customer_city', fields.city)}
        ${renderInput('customer_province', fields.province)}
        ${renderInput('customer_zip', fields.zip)}
        ${renderInput('customerEmail', fields.email, 'email')}
        ${renderInput('subId', fields.sub_id)}
    </div>

    ${paymentMethodsHtml}

    <div style="margin-top: 30px; background: #f8fafc; padding: 25px; border-radius: 18px; border: 1.5px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; font-size: 1em; color: #64748b; margin-bottom: 6px;">
            <span>${productsSummaryText}</span>
            <span id="mws-summary-price">${currencySymbol}0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1em; color: #64748b; margin-bottom: 10px;">
            <span>${shippingSummaryText}</span>
            <span id="mws-summary-shipping" style="font-weight: 700;">${freeText}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.4em; font-weight: 900; color: ${formColors.sectionTitleColor}; border-top: 2px solid #e2e8f0; padding-top: 12px;">
            <span>${totalSummaryText}</span>
            <span id="mws-summary-total">${currencySymbol}0.00</span>
        </div>
    </div>

    <div id="mws-error-msg" style="color: #ef4444; font-size: 0.9em; margin: 20px 0; text-align: center; font-weight: 700; padding: 12px; background: #fff1f2; border-radius: 10px; display: none;"></div>
    
    <button type="submit" id="mws-submit-btn" style="width: 100%; margin-top: 20px; padding: 20px; background: ${formColors.buttonBgColor}; color: ${formColors.buttonTextColor}; border: none; border-radius: 15px; cursor: pointer; font-size: 1.4em; font-weight: 900; text-transform: uppercase; transition: all 0.2s; box-shadow: 0 6px 15px rgba(0,0,0,0.15);">
        ${buttonTextCod}
    </button>
    <p style="text-align: center; color: #9ca3af; font-size: 0.8em; margin-top: 18px; font-weight: 500;">${secureText}</p>
</form>

<script type="module">
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient('https://radhkbocafjpglgmbpyy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhZGhrYm9jYWZqcGdsZ21icHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NzcwNDcsImV4cCI6MjA4MjE1MzA0N30.BtUupmNUJ1CA8X8FGRSyh6VgNXLSYM-WrajbsUED5FM');

const form = document.getElementById('mws-order-form');
const btn = document.getElementById('mws-submit-btn');
const err = document.getElementById('mws-error-msg');
const sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);

async function initGeo() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        document.getElementById('geo_country').value = data.country_name || '';
        document.getElementById('geo_city').value = data.city || '';
        document.getElementById('geo_flag').value = \`https://flagcdn.com/w20/\${data.country_code.toLowerCase()}.png\`;
        
        await supabase.from('form_sessions').upsert({
            session_id: sessionId,
            product_id: '${product.id}',
            product_name: '${product.name.replace(/'/g, "\\'")}',
            affiliate_id: '${affiliateIdentifier}',
            affiliate_name: '${affiliateName.replace(/'/g, "\\'")}',
            updated_at: new Date().toISOString(),
            ip_country: data.country_name || 'Sconosciuto',
            ip_city: data.city || '',
            ip_flag: \`https://flagcdn.com/w20/\${data.country_code.toLowerCase()}.png\`,
            user_agent: navigator.userAgent
        });
    } catch(e) {}
}
initGeo();

function updateTotal() {
    const isBundlesVisible = ${showBundles};
    let selectedOfferCard = isBundlesVisible ? form.querySelector('input[name="offer"]:checked')?.closest('.mws-offer-card') : null;
    const basePrice = selectedOfferCard ? parseFloat(selectedOfferCard.getAttribute('data-price')) : ${product.price};
    const method = form.querySelector('input[name="paymentMethod"]:checked')?.value || 'cod';
    const shipping = (method === 'card') ? ${cardShipping} : ${codShipping};
    const total = basePrice + shipping;
    document.getElementById('mws-summary-price').innerText = "${currencySymbol}" + basePrice.toFixed(2);
    document.getElementById('mws-summary-shipping').innerText = shipping === 0 ? '${freeText}' : "${currencySymbol}" + shipping.toFixed(2);
    document.getElementById('mws-summary-total').innerText = "${currencySymbol}" + total.toFixed(2);
}

form.addEventListener('change', (e) => {
    updateTotal();
    if (e.target.name === 'paymentMethod') {
        btn.innerText = e.target.value === 'card' ? '${buttonTextCard}' : '${buttonTextCod}';
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.innerText = '${processingText}';
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    
    if (data.paymentMethod === 'card') {
        const res = await supabase.functions.invoke('create-mollie-payment', { body: data });
        if (res.data?.checkoutUrl) window.location.href = res.data.checkoutUrl;
        else {
            err.style.display = 'block';
            err.innerText = res.data?.error || "Errore inizializzazione pagamento.";
            btn.disabled = false;
        }
    } else {
        const res = await supabase.functions.invoke('import-lead', { body: data });
        if (res.data?.success) window.location.href = data.redirectUrl || '/grazie';
        else {
            err.style.display = 'block';
            err.innerText = res.data?.error || "Errore durante l'invio dell'ordine.";
            btn.disabled = false;
        }
    }
});
updateTotal();
</script>
</div>`.trim();
    }, [product, fields, defaultSubId, showBundles, formTitle, step1Title, step2Title, step3Title, buttonTextCod, buttonTextCard, cardSavingsLabel, popularOfferId, formColors, enableCod, enableCard, defaultPaymentMethod, highlightPaymentMethod, thankYouUrl, webhookUrl, affiliateIdentifier, affiliateName, globalFontSize, sectionHeaderSize, paymentIconsUrl, paymentIconsWidth, localization]);

    return (
        <div className="bg-surface rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[650px]">
                <div className="lg:col-span-5 border-r border-gray-100 flex flex-col">
                    <div className="flex border-b border-gray-100">
                        <button onClick={() => setActiveTab('fields')} className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'fields' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <EyeIcon className="w-4 h-4" /> Campi
                        </button>
                        <button onClick={() => setActiveTab('style')} className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'style' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <PhotoIcon className="w-4 h-4" /> Stile & Offerte
                        </button>
                        <button onClick={() => setActiveTab('payment')} className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'payment' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <WalletIcon className="w-4 h-4" /> Pagamento
                        </button>
                    </div>

                    <div className="p-6 flex-grow overflow-y-auto max-h-[600px] custom-scrollbar space-y-6">
                        {activeTab === 'fields' && (
                            <div className="space-y-4">
                                {(Object.entries(fields) as [keyof FormFields, FormFieldConfig][]).map(([name, config]) => (
                                    <div key={name} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">{name.replace('_', ' ')}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-gray-400 uppercase">Obbligatorio:</span>
                                                <input type="checkbox" checked={config.required} onChange={e => updateField(name as any, 'required', e.target.checked)} className="w-4 h-4 text-primary rounded" />
                                                <input type="checkbox" checked={config.visible} onChange={e => updateField(name as any, 'visible', e.target.checked)} className="w-5 h-5 text-primary rounded" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" value={config.placeholder} onChange={e => updateField(name as any, 'placeholder', e.target.value)} className="w-full p-2 text-xs border rounded-lg" placeholder="Placeholder..." />
                                            <select value={config.width} onChange={e => updateField(name as any, 'width', Number(e.target.value))} className="w-full p-2 text-xs border rounded-lg">
                                                <option value={100}>Pieno (100%)</option>
                                                <option value={50}>Metà (50%)</option>
                                                <option value={30}>Piccolo (30%)</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div className="space-y-8 pb-10">
                                {/* SEZIONE TESTI & TITOLI */}
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">1. Testi & Sezioni</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Titolo Principale</label>
                                            <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full p-2 text-xs border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Titolo Step 1 (Offerte)</label>
                                            <input type="text" value={step1Title} onChange={e => setStep1Title(e.target.value)} className="w-full p-2 text-xs border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Titolo Step 2 (Dati)</label>
                                            <input type="text" value={step2Title} onChange={e => setStep2Title(e.target.value)} className="w-full p-2 text-xs border rounded-lg" />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                                        <input type="checkbox" checked={showBundles} onChange={e => setShowBundles(e.target.checked)} className="w-4 h-4" />
                                        <span className="text-[10px] font-black text-blue-800 uppercase">Mostra Offerte Multi-Pack</span>
                                    </label>
                                    <div className="pt-2">
                                        <label className="block text-[9px] font-black text-blue-500 uppercase mb-1">ID Offerta Predefinita</label>
                                        <select value={popularOfferId} onChange={e => setPopularOfferId(e.target.value)} className="w-full p-2 text-xs border rounded-lg">
                                            <option value="">Nessuna</option>
                                            <option value="1">Offerta 1x (Base)</option>
                                            {(product.bundleOptions || []).map(b => (
                                                <option key={b.id} value={b.id}>Offerta {b.quantity}x</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {/* SEZIONE COLORI GENERALI */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1 italic">2. Colori Generali & Tipografia</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Colore Titoli</label>
                                            <input type="color" value={formColors.titleColor} onChange={e => updateColor('titleColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Colore Labels</label>
                                            <input type="color" value={formColors.labelColor} onChange={e => updateColor('labelColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Bordi Input</label>
                                            <input type="color" value={formColors.inputBorderColor} onChange={e => updateColor('inputBorderColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Titoli Sez.</label>
                                            <input type="color" value={formColors.sectionTitleColor} onChange={e => updateColor('sectionTitleColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[9px] font-bold text-gray-400 mb-1">Font Base (px)</label>
                                                <input type="number" value={globalFontSize} onChange={e => setGlobalFontSize(Number(e.target.value))} className="w-full p-2 text-xs border rounded-lg" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[9px] font-bold text-gray-400 mb-1">Size Titoli (em)</label>
                                                <input type="number" step="0.1" value={sectionHeaderSize} onChange={e => setSectionHeaderSize(Number(e.target.value))} className="w-full p-2 text-xs border rounded-lg" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SEZIONE STILE OFFERTE & HIGHLIGHT */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1 italic">3. Stile Offerte & Highlight</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Sfondo Highlight</label>
                                            <input type="color" value={formColors.highlightColor} onChange={e => updateColor('highlightColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Bordo Highlight</label>
                                            <input type="color" value={formColors.highlightBorderColor} onChange={e => updateColor('highlightBorderColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Testo Offerte</label>
                                            <input type="color" value={formColors.offerPriceColor} onChange={e => updateColor('offerPriceColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Testo Risparmio</label>
                                            <input type="color" value={formColors.savingsTextColor} onChange={e => updateColor('savingsTextColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Badge Sfondo</label>
                                            <input type="color" value={formColors.badgeBgColor} onChange={e => updateColor('badgeBgColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Badge Testo</label>
                                            <input type="color" value={formColors.badgeTextColor} onChange={e => updateColor('badgeTextColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                    </div>
                                </div>

                                {/* SEZIONE PULSANTI INVIO */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1 italic">4. Pulsanti d'invio</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Pulsante Contrassegno (COD)</label>
                                            <input type="text" value={buttonTextCod} onChange={e => setButtonTextCod(e.target.value)} className="w-full p-2 text-xs border rounded-lg" placeholder="Ordina Ora" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Pulsante Carta (Visa/Mastercard...)</label>
                                            <input type="text" value={buttonTextCard} onChange={e => setButtonTextCard(e.target.value)} className="w-full p-2 text-xs border rounded-lg" placeholder="Vai al Checkout" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Sfondo Pulsante</label>
                                            <input type="color" value={formColors.buttonBgColor} onChange={e => updateColor('buttonBgColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                        <div className="p-3 bg-gray-50 border rounded-xl">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Testo Pulsante</label>
                                            <input type="color" value={formColors.buttonTextColor} onChange={e => updateColor('buttonTextColor', e.target.value)} className="w-full h-8 cursor-pointer rounded-lg border-none bg-transparent" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'payment' && (
                            <div className="space-y-6">
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Integrazione Pagamenti</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="flex items-center gap-2 p-2 bg-white border rounded-lg cursor-pointer">
                                            <input type="checkbox" checked={enableCod} onChange={e => setEnableCod(e.target.checked)} className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase">Contrassegno</span>
                                        </label>
                                        <label className="flex items-center gap-2 p-2 bg-white border rounded-lg cursor-pointer">
                                            <input type="checkbox" checked={enableCard} onChange={e => setEnableCard(e.target.checked)} className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase">Carta (Mollie)</span>
                                        </label>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Metodo Preselezionato</label>
                                        <select value={defaultPaymentMethod} onChange={e => setDefaultPaymentMethod(e.target.value as any)} className="w-full p-2.5 border rounded-xl bg-white font-bold text-xs focus:ring-2 focus:ring-primary/20 outline-none">
                                            <option value="cod">Paga alla Consegna (COD)</option>
                                            <option value="card">Carta di Credito</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Evidenzia Metodo (Badge)</label>
                                        <select value={highlightPaymentMethod} onChange={e => setHighlightPaymentMethod(e.target.value as any)} className="w-full p-2.5 border rounded-xl bg-white font-bold text-xs focus:ring-2 focus:ring-primary/20 outline-none">
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
                                            className="w-full p-2.5 border rounded-xl bg-white font-bold text-xs focus:ring-2 focus:ring-primary/20 outline-none" 
                                        />
                                        <p className="mt-1 text-[9px] text-gray-400 font-bold uppercase italic">Usa {'{amount}'} per inserire il risparmio calcolato.</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-4">
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tracking & Webhooks</h4>
                                    <input type="text" value={thankYouUrl} onChange={e => setThankYouUrl(e.target.value)} placeholder="URL Thank You Page (Redirect)" className="w-full p-2 text-xs border rounded-lg" />
                                    <input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="URL Webhook specifico (Make/Zapier)" className="w-full p-2 text-xs border rounded-lg" />
                                </div>

                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Icone Metodi Pagamento</h4>
                                    <input type="text" value={paymentIconsUrl} onChange={e => setPaymentIconsUrl(e.target.value)} placeholder="URL Icone (PNG trasparente)" className="w-full p-2 text-xs border rounded-lg" />
                                    <div className="flex items-center gap-4">
                                        <label className="text-[9px] font-black text-gray-400 uppercase">Larghezza (px):</label>
                                        <input type="number" value={paymentIconsWidth} onChange={e => setPaymentIconsWidth(Number(e.target.value))} className="w-20 p-2 text-xs border rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(`<!-- MWS CONVERSION FORM 2.0 -->\n${generatedHtml}`);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm uppercase tracking-widest"
                        >
                            {copied ? '✓ CODICE COPIATO!' : 'GENERA E COPIA HTML'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-7 bg-slate-100 flex flex-col items-center p-10">
                    <div className="flex gap-4 mb-6">
                        <button onClick={() => setPreviewDevice('desktop')} className={`p-3 rounded-xl shadow-sm transition-all ${previewDevice === 'desktop' ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}><DesktopIcon /></button>
                        <button onClick={() => setPreviewDevice('mobile')} className={`p-3 rounded-xl shadow-sm transition-all ${previewDevice === 'mobile' ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}><MobileIcon /></button>
                    </div>
                    <div className={`transition-all duration-500 bg-white shadow-2xl overflow-y-auto custom-scrollbar ${previewDevice === 'mobile' ? 'w-[375px] h-[667px] border-[12px] border-slate-900 rounded-[3rem]' : 'w-full h-full max-h-[700px] rounded-2xl border border-gray-200'}`}>
                        <div className="p-4" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
                    </div>
                </div>
            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
        </div>
    );
};

export default FormGenerator;
