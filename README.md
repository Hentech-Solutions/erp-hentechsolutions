# ERP - Hentech Solutions

PRD Técnico — Sistema de Gestão Empresarial

Versão: 1.0
Stack: Next.js · TailwindCSS · shadcn/ui · Framer Motion · Supabase (PostgreSQL)
Tenant model: Single-tenant (fase inicial)

1. Objetivo do Produto

Centralizar o controle financeiro, operacional e comercial de uma empresa em uma única aplicação, permitindo visibilidade completa do estado do negócio em tempo real.

O sistema consolida: faturamento, lucro, fluxo de caixa, entradas de capital, investimentos, despesas, volume de vendas, catálogo de produtos e métricas financeiras derivadas.

Prioridades de implementação:

Clareza e confiabilidade dos dados financeiros

Velocidade de leitura de indicadores (dashboard como cockpit)

Estrutura extensível para integrações futuras sem reescrita

2. Arquitetura Funcional

┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Dashboard   │  │ Centro Financ.  │  │  Gestão Prod.  │  │
│  └──────┬───────┘  └────────┬────────┘  └───────┬────────┘  │
│         └─────────────────┬─┴──────────────────-┘           │
│                    ┌──────┴──────┐                           │
│                    │  API Layer  │  (Next.js API Routes)     │
│                    └──────┬──────┘                           │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌────────────────┐  ┌────┴────────────┐  ┌─────────────┐  │
│  │   PostgreSQL   │  │  Supabase Auth  │  │   Storage   │  │
│  │   (core DB)    │  │  (futuro RBAC)  │  │  (exports)  │  │
│  └────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│            Camada de Integração Futura (stub)                │
│  [ Gateways Pagamento ] [ ERPs ] [ APIs Bancárias ]          │
│  [ Plataformas de Venda ] [ Sistemas Contábeis ]             │
└─────────────────────────────────────────────────────────────┘

Padrão de comunicação: Supabase JS Client (frontend → Supabase direto para reads simples) + Next.js API Routes (lógica de negócio, validações, transformações).

3. Módulos do Sistema

MóduloRotaFunção PrincipalDashboard / Home/Visão executiva consolidadaCentro Financeiro/financeiroAnálise e gestão financeira completaGestão de Produtos/produtosCRUD e métricas do catálogo(futuro) Vendas/vendasRegistro e análise de transações(futuro) Relatórios/relatoriosExportações e relatórios avançados

4. Funcionalidades Detalhadas

4.1 Dashboard / Home

4.1.1 KPI Cards (topo)

Faturamento do mês atual vs. mês anterior (delta percentual)

Lucro líquido do período selecionado

Capital disponível (caixa atual)

Total de vendas (contagem de transações)

Ticket médio (faturamento / nº vendas)

Margem média ponderada dos produtos ativos

4.1.2 Gráfico de Faturamento

Série temporal: últimos 12 meses (padrão) ou período customizado

Comparativo com período anterior (linha sobreposta)

Tipo: linha ou barra (alternável)

4.1.3 Gráfico de Fluxo de Caixa

Entradas vs. saídas por período

Saldo acumulado

Tipo: área empilhada

4.1.4 Painel de Alertas

Produto ativo sem vendas nos últimos 30 dias

Fluxo de caixa negativo projetado

Despesa de categoria com crescimento > 20% mês a mês

Margem de produto abaixo do threshold configurável

4.1.5 Distribuição de Despesas

Gráfico donut: despesas por categoria

Top 5 categorias com maior gasto no período

4.2 Centro Financeiro

4.2.1 Faturamento

Listagem de todas as entradas de receita

Filtros: período, categoria, origem (manual / integração futura)

Agrupamento: por dia / semana / mês / trimestre / ano

Totalizadores por agrupamento

Drill-down: clique em período expande transações

4.2.2 Despesas

CRUD completo de lançamentos de despesa

Campos: valor, data, categoria, descrição, recorrente (bool), comprovante (path futuro)

Filtros: período, categoria, recorrente/avulso

Agrupamento por categoria

