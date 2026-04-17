import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const payload = requireAuth(req);

    if (payload.isGuest) {
      return NextResponse.json({
        ok: true,
        user: {
          id: payload.sub,
          role: "guest",
          isGuest: true,
          name: "Guest User",
        },
      });
    }

    await connectDB();
    const user = await User.findById(payload.sub, { passwordHash: 0 }).lean();
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ ok: true, user });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status ?? 500;
    const message = (err as Error)?.message ?? "Failed to load profile";
    return NextResponse.json({ error: message }, { status });
  }
}
