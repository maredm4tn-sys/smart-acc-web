import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getJournalEntries } from "@/features/accounting/actions";
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
                <Link href="/dashboard/journal/new">
                    <Button className="gap-2">
                        <Plus size={16} />
                        {dict.Journal.NewEntry}
                    </Button>
                </Link>
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
                                <TableHead className="w-[120px]">{dict.Journal.Table.Date}</TableHead>
                                <TableHead>{dict.Journal.Table.Description}</TableHead>
                                <TableHead className="w-[100px]">{dict.Journal.Table.Currency}</TableHead>
                                <TableHead className="text-start">{dict.Journal.Table.Total}</TableHead>
                                <TableHead className="w-[100px]">{dict.Journal.Table.Status}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        {dict.Journal.Table.NoEntries}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry) => {
                                    // Calculate total debit from lines to show magnitude
                                    const totalDebit = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);

                                    return (
                                        <TableRow key={entry.id} className="group">
                                            <TableCell className="font-mono font-medium">{entry.entryNumber}</TableCell>
                                            <TableCell>{new Date(entry.transactionDate).toLocaleDateString(lang === 'ar' ? 'en-GB' : 'en-US')}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{entry.description}</div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {entry.lines.length} {dict.Journal.Table.EntriesCount}
                                                </div>
                                            </TableCell>
                                            <TableCell>{entry.currency}</TableCell>
                                            <TableCell className="text-start font-bold ltr">
                                                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={entry.status === 'posted' ? 'default' : 'secondary'}>
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
