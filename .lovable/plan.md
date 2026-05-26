## Módulo de Metas de Vendas e Faturamento

Vou adicionar um módulo completo de metas integrado ao ERP, com cadastro de metas, lançamento de vendas vinculadas, visualização no Dashboard e página dedicada de gestão.

### 1. Banco de dados (migração Supabase)

Criar duas tabelas novas (com RLS no padrão atual do projeto — `authenticated` full CRUD):

- **`sales_goals`**: `id`, `title`, `category`, `period_type` (enum `goal_period_type`: weekly/monthly/quarterly), `target_value`, `start_date`, `end_date`, `created_at`.
- **`sales_entries`**: `id`, `goal_id` (FK → `sales_goals.id` on delete cascade), `amount`, `sale_date`, `note`, `created_at`.

Índices em `goal_id` e `sale_date` para os agregados. Seed com 3 metas de exemplo (mensal, semanal, trimestral) e ~10 lançamentos distribuídos.

> Observação: as tabelas existentes `sales`/`sale_items` continuam sendo a fonte de venda do ERP. Conforme o brief, este módulo usa `sales_entries` próprio para lançamentos manuais contra metas, sem alterar o fluxo de vendas atual.

### 2. Camada de dados

`src/lib/data/goals.ts` com:
- `listGoals(periodFilter)` — metas + soma de entries + % atingido + status.
- `createGoal`, `updateGoal`, `deleteGoal`.
- `addSaleEntry(goalId, amount, date, note)`.
- `getGoalsMetrics(periodFilter)` — totais para os 4 KPIs.
- `getGoalVsRealSeries(periodFilter)` — série mensal meta vs real.
- `getProgressByCategory(periodFilter)` — barras horizontais por categoria.
- `getQuarterlyWeeklyAccum(periodFilter)` — acumulado semanal vs meta trimestral.

Helper de status: `>=100` verde, `>=70` amarelo, `<70` vermelho.

### 3. UI — Página `/metas` (rota `_authenticated/metas.tsx`)

- Header com botão **Nova Meta** (modal usando `FormModal` existente).
- Grid de cards (`GoalCard`): título, categoria, período formatado, barra de progresso colorida, real vs meta em BRL, badge de status, ações **Lançar venda**, **Editar**, **Excluir**.
- `GoalForm` (modal): nome, categoria, tipo de período (select), valor alvo (numérico BR), datas início/fim (shadcn Date Picker com `pointer-events-auto`).
- `SaleEntryForm` (modal a partir do card): valor, data, observação.

### 4. UI — Seção "Metas" no Dashboard (`_authenticated/index.tsx`)

Adicionar abaixo dos blocos atuais:
- Seletor próprio **Semanal / Mensal / Trimestral** (independente do período executivo já existente, conforme escopo do brief).
- 4 KPIs: Faturamento Real, Meta do Período, % Atingido, Status (badge colorido).
- `GoalVsRealChart` — Recharts `LineChart`, linha tracejada (meta) + linha sólida (real) por mês.
- `CategoryProgressChart` — Recharts `BarChart` horizontal (`layout="vertical"`), barra colorida por % + badge ao lado.
- `QuarterlyAccumChart` — Recharts `ComposedChart`: barras semanais + linha de acumulado vs linha de meta trimestral.

Todos com `ChartContainer` do shadcn e formatação BRL via `formatBRL` existente.

### 5. Navegação

Adicionar item **Metas** no `AppShell` (ícone `Target` do lucide-react), entre Clientes e Financeiro.

### 6. Seed de exemplo

Após aprovação da migração, inserir via tool de insert:
- 3 metas: "Meta Mensal Geral" (mensal, mês corrente), "Meta Semanal Serviços" (semanal, semana corrente), "Meta Trimestral Produtos" (trimestral, trimestre corrente).
- ~10 `sales_entries` distribuídos para gerar % variados (uma meta acima de 100%, uma entre 70–99%, uma abaixo de 70%) e popular os gráficos.

### Arquivos a criar/editar

**Criar**
- `supabase/migrations/<ts>_sales_goals.sql`
- `src/lib/data/goals.ts`
- `src/components/goals/GoalForm.tsx`
- `src/components/goals/SaleEntryForm.tsx`
- `src/components/goals/GoalCard.tsx`
- `src/components/dashboard/GoalsSection.tsx`
- `src/components/dashboard/GoalVsRealChart.tsx`
- `src/components/dashboard/CategoryProgressChart.tsx`
- `src/components/dashboard/QuarterlyAccumChart.tsx`
- `src/routes/_authenticated/metas.tsx`

**Editar**
- `src/components/layout/AppShell.tsx` (item de menu)
- `src/routes/_authenticated/index.tsx` (renderizar `GoalsSection`)
- `src/integrations/supabase/types.ts` (regenerado automaticamente pela migração)
