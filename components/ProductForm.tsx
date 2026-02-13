
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Affiliate, BundleOption, FormFields, UserRole, ProductLink, ProductVariant } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { GoogleGenAI, Type } from "@google/genai";
import { LinkIcon } from './icons/LinkIcon';

interface ProductFormProps {
  product?: Product | null;
  allProducts?: Product[]; // Passato da App per controllare esistenza ID
  affiliates: Affiliate[];
  niches: string[];
  onSave: (productData: Partial<Product> & { imageFile?: File | null, newImageFiles?: File[] }) => Promise<void>;
  onClose: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, allProducts = [], affiliates, niches, onSave, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [galleryImageUrls, setGalleryImageUrls] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [galleryUrlInput, setGalleryUrlInput] = useState(''); 
  const [niche, setNiche] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedAffiliateIds, setSelectedAffiliateIds] = useState<string[]>([]);
  const [currency, setCurrency] = useState<'EUR' | 'USD' | 'GBP'>('EUR');
  
  const [costOfGoods, setCostOfGoods] = useState(0);
  
  // COD Specifics
  const [price, setPrice] = useState(0);
  const [commissionValue, setCommissionValue] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [fulfillmentCost, setFulfillmentCost] = useState(0);
  const [platformFee, setPlatformFee] = useState(0);
  const [customerCareCommission, setCustomerCareCommission] = useState(0);

  // Card Specifics
  const [priceCard, setPriceCard] = useState(0);
  const [commissionValueCard, setCommissionValueCard] = useState(0);
  const [shippingCostCard, setShippingCostCard] = useState(0);
  const [shippingChargeCard, setShippingChargeCard] = useState(0);
  const [fulfillmentCostCard, setFulfillmentCostCard] = useState(0);
  const [platformFeeCard, setPlatformFeeCard] = useState(0);
  const [customerCareCommissionCard, setCustomerCareCommissionCard] = useState(0);

  const [approvalTolerance, setApprovalTolerance] = useState(0);
  const [approvalFrequencyDays, setApprovalFrequencyDays] = useState(7);
  const [bundles, setBundles] = useState<BundleOption[]>([]);
  const [freeShipping, setFreeShipping] = useState(true);
  
  const [productType, setProductType] = useState<'simple' | 'variant'>('simple');
  const [stockQuantity, setStockQuantity] = useState(0);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [stockVisibilityRoles, setStockVisibilityRoles] = useState<UserRole[]>([UserRole.ADMIN, UserRole.MANAGER]);

  const [landingPages, setLandingPages] = useState<ProductLink[]>([]);
  const [creatives, setCreatives] = useState<ProductLink[]>([]);
  const [newLanding, setNewLanding] = useState({ label: '', url: '' });
  const [newCreative, setNewCreative] = useState({ label: '', url: '' });
  const [variant_bundle_label, setVariantBundleLabel] = useState('Scegli la variante (Prodotto {n})');

  const [weight, setWeight] = useState(1);
  const [height, setHeight] = useState(2);
  const [width, setWidth] = useState(2);
  const [depth, setDepth] = useState(2);
  const [shipmentType, setShipmentType] = useState(1);
  const [packageContentType, setPackageContentType] = useState<'GOODS' | 'DOCUMENTS'>('GOODS');
  const [paccofacileDefaultSize, setPaccofacileDefaultSize] = useState('');

  const [commissionOverrides, setCommissionOverrides] = useState<{ [key: string]: string }>({});

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const initialCurrencyRef = useRef<string>('');

  // Determina se stiamo modificando o creando (usato per i testi dei pulsanti)
  const isEditingRealProduct = useMemo(() => {
    if (!product?.id) return false;
    return allProducts.some(p => p.id === product.id);
  }, [product, allProducts]);

  const symbol = useMemo(() => {
    if (currency === 'USD') return '$';
    if (currency === 'GBP') return '£';
    return '€';
  }, [currency]);

  // Calcolo Profitto COD
  const estimatedNetProfit = useMemo(() => {
    const totalRevenue = price + shippingCharge;
    const totalCosts = costOfGoods + shippingCost + fulfillmentCost + platformFee + customerCareCommission + commissionValue;
    return totalRevenue - totalCosts;
  }, [price, costOfGoods, shippingCost, shippingCharge, fulfillmentCost, platformFee, customerCareCommission, commissionValue]);

  // Calcolo Profitto CARTA
  const estimatedNetProfitCard = useMemo(() => {
    const effectivePrice = priceCard || price;
    const effectiveComm = commissionValueCard || commissionValue;
    const effectiveFulfillment = fulfillmentCostCard || fulfillmentCost;
    const effectivePlatformFee = platformFeeCard || platformFee;
    const effectiveCC = customerCareCommissionCard || customerCareCommission;

    const totalRevenue = effectivePrice + shippingChargeCard;
    const totalCosts = costOfGoods + shippingCostCard + effectiveFulfillment + effectivePlatformFee + effectiveCC + effectiveComm;
    return totalRevenue - totalCosts;
  }, [price, priceCard, costOfGoods, shippingCostCard, shippingChargeCard, fulfillmentCost, fulfillmentCostCard, platformFee, platformFeeCard, customerCareCommission, customerCareCommissionCard, commissionValue, commissionValueCard]);

  useEffect(() => {
    const sortedNiches = [...niches].sort((a, b) => a.localeCompare(b));
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      if (descriptionEditorRef.current) {
        descriptionEditorRef.current.innerHTML = product.description || '';
      }
      setPrice(product.price || 0);
      setCommissionValue(product.commissionValue || 0);
      setPriceCard(product.priceCard || 0);
      setCommissionValueCard(product.commissionValueCard || 0);
      setImageUrl(product.imageUrl || '');
      setImagePreview(product.imageUrl || '');
      setGalleryImageUrls(product.galleryImageUrls || []);
      setNewImageFiles([]);
      setImageFile(null);
      setNiche(product.niche || (sortedNiches.length > 0 ? sortedNiches[0] : ''));
      setRefNumber(product.refNumber || '');
      setIsActive(product.isActive ?? true);
      setIsPublic(product.allowedAffiliateIds === null);
      setSelectedAffiliateIds(product.allowedAffiliateIds || []);
      setCurrency(product.currency || 'EUR');
      initialCurrencyRef.current = product.currency || 'EUR';
      setCostOfGoods(product.costOfGoods || 0);
      setShippingCost(product.shippingCost || 0);
      setShippingCharge(product.shippingCharge || 0);
      setShippingCostCard(product.shippingCostCard || 0);
      setShippingChargeCard(product.shippingChargeCard || 0);
      setFreeShipping(product.freeShipping ?? true);
      
      setFulfillmentCost(product.fulfillmentCost || 0);
      setPlatformFee(product.platformFee || 0);
      setCustomerCareCommission(product.customerCareCommission || 0);
      
      setFulfillmentCostCard(product.fulfillmentCostCard || 0);
      setPlatformFeeCard(product.platformFeeCard || 0);
      setCustomerCareCommissionCard(product.customerCareCommissionCard || 0);

      setApprovalTolerance(product.approvalTolerance || 0);
      setApprovalFrequencyDays(product.approvalFrequencyDays || 7);
      setBundles(product.bundleOptions?.map(b => ({...b})) || []); 

      if (product.variants && product.variants.length > 0) {
        setProductType('variant');
        setVariants(product.variants.map(v => ({ ...v })));
        setStockQuantity(0);
      } else {
        setProductType('simple');
        setStockQuantity(product.stockQuantity ?? 0);
        setVariants([]);
      }

      setStockVisibilityRoles(product.stockVisibilityRoles || [UserRole.ADMIN, UserRole.MANAGER]);
      setLandingPages(product.landingPages || []);
      setCreatives(product.creatives || []);
      setVariantBundleLabel(product.variant_bundle_label || 'Scegli la variante (Prodotto {n})');

      setWeight(product.weight || 1);
      setHeight(product.height || 2);
      setWidth(product.width || 2);
      setDepth(product.depth || 2);
      setShipmentType(product.shipmentType || 1);
      setPackageContentType(product.package_content_type || 'GOODS');
      setPaccofacileDefaultSize(product.paccofacile_default_size || '');

      const overrides: { [key: string]: string } = {};
      if (product.affiliateCommissionOverrides) {
        for (const affId in product.affiliateCommissionOverrides) {
            overrides[affId] = String(product.affiliateCommissionOverrides[affId]);
        }
      }
      setCommissionOverrides(overrides);

    } else {
        const placeholderUrl = `https://picsum.photos/seed/${Date.now()}/400/300`;
        setName('');
        setDescription('');
        if (descriptionEditorRef.current) {
            descriptionEditorRef.current.innerHTML = '';
        }
        setPrice(0);
        setCommissionValue(0);
        setPriceCard(0);
        setCommissionValueCard(0);
        setImageUrl(placeholderUrl);
        setImagePreview(placeholderUrl);
        setGalleryImageUrls([]);
        setNewImageFiles([]);
        setImageFile(null);
        setNiche(sortedNiches.length > 0 ? sortedNiches[0] : '');
        setRefNumber(`MWS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`);
        setIsActive(true);
        setIsPublic(true);
        setSelectedAffiliateIds([]);
        setCurrency('EUR');
        initialCurrencyRef.current = 'EUR';
        setCostOfGoods(0);
        setShippingCost(0);
        setShippingCharge(0);
        setShippingCostCard(0);
        setShippingChargeCard(0);
        setFulfillmentCost(0);
        setPlatformFee(0);
        setCustomerCareCommission(0);
        setFulfillmentCostCard(0);
        setPlatformFeeCard(0);
        setCustomerCareCommissionCard(0);
        setFreeShipping(true);
        setApprovalTolerance(0);
        setApprovalFrequencyDays(7);
        setCommissionOverrides({});
        setBundles([]);
        setProductType('simple');
        setStockQuantity(0);
        setVariants([]);
        setStockVisibilityRoles([UserRole.ADMIN, UserRole.MANAGER]);
        setLandingPages([]);
        setCreatives([]);
        setVariantBundleLabel('Scegli la variante (Prodotto {n})');
        setWeight(1);
        setHeight(2);
        setWidth(2);
        setDepth(2);
        setShipmentType(1);
        setPackageContentType('GOODS');
        setPaccofacileDefaultSize('');
    }
  }, [product, niches]);

  const handleCurrencyChange = async (newCurrency: 'EUR' | 'USD' | 'GBP') => {
    setCurrency(newCurrency);

    // Se stiamo modificando una copia (duplicato) e cambiamo valuta, proponiamo la traduzione
    if (!isEditingRealProduct && product && newCurrency !== initialCurrencyRef.current) {
        if (window.confirm(`Hai selezionato ${newCurrency}. Vuoi che Gemini AI traduca automaticamente il nome, la descrizione e le varianti del prodotto nella lingua del mercato di destinazione?`)) {
            await handleAutoTranslate(newCurrency);
        }
    }
  };

  const handleAutoTranslate = async (targetCurrency: string) => {
    setIsTranslating(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const targetLang = targetCurrency === 'EUR' ? 'Italian' : 'English';
        const targetRegion = targetCurrency === 'USD' ? 'USA' : targetCurrency === 'GBP' ? 'UK' : 'Italy';

        const prompt = `Translate the following e-commerce product data into ${targetLang} (localized for ${targetRegion}).
        Return the result EXCLUSIVELY in valid JSON format with these exact keys: "name", "description", "variants", "variant_bundle_label".
        Maintain all HTML tags in the description. Translate all variant names.
        
        DATA TO TRANSLATE:
        - Name: ${name}
        - Description: ${description}
        - Variant Bundle Label: ${variant_bundle_label}
        - Variants: ${JSON.stringify(variants.map(v => v.name))}
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        variant_bundle_label: { type: Type.STRING },
                        variants: { 
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["name", "description", "variants", "variant_bundle_label"]
                }
            }
        });

        const result = JSON.parse(response.text);
        
        setName(result.name);
        setDescription(result.description);
        if (descriptionEditorRef.current) {
            descriptionEditorRef.current.innerHTML = result.description;
        }
        setVariantBundleLabel(result.variant_bundle_label);
        
        setVariants(prev => prev.map((v, i) => ({
            ...v,
            name: result.variants[i] || v.name
        })));

    } catch (e) {
        console.error("Translation Error:", e);
        alert("Errore durante la traduzione automatica.");
    } finally {
        setIsTranslating(false);
    }
  };

  const fileToGenerativePart = async (file: File) => {
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: {
        data: base64Data,
        mimeType: file.type,
      },
    };
  };

  const handleGenerateAI = async () => {
    if (!name.trim()) return alert("Inserisci prima il nome del prodotto.");
    
    setIsGeneratingAI(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const parts: any[] = [
            { text: `Sei un copywriter esperto di e-commerce. Crea una descrizione accattivante e professionale per il prodotto "${name}". 
            Ho allegato delle immagini del prodotto: analizzale attentamente per descrivere dettagli reali come materiali, colori e funzioni.
            Usa un tono persuasivo e orientato alla vendita, focalizzandoti sui benefici per il consumatore finale.
            Includi una lista puntata delle caratteristiche principali.
            Rispondi ESCLUSIVAMENTE con il codice HTML pulito (usa tag <p>, <ul>, <li>, <strong>).` }
        ];

        if (imageFile) {
            parts.push(await fileToGenerativePart(imageFile));
        }

        const galleryParts = await Promise.all(
            newImageFiles.slice(0, 3).map(file => fileToGenerativePart(file))
        );
        parts.push(...galleryParts);

        if (!imageFile && imagePreview && !imagePreview.startsWith('blob:') && !imagePreview.includes('picsum.photos')) {
            parts[0].text += `\nL'immagine del prodotto si trova a questo indirizzo per riferimento visivo: ${imagePreview}`;
        }

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: { parts },
        });

        const aiText = response.text || '';
        setDescription(aiText);
        if (descriptionEditorRef.current) {
            descriptionEditorRef.current.innerHTML = aiText;
        }
    } catch (e: any) {
        console.error("Gemini AI Error:", e);
        alert("Errore durante la generazione AI. Verifica la chiave API nelle impostazioni di ambiente.");
    } finally {
        setIsGeneratingAI(false);
    }
  };

  const handleAffiliateSelect = (affiliateId: string) => {
    setSelectedAffiliateIds(prev => 
      prev.includes(affiliateId) 
        ? prev.filter(id => id !== affiliateId)
        : [...prev, affiliateId]
    );
  };

  const handleOverrideChange = (affiliateId: string, value: string) => {
    setCommissionOverrides(prev => ({ ...prev, [affiliateId]: value }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };
  
  const handleGalleryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewImageFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleAddGalleryUrl = () => {
    const url = galleryUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http')) {
        alert("Inserisci un URL valido che inizi con http:// o https://");
        return;
    }
    setGalleryImageUrls(prev => [...prev, url]);
    setGalleryUrlInput('');
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (url: string) => {
    setGalleryImageUrls(prev => prev.filter(u => u !== url));
  };

  const handleAddBundle = () => {
    const lastQty = bundles.length > 0 ? Math.max(...bundles.map(b => b.quantity)) : 1;
    
    setBundles(prev => [...prev, {
        id: `bundle_${Date.now()}`,
        quantity: lastQty + 1,
        price: 0,
        commissionValue: 0,
        platformFee: 0,
        priceCard: 0,
        commissionValueCard: 0,
        platformFeeCard: 0,
    }]);
  };

  const handleUpdateBundle = (index: number, field: keyof BundleOption, value: string) => {
      setBundles(prev => {
          const newBundles = [...prev];
          const numValue = parseFloat(value) || 0;
          if (field === 'quantity') {
              newBundles[index][field] = Math.max(1, Math.round(numValue));
          } else {
              (newBundles[index] as any)[field] = numValue;
          }
          return newBundles;
      });
  };

  const handleRemoveBundle = (index: number) => {
      setBundles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDescriptionCommand = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value);
    if (descriptionEditorRef.current) {
        descriptionEditorRef.current.focus();
    }
  };

  const handleRoleToggle = (role: UserRole) => {
    setStockVisibilityRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleAddLink = (type: 'landing' | 'creative') => {
    if (type === 'landing') {
        if (newLanding.label.trim() && newLanding.url.trim()) {
            setLandingPages(prev => [...prev, newLanding]);
            setNewLanding({ label: '', url: '' });
        }
    } else {
        if (newCreative.label.trim() && newCreative.url.trim()) {
            setCreatives(prev => [...prev, newCreative]);
            setNewCreative({ label: '', url: '' });
        }
    }
  };

  const handleRemoveLink = (type: 'landing' | 'creative', index: number) => {
    if (type === 'landing') {
        setLandingPages(prev => prev.filter((_, i) => i !== index));
    } else {
        setCreatives(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleAddVariant = () => {
    setVariants(prev => [...prev, {
        id: `new_${Date.now()}`,
        name: '',
        stockQuantity: 0,
    }]);
  };

  const handleUpdateVariant = (index: number, field: keyof Omit<ProductVariant, 'id'>, value: string) => {
      setVariants(prev => {
          const newVariants = [...prev];
          if (field === 'name') {
              newVariants[index].name = value;
          } else if (field === 'stockQuantity') {
              const numValue = parseInt(value, 10);
              newVariants[index].stockQuantity = isNaN(numValue) ? 0 : numValue;
          }
          return newVariants;
      });
  };

  const handleRemoveVariant = (index: number) => {
      setVariants(prev => prev.filter((_, i) => i !== index));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalOverrides: { [affiliateId: string]: number } = {};
    for (const affiliateId in commissionOverrides) {
        const rateStr = commissionOverrides[affiliateId];
        if (rateStr) { 
            const rateNum = parseFloat(rateStr);
            if (!isNaN(rateNum) && rateNum !== commissionValue) {
                finalOverrides[affiliateId] = rateNum;
            }
        }
    }

    const productData: Partial<Product> & { imageFile?: File | null, newImageFiles?: File[] } = { 
        id: product?.id, // Manteniamo l'ID se presente
        name, 
        description, 
        price, commissionValue, imageUrl, niche, refNumber, isActive,
        allowedAffiliateIds: isPublic ? null : selectedAffiliateIds,
        currency,
        costOfGoods, 
        shippingCost, 
        shippingCharge,
        fulfillmentCost, platformFee, customerCareCommission,
        priceCard,
        commissionValueCard,
        shippingCostCard, 
        shippingChargeCard,
        fulfillmentCostCard,
        platformFeeCard,
        customerCareCommissionCard,
        approvalTolerance, approvalFrequencyDays, 
        freeShipping,
        affiliateCommissionOverrides: finalOverrides,
        bundleOptions: bundles,
        imageFile,
        galleryImageUrls,
        newImageFiles,
        weight, height, width, depth, shipmentType,
        package_content_type: packageContentType,
        paccofacile_default_size: packageContentType === 'GOODS' ? undefined : paccofacileDefaultSize,
        stockQuantity: productType === 'simple' ? stockQuantity : undefined,
        variants: productType === 'variant' ? variants.filter(v => v.name.trim() !== '') : [],
        stockVisibilityRoles,
        landingPages,
        creatives,
        variant_bundle_label,
    };

    setIsSaving(true);
    try {
        await onSave(productData);
    } catch (error) {
        console.error("Save failed", error);
    } finally {
        setIsSaving(false);
    }
  };

  const sortedNiches = [...niches].sort((a,b) => a.localeCompare(b));
  const ALL_ROLES = [UserRole.ADMIN, UserRole.MANAGER, UserRole.AFFILIATE, UserRole.LOGISTICS, UserRole.CUSTOMER_CARE];

  return (
    <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto pr-2">
      <style>{`
        .toggle-checkbox:checked { right: 0; border-color: #4caf50; }
        .toggle-checkbox:checked + .toggle-label { background-color: #4caf50; }
      `}</style>
      <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Prodotto</label>
                  <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
              </div>
              <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Valuta Prodotto</label>
                  <div className="relative">
                    <select 
                        id="currency" 
                        value={currency} 
                        onChange={(e) => handleCurrencyChange(e.target.value as any)} 
                        disabled={isTranslating}
                        className={`mt-1 block w-full px-3 py-2 bg-white border-2 rounded-md shadow-sm focus:outline-none sm:text-sm font-bold transition-colors ${!isEditingRealProduct ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-gray-300'} ${isTranslating ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        <option value="EUR">Euro (€)</option>
                        <option value="USD">Dollaro ($)</option>
                        <option value="GBP">Sterlina (£)</option>
                    </select>
                    {isTranslating && (
                        <div className="absolute inset-y-0 right-8 flex items-center">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                  </div>
                  {!isEditingRealProduct && product && (
                      <p className="mt-1 text-[9px] font-black text-primary uppercase animate-pulse">Scegli la valuta per la copia</p>
                  )}
              </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Descrizione</label>
                <button 
                    type="button" 
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI || !name}
                    className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-black shadow-md hover:brightness-110 disabled:opacity-50 transition-all uppercase tracking-tighter"
                >
                    <svg className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    {isGeneratingAI ? 'Analisi in corso...' : 'Genera con Gemini AI'}
                </button>
            </div>
            <div className="mt-1 border border-gray-300 rounded-md shadow-sm">
                <div className="flex items-center gap-2 p-2 border-b border-gray-300 bg-gray-50 rounded-t-md flex-wrap">
                    <button type="button" onClick={() => handleDescriptionCommand('bold')} className="font-bold w-8 h-8 rounded hover:bg-gray-200">B</button>
                    <button type="button" onClick={() => handleDescriptionCommand('underline')} className="underline w-8 h-8 rounded hover:bg-gray-200">U</button>
                    <select onChange={(e) => handleDescriptionCommand('fontName', e.target.value)} className="text-sm border-gray-300 rounded-md h-8 py-0 focus:ring-primary focus:border-primary">
                        <option value="Arial">Arial</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                    </select>
                    <select onChange={(e) => handleDescriptionCommand('fontSize', e.target.value)} defaultValue="3" className="text-sm border-gray-300 rounded-md h-8 py-0 focus:ring-primary focus:border-primary">
                        <option value="2">Piccolo</option>
                        <option value="3">Normale</option>
                        <option value="4">Medio</option>
                        <option value="5">Grande</option>
                        <option value="6">Molto Grande</option>
                    </select>
                    <input 
                        type="color" 
                        onChange={(e) => handleDescriptionCommand('foreColor', e.target.value)} 
                        className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer" 
                        title="Colore testo" 
                    />
                </div>
                <div
                    ref={descriptionEditorRef}
                    id="description-editor"
                    contentEditable="true"
                    onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                    className="min-h-[120px] w-full px-3 py-2 bg-white rounded-b-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm"
                />
            </div>
            <p className="mt-1 text-[10px] text-gray-400 font-medium italic">Consiglio: Carica almeno un'immagine prima di generare la descrizione per risultati migliori.</p>
          </div>
          <div>
              <label className="block text-sm font-medium text-gray-700">Immagine Prodotto Principale</label>
              <div className="mt-1 flex items-center gap-4">
                  {imagePreview && (
                      <img src={imagePreview} alt="Anteprima prodotto" className="w-24 h-24 object-cover rounded-md" />
                  )}
                  <div className="flex-grow">
                      <input 
                          type="file" 
                          id="imageFile" 
                          accept="image/*"
                          onChange={handleImageChange}
                          className="block w-full text-sm text-gray-500
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-primary-dark/10 file:text-primary
                                      hover:file:bg-primary-dark/20"
                      />
                      <p className="mt-1 text-xs text-gray-500">Sostituisci l'immagine corrente. PNG, JPG, GIF.</p>
                  </div>
              </div>
          </div>
          <div>
              <label className="block text-sm font-medium text-gray-700">Galleria Immagini</label>
              <div className="mt-1 p-4 border-2 border-dashed border-gray-300 rounded-md">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                      {galleryImageUrls.map((url) => (
                          <div key={url} className="relative group">
                              <img src={url} alt="Immagine galleria" className="w-24 h-24 object-cover rounded-md" />
                              <button type="button" onClick={() => handleRemoveExistingImage(url)} className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                  <TrashIcon className="w-4 h-4" />
                              </button>
                          </div>
                      ))}
                      {newImageFiles.map((file, index) => (
                           <div key={index} className="relative group">
                              <img src={URL.createObjectURL(file)} alt="Anteprima nuova immagine" className="w-24 h-24 object-cover rounded-md" />
                              <button type="button" onClick={() => handleRemoveNewImage(index)} className="absolute top-0 right-0 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                  <TrashIcon className="w-4 h-4" />
                              </button>
                          </div>
                      ))}
                  </div>
                  
                  <div className="mt-6 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t pt-4">
                           <label htmlFor="gallery-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                              <PlusIcon className="w-5 h-5 mr-2"/> Carica File
                           </label>
                           <input id="gallery-upload" type="file" multiple accept="image/*" onChange={handleGalleryImageChange} className="sr-only"/>
                           <span className="text-[10px] text-gray-400 font-bold uppercase">Oppure aggiungi tramite link diretto</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
                            <input 
                                type="text" 
                                value={galleryUrlInput} 
                                onChange={(e) => setGalleryUrlInput(e.target.value)} 
                                placeholder="Incolla l'URL dell'immagine..." 
                                className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
                            />
                            <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        </div>
                        <button 
                            type="button" 
                            onClick={handleAddGalleryUrl}
                            className="px-4 py-2 bg-secondary text-primary font-black text-xs rounded-md shadow-sm hover:brightness-110 uppercase tracking-tighter"
                        >
                            Aggiungi URL
                        </button>
                      </div>
                  </div>
              </div>
          </div>
          <div>
              <label htmlFor="niche" className="block text-sm font-medium text-gray-700">Nicchia di Mercato</label>
              <select 
                id="niche" 
                value={niche} 
                onChange={(e) => setNiche(e.target.value)} 
                required 
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="" disabled>Seleziona una nicchia</option>
                {sortedNiches.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
          </div>
          
          <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="text-base font-medium text-gray-800 mb-4">Gestione Magazzino e Varianti</h3>
              <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center">
                      <input id="simple-product" name="product-type" type="radio" checked={productType === 'simple'} onChange={() => setProductType('simple')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                      <label htmlFor="simple-product" className="ml-2 block text-sm text-gray-900">Prodotto Semplice (Magazzino Unico)</label>
                  </div>
                  <div className="flex items-center">
                      <input id="variant-product" name="product-type" type="radio" checked={productType === 'variant'} onChange={() => setProductType('variant')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                      <label htmlFor="variant-product" className="ml-2 block text-sm text-gray-900">Prodotto con Varianti</label>
                  </div>
              </div>

              {productType === 'simple' && (
                  <div>
                      <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-700">Quantità a Magazzino</label>
                      <input type="number" id="stockQuantity" value={stockQuantity} onChange={(e) => setStockQuantity(parseInt(e.target.value, 10) || 0)} min="0" step="1" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                  </div>
              )}

              {productType === 'variant' && (
                  <div className="space-y-4">
                      <p className="text-sm text-gray-500">Aggiungi le varianti del prodotto. Il magazzino totale sarà la somma delle quantità di ogni variante.</p>
                      {variants.map((variant, index) => (
                          <div key={index} className="flex items-end gap-2 p-3 border rounded-md bg-white">
                              <div className="flex-grow">
                                  <label className="block text-xs font-medium text-gray-600">Nome Variante</label>
                                  <input type="text" value={variant.name} onChange={e => handleUpdateVariant(index, 'name', e.target.value)} placeholder="Es. Android, iPhone, Taglia M" className="mt-1 block w-full px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm" />
                              </div>
                              <div className="w-28">
                                  <label className="block text-xs font-medium text-gray-600">Quantità Magazzino</label>
                                  <input type="number" value={variant.stockQuantity} onChange={e => handleUpdateVariant(index, 'stockQuantity', e.target.value)} min="0" step="1" className="mt-1 block w-full px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm" />
                              </div>
                              <button type="button" onClick={() => handleRemoveVariant(index)} className="p-2 text-red-500 hover:text-red-700 flex-shrink-0">
                                  <TrashIcon className="w-5 h-5" />
                              </button>
                          </div>
                      ))}
                      <button type="button" onClick={handleAddVariant} className="mt-2 bg-secondary text-primary font-bold py-2 px-4 rounded-lg hover:bg-secondary-light transition-colors duration-200 flex items-center gap-2 text-sm">
                          <PlusIcon />
                          Aggiungi Variante
                      </button>
                  </div>
              )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label htmlFor="refNumber" className="block text-sm font-medium text-gray-700">Numero di Riferimento</label>
                  <input type="text" id="refNumber" value={refNumber} onChange={(e) => setRefNumber(e.target.value)} required className={`mt-1 block w-full px-3 py-2 bg-white border-2 rounded-md shadow-sm focus:outline-none sm:text-sm transition-all ${!isEditingRealProduct ? 'border-primary bg-primary/5 font-black text-primary' : 'border-gray-300'}`} />
                  {!isEditingRealProduct && <p className="mt-1 text-[9px] font-black text-primary uppercase">Nuovo codice generato per la copia</p>}
              </div>
              <div>
                  <label htmlFor="approvalTolerance" className="block text-sm font-medium text-gray-700">Tolleranza Approvazione (%)</label>
                  <input type="number" id="approvalTolerance" value={approvalTolerance} onChange={(e) => setApprovalTolerance(parseFloat(e.target.value) || 0)} required min="0" max="100" step="1" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                  <p className="mt-1 text-xs text-gray-500">Se 35%, l'affiliato deve avere un tasso di approvazione min. del 65%.</p>
              </div>
              <div>
                  <label htmlFor="approvalFrequency" className="block text-sm font-medium text-gray-700">Frequenza Approvazioni</label>
                  <select 
                      id="approvalFrequency" 
                      value={approvalFrequencyDays} 
                      onChange={(e) => setApprovalFrequencyDays(parseInt(e.target.value, 10))} 
                      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  >
                      <option value="7">Ogni 7 giorni</option>
                      <option value="14">Ogni 14 giorni</option>
                      <option value="30">Ogni 30 giorni</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Determina ogni quanto vengono approvate le vendite.</p>
              </div>
                <div className="flex flex-wrap items-center pt-6 md:col-span-1 gap-x-8 gap-y-4">
                    <div className="flex items-center">
                        <label htmlFor="isActive" className="block text-sm font-medium text-gray-700 mr-4">Stato Prodotto</label>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input type="checkbox" name="isActive" id="isActive" checked={isActive} onChange={() => setIsActive(!isActive)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                            <label htmlFor="isActive" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                        </div>
                        <label htmlFor="isActive" className={`text-sm font-semibold ${isActive ? 'text-green-600' : 'text-yellow-600'}`}>{isActive ? 'Attivo' : 'In Pausa'}</label>
                    </div>
                </div>
          </div>
          
          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="text-base font-medium text-gray-800 mb-2">Visibilità Magazzino</h3>
            <p className="text-sm text-gray-500 mb-4">Seleziona quali ruoli possono vedere la quantità di prodotto disponibile.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ALL_ROLES.map(role => (
                    <div key={role} className="flex items-center">
                        <input 
                            id={`role-${role}`} 
                            type="checkbox" 
                            checked={stockVisibilityRoles.includes(role)}
                            onChange={() => handleRoleToggle(role)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" 
                        />
                        <label htmlFor={`role-${role}`} className="ml-2 block text-sm text-gray-900">{role}</label>
                    </div>
                ))}
            </div>
          </div>

          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="text-base font-black text-gray-800 mb-4 uppercase italic border-b border-gray-200 pb-2">Costi del Prodotto e Logistica Differenziata</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label htmlFor="costOfGoods" className="block text-sm font-medium text-gray-700">Costo di Acquisto Merce ({symbol})</label>
                    <input type="number" id="costOfGoods" value={costOfGoods} onChange={(e) => setCostOfGoods(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-orange-50 rounded-xl border-2 border-orange-100">
                    <h4 className="text-xs font-black text-orange-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                        A. Logistica Contrassegno (COD)
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="price" className="block text-xs font-bold text-gray-600">Prezzo di Vendita BASE ({symbol})</label>
                            <input type="number" id="price" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-sm font-bold" />
                        </div>
                        <div>
                            <label htmlFor="shippingCharge" className="block text-xs font-bold text-orange-700 uppercase tracking-tighter">Costo Spedizione CLIENTE ({symbol}) - Si somma al prezzo base</label>
                            <input type="number" id="shippingCharge" value={shippingCharge} onChange={(e) => setShippingCharge(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-orange-300 rounded-md text-sm font-black text-orange-800" />
                        </div>
                        <div>
                            <label htmlFor="commissionValue" className="block text-xs font-bold text-gray-600">Provvigione Affiliato ({symbol})</label>
                            <input type="number" id="commissionValue" value={commissionValue} onChange={(e) => setCommissionValue(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-sm" />
                        </div>
                        <div>
                            <label htmlFor="shippingCost" className="block text-xs font-bold text-gray-600">Costo Spedizione NOSTRO ({symbol})</label>
                            <input type="number" id="shippingCost" value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-sm" />
                        </div>
                        <div className="pt-2 border-t border-orange-100">
                             <div>
                                <label htmlFor="fulfillmentCost" className="block text-xs font-bold text-gray-600">Costo Logistica (Fissa) ({symbol})</label>
                                <input type="number" id="fulfillmentCost" value={fulfillmentCost} onChange={(e) => setFulfillmentCost(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-sm" />
                            </div>
                            <div>
                                <label htmlFor="platformFee" className="block text-xs font-bold text-gray-600">Fee Piattaforma ({symbol})</label>
                                <input type="number" id="platformFee" value={platformFee} onChange={(e) => setPlatformFee(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-sm" />
                            </div>
                            <div>
                                <label htmlFor="customerCareCommission" className="block text-xs font-bold text-gray-600">Commissione Customer Care (Fissa) ({symbol})</label>
                                <input type="number" id="customerCareCommission" value={customerCareCommission} onChange={(e) => setCustomerCareCommission(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-orange-200 rounded-md text-sm" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-orange-200">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-orange-700 uppercase">Profitto Netto COD:</span>
                                <span className={`text-lg font-black ${estimatedNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {symbol}{estimatedNetProfit.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-100">
                    <h4 className="text-xs font-black text-blue-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                         B. Logistica Carta (Mollie)
                    </h4>
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="priceCard" className="block text-xs font-bold text-gray-600">Prezzo di Vendita BASE ({symbol})</label>
                            <input type="number" id="priceCard" value={priceCard} onChange={(e) => setPriceCard(parseFloat(e.target.value) || 0)} min="0" step="0.01" placeholder={price.toFixed(2)} className="mt-1 block w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-sm font-bold" />
                        </div>
                        <div>
                            <label htmlFor="shippingChargeCard" className="block text-xs font-bold text-blue-700 uppercase tracking-tighter">Costo Spedizione CLIENTE ({symbol}) - Solitamente 0</label>
                            <input type="number" id="shippingChargeCard" value={shippingChargeCard} onChange={(e) => setShippingChargeCard(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-blue-300 rounded-md text-sm font-black text-blue-800" />
                        </div>
                        <div>
                            <label htmlFor="commissionValueCard" className="block text-xs font-bold text-gray-600">Provvigione Affiliato ({symbol})</label>
                            <input type="number" id="commissionValueCard" value={commissionValueCard} onChange={(e) => setCommissionValueCard(parseFloat(e.target.value) || 0)} min="0" step="0.01" placeholder={commissionValue.toFixed(2)} className="mt-1 block w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-sm" />
                        </div>
                        <div>
                            <label htmlFor="shippingCostCard" className="block text-xs font-bold text-gray-600">Costo Spedizione NOSTRO ({symbol})</label>
                            <input type="number" id="shippingCostCard" value={shippingCostCard} onChange={(e) => setShippingCostCard(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-sm" />
                        </div>
                        <div className="pt-2 border-t border-blue-100">
                             <div>
                                <label htmlFor="fulfillmentCostCard" className="block text-xs font-bold text-gray-600">Costo Logistica (Fissa) ({symbol})</label>
                                <input type="number" id="fulfillmentCostCard" value={fulfillmentCostCard} onChange={(e) => setFulfillmentCostCard(parseFloat(e.target.value) || 0)} min="0" step="0.01" placeholder={fulfillmentCost.toFixed(2)} className="mt-1 block w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-sm" />
                            </div>
                            <div>
                                <label htmlFor="platformFeeCard" className="block text-xs font-bold text-gray-600">Fee Piattaforma ({symbol})</label>
                                <input type="number" id="platformFeeCard" value={platformFeeCard} onChange={(e) => setPlatformFeeCard(parseFloat(e.target.value) || 0)} min="0" step="0.01" placeholder={platformFee.toFixed(2)} className="mt-1 block w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-sm" />
                            </div>
                            <div>
                                <label htmlFor="customerCareCommissionCard" className="block text-xs font-bold text-gray-600">Commissione Customer Care (Fissa) ({symbol})</label>
                                <input type="number" id="customerCareCommissionCard" value={customerCareCommissionCard} onChange={(e) => setCustomerCareCommissionCard(parseFloat(e.target.value) || 0)} min="0" step="0.01" placeholder={customerCareCommission.toFixed(2)} className="mt-1 block w-full px-3 py-2 bg-white border border-blue-200 rounded-md text-sm" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-blue-200">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-blue-700 uppercase">Profitto Netto Carta:</span>
                                <span className={`text-lg font-black ${estimatedNetProfitCard >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {symbol}{estimatedNetProfitCard.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <p className="mt-2 text-[10px] text-gray-400 italic">* Se i campi della colonna Carta sono lasciati a 0, verranno usati i valori della colonna COD come base.</p>
          </div>

           <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="text-base font-medium text-gray-800 mb-4">Dimensioni e Peso Pacco (per spedizione standard)</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Peso (kg)</label>
                    <input type="number" id="weight" value={weight} onChange={(e) => setWeight(parseFloat(e.target.value) || 0)} min="0" step="0.1" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="height" className="block text-sm font-medium text-gray-700">Altezza (cm)</label>
                    <input type="number" id="height" value={height} onChange={(e) => setHeight(parseFloat(e.target.value) || 0)} min="0" step="1" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="width" className="block text-sm font-medium text-gray-700">Larghezza (cm)</label>
                    <input type="number" id="width" value={width} onChange={(e) => setWidth(parseFloat(e.target.value) || 0)} min="0" step="1" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Profondità (cm)</label>
                    <input type="number" id="depth" value={depth} onChange={(e) => setDepth(parseFloat(e.target.value) || 0)} min="0" step="1" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="shipmentType" className="block text-sm font-medium text-gray-700">Tipo Collo</label>
                    <select 
                        id="shipmentType" 
                        value={shipmentType} 
                        onChange={(e) => setShipmentType(parseInt(e.target.value, 10))} 
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                        <option value="1">Pacco</option>
                        <option value="2">Pallet</option>
                        <option value="4">Valigia</option>
                        <option value="5">Busta</option>
                    </select>
                </div>
            </div>
          </div>

          <div className="p-6 border-2 border-primary/20 rounded-xl bg-slate-50 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-primary/10 pb-3">
                  <div className="p-2 bg-primary text-white rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                  </div>
                  <div>
                      <h3 className="text-lg font-black text-primary uppercase italic tracking-tight">Logistica Avanzata PaccoFacile.it</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Configura parametri specifici per ottimizzare costi e tipologia di imballo</p>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                      <div>
                          <label htmlFor="packageContentType" className="block text-xs font-black text-gray-600 uppercase mb-1 tracking-wider">Tipologia Contenuto</label>
                          <select 
                            id="packageContentType" 
                            value={packageContentType} 
                            onChange={(e) => setPackageContentType(e.target.value as 'GOODS' | 'DOCUMENTS')}
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold"
                          >
                              <option value="GOODS">Merce (GOODS)</option>
                              <option value="DOCUMENTS">Documenti (DOCUMENTS)</option>
                          </select>
                      </div>

                      {shipmentType === 5 && (
                          <div className="animate-in fade-in duration-300">
                              <label htmlFor="envelopeSize" className="block text-xs font-black text-orange-600 uppercase mb-1 tracking-wider">Dimensione Busta</label>
                              <select 
                                id="envelopeSize" 
                                value={paccofacileDefaultSize} 
                                onChange={(e) => setPaccofacileDefaultSize(e.target.value)}
                                className="block w-full px-3 py-2 bg-orange-50 border-orange-200 border-2 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-200 outline-none text-sm font-bold text-orange-800"
                              >
                                  <option value="">Seleziona formato...</option>
                                  <option value="LETTERA">Lettera (20x13x1.5cm - Max 250g)</option>
                                  <option value="PICCOLA">Piccola (20x29x5cm - Max 1Kg)</option>
                                  <option value="MEDIA">Media (29x38x5cm - Max 2Kg)</option>
                              </select>
                          </div>
                      )}

                      {shipmentType === 4 && (
                          <div className="animate-in fade-in duration-300">
                              <label htmlFor="suitcaseSize" className="block text-xs font-black text-primary uppercase mb-1 tracking-wider">Dimensione Valigia</label>
                              <select 
                                id="suitcaseSize" 
                                value={paccofacileDefaultSize} 
                                onChange={(e) => setPaccofacileDefaultSize(e.target.value)}
                                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 outline-none text-sm font-bold"
                              >
                                  <option value="">Seleziona formato...</option>
                                  <option value="SMALL">Piccolo (55x45x24cm - Max 15Kg)</option>
                                  <option value="MEDIUM">Medio (75x48x27cm - Max 25Kg)</option>
                                  <option value="BIG">Grande (78x50x30cm - Max 30Kg)</option>
                                  <option value="HUGE">XXL (88x61x37cm - Max 50Kg)</option>
                                  <option value="CUSTOM">Custom (Fuori standard)</option>
                              </select>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-xl">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Riepilogo Parametri Fisici</h4>
                      <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500 uppercase">Peso Minimo:</span>
                              <span className="font-black text-primary">1.0 KG</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500 uppercase">Dimensioni Min:</span>
                              <span className="font-black text-primary">2 x 2 x 2 CM</span>
                          </div>
                          <div className="pt-2 border-t text-[9px] text-gray-400 italic">
                              * I valori nel riquadro sopra (standard) verranno usati come base se non è selezionato un formato predefinito o se il formato è "Custom".
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="p-4 border rounded-md bg-gray-50">
                <h3 className="text-base font-medium text-gray-800 mb-4">Personalizzazione Formulario</h3>
                <div>
                    <label htmlFor="variant_bundle_label" className="block text-sm font-medium text-gray-700">Etichetta selezione varianti (multi-pack)</label>
                    <input 
                        type="text" 
                        id="variant_bundle_label" 
                        value={variant_bundle_label} 
                        onChange={(e) => setVariantBundleLabel(e.target.value)} 
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" 
                    />
                    <p className="mt-1 text-xs text-gray-500">Usa <code className="bg-gray-200 px-1 rounded">{'{n}'}</code> per inserire il numero del prodotto (es. Prodotto 1).</p>
                </div>
            </div>

          <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="text-base font-black text-gray-800 mb-6 uppercase italic border-b border-gray-200 pb-2">Opzioni Multi-Pack (Upsells)</h3>
              <div className="space-y-8">
                  {bundles.map((bundle, index) => {
                      const totalRevenueCod = bundle.price + shippingCharge;
                      const totalCostsCod = (costOfGoods * bundle.quantity) + shippingCost + fulfillmentCost + customerCareCommission + bundle.commissionValue + (bundle.platformFee || 0);
                      const bundleProfitCod = totalRevenueCod - totalCostsCod;

                      const effPriceCard = bundle.priceCard || bundle.price;
                      const effCommCard = bundle.commissionValueCard || bundle.commissionValue;
                      const effFeeCard = bundle.platformFeeCard || (bundle.platformFee || 0);
                      
                      const effFulfillmentCard = fulfillmentCostCard || fulfillmentCost;
                      const effCCCard = customerCareCommissionCard || customerCareCommission;
                      const effShippingCostCard = shippingCostCard || shippingCost;
                      const effShippingChargeCard = shippingChargeCard;

                      const totalRevenueCard = effPriceCard + effShippingChargeCard;
                      const totalCostsCard = (costOfGoods * bundle.quantity) + effShippingCostCard + effFulfillmentCard + effCCCard + effCommCard + effFeeCard;
                      const bundleProfitCard = totalRevenueCard - totalCostsCard;

                      return (
                      <div key={index} className="p-6 border-2 border-gray-200 rounded-2xl bg-white relative shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-6">
                             <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Pezzi:</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={bundle.quantity} 
                                        onChange={e => handleUpdateBundle(index, 'quantity', e.target.value)}
                                        className="bg-primary text-white w-20 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-md text-center focus:ring-4 focus:ring-primary/20 outline-none"
                                    />
                                </div>
                                <h4 className="text-sm font-black text-gray-800 uppercase">Configurazione Offerta Multi-Pezzo</h4>
                             </div>
                             <button type="button" onClick={() => handleRemoveBundle(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                <TrashIcon className="w-5 h-5" />
                             </button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 space-y-4">
                                  <h5 className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                      Logistica COD (Contrassegno)
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      <div>
                                          <label className="block text-[9px] font-bold text-gray-500 uppercase">Prezzo Tot. ({symbol})</label>
                                          <input type="number" value={bundle.price} onChange={e => handleUpdateBundle(index, 'price', e.target.value)} min="0" step="0.01" className="mt-1 block w-full px-2 py-1.5 bg-white border border-orange-200 rounded-lg text-sm font-black" />
                                      </div>
                                      <div>
                                          <label className="block text-[9px] font-bold text-gray-500 uppercase">Provvigione ({symbol})</label>
                                          <input type="number" value={bundle.commissionValue} onChange={e => handleUpdateBundle(index, 'commissionValue', e.target.value)} min="0" step="0.01" className="mt-1 block w-full px-2 py-1.5 bg-white border border-orange-200 rounded-lg text-sm" />
                                      </div>
                                      <div>
                                          <label className="block text-[9px] font-bold text-gray-500 uppercase">Fee Piattaf. ({symbol})</label>
                                          <input type="number" value={bundle.platformFee || 0} onChange={e => handleUpdateBundle(index, 'platformFee', e.target.value)} min="0" step="0.01" className="mt-1 block w-full px-2 py-1.5 bg-white border border-orange-200 rounded-lg text-sm" />
                                      </div>
                                  </div>
                                  <div className="pt-3 border-t border-orange-200 flex justify-between items-center">
                                      <span className="text-[10px] font-black text-orange-700 uppercase">Profitto Netto COD:</span>
                                      <span className={`text-sm font-black ${bundleProfitCod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {symbol}{bundleProfitCod.toFixed(2)}
                                      </span>
                                  </div>
                              </div>

                              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
                                  <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                      Logistica CARTA (Elettronico)
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      <div>
                                          <label className="block text-[9px] font-bold text-gray-500 uppercase">Prezzo Tot. ({symbol})</label>
                                          <input type="number" value={bundle.priceCard || 0} onChange={e => handleUpdateBundle(index, 'priceCard', e.target.value)} min="0" step="0.01" placeholder={bundle.price.toFixed(2)} className="mt-1 block w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-sm font-black" />
                                      </div>
                                      <div>
                                          <label className="block text-[9px] font-bold text-gray-500 uppercase">Provvigione ({symbol})</label>
                                          <input type="number" value={bundle.commissionValueCard || 0} onChange={e => handleUpdateBundle(index, 'commissionValueCard', e.target.value)} min="0" step="0.01" placeholder={bundle.commissionValue.toFixed(2)} className="mt-1 block w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-sm" />
                                      </div>
                                      <div>
                                          <label className="block text-[9px] font-bold text-gray-500 uppercase">Fee Piattaf. ({symbol})</label>
                                          <input type="number" value={bundle.platformFeeCard || 0} onChange={e => handleUpdateBundle(index, 'platformFeeCard', e.target.value)} min="0" step="0.01" placeholder={(bundle.platformFee || 0).toFixed(2)} className="mt-1 block w-full px-2 py-1.5 bg-white border border-blue-200 rounded-lg text-sm" />
                                      </div>
                                  </div>
                                  <div className="pt-3 border-t border-blue-200 flex justify-between items-center">
                                      <span className="text-[10px] font-black text-blue-700 uppercase">Profitto Netto CARTA:</span>
                                      <span className={`text-sm font-black ${bundleProfitCard >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {symbol}{bundleProfitCard.toFixed(2)}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )})}
              </div>
              <button type="button" onClick={handleAddBundle} className="mt-6 bg-secondary text-primary font-black py-3 px-6 rounded-xl hover:bg-secondary-light transition-all flex items-center gap-2 text-xs uppercase tracking-widest shadow-md active:scale-95">
                  <PlusIcon />
                  Aggiungi Nuova Offerta Combinata
              </button>
          </div>
          
            <div className="p-4 border rounded-md bg-gray-50 space-y-6">
                <div>
                    <h3 className="text-base font-medium text-gray-800 mb-4">Landing Pages</h3>
                    <div className="space-y-2">
                        {landingPages.map((link, index) => (
                            <div key={index} className="flex items-center gap-2 bg-white p-2 border rounded-md">
                                <span className="flex-grow text-sm text-gray-800 truncate"><strong>{link.label}:</strong> {link.url}</span>
                                <button type="button" onClick={() => handleRemoveLink('landing', index)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-end gap-2">
                        <input type="text" value={newLanding.label} onChange={(e) => setNewLanding({...newLanding, label: e.target.value})} placeholder="Etichetta (es. Landing Video)" className="flex-grow px-2 py-1 bg-white border border-gray-300 rounded-md sm:text-sm" />
                        <input type="url" value={newLanding.url} onChange={(e) => setNewLanding({...newLanding, url: e.target.value})} placeholder="https://..." className="flex-grow px-2 py-1 bg-white border border-gray-300 rounded-md sm:text-sm" />
                        <button type="button" onClick={() => handleAddLink('landing')} className="bg-secondary text-primary font-bold p-2 rounded-lg hover:bg-secondary-light"><PlusIcon /></button>
                    </div>
                </div>
                <div>
                    <h3 className="text-base font-medium text-gray-800 mb-4">Creatività (es. Google Drive, Canvass)</h3>
                    <div className="space-y-2">
                        {creatives.map((link, index) => (
                            <div key={index} className="flex items-center gap-2 bg-white p-2 border rounded-md">
                                <span className="flex-grow text-sm text-gray-800 truncate"><strong>{link.label}:</strong> {link.url}</span>
                                <button type="button" onClick={() => handleRemoveLink('creative', index)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-end gap-2">
                        <input type="text" value={newCreative.label} onChange={(e) => setNewCreative({...newCreative, label: e.target.value})} placeholder="Etichetta (es. Foto Prodotto)" className="flex-grow px-2 py-1 bg-white border border-gray-300 rounded-md sm:text-sm" />
                        <input type="url" value={newCreative.url} onChange={(e) => setNewCreative({...newCreative, url: e.target.value})} placeholder="https://..." className="flex-grow px-2 py-1 bg-white border border-gray-300 rounded-md sm:text-sm" />
                        <button type="button" onClick={() => handleAddLink('creative')} className="bg-secondary text-primary font-bold p-2 rounded-lg hover:bg-secondary-light"><PlusIcon /></button>
                    </div>
                </div>
            </div>

          <div className="p-4 border rounded-md bg-gray-50">
            <h3 className="text-base font-medium text-gray-800 mb-2">Commissioni Personalizzate per Affiliato</h3>
            <p className="text-sm text-gray-500 mb-4">Lascia vuoto per usare la commissione di default ({symbol}{commissionValue.toFixed(2)}). Inserisci un valore per applicare una penalità o un bonus.</p>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {affiliates.filter(a => !a.isBlocked).map(affiliate => (
                  <div key={affiliate.id} className="grid grid-cols-3 items-center gap-2">
                      <label htmlFor={`override-${affiliate.id}`} className="text-sm text-gray-700 col-span-2">{affiliate.name}</label>
                      <input 
                          type="number"
                          id={`override-${affiliate.id}`}
                          value={commissionOverrides[affiliate.id] || ''}
                          onChange={(e) => handleOverrideChange(affiliate.id, e.target.value)}
                          min="0" step="0.01"
                          placeholder={`${symbol}${commissionValue.toFixed(2)}`}
                          className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      />
                  </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-md bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">Accesso Prodotto</label>
              <div className="flex items-center gap-4">
                  <div className="flex items-center">
                      <input id="public" name="access" type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                      <label htmlFor="public" className="ml-2 block text-sm text-gray-900">Pubblico (per tutti gli affiliati)</label>
                  </div>
                  <div className="flex items-center">
                      <input id="private" name="access" type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                      <label htmlFor="private" className="ml-2 block text-sm text-gray-900">Privato (per affiliati specifici)</label>
                  </div>
              </div>
                {!isPublic && (
                  <div className="mt-4 max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">Seleziona Affiliati Autorizzati</h4>
                      {affiliates.map(affiliate => (
                          <div key={affiliate.id} className="flex items-center p-1 rounded-md hover:bg-gray-200">
                              <input 
                                  id={`aff-${affiliate.id}`} 
                                  type="checkbox" 
                                  checked={selectedAffiliateIds.includes(affiliate.id)}
                                  onChange={() => handleAffiliateSelect(affiliate.id)}
                                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" 
                              />
                              <label htmlFor={`aff-${affiliate.id}`} className="ml-2 block text-sm text-gray-900">{affiliate.name}</label>
                          </div>
                      ))}
                  </div>
                )}
          </div>
      </div>
      <div className="mt-8 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors duration-200">
              Annulla
          </button>
          <button type="submit" disabled={isSaving || isTranslating} className="bg-primary text-on-primary font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isSaving ? (isEditingRealProduct ? 'Salvataggio...' : 'Creazione...') : (isTranslating ? 'Traduzione...' : (isEditingRealProduct ? 'Salva Modifiche' : 'Crea Prodotto'))}
          </button>
      </div>
    </form>
  );
};

export default ProductForm;
