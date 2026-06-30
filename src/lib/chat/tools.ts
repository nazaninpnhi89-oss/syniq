import type OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/server";
import type { CustomerStatusResult, LeadInput } from "./types";

export const toolDefinitions: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "capture_lead",
      description:
        "Capture contact information when the user expresses interest in SYNIQ services, requests a callback, wants to be contacted, or asks to book a consultation. Always ask for at least a name before calling this tool.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name of the prospect" },
          phone: { type: "string", description: "Phone number (optional)" },
          email: { type: "string", description: "Email address (optional)" },
          service_interest: { type: "string", description: "Which service they are interested in (optional)" },
          notes: { type: "string", description: "Any additional context from the conversation (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer_status",
      description:
        "Look up the booking or registration status for an existing customer. Use when the user asks about their appointment, booking, payment status, or order.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "The customer's email address used when booking" },
        },
        required: ["email"],
      },
    },
  },
];

export async function captureLead(
  input: LeadInput,
  sessionId: string,
): Promise<string> {
  const db = createAdminClient();
  const { error } = await db.from("leads").insert({
    session_id: sessionId,
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    service_interest: input.service_interest ?? null,
    notes: input.notes ?? null,
  });

  if (error) return `Error saving lead: ${error.message}`;
  return `Lead captured successfully for ${input.name}. A team member will reach out soon.`;
}

export async function getCustomerStatus(
  email: string,
): Promise<CustomerStatusResult> {
  const db = createAdminClient();

  const [bookingsRes, registrationsRes] = await Promise.all([
    db
      .from("bookings")
      .select("status, start_at, services(title_en)")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("registrations")
      .select("status, service_slug, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const bookings = (bookingsRes.data ?? []).map((b) => ({
    status: b.status,
    start_at: b.start_at,
    service:
      ((b.services as unknown as { title_en: string } | null))?.title_en ??
      "Consultation",
  }));

  const registrations = (registrationsRes.data ?? []).map((r) => ({
    status: r.status,
    service_slug: r.service_slug,
    created_at: r.created_at,
  }));

  return {
    found: bookings.length > 0 || registrations.length > 0,
    bookings,
    registrations,
  };
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  sessionId: string,
): Promise<string> {
  if (toolName === "capture_lead") {
    return captureLead(toolInput as unknown as LeadInput, sessionId);
  }

  if (toolName === "get_customer_status") {
    const result = await getCustomerStatus(toolInput.email as string);
    if (!result.found) {
      return "No bookings or registrations found for this email address.";
    }
    const lines: string[] = [];
    for (const b of result.bookings) {
      lines.push(
        `Booking: ${b.service} on ${new Date(b.start_at).toLocaleString()} — status: ${b.status}`,
      );
    }
    for (const r of result.registrations) {
      lines.push(`Registration: ${r.service_slug} — status: ${r.status}`);
    }
    return lines.join("\n");
  }

  return `Unknown tool: ${toolName}`;
}
