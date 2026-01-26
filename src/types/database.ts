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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      branches: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          code: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          postcode: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          code: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          postcode: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          code?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          postcode?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          branch_id: string
          created_at: string
          description: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          transaction_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          branch_id: string
          created_at?: string
          description: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          transaction_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          branch_id?: string
          created_at?: string
          description?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alerts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alerts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_places: number
          is_active: boolean
          is_base_currency: boolean
          max_transaction_amount: number
          min_transaction_amount: number
          name: string
          requires_id_threshold: number | null
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_places?: number
          is_active?: boolean
          is_base_currency?: boolean
          max_transaction_amount?: number
          min_transaction_amount?: number
          name: string
          requires_id_threshold?: number | null
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_places?: number
          is_active?: boolean
          is_base_currency?: boolean
          max_transaction_amount?: number
          min_transaction_amount?: number
          name?: string
          requires_id_threshold?: number | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      currency_denominations: {
        Row: {
          created_at: string
          currency_code: string
          denomination_type: Database["public"]["Enums"]["denomination_type"]
          description: string | null
          id: string
          is_active: boolean
          sort_order: number
          value: number
        }
        Insert: {
          created_at?: string
          currency_code: string
          denomination_type: Database["public"]["Enums"]["denomination_type"]
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          value: number
        }
        Update: {
          created_at?: string
          currency_code?: string
          denomination_type?: Database["public"]["Enums"]["denomination_type"]
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "currency_denominations_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      daily_reconciliation: {
        Row: {
          actual_cash_gbp: number | null
          branch_id: string
          created_at: string
          expected_cash_gbp: number | null
          id: string
          manager_approved_at: string | null
          manager_approved_by: string | null
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          total_buy_gbp: number
          total_buy_transactions: number
          total_commission_gbp: number
          total_sell_gbp: number
          total_sell_transactions: number
          total_voided_transactions: number
          updated_at: string
          variance_gbp: number | null
        }
        Insert: {
          actual_cash_gbp?: number | null
          branch_id: string
          created_at?: string
          expected_cash_gbp?: number | null
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          total_buy_gbp?: number
          total_buy_transactions?: number
          total_commission_gbp?: number
          total_sell_gbp?: number
          total_sell_transactions?: number
          total_voided_transactions?: number
          updated_at?: string
          variance_gbp?: number | null
        }
        Update: {
          actual_cash_gbp?: number | null
          branch_id?: string
          created_at?: string
          expected_cash_gbp?: number | null
          id?: string
          manager_approved_at?: string | null
          manager_approved_by?: string | null
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          total_buy_gbp?: number
          total_buy_transactions?: number
          total_commission_gbp?: number
          total_sell_gbp?: number
          total_sell_transactions?: number
          total_voided_transactions?: number
          updated_at?: string
          variance_gbp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reconciliation_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reconciliation_manager_approved_by_fkey"
            columns: ["manager_approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reconciliation_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drawer_denomination_counts: {
        Row: {
          count_type: string
          denomination_id: string
          id: string
          quantity: number
          session_id: string
        }
        Insert: {
          count_type: string
          denomination_id: string
          id?: string
          quantity?: number
          session_id: string
        }
        Update: {
          count_type?: string
          denomination_id?: string
          id?: string
          quantity?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawer_denomination_counts_denomination_id_fkey"
            columns: ["denomination_id"]
            isOneToOne: false
            referencedRelation: "currency_denominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawer_denomination_counts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "drawer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      drawer_sessions: {
        Row: {
          branch_id: string
          closed_at: string | null
          closing_float_gbp: number | null
          closing_notes: string | null
          closing_verified_by: string | null
          created_at: string
          expected_float_gbp: number | null
          id: string
          opened_at: string
          opening_float_gbp: number
          opening_verified_by: string | null
          operator_id: string
          status: Database["public"]["Enums"]["drawer_session_status"]
          till_number: number
          updated_at: string
          variance_gbp: number | null
        }
        Insert: {
          branch_id: string
          closed_at?: string | null
          closing_float_gbp?: number | null
          closing_notes?: string | null
          closing_verified_by?: string | null
          created_at?: string
          expected_float_gbp?: number | null
          id?: string
          opened_at?: string
          opening_float_gbp: number
          opening_verified_by?: string | null
          operator_id: string
          status?: Database["public"]["Enums"]["drawer_session_status"]
          till_number: number
          updated_at?: string
          variance_gbp?: number | null
        }
        Update: {
          branch_id?: string
          closed_at?: string | null
          closing_float_gbp?: number | null
          closing_notes?: string | null
          closing_verified_by?: string | null
          created_at?: string
          expected_float_gbp?: number | null
          id?: string
          opened_at?: string
          opening_float_gbp?: number
          opening_verified_by?: string | null
          operator_id?: string
          status?: Database["public"]["Enums"]["drawer_session_status"]
          till_number?: number
          updated_at?: string
          variance_gbp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drawer_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawer_sessions_closing_verified_by_fkey"
            columns: ["closing_verified_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawer_sessions_opening_verified_by_fkey"
            columns: ["opening_verified_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawer_sessions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate_history: {
        Row: {
          action: string
          branch_id: string | null
          buy_rate: number
          currency_code: string
          effective_from: string
          effective_until: string | null
          id: string
          rate_id: string
          recorded_at: string
          sell_rate: number
          set_by: string | null
          source: Database["public"]["Enums"]["rate_source"]
        }
        Insert: {
          action: string
          branch_id?: string | null
          buy_rate: number
          currency_code: string
          effective_from: string
          effective_until?: string | null
          id?: string
          rate_id: string
          recorded_at?: string
          sell_rate: number
          set_by?: string | null
          source: Database["public"]["Enums"]["rate_source"]
        }
        Update: {
          action?: string
          branch_id?: string | null
          buy_rate?: number
          currency_code?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          rate_id?: string
          recorded_at?: string
          sell_rate?: number
          set_by?: string | null
          source?: Database["public"]["Enums"]["rate_source"]
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          branch_id: string | null
          buy_rate: number
          created_at: string
          currency_code: string
          effective_from: string
          effective_until: string | null
          id: string
          notes: string | null
          sell_rate: number
          set_by: string | null
          source: Database["public"]["Enums"]["rate_source"]
          spread_percentage: number | null
        }
        Insert: {
          branch_id?: string | null
          buy_rate: number
          created_at?: string
          currency_code: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          notes?: string | null
          sell_rate: number
          set_by?: string | null
          source?: Database["public"]["Enums"]["rate_source"]
          spread_percentage?: number | null
        }
        Update: {
          branch_id?: string | null
          buy_rate?: number
          created_at?: string
          currency_code?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          notes?: string | null
          sell_rate?: number
          set_by?: string | null
          source?: Database["public"]["Enums"]["rate_source"]
          spread_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rates_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          operator_id: string
          read_at: string | null
          session_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          operator_id: string
          read_at?: string | null
          session_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          operator_id?: string
          read_at?: string | null
          session_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_notifications_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "drawer_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          branch_id: string
          created_at: string
          daily_transaction_limit: number | null
          employee_number: string
          first_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          last_name: string
          max_transaction_amount: number | null
          pin_hash: string | null
          requires_new_password: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          daily_transaction_limit?: number | null
          employee_number: string
          first_name: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          last_name: string
          max_transaction_amount?: number | null
          pin_hash?: string | null
          requires_new_password?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          daily_transaction_limit?: number | null
          employee_number?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_name?: string
          max_transaction_amount?: number | null
          pin_hash?: string | null
          requires_new_password?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_audit_log: {
        Row: {
          action: string
          details: Json | null
          id: string
          ip_address: unknown
          new_status: Database["public"]["Enums"]["transaction_status"] | null
          performed_at: string
          performed_by: string
          previous_status:
            | Database["public"]["Enums"]["transaction_status"]
            | null
          transaction_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          new_status?: Database["public"]["Enums"]["transaction_status"] | null
          performed_at?: string
          performed_by: string
          previous_status?:
            | Database["public"]["Enums"]["transaction_status"]
            | null
          transaction_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          new_status?: Database["public"]["Enums"]["transaction_status"] | null
          performed_at?: string
          performed_by?: string
          previous_status?:
            | Database["public"]["Enums"]["transaction_status"]
            | null
          transaction_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_log_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          base_amount: number
          base_currency_code: string
          branch_id: string
          commission_amount: number | null
          completed_at: string | null
          created_at: string
          customer_id_number: string | null
          customer_id_type: string | null
          customer_id_verified_by: string | null
          customer_name: string | null
          drawer_session_id: string
          foreign_amount: number
          foreign_currency_code: string
          id: string
          operator_id: string
          original_transaction_id: string | null
          rate_id: string | null
          rate_used: number
          reference_number: string
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          base_amount: number
          base_currency_code?: string
          branch_id: string
          commission_amount?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id_number?: string | null
          customer_id_type?: string | null
          customer_id_verified_by?: string | null
          customer_name?: string | null
          drawer_session_id: string
          foreign_amount: number
          foreign_currency_code: string
          id?: string
          operator_id: string
          original_transaction_id?: string | null
          rate_id?: string | null
          rate_used: number
          reference_number: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          base_amount?: number
          base_currency_code?: string
          branch_id?: string
          commission_amount?: number | null
          completed_at?: string | null
          created_at?: string
          customer_id_number?: string | null
          customer_id_type?: string | null
          customer_id_verified_by?: string | null
          customer_name?: string | null
          drawer_session_id?: string
          foreign_amount?: number
          foreign_currency_code?: string
          id?: string
          operator_id?: string
          original_transaction_id?: string | null
          rate_id?: string | null
          rate_used?: number
          reference_number?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_verified_by_fkey"
            columns: ["customer_id_verified_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_drawer_session_id_fkey"
            columns: ["drawer_session_id"]
            isOneToOne: false
            referencedRelation: "drawer_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_foreign_currency_code_fkey"
            columns: ["foreign_currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "transactions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_rate_id_fkey"
            columns: ["rate_id"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_branch_id: { Args: never; Returns: string }
      get_current_rate: {
        Args: { p_branch_id?: string; p_currency_code: string }
        Returns: {
          buy_rate: number
          rate_id: string
          sell_rate: number
          source: Database["public"]["Enums"]["rate_source"]
        }[]
      }
      get_current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_current_staff_id: { Args: never; Returns: string }
      has_role_or_higher: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_active_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      denomination_type: "note" | "coin"
      drawer_session_status: "open" | "closed" | "suspended"
      rate_source: "manual" | "feed" | "override"
      transaction_status: "completed" | "voided" | "refunded"
      transaction_type: "buy" | "sell"
      user_role: "operator" | "supervisor" | "manager" | "admin"
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
      denomination_type: ["note", "coin"],
      drawer_session_status: ["open", "closed", "suspended"],
      rate_source: ["manual", "feed", "override"],
      transaction_status: ["completed", "voided", "refunded"],
      transaction_type: ["buy", "sell"],
      user_role: ["operator", "supervisor", "manager", "admin"],
    },
  },
} as const
