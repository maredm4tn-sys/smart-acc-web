"use client";

import useSWR from "swr";
import {
    Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell, Legend, Area, AreaChart
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Package, Loader2 } from "lucide-react";
import { getAnalyticsData } from "@/features/dashboard/actions";
import { useTranslation } from "@/components/providers/i18n-provider";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function AnalyticsCharts() {
    const { dict } = useTranslation() as any;
    const { data: analytics, error, isLoading } = useSWR('analytics-data', getAnalyticsData, {
        refreshInterval: 60000 // Refresh every minute
    });

    if (isLoading) {
        return (
            <div className="col-span-4 h-[400px] flex items-center justify-center bg-white rounded-3xl border">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    if (error || !analytics) return null;

    return (
        <div className="col-span-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Selling Products */}
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
                            <Package className="text-blue-600" />
                            {dict.Dashboard.TopSelling}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[300px] w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.topProducts} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        tick={{ fontSize: 11, fontWeight: 'bold' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={25}>
                                        {analytics.topProducts.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Profit vs Expense */}
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="flex items-center gap-2 text-slate-900 font-black">
                            <TrendingUp className="text-emerald-600" />
                            {dict.Dashboard.ProfitVsExpense}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[300px] w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.incomeCompare}>
                                    <defs>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff' }}
                                    />
                                    <Legend verticalAlign="top" height={36} />
                                    <Area
                                        name={dict.Dashboard.Profit}
                                        type="monotone"
                                        dataKey="ربح"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorProfit)"
                                    />
                                    <Area
                                        name={dict.Dashboard.Expenses}
                                        type="monotone"
                                        dataKey="مصروف"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorExpense)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