Projeção de despesas recorrentes para o próximo período

4.2.3 Fluxo de Caixa

Visão consolidada: entradas − saídas = saldo

Saldo por período com acumulado

Separação: operacional / investimento / capital

Filtro por tipo de lançamento

4.2.4 Investimentos

Registro de aportes de capital e investimentos realizados

Campos: valor, data, tipo (aporte / investimento / retirada), descrição

Retorno realizado (quando aplicável, campo livre)

4.2.5 Análise de Lucro

Cálculo: Receita − Custo dos Produtos − Despesas Operacionais

Breakdown: lucro bruto, lucro operacional, lucro líquido

Margem em % para cada nível

Comparativo entre períodos

4.2.6 Histórico Financeiro

Timeline de todos os lançamentos (receitas + despesas + investimentos)

Filtros combinados

Ordenação por data, valor, categoria

Exportação: preparada (campo exported_at, endpoint stub)

4.3 Gestão de Produtos

4.3.1 Listagem

Tabela com: nome, categoria, preço, custo, margem calculada, status, data de criação

Busca full-text por nome e descrição

Filtros: status (ativo/inativo), categoria, faixa de preço, faixa de margem

Ordenação por qualquer coluna

Paginação (50 itens por página, configurável)

4.3.2 CRUD

Create: formulário com todos os campos obrigatórios e opcionais

Read: página de detalhe com histórico de alterações e métricas

Update: edição inline na tabela (nome, preço, status) + formulário completo

Delete: soft delete (campo deleted_at), não remove do banco

4.3.3 Toggle Ativo/Inativo

Ação rápida diretamente na listagem

Confirmação modal para inativação quando produto tem vendas vinculadas

Produto inativo: não aparece em seleção de novos lançamentos, mas mantém histórico

4.3.4 Métricas por Produto

Total de unidades vendidas

Receita gerada

Custo total realizado

Lucro por produto

Período de maior venda

5. Modelo de Dados

5.1 Enums

sql

CREATE TYPE financial_entry_type AS ENUM (
  'revenue',        -- receita de venda
  'expense',        -- despesa operacional
  'investment',     -- aporte/investimento
  'withdrawal',     -- retirada
  'capital_in'      -- entrada de capital externo
);

CREATE TYPE cash_flow_category AS ENUM (
  'operational',
  'investment',
  'financing'
);

CREATE TYPE product_status AS ENUM (
  'active',
  'inactive'
);

CREATE TYPE expense_recurrence AS ENUM (
  'one_time',
  'monthly',
  'quarterly',
  'annual'
);

CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

CREATE TYPE integration_type AS ENUM (
  'payment_gateway',
  'erp',
  'bank_api',
  'sales_platform',
  'accounting'
);

5.2 Tabelas

product_categories

sql

CREATE TABLE product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

products

sql

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  category_id   UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  price         NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
  cost          NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  margin        NUMERIC(8, 4) GENERATED ALWAYS AS (
                  CASE WHEN price = 0 THEN 0
                  ELSE ROUND(((price - cost) / price) * 100, 4)
                  END
                ) STORED,
  status        product_status NOT NULL DEFAULT 'active',
  sku           TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ  -- soft delete
);

CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('portuguese', name));

financial_categories

sql

CREATE TABLE financial_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  type        financial_entry_type NOT NULL,
  color       TEXT,                    -- hex para visualização
  is_system   BOOLEAN NOT NULL DEFAULT false,  -- categorias padrão não deletáveis
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

financial_entries

sql

