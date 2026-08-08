import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, KeyRound, Lock, Radio, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { CodeBlock, FieldTable, MethodBadge, type FieldRow } from "@/components/docs/CodeBlock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/docs")({
  head: () => ({ meta: [{ title: "Documentação da API — Hentech ERP" }] }),
  component: DocsPage,
});

const SECTIONS = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "autenticacao", label: "Autenticação" },
  { id: "criar-pedido", label: "POST /api/public/orders" },
  { id: "campos", label: "Referência de campos" },
  { id: "respostas", label: "Respostas e erros" },
  { id: "efeitos", label: "O que o ERP faz depois" },
  { id: "callbacks", label: "Callbacks" },
  { id: "checklist", label: "Checklist de integração" },
];

function DocsPage() {
  const [origin, setOrigin] = useState("https://seu-erp.exemplo");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const endpoint = `${origin}/api/public/orders`;

  return (
    <AppShell title="Documentação da API">
      <div className="flex gap-8">
        {/* índice lateral */}
        <nav className="hidden xl:block w-56 shrink-0">
          <div className="sticky top-20 space-y-1">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Nesta página
            </p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-10">
          <Section id="visao-geral" icon={BookOpen} title="Visão geral">
            <p className="text-sm text-muted-foreground">
              O ERP expõe <strong className="text-foreground">um único endpoint público</strong>,
              usado pelo site para registrar pedidos. Tudo o mais (financeiro, clientes, planos) é
              interno e exige login.
            </p>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <MethodBadge method="POST" />
                <code className="font-mono text-sm">{endpoint}</code>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Também responde <code className="font-mono">OPTIONS</code> para o preflight de CORS.
                A origem liberada é <code className="font-mono">*</code>, então dá para chamar
                direto do browser — mas isso expõe a chave, veja a seção de autenticação.
              </p>
            </div>

            <Callout tone="info" icon={Radio}>
              O fluxo é <strong>unidirecional</strong>: o site empurra o pedido, o ERP responde na
              hora e encerra. Não há callback de volta para o site hoje — detalhes na seção
              Callbacks.
            </Callout>
          </Section>

          <Section id="autenticacao" icon={KeyRound} title="Autenticação">
            <p className="text-sm text-muted-foreground">
              Toda requisição precisa do header <code className="font-mono">x-api-key</code>. A
              chave é gerada em <strong className="text-foreground">Clientes de API</strong> (menu
              lateral, só administradores) e aparece{" "}
              <strong className="text-foreground">uma única vez</strong> no momento da criação — o
              ERP guarda apenas o hash SHA-256.
            </p>

            <CodeBlock label="Header" code={`x-api-key: erp_live_a1b2c3d4e5f6...`} />

            <Callout tone="warning" icon={Lock}>
              Não coloque a chave no JavaScript do site. Qualquer pessoa abre o DevTools e copia. A
              chamada deve sair do <strong>servidor</strong> do uicard.com.br (route handler, API
              route, edge function), com a chave numa variável de ambiente.
            </Callout>

            <p className="text-sm text-muted-foreground">
              Chaves podem ser revogadas ou rotacionadas a qualquer momento na mesma tela. Uma chave
              revogada passa a receber <code className="font-mono">401</code> imediatamente. O ERP
              registra o <code className="font-mono">last_used_at</code> a cada chamada aceita, o
              que serve para descobrir chaves esquecidas.
            </p>
          </Section>

          <Section id="criar-pedido" icon={Radio} title="Criar pedido">
            <div className="flex flex-wrap items-center gap-2">
              <MethodBadge method="POST" />
              <code className="font-mono text-sm">/api/public/orders</code>
              <Badge variant="outline" className="text-[10px]">
                Content-Type: application/json
              </Badge>
            </div>

            <CodeBlock
              label="Corpo da requisição"
              code={`{
  "order": {
    "code": "UIC-7Z53O2",
    "created_at": "2026-08-07T14:32:10.000Z"
  },
  "customer": {
    "nome": "Maria Silva",
    "whatsapp": "11987654321",
    "email": "maria@empresa.com.br",
    "empresa": "Empresa LTDA",
    "cargo": "Diretora Comercial"
  },
  "plan": {
    "id": "enterprise",
    "name": "Enterprise (10 cartões)",
    "price": 1200.00
  },
  "additionals": {
    "quantity": 10,
    "unit_price": 60.00,
    "subtotal": 600.00,
    "discount_applied": true,
    "saving": 90.00
  },
  "summary": {
    "total": 1800.00,
    "currency": "BRL"
  },
  "notes": "Cliente pediu entrega até dia 20"
}`}
            />

            <CodeBlock
              label="Exemplo — Node / server-side"
              code={`const res = await fetch("${endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ERP_API_KEY,   // nunca no client
  },
  body: JSON.stringify(payload),
});

const data = await res.json();

if (res.status === 201) {
  // pedido criado — data.order = { id, code, status }
} else if (res.status === 409) {
  // code repetido: o pedido já existe, trate como sucesso
} else {
  // 400 = payload inválido · 401 = chave · 500 = erro do ERP
  console.error(res.status, data);
}`}
            />

            <CodeBlock
              label="Exemplo — curl"
              code={`curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $ERP_API_KEY" \\
  -d @pedido.json`}
            />
          </Section>

          <Section id="campos" icon={BookOpen} title="Referência de campos">
            <p className="text-sm text-muted-foreground">
              A validação é estrita: campo fora do formato derruba a requisição inteira com{" "}
              <code className="font-mono">400</code>. Strings vazias em campos opcionais são
              convertidas para <code className="font-mono">null</code>.
            </p>

            <FieldGroup title="order">
              <FieldTable rows={ORDER_FIELDS} />
            </FieldGroup>

            <FieldGroup title="customer">
              <FieldTable rows={CUSTOMER_FIELDS} />
            </FieldGroup>

            <FieldGroup title="plan">
              <FieldTable rows={PLAN_FIELDS} />
            </FieldGroup>

            <FieldGroup title="additionals — o objeto inteiro é opcional">
              <FieldTable rows={ADD_FIELDS} />
              <p className="mt-2 text-xs text-muted-foreground">
                Se omitido ou <code className="font-mono">null</code>, o ERP assume todos os valores
                zerados. Envie o objeto só quando houver cartões adicionais.
              </p>
            </FieldGroup>

            <FieldGroup title="summary">
              <FieldTable rows={SUMMARY_FIELDS} />
            </FieldGroup>

            <FieldGroup title="raiz">
              <FieldTable rows={ROOT_FIELDS} />
            </FieldGroup>

            <Callout tone="warning" icon={AlertTriangle}>
              <strong>O ERP não recalcula o total.</strong> O valor de{" "}
              <code className="font-mono">summary.total</code> é gravado como veio. Se o site errar
              a soma, o faturamento fica errado. Calcule no servidor, nunca a partir de valores
              vindos do browser.
            </Callout>

            <Callout tone="info" icon={ShieldCheck}>
              O <code className="font-mono">plan.id</code> é o que amarra o pedido ao catálogo de
              planos do ERP. Ele precisa bater com o campo <strong>código</strong> cadastrado em{" "}
              <a href="/planos" className="text-primary underline underline-offset-2">
                Planos
              </a>
              . Sem essa correspondência o ERP não sabe o custo de produção e a margem do pedido sai
              como 100%.
            </Callout>
          </Section>

          <Section id="respostas" icon={Radio} title="Respostas e erros">
            <ResponseCard status={201} tone="success" title="Pedido criado">
              <CodeBlock
                code={`{
  "ok": true,
  "order": {
    "id": "9f8e7d6c-...",
    "code": "UIC-7Z53O2",
    "status": "pendente"
  }
}`}
              />
            </ResponseCard>

            <ResponseCard status={409} tone="warning" title="Código duplicado">
              <CodeBlock code={`{ "error": "Duplicate order code", "code": "UIC-7Z53O2" }`} />
              <p className="mt-2 text-xs text-muted-foreground">
                <code className="font-mono">order.code</code> tem índice único. Isso é a{" "}
                <strong className="text-foreground">garantia de idempotência</strong>: pode reenviar
                o mesmo pedido à vontade que ele não duplica. Trate 409 como sucesso na sua lógica
                de retry.
              </p>
            </ResponseCard>

            <ResponseCard status={400} tone="destructive" title="Payload inválido">
              <CodeBlock
                code={`{
  "error": "Validation failed",
  "issues": [
    {
      "code": "invalid_string",
      "validation": "email",
      "path": ["customer", "email"],
      "message": "Invalid email"
    }
  ]
}`}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                O array <code className="font-mono">issues</code> vem direto do Zod. O{" "}
                <code className="font-mono">path</code> aponta o campo exato. JSON malformado
                retorna <code className="font-mono">{`{ "error": "Invalid JSON" }`}</code>, também
                com 400.
              </p>
            </ResponseCard>

            <ResponseCard status={401} tone="destructive" title="Não autorizado">
              <CodeBlock code={`{ "error": "Unauthorized" }`} />
              <p className="mt-2 text-xs text-muted-foreground">
                Header ausente, chave inexistente, inativa ou revogada. A resposta é idêntica nos
                quatro casos, de propósito.
              </p>
            </ResponseCard>

            <ResponseCard status={500} tone="destructive" title="Erro interno">
              <CodeBlock code={`{ "error": "<mensagem do banco>" }`} />
              <p className="mt-2 text-xs text-muted-foreground">
                Falha ao gravar. O pedido <strong className="text-foreground">não</strong> foi
                criado — pode reenviar.
              </p>
            </ResponseCard>
          </Section>

          <Section id="efeitos" icon={ShieldCheck} title="O que o ERP faz depois de aceitar">
            <ol className="space-y-2 text-sm text-muted-foreground">
              {[
                ["Grava o pedido", "com status de execução pendente (coluna Entrada no kanban)."],
                [
                  "Marca o pagamento como aguardando",
                  "— receber o pedido não significa ter recebido o dinheiro.",
                ],
                [
                  "Guarda o payload cru",
                  "em raw_payload, então nada do que você mandar se perde, mesmo campos que o ERP ainda não usa.",
                ],
                ["Notifica os sócios no Telegram", "com o primeiro nome do cliente e o valor."],
              ].map(([bold, rest], i) => (
                <li key={bold} className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span>
                    <strong className="text-foreground">{bold}</strong> {rest}
                  </span>
                </li>
              ))}
            </ol>

            <p className="text-sm text-muted-foreground">
              A partir daí o pedido é tocado dentro do ERP: kanban até <em>Concluído</em>, o que
              lança a venda no financeiro, e a baixa de pagamento é feita separadamente na tela do
              pedido ou em Contas a Receber.
            </p>
          </Section>

          <Section id="callbacks" icon={Radio} title="Callbacks">
            <Callout tone="warning" icon={AlertTriangle}>
              <strong>Não existem callbacks hoje.</strong> O ERP nunca chama de volta o site. As
              notificações que ele dispara são internas (Telegram para os sócios), não HTTP para
              terceiros.
            </Callout>

            <p className="text-sm text-muted-foreground">
              Na prática: depois do <code className="font-mono">201</code>, o site não fica sabendo
              se o pedido avançou no kanban, se foi pago ou se foi cancelado. Se você precisa dessa
              informação no site — por exemplo, uma página de acompanhamento para o cliente — hoje
              não há como obter.
            </p>

            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium">O que faltaria construir</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-foreground">Webhook de saída</strong> — uma tabela de
                    endpoints por cliente de API, um disparo em{" "}
                    <code className="font-mono">order.status_changed</code> e{" "}
                    <code className="font-mono">order.payment_confirmed</code>, com assinatura HMAC
                    e retentativa. É o caminho mais completo.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-foreground">Endpoint de consulta</strong> —{" "}
                    <code className="font-mono">GET /api/public/orders/:code</code> devolvendo
                    status e pagamento, para o site consultar sob demanda. Bem mais simples de fazer
                    e resolve a maioria dos casos.
                  </span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Nenhum dos dois está implementado. Se algum for útil, dá para construir — o de
                consulta é questão de poucas horas.
              </p>
            </div>
          </Section>

          <Section id="checklist" icon={ShieldCheck} title="Checklist de integração">
            <ul className="space-y-2.5 text-sm">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-muted-foreground">{c}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------- */

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: typeof BookOpen;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-sm text-primary">{title}</h3>
      {children}
    </div>
  );
}

