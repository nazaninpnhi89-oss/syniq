import { createAdminClient } from "@/lib/supabase/server";

export interface PromptVersion {
  id: string;
  content: string;
  persona: string | null;
}

let _cache: { value: PromptVersion | null; expires: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getActivePrompt(): Promise<PromptVersion | null> {
  if (_cache && Date.now() < _cache.expires) return _cache.value;

  const db = createAdminClient();
  const { data } = await db
    .from("prompt_versions")
    .select("id, content, persona")
    .eq("is_active", true)
    .maybeSingle();

  const value = data
    ? { id: data.id, content: data.content, persona: data.persona ?? null }
    : null;

  _cache = { value, expires: Date.now() + CACHE_TTL_MS };
  return value;
}

export function invalidatePromptCache(): void {
  _cache = null;
}
