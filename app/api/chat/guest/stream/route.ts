import { NextRequest } from "next/server";
import { getLLMStream } from "@/lib/groq";
import { requireAuth, isGuest } from "@/lib/auth";
import { isRateLimited } from "@/lib/rateLimit";

function encode(payload: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}
function encodeDone(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

export async function POST(req: NextRequest) {
  let payload;
  try {
    payload = requireAuth(req);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status ?? 401;
    const message = (err as Error)?.message ?? "Unauthorized";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isGuest(payload)) {
    return new Response(
      JSON.stringify({ error: "This endpoint is for guests only." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Rate limit by guest sub ID
  if (isRateLimited(`guest-chat:${payload.sub}`, 5, 60_000)) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded. Please sign up for unlimited chatting!",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const message = String(body?.message || "").trim();

  if (!message) {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullReply = "";
        const llmStream = await getLLMStream([{ role: "user", content: message }]);

        for await (const chunk of llmStream) {
          const token = chunk.choices?.[0]?.delta?.content || "";
          if (token) {
            fullReply += token;
            controller.enqueue(encode({ token }));
          }
        }

        controller.enqueue(encode({ done: true, fullReply }));
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
