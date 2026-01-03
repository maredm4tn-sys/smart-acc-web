import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const targetUsername = "admin";
    const targetEmail = "maredm4tn@gmail.com";

    console.log(`Searching for user with username: ${targetUsername}...`);

    const userList = await db.select().from(users).where(eq(users.username, targetUsername));

    if (userList.length === 0) {
        console.error("User 'admin' not found.");
        return;
    }

    const user = userList[0];
    console.log(`Found user: ${user.username} (Current Email: ${user.email}, Role: ${user.role})`);

    console.log(`Updating user 'admin' -> Email: ${targetEmail}, Role: SUPER_ADMIN...`);

    await db.update(users)
        .set({
            role: 'SUPER_ADMIN',
            email: targetEmail,
            status: 'ACTIVE'
        })
        .where(eq(users.id, user.id));

    console.log("Update successful!");
}

main().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
});
