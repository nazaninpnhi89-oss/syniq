import type { SupabaseClient } from "@supabase/supabase-js";

/** Escapes Postgres LIKE/ILIKE wildcards so user input can't inject pattern matches. */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}

/** Finds a company by case-insensitive exact name match, or creates one. */
export async function findOrCreateCompany(
  db: SupabaseClient,
  name: string,
  userId: string,
): Promise<string> {
  const trimmed = name.trim();

  const { data: existing } = await db
    .from("companies")
    .select("id")
    .ilike("name", escapeLike(trimmed))
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await db
    .from("companies")
    .insert({ name: trimmed, created_by: userId })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}
