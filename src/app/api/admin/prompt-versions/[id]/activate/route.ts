import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAudit } from "@/lib/admin/audit";
import { invalidatePromptCache } from "@/lib/chat/prompt-manager";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { user, db } = guard;
  const { id } = await params;

  // Deactivate all, then activate the target
  const { error: deactivateErr } = await db
    .from("prompt_versions")
    .update({ is_active: false })
    .neq("id", id);

  if (deactivateErr) return NextResponse.json({ error: deactivateErr.message }, { status: 500 });

  const { error: activateErr } = await db
    .from("prompt_versions")
    .update({ is_active: true })
    .eq("id", id);

  if (activateErr) return NextResponse.json({ error: activateErr.message }, { status: 500 });

  invalidatePromptCache();
  await logAudit(user.id, "prompt.activate", id);
  return NextResponse.json({ ok: true });
}
