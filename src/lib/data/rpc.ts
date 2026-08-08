import { supabase } from "@/integrations/supabase/client";

/**
 * Chamada tipada a uma funcao Postgres.
 *
 * As RPCs adicionadas em 20260807100200_aggregation_rpcs.sql ainda nao estao no
 * types.ts gerado pelo Supabase. Rode `supabase gen types` depois de aplicar as
 * migrations e o cast interno pode sair.
 */
type RpcCall = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const call = supabase.rpc as unknown as RpcCall;
  const { data, error } = await call(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}
