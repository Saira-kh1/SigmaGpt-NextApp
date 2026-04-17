import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Thread from "@/lib/models/Thread";
import { getLLMStream } from "@/lib/groq";
import { requireAuth, requireRegistered } from "@/lib/auth";

const clamp = (s: string, max = 120) =>
  typeof s === "string" ? s.slice(0, max) : "";

function encode(payload: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}
function encodeDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

export async function POST(req: NextRequest) {
  // Auth check before starting the stream
  let payload;
  try {
    payload = requireAuth(req);
    requireRegistered(payload);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status ?? 401;
    const message = (err as Error)?.message ?? "Unauthorized";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const threadId = String(body?.threadId || "").trim();
  const message = String(body?.message || "").trim();

  if (!threadId || !message) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: threadId, message" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (threadId.length > 100) {
    return new Response(JSON.stringify({ error: "threadId too long" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await connectDB();

        const now = new Date();
        await Thread.findOneAndUpdate(
          { threadId, ownerId: payload.sub },
          {
            $setOnInsert: {
              threadId,
              ownerId: payload.sub,
              title: clamp(message, 120),
              createdAt: now,
            },
            $set: { updatedAt: now, lastMessageAt: now },
            $push: { messages: { role: "user", content: message, at: now } },
          },
          { upsert: true, new: false }
        );

        let fullReply = "";
        const llmStream = await getLLMStream([{ role: "user", content: message }]);

        for await (const chunk of llmStream) {
          const token = chunk.choices?.[0]?.delta?.content || "";
          if (token) {
            fullReply += token;
            controller.enqueue(encode({ token }));
          }
        }

        // Save assistant reply
        try {
          await Thread.findOneAndUpdate(
            { threadId, ownerId: payload.sub },
            {
              $set: { updatedAt: new Date(), lastMessageAt: new Date() },
              $push: {
                messages: {
                  role: "assistant",
                  content: fullReply,
                  at: new Date(),
                },
              },
            }
          );
        } catch (dbErr) {
          console.error("Failed to save assistant reply:", dbErr);
        }

        controller.enqueue(encode({ done: true, threadId }));
        controller.enqueue(encodeDone());
        controller.close();
      } catch (err: unknown) {
        const msg = (err as Error)?.message || "Stream failed";
        controller.enqueue(encode({ error: msg }));
        controller.enqueue(encodeDone());
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