CREATE TABLE financial_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            financial_entry_type NOT NULL,
  cash_flow_cat   cash_flow_category NOT NULL DEFAULT 'operational',
  category_id     UUID REFERENCES financial_categories(id) ON DELETE RESTRICT,
  amount          NUMERIC(15, 2) NOT NULL,    -- sempre positivo; tipo define direção
  description     TEXT,
  reference_date  DATE NOT NULL,              -- data de competência
  payment_date    DATE,                       -- data de liquidação
  is_settled      BOOLEAN NOT NULL DEFAULT false,
  recurrence      expense_recurrence NOT NULL DEFAULT 'one_time',
  recurrence_group_id UUID,                   -- agrupa entradas de mesma recorrência
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,  -- vínculo com produto (para receitas)
  sale_id         UUID,                       -- FK futura para tabela de vendas
  external_ref    TEXT,                       -- referência de integração futura
  notes           TEXT,
  attachment_path TEXT,                       -- path Storage Supabase (futuro)
  exported_at     TIMESTAMPTZ,               -- controle de exportação futura
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fe_type ON financial_entries(type);
CREATE INDEX idx_fe_ref_date ON financial_entries(reference_date);
CREATE INDEX idx_fe_category ON financial_entries(category_id);
CREATE INDEX idx_fe_product ON financial_entries(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_fe_settled ON financial_entries(is_settled, payment_date);
CREATE INDEX idx_fe_recurrence_group ON financial_entries(recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;

sales

sql

-- Tabela preparada para módulo de vendas futuro
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date       DATE NOT NULL,
  total_amount    NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
  total_cost      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  discount        NUMERIC(15, 2) NOT NULL DEFAULT 0,
  notes           TEXT,
  external_ref    TEXT,           -- referência de plataforma externa futura
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_date ON sales(sale_date);

sale_items

sql

CREATE TABLE sale_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  product_snapshot JSONB NOT NULL,  -- snapshot do produto no momento da venda
  quantity    NUMERIC(10, 3) NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
  unit_cost   NUMERIC(15, 2) NOT NULL DEFAULT 0,
  discount    NUMERIC(15, 2) NOT NULL DEFAULT 0,
  subtotal    NUMERIC(15, 2) GENERATED ALWAYS AS (
                (unit_price * quantity) - discount
              ) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

dashboard_alerts

sql

CREATE TABLE dashboard_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity    alert_severity NOT NULL DEFAULT 'info',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  entity_type TEXT,               -- 'product', 'financial_entry', etc.
  entity_id   UUID,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_unread ON dashboard_alerts(is_read, created_at) WHERE NOT is_read;

integration_configs

sql

-- Tabela stub para integrações futuras
CREATE TABLE integration_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            integration_type NOT NULL,
  name            TEXT NOT NULL,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  config          JSONB NOT NULL DEFAULT '{}',  -- credenciais criptografadas no futuro
  last_sync_at    TIMESTAMPTZ,
  sync_status     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, name)
);

audit_log

sql

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_changed_at ON audit_log(changed_at);

5.3 Views e Funções

sql

-- View: métricas mensais consolidadas
CREATE VIEW v_monthly_summary AS
SELECT
  DATE_TRUNC('month', reference_date) AS month,
  SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END)     AS revenue,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)     AS expenses,
  SUM(CASE WHEN type IN ('investment', 'capital_in') THEN amount ELSE 0 END) AS capital_in,
  SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END)  AS withdrawals,
  SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) -
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)     AS gross_profit,
  COUNT(*) FILTER (WHERE type = 'revenue')                   AS revenue_count
FROM financial_entries
GROUP BY 1
ORDER BY 1;

-- View: produtos com métricas agregadas
CREATE VIEW v_product_metrics AS
SELECT
  p.id,
  p.name,
  p.status,
  p.price,
  p.cost,
  p.margin,
  COALESCE(SUM(si.quantity), 0)                    AS units_sold,
  COALESCE(SUM(si.subtotal), 0)                    AS total_revenue,
  COALESCE(SUM(si.unit_cost * si.quantity), 0)     AS total_cost,
  COALESCE(SUM(si.subtotal) - SUM(si.unit_cost * si.quantity), 0) AS total_profit,
  MAX(s.sale_date)                                 AS last_sale_date
FROM products p
LEFT JOIN sale_items si ON si.product_id = p.id
LEFT JOIN sales s ON s.id = si.sale_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.status, p.price, p.cost, p.margin;

6. Inputs e Outputs por Funcionalidade

Dashboard

