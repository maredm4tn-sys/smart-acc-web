import { getSession, getUsers } from "@/features/auth/actions";
import { redirect } from "next/navigation";
import { AddUserDialog } from "./add-user-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, BadgeCheck, Users as UsersIcon } from "lucide-react";
import { getDictionary } from "@/lib/i18n-server";
import { UserActions } from "./user-actions";

export default async function UsersPage() {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
        redirect("/dashboard");
    }

    const users = await getUsers();
    const dict = (await getDictionary()) as any;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <UsersIcon className="h-6 w-6 text-blue-600" />
                        {dict.Users.Title}
                    </h1>
                    <p className="text-gray-500 mt-1">{dict.Users.Description}</p>
                </div>
                <AddUserDialog />
            </div>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow>
                                <TableHead className="py-3 font-bold text-gray-700">{dict.Users.Table.FullName}</TableHead>
                                <TableHead className="py-3 font-bold text-gray-700">{dict.Users.Table.Username}</TableHead>
                                <TableHead className="py-3 font-bold text-gray-700">{dict.Users.Table.Role}</TableHead>
                                <TableHead className="py-3 font-bold text-gray-700">{dict.Users.Table.PhoneAndAddress}</TableHead>
                                <TableHead className="py-3 font-bold text-gray-700">{dict.Users.Table.DateAdded}</TableHead>
                                <TableHead className="py-3 font-bold text-gray-700">{dict.Users.Table.Status}</TableHead>
                                <TableHead className="py-3 font-bold text-gray-700 w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => (
                                <TableRow key={user.id} className="hover:bg-blue-50/50 transition-colors">
                                    <TableCell className="font-medium text-gray-900">{user.fullName}</TableCell>
                                    <TableCell className="font-mono text-gray-500"><span dir="ltr">{user.username}</span></TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${user.role === 'admin'
                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                            }`}>
                                            {user.role === 'admin' ? <BadgeCheck size={14} /> : <Shield size={14} />}
                                            {user.role === 'admin' ? dict.Users.Table.Roles.Admin : dict.Users.Table.Roles.Cashier}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <div className="flex flex-col text-xs text-gray-500">
                                            {user.phone && <span className="flex items-center gap-1">📞 {user.phone}</span>}
                                            {user.address && <span className="flex items-center gap-1 truncate max-w-[150px]" title={user.address}>📍 {user.address}</span>}
                                            {!user.phone && !user.address && '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US') : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {user.isActive ? (
                                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm ring-2 ring-emerald-500/20" title={dict.Dashboard.Active}></span>
                                        ) : (
                                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm"></span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <UserActions user={user} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
