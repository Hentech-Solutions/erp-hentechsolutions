ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'em_negociacao' AFTER 'pendente';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pronto_entrega' AFTER 'em_execucao';