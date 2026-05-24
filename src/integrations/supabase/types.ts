export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          changed_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Insert: {
          changed_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Update: {
          changed_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      dashboard_alerts: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          severity: Database["public"]["Enums"]["alert_severity"]
          title: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          title: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          severity?: Database["public"]["Enums"]["alert_severity"]
          title?: string
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_system: boolean
          name: string
          type: Database["public"]["Enums"]["financial_entry_type"]
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          type: Database["public"]["Enums"]["financial_entry_type"]
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          type?: Database["public"]["Enums"]["financial_entry_type"]
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          amount: number
          attachment_path: string | null
          cash_flow_cat: Database["public"]["Enums"]["cash_flow_category"]
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          exported_at: string | null
          external_ref: string | null
          id: string
          is_settled: boolean
          notes: string | null
          payment_date: string | null
          product_id: string | null
          recurrence: Database["public"]["Enums"]["expense_recurrence"]
          recurrence_group_id: string | null
          reference_date: string
          sale_id: string | null
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          attachment_path?: string | null
          cash_flow_cat?: Database["public"]["Enums"]["cash_flow_category"]
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exported_at?: string | null
          external_ref?: string | null
          id?: string
          is_settled?: boolean
          notes?: string | null
          payment_date?: string | null
          product_id?: string | null
          recurrence?: Database["public"]["Enums"]["expense_recurrence"]
          recurrence_group_id?: string | null
          reference_date: string
          sale_id?: string | null
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_path?: string | null
          cash_flow_cat?: Database["public"]["Enums"]["cash_flow_category"]
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exported_at?: string | null
          external_ref?: string | null
          id?: string
          is_settled?: boolean
          notes?: string | null
          payment_date?: string | null
          product_id?: string | null
          recurrence?: Database["public"]["Enums"]["expense_recurrence"]
          recurrence_group_id?: string | null
          reference_date?: string
          sale_id?: string | null
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_enabled: boolean
          last_sync_at: string | null
          name: string
          sync_status: string | null
          type: Database["public"]["Enums"]["integration_type"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_sync_at?: string | null
          name: string
          sync_status?: string | null
          type: Database["public"]["Enums"]["integration_type"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_sync_at?: string | null
          name?: string
          sync_status?: string | null
          type?: Database["public"]["Enums"]["integration_type"]
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          cost: number
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          margin: number | null
          name: string
          price: number
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cost?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          margin?: number | null
          name: string
          price: number
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cost?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          margin?: number | null
          name?: string
          price?: number
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          product_id: string | null
          product_snapshot: Json
          quantity: number
          sale_id: string
          subtotal: number | null
          unit_cost: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          product_id?: string | null
          product_snapshot: Json
          quantity: number
          sale_id: string
          subtotal?: number | null
          unit_cost?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          product_id?: string | null
          product_snapshot?: Json
          quantity?: number
          sale_id?: string
          subtotal?: number | null
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          discount: number
          external_ref: string | null
          id: string
          notes: string | null
          sale_date: string
          total_amount: number
          total_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount?: number
          external_ref?: string | null
          id?: string
          notes?: string | null
          sale_date: string
          total_amount: number
          total_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount?: number
          external_ref?: string | null
          id?: string
          notes?: string | null
          sale_date?: string
          total_amount?: number
          total_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_monthly_summary: {
        Row: {
          capital_in: number | null
          expenses: number | null
          gross_profit: number | null
          month: string | null
          revenue: number | null
          revenue_count: number | null
          withdrawals: number | null
        }
        Relationships: []
      }
      v_product_metrics: {
        Row: {
          cost: number | null
          id: string | null
          last_sale_date: string | null
          margin: number | null
          name: string | null
          price: number | null
          status: Database["public"]["Enums"]["product_status"] | null
          total_cost: number | null
          total_profit: number | null
          total_revenue: number | null
          units_sold: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      cash_flow_category: "operational" | "investment" | "financing"
      expense_recurrence: "one_time" | "monthly" | "quarterly" | "annual"
      financial_entry_type:
        | "revenue"
        | "expense"
        | "investment"
        | "withdrawal"
        | "capital_in"
      integration_type:
        | "payment_gateway"
        | "erp"
        | "bank_api"
        | "sales_platform"
        | "accounting"
      product_status: "active" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["info", "warning", "critical"],
      cash_flow_category: ["operational", "investment", "financing"],
      expense_recurrence: ["one_time", "monthly", "quarterly", "annual"],
      financial_entry_type: [
        "revenue",
        "expense",
        "investment",
        "withdrawal",
        "capital_in",
      ],
      integration_type: [
        "payment_gateway",
        "erp",
        "bank_api",
        "sales_platform",
        "accounting",
      ],
      product_status: ["active", "inactive"],
    },
  },
} as const
