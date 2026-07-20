"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { logAudit } from "@/lib/admin/audit";
import { generateStructured, AiNotConfiguredError, aiErrorMessage } from "@/lib/crm/ai-validate";

const SummarySchema = z.object({
  bullets: z.array(z.string()).min(3).max(5),
});

export async function summarizeConversation(contactId: string, locale: string) {
  const ctx = await requireAdminAction("operator", locale);

  const { data: contact } = await ctx.db
    .from("contacts")
    .select("id, conversation_id")
    .eq("id", contactId)
    .single();
  if (!contact?.conversation_id) return { error: "noConversation" };

  const { data: messages } = await ctx.db
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", contact.conversation_id)
    .order("created_at", { ascending: true });
  if (!messages?.length) return { error: "noConversation" };

  try {
    const transcript = messages
      .filter((m) => m.role !== "tool")
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const result = await generateStructured(
      SummarySchema,
      `Summarize this chatbot conversation with a sales lead into 3-5 short Persian bullet points covering: their needs, concerns, and buying signals. Each bullet under 20 words.`,
      transcript,
    );

    const summary = result.bullets.map((b) => `• ${b}`).join("\n");
    await ctx.db
      .from("contacts")
      .update({ ai_summary: summary, ai_summary_at: new Date().toISOString() })
      .eq("id", contactId);

    await logAudit(ctx.user.id, "contact.ai_summarize", `contact:${contactId}`);
    revalidatePath(`/${locale}/admin/crm/contacts/${contactId}`);
    return { ok: true, summary };
  } catch (e) {
    if (e instanceof AiNotConfiguredError) return { error: aiErrorMessage(locale) };
    return { error: e instanceof Error ? e.message : "AI summarization failed" };
  }
}
