import { NextRequest, NextResponse } from "next/server";
import { createSession, ensureSession } from "@/lib/chat/memory";
import { processMessage } from "@/lib/chat/brain";
import type { Locale, Source } from "@/lib/chat/types";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: {
    message: string;
    sessionId?: string;
    locale?: string;
    source?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, sessionId: rawSessionId } = body;
  const locale = (body.locale ?? "fa") as Locale;
  const source = (body.source ?? "web") as Source;

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let sessionId: string;
  let isNewSession = false;

  if (rawSessionId) {
    sessionId = await ensureSession(rawSessionId, source, locale);
    isNewSession = sessionId !== rawSessionId;
  } else {
    sessionId = await createSession(source, locale);
    isNewSession = true;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      }

      try {
        if (isNewSession) {
          send({ type: "session", id: sessionId });
        }

        for await (const token of processMessage(sessionId, message, locale)) {
          if (token === "​") {
            send({ type: "status", message: "thinking" });
          } else {
            send({ type: "token", content: token });
          }
        }

        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: String(err) });
        send({ type: "done" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
