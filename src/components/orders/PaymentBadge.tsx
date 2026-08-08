import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, CircleDashed, CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  setOrderPayment,
  PAYMENT_LABEL,
  type OrderRow,
  type PaymentStatus,
} from "@/lib/data/orders";
import { formatBRL, formatDate } from "@/lib/formatters";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";

const STYLE: Record<PaymentStatus, string> = {
  aguardando: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  parcial: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  pago: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const ICON: Record<PaymentStatus, typeof BadgeCheck> = {
  aguardando: CircleDashed,
  parcial: CircleDollarSign,
  pago: BadgeCheck,
};

const SHORT: Record<PaymentStatus, string> = {
  aguardando: "A receber",
  parcial: "Parcial",
  pago: "Pago",
};

/** Selo compacto do estado de pagamento — dimensao separada do kanban. */
export function PaymentBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const Icon = ICON[status];
  return (
    <Badge variant="outline" className={cn("text-[10px] gap-1", STYLE[status], className)}>
      <Icon className="h-3 w-3" />
      {SHORT[status]}
    </Badge>
  );
}

/** Bloco de pagamento com ação de baixa, usado no detalhe do pedido. */
export function PaymentPanel({ order }: { order: OrderRow }) {
  const qc = useQueryClient();
  const { isStaff } = useUserRole();

  const mutate = useMutation({
    mutationFn: (status: PaymentStatus) => setOrderPayment({ orderId: order.id, status }),
    onSuccess: (_, status) => {
      toast.success(
        status === "pago"
          ? "Pagamento confirmado. Baixa refletida no financeiro."
          : "Pagamento revertido para aguardando.",
      );
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["apar"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["entries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = Number(order.total) - Number(order.paid_amount ?? 0);

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Pagamento</span>
        <PaymentBadge status={order.payment_status} />
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total do pedido</span>
          <span className="tabular-nums">{formatBRL(order.total)}</span>
        </div>
        {order.payment_status !== "aguardando" && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recebido</span>
            <span className="tabular-nums text-success">{formatBRL(order.paid_amount)}</span>
          </div>
        )}
        {pending > 0 && order.payment_status !== "aguardando" && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Em aberto</span>
            <span className="tabular-nums text-destructive">{formatBRL(pending)}</span>
          </div>
        )}
        {order.paid_at && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Confirmado em</span>
            <span className="tabular-nums">{formatDate(order.paid_at)}</span>
          </div>
        )}
      </div>

      {isStaff && (
        <div className="flex gap-2 pt-1">
          {order.payment_status !== "pago" ? (
            <Button
              size="sm"
              className="flex-1"
              disabled={mutate.isPending}
              onClick={() => mutate.mutate("pago")}
            >
              <BadgeCheck className="h-4 w-4 mr-1" /> Confirmar pagamento
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={mutate.isPending}
              onClick={() => mutate.mutate("aguardando")}
            >
              Estornar baixa
            </Button>
          )}
        </div>
      )}

      {order.payment_status === "aguardando" && (
        <p className="text-[11px] text-muted-foreground">
          Enquanto não confirmado, o valor fica em Contas a Receber e não entra no caixa.
        </p>
      )}
    </div>
  );
}

export { PAYMENT_LABEL };
