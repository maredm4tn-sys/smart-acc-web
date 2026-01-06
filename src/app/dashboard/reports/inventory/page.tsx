import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getInventoryReport } from "@/features/reports/actions";
import { Package, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { getDictionary } from "@/lib/i18n-server";

export default async function InventoryReportPage() {
    const data = await getInventoryReport();
    const dict = await getDictionary();

    if (!data) return <div>Loading...</div>;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EGP'
        }).format(val);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="text-blue-600" />
                تقرير المخزون
                <span className="text-sm font-normal text-gray-500 mt-1 block">Inventory Valuation & Alerts</span>
            </h1>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">إجمالي الأصناف</CardTitle>
                        <Package className="h-4 w-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalItems}</div>
                        <p className="text-xs text-gray-400">منتج مخزني (Goods)</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">قيمة الشراء (التكلفة)</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">{formatCurrency(data.totalCostValue)}</div>
                        <p className="text-xs text-gray-400">رأس المال في المخزن</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">قيمة البيع المتوقعة</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{formatCurrency(data.totalSalesValue)}</div>
                        <p className="text-xs text-gray-400">عند بيع كل الكمية</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">الربح المتوقع</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700">{formatCurrency(data.potentialProfit)}</div>
                        <p className="text-xs text-gray-400">هامش الربح الإجمالي</p>
                    </CardContent>
                </Card>
            </div>

            {/* Low Stock Table */}
            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-red-50 border-b border-red-100 pb-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <CardTitle className="text-red-900">تنبيهات النواقص (Low Stock Alerts)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">اسم المنتج</TableHead>
                                <TableHead className="text-right">SKU</TableHead>
                                <TableHead className="text-center">الكمية الحالية</TableHead>
                                <TableHead className="text-right">سعر الشراء</TableHead>
                                <TableHead className="text-right">إجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.lowStockItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        مخزونك تمام! لا توجد نواقص (أقل من 5).
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.lowStockItems.map(item => (
                                    <TableRow key={item.id} className="hover:bg-red-50/30">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-gray-500 text-xs font-mono">{item.sku}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${Number(item.stockQuantity) === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {item.stockQuantity}
                                            </span>
                                        </TableCell>
                                        <TableCell>{formatCurrency(Number(item.buyPrice))}</TableCell>
                                        <TableCell>
                                            <span className="text-xs text-blue-600 cursor-pointer hover:underline">
                                                طلب توريد
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
