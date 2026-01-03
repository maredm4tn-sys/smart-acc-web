import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
    const targetEmail = "maredm4tn@gmail.com";
    const newPassword = "q1@W2#Ew%tGd6^t&8(HfV#t";

    console.log(`Searching for user with email: ${targetEmail}...`);

    const userList = await db.select().from(users).where(eq(users.email, targetEmail));

    if (userList.length === 0) {
        console.error("User not found by email.");
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
