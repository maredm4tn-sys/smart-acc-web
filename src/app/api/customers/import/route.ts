import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { getSession } from "@/features/auth/actions";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        const tenantId = session?.tenantId;

        if (!tenantId || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        let successCount = 0;
        let errorCount = 0;

        for (const row of jsonData as any[]) {
            // Flexible keys: Handle Arabic or English headers
            const name = row["Name"] || row["الاسم"] || row["name"];
            if (!name) continue; // Skip if no name

            const companyName = row["Company"] || row["الشركة"] || row["Company Name"] || row["companyName"];
            const phone = row["Phone"] || row["الهاتف"] || row["phone"]?.toString();
            const email = row["Email"] || row["البريد"] || row["email"];
            const address = row["Address"] || row["العنوان"] || row["address"];
            const taxId = row["Tax ID"] || row["الرقم الضريبي"] || row["taxId"]?.toString();

            try {
                // Ensure email is valid or null if empty string
                const validEmail = (email && email.includes("@")) ? email : null;

                await db.insert(customers).values({
                    tenantId,
                    name: String(name),
                    companyName: companyName ? String(companyName) : null,
                    phone: phone ? String(phone) : null,
                    email: validEmail,
                    address: address ? String(address) : null,
                    taxId: taxId ? String(taxId) : null,
                });
                successCount++;
            } catch (err) {
                console.error("Row insert error:", err);
                errorCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Imported ${successCount} customers.` // We'll keep the API simple, but frontend will show localized
        });

    } catch (error) {
        console.error("Import Error:", error);
        return NextResponse.json({ success: false, message: "Server Error during processing" }, { status: 500 });
    }
}
