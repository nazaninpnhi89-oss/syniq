import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";
import { ingestDocument } from "@/lib/chat/ingestion";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user } = guard;
  const { id } = await params;

  // Fire-and-forget: respond immediately, ingestion runs in background
  void ingestDocument(id).catch((err) =>
    console.error(`Ingestion failed for ${id}:`, err),
  );

  await logAudit(user.id, "document.ingest", id);
  return NextResponse.json({ queued: true });
}
