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

    let productsList = [];
    try {
        productsList = await db.select().from(products);
    } catch (e) {
        console.warn("DB not ready");
        // Mock data
        productsList = [
            { id: 1, sku: "HP-LAP-001", name: "HP EliteBook 840 G5", type: "goods", sellPrice: "12500.00", buyPrice: "10000.00", stockQuantity: "5" },
            { id: 2, sku: "DELL-LAP-002", name: "Dell Latitude 5490", type: "goods", sellPrice: "11000.00", buyPrice: "9000.00", stockQuantity: "12" },
            { id: 3, sku: "SRV-INST-01", name: "تسطيب ويندوز وبرامج", type: "service", sellPrice: "150.00", buyPrice: "0.00", stockQuantity: "0" },
        ];
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

                <div className="rounded-md border">
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
            </div>
        </div>
    );
}
