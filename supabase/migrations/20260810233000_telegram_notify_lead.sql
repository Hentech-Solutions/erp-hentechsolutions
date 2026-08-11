-- ============================================================
-- Interruptor proprio para notificacao de lead.
--
-- Antes: a notificacao de lead (`new_lead`) reusava a coluna notify_new_order,
-- porque era a forma de nao precisar de migration. Efeito colateral: nao dava
-- para parar de receber lead sem parar de receber pedido novo tambem — um
-- switch controlava duas coisas diferentes.
--
-- DEFAULT true para nao mudar comportamento de quem ja recebe: os dois socios
-- estao com notify_new_order ligado hoje e continuam recebendo lead.
-- ============================================================

ALTER TABLE public.telegram_recipients
  ADD COLUMN IF NOT EXISTS notify_new_lead boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.telegram_recipients.notify_new_lead IS
  'Recebe aviso de lead novo vindo do formulario da landing page (origin = lead).';
