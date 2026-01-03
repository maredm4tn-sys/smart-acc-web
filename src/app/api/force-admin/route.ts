import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const targetEmail = "maredm4tn@gmail.com";
        const newPassword = "MaredAdmin2026!";

        // 1. Find User
        const userList = await db.select().from(users).where(eq(users.email, targetEmail));

        if (userList.length === 0) {
            return NextResponse.json({ error: "User not found by email" }, { status: 404 });
        }

        const user = userList[0];

        // 2. Hash Password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // 3. Update User
        await db.update(users)
            .set({
                role: 'SUPER_ADMIN',
                status: 'ACTIVE',
                isActive: true,
                passwordHash: passwordHash
            })
            .where(eq(users.id, user.id));

        return NextResponse.json({
            success: true,
            message: "User updated successfully",
            user: {
                email: targetEmail,
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