FuncionalidadeInputOutputKPI Cardsperiod (padrão: mês atual)Valores agregados + delta vs. período anteriorGráfico Faturamentoperiod, granularity (day/month)Array {date, amount}[]Gráfico Fluxo de CaixaperiodArray {date, in, out, balance}[]Alertas— (gerados automaticamente)Array de alertas com severity e messageDonut DespesasperiodArray {category, amount, percentage}[]

Centro Financeiro

FuncionalidadeInputOutputListar Entradastype, category_id[], date_from, date_to, page, page_size{data: Entry[], total, page}Criar Entrada{type, amount, category_id, reference_date, ...}Entry criadoAtualizar Entradaid + campos mutáveisEntry atualizadoDeletar Entradaid{success: true}Resumo Financeirodate_from, date_to{revenue, expenses, profit, margin, cash_balance}Projeção Recorrentesmonths_ahead (1–12)Array de entradas projetadas

Gestão de Produtos

FuncionalidadeInputOutputListar Produtosstatus, category_id, search, sort_by, sort_dir, page{data: Product[], total, page}Criar Produto{name, price, cost, category_id, description, sku?, status}Product criadoAtualizar Produtoid + campos mutáveisProduct atualizadoToggle Statusid, new_statusProduct com status atualizadoSoft Deleteid{success: true}Métricas do Produtoid, date_from?, date_to?ProductMetrics

7. Fluxos Principais

7.1 Criação de Lançamento Financeiro

1. Usuário acessa "Centro Financeiro" → aba correspondente (Receita/Despesa/etc.)
2. Clica em "Novo Lançamento"
3. Preenche formulário:
   - Tipo (pre-selecionado pela aba)
   - Valor (numérico, obrigatório)
   - Data de competência (obrigatório)
   - Categoria (obrigatório; lista filtrada por tipo)
   - Descrição (opcional)
   - Recorrência (padrão: one_time)
   - Data de pagamento (opcional)
4. Submit → validação client-side
5. POST /api/financial-entries
6. Servidor valida:
   - amount > 0
   - category.type === entry.type
   - reference_date <= hoje + 365 dias
7. Insere em financial_entries
8. Se recorrente: gera entradas futuras via recurrence_group_id
9. Invalida cache do dashboard
10. Frontend atualiza listagem e KPIs

7.2 Cadastro de Produto

1. Usuário acessa "Gestão de Produtos"
2. Clica em "Novo Produto"
3. Preenche formulário
4. Campo margin é calculado automaticamente no frontend: (price - cost) / price * 100
5. Submit → POST /api/products
6. Servidor valida unicidade do SKU (se fornecido)
7. Insere em products
8. Produto aparece na listagem com status 'active'

7.3 Inativação de Produto com Vendas Vinculadas

1. Usuário clica em toggle de status de produto ativo
2. Frontend consulta: GET /api/products/:id/sales-check
3. API retorna: { has_sales: true, sales_count: 42 }
4. Frontend exibe modal de confirmação:
   "Este produto possui 42 vendas registradas. 
    Inativar não remove o histórico, mas impede novos lançamentos."
5. Usuário confirma
6. PATCH /api/products/:id { status: 'inactive' }
7. Produto inativado; histórico mantido integralmente

8. Fluxos Alternativos

8.1 Lançamento com Recorrência Mensal

1. Usuário cria lançamento com recurrence = 'monthly', recurrence_group_id gerado
2. Sistema gera N entradas futuras (configurável: padrão 12 meses)
3. Cada entrada futura tem is_settled = false
4. Na listagem, entradas do grupo são colapsáveis
5. Usuário pode editar/cancelar entradas individuais ou todo o grupo
6. Cancelar grupo: soft delete de todas as entradas futuras (is_settled = false)

8.2 Exportação Futura (Stub)

1. Usuário clica em "Exportar" (botão presente, funcionalidade stub)
2. Frontend exibe: "Exportação em breve disponível"
3. Backend registra exported_at = now() no registro (para auditoria futura)
4. Endpoint /api/financial-entries/export retorna 501 Not Implemented com payload estruturado

