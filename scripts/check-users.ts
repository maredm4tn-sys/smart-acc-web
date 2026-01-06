
import { db } from "@/db";
import { users } from "@/db/schema";

async function listUsers() {
    const allUsers = await db.select().from(users);
    console.table(allUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        tenantId: u.tenantId
    })));
}

listUsers().then(() => process.exit(0)).catch(console.error);
