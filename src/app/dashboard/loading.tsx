import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardLoading() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="h-10 w-64 bg-slate-200 rounded-lg"></div>
                <div className="h-10 w-48 bg-slate-200 rounded-full"></div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-slate-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-10 w-10 rounded-xl bg-slate-100"></div>
                            <div className="h-4 w-16 bg-slate-100 rounded-full"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-24 bg-slate-200 rounded mt-4"></div>
                            <div className="h-4 w-16 bg-slate-100 rounded mt-2"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Skeleton */}
            <div className="grid gap-6 md:grid-cols-7">
                {/* Chart Area */}
                <Card className="col-span-4 h-[400px] border-slate-100 bg-white">
                    <CardHeader>
                        <div className="h-6 w-32 bg-slate-200 rounded"></div>
                        <div className="h-4 w-48 bg-slate-100 rounded mt-2"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-full w-full bg-slate-50/50 rounded-lg"></div>
                    </CardContent>
                </Card>

                {/* Side Widgets */}
                <div className="col-span-3 flex flex-col gap-6">
                    <Card className="h-48 border-slate-100">
                        <CardHeader>
                            <div className="h-5 w-32 bg-slate-200 rounded"></div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="h-24 bg-slate-100 rounded-xl"></div>
                            <div className="h-24 bg-slate-100 rounded-xl"></div>
                        </CardContent>
                    </Card>
                    <Card className="flex-1 border-slate-100">
                        <CardHeader>
                            <div className="h-5 w-32 bg-slate-200 rounded"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-16 bg-slate-100 rounded-lg"></div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
