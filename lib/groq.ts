import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = "llama-3.3-70b-versatile";

type Message = { role: "user" | "assistant" | "system"; content: string };

function wrapError(err: unknown): Error & { statusCode: number } {
  const msg =
    (err as { error?: { error?: { message?: string } }; message?: string })
      ?.error?.error?.message ||
    (err as { message?: string })?.message ||
    "LLM request failed";
  const e = new Error(msg) as Error & { statusCode: number };
  e.statusCode = 400;
  return e;
}

/** Non-streaming — returns full reply string. */
export async function getLLMResponse(userMessage: string): Promise<string> {
  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.7,
    });
    return resp.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    throw wrapError(err);
  }
}

/** Streaming — returns an async iterable of chunks. */
export async function getLLMStream(messages: Message[]) {
  try {
    return await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
      stream: true,
    });
  } catch (err) {
    throw wrapError(err);
  }
}
