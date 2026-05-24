import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Wallet, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/financeiro", label: "Centro Financeiro", icon: Wallet },
  { to: "/produtos", label: "Produtos", icon: Package },
];

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center mr-2.5">
            <span className="text-primary text-sm font-bold">GE</span>
          </div>
          <span className="font-semibold tracking-tight text-sidebar-foreground">Gestão Empresarial</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 text-[10px] tracking-wider uppercase text-muted-foreground border-t border-sidebar-border">
          v1.0 · Single-tenant
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-6 sticky top-0 bg-background/80 backdrop-blur z-10">
          <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
        </header>
        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
