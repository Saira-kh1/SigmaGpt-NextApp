import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Thread from "@/lib/models/Thread";
import { requireAuth, requireRegistered, ApiError } from "@/lib/auth";

type Params = { params: Promise<{ threadId: string }> };

// GET /api/thread/[threadId]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const payload = requireAuth(req);
    requireRegistered(payload);

    const { threadId } = await params;
    const { searchParams } = new URL(req.url);
    const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 500);

    await connectDB();

    const thread = await Thread.findOne(
      { threadId, ownerId: payload.sub },
      { _id: 0, threadId: 1, title: 1, messages: 1, updatedAt: 1, createdAt: 1 }
    ).lean();

    if (!thread)
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const allMessages = (thread as { messages: unknown[] }).messages;
    const total = allMessages.length;
    const messages = allMessages.slice(skip, skip + limit);

    return NextResponse.json({
      threadId,
      title: (thread as { title: string }).title,
      total,
      skip,
      limit,
      messages,
    });
  } catch (err: unknown) {
    const status = (err as ApiError)?.status ?? 500;
    const message = (err as Error)?.message ?? "Failed to fetch thread";
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/thread/[threadId]
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const payload = requireAuth(req);
    requireRegistered(payload);

    const { threadId } = await params;
    await connectDB();

    const deleted = await Thread.findOneAndDelete({
      threadId,
      ownerId: payload.sub,
    });

    if (!deleted)
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const status = (err as ApiError)?.status ?? 500;
    const message = (err as Error)?.message ?? "Failed to delete thread";
    return NextResponse.json({ error: message }, { status });
  }
}
