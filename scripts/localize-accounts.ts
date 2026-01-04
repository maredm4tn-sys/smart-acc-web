
import { db } from "../src/db";
import { accounts } from "../src/db/schema";
import { eq, like, or } from "drizzle-orm";

async function localizeAccounts() {
    console.log("Starting Account Localization...");

    const mappings = [
        { en: "Assets", ar: "الأصول" },
        { en: "Liabilities", ar: "الخصوم" },
        { en: "Equity", ar: "حقوق الملكية" },
        { en: "Revenue", ar: "الإيرادات" },
        { en: "Expenses", ar: "المصروفات" },
        // Add singular forms if needed, but seeds usually use Plural.
    ];

    for (const map of mappings) {
        console.log(`Updating '${map.en}' to '${map.ar}'...`);
        const result = await db.update(accounts)
            .set({ name: map.ar })
            .where(
                // Update if name is exactly English
                eq(accounts.name, map.en)
            )
            .returning();

        console.log(`Updated ${result.length} accounts.`);
    }

    // Also update "Test Debit" / "Test Credit" if they exist, per user request to localizing logic?
    // User request: '"Test Debit" -> "تجربة مدين", "Test Credit" -> "تجربة دائن"'
    // This was in the *User Request* list "1. Chart of Accounts ... Test Debit -> تجربة مدين"
    // So I should include them.
    const customMappings = [
        { en: "Test Debit", ar: "تجربة مدين" },
        { en: "Test Credit", ar: "تجربة دائن" },
        { en: "Cash", ar: "النقدية" }, // Common default?
        { en: "Bank", ar: "البنك" }
    ];

    for (const map of customMappings) {
        const result = await db.update(accounts)
            .set({ name: map.ar })
            .where(eq(accounts.name, map.en))
            .returning();
        if (result.length > 0) console.log(`Updated ${result.length} custom accounts (${map.en}).`);
    }

    console.log("Localization Complete.");
    process.exit(0);
}

localizeAccounts().catch(e => {
    console.error("Error:", e);
    process.exit(1);
});
