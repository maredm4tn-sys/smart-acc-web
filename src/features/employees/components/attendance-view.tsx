"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle2, XCircle, Clock, Save } from "lucide-react";
import { getAttendance, recordAttendance } from "../actions";
import { toast } from "sonner";

export function AttendanceView({ employees, dict }: { employees: any[], dict: any }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAttendance();
    }, [date]);

    const fetchAttendance = async () => {
        setLoading(true);
        const data = await getAttendance(date);
        setAttendanceData(data);
        setLoading(false);
    };

    const handleSave = async (empId: number, status: string, checkIn?: string, checkOut?: string) => {
        const res = await recordAttendance({
            employeeId: empId,
            date,
            status,
            checkIn,
            checkOut
        });

        if (res.success) {
            toast.success(dict.Attendance.Success);
            fetchAttendance();
        } else {
            toast.error(dict.Attendance.Error);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        {dict.Attendance.Title}
                    </CardTitle>
                    <div className="flex items-center gap-4 w-64">
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="h-10"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">{dict.Employees.Table.Name}</TableHead>
                                    <TableHead className="text-center">{dict.Employees.Table.Status}</TableHead>
                                    <TableHead className="text-center">{dict.Attendance.CheckIn}</TableHead>
                                    <TableHead className="text-center">{dict.Attendance.CheckOut}</TableHead>
                                    <TableHead className="text-left">{dict.Common.Actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.map((emp) => {
                                    const record = attendanceData.find(a => a.employeeId === emp.id);
                                    return (
                                        <AttendanceRow
                                            key={emp.id}
                                            employee={emp}
                                            record={record}
                                            onSave={handleSave}
                                            dict={dict}
                                        />
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function AttendanceRow({ employee, record, onSave, dict }: { employee: any, record: any, onSave: any, dict: any }) {
    const [status, setStatus] = useState(record?.status || 'present');
    const [checkIn, setCheckIn] = useState(record?.checkIn || '');
    const [checkOut, setCheckOut] = useState(record?.checkOut || '');

    useEffect(() => {
        if (record) {
            setStatus(record.status);
            setCheckIn(record.checkIn || '');
            setCheckOut(record.checkOut || '');
        }
    }, [record]);

    return (
        <TableRow>
            <TableCell className="font-medium">{employee.name}</TableCell>
            <TableCell className="text-center">
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-32 mx-auto">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="present">{dict.Attendance.Present}</SelectItem>
                        <SelectItem value="absent">{dict.Attendance.Absent}</SelectItem>
                        <SelectItem value="late">{dict.Attendance.Late}</SelectItem>
                        <SelectItem value="leave">{dict.Attendance.Leave}</SelectItem>
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell className="text-center">
                <Input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-32 mx-auto h-8 text-xs"
                    disabled={status === 'absent' || status === 'leave'}
                />
            </TableCell>
            <TableCell className="text-center">
                <Input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-32 mx-auto h-8 text-xs"
                    disabled={status === 'absent' || status === 'leave'}
                />
            </TableCell>
            <TableCell className="text-left">
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => onSave(employee.id, status, checkIn, checkOut)}
                >
                    <Save size={16} />
                    {dict.Attendance.Save}
                </Button>
            </TableCell>
        </TableRow>
    );
}
