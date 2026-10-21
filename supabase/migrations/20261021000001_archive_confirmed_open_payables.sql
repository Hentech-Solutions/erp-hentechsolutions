-- Arquiva de forma reversivel as 33 contas a pagar confirmadas pelo usuario.
-- A verificacao impede que a migration altere dados se a base mudou desde a
-- confirmacao do total exibido no painel.
DO $$
DECLARE
  v_count BIGINT;
  v_total NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_count, v_total
    FROM public.financial_entries
   WHERE deleted_at IS NULL
     AND is_settled = false
     AND type IN ('expense', 'withdrawal');

  IF v_count <> 33 OR v_total <> 1589764.00 THEN
    RAISE EXCEPTION
      'Arquivamento abortado: esperados 33 lancamentos em aberto somando 1589764.00; encontrados % lancamentos somando %.',
      v_count, v_total;
  END IF;

  UPDATE public.financial_entries
     SET deleted_at = now()
   WHERE deleted_at IS NULL
     AND is_settled = false
     AND type IN ('expense', 'withdrawal');
END $$;
