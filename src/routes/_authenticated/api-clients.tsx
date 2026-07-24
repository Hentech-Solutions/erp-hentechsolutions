import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Copy, RefreshCw, Trash2, ShieldOff, ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserRole } from "@/hooks/use-user-role";
import {
  createApiClient,
  deleteApiClient,
  listApiClients,
  rotateApiClientKey,
  setApiClientActive,
  type ApiClient,
} from "@/lib/data/api-clients";
import { formatDate } from "@/lib/formatters";

export const Route = createFileRoute("/_authenticated/api-clients")({
  head: () => ({ meta: [{ title: "Clientes de API — ERP Hentech" }] }),
  component: ApiClientsPage,
});

function ApiClientsPage() {
  const role = useUserRole();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!role.loading && !role.isAdmin) {
      toast.error("Acesso restrito a administradores.");
      navigate({ to: "/" });
    }
  }, [role.loading, role.isAdmin, navigate]);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["api-clients"],
    queryFn: listApiClients,
    enabled: role.isAdmin,
  });

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Informe um nome para o cliente.");
      return;
    }
    setCreating(true);
    try {
      const { client, plaintextKey } = await createApiClient({
        name: name.trim(),
        description: description.trim() || null,
      });
      setOpenCreate(false);
      setName("");
      setDescription("");
      setRevealedKey({ name: client.name, key: plaintextKey });
      qc.invalidateQueries({ queryKey: ["api-clients"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(c: ApiClient) {
    try {
      await setApiClientActive(c.id, !c.is_active);
      toast.success(c.is_active ? "Chave revogada." : "Chave reativada.");
      qc.invalidateQueries({ queryKey: ["api-clients"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleRotate(c: ApiClient) {
    if (!confirm(`Gerar uma nova chave para "${c.name}"? A chave anterior deixará de funcionar imediatamente.`)) return;
    try {
      const key = await rotateApiClientKey(c.id);
      setRevealedKey({ name: c.name, key });
      qc.invalidateQueries({ queryKey: ["api-clients"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete(c: ApiClient) {
    if (!confirm(`Excluir permanentemente "${c.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteApiClient(c.id);
      toast.success("Cliente excluído.");
      qc.invalidateQueries({ queryKey: ["api-clients"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Falha ao copiar.");
    }
  }

  if (!role.isAdmin) return <AppShell title="Clientes de API" children={null} />;

  return (
    <AppShell title="Clientes de API">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Front-ends autorizados
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Cada front-end que consome a API do ERP recebe uma chave única. A chave é exibida
              apenas uma vez no momento da criação — armazene-a com segurança.
            </p>
          </div>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo cliente
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-sm text-muted-foreground text-center">Carregando…</div>
            ) : clients.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground text-center">
                Nenhum cliente cadastrado ainda.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {clients.map((c) => (
                  <div key={c.id} className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{c.name}</span>
                        {c.is_active ? (
                          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-destructive/15 text-destructive border-destructive/20">
                            Revogada
                          </Badge>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <code className="px-1.5 py-0.5 rounded bg-muted font-mono">{c.key_prefix}…</code>
                        <span>Criada em {formatDate(c.created_at)}</span>
                        <span>
                          Último uso:{" "}
                          {c.last_used_at ? formatDate(c.last_used_at) : "nunca"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRotate(c)}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Rotacionar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggle(c)}>
                        {c.is_active ? (
                          <>
                            <ShieldOff className="h-3.5 w-3.5 mr-1" /> Revogar
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Reativar
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Como usar</p>
            <p>Envie a chave no header <code className="px-1 py-0.5 rounded bg-muted font-mono">x-api-key</code> ao chamar <code className="px-1 py-0.5 rounded bg-muted font-mono">POST /api/public/orders</code>.</p>
            <p>Chaves revogadas ou inativas são rejeitadas com <code className="px-1 py-0.5 rounded bg-muted font-mono">401</code>. O sistema atualiza o campo "Último uso" a cada requisição bem-sucedida.</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente de API</DialogTitle>
            <DialogDescription>
              Identifique o front-end ou serviço que consumirá a API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ac-name">Nome</Label>
              <Input id="ac-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Site Institucional" />
            </div>
            <div>
              <Label htmlFor="ac-desc">Descrição (opcional)</Label>
              <Textarea id="ac-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Notas internas sobre este cliente" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenCreate(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Gerando…" : "Gerar chave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revealedKey} onOpenChange={(v) => !v && setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chave gerada — {revealedKey?.name}</DialogTitle>
            <DialogDescription>
              Copie e armazene agora. Por segurança, esta chave não poderá ser exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-xs break-all">
            {revealedKey?.key}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => revealedKey && copyKey(revealedKey.key)}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button onClick={() => setRevealedKey(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}