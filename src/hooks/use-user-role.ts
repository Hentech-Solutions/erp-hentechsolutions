import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "user";

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      setEmail(auth.user?.email ?? null);
      if (!uid) {
        setRoles([]);
        return;
      }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (!mounted) return;
      setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loading = roles === null;
  const isAdmin = !!roles?.includes("admin");
  const isManager = !!roles?.includes("manager");
  const isUser = !!roles?.includes("user");
  const canAccessStatements = isAdmin || isManager;
  return { roles: roles ?? [], userId, email, loading, isAdmin, isManager, isUser, canAccessStatements };
}