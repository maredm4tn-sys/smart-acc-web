
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
    // --- State ---
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [customers, setCustomers] = useState<{ id: number, name: string }[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null); // Default generic?
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [autoPrint, setAutoPrint] = useState(true); // New Auto Print State

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
            setLoading(true);
            try {
                // 1. Fetch Customers
                const custs = await getCustomers();

                // Add "Walk-in Customer" as the first option manually
                const walkInCustomer = { id: 0, name: "عميل نقدي (Walk-in)" };
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
                toast.error("فشل تحميل البيانات");
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
    const tax = subtotal * 0.14; // 14% VAT
    const total = subtotal + tax;

    // --- Checkout ---
    const handleCheckout = async () => {
        if (cart.length === 0) return;

        // Find selected customer OR use default Walk-in
        let customerName = "عميل نقدي";
        if (selectedCustomerId !== 0 && selectedCustomerId !== null) {
            const selected = customers.find(c => c.id === selectedCustomerId);
            if (selected) customerName = selected.name;
        }

        setPaymentLoading(true);
        try {
            // Calculate final totals for Receipt
            const subtotalVal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
            const taxVal = subtotalVal * 0.14;
            const totalVal = subtotalVal + taxVal;

            // Build the Invoice Payload matching createInvoice signature
            const result = await createInvoice({
                customerName: customerName,
                issueDate: new Date().toISOString().split('T')[0],
                currency: "EGP",
                exchangeRate: 1,
                includeTax: true, // Auto-apply tax for POS
                items: cart.map(item => ({
                    productId: item.id,
                    description: item.name,
                    quantity: item.qty,
                    unitPrice: item.price
                })),
                initialPayment: totalVal, // Pay FULL amount for POS
                tenantId: undefined // Handled by server
            });

            if (result.success) {
                toast.success(`تم الدفع بنجاح! فاتورة #${result.id}`);

                // Prepare Receipt Data
                const newReceipt: ReceiptData = {
                    storeName: "المحاسب الذكي", // TODO: Get from settings
                    invoiceNumber: `#${result.id}`, // Or the real invoice number if returned
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
                    total: totalVal
                };

                setReceiptData(newReceipt);

                // Conditional Auto Print logic
                if (autoPrint) {
                    setTimeout(() => {
                        handlePrint();
                    }, 300);
                }

                clearCart();
            } else {
                toast.error("فشل في حفظ الفاتورة: " + (result.message || result.error || "خطأ غير معروف"));
            }
        } catch (e) {
            console.error(e);
            toast.error("حدث خطأ غير متوقع");
        } finally {
            setPaymentLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-80px)] gap-4 p-4 text-slate-800 relative">
            {/* Hidden Receipt Component */}
            <div style={{ display: "none" }}>
                {/* Only render when data exists to avoid empty prints */}
                <PosReceipt ref={componentRef} data={receiptData} />
            </div>

            {/* Floating Manual Print Button if Receipt is Ready (Fallback) */}
            {receiptData && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
                    <Button
                        onClick={() => handlePrint()}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xl border-2 border-white"
                        size="lg"
                    >
                        🖨️ طباعة الفاتورة مرة أخرى
                    </Button>
                </div>
            )}

            {/* Left Side: Products Grid */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Search Bar */}
                <Card className="p-4 flex gap-4 items-center">
                    <Search className="text-gray-400" />
                    <Input
                        placeholder="بحث عن منتج (الاسم أو الباركود)..."
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
                            <p>لا توجد منتجات مطابقة</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    title={`إضافة ${product.name} للسلة`}
                                    className="bg-white p-4 rounded-xl border hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center text-center group h-32 justify-between"
                                >
                                    <div className="w-full">
                                        <h3 className="font-bold text-sm line-clamp-2 group-hover:text-blue-600 mb-1">{product.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
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
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <ShoppingCart className="w-5 h-5" />
                        سلة البيع
                    </div>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-red-500 text-xs hover:underline flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />
                            إفراغ
                        </button>
                    )}
                </div>

                {/* Customer Select */}
                <div className="px-4 py-2 border-b bg-white">
                    <Label htmlFor="customer-select" className="text-xs text-gray-500 mb-1 block">العميل</Label>
                    <select
                        id="customer-select"
                        title="اختر العميل"
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
                            <p className="text-sm">السلة فارغة</p>
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
                                        <button onClick={() => updateQty(item.id, -1)} title="تقليل الكمية" className="p-1 hover:text-red-500"><Minus className="w-3 h-3" /></button>
                                        <span className="text-xs w-4 text-center font-bold">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, 1)} title="زيادة الكمية" className="p-1 hover:text-green-500"><Plus className="w-3 h-3" /></button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    title="حذف من السلة"
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
                        <span>المجموع الفرعي</span>
                        <span>{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>الضريبة (14%)</span>
                        <span>{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t mt-2">
                        <span>الإجمالي</span>
                        <span>{total.toFixed(2)}</span>
                    </div>

                    {/* Auto Print Toggle */}
                    <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg border border-blue-100 mt-2">
                        <label htmlFor="auto-print" className="text-sm font-medium text-blue-900 cursor-pointer select-none">
                            طباعة الفاتورة تلقائياً
                        </label>
                        <input
                            id="auto-print"
                            type="checkbox"
                            checked={autoPrint}
                            onChange={(e) => setAutoPrint(e.target.checked)}
                            className="w-5 h-5 accent-blue-600 cursor-pointer"
                        />
                    </div>

                    <Button
                        size="lg"
                        className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white gap-2 font-bold text-lg h-14"
                        disabled={cart.length === 0 || paymentLoading}
                        onClick={handleCheckout}
                    >
                        {paymentLoading ? <Loader2 className="animate-spin" /> : <Banknote className="w-6 h-6" />}
                        {paymentLoading ? "جاري المعالجة..." : "دفع نقدي (Cash)"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
