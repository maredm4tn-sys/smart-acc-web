
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, User, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { createInvoice } from "@/features/sales/actions";
import { getCustomers } from "@/features/customers/actions";
import { useReactToPrint } from "react-to-print";
import { PosReceipt, type ReceiptData } from "@/features/sales/components/pos-receipt";
import { getShiftReport } from "@/features/sales/pos-actions";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/components/providers/i18n-provider";
import { getLicenseAction } from "@/features/admin/license-actions";
import type { LicenseStatus } from "@/lib/license-check";

// --- Types ---
type Product = {
    id: number;
    name: string;
    sku: string;
    price: number;
    stock: number;
    type: 'goods' | 'service';
};

type CartItem = Product & {
    qty: number;
};

// --- Mock Data Service (Replace with Server Actions) ---
// We will fetch this inside the component
// -----------------------------------------------------

export default function POSPage() {
    const { dict } = useTranslation() as any;
    // --- State ---
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [customers, setCustomers] = useState<{ id: number, name: string }[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null); // Default generic?
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [autoPrint, setAutoPrint] = useState(true);
    const [includeTax, setIncludeTax] = useState(false); // Default to FALSE for doctor/medical
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [license, setLicense] = useState<LicenseStatus | null>(null);
    const [shiftReportData, setShiftReportData] = useState<any>(null);

    // --- Printing State ---
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: "Receipt",
        onAfterPrint: () => setReceiptData(null)
    });

    // Initial Load
    useEffect(() => {
        async function loadData() {
            const licenseData = await getLicenseAction();
            setLicense(licenseData);
            setLoading(true);
            try {
                // 1. Fetch Customers
                const custs = await getCustomers();

                // Add "Walk-in Customer" as the first option manually
                const walkInCustomer = { id: 0, name: dict.POS.WalkInCustomer };
                const fullList = [walkInCustomer, ...custs];

                setCustomers(fullList);

                // Default to Walk-in Customer (ID 0)
                setSelectedCustomerId(0);

                // Fetch Products
                // We need a server action for this to be clean.
                // I will create a small separate file for POS actions later.
                // For now, let's just fetch from an endpoint I will make: /api/products/list
                const res = await fetch('/api/products/list');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        setProducts(data.data.map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            sku: p.sku,
                            price: Number(p.sellPrice || 0),
                            stock: Number(p.stockQuantity || 0),
                            type: p.type
                        })));
                        setFilteredProducts(data.data.map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            sku: p.sku,
                            price: Number(p.sellPrice || 0),
                            stock: Number(p.stockQuantity || 0),
                            type: p.type
                        })));
                    }
                }

            } catch (e) {
                console.error("Failed to load POS data", e);
                toast.error(dict.POS.FailedToLoad || "Error loading data");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // --- Search Logic ---
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProducts(products);
        } else {
            const lower = searchQuery.toLowerCase();
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                p.sku.toLowerCase().includes(lower)
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, products]);

    // --- Cart Actions ---
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            } else {
                return [...prev, { ...product, qty: 1 }];
            }
        });
        // Play beep sound?
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const clearCart = () => setCart([]);

    // --- Totals ---
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const netSubtotal = Math.max(0, subtotal - discount);
    const tax = includeTax ? netSubtotal * 0.14 : 0;
    const total = netSubtotal + tax;

    // --- Checkout ---
    const handleCheckout = async () => {
        if (cart.length === 0) return;

        // Find selected customer OR use default Walk-in
        let customerName = dict.POS.WalkInCustomer;
        if (selectedCustomerId !== 0 && selectedCustomerId !== null) {
            const selected = customers.find(c => c.id === selectedCustomerId);
            if (selected) customerName = selected.name;
        }

        setPaymentLoading(true);
        try {
            // Calculate final totals for Receipt
            const subtotalVal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
            const taxVal = includeTax ? subtotalVal * 0.14 : 0;
            const totalVal = subtotalVal + taxVal;

            // Build the Invoice Payload matching createInvoice signature
            const result = await createInvoice({
                customerName: customerName,
                issueDate: new Date().toISOString().split('T')[0],
                currency: "EGP",
                exchangeRate: 1,
                includeTax: includeTax,
                items: cart.map(item => ({
                    productId: item.id,
                    description: item.name,
                    quantity: item.qty,
                    unitPrice: item.price
                })),
                discountAmount: discount,
                paymentMethod: paymentMethod,
                initialPayment: totalVal, // Pay FULL amount for POS
                tenantId: undefined // Handled by server
            });

            if (result.success) {
                toast.success(`${dict.POS.PaymentSuccess} #${result.id}`);

                // Prepare Receipt Data
                const newReceipt: ReceiptData = {
                    storeName: dict.Logo || "Smart Acc",
                    invoiceNumber: `#${result.id}`,
                    date: new Date().toISOString(),
                    customerName: customerName,
                    items: cart.map(item => ({
                        description: item.name,
                        qty: item.qty,
                        price: item.price,
                        total: item.price * item.qty
                    })),
                    subtotal: subtotalVal,
                    tax: taxVal,
                    discount: discount,
                    paymentMethod: paymentMethod,
                    total: totalVal,
                    tokenNumber: result.tokenNumber
                };

                setReceiptData(newReceipt);

                // Update local products stock if we have them in memory
                setProducts(prev => prev.map(p => {
                    const cartItem = cart.find(ci => ci.id === p.id);
                    if (cartItem && p.type === 'goods') {
                        return { ...p, stock: p.stock - cartItem.qty };
                    }
                    return p;
                }));

                // Conditional Auto Print logic
                if (autoPrint && (license?.isActivated || !license?.isExpired)) {
                    // Note: In real scenarios, we might want to block print entirely for non-activated
                    // Even if not expired, since user asked for "feature restriction"
                    if (license?.isActivated) {
                        setTimeout(() => {
                            handlePrint();
                        }, 300);
                    } else {
                        toast.info(dict.Common.ActivateNow);
                    }
                }

                clearCart();
                setDiscount(0); // Reset discount
            } else {
                toast.error(`${dict.Sales.Invoice.Error}: ` + (result.message || "Unknown error"));
            }
        } catch (e) {
            console.error(e);
            toast.error(dict.Common.Error);
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleLoadShiftReport = async () => {
        const res = await getShiftReport();
        if (res?.success) setShiftReportData(res.data);
    };

    return (
        <div className="flex h-[calc(100vh-80px)] gap-4 p-4 text-slate-800 relative">
            {/* Hidden Receipt Component */}
            <div className="hidden">
                {/* Only render when data exists to avoid empty prints */}
                <PosReceipt ref={componentRef} data={receiptData} />
            </div>

            {/* Floating Manual Print Button if Receipt is Ready (Fallback) */}
            {receiptData && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
                    <Button
                        onClick={() => {
                            if (license?.isActivated) handlePrint();
                            else toast.error(dict.Common.ActivateNow);
                        }}
                        className={`font-bold shadow-xl border-2 border-white ${license?.isActivated ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-gray-400 cursor-not-allowed text-gray-200"}`}
                        size="lg"
                    >
                        {license?.isActivated ? `🖨️ ${dict.POS.PrintAgain}` : `🔒 ${dict.POS.ActivateNow}`}
                    </Button>
                </div>
            )}

            {/* Left Side: Products Grid */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Search Bar */}
                <Card className="p-4 flex gap-4 items-center">
                    <Search className="text-gray-400" />
                    <Input
                        placeholder={dict.POS.SearchPlaceholder}
                        className="text-lg h-12"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </Card>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 rounded-xl border border-dashed border-gray-200 p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <ShoppingBag className="w-12 h-12 mb-2 opacity-20" />
                            <p>{dict.POS.NoProducts}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    title={`${dict.POS.AddToCart || "Add"} ${product.name}`}
                                    className="bg-white p-4 rounded-xl border hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center text-center group h-32 justify-between"
                                >
                                    <div className="w-full relative">
                                        <h3 className="font-bold text-sm line-clamp-2 group-hover:text-blue-600 mb-1">{product.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
                                        {product.type === 'goods' && (
                                            <span className={`absolute -top-6 -right-2 text-[10px] px-1.5 py-0.5 rounded-full border border-white shadow-sm ${product.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {dict.POS.Stock}: {product.stock}
                                            </span>
                                        )}
                                    </div>
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold w-full mt-2">
                                        {product.price.toFixed(2)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side: Cart Panel */}
            <div className="w-[400px] flex flex-col bg-white rounded-xl border shadow-sm h-full overflow-hidden">
                {/* Cart Header */}
                <div className="flex items-center gap-2 font-bold text-lg">
                    <ShoppingCart className="w-5 h-5" />
                    {dict.POS.Cart}
                </div>
                <div className="flex items-center gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleLoadShiftReport} title={dict.POS.ShiftReport}>
                                <Plus className="w-4 h-4 rotate-45" /> {/* Use a report-like icon if available */}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>{dict.POS.ShiftSummary}</DialogTitle>
                            </DialogHeader>
                            {shiftReportData ? (
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg border">
                                            <p className="text-xs text-gray-500 uppercase">{dict.POS.TodaySales}</p>
                                            <p className="text-2xl font-bold">{shiftReportData.totalAmount?.toFixed(2) || '0.00'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border">
                                            <p className="text-xs text-gray-500 uppercase">{dict.POS.InvoicesCount}</p>
                                            <p className="text-2xl font-bold">{shiftReportData.count || 0}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 border-t pt-4">
                                        <div className="flex justify-between text-sm">
                                            <span>💵 {dict.POS.Cash}</span>
                                            <span className="font-mono">{shiftReportData.cashTotal?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>💳 {dict.POS.Card}</span>
                                            <span className="font-mono">{shiftReportData.cardTotal?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>🏦 {dict.POS.Bank}</span>
                                            <span className="font-mono">{shiftReportData.otherTotal?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 border-t">
                                            <span>🏷️ {dict.POS.Discount}</span>
                                            <span className="font-mono text-red-500">{shiftReportData.discountAmount?.toFixed(2) || '0.00'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />
                            {dict.POS.Clear}
                        </button>
                    )}
                </div>

                {/* Customer Select */}
                <div className="px-4 py-2 border-b bg-white">
                    <Label htmlFor="customer-select" className="text-xs text-gray-500 mb-1 block">{dict.POS.Customer}</Label>
                    <select
                        id="customer-select"
                        title={dict.POS.SelectCustomer}
                        className="w-full text-sm border-gray-200 rounded-md p-2 border focus:ring-1 focus:ring-blue-500 outline-none"
                        value={selectedCustomerId || ''}
                        onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                    >
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-sm">{dict.POS.EmptyCart}</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex flex-col p-3 bg-gray-50 rounded-lg border group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-sm line-clamp-1 flex-1 ml-2">{item.name}</span>
                                    <span className="font-bold text-sm">{(item.price * item.qty).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-400">{item.price} × {item.qty}</div>
                                    <div className="flex items-center gap-3 bg-white border rounded px-1">
                                        <button onClick={() => updateQty(item.id, -1)} title={dict.POS.DecreaseQty || "Decrease"} className="p-1 hover:text-red-500"><Minus className="w-3 h-3" /></button>
                                        <span className="text-xs w-4 text-center font-bold">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, 1)} title={dict.POS.IncreaseQty || "Increase"} className="p-1 hover:text-green-500"><Plus className="w-3 h-3" /></button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    title={dict.POS.RemoveFromCart || "Remove"}
                                    className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Totals */}
                <div className="p-4 bg-gray-50 border-t space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>{dict.POS.Subtotal}</span>
                        <span>{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>{dict.POS.Tax}</span>
                        <span>{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t mt-2">
                        <span>{dict.POS.Total}</span>
                        <span>{total.toFixed(2)}</span>
                    </div>

                    {/* Discount Input */}
                    <div className="bg-white p-2 rounded-lg border mt-2 flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-500">{dict.POS.Discount}</label>
                        <div className="flex items-center gap-2 w-24">
                            <Input
                                type="number"
                                min="0"
                                className="h-7 text-right text-xs"
                                value={discount}
                                onChange={e => setDiscount(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="mt-2">
                        <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                            <TabsList className="grid grid-cols-3 w-full h-9">
                                <TabsTrigger value="cash" className="text-[10px]">{dict.POS.Cash}</TabsTrigger>
                                <TabsTrigger value="card" className="text-[10px]">{dict.POS.Card}</TabsTrigger>
                                <TabsTrigger value="bank" className="text-[10px]">{dict.POS.Bank}</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Auto Print Toggle */}
                    <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-100 mt-2">
                        <label htmlFor="auto-print" className="text-sm font-medium text-blue-900 cursor-pointer select-none">
                            {dict.POS.AutoPrint}
                        </label>
                        <input
                            id="auto-print"
                            type="checkbox"
                            checked={autoPrint}
                            onChange={(e) => setAutoPrint(e.target.checked)}
                            className="w-5 h-5 accent-blue-600 cursor-pointer"
                        />
                    </div>

                    {/* Tax Toggle (Standard 14%) */}
                    <div className="flex items-center justify-between bg-amber-50 p-2 rounded-lg border border-amber-100 mt-2">
                        <label htmlFor="tax-toggle" className="text-sm font-medium text-amber-900 cursor-pointer select-none">
                            {dict.POS.TaxToggle}
                        </label>
                        <input
                            id="tax-toggle"
                            type="checkbox"
                            checked={includeTax}
                            onChange={(e) => setIncludeTax(e.target.checked)}
                            className="w-5 h-5 accent-amber-600 cursor-pointer"
                        />
                    </div>

                    <Button
                        size="lg"
                        className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white gap-2 font-bold text-lg h-14"
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || paymentLoading}
                    >
                        {paymentLoading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <CreditCard className="w-6 h-6" />
                                {dict.POS.PayCash}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
