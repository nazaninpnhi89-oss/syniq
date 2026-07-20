import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/require-admin";
import { askAssistant } from "@/lib/crm/assistant-brain";
import { aiErrorMessage } from "@/lib/crm/ai-validate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const AskInput = z.object({
  message: z.string().trim().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
  locale: z.string().default("fa"),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("viewer");
  if (guard instanceof NextResponse) return guard;

  const parsed = AskInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { message, history, locale } = parsed.data;

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: aiErrorMessage(locale) }, { status: 200 });
  }

  try {
    const reply = await askAssistant(message, history, locale);
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "assistant failed" },
      { status: 500 },
    );
  }
}
