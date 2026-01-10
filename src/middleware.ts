import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not defined in environment variables');
}
const SECRET_KEY = new TextEncoder().encode(secret || "default-secret-key-change-me");

export async function middleware(request: NextRequest) {
    const token = request.cookies.get("session_token")?.value;
    const { pathname } = request.nextUrl;

    // 1. Check if trying to access dashboard
    if (pathname.startsWith("/dashboard")) {
        if (!token) {
            return NextResponse.redirect(new URL("/login", request.url));
        }

        try {
            await jwtVerify(token, SECRET_KEY);
            // Valid token, proceed
            return NextResponse.next();
        } catch (e) {
            // Invalid token
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // 2. Check if trying to access auth pages while logged in
    if (pathname === "/login") {
        if (token) {
            try {
                await jwtVerify(token, SECRET_KEY);
                return NextResponse.redirect(new URL("/dashboard", request.url));
            } catch (e) {
                // Token invalid, allow login
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};
