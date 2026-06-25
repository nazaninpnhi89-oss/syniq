export type Locale = "fa" | "en";
export type Source = "telegram" | "web" | "widget";
export type Role = "user" | "assistant" | "tool";

export interface ChatMessage {
  id: number;
  session_id: string;
  role: Role;
  content: string | null;
  tool_calls: unknown | null;
  created_at: string;
}

export interface RagChunk {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

export interface LeadInput {
  name: string;
  phone?: string;
  email?: string;
  service_interest?: string;
  notes?: string;
}

export interface CustomerStatusResult {
  found: boolean;
  bookings: Array<{ status: string; start_at: string; service: string }>;
  registrations: Array<{ status: string; service_slug: string; created_at: string }>;
}
