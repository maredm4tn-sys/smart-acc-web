"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { useShift } from "@/features/shifts/context/shift-context";

// --- Types ---
export type Unit = {
    id: number;
    name: string;
}

export type Product = {
    id: number;
    name: string;
    sku: string;
    barcode?: string;
    sellPrice: number;
    priceWholesale: number;
    priceHalfWholesale: number;
    priceSpecial: number;
    buyPrice: number;
    stockQuantity: number;
    minStock: number;
    unitId?: number;
    unit?: Unit;
    type: 'goods' | 'service';
};

export type CartItem = {
    id: string; // unique ID for cart item (product_id + timestamp or similar to allow duplicates if needed, but usually productId)
    productId: number;
    name: string;
    sku: string;
    price: number;
    originalPrice: number; // For reference
    qty: number;
    discount: number; // Value
    unitId?: number;
    storeId?: number;
    notes?: string;
    stock: number;
    isReturn?: boolean; // If true, this item is being returned (negative qty logic)
};

export type PriceType = 'retail' | 'wholesale' | 'half_wholesale' | 'special';

export type InvoiceHeader = {
    customerId: number;
    customerName: string;
    storeId: number;
    priceType: PriceType;
    date: Date;
    dueDate?: Date;
    salesRepId?: number;
    notes?: string;
    paymentMethod: 'cash' | 'credit' | 'card' | 'multi';
};

export type InvoiceTotals = {
    subtotal: number;
    discountAmount: number; // Bill level discount
    discountPercent: number;
    taxAmount: number;
    taxRate: number;
    deliveryFee: number;
    total: number;
    net: number; // After discount before tax/delivery? Or final Net? Usually Total required to pay.
    paid: number;
    remaining: number;
};