function Callout({
  tone,
  icon: Icon,
  children,
}: {
  tone: "info" | "warning";
  icon: typeof BookOpen;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4 text-sm",
        tone === "warning" ? "border-warning/40 bg-warning/5" : "border-primary/30 bg-primary/5",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "warning" ? "text-warning" : "text-primary",
        )}
      />
      <div className="text-muted-foreground [&_strong]:text-foreground">{children}</div>
    </div>
  );
}

function ResponseCard({
  status,
  tone,
  title,
  children,
}: {
  status: number;
  tone: "success" | "warning" | "destructive";
  title: string;
  children: React.ReactNode;
}) {
  const style = {
    success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    destructive: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  }[tone];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("rounded border px-2 py-0.5 font-mono text-xs font-semibold", style)}>
          {status}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */

const ORDER_FIELDS: FieldRow[] = [
  {
    path: "order.code",
    type: "string",
    required: true,
    rule: "1–64 caracteres, único",
    desc: "Seu identificador do pedido. É a chave de idempotência.",
  },
  {
    path: "order.created_at",
    type: "string",
    required: true,
    rule: "ISO 8601 com timezone",
    desc: "Momento do pedido no site. Vira a competência da receita — não use a data do envio.",
  },
];

const CUSTOMER_FIELDS: FieldRow[] = [
  {
    path: "customer.nome",
    type: "string",
    required: true,
    rule: "1–200",
    desc: "Nome completo. O primeiro nome vai na notificação do Telegram.",
  },
  {
    path: "customer.whatsapp",
    type: "string",
    required: true,
    rule: "1–40",
    desc: "Só dígitos ou formatado, tanto faz. Sem DDI o ERP assume +55.",
  },
  {
    path: "customer.email",
    type: "string",
    required: true,
    rule: "e-mail válido, ≤200",
    desc: "Chave de deduplicação do cliente no CRM.",
  },
  {
    path: "customer.empresa",
    type: "string | null",
    required: false,
    rule: "—",
    desc: "Se preenchido, o cliente é criado como pessoa jurídica.",
  },
  {
    path: "customer.cargo",
    type: "string | null",
    required: false,
    rule: "—",
    desc: "Cargo do contato. Vai para as observações do cliente.",
  },
];

