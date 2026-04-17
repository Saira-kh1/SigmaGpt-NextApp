import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Thread from "@/lib/models/Thread";
import { requireAuth, requireRegistered, ApiError } from "@/lib/auth";

// GET /api/thread — list all threads for the authed user
export async function GET(req: NextRequest) {
  try {
    const payload = requireAuth(req);
    requireRegistered(payload);

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const skip = Number(searchParams.get("skip")) || 0;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

    const filter: Record<string, unknown> = { ownerId: payload.sub };
    if (q) filter.title = { $regex: String(q).trim(), $options: "i" };

    const threads = await Thread.find(filter, {
      _id: 0,
      threadId: 1,
      title: 1,
      updatedAt: 1,
      createdAt: 1,
      lastMessageAt: 1,
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json(threads);
  } catch (err: unknown) {
    const status = (err as ApiError)?.status ?? 500;
    const message = (err as Error)?.message ?? "Failed to fetch threads";
    return NextResponse.json({ error: message }, { status });
  }
}
