import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormModal, FieldGroupLabel } from "@/components/ui/form-modal";
import { createCustomer, updateCustomer, type Customer } from "@/lib/data/customers";
import { isValidDocument, maskCPF, maskCNPJ, onlyDigits } from "@/lib/document";

export function CustomerForm({
  trigger,
  initial,
  onSaved,
}: {
  trigger: React.ReactNode;
  initial?: Customer;
  onSaved?: (c: Customer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [personType, setPersonType] = useState<"individual" | "company">("individual");
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    const pt = (initial?.person_type as "individual" | "company") ?? "individual";
    setPersonType(pt);
    setName(initial?.name ?? "");
    const dt = (initial?.document_type as "cpf" | "cnpj" | null) ?? (pt === "company" ? "cnpj" : "cpf");
    setDocument(initial?.document ? (dt === "cnpj" ? maskCNPJ(initial.document) : maskCPF(initial.document)) : "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setNotes(initial?.notes ?? "");
  }, [open, initial]);

  const docType: "cpf" | "cnpj" = personType === "company" ? "cnpj" : "cpf";
  const masked = document;
  const digits = onlyDigits(document);
  const docFilled = digits.length > 0;
  const docValid = docFilled ? isValidDocument(digits, docType) : true;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nome é obrigatório");
      if (docFilled && !docValid) throw new Error(`${docType.toUpperCase()} inválido`);
      const payload = {
        person_type: personType,
        name: name.trim(),
        document: docFilled ? digits : null,
        document_type: docFilled ? docType : null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      };
      return initial ? updateCustomer(initial.id, payload) : createCustomer(payload);
    },
    onSuccess: (c) => {
      toast.success(initial ? "Cliente atualizado" : "Cliente criado");
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", c.id] });
      setOpen(false);
      onSaved?.(c);
    },
    onError: (e: any) => {
      if (e?.code === "23505") toast.error("Documento já cadastrado");
      else toast.error(e?.message ?? "Erro ao salvar");
    },
  });

  return (
    <FormModal
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={initial ? "Editar cliente" : "Novo cliente"}
      description="Dados cadastrais e fiscais do cliente."
      size="3xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending || (docFilled && !docValid)} className="px-6">
            {mutation.isPending ? "Salvando…" : initial ? "Salvar alterações" : "Criar cliente"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="space-y-4">
            <FieldGroupLabel>Identificação</FieldGroupLabel>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de pessoa</Label>
                <Select value={personType} onValueChange={(v) => { setPersonType(v as any); setDocument(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Pessoa Física</SelectItem>
                    <SelectItem value="company">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-doc">{docType === "cnpj" ? "CNPJ" : "CPF"}</Label>
                <Input
                  id="c-doc"
                  value={masked}
                  onChange={(e) => setDocument(docType === "cnpj" ? maskCNPJ(e.target.value) : maskCPF(e.target.value))}
                  placeholder={docType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                  className="font-mono tabular-nums"
                />
                {docFilled && !docValid && (
                  <p className="text-xs text-destructive">Dígitos verificadores inválidos</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">{personType === "company" ? "Razão social *" : "Nome completo *"}</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
            </div>
          </div>

          <div className="space-y-4">
            <FieldGroupLabel>Observações</FieldGroupLabel>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Notas internas sobre o cliente…"
              className="resize-none"
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-muted/20 border border-border/60 rounded-xl p-5 space-y-4">
            <FieldGroupLabel>Contato</FieldGroupLabel>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="cliente@exemplo.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Telefone</Label>
              <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder="(11) 99999-0000" />
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  );
}