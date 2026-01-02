"use client";

import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { useTranslation } from "@/components/providers/i18n-provider";

export function RevenueChart() {
    const { dict } = useTranslation();

    const data = [
        { name: dict.RevenueChart.Saturday, value: 4000 },
        { name: dict.RevenueChart.Sunday, value: 3000 },
        { name: dict.RevenueChart.Monday, value: 2000 },
        { name: dict.RevenueChart.Tuesday, value: 2780 },
        { name: dict.RevenueChart.Wednesday, value: 1890 },
        { name: dict.RevenueChart.Thursday, value: 2390 },
        { name: dict.RevenueChart.Friday, value: 3490 },
    ];

    return (
        <Card className="col-span-4 lg:col-span-4 border-none shadow-md bg-white">
            <CardHeader>
                <CardTitle>{dict.RevenueChart.Title}</CardTitle>
                <CardDescription>{dict.RevenueChart.Description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full" style={{ direction: 'ltr' }}>
                    <ResponsiveContainer width="100%" height="100%">
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
            </CardContent>
        </Card>
    );
}
