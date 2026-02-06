import React, { useState, useMemo } from 'react';
import { Sale, Product, PlatformSettings } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { FilterIcon } from './icons/FilterIcon';
import { TruckIcon } from './icons/TruckIcon';

interface ExportCSVModalProps {
    sales: Sale[];
    products: Product[];
    platformSettings: PlatformSettings;
    onClose: () => void;
}

type ExportFormat = 'paccofacile_91' | 'spediamo_34' | 'standard_mws';

const ExportCSVModal: React.FC<ExportCSVModalProps> = ({ sales, products, platformSettings, onClose }) => {
    const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [fromHour, setFromHour] = useState('00');
    const [toHour, setToHour] = useState('23');

    // Default impostato su Spediamo.it come richiesto
    const [exportFormat, setExportFormat] = useState<ExportFormat>('spediamo_34');
    
    const [pickupDate, setPickupDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    });
    const [timeSlot, setTimeSlot] = useState<'Mattina' | 'Pomeriggio'>('Mattina');

    const filteredForExport = useMemo(() => {
        // Creazione dei timestamp limite per il filtraggio preciso
        const startLimit = new Date(`${fromDate}T${fromHour}:00:00`).getTime();
        const endLimit = new Date(`${toDate}T${toHour}:59:59`).getTime();

        return sales.filter(sale => {
            const saleTime = new Date(sale.saleDate).getTime();
            const isWithinRange = saleTime >= startLimit && saleTime <= endLimit;
            const isConfirmed = sale.status === 'Confermato';

            return isWithinRange && isConfirmed;
        });
    }, [sales, fromDate, toDate, fromHour, toHour]);

    const getEffectiveDimensions = (product?: Product) => {
        if (!product) return { weight: 1, dim1: 10, dim2: 10, dim3: 10, sizeLabel: '', typeLabel: 'Pacco' };

        const type = product.shipmentType || 1;
        const size = product.paccofacile_default_size || '';
        
        let typeLabel = 'Pacco';
        if (type === 2) typeLabel = 'Pallet';
        if (type === 4) typeLabel = 'Valigia';
        if (type === 5) typeLabel = 'Busta';

        if (type === 5) { // BUSTE
            switch (size) {
                case 'LETTERA': return { weight: 0.25, dim1: 20, dim2: 13, dim3: 1.5, sizeLabel: 'LETTERA', typeLabel };
                case 'PICCOLA': return { weight: 1, dim1: 29, dim2: 20, dim3: 5, sizeLabel: 'PICCOLA', typeLabel };
                case 'MEDIA': return { weight: 2, dim1: 38, dim2: 29, dim3: 5, sizeLabel: 'MEDIA', typeLabel };
            }
        }

        if (type === 4) { // VALIGIE
            switch (size) {
                case 'SMALL': return { weight: 15, dim1: 55, dim2: 45, dim3: 24, sizeLabel: 'SMALL', typeLabel };
                case 'MEDIUM': return { weight: 25, dim1: 75, dim2: 48, dim3: 27, sizeLabel: 'MEDIUM', typeLabel };
                case 'BIG': return { weight: 30, dim1: 78, dim2: 50, dim3: 30, sizeLabel: 'BIG', typeLabel };
                case 'HUGE': return { weight: 50, dim1: 88, dim2: 61, dim3: 37, sizeLabel: 'HUGE', typeLabel };
            }
        }

        return {
            weight: product.weight || 1,
            dim1: product.depth || 10,
            dim2: product.width || 10,
            dim3: product.height || 10,
            sizeLabel: size === 'CUSTOM' ? '' : size,
            typeLabel
        };
    };

    const handleDownload = () => {
        if (filteredForExport.length === 0) {
            alert("Nessun ordine trovato con questi filtri.");
            return;
        }
        if (exportFormat === 'paccofacile_91') generatePaccoFacileCSV();
        else if (exportFormat === 'spediamo_34') generateSpediamoCSV();
        else generateStandardCSV();
    };

    const formatITDate = (isoDate: string) => {
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    };

    const getFullDescription = (sale: Sale) => {
        const qty = sale.quantity || 1;
        const variants = sale.selectedVariants && sale.selectedVariants.length > 0 
            ? sale.selectedVariants.map(v => v.variantName).join(', ') 
            : sale.variantName;
        
        // Formato: [QTY]pz [NOME_PRODOTTO] ([VARIANTI])
        const base = `${qty}pz ${sale.productName}`;
        return variants ? `${base} (${variants})` : base;
    };

    const generateSpediamoCSV = () => {
        const headers = [
            "Numero Riferimento", "Data Ritiro", "Mattina/Pomeriggio", "Sede Mittente", "Nome Mittente", "Contatto Mittente", "Indirizzo Mittente", "CAP Mittente", "Citta Mittente", "Provincia Mittente", "Telefono Mittente", "Fax Mittente", "Cellulare Mittente", "Email Mittente", "Nome Destinatario", "Contatto Destinatario", "Indirizzo Destinatario", "CAP Destinatario", "Citta Destinatario", "Provincia Destinatario", "Telefono Destinatario", "Fax Destinatario", "Cellulare Destinatario", "Email Destinatario", "Assicurata", "Contrassegno", "Note", "Tipo Collo", "Quantita Colli", "Peso Collo [kg]", "Altezza Collo [cm]", "Larghezza Collo  [cm]", "Profondita Collo [cm]", "Descrizione Collo"
        ];

        const csvRows = filteredForExport.map(sale => {
            const product = products.find(p => p.id === sale.productId);
            const eff = getEffectiveDimensions(product);
            const senderName = (platformSettings.sender_name || "").trim();
            const senderAddr = `${platformSettings.sender_address || ''} ${platformSettings.sender_house_number || ''}`.trim();
            const destAddr = `${sale.customer_street_address || ''} ${sale.customer_house_number || ''}`.trim();
            const phone = (sale.customerPhone || "").replace(/\s/g, '');

            const row = new Array(headers.length).fill('');
            row[0] = sale.id;
            row[1] = formatITDate(pickupDate);
            row[2] = timeSlot;
            row[3] = ""; // Sede mittente
            row[4] = senderName;
            row[5] = senderName;
            row[6] = senderAddr;
            row[7] = (platformSettings.sender_zip || "").replace(/\D/g, '');
            row[8] = (platformSettings.sender_city || "").trim();
            row[9] = (platformSettings.sender_province || "").toUpperCase().substring(0, 2);
            row[10] = (platformSettings.sender_phone || "").replace(/\s/g, '');
            row[11] = ""; // Fax
            row[12] = row[10]; // Cellulare
            row[13] = (platformSettings.sender_email || "").trim();
            
            row[14] = (sale.customerName || "").trim();
            row[15] = ""; // Contatto dest
            row[16] = destAddr;
            row[17] = (sale.customer_zip || "").replace(/\D/g, '');
            row[18] = (sale.customer_city || "").trim();
            row[19] = (sale.customer_province || "").toUpperCase().substring(0, 2);
            row[20] = phone;
            row[21] = ""; // Fax dest
            row[22] = phone;
            row[23] = (sale.customerEmail || "").trim();
            row[24] = ""; // Assicurata
            row[25] = sale.saleAmount.toFixed(2).replace('.', ','); // Contrassegno
            row[26] = (sale.notes || "").replace(/;/g, ' ');
            row[27] = eff.typeLabel;
            row[28] = "1";
            row[29] = eff.weight.toString().replace('.', ',');
            row[30] = Math.round(eff.dim3).toString();
            row[31] = Math.round(eff.dim2).toString();
            row[32] = Math.round(eff.dim1).toString();
            row[33] = getFullDescription(sale).substring(0, 40); // Descrizione Collo - Limite 40 char Spediamo

            return row.join(";");
        });

        const csvContent = "\ufeff" + headers.join(";") + "\n" + csvRows.join("\n");
        downloadFile(csvContent, `spediamo_it_${pickupDate}.csv`);
    };

    const generatePaccoFacileCSV = () => {
        const headers = [
            "shipment_sequence_number", "shipment_service/pickup_date", "shipment_service/pickup_range", 
            "shipment_service/service_id", "shipment_service/package_content_type", "shipment_service/parcels/shipment_type", 
            "shipment_service/parcels/weight", "shipment_service/parcels/dim1", "shipment_service/parcels/dim2", 
            "shipment_service/parcels/dim3", "shipment_service/parcels/default_size", "pickup/iso_code", 
            "pickup/postal_code", "pickup/city", "pickup/header_name", "pickup/address", "pickup/building_number", 
            "pickup/km_number", "pickup/StateOrProvinceCode", "pickup/phone", "pickup/email", "pickup/note", 
            "pickup/address_book_id", "destination/iso_code", "destination/postal_code", "destination/city", 
            "destination/header_name", "destination/address", "destination/building_number", "destination/km_number", 
            "destination/StateOrProvinceCode", "destination/phone", "destination/email", "destination/note", 
            "destination/address_book_id", "triangulation/iso_code", "triangulation/postal_code", "triangulation/city", 
            "triangulation/header_name", "triangulation/address", "triangulation/building_number", "triangulation/km_number", 
            "triangulation/StateOrProvinceCode", "triangulation/phone", "triangulation/email", "triangulation/note", 
            "triangulation/address_book_id", "additional_information/reference", "additional_information/note", 
            "additional_information/content", "customs/amount/value", "customs/amount/currency", 
            "customs/articles/amount/value", "customs/articles/amount/currency", "customs/articles/quantity", 
            "customs/articles/weight", "customs/articles/description", "customs/articles/iso_code_country_manufactured", 
            "shipment_service/accessories/7/enabled", "shipment_service/accessories/7/parcel_assurance_amount/amount", 
            "shipment_service/accessories/7/parcel_assurance_amount/currency", "shipment_service/accessories/7/price/amount", 
            "shipment_service/accessories/7/price/currency", "shipment_service/accessories/4/enabled", 
            "shipment_service/accessories/4/collect_method", "shipment_service/accessories/4/refund_method", 
            "shipment_service/accessories/4/price/amount", "shipment_service/accessories/4/price/currency", 
            "shipment_service/accessories/4/price_account_charging/amount", "shipment_service/accessories/4/price_account_charging/currency", 
            "shipment_service/accessories/4/email", "shipment_service/accessories/4/wire_transfer_detail/header", 
            "shipment_service/accessories/4/wire_transfer_detail/bank", "shipment_service/accessories/4/wire_transfer_detail/iban", 
            "shipment_service/accessories/4/wire_transfer_detail/bic", "shipment_service/accessories/30/enabled", 
            "shipment_service/accessories/30/mon", "shipment_service/accessories/30/tue", "shipment_service/accessories/30/wed", 
            "shipment_service/accessories/30/thu", "shipment_service/accessories/30/fri", "shipment_service/accessories/29/enabled", 
            "shipment_service/accessories/29/phone", "shipment_service/accessories/31/enabled", "shipment_service/accessories/31/delivery_date", 
            "shipment_service/accessories/6/enabled", "shipment_service/accessories/8/enabled", "shipment_service/accessories/25/enabled", 
            "shipment_service/accessories/26/enabled", "shipment_service/accessories/27/enabled", "shipment_service/accessories/28/enabled"
        ];

        const csvRows = filteredForExport.map((sale, index) => {
            const product = products.find(p => p.id === sale.productId);
            const pickupRange = timeSlot === 'Mattina' ? 'AM' : 'PM';
            const eff = getEffectiveDimensions(product);
            
            const row = new Array(headers.length).fill('');
            row[0] = (index + 1).toString();
            row[1] = pickupDate;
            row[2] = pickupRange;
            row[3] = "2";
            row[4] = product?.package_content_type || "GOODS";
            row[5] = (product?.shipmentType || 1).toString();
            row[6] = eff.weight.toString();
            row[7] = eff.dim1.toString();
            row[8] = eff.dim2.toString();
            row[9] = eff.dim3.toString();
            row[10] = eff.sizeLabel;
            
            row[11] = "IT";
            row[12] = (platformSettings.sender_zip || "").replace(/\D/g, '').substring(0, 5);
            row[13] = (platformSettings.sender_city || "").trim();
            row[14] = (platformSettings.sender_name || "").trim();
            row[15] = (platformSettings.sender_address || "").trim();
            row[16] = (platformSettings.sender_house_number || "").trim();
            row[18] = (platformSettings.sender_province || "").toUpperCase().substring(0, 2);
            row[19] = (platformSettings.sender_phone || "").replace(/\s/g, '');
            row[20] = (platformSettings.sender_email || "").trim();
            
            row[23] = "IT";
            row[24] = (sale.customer_zip || "").replace(/\D/g, '').substring(0, 5);
            row[25] = (sale.customer_city || "").trim();
            row[26] = (sale.customerName || "").trim();
            row[27] = (sale.customer_street_address || "").trim();
            row[28] = (sale.customer_house_number || "").trim();
            row[30] = (sale.customer_province || "").toUpperCase().substring(0, 2);
            row[31] = (sale.customerPhone || "").replace(/\s/g, '');
            row[32] = (sale.customerEmail || "ordine@mws.it").trim();
            row[33] = `"${(sale.notes || "").replace(/"/g, '""')}"`;
            
            row[47] = sale.id;
            row[49] = getFullDescription(sale).substring(0, 100); // Descrizione
            
            row[63] = "1";
            row[64] = "CASH";
            row[65] = "WIRE_TRANSFER";
            row[66] = sale.saleAmount.toFixed(2).replace('.', ',');
            row[67] = "EUR";
            
            row[71] = (platformSettings.sender_iban_header || "").trim();
            row[72] = (platformSettings.sender_bank_name || "").trim();
            row[73] = (platformSettings.sender_iban || "").trim();
            row[74] = (platformSettings.sender_bic || "").trim();

            return row.join(";");
        });

        const csvContent = "\ufeff" + headers.join(";") + "\n" + csvRows.join("\n");
        downloadFile(csvContent, `paccofacile_91_${pickupDate}.csv`);
    };

    const generateStandardCSV = () => {
        const headers = [
            "Numero Riferimento", "Data Ritiro", "Mattina/Pomeriggio", "Mittente", "Indirizzo Mittente", "CAP Mittente", "Citta Mittente", "Provincia Mittente",
            "Telefono Mittente", "Destinatario", "Indirizzo Destinatario", "CAP Destinatario", "Citta Destinatario",
            "Provincia Destinatario", "Telefono Destinatario", "Contrassegno", "Note", "Peso [kg]", "Altezza [cm]", "Larghezza [cm]", "Profondita [cm]", "Descrizione"
        ];

        const csvRows = filteredForExport.map(sale => {
            const product = products.find(p => p.id === sale.productId);
            const eff = getEffectiveDimensions(product);
            const senderAddr = `${platformSettings.sender_address || ''} ${platformSettings.sender_house_number || ''}`.trim();
            const destAddr = `${sale.customer_street_address || ''} ${sale.customer_house_number || ''}`.trim();

            return [
                sale.id,
                pickupDate,
                timeSlot,
                platformSettings.sender_name || "",
                senderAddr,
                platformSettings.sender_zip || "",
                platformSettings.sender_city || "",
                platformSettings.sender_province || "",
                platformSettings.sender_phone || "",
                sale.customerName || "",
                destAddr,
                sale.customer_zip || "",
                sale.customer_city || "",
                sale.customer_province || "",
                sale.customerPhone || "",
                sale.saleAmount.toFixed(2).replace('.', ','),
                (sale.notes || "").replace(/;/g, ' '),
                eff.weight.toString().replace('.', ','),
                eff.dim3.toString(),
                eff.dim2.toString(),
                eff.dim1.toString(),
                getFullDescription(sale)
            ].join(";");
        });

        const csvContent = "\ufeff" + [headers.join(";"), ...csvRows].join("\n");
        downloadFile(csvContent, `mws_internal_${pickupDate}.csv`);
    };

    const downloadFile = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
    }

    return (
        <div className="space-y-8 p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-sm mb-4">
                        <FilterIcon className="w-5 h-5" />
                        1. Filtra Ordini Confermati
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Dal Giorno</label>
                            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm bg-gray-50 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Al Giorno</label>
                            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm bg-gray-50 shadow-sm" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Dalle Ore</label>
                            <select value={fromHour} onChange={e => setFromHour(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm bg-gray-50 shadow-sm">
                                {Array.from({length:24}).map((_,i) => <option key={i} value={i.toString().padStart(2,'0')}>{i.toString().padStart(2,'0')}:00</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Alle Ore</label>
                            <select value={toHour} onChange={e => setToHour(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-bold text-sm bg-gray-50 shadow-sm">
                                {Array.from({length:24}).map((_,i) => <option key={i} value={i.toString().padStart(2,'0')}>{i.toString().padStart(2,'0')}:59</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="pt-6">
                         <label className="block text-xs font-black text-primary uppercase mb-4 tracking-widest italic border-b border-primary/10 pb-1">2. Formato Esportazione</label>
                         <div className="space-y-3">
                            <label className={`flex items-center p-3 border-2 rounded-2xl cursor-pointer transition-all ${exportFormat === 'spediamo_34' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                                <input type="radio" name="format" value="spediamo_34" checked={exportFormat === 'spediamo_34'} onChange={() => setExportFormat('spediamo_34')} className="w-4 h-4 text-primary" />
                                <div className="ml-3">
                                    <p className="text-sm font-black text-gray-800 uppercase italic">Spediamo.it (34 Colonne)</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Formato standard per importazione sul portale Spediamo.it</p>
                                </div>
                            </label>
                            <label className={`flex items-center p-3 border-2 rounded-2xl cursor-pointer transition-all ${exportFormat === 'paccofacile_91' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                                <input type="radio" name="format" value="paccofacile_91" checked={exportFormat === 'paccofacile_91'} onChange={() => setExportFormat('paccofacile_91')} className="w-4 h-4 text-primary" />
                                <div className="ml-3">
                                    <p className="text-sm font-black text-gray-800 uppercase italic">Pacco Facile (91 Colonne)</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Ottimizzato per mass-import PaccoFacile.it</p>
                                </div>
                            </label>
                            <label className={`flex items-center p-3 border-2 rounded-2xl cursor-pointer transition-all ${exportFormat === 'standard_mws' ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                                <input type="radio" name="format" value="standard_mws" checked={exportFormat === 'standard_mws'} onChange={() => setExportFormat('standard_mws')} className="w-4 h-4 text-primary" />
                                <div className="ml-3">
                                    <p className="text-sm font-black text-gray-800 uppercase italic">Formato Interno MWS</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Tabella CSV semplificata per backup manuale.</p>
                                </div>
                            </label>
                         </div>
                    </div>
                </div>
                <div className="space-y-4 p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-100 shadow-inner">
                    <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-sm mb-4">
                        <TruckIcon className="w-5 h-5" />
                        3. Configura Ritiro
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest">Data Ritiro Stimata</label>
                        <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-sm shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Fascia Oraria Preferita</label>
                        <div className="flex gap-2">
                            <button onClick={() => setTimeSlot('Mattina')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${timeSlot === 'Mattina' ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'}`}>Mattina (AM)</button>
                            <button onClick={() => setTimeSlot('Pomeriggio')} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${timeSlot === 'Pomeriggio' ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'}`}>Pomeriggio (PM)</button>
                        </div>
                    </div>
                    <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] text-emerald-800 leading-relaxed italic font-medium">
                            * Nota: La data di ritiro e la fascia oraria vengono inserite nel file CSV per automatizzare la prenotazione sul portale del corriere.
                        </p>
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-primary text-white p-4 rounded-2xl font-black text-2xl shadow-xl shadow-primary/20 animate-in zoom-in duration-300">
                        {filteredForExport.length}
                    </div>
                    <div>
                        <p className="text-sm font-black text-gray-800 uppercase italic">Ordini Pronti per Export</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Vengono inclusi solo gli ordini "Confermati"</p>
                    </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button onClick={onClose} className="px-6 py-4 font-black text-gray-400 hover:text-gray-600 uppercase text-xs tracking-widest transition-colors">Annulla</button>
                    <button 
                        onClick={handleDownload} 
                        disabled={filteredForExport.length === 0} 
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-primary text-white font-black py-5 px-12 rounded-2xl shadow-2xl hover:brightness-110 hover:scale-105 transition-all disabled:opacity-30 disabled:grayscale disabled:hover:scale-100 active:scale-95 border-b-4 border-primary-dark"
                    >
                        <DownloadIcon className="w-6 h-6" />
                        GENERA E SCARICA
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportCSVModal;