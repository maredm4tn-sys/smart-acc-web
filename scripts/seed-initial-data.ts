import { db } from "../src/db";
import { tenants, users, accounts, customers, products } from "../src/db/schema";
import { eq, like } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
    console.log("🌱 Starting seed...");

    // 1. Tenant
    let tenantId: string;
    const existingTenants = await db.select().from(tenants).limit(1);
    if (existingTenants.length > 0) {
        tenantId = existingTenants[0].id;
        console.log("✅ Using existing tenant:", tenantId);
    } else {
        const [newTenant] = await db.insert(tenants).values({
            name: "الشركة الافتراضية",
            subscriptionPlan: "pro",
            currency: "EGP"
        }).returning();
        tenantId = newTenant.id;
        console.log("✅ Created default tenant:", tenantId);
    }

    // 2. User
    const existingUsers = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
    if (existingUsers.length === 0) {
        const hashedPassword = await bcrypt.hash("password", 10);
        await db.insert(users).values({
            tenantId,
            username: "admin",
            fullName: "System Admin",
            passwordHash: hashedPassword,
            role: "admin",
            isActive: true
        });
        console.log("✅ Created admin user (admin/password)");
    } else {
        console.log("✅ Admin user exists");
    }

    // 3. Accounts (Core)
    // We need 'Cash' (نقدية) and 'Sales' (مبيعات) for invoice automation.
    const assetRoot = await ensureAccount(tenantId, "1000", "Assets", "asset");
    const liabilityRoot = await ensureAccount(tenantId, "2000", "Liabilities", "liability");
    const equityRoot = await ensureAccount(tenantId, "3000", "Equity", "equity");
    const revenueRoot = await ensureAccount(tenantId, "4000", "Revenue", "revenue");
    const expenseRoot = await ensureAccount(tenantId, "5000", "Expenses", "expense");

    // Specific accounts for Logic
    await ensureAccount(tenantId, "1100", "Current Assets", "asset", assetRoot.id);
    await ensureAccount(tenantId, "1101", "الخزينة (نقدية)", "asset", undefined); // Top level or child, name must contain 'نقدية'

    await ensureAccount(tenantId, "4100", "إيرادات المبيعات (مبيعات)", "revenue", revenueRoot.id); // Name must contain 'مبيعات'

    console.log("✅ Verified operational accounts");

    // 4. Customer
    const existingCustomers = await db.select().from(customers).limit(1);
    if (existingCustomers.length === 0) {
        await db.insert(customers).values({
            tenantId,
            name: "عميل نقدي",
            phone: "01000000000",
            email: "client@example.com"
        });
        console.log("✅ Created default customer");
    } else {
        console.log("✅ Customer exists");
    }

    // 5. Product
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
        await db.insert(products).values({
            tenantId,
            name: "خدمة عامة",
            sku: "SRV-001",
            type: "service",
            sellPrice: "100.00",
            buyPrice: "0.00",
            stockQuantity: "0"
        });
        await db.insert(products).values({
            tenantId,
            name: "لابتوب فئة أولى",
            sku: "LAP-001",
            type: "goods",
            sellPrice: "15000.00",
            buyPrice: "13000.00",
            stockQuantity: "10"
        });
        console.log("✅ Created default products");
    } else {
        console.log("✅ Products exist");
    }

    console.log("🚀 Seed completed successfully!");
    process.exit(0);
}

async function ensureAccount(tenantId: string, code: string, name: string, type: any, parentId?: number) {
    const existing = await db.select().from(accounts).where(eq(accounts.code, code)).limit(1);
    if (existing.length > 0) return existing[0];

    const [newAcc] = await db.insert(accounts).values({
        tenantId,
        code,
        name,
        type,
        parentId
    }).returning();
    return newAcc;
}

seed().catch(err => {
    console.error("Seed failed:", err);
    process.exit(1);
});
