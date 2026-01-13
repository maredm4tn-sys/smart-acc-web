"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Barcode as BarcodeIcon } from "lucide-react";
import JsBarcode from "jsbarcode";
import { useReactToPrint } from "react-to-print";

interface Product {
    id: number;
    name: string;
    sku: string;
    barcode?: string | null;
    sellPrice: string | number;
}

export function BarcodePrintDialog({ product }: { product: Product }) {
    const [open, setOpen] = useState(false);
    const [copies, setCopies] = useState(1);
    const [settings, setSettings] = useState({
        showCompanyName: true,
        companyName: "المحاسب الذكي",
        showProductName: true,
        showPrice: true,
        showSKU: true,
        width: 38, // mm
        height: 25, // mm
        fontSize: 12,
    });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem("barcode_settings");
        if (savedSettings) {
            try {
                setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
            } catch (e) {
                console.error("Failed to load barcode settings", e);
            }
        }
    }, []);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("barcode_settings", JSON.stringify(settings));
    }, [settings]);

    // Generate Barcode on Canvas for Preview
    useEffect(() => {
        if (open && canvasRef.current) {
            try {
                JsBarcode(canvasRef.current, product.barcode || product.sku, {
                    format: "CODE128",
                    width: 2,
                    height: 40,
                    displayValue: true,
                    fontSize: 14,
                    margin: 0,
                    font: "Arial",
                    textAlign: "center"
                });
            } catch (e) {
                console.error("Barcode generation failed", e);
            }
        }
    }, [open, product, settings]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Barcode_${product.name}`,
    });

    // Helper to generate a single label JSX
    const SingleLabel = () => (
        <div
            style={{
                width: `${settings.width}mm`,
                height: `${settings.height}mm`,
                padding: "2mm",
                border: "1px dashed #ccc", // Visible in preview, hidden in print via media query
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "white",
                overflow: "hidden",
                pageBreakInside: "avoid"
            }}
            className="print-label relative"
        >
            {settings.showCompanyName && (
                <div className="font-bold text-center w-full whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: `${settings.fontSize}px` }}>
                    {settings.companyName}
                </div>
            )}

            {settings.showProductName && (
                <div className="text-center w-full px-1 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: `${settings.fontSize - 2}px` }}>
                    {product.name}
                </div>
            )}

            {/* Barcode Image using <img> src from Canvas or re-generated */}
            <div className="flex-1 flex items-center justify-center w-full overflow-hidden my-1">
                <svg id={`barcode-${product.id}`} className="w-full h-full max-h-[40px]"></svg>
            </div>

            <div className="flex justify-between w-full px-1 items-end">
                {settings.showSKU && <span style={{ fontSize: '10px' }} className="font-mono">{product.sku}</span>}
                {settings.showPrice && <span className="font-bold" style={{ fontSize: `${settings.fontSize}px` }}>{Number(product.sellPrice).toFixed(2)}</span>}
            </div>
        </div>
    );

    // Effect to render barcode into SVGs inside the hidden print area
    useEffect(() => {
        if (open) {
            // Need a slight delay or logic to target all generated SVGs
            setTimeout(() => {
                const svgs = document.querySelectorAll(`svg[id^="barcode-${product.id}"]`);
                svgs.forEach(svg => {
                    try {
                        JsBarcode(svg, product.barcode || product.sku, {
                            format: "CODE128",
                            width: 1.5,
                            height: 30,
                            displayValue: false, // We show value manually if needed, or let it show
                            margin: 0,
                        });
                    } catch (e) { }
                });
            }, 100);
        }
    }, [open, copies, settings]);


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="طباعة باركود">
                    <BarcodeIcon className="h-4 w-4 text-slate-600" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Printer className="h-5 w-5" />
                        طباعة باركود - {product.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
                    {/* Settings Panel */}
                    <div className="md:col-span-4 space-y-4 border-l pl-4 rtl:border-l-0 rtl:border-r rtl:pr-4">
                        <div className="space-y-2">
                            <Label>اسم الشركة</Label>
                            <Input
                                value={settings.companyName}
                                onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="showCompany"
                                    checked={settings.showCompanyName}
                                    onCheckedChange={(c) => setSettings({ ...settings, showCompanyName: !!c })}
                                />
                                <Label htmlFor="showCompany">طباعة اسم الشركة</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="showProduct"
                                    checked={settings.showProductName}
                                    onCheckedChange={(c) => setSettings({ ...settings, showProductName: !!c })}
                                />
                                <Label htmlFor="showProduct">طباعة اسم الصنف</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="showPrice"
                                    checked={settings.showPrice}
                                    onCheckedChange={(c) => setSettings({ ...settings, showPrice: !!c })}
                                />
                                <Label htmlFor="showPrice">طباعة السعر</Label>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">العرض (mm)</Label>
                                <Input type="number" value={settings.width} onChange={e => setSettings({ ...settings, width: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">الارتفاع (mm)</Label>
                                <Input type="number" value={settings.height} onChange={e => setSettings({ ...settings, height: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">العدد</Label>
                                <Input type="number" min={1} value={copies} onChange={e => setCopies(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">حجم الخط</Label>
                                <Input type="number" value={settings.fontSize} onChange={e => setSettings({ ...settings, fontSize: Number(e.target.value) })} />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button onClick={() => handlePrint && handlePrint()} className="w-full gap-2" size="lg">
                                <Printer className="h-4 w-4" /> طباعة
                            </Button>
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="md:col-span-8 bg-slate-100 rounded-lg p-8 flex flex-col items-center justify-center min-h-[400px]">
                        <h3 className="text-sm font-semibold text-slate-500 mb-4">معاينة (Live Preview)</h3>

                        {/* Single Label Preview */}
                        <div className="bg-white shadow-xl transform scale-125 mb-8">
                            <SingleLabel />
                        </div>

                        {/* Hidden Print Area */}
                        <div className="hidden">
                            <div ref={printRef} className="print-area p-4">
                                <style type="text/css" media="print">
                                    {`
                                        @page { size: auto; margin: 0mm; }
                                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                                        .print-label { border: none !important; margin-bottom: 2mm; page-break-inside: avoid; }
                                        .print-grid { display: flex; flex-wrap: wrap; gap: 2mm; }
                                     `}
                                </style>
                                <div className="print-grid">
                                    {Array.from({ length: copies }).map((_, i) => (
                                        <div key={i}><SingleLabel /></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