// --- Context State ---
type POSContextType = {
    // State
    items: CartItem[];
    header: InvoiceHeader;
    totals: InvoiceTotals;
    products: Product[];
    customers: any[];
    activeShift: any | null;
    isLoading: boolean;
    isSuspendedMode: boolean; // Are we viewing a suspended invoice?

    // Settings
    settings: {
        directAdd: boolean;
        autoPrint: boolean;
        showImages: boolean;
        printLayout: 'standard' | 'thermal';
    };

    // Actions
    setSettings: (updates: Partial<POSContextType['settings']>) => void;
    addToCart: (product: Product, qty?: number) => void;
    updateItem: (id: string, updates: Partial<CartItem>) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;

    setHeader: (updates: Partial<InvoiceHeader>) => void;
    setTotals: (updates: Partial<InvoiceTotals>) => void;

    // Helpers
    refreshProducts: () => Promise<void>;
    suspendInvoice: () => Promise<void>;
    checkout: () => Promise<{ success: boolean; id?: number }>;
};

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: React.ReactNode }) {
    // --- State ---
    const [items, setItems] = useState<CartItem[]>([]);
    const [header, setHeader] = useState<InvoiceHeader>({
        customerId: 0, // 0 usually for Walk-in
        customerName: "",
        storeId: 1,
        priceType: 'retail',
        date: new Date(),
        paymentMethod: 'cash'
    });
    const [totals, setTotals] = useState<InvoiceTotals>({
        subtotal: 0,
        discountAmount: 0,
        discountPercent: 0,
        taxAmount: 0,
        taxRate: 0, // 14% usually
        deliveryFee: 0,
        total: 0,
        net: 0,
        paid: 0,
        remaining: 0
    });
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const { activeShift, checkActiveShift } = useShift();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuspendedMode, setIsSuspendedMode] = useState(false);
    const [settings, setSettings] = useState({
        directAdd: false,
        autoPrint: true,
        showImages: false,
        printLayout: 'thermal' as 'standard' | 'thermal'
    });

    // --- Calculations ---
    useEffect(() => {
        const sub = items.reduce((acc, item) => acc + (item.price * item.qty - item.discount), 0);

        // Bill Level Discount
        const billDiscount = totals.discountAmount + (totals.discountPercent > 0 ? (sub * totals.discountPercent / 100) : 0);

        const afterDiscount = Math.max(0, sub - billDiscount);

        // Tax
        const tax = totals.taxAmount + (totals.taxRate > 0 ? (afterDiscount * totals.taxRate / 100) : 0);

        const totalFinal = afterDiscount + tax + Number(totals.deliveryFee);

        setTotals(prev => ({
            ...prev,
            subtotal: sub,
            total: totalFinal,
            remaining: Math.max(0, totalFinal - prev.paid)
        }));
    }, [items, totals.discountAmount, totals.discountPercent, totals.taxAmount, totals.taxRate, totals.deliveryFee, totals.paid]);

    // --- Actions ---
    const addToCart = useCallback((product: Product, qty: number = 1) => {
        // Determine Price based on Header Price Type
        let startPrice = product.sellPrice;
        if (header.priceType === 'wholesale') startPrice = product.priceWholesale;
        if (header.priceType === 'half_wholesale') startPrice = product.priceHalfWholesale;
        if (header.priceType === 'special') startPrice = product.priceSpecial;
        if (startPrice === 0 && header.priceType !== 'retail') startPrice = product.sellPrice; // Fallback

        setItems(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + qty } : i);
            }
            return [...prev, {
                id: crypto.randomUUID(),
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: startPrice,
                originalPrice: startPrice,
                qty: qty,
                discount: 0,
                stock: product.stockQuantity,
                unitId: product.unitId
            }];
        });
    }, [header.priceType]);

    const updateItem = useCallback((id: string, updates: Partial<CartItem>) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    }, []);

    const removeFromCart = useCallback((id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setTotals(prev => ({ ...prev, paid: 0, discountAmount: 0 }));
    }, []);

    // --- Effects ---
    useEffect(() => {
        refreshProducts();
        loadCustomers();
        checkActiveShift();
        loadSystemSettings();
    }, [checkActiveShift]);

    const loadSystemSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data) {
                    setSettings(prev => ({
                        ...prev,
                        printLayout: (data.data.defaultPrintPOS as any) || 'thermal'
                    }));
                }
            }
        } catch (e) { console.error(e); }
    };



    const loadCustomers = async () => {
        try {
            // We'll use the API route or action. 
            // Since we are in a client component, we can call server actions if they are imported.
            // But let's verify imports.
            // Simple fetch for now to be safe and fast.
            const res = await fetch('/api/customers');
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    setCustomers(data.data);
                } else {
                    setCustomers([]);
                }
            }
        } catch (e) { console.error("Failed to load customers", e); }
    };

    const refreshProducts = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/products/list');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // Map API data to Product type
                    const mapped = data.data.map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        sku: p.sku,
                        barcode: p.barcode,
                        sellPrice: Number(p.sellPrice || 0),
                        priceWholesale: Number(p.priceWholesale || 0),
                        priceHalfWholesale: Number(p.priceHalfWholesale || 0),
                        priceSpecial: Number(p.priceSpecial || 0),
                        buyPrice: Number(p.buyPrice || 0),
                        stockQuantity: Number(p.stockQuantity || 0),
                        minStock: Number(p.minStock || 0),
                        unitId: p.unitId,
                        type: p.type
                    }));
                    setProducts(mapped);
                }
            }
        } catch (e) {
            toast.error("فشل تحميل الأصناف");
        } finally {
            setIsLoading(false);
        }
    };

    const checkout = async () => {
        if (items.length === 0) {
            toast.error("السلة فارغة");
            return { success: false };
        }

        setIsLoading(true);
        try {
            // Import action dynamically to avoid build cycle issues if any, or just standard import
            const { createInvoice } = await import("@/features/sales/actions");

            const invoiceData = {
                customerId: header.customerId === 0 ? null : header.customerId,
                customerName: header.customerName || "عميل نقدي",
                storeId: header.storeId,
                priceType: header.priceType,
                paymentMethod: header.paymentMethod,

                // Dates
                issueDate: header.date.toISOString().split('T')[0],

                // Items
                items: items.map(item => ({
                    productId: item.productId,
                    description: item.name,
                    quantity: item.qty,
                    unitPrice: item.price,
                    discount: item.discount, // Item level discount
                    unitId: item.unitId,
                    storeId: header.storeId
                })),

                // Totals
                includeTax: totals.taxRate > 0,
                // The action calculates totals, but passing these helps if action logic differs or for validation
                discountAmount: totals.discountAmount, // Fixed amount
                discountPercent: totals.discountPercent,
                deliveryFee: totals.deliveryFee,

                // Installment / Payment
                initialPayment: totals.paid,
                currency: "EGP",
                exchangeRate: 1,
            };

            const result = await createInvoice(invoiceData as any);

            if (result.success) {
                toast.success(`تم حفظ الفاتورة #${result.id}`);
                return { success: true, id: result.id };
            } else {
                toast.error(result.message || "حدث خطأ أثناء الحفظ");
                return { success: false };
            }

        } catch (error) {
            console.error(error);
            toast.error("خطأ في الاتصال");
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    const suspendInvoice = async () => {
        // Logic to save to 'suspended' table or local storage
        toast.success("تم تعليق الفاتورة");
        clearCart();
    };

    // --- Wrappers for State Setters ---
    const updateHeader = useCallback((updates: Partial<InvoiceHeader>) => {
        setHeader(prev => ({ ...prev, ...updates }));
    }, []);

    const updateTotals = useCallback((updates: Partial<InvoiceTotals>) => {
        setTotals(prev => ({ ...prev, ...updates }));
    }, []);

    return (
        <POSContext.Provider value={{
            items, header, totals, products, customers, activeShift, isLoading, isSuspendedMode, settings,
            setSettings: (updates: any) => setSettings(prev => ({ ...prev, ...updates })),
            addToCart, updateItem, removeFromCart, clearCart,
            setHeader: updateHeader,
            setTotals: updateTotals,
            refreshProducts, suspendInvoice, checkout
        }}>
            {children}
        </POSContext.Provider>
    );
}

export const usePOS = () => {
    const context = useContext(POSContext);
    if (!context) throw new Error("usePOS must be used within a POSProvider");
    return context;
}
