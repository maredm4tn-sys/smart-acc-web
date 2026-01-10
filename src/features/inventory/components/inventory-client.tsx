"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Search, CloudOff, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditProductDialog } from "@/features/inventory/components/edit-product-dialog";
import { mirrorData, getLocalData, STORES } from "@/lib/offline-db";
import { toast } from "sonner";

export function InventoryClient({ initialProducts, dict }: { initialProducts: any[], dict: any }) {
    const [products, setProducts] = useState(initialProducts);
    const [isOffline, setIsOffline] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        // Sync online data to local mirror if online
        if (navigator.onLine && initialProducts.length > 0) {
            mirrorData(STORES.PRODUCTS, initialProducts);
        }

        const handleOnline = () => {
            setIsOffline(false);
            window.location.reload(); // Refresh to get latest data
        };
        const handleOffline = () => {
            setIsOffline(true);
            loadLocalData();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (!navigator.onLine) {
            handleOffline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [initialProducts]);

    const loadLocalData = async () => {
        const local = await getLocalData(STORES.PRODUCTS);
        if (local.length > 0) {
            setProducts(local);
            toast.info(dict.Common?.Offline?.WorkingOffline || "تعمل الآن في وضع عدم الاتصال (بيانات مخزنة)");
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white p-3 md:p-4 rounded-xl border shadow-sm space-y-4">
            {isOffline && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-2 text-amber-700 text-sm animate-pulse">
                    <CloudOff size={18} />
                    <span>{dict.Common?.Offline?.NoConnection || "لا يوجد اتصال بالإنترنت. يتم عرض البيانات المخزنة محلياً."}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                <div className="relative flex-1">
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={dict.Inventory.SearchPlaceholder}
                        className="pr-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="w-full sm:w-auto">{dict.Inventory.Search}</Button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-md border text-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">{dict.Inventory.Table.SKU}</TableHead>
                            <TableHead>{dict.Inventory.Table.Name}</TableHead>
                            <TableHead>{dict.Inventory.Table.Type}</TableHead>
                            <TableHead>{dict.Inventory.Table.BuyPrice}</TableHead>
                            <TableHead>{dict.Inventory.Table.SellPrice}</TableHead>
                            <TableHead>{dict.Inventory.Table.Stock}</TableHead>
                            <TableHead className="text-end">{dict.Inventory.Table.Actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    {dict.Inventory.Table.NoItems}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">{product.sku}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-gray-400" />
                                            {product.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${product.type === 'goods' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {product.type === 'goods' ? dict.Inventory.Table.Goods : dict.Inventory.Table.Service}
                                        </span>
                                    </TableCell>
                                    <TableCell>{Number(product.buyPrice).toFixed(2)}</TableCell>
                                    <TableCell>{Number(product.sellPrice).toFixed(2)}</TableCell>
                                    <TableCell>
                                        <span className={Number(product.stockQuantity) <= 0 && product.type === 'goods' ? "text-red-500 font-bold" : ""}>
                                            {product.stockQuantity}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-end">
                                        <EditProductDialog product={product} />
                                    </TableCell>
                                </TableRow>
                            )
                            ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
                {filteredProducts.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">{dict.Inventory.Table.NoItems}</div>
                ) : (
                    filteredProducts.map((product) => (
                        <div key={product.id} className="p-4 border rounded-lg shadow-sm bg-white space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold flex items-center gap-2">
                                        <Package size={16} className="text-primary" />
                                        {product.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">SKU: {product.sku}</div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${product.type === 'goods' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {product.type === 'goods' ? dict.Inventory.Table.Goods : dict.Inventory.Table.Service}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-slate-50 p-2 rounded">
                                    <span className="text-muted-foreground block text-xs">{dict.Inventory.Table.SellPrice}</span>
                                    <span className="font-semibold text-green-600">{Number(product.sellPrice).toFixed(2)}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded">
                                    <span className="text-muted-foreground block text-xs">{dict.Inventory.Table.Stock}</span>
                                    <span className={Number(product.stockQuantity) <= 0 && product.type === 'goods' ? "text-red-500 font-bold" : "font-semibold"}>
                                        {product.stockQuantity}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2 border-t">
                                <EditProductDialog product={product} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
