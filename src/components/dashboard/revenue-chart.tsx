"use client";

import useSWR from "swr";
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart as AreaChartIcon } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { getRevenueChartData } from "@/features/dashboard/actions";

export function RevenueChart() {
    const { dict } = useTranslation();
    const { data: chartData } = useSWR('revenue-chart', getRevenueChartData);

    const data = chartData && chartData.length > 0 ? chartData : [];

    return (
        <Card className="col-span-4 lg:col-span-4 border-none shadow-md bg-white">
            <CardHeader>
                <CardTitle>{dict.RevenueChart.Title}</CardTitle>
                <CardDescription>{dict.RevenueChart.Description}</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <div className="w-full relative h-[350px]" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                            <AreaChart
                                data={data}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eee" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)', backgroundColor: '#1e293b', color: '#f8fafc' }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[350px] w-full flex flex-col items-center justify-center text-slate-400">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <AreaChartIcon className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium">لا توجد بيانات متاحة لعرضها حالياً</p>
                        <p className="text-xs text-slate-300 mt-1">ابدأ بإضافة فواتير لتظهر الإحصائيات هنا</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
