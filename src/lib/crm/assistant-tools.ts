import "server-only";
import { z } from "zod";
import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";

export const assistantToolDefinitions: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "query_leads",
      description: "Query CRM leads, optionally filtered by status. Returns up to 20 recent leads.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["new", "contacted", "qualified", "converted", "closed"],
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_deals",
      description: "Query CRM deals, optionally filtered by status. Returns up to 20 recent deals.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "won", "lost"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_activities",
      description: "Query CRM activities/tasks, optionally filtered by type. Returns up to 20 recent items.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["call", "meeting", "note", "task", "stage_change"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crm_stats",
      description:
        "Returns aggregate CRM counts: total leads, total contacts, open/won/lost deal counts, and total pipeline value in Toman.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const QueryLeadsArgs = z.object({ status: z.string().optional() });
const QueryDealsArgs = z.object({ status: z.string().optional() });
const QueryActivitiesArgs = z.object({ type: z.string().optional() });

export async function executeAssistantTool(
  db: SupabaseClient,
  name: string,
  rawArgs: string,
): Promise<string> {
  const args = rawArgs ? JSON.parse(rawArgs) : {};

  switch (name) {
    case "query_leads": {
      const { status } = QueryLeadsArgs.parse(args);
      let q = db
        .from("leads")
        .select("id, name, status, source, ai_score, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      return JSON.stringify(error ? { error: error.message } : data);
    }
    case "query_deals": {
      const { status } = QueryDealsArgs.parse(args);
      let q = db
        .from("deals")
        .select("id, title, stage_key, status, amount_toman, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      return JSON.stringify(error ? { error: error.message } : data);
    }
    case "query_activities": {
      const { type } = QueryActivitiesArgs.parse(args);
      let q = db
        .from("activities")
        .select("id, type, title, due_at, completed_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (type) q = q.eq("type", type);
      const { data, error } = await q;
      return JSON.stringify(error ? { error: error.message } : data);
    }
    case "crm_stats": {
      const [{ count: totalLeads }, { count: totalContacts }, { count: openDeals }, { count: wonDeals }, { count: lostDeals }, { data: openAmounts }] =
        await Promise.all([
          db.from("leads").select("*", { count: "exact", head: true }),
          db.from("contacts").select("*", { count: "exact", head: true }),
          db.from("deals").select("*", { count: "exact", head: true }).eq("status", "open"),
          db.from("deals").select("*", { count: "exact", head: true }).eq("status", "won"),
          db.from("deals").select("*", { count: "exact", head: true }).eq("status", "lost"),
          db.from("deals").select("amount_toman").eq("status", "open"),
        ]);
      const pipelineValueToman = (openAmounts ?? []).reduce(
        (sum, d) => sum + (d.amount_toman ?? 0),
        0,
      );
      return JSON.stringify({
        totalLeads,
        totalContacts,
        openDeals,
        wonDeals,
        lostDeals,
        pipelineValueToman,
      });
    }
    default:
      return JSON.stringify({ error: "unknown tool" });
  }
}
