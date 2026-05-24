import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { updateProduct, productSalesCheck } from "@/lib/data/products";
import { toast } from "sonner";

export function StatusToggle({ id, status }: { id: string; status: "active" | "inactive" }) {
  const [confirm, setConfirm] = useState<{ open: boolean; count: number }>({ open: false, count: 0 });
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (next: "active" | "inactive") => updateProduct(id, { status: next }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const onChange = async (checked: boolean) => {
    const next: "active" | "inactive" = checked ? "active" : "inactive";
    if (next === "inactive") {
      const check = await productSalesCheck(id);
      if (check.has_sales) {
        setConfirm({ open: true, count: check.sales_count });
        return;
      }
    }
    m.mutate(next);
  };

  return (
    <>
      <Switch checked={status === "active"} onCheckedChange={onChange} />
      <AlertDialog open={confirm.open} onOpenChange={(o) => setConfirm((s) => ({ ...s, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Este produto possui {confirm.count} venda(s) registrada(s). Inativar não remove o histórico, mas impede novos lançamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { m.mutate("inactive"); setConfirm({ open: false, count: 0 }); }}>
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
