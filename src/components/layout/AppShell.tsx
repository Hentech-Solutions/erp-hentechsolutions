import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Wallet, Package, Users, Target, LogOut, FileText, ShoppingBag, KeyRound, Menu, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import brandLogo from "@/assets/brand-logo.png";
import brandWatermark from "@/assets/brand-watermark.png";
import { useUserRole } from "@/hooks/use-user-role";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/financeiro", label: "Centro Financeiro", icon: Wallet },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/clientes", label: "Clientes", icon: Users },
];

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const role = useUserRole();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = [
    ...nav,
    ...(role.canAccessStatements ? [{ to: "/extratos", label: "Extratos", icon: FileText }] : []),
    ...(role.isAdmin
      ? [
          { to: "/api-clients", label: "Clientes de API", icon: KeyRound },
          { to: "/notificacoes", label: "Notificações", icon: Bell },
        ]
      : []),
  ];

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/login" });
  }

  const navList = (
    <nav className="flex-1 p-3 space-y-1 relative">
      {items.map((n) => {
        const active = pathname === n.to;
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--primary)]"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "group-hover:text-primary/80")} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex-col relative overflow-hidden">
        {/* subtle brand watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -right-10 w-72 h-72 opacity-[0.06] bg-no-repeat bg-contain bg-center"
          style={{ backgroundImage: `url(${brandWatermark})` }}
        />
        <div className="px-5 py-5 border-b border-sidebar-border relative">
          <img src={brandLogo} alt="Hentech Solutions" className="h-10 w-auto object-contain" />
          <p className="mt-2 text-[10px] tracking-[0.18em] uppercase text-primary/70 font-medium">
            Tecnologia que conecta
          </p>
        </div>
        {navList}
        <div className="p-4 border-t border-sidebar-border relative">
          <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/80">
            Hentech ERP · v1.0
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Soluções que transformam</p>
        </div>
      </aside>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[17rem] p-0 bg-sidebar border-sidebar-border flex flex-col">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="px-5 py-5 border-b border-sidebar-border">
            <img src={brandLogo} alt="Hentech Solutions" className="h-9 w-auto object-contain" />
            <p className="mt-2 text-[10px] tracking-[0.18em] uppercase text-primary/70 font-medium">
              Tecnologia que conecta
            </p>
          </div>
          {navList}
          <div className="p-4 border-t border-sidebar-border">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition w-full"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/3 right-0 h-[400px] opacity-40"
          style={{
            background:
              "radial-gradient(60% 80% at 70% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)",
          }}
        />
        <header className="h-14 border-b border-border flex items-center gap-2 px-4 sm:px-6 sticky top-0 bg-background/85 backdrop-blur-xl z-20">
          <button
            onClick={() => setMenuOpen(true)}
            className="lg:hidden -ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
            <h1 className="text-sm font-semibold tracking-tight truncate">{title}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="hidden sm:inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden relative brand-surface">{children}</main>
      </div>
    </div>
  );
}
