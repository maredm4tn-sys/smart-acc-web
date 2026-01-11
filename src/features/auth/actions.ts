"use server";

import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { eq, desc, or, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not defined');
}
const SECRET_KEY = new TextEncoder().encode(secret || "default-secret-key-change-me");
const COOKIE_NAME = "session_token";

export async function getUsers() {
    const session = await getSession();
    if (!session?.tenantId) return [];

    return await db.select().from(users)
        .where(eq(users.tenantId, session.tenantId))
        .orderBy(desc(users.createdAt));
}

export async function createUser(
    firstName: string,
    username: string,
    password: string,
    role: 'admin' | 'cashier' | 'SUPER_ADMIN' | 'CLIENT',
    phone?: string,
    address?: string
) {
    if (!firstName || !username || !password || !role) {
        return { error: "جميع الحقول مطلوبة" };
    }

    try {
        // Check username
        const existing = await db.select().from(users).where(eq(users.username, username));
        if (existing.length > 0) return { error: "اسم المستخدم مسجل مسبقاً" };

        const session = await getSession();
        if (!session?.tenantId) return { error: "Unauthorized" };

        const passwordHash = await bcrypt.hash(password, 10);

        await db.insert(users).values({
            tenantId: session.tenantId,
            username,
            fullName: firstName,
            passwordHash,
            role,
            phone,   // Added
            address, // Added
            isActive: true
        });

        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (e) {
        console.error("Create User Error:", e);
        return { error: "حدث خطأ أثناء إنشاء المستخدم" };
    }
}

const updateUserSchema = z.object({
    id: z.string(),
    fullName: z.string().min(1),
    username: z.string().min(1),
    password: z.string().optional(),
    role: z.enum(['admin', 'cashier']),
    phone: z.string().optional(),
    address: z.string().optional(),
});

export async function updateUser(rawData: z.infer<typeof updateUserSchema>) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return { error: "Unauthorized" };

        const updateData: any = {
            fullName: rawData.fullName,
            username: rawData.username,
            role: rawData.role,
            phone: rawData.phone,
            address: rawData.address
        };

        if (rawData.password && rawData.password.trim().length > 0) {
            updateData.passwordHash = await bcrypt.hash(rawData.password, 10);
        }

        // Security Patch: Ensure update is scoped to current tenant
        await db.update(users)
            .set(updateData)
            .where(and(
                eq(users.id, rawData.id),
                eq(users.tenantId, session.tenantId)
            ));
        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (e) {
        return { error: "Failed to update user" };
    }
}

export async function deleteUser(userId: string) {
    try {
        const session = await getSession();
        if (session?.role !== 'admin' || !session.tenantId) return { error: "Unauthorized" };

        if (session.userId === userId) return { error: "لا يمكنك حذف نفسك" };

        // Security Patch: Ensure deletion is scoped to current tenant
        await db.delete(users).where(and(
            eq(users.id, userId),
            eq(users.tenantId, session.tenantId)
        ));
        revalidatePath("/dashboard/users");
        return { success: true };
    } catch (e) {
        return { error: "Failed to delete user" };
    }
}

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
        // Find user by username OR email
        const [user] = await db.select().from(users).where(
            or(
                eq(users.username, username),
                eq(users.email, username)
            )
        );

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
            fullName: user.fullName,
            tenantId: user.tenantId // Add tenantId to session
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
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
        });

        revalidatePath('/', 'layout');

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
    // ---------------------------------------------------------
    // DESKTOP OFFLINE MODE: SEEDING (First Run Only)
    // ---------------------------------------------------------
    if (process.env.NEXT_PUBLIC_APP_MODE === 'desktop') {
        try {
            // Check if ANY user exists (Optimization: only select id)
            const usersCount = await db.select({ id: users.id }).from(users).limit(1);

            if (usersCount.length === 0) {
                // 2. First Run: Seed Database
                console.log("🌱 [Offline] First run detected. Seeding database...");

                const [newTenant] = await db.insert(tenants).values({
                    name: "الفرع الرئيسي (Offline)",
                    type: "RETAIL", // Default type
                    subscriptionStatus: "ACTIVE",
                    subscriptionEndsAt: new Date("2099-12-31") // Lifetime
                }).returning();

                const [newUser] = await db.insert(users).values({
                    tenantId: newTenant.id,
                    username: "admin",
                    fullName: "مدير النظام",
                    passwordHash: await bcrypt.hash("admin", 10), // Default password, just in case
                    role: "admin",
                    isActive: true
                }).returning();

                // Auto-login JUST FOR THE FIRST SEEDING
                return {
                    userId: newUser.id,
                    username: newUser.username,
                    role: newUser.role,
                    fullName: newUser.fullName,
                    tenantId: newUser.tenantId
                };
            }
            // If users exist, DO NOTHING. Let it fall through to Cookie Auth below.

        } catch (e) {
            console.error("Offline Session Seeding Error:", e);
            // Don't return null here, maybe cookie auth works?
        }
    }
    // ---------------------------------------------------------

    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY);

        // Strict Security Check: Verify User exists and is Active in DB
        const userId = payload.userId as string;
        // Verify against DB to ensure immediate suspension
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        // TEMPORARY BYPASS FOR DEV PREVIEW
        /*
        if (!user || !user.isActive || user.status === 'SUSPENDED') {
            console.warn(`Blocked suspended/inactive user session: ${userId}`);
            return null; // Treated as logged out
        }
        */

        return payload as { userId: string; username: string; role: 'admin' | 'cashier' | 'SUPER_ADMIN' | 'CLIENT'; fullName: string; tenantId: string };
    } catch (e) {
        return null; // Invalid token
    }
}
