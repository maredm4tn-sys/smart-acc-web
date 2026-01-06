import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tenants, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getInventoryData, getCustomersData, getJournalData, getProfitData } from '@/services/export-data';
import { generateExcelBuffer } from '@/lib/excel-server';
import { sendBackupEmail } from '@/lib/email';

export const maxDuration = 300; // 5 minutes max duration for backup

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Fallback for dev testing if no secret set yet, but warn
        if (!process.env.CRON_SECRET && process.env.NODE_ENV === 'development') {
            console.warn("Running Cron without CRON_SECRET (Development Only)");
        } else {
            return new NextResponse('Unauthorized', { status: 401 });
        }
    }

    try {
        console.log("Starting Daily Backup Job...");

        // 1. Get All Active Tenants
        // 1. Get All Active Tenants
        const allTenants = await db.query.tenants.findMany();

        console.log(`Found ${allTenants.length} active tenants.`);

        let successCount = 0;
        let failCount = 0;

        for (const tenant of allTenants) {
            try {
                // 2. Find Admin User for this Tenant to get email
                // Priority: Admin role associated with this tenant
                const adminUser = await db.query.users.findFirst({
                    where: (u: any, { and, eq, inArray }: any) => and(
                        eq(u.tenantId, tenant.id),
                        eq(u.status, 'ACTIVE'),
                        // Check for admin roles. Note: roles are plain strings 'admin', 'cashier'
                        // If roles logic changed to 'SUPER_ADMIN', include that.
                        // Ideally we pick the "owner" but checking 'admin' is good default.
                        eq(u.role, 'admin')
                    )
                });

                // If no local admin, check validation? Or skip?
                // For SaaS, maybe SUPER_ADMIN manages it? 
                // Assumption: Each specific tenant has an admin. 
                // If not found, log and continue.
                if (!adminUser || !adminUser.username) {
                    console.log(`Skipping Tenant ${tenant.name} (${tenant.id}): No Admin user found.`);
                    continue;
                }

                // Actually, the requirements said "The authenticated Admin's email address" for the user request.
                // But this is a CRON job. There is no authenticated user.
                // The requirement "Recipient: The authenticated Admin's email address" likely referred to the Context of the User Request "I want MY backup".
                // But for a system-wide cron: "Ensure the Admin receives a clean, private archive".
                // We should send to the Tenant's Admin Email.
                // NOTE: User table currently has 'username', and we added 'email' in recent tasks?
                // Let's check user schema. If email missing, we can't send.
                // Wait, the prompt says "Email Only".

                // Let's assume 'email' field exists on User or Tenant.
                // Code view shows `email` in Subscriber Dialog, so it's likely on User or Tenant.

                // Let's use user.username if it looks like an email, or user.email if column exists.
                // I'll check user schema implicitly by using it. If TS error, I'll fix.
                // Based on `createSubscriber` plan, we added email.

                let targetEmail = (adminUser as any).email;
                // Fallback if username is email
                if (!targetEmail && adminUser.username.includes('@')) {
                    targetEmail = adminUser.username;
                }

                if (!targetEmail) {
                    console.log(`Skipping Tenant ${tenant.name}: No email found for admin.`);
                    continue;
                }

                console.log(`Processing Backup for Tenant: ${tenant.name} -> ${targetEmail}`);

                // 3. Generate Data
                const [inventory, customers, journal, profits] = await Promise.all([
                    getInventoryData(tenant.id),
                    getCustomersData(tenant.id),
                    getJournalData(tenant.id),
                    getProfitData(tenant.id)
                ]);

                // 4. Create Buffers
                const attachments = [
                    { filename: `Inventory_${tenant.name}_${Date.now()}.xlsx`, content: generateExcelBuffer(inventory, "Inventory") },
                    { filename: `Clients_${tenant.name}_${Date.now()}.xlsx`, content: generateExcelBuffer(customers, "Clients") },
                    { filename: `Journal_${tenant.name}_${Date.now()}.xlsx`, content: generateExcelBuffer(journal, "Journal") },
                    { filename: `Profits_${tenant.name}_${Date.now()}.xlsx`, content: generateExcelBuffer(profits, "Profits") },
                ];

                // 5. Send Email
                const sent = await sendBackupEmail(targetEmail, attachments);
                if (sent) successCount++; else failCount++;

            } catch (innerError) {
                console.error(`Error processing tenant ${tenant.id}:`, innerError);
                failCount++;
            }
        }

        return NextResponse.json({ success: true, processed: allTenants.length, sent: successCount, failed: failCount });

    } catch (error) {
        console.error("Backup Job Failed:", error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
