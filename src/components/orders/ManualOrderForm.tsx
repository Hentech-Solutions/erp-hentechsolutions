import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormModal, FieldGroupLabel } from "@/components/ui/form-modal";
import { createManualOrder } from "@/lib/data/orders";
import { toISODate } from "@/lib/formatters";

export function ManualOrderForm({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [company, setCompany] = useState("");
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [orderDate, setOrderDate] = useState(toISODate(new Date()));
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCompany("");
    setService("");
    setAmount("");
    setOrderDate(toISODate(new Date()));
    setNotes("");
    setValidationError(null);
  }, [open]);

  const create = useMutation({
    mutationFn: () =>
      createManualOrder({
        customerName,
        customerWhatsapp: customerPhone,
        customerEmail,
        customerCompany: company,
        serviceName: service,
        amount: Number(amount.replace(",", ".")),
        orderDate,
        notes,
      }),
    onSuccess: () => {
      toast.success("Pedido manual criado.");
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Erro ao criar pedido."),
  });

  function submit() {
    setValidationError(null);
    const numericAmount = Number(amount.replace(",", "."));
    if (!customerName.trim()) return setValidationError("Informe o nome do cliente.");
    if (customerPhone.replace(/\D/g, "").length < 10)
      return setValidationError("Informe um telefone válido com DDD.");
    if (!service.trim()) return setValidationError("Informe a descrição do serviço.");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0)
      return setValidationError("Informe um valor maior que zero.");
    if (!orderDate) return setValidationError("Informe a data do pedido.");
    create.mutate();
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      title="Adicionar pedido manualmente"
      description="Registre no ERP um pedido recebido fora do site."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Salvando..." : "Criar pedido"}
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        <section className="grid gap-3">
          <FieldGroupLabel>Cliente</FieldGroupLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="manual-order-name">Nome *</Label>
              <Input
                id="manual-order-name"
                autoComplete="name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manual-order-phone">WhatsApp com DDD *</Label>
              <Input
                id="manual-order-phone"
                type="tel"
                autoComplete="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder="(11) 99999-9999"
                maxLength={30}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manual-order-email">E-mail</Label>
              <Input
                id="manual-order-email"
                type="email"
                autoComplete="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                maxLength={254}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manual-order-company">Empresa</Label>
              <Input
                id="manual-order-company"
                autoComplete="organization"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                maxLength={200}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          <FieldGroupLabel>Pedido</FieldGroupLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="manual-order-service">Descrição do serviço *</Label>
              <Input
                id="manual-order-service"
                value={service}
                onChange={(event) => setService(event.target.value)}
                placeholder="Ex.: Desenvolvimento de sistema personalizado"
                maxLength={300}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manual-order-amount">Valor total (R$) *</Label>
              <Input
                id="manual-order-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="manual-order-date">Data do pedido *</Label>
              <Input
                id="manual-order-date"
                type="date"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="manual-order-notes">Observações</Label>
              <Textarea
                id="manual-order-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
              />
            </div>
          </div>
        </section>

        {validationError && <p className="text-sm text-destructive">{validationError}</p>}
      </div>
    </FormModal>
  );
}
