import { NextResponse } from "next/server";
import { getSettings } from "@/features/settings/actions";

export async function GET() {
    try {
        const settings = await getSettings();
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to fetch settings" }, { status: 500 });
    }
}
