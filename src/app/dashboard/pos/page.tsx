"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, User, Loader2, ShoppingBag, X } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "@/components/providers/i18n-provider";
import { getLicenseAction } from "@/features/admin/license-actions";
import type { LicenseStatus } from "@/lib/license-check";
import { saveOfflineInvoice, getPendingInvoices, markAsSynced, clearSyncedInvoices } from "@/lib/offline-db";

// Sync Progress Modal
function SyncModal({ dict, count, progress }: { dict: any, count: number, progress: number }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 text-center space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl border-none">
                <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                    <div
                        className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
                        style={{ animationDuration: '1.5s' }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">{dict.Common.Offline.Syncing}</h3>
                    <p className="text-sm text-slate-500 font-medium">
                        {count} {dict.POS.InvoicesCount}
                    </p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                        className="bg-blue-600 h-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </Card>
        </div>
    );
}

const OFFLINE_LIMIT_DAYS = 3;

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

export default function POSPage() {
    const { dict } = useTranslation() as any;
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [customers, setCustomers] = useState<{ id: number, name: string }[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [autoPrint, setAutoPrint] = useState(true);
    const [includeTax, setIncludeTax] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [license, setLicense] = useState<LicenseStatus | null>(null);
    const [shiftReportData, setShiftReportData] = useState<any>(null);

    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
    const componentRef = useRef<HTMLDivElement>(null);

    // --- Offline States ---
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [offlineLock, setOfflineLock] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success((dict as any).Common?.Offline?.ConnectionRestored || "تم استعادة الاتصال");
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.error((dict as any).Common?.Offline?.ConnectionLost || "فقد الاتصال");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [dict.Common.Offline]);

    // Check for pending and offline limit
    useEffect(() => {
        async function checkOfflineStatus() {
            const pending = await getPendingInvoices();
            setPendingCount(pending.length);

            const lastSync = localStorage.getItem('last_sync_timestamp');
            if (lastSync) {
                const diff = (Date.now() - Number(lastSync)) / (1000 * 60 * 60 * 24);
                if (diff > OFFLINE_LIMIT_DAYS && pending.length > 0) {
                    setOfflineLock(true);
                }
            } else if (pending.length > 0) {
                // Set initial sync timestamp if missing but have pending
                localStorage.setItem('last_sync_timestamp', pending[0].timestamp.toString());
            }
        }
        checkOfflineStatus();
    }, []);

    // Sync Logic
    useEffect(() => {
        if (isOnline && pendingCount > 0 && !isSyncing) {
            handleSync();
        }
    }, [isOnline, pendingCount]);

    const handleSync = async () => {
        setIsSyncing(true);
        const pending = await getPendingInvoices();
        let successCount = 0;

        for (let i = 0; i < pending.length; i++) {
            const inv = pending[i];
            try {
                const result = await createInvoice(inv.data);
                if (result.success) {
                    await markAsSynced(inv.id as any);
                    successCount++;
                    setSyncProgress(((i + 1) / pending.length) * 100);
                }
            } catch (e) {
                console.error("Sync failed for", inv.id, e);
            }
        }

        if (successCount > 0) {
            toast.success((dict as any).Common?.Offline?.SyncSuccess || "تمت المزامنة بنجاح");
            localStorage.setItem('last_sync_timestamp', Date.now().toString());
            setOfflineLock(false);
            await clearSyncedInvoices();
        }

        setIsSyncing(false);
        setPendingCount(0);
        setSyncProgress(0);
    };

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: "Receipt",
        onAfterPrint: () => setReceiptData(null)
    });

    useEffect(() => {
        async function loadData() {
            const licenseData = await getLicenseAction();
            setLicense(licenseData);
            setLoading(true);
            try {
                const walkInCustomer = { id: 0, name: dict.POS.WalkInCustomer };

                if (navigator.onLine) {
                    const custs = await getCustomers();
                    setCustomers([walkInCustomer, ...custs]);
                    setSelectedCustomerId(0);
                    // Mirror customers
                    const { mirrorData, STORES } = await import("@/lib/offline-db");
                    mirrorData(STORES.CUSTOMERS, custs);

                    const res = await fetch('/api/products/list');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.data) {
                            const mapped = data.data.map((p: any) => ({
                                id: p.id,
                                name: p.name,
                                sku: p.sku,
                                price: Number(p.sellPrice || 0),
                                stock: Number(p.stockQuantity || 0),
                                type: p.type
                            }));
                            setProducts(mapped);
                            setFilteredProducts(mapped);
                            // Mirror products
                            mirrorData(STORES.PRODUCTS, data.data);
                        }
                    }
                } else {
                    // Offline Load
                    const { getLocalData, STORES } = await import("@/lib/offline-db");
                    const localCusts = await getLocalData(STORES.CUSTOMERS);
                    setCustomers([walkInCustomer, ...localCusts]);
                    setSelectedCustomerId(0);

                    const localProds = await getLocalData(STORES.PRODUCTS);
                    const mapped = localProds.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        sku: p.sku,
                        price: Number(p.sellPrice || 0),
                        stock: Number(p.stockQuantity || 0),
                        type: p.type
                    }));
                    setProducts(mapped);
                    setFilteredProducts(mapped);
                    toast.info((dict as any).Common?.Offline?.WorkingOffline || "تعمل أوفلاين");
                }
            } catch (e) {
                console.error(e);
                toast.error(dict.POS.FailedToLoad);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [dict.POS.WalkInCustomer, dict.POS.FailedToLoad]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProducts(products);
        } else {
            const lower = searchQuery.toLowerCase();
            setFilteredProducts(products.filter(p =>
                p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower)
            ));
        }
    }, [searchQuery, products]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const removeFromCart = (id: number) => setCart(prev => prev.filter(item => item.id !== id));

    const updateQty = (id: number, delta: number) => {
        setCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
    };

    const clearCart = () => setCart([]);

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const netSubtotal = Math.max(0, subtotal - discount);
    const tax = includeTax ? netSubtotal * 0.14 : 0;
    const total = netSubtotal + tax;

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        let customerName = dict.POS.WalkInCustomer;
        if (selectedCustomerId !== 0 && selectedCustomerId !== null) {
            customerName = customers.find(c => c.id === selectedCustomerId)?.name || customerName;
        }

        const invoiceData = {
            customerName,
            issueDate: new Date().toISOString().split('T')[0],
            currency: "EGP",
            exchangeRate: 1,
            includeTax,
            items: cart.map(item => ({
                productId: item.id,
                description: item.name,
                quantity: item.qty,
                unitPrice: item.price
            })),
            discountAmount: discount,
            paymentMethod,
            initialPayment: total,
            tenantId: "" // Added for type compatibility
        };

        if (!isOnline) {
            try {
                await saveOfflineInvoice(invoiceData);
                toast.success((dict as any).Common?.Offline?.OfflineSaved || "تم الحفظ محلياً");
                setReceiptData({
                    storeName: dict.Logo || "Smart Acc",
                    invoiceNumber: `OFFLINE-${Date.now()}`,
                    date: new Date().toISOString(),
                    customerName,
                    items: cart.map(item => ({
                        description: item.name,
                        qty: item.qty,
                        price: item.price,
                        total: item.price * item.qty
                    })),
                    subtotal: subtotal,
                    tax: tax,
                    discount,
                    paymentMethod,
                    total: total,
                    tokenNumber: 0
                });
                clearCart();
                setDiscount(0);
                setPendingCount(prev => prev + 1);
                return;
            } catch (e) {
                toast.error(dict.Common.Error);
                return;
            }
        }

        setPaymentLoading(true);
        try {
            const subtotalVal = subtotal;
            const taxVal = tax;
            const totalVal = total;

            const result = await createInvoice(invoiceData);

            if (result.success) {
                toast.success(`${dict.POS.PaymentSuccess} #${result.id}`);
                setReceiptData({
                    storeName: dict.Logo || "Smart Acc",
                    invoiceNumber: `#${result.id}`,
                    date: new Date().toISOString(),
                    customerName,
                    items: cart.map(item => ({
                        description: item.name,
                        qty: item.qty,
                        price: item.price,
                        total: item.price * item.qty
                    })),
                    subtotal: subtotalVal,
                    tax: taxVal,
                    discount,
                    paymentMethod,
                    total: totalVal,
                    tokenNumber: result.tokenNumber
                });

                if (autoPrint && license?.isActivated) {
                    setTimeout(() => handlePrint(), 300);
                } else if (!license?.isActivated) {
                    toast.info(dict.Common.ActivateNow);
                }

                clearCart();
                setDiscount(0);
            } else {
                toast.error(result.message || "Error");
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
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-80px)] gap-4 p-2 md:p-4 text-slate-800 relative bg-slate-50 lg:bg-transparent">
            {isSyncing && <SyncModal dict={dict} count={pendingCount} progress={syncProgress} />}

            {offlineLock && (
                <div className="fixed inset-0 bg-white/95 z-[110] flex items-center justify-center p-6 text-center">
                    <div className="max-w-md space-y-6">
                        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Banknote size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">{dict.Common.Offline.SyncRequired}</h2>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            {dict.Common.Offline.DaysLeft.replace('{days}', '0')}
                        </p>
                        <Button onClick={() => window.location.reload()} className="w-full h-14 text-lg font-bold bg-blue-600">
                            {dict.POS.InvoicesList}
                        </Button>
                    </div>
                </div>
            )}

            <div className="hidden"><PosReceipt ref={componentRef} data={receiptData} /></div>

            {/* Mobile Tabs View */}
            <Tabs defaultValue="products" className="flex-1 flex flex-col lg:hidden w-full">
                <TabsList className="grid grid-cols-2 w-full mb-2 bg-white border h-12">
                    <TabsTrigger value="products" className="gap-2"><ShoppingBag size={18} /> {dict.Inventory.Title}</TabsTrigger>
                    <TabsTrigger value="cart" className="gap-2 relative">
                        <ShoppingCart size={18} /> {dict.POS.Cart}
                        {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{cart.length}</span>}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="products" className="flex-1 flex flex-col gap-4 m-0 overflow-auto">
                    <Card className="p-3 flex gap-2 items-center shadow-sm">
                        <Search size={18} className="text-gray-400" />
                        <Input placeholder={dict.POS.SearchPlaceholder} className="border-none shadow-none focus-visible:ring-0 p-0" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </Card>
                    <div className="grid grid-cols-2 gap-3 pb-24">
                        {loading ? <div className="col-span-2 py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div> : filteredProducts.map(product => (
                            <button key={product.id} onClick={() => addToCart(product)} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-all flex flex-col items-center text-center h-28 justify-between relative">
                                <h3 className="font-bold text-xs line-clamp-2 mb-1">{product.name}</h3>
                                <div className="w-full">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[11px] font-bold block mb-1">{Number(product.price).toFixed(2)}</span>
                                    {product.type === 'goods' && <span className={`text-[9px] ${product.stock <= 5 ? 'text-red-500' : 'text-gray-400'}`}>{dict.POS.Stock}: {product.stock}</span>}
                                </div>
                                <div className="absolute top-1 right-1 bg-blue-600 text-white p-1 rounded-full"><Plus size={10} /></div>
                            </button>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="cart" className="flex-1 flex flex-col gap-4 m-0 bg-white rounded-xl border shadow-sm p-4 pb-24 h-full min-h-[500px]">
                    <CartHeader dict={dict} cart={cart} clearCart={clearCart} handleLoadShiftReport={handleLoadShiftReport} shiftReportData={shiftReportData} />
                    <CartContent dict={dict} cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} />
                    <CartFooter dict={dict} subtotal={subtotal} tax={tax} total={total} discount={discount} setDiscount={setDiscount} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} autoPrint={autoPrint} setAutoPrint={setAutoPrint} includeTax={includeTax} setIncludeTax={setIncludeTax} handleCheckout={handleCheckout} paymentLoading={paymentLoading} cart={cart} />
                </TabsContent>
            </Tabs>

            {/* Desktop Side-by-Side */}
            <div className="hidden lg:flex flex-1 flex-col gap-4">
                <Card className="p-4 flex gap-4 items-center shadow-md">
                    <Search className="text-gray-400" />
                    <Input placeholder={dict.POS.SearchPlaceholder} className="text-lg h-12" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
                </Card>
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 rounded-xl border border-dashed border-gray-200 p-4">
                    {loading ? <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div> : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <button key={product.id} onClick={() => addToCart(product)} className="bg-white p-4 rounded-xl border hover:border-blue-500 hover:shadow-lg transition-all flex flex-col items-center text-center group h-32 justify-between relative">
                                    <div className="w-full">
                                        <h3 className="font-bold text-sm line-clamp-2 group-hover:text-blue-600 mb-1">{product.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
                                    </div>
                                    <div className="w-full">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold w-full block">{Number(product.price).toFixed(2)}</span>
                                        {product.type === 'goods' && <span className={`text-[10px] mt-1 block ${product.stock <= 5 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>{dict.POS.Stock}: {product.stock}</span>}
                                    </div>
                                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white p-2 rounded-full shadow-xl"><Plus size={16} /></div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Card className="hidden lg:flex w-[400px] flex-col bg-white overflow-hidden shadow-xl border-none">
                <div className="p-4 border-b"><CartHeader dict={dict} cart={cart} clearCart={clearCart} handleLoadShiftReport={handleLoadShiftReport} shiftReportData={shiftReportData} /></div>
                <div className="px-4 py-2 border-b bg-slate-50/50">
                    <Label className="text-xs text-gray-500 mb-1 block">{dict.POS.Customer}</Label>
                    <Select value={String(selectedCustomerId)} onValueChange={v => setSelectedCustomerId(Number(v))}>
                        <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"><CartContent dict={dict} cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} /></div>
                <CartFooter dict={dict} subtotal={subtotal} tax={tax} total={total} discount={discount} setDiscount={setDiscount} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} autoPrint={autoPrint} setAutoPrint={setAutoPrint} includeTax={includeTax} setIncludeTax={setIncludeTax} handleCheckout={handleCheckout} paymentLoading={paymentLoading} cart={cart} />
            </Card>

            {receiptData && (
                <div className="fixed bottom-24 lg:top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-top-4">
                    <Button onClick={() => license?.isActivated ? handlePrint() : toast.error(dict.Common.ActivateNow)} className={`font-bold shadow-2xl border-2 border-white rounded-full px-8 h-12 md:h-14 ${license?.isActivated ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-gray-400 text-gray-200"}`}>
                        {license?.isActivated ? `🖨️ ${dict.POS.PrintAgain}` : `🔒 ${dict.POS.ActivateNow}`}
                    </Button>
                </div>
            )}
        </div>
    );
}

function CartHeader({ dict, cart, clearCart, handleLoadShiftReport, shiftReportData }: any) {
    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 font-bold text-lg"><ShoppingCart className="w-5 h-5 text-blue-600" /> {dict.POS.Cart}</div>
            <div className="flex items-center gap-2">
                <Dialog>
                    <DialogTrigger asChild><Button variant="outline" size="sm" onClick={handleLoadShiftReport} className="h-8 px-2 text-xs gap-1">📊 {dict.POS.ShiftSummary}</Button></DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>{dict.POS.ShiftSummary}</DialogTitle></DialogHeader>
                        {shiftReportData ? (
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg border">
                                        <p className="text-xs text-gray-500 uppercase">{dict.POS.TodaySales}</p>
                                        <p className="text-2xl font-bold">{shiftReportData.totalAmount?.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border">
                                        <p className="text-xs text-gray-500 uppercase">{dict.POS.InvoicesCount}</p>
                                        <p className="text-2xl font-bold">{shiftReportData.count}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 border-t pt-4">
                                    <div className="flex justify-between text-sm"><span>💵 {dict.POS.Cash}</span><span className="font-mono">{shiftReportData.cashTotal?.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-sm"><span>💳 {dict.POS.Card}</span><span className="font-mono">{shiftReportData.cardTotal?.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-sm"><span>🏦 {dict.POS.Bank}</span><span className="font-mono">{shiftReportData.otherTotal?.toFixed(2)}</span></div>
                                </div>
                            </div>
                        ) : <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
                    </DialogContent>
                </Dialog>
                {cart.length > 0 && <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 h-8 px-1 text-xs hover:bg-red-50"><Trash2 className="w-3 h-3 mr-1" /> {dict.POS.Clear}</Button>}
            </div>
        </div>
    );
}

function CartContent({ dict, cart, updateQty, removeFromCart }: any) {
    if (cart.length === 0) return <div className="flex flex-col items-center justify-center py-20 text-gray-400"><ShoppingBag className="w-16 h-16 mb-4 opacity-10" /> <p className="text-sm font-medium">{dict.POS.EmptyCart}</p></div>;
    return cart.map((item: any) => (
        <div key={item.id} className="flex flex-col p-3 bg-white border border-gray-100 rounded-xl shadow-sm relative group">
            <div className="flex justify-between items-start mb-2 gap-2"><span className="font-bold text-sm line-clamp-2 flex-1">{item.name}</span> <span className="font-bold text-sm text-blue-700">{(item.price * item.qty).toFixed(2)}</span></div>
            <div className="flex items-center justify-between">
                <div className="text-[10px] text-gray-400 font-mono tracking-tight">{item.price.toFixed(2)} × {item.qty}</div>
                <div className="flex items-center gap-3 bg-slate-100 rounded-full px-2 py-1">
                    <button onClick={() => updateQty(item.id, -1)} className="text-gray-500 hover:text-red-500" title="Decrease" aria-label="Decrease"><Minus size={14} /></button>
                    <span className="text-xs w-4 text-center font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="text-gray-500 hover:text-green-500" title="Increase" aria-label="Increase"><Plus size={14} /></button>
                </div>
            </div>
            <button onClick={() => removeFromCart(item.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100" title="Remove" aria-label="Remove"><X size={10} /></button>
        </div>
    ));
}

function CartFooter({ dict, subtotal, tax, total, discount, setDiscount, paymentMethod, setPaymentMethod, autoPrint, setAutoPrint, includeTax, setIncludeTax, handleCheckout, paymentLoading, cart }: any) {
    return (
        <div className="p-4 bg-slate-50 border-t space-y-3">
            <div className="space-y-1.5 border-b pb-3 text-xs text-gray-500">
                <div className="flex justify-between"><span>{dict.POS.Subtotal}</span><span>{subtotal.toFixed(2)}</span></div>
                {includeTax && <div className="flex justify-between text-amber-600"><span>{dict.POS.Tax} (14%)</span><span>{tax.toFixed(2)}</span></div>}
                {discount > 0 && <div className="flex justify-between text-red-500"><span>{dict.POS.Discount}</span><span>-{discount.toFixed(2)}</span></div>}
            </div>
            <div className="flex justify-between text-xl font-black text-slate-900 py-1"><span>{dict.POS.Total}</span> <span>{total.toFixed(2)} <small className="text-[10px] font-normal text-gray-400">EGP</small></span></div>
            <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border text-[10px] font-medium"><span>{dict.POS.Discount}</span> <Input type="number" className="h-6 w-16 text-right text-[10px] p-1" value={discount} onChange={e => setDiscount(Number(e.target.value))} /></div>
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border text-[10px] font-medium"><span>{dict.POS.TaxToggle}</span> <input type="checkbox" checked={includeTax} onChange={e => setIncludeTax(e.target.checked)} className="w-4 h-4 accent-blue-600" title={dict.POS.TaxToggle} aria-label={dict.POS.TaxToggle} /></div>
            </div>
            <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                <TabsList className="grid grid-cols-3 w-full h-8 p-1 bg-gray-200">
                    <TabsTrigger value="cash" className="text-[9px] uppercase font-bold">{dict.POS.Cash}</TabsTrigger>
                    <TabsTrigger value="card" className="text-[9px] uppercase font-bold">{dict.POS.Card}</TabsTrigger>
                    <TabsTrigger value="bank" className="text-[9px] uppercase font-bold">{dict.POS.Bank}</TabsTrigger>
                </TabsList>
            </Tabs>
            <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold text-lg h-14 md:h-16 shadow-lg" onClick={handleCheckout} disabled={cart.length === 0 || paymentLoading}>{paymentLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CreditCard className="w-6 h-6" /> {dict.POS.PayCash}</>}</Button>
            <div className="flex items-center justify-center gap-2 pt-1"><input type="checkbox" id="auto-p" checked={autoPrint} onChange={e => setAutoPrint(e.target.checked)} className="w-4 h-4 accent-blue-600" /> <label htmlFor="auto-p" className="text-[11px] font-bold text-gray-500 cursor-pointer">{dict.POS.AutoPrint}</label></div>
        </div>
    );
}
