import { supabase } from "@/integrations/supabase/client";

export type ApiClient = {
  id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `erp_live_${hex}`;
}

export async function listApiClients(): Promise<ApiClient[]> {
  const { data, error } = await supabase
    .from("api_clients" as any)
    .select("id, name, description, key_prefix, is_active, created_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ApiClient[];
}

export async function createApiClient(input: {
  name: string;
  description?: string | null;
}): Promise<{ client: ApiClient; plaintextKey: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const key = generateKey();
  const key_hash = await sha256Hex(key);
  const key_prefix = key.slice(0, 16);
  const { data, error } = await supabase
    .from("api_clients" as any)
    .insert({
      name: input.name,
      description: input.description ?? null,
      key_hash,
      key_prefix,
      is_active: true,
      created_by: auth.user?.id ?? null,
    })
    .select("id, name, description, key_prefix, is_active, created_at, last_used_at, revoked_at")
    .single();
  if (error) throw error;
  return { client: data as unknown as ApiClient, plaintextKey: key };
}

export async function setApiClientActive(id: string, is_active: boolean) {
  const patch: Record<string, unknown> = {
    is_active,
    revoked_at: is_active ? null : new Date().toISOString(),
  };
  const { error } = await supabase.from("api_clients" as any).update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteApiClient(id: string) {
  const { error } = await supabase.from("api_clients" as any).delete().eq("id", id);
  if (error) throw error;
}

export async function rotateApiClientKey(id: string): Promise<string> {
  const key = generateKey();
  const key_hash = await sha256Hex(key);
  const key_prefix = key.slice(0, 16);
  const { error } = await supabase
    .from("api_clients" as any)
    .update({ key_hash, key_prefix, is_active: true, revoked_at: null })
    .eq("id", id);
  if (error) throw error;
  return key;
}