8.3 Busca de Produto sem Resultados

1. Usuário pesquisa termo que não corresponde a nenhum produto
2. Listagem exibe empty state com ilustração e texto contextual
3. Sugestão: "Criar produto com este nome" → pré-preenche formulário com o termo buscado

9. Edge Cases

CenárioTratamentoPeríodo sem dados financeirosExibir empty state nos gráficos; KPIs mostram R$ 0,00 com badge "Sem dados"Valor negativo em lançamentoBloqueado na validação (amount > 0 obrigatório); o tipo define se é saídaProduto com custo > preçoPermitido, mas margin exibirá valor negativo com destaque visual vermelhoDuplicidade de lançamentoSem prevenção automática (usuário pode ter lançamentos idênticos legítimos); alertar visualmente se mesmo valor + mesma data + mesma categoriaProduto inativo com venda futuraAPI recusa vinculação de produto inativo a novos lançamentos; retorna 422 com mensagemInconsistência lucro vs. receitaLucro calculado sempre como: revenue − expenses (do período); nunca armazenado diretamenteFluxo de caixa negativoExibido em vermelho; gera alerta automático em dashboard_alertsRecorrência com data passadaEntradas com reference_date < hoje e is_settled = false geram alerta de "pagamento pendente"Categoria excluída com lançamentosON DELETE RESTRICT impede exclusão; exibir erro com contagem de lançamentos vinculadosSKU duplicadoAPI retorna 409 Conflict com campo e valor conflitanteProduto deletado com vendassale_items.product_id SET NULL; product_snapshot em JSONB preserva dados históricosPeríodo muito longo no dashboardLimitar a 3 anos no frontend; granularidade forçada para mensal acima de 12 mesesamount = 0Bloqueado; lançamentos de R$ 0,00 não fazem sentido operacional

10. Regras de Negócio

Produtos

margin é sempre calculada (campo gerado), nunca inserida diretamente

Produto deleted_at IS NOT NULL não aparece em nenhuma listagem ou seleção

Produto status = 'inactive' mantém histórico mas não aceita novos lançamentos

SKU é opcional, mas único quando fornecido

Preço e custo devem ser ≥ 0; custo pode exceder preço (margem negativa permitida)

Lançamentos Financeiros

amount sempre positivo; o tipo determina se é entrada (+) ou saída (−) para o caixa

Tipos que diminuem o caixa: expense, withdrawal

Tipos que aumentam o caixa: revenue, investment, capital_in

reference_date = data de competência; payment_date = liquidação (pode ser futura)

is_settled = false + payment_date < hoje = lançamento em atraso

Categoria deve ser compatível com o tipo do lançamento (financial_categories.type)

Lançamentos vinculados a produto (product_id) só aceitam produto com status = 'active'

Cálculos Financeiros

Faturamento: SUM(amount) WHERE type = 'revenue' AND período

Despesas: SUM(amount) WHERE type = 'expense' AND período

Lucro Bruto: Faturamento − SUM(custo dos itens vendidos via sale_items)

Lucro Operacional: Lucro Bruto − Despesas Operacionais

Fluxo de Caixa: Σ entradas − Σ saídas por período

Ticket Médio: Faturamento / COUNT(sales) no período

Alertas

Gerados por job/trigger (implementar como função Supabase ou cron do Next.js)

Alertas expiram após expires_at ou após leitura (is_read = true)

Limite: 50 alertas não lidos simultâneos (descartar os mais antigos se ultrapassar)

11. Estrutura Sugerida do Banco (Supabase/Postgres)

Migrations — Ordem de Execução

001_create_enums.sql
002_create_product_categories.sql
003_create_products.sql
004_create_financial_categories.sql
005_create_financial_entries.sql
006_create_sales.sql
007_create_sale_items.sql
008_create_dashboard_alerts.sql
009_create_integration_configs.sql
010_create_audit_log.sql
011_create_views.sql
012_seed_financial_categories.sql    -- categorias padrão do sistema
013_create_triggers.sql              -- updated_at automático

