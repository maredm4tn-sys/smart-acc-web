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

export const dynamic = 'force-dynamic';

export default async function JournalListPage() {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'SUPER_ADMIN';

    const entries = await getJournalEntries();
    const dict = await getDictionary();
    const lang = await getLocale();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">{dict.Journal.Title}</h2>
                    <p className="text-muted-foreground">{dict.Journal.Description}</p>
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <ExcelExportButton
                            getData={getJournalExport}
                            fileName="Journal_Entries"
                            label="تصدير (Excel)"
                        />
                    )}
                    <Link href="/dashboard/journal/new">
                        <Button className="gap-2">
                            <Plus size={16} />
                            {dict.Journal.NewEntry}
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {dict.Journal.FinancialLog}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">{dict.Journal.Table.EntryNumber}</TableHead>
                                <TableHead className="w-[110px]">{dict.Journal.Table.Date}</TableHead>
                                <TableHead className="w-[100px]">{dict.Journal.Table.Type}</TableHead>
                                <TableHead>{dict.Journal.Table.Account}</TableHead>
                                <TableHead className="text-start w-[120px]">{dict.Journal.Table.Debit}</TableHead>
                                <TableHead className="text-start w-[120px]">{dict.Journal.Table.Credit}</TableHead>
                                <TableHead className="w-[100px]">{dict.Journal.Table.Status}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        {dict.Journal.Table.NoEntries}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry: any) => {
                                    return (
                                        <TableRow key={entry.id} className="group hover:bg-gray-50/50">
                                            <TableCell className="font-mono font-medium text-xs text-gray-500">{entry.entryNumber}</TableCell>
                                            <TableCell className="text-xs">{new Date(entry.transactionDate).toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-US')}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    entry.type === 'Invoice' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50' :
                                                        entry.type === 'Payment' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50' :
                                                            'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-50'
                                                }>
                                                    {entry.type === 'Invoice' ? (lang === 'ar' ? 'فاتورة' : 'Invoice') :
                                                        entry.type === 'Payment' ? (lang === 'ar' ? 'دفعة' : 'Payment') :
                                                            (lang === 'ar' ? 'يدوي' : 'Manual')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm text-gray-900" title={entry.description || ""}>{entry.accountsSummary}</div>
                                                {entry.description && <div className="text-xs text-muted-foreground truncate max-w-[250px]">{entry.description}</div>}
                                            </TableCell>
                                            <TableCell className="text-start font-semibold ltr text-gray-700">
                                                {Number(entry.debitTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-gray-400">{entry.currency}</span>
                                            </TableCell>
                                            <TableCell className="text-start font-semibold ltr text-gray-700">
                                                {Number(entry.creditTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-gray-400">{entry.currency}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={entry.status === 'posted' ? 'default' : 'secondary'} className={entry.status === 'posted' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                    {entry.status === 'posted' ? dict.Journal.Table.Posted : entry.status === 'draft' ? dict.Journal.Table.Draft : entry.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
