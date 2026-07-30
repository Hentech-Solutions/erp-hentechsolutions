import { auth, defineMcp } from "@lovable.dev/mcp-js";
import financialSummary from "./tools/financial-summary";
import listCustomers from "./tools/list-customers";
import listGoals from "./tools/list-goals";
import listOrders from "./tools/list-orders";
import listProducts from "./tools/list-products";
import updateOrderStatus from "./tools/update-order-status";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "erp-hentech-solutions",
  title: "ERP - Hentech Solutions",
  version: "0.1.0",
  instructions:
    "Ferramentas do ERP da Hentech Solutions. Consulte produtos, clientes, pedidos, metas de vendas e o resumo financeiro, e atualize o status de pedidos. Todos os dados são acessados como o usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listProducts, listCustomers, listOrders, listGoals, financialSummary, updateOrderStatus],
});