Trigger updated_at (aplicar em todas as tabelas mutáveis)

sql

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em: products, financial_entries, sales, integration_configs
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

Seed de Categorias Financeiras do Sistema

sql

INSERT INTO financial_categories (name, type, color, is_system) VALUES
  ('Venda de Produto', 'revenue', '#22c55e', true),
  ('Serviço Prestado', 'revenue', '#16a34a', true),
  ('Outras Receitas', 'revenue', '#86efac', true),
  ('Custo Operacional', 'expense', '#ef4444', true),
  ('Folha de Pagamento', 'expense', '#dc2626', true),
  ('Marketing', 'expense', '#f97316', true),
  ('Infraestrutura', 'expense', '#fb923c', true),
  ('Outras Despesas', 'expense', '#fca5a5', true),
  ('Aporte Sócio', 'capital_in', '#3b82f6', true),
  ('Financiamento', 'capital_in', '#60a5fa', true),
  ('Investimento Ativo', 'investment', '#8b5cf6', true),
  ('Retirada Sócio', 'withdrawal', '#6b7280', true);

12. Estrutura Futura para Integrações Externas

Padrão Recomendado: Adapter Pattern

Cada integração implementa a interface IntegrationAdapter:

typescript

interface IntegrationAdapter {
  type: IntegrationType
  connect(config: Record<string, unknown>): Promise<void>
  syncOrders(dateFrom: Date, dateTo: Date): Promise<SaleImport[]>
  syncProducts(): Promise<ProductImport[]>
  syncFinancialEntries(): Promise<FinancialEntryImport[]>
  getStatus(): Promise<{ connected: boolean; lastSync: Date | null }>
}

Tabelas de Staging (criar quando integração for ativa)

sql

-- Dados brutos de integrações antes de normalização
CREATE TABLE integration_raw_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  UUID NOT NULL REFERENCES integration_configs(id),
  event_type      TEXT NOT NULL,
  raw_payload     JSONB NOT NULL,
  processed       BOOLEAN NOT NULL DEFAULT false,
  processed_at    TIMESTAMPTZ,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

Integrações Mapeadas

IntegraçãoCampos external_refDados esperadosGateway de Pagamento{gateway}:{transaction_id}Transações, status, estornosPlataforma de Venda{platform}:{order_id}Pedidos, itens, clientesAPI Bancária (OFX/Open Finance){bank}:{statement_id}Extratos, conciliaçãoERP{erp}:{document_id}NF-e, pedidos, estoqueSistema Contábil{system}:{entry_id}Plano de contas, lançamentos

13. Requisitos de UI/UX para Implementação

13.1 Layout Global

┌─────────────────────────────────────────────────────┐
│  Sidebar (240px fixo, colapsável para 64px)         │
│  ┌───────────┬──────────────────────────────────┐   │
│  │           │  Header (56px): título + ações   │   │
│  │  Nav      ├──────────────────────────────────┤   │
│  │  Links    │  Content Area (scroll vertical)  │   │
│  │           │                                  │   │
│  │           │                                  │   │
│  └───────────┴──────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

13.2 Sistema de Design

Cores (CSS Variables):

css

--color-bg:           #0a0a0f;   /* fundo principal */
--color-surface:      #111118;   /* cards, painéis */
--color-surface-2:    #1a1a24;   /* inputs, hover states */
--color-border:       #1f1f2e;   /* divisores sutis */
--color-text:         #e8e8f0;   /* texto primário */
--color-text-muted:   #6b6b80;   /* labels, hints */
--color-accent:       #6366f1;   /* ação primária */
--color-success:      #22c55e;   /* valores positivos */
--color-danger:       #ef4444;   /* valores negativos, alertas */
--color-warning:      #f59e0b;   /* alertas médios */

Tipografia:

Display/Numbers: Tabular nums + font-feature-settings: "tnum" (obrigatório para alinhamento de valores)

UI Labels: text-xs tracking-wider uppercase para seções

