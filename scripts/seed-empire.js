const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('smart-acc-offline.db');

async function run() {
    try {
        console.log("Starting Empire Seeding - Final Version...");

        // 0. Get Tenant
        const tenant = db.prepare('SELECT id, name FROM tenants LIMIT 1').get();
        if (!tenant) throw new Error('No tenant found. Please log in first.');
        const tId = tenant.id;
        console.log(`Working for Tenant: ${tenant.name} (${tId})`);

        // Get or Create Fiscal Year
        let fy = db.prepare("SELECT id FROM fiscal_years WHERE tenant_id = ? LIMIT 1").get(tId);
        if (!fy) {
            console.log("Creating Fiscal Year...");
            const id = db.prepare("INSERT INTO fiscal_years (tenant_id, name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?)")
                .run(tId, '2026-FY', '2026-01-01', '2026-12-31', 'open').lastInsertRowid;
            fy = { id };
        }
        const fyId = fy.id;

        // 1. Essential Accounts
        let cashAcc = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND (type = 'asset' AND (name LIKE '%صندوق%' OR name LIKE '%نقدي%')) LIMIT 1").get(tId);
        let capAcc = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND (type = 'equity' AND (name LIKE '%رأس المال%')) LIMIT 1").get(tId);
        let revAcc = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND (type = 'revenue' OR type = 'income') LIMIT 1").get(tId);
        let expAcc = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND (type = 'expense') LIMIT 1").get(tId);
        let stockAcc = db.prepare("SELECT id FROM accounts WHERE tenant_id = ? AND (name LIKE '%مخزن%' OR name LIKE '%بضاعة%') LIMIT 1").get(tId);

        if (!cashAcc) {
            const id = db.prepare("INSERT INTO accounts (tenant_id, name, code, type, is_active) VALUES (?, ?, ?, ?, ?)")
                .run(tId, 'صندوق المركز الرئيسي', '1101', 'asset', 1).lastInsertRowid;
            cashAcc = { id };
        }
        if (!capAcc) {
            const id = db.prepare("INSERT INTO accounts (tenant_id, name, code, type, is_active) VALUES (?, ?, ?, ?, ?)")
                .run(tId, 'رأس المال الاستثماري', '3101', 'equity', 1).lastInsertRowid;
            capAcc = { id };
        }
        if (!revAcc) {
            const id = db.prepare("INSERT INTO accounts (tenant_id, name, code, type, is_active) VALUES (?, ?, ?, ?, ?)")
                .run(tId, 'إيرادات مبيعات التقنية', '4101', 'revenue', 1).lastInsertRowid;
            revAcc = { id };
        }
        if (!expAcc) {
            const id = db.prepare("INSERT INTO accounts (tenant_id, name, code, type, is_active) VALUES (?, ?, ?, ?, ?)")
                .run(tId, 'مصاريف تشغيلية', '5101', 'expense', 1).lastInsertRowid;
            expAcc = { id };
        }
        if (!stockAcc) {
            const id = db.prepare("INSERT INTO accounts (tenant_id, name, code, type, is_active) VALUES (?, ?, ?, ?, ?)")
                .run(tId, 'مخزون بضائع التميز', '1201', 'asset', 1).lastInsertRowid;
            stockAcc = { id };
        }

        const now = new Date().toISOString();
        const tsSec = Math.floor(Date.now() / 1000);

        // 2. Capital
        const startupEntry = db.prepare("INSERT INTO journal_entries (tenant_id, fiscal_year_id, entry_number, transaction_date, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(tId, fyId, 'OPB-001', now, 'إيداع رأس مال المليار جنيه - استثمارات التميز', 'posted', tsSec).lastInsertRowid;

        db.prepare("INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?)")
            .run(startupEntry, cashAcc.id, 'إيداع نقدي', '1000000000.00', '0.00');
        db.prepare("INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?)")
            .run(startupEntry, capAcc.id, 'رأس المال', '0.00', '1000000000.00');

        // 3. Suppliers
        const suppliers = [
            ['Apple Global Distribution', 'Dubai', '97100001'],
            ['NVIDIA Solutions', 'USA', '14080002']
        ];
        const supplierIds = [];
        for (let s of suppliers) {
            const id = db.prepare("INSERT INTO suppliers (tenant_id, name, address, phone, created_at) VALUES (?, ?, ?, ?, ?)")
                .run(tId, s[0], s[1], s[2], tsSec).lastInsertRowid;
            supplierIds.push({ id, name: s[0] });
        }

        // 4. Products
        const products = [
            ['MacBook Pro M4 Max', 'MBP-M4-ULTRA', '280000.00', '350000.00'],
            ['NVIDIA Blackwell B200', 'GPU-B200', '950000.00', '1350000.00'],
        ];
        const prodIds = [];
        for (let p of products) {
            const id = db.prepare("INSERT INTO products (tenant_id, name, sku, buy_price, sell_price, stock_quantity, type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
                .run(tId, p[0], p[1], p[2], p[3], '1000', 'goods', tsSec).lastInsertRowid;
            prodIds.push({ id, name: p[0], buy: Number(p[2]), sell: Number(p[3]) });
        }

        // 5. Purchases
        for (let i = 0; i < supplierIds.length; i++) {
            let subtotal = 0;
            const items = prodIds;
            items.forEach(p => subtotal += p.buy * 50);
            const totalStr = subtotal.toFixed(2);

            const purId = db.prepare("INSERT INTO purchase_invoices (tenant_id, supplier_id, supplier_name, invoice_number, issue_date, subtotal, tax_total, total_amount, amount_paid, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                .run(tId, supplierIds[i].id, supplierIds[i].name, 'PUR-INV-' + i, now, totalStr, '0.00', totalStr, totalStr, 'paid', tsSec).lastInsertRowid;

            items.forEach(p => {
                db.prepare("INSERT INTO purchase_invoice_items (purchase_invoice_id, product_id, description, quantity, unit_cost, total) VALUES (?, ?, ?, ?, ?, ?)")
                    .run(purId, p.id, p.name, '50', p.buy.toFixed(2), (p.buy * 50).toFixed(2));
            });

            const entryId = db.prepare("INSERT INTO journal_entries (tenant_id, fiscal_year_id, entry_number, transaction_date, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .run(tId, fyId, 'PUR-' + purId, now, 'مشتريات مخزون من ' + supplierIds[i].name, 'posted', tsSec).lastInsertRowid;
            db.prepare("INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?)")
                .run(entryId, cashAcc.id, 'دفع قيمة مشتريات', '0.00', totalStr);
            db.prepare("INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?)")
                .run(entryId, stockAcc.id, 'إضافة للمخزن', totalStr, '0.00');
        }

        // 6. Customers
        const custName = 'مركز البيانات الحكومي';
        const custId = db.prepare("INSERT INTO customers (tenant_id, name, address, phone, created_at) VALUES (?, ?, ?, ?, ?)")
            .run(tId, custName, 'العاصمة الإدارية', '19XXX', tsSec).lastInsertRowid;

        // 7. Sales Flow
        for (let i = 0; i < 15; i++) {
            const prod = prodIds[i % prodIds.length];
            const qty = 5;
            const amt = prod.sell * qty;
            const totalStr = amt.toFixed(2);

            const salId = db.prepare("INSERT INTO invoices (tenant_id, invoice_number, customer_id, customer_name, type, issue_date, subtotal, tax_total, total_amount, amount_paid, payment_status, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                .run(tId, 'S-INV-' + i, custId, custName, 'sale', now, totalStr, '0.00', totalStr, totalStr, 'paid', 'posted', tsSec).lastInsertRowid;

            db.prepare("INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)")
                .run(salId, prod.id, prod.name, qty.toString(), prod.sell.toFixed(2), totalStr);

            const entryId = db.prepare("INSERT INTO journal_entries (tenant_id, fiscal_year_id, entry_number, transaction_date, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .run(tId, fyId, 'SAL-' + salId, now, 'مبيعات لعميل: ' + custName, 'posted', tsSec).lastInsertRowid;
            db.prepare("INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?)")
                .run(entryId, cashAcc.id, 'تحصيل قيمة مبيعات', totalStr, '0.00');
            db.prepare("INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit) VALUES (?, ?, ?, ?, ?)")
                .run(entryId, revAcc.id, 'إيرادات مبيعات', '0.00', totalStr);
        }

        console.log("Empire Seeding Completed Successfully.");

    } catch (e) {
        console.error("Seeding Error:", e);
    } finally {
        db.close();
    }
}

run();
