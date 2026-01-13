"use client";

import { usePOS, Product } from "../context/pos-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export function POSProductList() {
    const { products, addToCart, settings, header } = usePOS();
    const [search, setSearch] = useState("");

    // Filter Logic
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.sku.toLowerCase().includes(search.toLowerCase()) ||
                (p.barcode && p.barcode.includes(search));
            return matchesSearch;
        });
    }, [products, search]);

    // Price Display Helper
    const getPrice = (p: Product) => {
        if (header.priceType === 'wholesale') return p.priceWholesale;
        if (header.priceType === 'half_wholesale') return p.priceHalfWholesale;
        if (header.priceType === 'special') return p.priceSpecial;
        return p.sellPrice;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 p-4 gap-4">
            {/* Search Header */}
            <div className="bg-white p-3 rounded-lg shadow-sm border flex items-center gap-2">
                <Search className="text-gray-400 h-5 w-5" />
                <Input
                    placeholder="بحث عن منتج (الاسم أو الباركود)..."
                    className="border-none shadow-none focus-visible:ring-0 text-lg"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <Package size={48} className="opacity-20" />
                        <p>لا توجد أصناف مطابقة</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                className="bg-white rounded-lg border border-slate-100 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all flex flex-col p-2 text-center group relative overflow-hidden min-h-[140px]"
                                onClick={() => addToCart(product)}
                            >
                                {/* Top: Stock */}
                                <div className="flex justify-end h-5 mb-1">
                                    <span className="text-[10px] text-gray-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                                        المخزون: {product.stockQuantity}
                                    </span>
                                </div>

                                {/* Middle: Name */}
                                <div className="flex-1 flex items-center justify-center mt-1">
                                    <h3 className="font-bold text-sm text-slate-800 line-clamp-3 leading-tight w-full">
                                        {product.name}
                                    </h3>
                                </div>

                                {/* Bottom: SKU & Price */}
                                <div className="mt-2 pt-2 border-t border-slate-50">
                                    <div className="text-[9px] text-gray-400 font-mono mb-1 truncate opacity-70">
                                        {product.sku}
                                    </div>
                                    <div className="font-black text-blue-600 text-base">
                                        {getPrice(product).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