Valores Financeiros: tamanho proporcional à hierarquia (2xl para KPIs primários, lg para secundários)

13.3 Componentes Críticos

KPI Card:

┌──────────────────────────┐
│ FATURAMENTO MÊS          │
│ R$ 127.430,00            │  ← text-2xl font-bold
│ ▲ +12.4% vs mês ant.    │  ← text-sm text-success
└──────────────────────────┘

Tabela Financeira:

Colunas de valor: text-right tabular-nums

Linhas zebradas: alternância sutil de background

Hover state: highlight de linha completa

Valores negativos: cor --color-danger

Ordenação: ícone de seta no header clicável

Filtros:

Seletor de período: DateRangePicker com presets (Hoje, 7d, 30d, 90d, Ano, Custom)

Filtros combinados mostram badge contador: "3 filtros ativos"

Botão "Limpar filtros" visível quando algum filtro está ativo

13.4 Estados de Loading (Framer Motion)

typescript

// Skeleton para KPI Cards
const CardSkeleton = () => (
  <motion.div
    animate={{ opacity: [0.4, 0.7, 0.4] }}
    transition={{ duration: 1.5, repeat: Infinity }}
    className="h-24 rounded-lg bg-surface-2"
  />
)

// Stagger para lista de cards
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

13.5 Feedback de Ações

AçãoFeedbackCriar lançamentoToast success + linha animada aparece no topo da tabelaDeletar registroToast com "Desfazer" (5s) + animação de fade-out da linhaToggle status produtoSwitch animado + badge de status atualiza inlineErro de validaçãoShake animation no campo + mensagem inline (não toast)Loading de páginaSkeleton screens, nunca spinner global

13.6 Responsividade

Target primário: desktop (1280px+)

Suporte secundário: tablet (768px+) — sidebar colapsada automaticamente

Mobile: fora do escopo da fase inicial; estrutura CSS não deve quebrar abaixo de 768px

13.7 Gráficos (Recharts recomendado)

Todos os gráficos com tooltip customizado (fundo --color-surface, borda --color-border)

Cores de série: usar paleta de 6 cores baseada em --color-accent com variações de luminosidade

Animação de entrada: isAnimationActive={true} com animationDuration={600}

Eixo Y: sempre formatar como moeda brasileira (Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}))

Responsive container obrigatório em todos os gráficos

14. Estrutura de Pastas Sugerida (Next.js)

src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx                    # Dashboard
│   │   ├── financeiro/
│   │   │   └── page.tsx
│   │   └── produtos/
│   │       └── page.tsx
│   └── api/
│       ├── financial-entries/
│       │   ├── route.ts                # GET list, POST create
│       │   └── [id]/
│       │       └── route.ts            # GET, PATCH, DELETE
│       ├── products/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── sales-check/route.ts
│       └── dashboard/
│           └── summary/route.ts
├── components/
│   ├── ui/                             # shadcn components
│   ├── charts/
│   │   ├── RevenueChart.tsx
│   │   ├── CashFlowChart.tsx
│   │   └── ExpenseDonut.tsx
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── AlertPanel.tsx
│   │   └── DashboardSkeleton.tsx
│   ├── financial/
│   │   ├── EntryForm.tsx
│   │   ├── EntryTable.tsx
│   │   └── PeriodFilter.tsx
│   └── products/
│       ├── ProductForm.tsx
│       ├── ProductTable.tsx
│       └── StatusToggle.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── formatters.ts                   # Intl formatters (currency, date, %)
│   ├── calculations.ts                 # Lógica financeira pura (testável)
│   └── integrations/
│       ├── types.ts                    # IntegrationAdapter interface
│       └── stub.ts                     # Implementação stub
└── types/
    ├── database.ts                     # Tipos gerados do Supabase schema
    └── api.ts                          # Tipos de request/response

PRD gerado para implementação direta. Todas as decisões arquiteturais, de schema e de UX são orientadas à construção imediata do sistema, sem dependências externas não especificadas.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://erp-hentechsolutions.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9d5d1964-4832-417c-8d5d-a0cbcd30965d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
