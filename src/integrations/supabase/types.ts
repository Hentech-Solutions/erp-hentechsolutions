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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_clients: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          changed_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          changed_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          changed_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          deleted_at: string | null
          document: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          email: string | null
          id: string
          name: string
          notes: string | null
          person_type: Database["public"]["Enums"]["person_type"]
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          person_type?: Database["public"]["Enums"]["person_type"]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          person_type?: Database["public"]["Enums"]["person_type"]
          phone?: string | null
          updated_at?: string
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
          slug: string | null
          type: Database["public"]["Enums"]["financial_entry_type"]
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          slug?: string | null
          type: Database["public"]["Enums"]["financial_entry_type"]
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          slug?: string | null
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
          customer_id: string | null
          deleted_at: string | null
          description: string | null
          due_date: string
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
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date: string
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
          customer_id?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string
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
      financial_statements: {
        Row: {
          created_at: string
          end_date: string
          file_path: string
          file_url: string
          generated_by: string | null
          generated_by_email: string | null
          id: string
          period_type: Database["public"]["Enums"]["statement_period_type"]
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string
          end_date: string
          file_path: string
          file_url: string
          generated_by?: string | null
          generated_by_email?: string | null
          id?: string
          period_type: Database["public"]["Enums"]["statement_period_type"]
          start_date: string
          title: string
        }
        Update: {
          created_at?: string
          end_date?: string
          file_path?: string
          file_url?: string
          generated_by?: string | null
          generated_by_email?: string | null
          id?: string
          period_type?: Database["public"]["Enums"]["statement_period_type"]
          start_date?: string
          title?: string
        }
        Relationships: []
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
      orders: {
        Row: {
          add_discount_applied: boolean
          add_quantity: number
          add_saving: number
          add_subtotal: number
          add_unit_price: number
          code: string
          created_at: string
          currency: string
          customer_company: string | null
          customer_email: string
          customer_name: string
          customer_role: string | null
          customer_whatsapp: string
          deleted_at: string | null
          id: string
          notes: string | null
          notified_at: string | null
          due_date: string | null
          paid_amount: number
          paid_at: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["order_payment_status"]
          plan_ref_id: string | null
          order_created_at: string
          plan_id: string
          plan_name: string
          plan_price: number
          raw_payload: Json
          status: Database["public"]["Enums"]["order_status"]
          status_changed_at: string | null
          total: number
          updated_at: string
        }
        Insert: {
          add_discount_applied?: boolean
          add_quantity?: number
          add_saving?: number
          add_subtotal?: number
          add_unit_price?: number
          code: string
          created_at?: string
          currency?: string
          customer_company?: string | null
          customer_email: string
          customer_name: string
          customer_role?: string | null
          customer_whatsapp: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          due_date?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          plan_ref_id?: string | null
          order_created_at: string
          plan_id: string
          plan_name: string
          plan_price: number
          raw_payload: Json
          status?: Database["public"]["Enums"]["order_status"]
          status_changed_at?: string | null
          total: number
          updated_at?: string
        }
        Update: {
          add_discount_applied?: boolean
          add_quantity?: number
          add_saving?: number
          add_subtotal?: number
          add_unit_price?: number
          code?: string
          created_at?: string
          currency?: string
          customer_company?: string | null
          customer_email?: string
          customer_name?: string
          customer_role?: string | null
          customer_whatsapp?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          due_date?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          plan_ref_id?: string | null
          order_created_at?: string
          plan_id?: string
          plan_name?: string
          plan_price?: number
          raw_payload?: Json
          status?: Database["public"]["Enums"]["order_status"]
          status_changed_at?: string | null
          total?: number
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
      plans: {
        Row: {
          add_unit_cost: number
          add_unit_price: number
          code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          add_unit_cost?: number
          add_unit_price?: number
          code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          add_unit_cost?: number
          add_unit_price?: number
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          unit_cost?: number
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
          customer_id: string | null
          deleted_at: string | null
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
          customer_id?: string | null
          deleted_at?: string | null
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
          customer_id?: string | null
          deleted_at?: string | null
          discount?: number
          external_ref?: string | null
          id?: string
          notes?: string | null
          sale_date?: string
          total_amount?: number
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_entries: {
        Row: {
          amount: number
          created_at: string
          goal_id: string
          id: string
          note: string | null
          product_id: string | null
          sale_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          product_id?: string | null
          sale_date: string
        }
        Update: {
          amount?: number
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          product_id?: string | null
          sale_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_entries_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "sales_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          category: string
          created_at: string
          end_date: string
          goal_start_date: string
          goal_type: Database["public"]["Enums"]["goal_type"]
          id: string
          period_type: Database["public"]["Enums"]["goal_period_type"]
          product_id: string | null
          realized_value: number
          start_date: string
          target_value: number
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          end_date: string
          goal_start_date?: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          period_type: Database["public"]["Enums"]["goal_period_type"]
          product_id?: string | null
          realized_value?: number
          start_date: string
          target_value: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          end_date?: string
          goal_start_date?: string
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          period_type?: Database["public"]["Enums"]["goal_period_type"]
          product_id?: string | null
          realized_value?: number
          start_date?: string
          target_value?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_goals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_goals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_recipients: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          notify_new_order: boolean
          notify_sale: boolean
          updated_at: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          notify_new_order?: boolean
          notify_sale?: boolean
          updated_at?: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          notify_new_order?: boolean
          notify_sale?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      cancel_recurrence_series: {
        Args: { _from: string; _group_id: string }
        Returns: number
      }
      create_sale_with_entry: {
        Args: {
          _category_id: string
          _customer_id?: string
          _description?: string
          _discount?: number
          _due_date?: string
          _is_settled?: boolean
          _items: Json
          _notes?: string
          _reference_date: string
        }
        Returns: {
          entry_id: string
          sale_id: string
        }[]
      }
      get_ap_ar_summary: {
        Args: { _as_of?: string }
        Returns: {
          bucket: string
          bucket_order: number
          direction: string
          entry_count: number
          total: number
        }[]
      }
      get_audit_log: {
        Args: {
          _from?: string
          _limit?: number
          _offset?: number
          _table?: string
          _to?: string
        }
        Returns: {
          changed_at: string
          id: number
          new_data: Json
          old_data: Json
          operation: string
          record_id: string
          table_name: string
          total_count: number
          user_email: string
        }[]
      }
      get_dashboard_kpis: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      get_dre: { Args: { _from: string; _to: string }; Returns: Json }
      get_plan_price_mismatches: {
        Args: Record<string, never>
        Returns: {
          catalog_price: number
          code: string
          diff: number
          order_id: string
          ordered_at: string
          plan_name: string
          site_price: number
        }[]
      }
      register_order_sale: { Args: { _order_id: string }; Returns: Json }
      set_order_payment: {
        Args: {
          _amount?: number | null
          _method?: string | null
          _order_id: string
          _paid_at?: string | null
          _status: Database["public"]["Enums"]["order_payment_status"]
        }
        Returns: Json
      }
      get_goal_vs_real_series: {
        Args: {
          _months?: number
          _period_type: Database["public"]["Enums"]["goal_period_type"]
        }
        Returns: { meta: number; month: string; real_value: number }[]
      }
      get_expense_breakdown: {
        Args: { _from: string; _to: string }
        Returns: {
          amount: number
          color: string
          name: string
          percentage: number
        }[]
      }
      get_monthly_series: {
        Args: { _from: string; _to: string }
        Returns: {
          cash_in: number
          cash_out: number
          expense: number
          month: string
          revenue: number
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_member: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      recalc_goal_realized: { Args: { _goal_id: string }; Returns: undefined }
      settle_entries: {
        Args: { _ids: string[]; _payment_date?: string }
        Returns: number
      }
      unsettle_entries: { Args: { _ids: string[] }; Returns: number }
      update_recurrence_series: {
        Args: {
          _amount?: number
          _category_id?: string
          _description?: string
          _from: string
          _group_id: string
        }
        Returns: number
      }
    }
    Enums: {
      alert_severity: "info" | "warning" | "critical"
      app_role: "admin" | "manager" | "user"
      cash_flow_category: "operational" | "investment" | "financing"
      document_type: "cpf" | "cnpj"
      expense_recurrence: "one_time" | "monthly" | "quarterly" | "annual"
      financial_entry_type:
        | "revenue"
        | "expense"
        | "investment"
        | "withdrawal"
        | "capital_in"
      goal_period_type: "weekly" | "monthly" | "quarterly"
      goal_type: "revenue" | "product" | "manual"
      integration_type:
        | "payment_gateway"
        | "erp"
        | "bank_api"
        | "sales_platform"
        | "accounting"
      order_payment_status: "aguardando" | "parcial" | "pago"
      order_status:
        | "pendente"
        | "em_negociacao"
        | "em_execucao"
        | "pronto_entrega"
        | "concluido"
        | "cancelado"
      person_type: "individual" | "company"
      product_status: "active" | "inactive"
      statement_period_type: "daily" | "weekly" | "monthly"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      alert_severity: ["info", "warning", "critical"],
      app_role: ["admin", "manager", "user"],
      cash_flow_category: ["operational", "investment", "financing"],
      document_type: ["cpf", "cnpj"],
      expense_recurrence: ["one_time", "monthly", "quarterly", "annual"],
      financial_entry_type: [
        "revenue",
        "expense",
        "investment",
        "withdrawal",
        "capital_in",
      ],
      goal_period_type: ["weekly", "monthly", "quarterly"],
      integration_type: [
        "payment_gateway",
        "erp",
        "bank_api",
        "sales_platform",
        "accounting",
      ],
      order_status: [
        "pendente",
        "em_negociacao",
        "em_execucao",
        "pronto_entrega",
        "concluido",
        "cancelado",
      ],
      person_type: ["individual", "company"],
      product_status: ["active", "inactive"],
      statement_period_type: ["daily", "weekly", "monthly"],
    },
  },
} as const
