import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SegmentKey } from "@/lib/crm/segment-keys";

export interface SegmentRecipient {
  contactId: string | null;
  leadId: string | null;
  name: string;
  email: string;
  context: Record<string, unknown>;
}

const MAX_RECIPIENTS = 20;

export async function resolveSegment(
  db: SupabaseClient,
  key: SegmentKey,
): Promise<SegmentRecipient[]> {
  switch (key) {
    case "stale_leads": {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await db
        .from("leads")
        .select("id, name, email, notes, status, created_at")
        .in("status", ["new", "contacted"])
        .not("email", "is", null)
        .lt("created_at", sevenDaysAgo)
        .limit(MAX_RECIPIENTS);
      return (data ?? [])
        .filter((l) => !!l.email)
        .map((l) => ({
          contactId: null,
          leadId: l.id,
          name: l.name ?? "",
          email: l.email!,
          context: { challenge: l.notes, status: l.status },
        }));
    }
    case "lost_leads": {
      const { data } = await db
        .from("leads")
        .select("id, name, email, notes")
        .eq("status", "closed")
        .not("email", "is", null)
        .limit(MAX_RECIPIENTS);
      return (data ?? [])
        .filter((l) => !!l.email)
        .map((l) => ({
          contactId: null,
          leadId: l.id,
          name: l.name ?? "",
          email: l.email!,
          context: { challenge: l.notes },
        }));
    }
    case "lost_deals": {
      const { data } = await db
        .from("deals")
        .select("id, title, lost_reason, contact:contacts(id, full_name, email)")
        .eq("status", "lost")
        .limit(MAX_RECIPIENTS);
      return (data ?? [])
        .filter((d) => (d.contact as unknown as { email: string | null } | null)?.email)
        .map((d) => {
          const c = d.contact as unknown as { id: string; full_name: string; email: string };
          return {
            contactId: c.id,
            leadId: null,
            name: c.full_name,
            email: c.email,
            context: { dealTitle: d.title, lostReason: d.lost_reason },
          };
        });
    }
    case "won_customers": {
      const { data } = await db
        .from("deals")
        .select("id, title, contact:contacts(id, full_name, email)")
        .eq("status", "won")
        .limit(MAX_RECIPIENTS);
      return (data ?? [])
        .filter((d) => (d.contact as unknown as { email: string | null } | null)?.email)
        .map((d) => {
          const c = d.contact as unknown as { id: string; full_name: string; email: string };
          return {
            contactId: c.id,
            leadId: null,
            name: c.full_name,
            email: c.email,
            context: { dealTitle: d.title },
          };
        });
    }
  }
}