const PLAN_FIELDS: FieldRow[] = [
  {
    path: "plan.id",
    type: "string | number",
    required: true,
    rule: "convertido para string",
    desc: "Precisa bater com o código do plano cadastrado no ERP.",
  },
  {
    path: "plan.name",
    type: "string",
    required: true,
    rule: "1–200",
    desc: "Nome exibido. Usado como fallback se o código não casar.",
  },
  {
    path: "plan.price",
    type: "number",
    required: true,
    rule: "≥ 0",
    desc: "Preço do plano base, sem os adicionais.",
  },
];

const ADD_FIELDS: FieldRow[] = [
  {
    path: "additionals.quantity",
    type: "integer",
    required: true,
    rule: "≥ 0",
    desc: "Quantidade de cartões adicionais.",
  },
  {
    path: "additionals.unit_price",
    type: "number",
    required: true,
    rule: "≥ 0",
    desc: "Preço unitário do adicional.",
  },
  {
    path: "additionals.subtotal",
    type: "number",
    required: true,
    rule: "≥ 0",
    desc: "Subtotal dos adicionais, já com desconto.",
  },
  {
    path: "additionals.discount_applied",
    type: "boolean",
    required: true,
    rule: "—",
    desc: "Se houve desconto por volume.",
  },
  {
    path: "additionals.saving",
    type: "number",
    required: true,
    rule: "≥ 0",
    desc: "Quanto o cliente economizou.",
  },
];

