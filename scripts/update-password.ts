import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
    const targetUsername = "admin";
    const newPassword = "admin123";

    console.log(`Searching for user: ${targetUsername}...`);

    const userList = await db.select().from(users).where(eq(users.username, targetUsername));

    if (userList.length === 0) {
        console.error("User not found.");
        return;
    }

    const user = userList[0];
    console.log(`Found user: ${user.username} (ID: ${user.id})`);

    console.log("Hashing new password...");
    const passwordHash = await bcrypt.hash(newPassword, 10);

    console.log("Updating password...");
    await db.update(users)
        .set({ passwordHash })
        .where(eq(users.id, user.id));

    console.log("Password updated successfully!");
}

main().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
});
