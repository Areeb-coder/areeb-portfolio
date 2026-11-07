import { NextResponse } from "next/server";
import { guideKnowledge } from "../../../data/portfolio";

export const runtime = "nodejs";

// Lightweight per-instance guard; add a shared store (e.g. Redis/Upstash) before
// running a high-traffic public deployment with a paid model key.
const requestBuckets = new Map<string, number[]>();

export async function POST(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const now = Date.now();
  const recent = (requestBuckets.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 12) {
    requestBuckets.set(ip, recent);
    return NextResponse.json({ error: "A few too many messages. Try again in a minute." }, { status: 429 });
  }
  recent.push(now);
  requestBuckets.set(ip, recent);
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return NextResponse.json({ error: "Assistant API is not configured." }, { status: 503 });

  try {
    const payload = await request.json();
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    const safeMessages = messages
      .filter((m: unknown): m is { role: string; content: string } => !!m && typeof m === "object" && "role" in m && "content" in m)
      .filter((m: { role: string; content: string }) => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-8)
      .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content.slice(0, 1200) }));

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return NextResponse.json({ error: "Send a message to continue." }, { status: 400 });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": request.headers.get("origin") || "http://localhost:3000",
        "X-Title": "Areeb Khalid Portfolio Guide"
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        temperature: 0.55,
        max_tokens: 220,
        messages: [{ role: "system", content: guideKnowledge }, ...safeMessages]
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter assistant error:", response.status, errorText.slice(0, 500));
      return NextResponse.json({ error: "The guide is unavailable right now." }, { status: 502 });
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return NextResponse.json({ error: "The guide returned an empty answer." }, { status: 502 });
    }
    return NextResponse.json({ answer: answer.trim() });
  } catch {
    return NextResponse.json({ error: "Could not process that message." }, { status: 400 });
  }
}
