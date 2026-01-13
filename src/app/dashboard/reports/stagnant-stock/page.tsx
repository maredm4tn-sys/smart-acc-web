"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, TrendingDown, DollarSign, PackageOpen } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { getStagnantProducts } from "@/features/reports/actions";
import { toast } from "sonner";

export default function StagnantStockReportPage() {
    const { dict } = useTranslation() as any;
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("30"); // days
    const [data, setData] = useState<any[]>([]);
    const [totalValue, setTotalValue] = useState(0);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getStagnantProducts(Number(period));
            setData(res.data);
            setTotalValue(res.totalValue);
        } catch (e) {
            console.error(e);
            toast.error(dict.Common.Error || "Failed to load report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [period]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
                        <TrendingDown className="w-8 h-8 text-amber-600" />
                        {dict.Reports?.StagnantStock?.Title || "Stagnant Stock Analysis"}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {dict.Reports?.StagnantStock?.Desc || "Identify products that haven't sold in a while to free up capital."}
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <span className="text-sm font-bold text-gray-500 px-2">{dict.Reports?.StagnantStock?.Period || "Stagnant Period"}:</span>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px] h-10 font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">{dict.Reports?.StagnantStock?.Days30 || "30 Days (Warning)"}</SelectItem>
                            <SelectItem value="60">{dict.Reports?.StagnantStock?.Days60 || "60 Days (Slow)"}</SelectItem>
                            <SelectItem value="90">{dict.Reports?.StagnantStock?.Days90 || "90 Days (Stagnant)"}</SelectItem>
                            <SelectItem value="180">{dict.Reports?.StagnantStock?.Days180 || "180 Days (Dead Stock)"}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-amber-800 text-lg flex items-center gap-2">
                            <DollarSign className="w-5 h-5" /> {dict.Reports?.StagnantStock?.TotalValue || "Frozen Capital"}
                        </CardTitle>
                        <CardDescription className="text-amber-600 font-medium">
                            {dict.Reports?.StagnantStock?.TotalValueDesc || "Total cost value of stagnant items"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="w-6 h-6 animate-spin text-amber-600" /> : (
                            <div className="text-4xl font-black text-slate-900 font-mono tracking-tight">
                                {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-lg font-bold text-gray-500">EGP</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-700 text-lg flex items-center gap-2">
                            <PackageOpen className="w-5 h-5" /> {dict.Reports?.StagnantStock?.ItemsCount || "Stagnant Items"}
                        </CardTitle>
                        <CardDescription>
                            {dict.Reports?.StagnantStock?.ItemsCountDesc || "Number of unique products not moving"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-600" /> : (
                            <div className="text-4xl font-black text-slate-900 font-mono">
                                {data.length} <span className="text-lg font-bold text-gray-500">{dict.Common?.Item || "Items"}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="border shadow-md">
                <CardHeader>
                    <CardTitle>{dict.Reports?.StagnantStock?.TableTitle || "Stagnant Items Details"}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>
                    ) : data.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <AlertTriangle className="w-16 h-16 mb-4 opacity-20" />
                            <h3 className="text-lg font-bold text-slate-600">{dict.Reports?.StagnantStock?.NoData || "Great! No stagnant stock found."}</h3>
                            <p>{dict.Reports?.StagnantStock?.NoDataDesc || "Your inventory is moving well within this period."}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{dict.Inventory?.Table?.Name || "Product Name"}</TableHead>
                                    <TableHead>{dict.Inventory?.Table?.SKU || "SKU"}</TableHead>
                                    <TableHead className="text-center">{dict.Inventory?.Table?.Stock || "Stock Qty"}</TableHead>
                                    <TableHead className="text-right">{dict.Inventory?.Table?.BuyPrice || "Cost"}</TableHead>
                                    <TableHead className="text-right">{dict.Reports?.StagnantStock?.TotalCost || "Total Frozen Value"}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50">
                                        <TableCell className="font-bold">{item.name}</TableCell>
                                        <TableCell className="font-mono text-gray-500">{item.sku}</TableCell>
                                        <TableCell className="text-center font-bold bg-slate-100 rounded-sm">{item.stock}</TableCell>
                                        <TableCell className="text-right font-mono text-gray-600">{Number(item.buyPrice).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-black font-mono text-amber-700">{item.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
