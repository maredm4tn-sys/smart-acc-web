"use server";

import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not defined');
}
const SECRET_KEY = new TextEncoder().encode(secret || "default-secret-key-change-me");
const COOKIE_NAME = "session_token";

export async function getUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function createUser(firstName: string, username: string, password: string, role: 'admin' | 'cashier' | 'SUPER_ADMIN' | 'CLIENT') {
    if (!firstName || !username || !password || !role) {
        return { error: "جميع الحقول مطلوبة" };
    }

    try {
        // Check username
        const existing = await db.select().from(users).where(eq(users.username, username));
        if (existing.length > 0) return { error: "اسم المستخدم مسجل مسبقاً" };

        const [tenant] = await db.select().from(tenants).limit(1);
        if (!tenant) return { error: "System Error: No Tenant" };

        const passwordHash = await bcrypt.hash(password, 10);

        await db.insert(users).values({
            tenantId: tenant.id,
            username,
            fullName: firstName, // prompt asked for full_name
            passwordHash,
            role,
            isActive: true
        });

        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (e) {
        console.error("Create User Error:", e);
        return { error: "حدث خطأ أثناء إنشاء المستخدم" };
    }
}


import { z } from "zod";

const loginSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(1)
});

export async function login(currentState: any, formData: FormData) {
    const rawData = {
        username: formData.get("username"),
        password: formData.get("password")
    };

    const validation = loginSchema.safeParse(rawData);
    if (!validation.success) {
        return { error: "البيانات المدخلة غير صالحة" };
    }

    const { username, password } = validation.data;

    try {
        // Find user
        const [user] = await db.select().from(users).where(eq(users.username, username));

        if (!user) {
            return { error: "بيانات الدخول غير صحيحة" };
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return { error: "بيانات الدخول غير صحيحة" };
        }

        if (!user.isActive) {
            return { error: "تم إيقاف هذا الحساب" };
        }

        // Create Session Token
        const token = await new SignJWT({
            userId: user.id,
            username: user.username,
            role: user.role,
            fullName: user.fullName
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(SECRET_KEY);

        // Set Cookie
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        });

    } catch (e) {
        console.error("Login error:", e);
        return { error: "حدث خطأ غير متوقع" };
    }

    // Redirect (must be outside try/catch)
    redirect("/dashboard");
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    redirect("/login");
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);
        return payload as { userId: string; username: string; role: 'admin' | 'cashier' | 'SUPER_ADMIN' | 'CLIENT'; fullName: string };
    } catch (e) {
        return null;
    }
}
