import { coachSystemPrompt } from "@/lib/coach/lessons";

// Cheapest non-reasoning chat model by default; override with OPENAI_MODEL in .env.local.
const DEFAULT_MODEL = "gpt-4.1-nano";
const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 2000;
const MAX_REPLY_TOKENS = 500;
const UPSTREAM_TIMEOUT_MS = 20_000;

type IncomingMessage = { role: "user" | "coach"; text: string };

function parseMessages(value: unknown): IncomingMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parsed: IncomingMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { role, text } = item as Record<string, unknown>;
    if ((role !== "user" && role !== "coach") || typeof text !== "string") return null;
    const trimmed = text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (trimmed) parsed.push({ role, text: trimmed });
  }
  const recent = parsed.slice(-MAX_HISTORY);
  return recent.length > 0 && recent[recent.length - 1].role === "user" ? recent : null;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "The coach isn’t connected yet. Add OPENAI_API_KEY to .env.local and restart the server." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { lesson, messages } = (body ?? {}) as Record<string, unknown>;
  const systemPrompt = typeof lesson === "number" ? coachSystemPrompt(lesson) : null;
  const history = parseMessages(messages);
  if (!systemPrompt || !history) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // max_completion_tokens works on every current chat model; max_tokens is rejected by reasoning models.
  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        max_completion_tokens: MAX_REPLY_TOKENS,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((message) => ({ role: message.role === "coach" ? "assistant" : "user", content: message.text })),
        ],
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    console.error("[coach] OpenAI request failed:", error);
    return Response.json({ error: timedOut ? "The coach took too long to answer. Try again." : "The coach is unreachable right now. Try again." }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  } | null;

  if (!upstream.ok) {
    console.error(`[coach] OpenAI ${upstream.status}:`, payload?.error?.message ?? "no error body");
    return Response.json({ error: "The coach couldn’t answer right now. Try again." }, { status: 502 });
  }

  const reply = payload?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return Response.json({ error: "The coach returned an empty answer. Try again." }, { status: 502 });
  }

  return Response.json({ reply });
}
