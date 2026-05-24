# Sistema de Gestão Empresarial — Plano de Implementação

PRD é extenso. Vou construir uma **v1 funcional ponta-a-ponta** cobrindo os 3 módulos centrais (Dashboard, Centro Financeiro, Produtos) com o schema completo do PRD. Vendas e integrações ficam como tabelas + stubs (sem UI) para evolução futura, conforme o próprio PRD sugere.

## Stack (adaptada)
O projeto usa **TanStack Start + Vite + Tailwind + shadcn/ui** (não Next.js). Vou seguir essa stack — equivalente em capacidade, com server functions no lugar de API routes. Supabase (Lovable Cloud) idêntico ao PRD.

## Etapas

### 1. Lovable Cloud + Schema completo
- Ativar Lovable Cloud
- Migration única com: todos os enums, 9 tabelas (`product_categories`, `products`, `financial_categories`, `financial_entries`, `sales`, `sale_items`, `dashboard_alerts`, `integration_configs`, `audit_log`), views (`v_monthly_summary`, `v_product_metrics`), trigger `updated_at`, seed de categorias do sistema
- RLS habilitado em todas as tabelas (políticas permissivas no v1 single-tenant, prontas para auth)

### 2. Design system (cockpit financeiro dark)
- Tokens em `src/styles.css` conforme paleta do PRD (bg `#0a0a0f`, surface, accent indigo, success/danger/warning)
- Tipografia com `tabular-nums` para valores
- Formatters: `formatCurrency` (BRL), `formatPercent`, `formatDate`

### 3. Layout global
- Sidebar colapsável (240px ↔ 64px) + header
- Rotas: `/` (dashboard), `/financeiro`, `/produtos`

### 4. Server functions (camada de dados)
- `products.functions.ts`: list (filtros, paginação, busca), create, update, toggleStatus, softDelete, salesCheck, metrics
- `financial.functions.ts`: listEntries, createEntry (com geração de recorrências), updateEntry, deleteEntry, summary, cashFlow, expenseBreakdown
- `dashboard.functions.ts`: KPIs do período + comparativo, série de faturamento, série de fluxo de caixa, top despesas, alertas

### 5. Dashboard
- 6 KPI Cards com delta vs período anterior
- Gráfico de faturamento (linha/barra alternável, Recharts)
- Gráfico de fluxo de caixa (área empilhada)
- Donut de despesas por categoria (top 5)
- Painel de alertas (lidos via tabela `dashboard_alerts`, computados on-the-fly no v1)
- Seletor de período global (presets + custom)

### 6. Centro Financeiro
- Tabs: Faturamento · Despesas · Fluxo de Caixa · Investimentos · Análise de Lucro · Histórico
- Tabela com filtros combinados, agrupamento por dia/semana/mês, totalizadores
- Modal/sheet de criação de lançamento (validação Zod, recorrência mensal/trimestral/anual gera N entradas)
- Soft delete com toast "Desfazer"
- Análise de lucro: breakdown bruto/operacional/líquido + comparativo período anterior

### 7. Gestão de Produtos
- Tabela com busca, filtros (status, categoria, preço, margem), ordenação, paginação
- Form de criar/editar (margem calculada ao vivo)
- Toggle de status com modal de confirmação se houver vendas vinculadas
- Página de detalhe com métricas (via view `v_product_metrics`)
- Soft delete

### 8. Edge cases do PRD
- Validações no server (amount > 0, categoria compatível com tipo, produto ativo para vínculo)
- SKU único → 409
- Margem negativa permitida com destaque vermelho
- Empty states com ilustração contextual
- Loading via skeletons (Framer Motion shimmer)

## Fora do escopo desta v1
- UI de Vendas (tabelas existem, sem CRUD)
- UI de Integrações (tabela `integration_configs` existe, sem painel)
- Storage de comprovantes (campo `attachment_path` presente, upload futuro)
- Auth/RBAC (single-tenant, RLS permissiva)
- Export real (botão presente, retorna placeholder)

## Detalhes técnicos
- Server functions sem `requireSupabaseAuth` no v1 (sem auth ainda); migração para auth é trivial depois
- TanStack Query para cache/invalidação no client
- Recharts para gráficos com tooltips customizados
- Validação Zod compartilhada client/server

Vou implementar tudo em sequência, sem pausas para confirmação intermediária. Avise se prefere fatiar diferente (ex: só Dashboard + Produtos primeiro, ou incluir UI de Vendas já na v1).