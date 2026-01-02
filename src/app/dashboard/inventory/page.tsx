import { Button } from "@/components/ui/button";
import { AddProductDialog } from "@/features/inventory/components/add-product-dialog";
import { EditProductDialog } from "@/features/inventory/components/edit-product-dialog";
import { db } from "@/db";
import { products } from "@/db/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n-server";

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    const dict = await getDictionary();

    let productsList: typeof products.$inferSelect[] = [];
    try {
        productsList = await db.select().from(products);
    } catch (e) {
        // Fallback to empty for now, or error state
        productsList = [];
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Inventory.Title}</h1>
                    <p className="text-muted-foreground">{dict.Inventory.Description}</p>
                </div>
                <AddProductDialog triggerLabel={dict.Inventory.NewItem} />
            </div>

            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                <div className="flex gap-2 max-w-sm">
                    <div className="relative flex-1">
                        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={dict.Inventory.SearchPlaceholder} className="pr-8" />
                    </div>
                    <Button variant="outline">{dict.Inventory.Search}</Button>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block rounded-md border">
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
                            {productsList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        {dict.Inventory.Table.NoItems}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                productsList.map((product) => (
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {productsList.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">{dict.Inventory.Table.NoItems}</div>
                    ) : (
                        productsList.map((product) => (
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
        </div>
    );
}
