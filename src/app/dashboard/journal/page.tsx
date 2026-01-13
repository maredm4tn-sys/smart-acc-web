import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getJournalEntries, getJournalExport } from "@/features/accounting/actions";
import { getSession } from "@/features/auth/actions";
import { ExcelExportButton } from "@/components/common/excel-export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getDictionary, getLocale } from "@/lib/i18n-server";
import { formatNumber } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function JournalListPage() {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'SUPER_ADMIN';

    const entries = await getJournalEntries();
    const dict = await getDictionary();
    const lang = await getLocale();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{dict.Journal.Title}</h2>
                    <p className="text-sm md:text-base text-muted-foreground">{dict.Journal.Description}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    {isAdmin && (
                        <div className="flex-1 sm:flex-none">
                            <ExcelExportButton
                                getData={getJournalExport}
                                fileName="Journal_Entries"
                                label={dict.Journal.ExportExcel}
                            />
                        </div>
                    )}
                    <Link href="/dashboard/journal/new" className="flex-1 sm:flex-none">
                        <Button className="gap-2 w-full">
                            <Plus size={16} />
                            {dict.Journal.NewEntry}
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {dict.Journal.FinancialLog}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="rt-table-container">
                        <table className="rt-table">
                            <thead>
                                <tr>
                                    <th className="w-[100px]">{dict.Journal.Table.EntryNumber}</th>
                                    <th className="w-[110px]">{dict.Journal.Table.Date}</th>
                                    <th className="w-[100px]">{dict.Journal.Table.Type}</th>
                                    <th>{dict.Journal.Table.Account}</th>
                                    <th className="text-start w-[120px]">{dict.Journal.Table.Debit}</th>
                                    <th className="text-start w-[120px]">{dict.Journal.Table.Credit}</th>
                                    <th className="w-[100px]">{dict.Journal.Table.Status}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-500">
                                            {dict.Journal.Table.NoEntries}
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry: any) => {
                                        return (
                                            <tr key={entry.id} className="group hover:bg-gray-50/50">
                                                <td data-label={dict.Journal.Table.EntryNumber} className="font-mono font-medium text-xs text-gray-500">{entry.entryNumber}</td>
                                                <td data-label={dict.Journal.Table.Date} className="text-xs">{new Date(entry.transactionDate).toLocaleDateString('en-US')}</td>
                                                <td data-label={dict.Journal.Table.Type}>
                                                    <Badge variant="outline" className={
                                                        entry.type === 'Invoice' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50' :
                                                            entry.type === 'Payment' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50' :
                                                                'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50'
                                                    }>
                                                        {entry.type === 'Invoice' ? dict.Journal.Types.Invoice :
                                                            entry.type === 'Payment' ? dict.Journal.Types.Payment :
                                                                dict.Journal.Types.Manual}
                                                    </Badge>
                                                </td>
                                                <td data-label={dict.Journal.Table.Account}>
                                                    <div className="font-medium text-sm text-gray-900" title={entry.description || ""}>{entry.accountsSummary}</div>
                                                    {entry.description && <div className="text-xs text-muted-foreground truncate max-w-[250px]">{entry.description}</div>}
                                                </td>
                                                <td data-label={dict.Journal.Table.Debit} className="text-start font-semibold ltr text-gray-700">
                                                    {formatNumber(entry.debitTotal)} <span className="text-xs text-gray-400">{entry.currency}</span>
                                                </td>
                                                <td data-label={dict.Journal.Table.Credit} className="text-start font-semibold ltr text-gray-700">
                                                    {formatNumber(entry.creditTotal)} <span className="text-xs text-gray-400">{entry.currency}</span>
                                                </td>
                                                <td data-label={dict.Journal.Table.Status}>
                                                    <Badge variant={entry.status === 'posted' ? 'default' : 'secondary'} className={entry.status === 'posted' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                        {entry.status === 'posted' ? dict.Journal.Table.Posted : entry.status === 'draft' ? dict.Journal.Table.Draft : entry.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>

    );
}
