import { NextResponse } from "next/server";
import { getSettings } from "@/features/settings/actions";

export async function GET() {
    try {
        const settings = await getSettings();
        if (!settings) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
