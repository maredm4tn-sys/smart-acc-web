
const Database = require('better-sqlite3');
const sqlite = new Database('smart-acc-offline.db');

async function accountantFullTest() {
    console.log("--- 🧐 البَدْءُ فِي الفَحْصِ المَحَاسِبِيِّ الشَّامِلِ ---");

    try {
        const tenant = sqlite.prepare('SELECT id FROM tenants LIMIT 1').get();
        if (!tenant) throw new Error("No tenant found");
        const tenantId = tenant.id;

        const fiscalYear = sqlite.prepare('SELECT id FROM fiscal_years WHERE tenant_id = ? AND is_closed = 0 LIMIT 1').get(tenantId);
        if (!fiscalYear) throw new Error("No open fiscal year found.");

        const treasury = sqlite.prepare("SELECT id FROM accounts WHERE code = '1101' AND tenant_id = ?").get(tenantId);
        const capital = sqlite.prepare("SELECT id FROM accounts WHERE code = '3001' AND tenant_id = ?").get(tenantId);

        if (!treasury || !capital) throw new Error("Required accounts (1101 or 3001) missing.");

        // Clean up previous test data to avoid duplicates/confusion if needed
        // sqlite.prepare("DELETE FROM journal_lines WHERE tenant_id = ?").run(tenantId);

        // 1. Capital Injection
        const vNum1 = "CAP-" + Date.now();
        sqlite.prepare(`
            INSERT INTO vouchers (voucher_number, type, date, amount, description, party_type, account_id, tenant_id)
            VALUES (?, 'receipt', date('now'), '50000.00', 'إيداع رأس مال ابتدائي', 'other', ?, ?)
        `).run(vNum1, capital.id, tenantId);

        const journalEntryId1 = Math.floor(Math.random() * 1000000);
        sqlite.prepare(`
            INSERT INTO journal_entries (id, tenant_id, fiscal_year_id, entry_number, transaction_date, description, reference)
            VALUES (?, ?, ?, ?, date('now'), 'قيد إيداع رأس مال', ?)
        `).run(journalEntryId1, tenantId, fiscalYear.id, "JE-" + vNum1, vNum1);

        // Journal Lines (Strings for precision as per schema)
        sqlite.prepare(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, '50000.00', '0.00')`).run(journalEntryId1, treasury.id);
        sqlite.prepare(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, '0.00', '50000.00')`).run(journalEntryId1, capital.id);

        console.log("✅ العملية 1: تم إيداع 50,000 ج.م رأس مال بنجاح.");

        // 2. Expense
        const electricity = sqlite.prepare("SELECT id FROM accounts WHERE name LIKE '%كهرباء%' AND tenant_id = ?").get(tenantId);
        if (electricity) {
            const vNum2 = "EXP-" + (Date.now() + 1);
            sqlite.prepare(`
                INSERT INTO vouchers (voucher_number, type, date, amount, description, party_type, account_id, tenant_id)
                VALUES (?, 'payment', date('now'), '500.00', 'مصاريف كهرباء', 'other', ?, ?)
            `).run(vNum2, electricity.id, tenantId);

            const journalEntryId2 = Math.floor(Math.random() * 1000000);
            sqlite.prepare(`
                INSERT INTO journal_entries (id, tenant_id, fiscal_year_id, entry_number, transaction_date, description, reference)
                VALUES (?, ?, ?, ?, date('now'), 'قيد سداد كهرباء', ?)
            `).run(journalEntryId2, tenantId, fiscalYear.id, "JE-" + vNum2, vNum2);

            sqlite.prepare(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, '500.00', '0.00')`).run(journalEntryId2, electricity.id);
            sqlite.prepare(`INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, '0.00', '500.00')`).run(journalEntryId2, treasury.id);
            console.log("✅ العملية 2: تم صرف 500 ج.م كهرباء بنجاح.");
        }

        // 3. Final Verification (Audit)
        const res = sqlite.prepare(`
            SELECT 
                SUM(CAST(debit AS REAL)) as debits, 
                SUM(CAST(credit AS REAL)) as credits 
            FROM journal_lines jl
            JOIN journal_entries je ON jl.journal_entry_id = je.id
            WHERE je.tenant_id = ?
        `).get(tenantId);

        const treasuryBal = sqlite.prepare(`
            SELECT SUM(CAST(debit AS REAL) - CAST(credit AS REAL)) as balance 
            FROM journal_lines 
            WHERE account_id = ?
        `).get(treasury.id);

        console.log(`\n--- 📊 تَقْرِيرُ المُحَاسِبِ الفَنِّيِّ ---`);
        console.log(`إجمالي المديونية في النظام: ${res.debits} ج.م`);
        console.log(`إجمالي الدائنية في النظام: ${res.credits} ج.م`);
        console.log(`صافي رصيد الخزينة (نقدي): ${treasuryBal.balance} ج.م`);

        console.log(`\n--- 🔍 مَلَاحَظَاتُ المُرَاجِعِ ---`);
        if (res.debits === res.credits) {
            console.log("✅ اتزان ميزانية المراجعة: النظام يحافظ على توازن القيد المزدوج.");
        } else {
            console.log("⚠️ خلل في التوازن: يوجد فرق بين المدين والدائن!");
        }

        if (treasuryBal.balance >= 0) {
            console.log("✅ السيولة النقدية: الخزينة في حالة موجبة.");
        } else {
            console.log("❌ عجز نقدي: الخزينة بالسالب! (تحذير محاسبي)");
        }

    } catch (e) {
        console.error("❌ فشل الاختبار المحاسبي:", e.message);
    }
}

accountantFullTest();
