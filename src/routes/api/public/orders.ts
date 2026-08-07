import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const nullableStr = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.string().nullable(),
);

const payloadSchema = z.object({
  order: z.object({
    code: z.string().min(1).max(64),
    created_at: z.string().datetime(),
  }),
  customer: z.object({
    nome: z.string().min(1).max(200),
    whatsapp: z.string().min(1).max(40),
    email: z.string().email().max(200),
    empresa: nullableStr.optional(),
    cargo: nullableStr.optional(),
  }),
  plan: z.object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    name: z.string().min(1).max(200),
    price: z.number().nonnegative(),
  }),
  additionals: z
    .object({
      quantity: z.number().int().nonnegative(),
      unit_price: z.number().nonnegative(),
      subtotal: z.number().nonnegative(),
      discount_applied: z.boolean(),
      saving: z.number().nonnegative(),
    })
    .nullable()
    .optional()
    .transform((v) => v ?? { quantity: 0, unit_price: 0, subtotal: 0, discount_applied: false, saving: 0 }),
  summary: z.object({
    total: z.number().nonnegative(),
    currency: z.string().min(3).max(8),
  }),
  notes: nullableStr.optional(),
});

export const Route = createFileRoute("/api/public/orders")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const provided = request.headers.get("x-api-key") ?? "";
        if (!provided) return json({ error: "Unauthorized" }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const providedHash = await sha256Hex(provided);
        const legacyKey = process.env.ORDERS_API_KEY;
        let clientId: string | null = null;
        const { data: apiClient } = await supabaseAdmin
          .from("api_clients")
          .select("id, is_active, revoked_at")
          .eq("key_hash", providedHash)
          .maybeSingle();
        if (apiClient && apiClient.is_active && !apiClient.revoked_at) {
          clientId = apiClient.id;
          await supabaseAdmin
            .from("api_clients")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", apiClient.id);
        } else if (!legacyKey || provided !== legacyKey) {
          return json({ error: "Unauthorized" }, 401);
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const parsed = payloadSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "Validation failed", issues: parsed.error.issues }, 400);
        }
        const p = parsed.data;
        const { data, error } = await supabaseAdmin
          .from("orders")
          .insert({
            code: p.order.code,
            order_created_at: p.order.created_at,
            customer_name: p.customer.nome,
            customer_whatsapp: p.customer.whatsapp,
            customer_email: p.customer.email,
            customer_company: p.customer.empresa ?? null,
            customer_role: p.customer.cargo ?? null,
            plan_id: p.plan.id,
            plan_name: p.plan.name,
            plan_price: p.plan.price,
            add_quantity: p.additionals.quantity,
            add_unit_price: p.additionals.unit_price,
            add_subtotal: p.additionals.subtotal,
            add_discount_applied: p.additionals.discount_applied,
            add_saving: p.additionals.saving,
            total: p.summary.total,
            currency: p.summary.currency,
            notes: p.notes ?? null,
            status: "pendente",
            raw_payload: p as never,
          })
          .select("id, code, status")
          .single();
        if (error) {
          if (error.code === "23505") {
            return json({ error: "Duplicate order code", code: p.order.code }, 409);
          }
          return json({ error: error.message }, 500);
        }
        try {
          const { notifyTelegram } = await import("@/lib/telegram.server");
          const firstName = p.customer.nome.split(" ")[0] ?? "";

          await notifyTelegram("new_order", p.summary.total, firstName);
        } catch (e) {
          console.error("Telegram notification failed:", (e as Error).message);
        }
        return json({ ok: true, order: data }, 201);
      },
    },
  },
});