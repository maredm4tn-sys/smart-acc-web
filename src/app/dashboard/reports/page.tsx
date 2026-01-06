import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSalesSummary } from "@/features/reports/actions";
import { DollarSign, FileText, TrendingUp, Calendar, CreditCard } from "lucide-react";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n-server";

export default async function ReportsPage() {
    const summary = await getSalesSummary();
    const dict = await getDictionary();

    /* 
       To handle currency formatting uniformly
    */
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EGP' // You might want to make this dynamic later
        }).format(val);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="text-blue-600" />
                {dict.Reports?.Title || "Reports & Analytics"}
            </h1>

            {/* Sales Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">
                            مبيعات اليوم
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{formatCurrency(summary?.daily.total || 0)}</div>
                        <p className="text-xs text-blue-600 mt-1">
                            {summary?.daily.count} فاتورة
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-800">
                            مبيعات الشهر
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">{formatCurrency(summary?.monthly.total || 0)}</div>
                        <p className="text-xs text-purple-600 mt-1">
                            {summary?.monthly.count} فاتورة
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-800">
                            مبيعات السنة
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">{formatCurrency(summary?.yearly.total || 0)}</div>
                        <p className="text-xs text-emerald-600 mt-1">
                            {summary?.yearly.count} فاتورة
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
                {/* Links to Detailed Reports */}
                <Link href="/dashboard/reports/income-statement" className="group">
                    <Card className="h-full hover:shadow-lg transition-all border-dashed border-2 hover:border-blue-500 cursor-pointer bg-gray-50/50 hover:bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                <FileText className="h-5 w-5" />
                                قائمة الدخل (الأرباح والخسائر)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500">
                                عرض تفصيلي للإيرادات والمصروفات وصافي الربح خلال فترة زمنية محددة.
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                {/* Future: Inventory Report */}
                <Link href="/dashboard/reports/inventory" className="group">
                    <Card className="h-full hover:shadow-lg transition-all border-dashed border-2 hover:border-emerald-500 cursor-pointer bg-gray-50/50 hover:bg-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 group-hover:text-emerald-600 transition-colors">
                                <CreditCard className="h-5 w-5" />
                                تقرير المخزون
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500">
                                متابعة كميات المنتجات وقيمة المخزون وتنبيهات النواقص.
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
