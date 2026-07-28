import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/use-user-role";
import {
  createTelegramRecipient,
  deleteTelegramRecipient,
  listTelegramRecipients,
  updateTelegramRecipient,
  type TelegramRecipient,
} from "@/lib/data/telegram";
import { sendTelegramTest } from "@/lib/telegram.functions";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações Telegram — ERP Hentech" },
      {
        name: "description",
        content:
          "Gerencie quais sócios recebem alertas automáticos no Telegram para novos pedidos e vendas concluídas.",
      },
      { property: "og:title", content: "Notificações Telegram — ERP Hentech" },
      {
        property: "og:description",
        content: "Ative ou desative alertas de novos pedidos e vendas para cada sócio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const role = useUserRole();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [chatId, setChatId] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!role.loading && !role.isAdmin) {
      toast.error("Acesso restrito a administradores.");
      navigate({ to: "/" });
    }
  }, [role.loading, role.isAdmin, navigate]);

  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ["telegram-recipients"],
    queryFn: listTelegramRecipients,
    enabled: role.isAdmin,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["telegram-recipients"] });

  async function handleCreate() {
    if (!label.trim() || !chatId.trim()) {
      toast.error("Informe o nome e o ID do chat.");
      return;
    }
    setSaving(true);
    try {
      await createTelegramRecipient({ label: label.trim(), chat_id: chatId.trim() });
      setOpen(false);
      setLabel("");
      setChatId("");
      toast.success("Destinatário adicionado.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(r: TelegramRecipient, patch: Partial<TelegramRecipient>) {
    try {
      await updateTelegramRecipient(r.id, patch);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(r: TelegramRecipient) {
    if (!confirm(`Remover "${r.label}" das notificações?`)) return;
    try {
      await deleteTelegramRecipient(r.id);
      toast.success("Destinatário removido.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      await sendTelegramTest({});
      toast.success("Mensagem de teste enviada aos destinatários de novos pedidos.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  if (!role.isAdmin) return <AppShell title="Notificações" children={null} />;

  return (
    <AppShell title="Notificações">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificações no Telegram
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Cada sócio cadastrado recebe alertas automáticos do bot. Ative individualmente os
              avisos de novos pedidos recebidos pela API e de vendas concluídas.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              <Send className="h-4 w-4 mr-1" /> {testing ? "Enviando…" : "Enviar teste"}
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo destinatário
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-sm text-muted-foreground text-center">Carregando…</div>
            ) : recipients.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground text-center">
                Nenhum destinatário cadastrado.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recipients.map((r) => (
                  <div key={r.id} className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{r.label}</span>
                        {r.is_active ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                          >
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pausado</Badge>
                        )}
                      </div>
                      <code className="mt-1 inline-block text-xs px-1.5 py-0.5 rounded bg-muted font-mono text-muted-foreground">
                        chat_id {r.chat_id}
                      </code>
                    </div>
                    <div className="flex items-center gap-5 flex-wrap">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={r.notify_new_order}
                          onCheckedChange={(v) => toggle(r, { notify_new_order: v })}
                        />
                        Novo pedido
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={r.notify_sale}
                          onCheckedChange={(v) => toggle(r, { notify_sale: v })}
                        />
                        Venda concluída
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={r.is_active}
                          onCheckedChange={(v) => toggle(r, { is_active: v })}
                        />
                        Ativo
                      </label>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(r)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo destinatário</DialogTitle>
            <DialogDescription>
              Informe o nome do sócio e o ID do chat dele no Telegram.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tg-label">Nome</Label>
              <Input id="tg-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Sócio" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tg-chat">ID do chat</Label>
              <Input
                id="tg-chat"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="894471119"
                inputMode="numeric"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Salvando…" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
