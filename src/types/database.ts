export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      customers: {
        Row: {
          address_bytea: string | null
          branch_id: string
          created_at: string
          date_of_birth_bytea: string | null
          document_reference: string | null
          email_bytea: string | null
          first_name_bytea: string
          first_seen_at: string
          id: string
          id_number_bytea: string
          id_type_bytea: string | null
          is_on_watchlist: boolean
          last_name_bytea: string
          last_seen_at: string
          phone_bytea: string | null
          risk_level: Database["public"]["Enums"]["customer_risk_level"]
          risk_score: number
          total_gbp_volume: number
          transaction_count: number
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          watchlist_reason: string | null
        }
        Insert: {
          address_bytea?: string | null
          branch_id: string
          created_at?: string
          date_of_birth_bytea?: string | null
          document_reference?: string | null
          email_bytea?: string | null
          first_name_bytea: string
          first_seen_at?: string
          id?: string
          id_number_bytea: string
          id_type_bytea?: string | null
          is_on_watchlist?: boolean
          last_name_bytea: string
          last_seen_at?: string
          phone_bytea?: string | null
          risk_level?: Database["public"]["Enums"]["customer_risk_level"]
          risk_score?: number
          total_gbp_volume?: number
          transaction_count?: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          watchlist_reason?: string | null
        }
        Update: {
          address_bytea?: string | null
          branch_id?: string
          created_at?: string
          date_of_birth_bytea?: string | null
          document_reference?: string | null
          email_bytea?: string | null
          first_name_bytea?: string
          first_seen_at?: string
          id?: string
          id_number_bytea?: string
          id_type_bytea?: string | null
          is_on_watchlist?: boolean
          last_name_bytea?: string
          last_seen_at?: string
          phone_bytea?: string | null
          risk_level?: Database["public"]["Enums"]["customer_risk_level"]
          risk_score?: number
          total_gbp_volume?: number
          transaction_count?: number
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          watchlist_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_relationships: {
        Row: {
          confidence_score: number
          created_at: string
          customer_a_id: string
          customer_b_id: string
          detected_at: string
          detected_by: string | null
          evidence: Json | null
          id: string
          metadata: Json | null
          relationship_type: Database["public"]["Enums"]["customer_relationship_type"]
        }
        Insert: {
          confidence_score: number
          created_at?: string
          customer_a_id: string
          customer_b_id: string
          detected_at?: string
          detected_by?: string | null
          evidence?: Json | null
          id?: string
          metadata?: Json | null
          relationship_type: Database["public"]["Enums"]["customer_relationship_type"]
        }
        Update: {
          confidence_score?: number
          created_at?: string
          customer_a_id?: string
          customer_b_id?: string
          detected_at?: string
          detected_by?: string | null
          evidence?: Json | null
          id?: string
          metadata?: Json | null
          relationship_type?: Database["public"]["Enums"]["customer_relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "customer_relationships_customer_a_id_fkey"
            columns: ["customer_a_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_relationships_customer_b_id_fkey"
            columns: ["customer_b_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_relationships_detected_by_fkey"
            columns: ["detected_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_risk_factors: {
        Row: {
          created_at: string
          customer_id: string
          description: string
          detected_at: string
          detected_by: string | null
          expires_at: string | null
          factor_type: Database["public"]["Enums"]["customer_risk_factor_type"]
          id: string
          metadata: Json | null
          related_transaction_ids: string[] | null
          score_impact: number
          severity: Database["public"]["Enums"]["pattern_severity"]
        }
        Insert: {
          created_at?: string
          customer_id: string
          description: string
          detected_at?: string
          detected_by?: string | null
          expires_at?: string | null
          factor_type: Database["public"]["Enums"]["customer_risk_factor_type"]
          id?: string
          metadata?: Json | null
          related_transaction_ids?: string[] | null
          score_impact: number
          severity: Database["public"]["Enums"]["pattern_severity"]
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string
          detected_at?: string
          detected_by?: string | null
          expires_at?: string | null
          factor_type?: Database["public"]["Enums"]["customer_risk_factor_type"]
          id?: string
          metadata?: Json | null
          related_transaction_ids?: string[] | null
          score_impact?: number
          severity?: Database["public"]["Enums"]["pattern_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "customer_risk_factors_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_risk_factors_detected_by_fkey"
            columns: ["detected_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
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
      exchange_rate_settings: {
        Row: {
          allow_rate_override: boolean
          branch_id: string
          created_at: string
          currency_code: string
          id: string
          is_enabled: boolean
          max_override_percentage: number | null
          require_supervisor_approval: boolean
          supervisor_override_reason_required: boolean
          updated_at: string
        }
        Insert: {
          allow_rate_override?: boolean
          branch_id: string
          created_at?: string
          currency_code: string
          id?: string
          is_enabled?: boolean
          max_override_percentage?: number | null
          require_supervisor_approval?: boolean
          supervisor_override_reason_required?: boolean
          updated_at?: string
        }
        Update: {
          allow_rate_override?: boolean
          branch_id?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_enabled?: boolean
          max_override_percentage?: number | null
          require_supervisor_approval?: boolean
          supervisor_override_reason_required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rate_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_rate_settings_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
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
      rate_override_history: {
        Row: {
          approved_at: string
          approved_by: string
          id: string
          original_rate: number
          override_percentage: number | null
          override_rate: number
          override_reason: string
          transaction_id: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          id?: string
          original_rate: number
          override_percentage?: number | null
          override_rate: number
          override_reason: string
          transaction_id: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          id?: string
          original_rate?: number
          override_percentage?: number | null
          override_rate?: number
          override_reason?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_override_history_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_override_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      suspicious_patterns: {
        Row: {
          branch_id: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          metadata: Json | null
          name: string
          pattern_type: Database["public"]["Enums"]["suspicious_pattern_type"]
          severity: Database["public"]["Enums"]["pattern_severity"]
          thresholds: Json
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name: string
          pattern_type: Database["public"]["Enums"]["suspicious_pattern_type"]
          severity: Database["public"]["Enums"]["pattern_severity"]
          thresholds: Json
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          name?: string
          pattern_type?: Database["public"]["Enums"]["suspicious_pattern_type"]
          severity?: Database["public"]["Enums"]["pattern_severity"]
          thresholds?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_patterns_branch_id_fkey"
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
          action_type: Database["public"]["Enums"]["audit_action_type"]
          api_endpoint: string | null
          details: Json | null
          device_fingerprint: string | null
          field_changes: Json | null
          id: string
          ip_address: unknown
          new_status: Database["public"]["Enums"]["transaction_status"] | null
          performed_at: string
          performed_by: string
          previous_status:
            | Database["public"]["Enums"]["transaction_status"]
            | null
          session_id: string | null
          transaction_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          action_type?: Database["public"]["Enums"]["audit_action_type"]
          api_endpoint?: string | null
          details?: Json | null
          device_fingerprint?: string | null
          field_changes?: Json | null
          id?: string
          ip_address?: unknown
          new_status?: Database["public"]["Enums"]["transaction_status"] | null
          performed_at?: string
          performed_by: string
          previous_status?:
            | Database["public"]["Enums"]["transaction_status"]
            | null
          session_id?: string | null
          transaction_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_type?: Database["public"]["Enums"]["audit_action_type"]
          api_endpoint?: string | null
          details?: Json | null
          device_fingerprint?: string | null
          field_changes?: Json | null
          id?: string
          ip_address?: unknown
          new_status?: Database["public"]["Enums"]["transaction_status"] | null
          performed_at?: string
          performed_by?: string
          previous_status?:
            | Database["public"]["Enums"]["transaction_status"]
            | null
          session_id?: string | null
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
          customer_id: string | null
          customer_id_number: string | null
          customer_id_type: string | null
          customer_id_verified_by: string | null
          customer_name: string | null
          drawer_session_id: string
          foreign_amount: number
          foreign_currency_code: string
          id: string
          last_viewed_at: string | null
          operator_id: string
          original_transaction_id: string | null
          rate_id: string | null
          rate_override_approved_by: string | null
          rate_override_reason: string | null
          rate_override_source: string | null
          rate_used: number
          reference_number: string
          session_device_fingerprint: string | null
          session_ip_address: unknown
          session_user_agent: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          view_count: number
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
          customer_id?: string | null
          customer_id_number?: string | null
          customer_id_type?: string | null
          customer_id_verified_by?: string | null
          customer_name?: string | null
          drawer_session_id: string
          foreign_amount: number
          foreign_currency_code: string
          id?: string
          last_viewed_at?: string | null
          operator_id: string
          original_transaction_id?: string | null
          rate_id?: string | null
          rate_override_approved_by?: string | null
          rate_override_reason?: string | null
          rate_override_source?: string | null
          rate_used: number
          reference_number: string
          session_device_fingerprint?: string | null
          session_ip_address?: unknown
          session_user_agent?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          view_count?: number
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
          customer_id?: string | null
          customer_id_number?: string | null
          customer_id_type?: string | null
          customer_id_verified_by?: string | null
          customer_name?: string | null
          drawer_session_id?: string
          foreign_amount?: number
          foreign_currency_code?: string
          id?: string
          last_viewed_at?: string | null
          operator_id?: string
          original_transaction_id?: string | null
          rate_id?: string | null
          rate_override_approved_by?: string | null
          rate_override_reason?: string | null
          rate_override_source?: string | null
          rate_used?: number
          reference_number?: string
          session_device_fingerprint?: string | null
          session_ip_address?: unknown
          session_user_agent?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          view_count?: number
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
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
            foreignKeyName: "transactions_rate_override_approved_by_fkey"
            columns: ["rate_override_approved_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
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
      active_suspicious_patterns: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          metadata: Json | null
          name: string | null
          pattern_type:
            | Database["public"]["Enums"]["suspicious_pattern_type"]
            | null
          severity: Database["public"]["Enums"]["pattern_severity"] | null
          thresholds: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_patterns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      high_risk_customers: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          is_on_watchlist: boolean | null
          last_name: string | null
          phone: string | null
          risk_level: Database["public"]["Enums"]["customer_risk_level"] | null
          risk_score: number | null
          total_gbp_volume: number | null
          transaction_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decrypt_pii: { Args: { ciphertext: string }; Returns: string }
      encrypt_pii: { Args: { plaintext: string }; Returns: string }
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
      get_customer_with_decrypted_data: {
        Args: { customer_id: string }
        Returns: {
          address: string
          branch_id: string
          created_at: string
          date_of_birth: string
          email: string
          first_name: string
          id: string
          id_number: string
          id_type: string
          is_on_watchlist: boolean
          last_name: string
          phone: string
          risk_level: Database["public"]["Enums"]["customer_risk_level"]
          risk_score: number
          total_gbp_volume: number
          transaction_count: number
          updated_at: string
          watchlist_reason: string
        }[]
      }
      get_encryption_key: { Args: never; Returns: string }
      has_role_or_higher: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      has_role_or_lower: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_active_staff: { Args: never; Returns: boolean }
      search_customers_by_name: {
        Args: { search_branch_id?: string; search_term: string }
        Returns: {
          email: string
          first_name: string
          id: string
          is_on_watchlist: boolean
          last_name: string
          phone: string
          risk_level: Database["public"]["Enums"]["customer_risk_level"]
          risk_score: number
        }[]
      }
    }
    Enums: {
      audit_action_type:
        | "create"
        | "update"
        | "delete"
        | "view"
        | "void"
        | "refund"
        | "export"
      customer_relationship_type:
        | "same_id"
        | "same_address"
        | "same_phone"
        | "linked_transactions"
        | "manual_flag"
      customer_risk_factor_type:
        | "structuring"
        | "velocity"
        | "high_risk"
        | "back_to_back"
        | "group_transaction"
        | "unusual_behavior"
        | "watchlist_match"
      customer_risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      denomination_type: "note" | "coin"
      drawer_session_status: "open" | "closed" | "suspended"
      pattern_severity: "HIGH" | "MEDIUM" | "LOW"
      rate_source: "manual" | "feed" | "override"
      suspicious_pattern_type:
        | "structuring"
        | "velocity"
        | "back_to_back"
        | "group"
        | "unusual"
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
      audit_action_type: [
        "create",
        "update",
        "delete",
        "view",
        "void",
        "refund",
        "export",
      ],
      customer_relationship_type: [
        "same_id",
        "same_address",
        "same_phone",
        "linked_transactions",
        "manual_flag",
      ],
      customer_risk_factor_type: [
        "structuring",
        "velocity",
        "high_risk",
        "back_to_back",
        "group_transaction",
        "unusual_behavior",
        "watchlist_match",
      ],
      customer_risk_level: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      denomination_type: ["note", "coin"],
      drawer_session_status: ["open", "closed", "suspended"],
      pattern_severity: ["HIGH", "MEDIUM", "LOW"],
      rate_source: ["manual", "feed", "override"],
      suspicious_pattern_type: [
        "structuring",
        "velocity",
        "back_to_back",
        "group",
        "unusual",
      ],
      transaction_status: ["completed", "voided", "refunded"],
      transaction_type: ["buy", "sell"],
      user_role: ["operator", "supervisor", "manager", "admin"],
    },
  },
} as const
