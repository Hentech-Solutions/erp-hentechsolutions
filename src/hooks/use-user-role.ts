import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "user";

async function fetchRoles() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? null;
  if (!uid) return { userId: null, email: null, roles: [] as AppRole[] };

  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
  if (error) throw error;
  return {
    userId: uid,
    email: auth.user?.email ?? null,
    roles: ((data ?? []) as { role: AppRole }[]).map((r) => r.role),
  };
}

/**
 * Papeis do usuario logado.
 *
 * Antes isto era um useEffect proprio, refeito a cada montagem do AppShell --
 * dois round-trips (getUser + user_roles) em toda navegacao. Agora fica em
 * cache do react-query e so revalida no onAuthStateChange, que ja invalida
 * todas as queries em __root.tsx.
 */
export function useUserRole() {
  const q = useQuery({
    queryKey: ["user-role"],
    queryFn: fetchRoles,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const roles = q.data?.roles ?? [];
  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager");

  return {
    roles,
    userId: q.data?.userId ?? null,
    email: q.data?.email ?? null,
    loading: q.isPending,
    isAdmin,
    isManager,
    isUser: roles.includes("user"),
    /** admin ou manager: pode escrever no sistema */
    isStaff: isAdmin || isManager,
    /** tem algum papel: pode ler o sistema */
    isMember: roles.length > 0,
    canAccessStatements: isAdmin || isManager,
  };
}