const SUMMARY_FIELDS: FieldRow[] = [
  {
    path: "summary.total",
    type: "number",
    required: true,
    rule: "≥ 0",
    desc: "Valor final cobrado. Gravado como veio — o ERP não recalcula.",
  },
  {
    path: "summary.currency",
    type: "string",
    required: true,
    rule: "3–8 caracteres",
    desc: 'Código da moeda. Use "BRL".',
  },
];

const ROOT_FIELDS: FieldRow[] = [
  {
    path: "notes",
    type: "string | null",
    required: false,
    rule: "—",
    desc: "Observações livres do cliente. Aparecem no detalhe do pedido.",
  },
];

const CHECKLIST = [
  "Gerar a chave em Clientes de API e guardar como variável de ambiente no servidor do site.",
  "Fazer a chamada a partir do backend, nunca do browser — a chave não pode ir para o client.",
  "Cadastrar os planos em Planos com o mesmo código que o site envia em plan.id, incluindo o custo de produção.",
  "Calcular summary.total no servidor, a partir de preços que o browser não possa alterar.",
  "Enviar order.created_at com o horário real do pedido, em ISO com timezone.",
  "Tratar 409 como sucesso: significa que o pedido já tinha sido registrado.",
  "Implementar retry com backoff para 500 e falha de rede — o code garante que não duplica.",
  "Logar a resposta completa em caso de 400 e verificar o array issues para achar o campo errado.",
  "Testar com uma chave separada de desenvolvimento antes de apontar a produção.",
];
