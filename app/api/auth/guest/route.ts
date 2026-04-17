import { NextRequest, NextResponse } from "next/server";
import { signGuestToken } from "@/lib/auth";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (isRateLimited(`guest-create:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests. Please sign up for unlimited access." },
        { status: 429 }
      );
    }

    const token = signGuestToken();
    return NextResponse.json({
      ok: true,
      isGuest: true,
      token,
      message: "Guest session created. Sign up to save your conversations!",
    });
  } catch (err) {
    console.error("GUEST SESSION error:", err);
    return NextResponse.json(
      { error: "Failed to create guest session" },
      { status: 500 }
    );
  }
}
