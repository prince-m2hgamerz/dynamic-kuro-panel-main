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
      api_audit_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          request_data: Json | null
          success: boolean | null
          user_key: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          request_data?: Json | null
          success?: boolean | null
          user_key?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          request_data?: Json | null
          success?: boolean | null
          user_key?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      approved_packages: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          package_name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          package_name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          package_name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Relationships: []
      }
      failed_auth_attempts: {
        Row: {
          attempt_count: number | null
          first_attempt_at: string | null
          id: string
          ip_address: unknown
          last_attempt_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          first_attempt_at?: string | null
          id?: string
          ip_address: unknown
          last_attempt_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          first_attempt_at?: string | null
          id?: string
          ip_address?: unknown
          last_attempt_at?: string | null
        }
        Relationships: []
      }
      failed_registration_attempts: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          first_attempt_at: string
          id: string
          ip_address: unknown
          last_attempt_at: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          ip_address: unknown
          last_attempt_at?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          first_attempt_at?: string
          id?: string
          ip_address?: unknown
          last_attempt_at?: string
        }
        Relationships: []
      }
      frontend_rate_limits: {
        Row: {
          ip_address: unknown
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          ip_address: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          ip_address?: unknown
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string | null
          created_by: string | null
          icon_url: string | null
          id: string
          mod_name: string | null
          name: string
          status: Database["public"]["Enums"]["game_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          icon_url?: string | null
          id?: string
          mod_name?: string | null
          name: string
          status?: Database["public"]["Enums"]["game_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          icon_url?: string | null
          id?: string
          mod_name?: string | null
          name?: string
          status?: Database["public"]["Enums"]["game_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ip_blacklist: {
        Row: {
          blocked_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          reason: string | null
        }
        Insert: {
          blocked_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address: unknown
          reason?: string | null
        }
        Update: {
          blocked_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          reason?: string | null
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          ip_address: unknown
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address: unknown
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address?: unknown
        }
        Relationships: []
      }
      key_activations: {
        Row: {
          activated_at: string | null
          device_fingerprint: string
          device_info: Json | null
          id: string
          ip_address: unknown
          key_id: string
          last_seen: string | null
        }
        Insert: {
          activated_at?: string | null
          device_fingerprint: string
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          key_id: string
          last_seen?: string | null
        }
        Update: {
          activated_at?: string | null
          device_fingerprint?: string
          device_info?: Json | null
          id?: string
          ip_address?: unknown
          key_id?: string
          last_seen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_activations_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "license_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_activations_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "license_keys_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      license_keys: {
        Row: {
          activated_at: string | null
          bot_id: string | null
          created_at: string | null
          created_by: string | null
          duration_hours: number
          expires_at: string | null
          game_id: string
          id: string
          key_code: string
          max_devices: number | null
          notified_1h: boolean | null
          notified_24h: boolean | null
          notified_6h: boolean | null
          package_restricted: boolean
          price: number | null
          status: Database["public"]["Enums"]["key_status"] | null
          telegram_id: number | null
          telegram_username: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          bot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_hours: number
          expires_at?: string | null
          game_id: string
          id?: string
          key_code: string
          max_devices?: number | null
          notified_1h?: boolean | null
          notified_24h?: boolean | null
          notified_6h?: boolean | null
          package_restricted?: boolean
          price?: number | null
          status?: Database["public"]["Enums"]["key_status"] | null
          telegram_id?: number | null
          telegram_username?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          bot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_hours?: number
          expires_at?: string | null
          game_id?: string
          id?: string
          key_code?: string
          max_devices?: number | null
          notified_1h?: boolean | null
          notified_24h?: boolean | null
          notified_6h?: boolean | null
          package_restricted?: boolean
          price?: number | null
          status?: Database["public"]["Enums"]["key_status"] | null
          telegram_id?: number | null
          telegram_username?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_keys_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_keys_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_keys_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_access: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      owner_otp_codes: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          otp_code: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          otp_code: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      panel_licenses: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          license_key: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          license_key: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          license_key?: string
        }
        Relationships: []
      }
      pending_payments: {
        Row: {
          admin_action_token: string | null
          admin_message_id: number | null
          amount: number
          bot_id: string | null
          created_at: string | null
          duration: string
          expires_at: string
          id: string
          status: string | null
          telegram_id: number
          telegram_username: string | null
          transaction_id: string | null
          user_type: string
        }
        Insert: {
          admin_action_token?: string | null
          admin_message_id?: number | null
          amount: number
          bot_id?: string | null
          created_at?: string | null
          duration: string
          expires_at: string
          id?: string
          status?: string | null
          telegram_id: number
          telegram_username?: string | null
          transaction_id?: string | null
          user_type?: string
        }
        Update: {
          admin_action_token?: string | null
          admin_message_id?: number | null
          amount?: number
          bot_id?: string | null
          created_at?: string | null
          duration?: string
          expires_at?: string
          id?: string
          status?: string | null
          telegram_id?: number
          telegram_username?: string | null
          transaction_id?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_payments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_payments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      price_settings: {
        Row: {
          bot_id: string | null
          created_at: string | null
          duration_hours: number
          game_id: string
          id: string
          price: number
          updated_at: string | null
        }
        Insert: {
          bot_id?: string | null
          created_at?: string | null
          duration_hours: number
          game_id: string
          id?: string
          price: number
          updated_at?: string | null
        }
        Update: {
          bot_id?: string | null
          created_at?: string | null
          duration_hours?: number
          game_id?: string
          id?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_settings_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_settings_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_settings_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_expires_at: string | null
          balance: number | null
          created_at: string | null
          id: string
          invited_by: string | null
          is_hidden: boolean | null
          last_login: string | null
          otp_bot_token: string | null
          otp_webhook_set: boolean | null
          panel_name: string
          referral_applied: boolean
          requires_otp: boolean | null
          status: Database["public"]["Enums"]["user_status"] | null
          telegram_chat_id: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          username: string
        }
        Insert: {
          account_expires_at?: string | null
          balance?: number | null
          created_at?: string | null
          id: string
          invited_by?: string | null
          is_hidden?: boolean | null
          last_login?: string | null
          otp_bot_token?: string | null
          otp_webhook_set?: boolean | null
          panel_name?: string
          referral_applied?: boolean
          requires_otp?: boolean | null
          status?: Database["public"]["Enums"]["user_status"] | null
          telegram_chat_id?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username: string
        }
        Update: {
          account_expires_at?: string | null
          balance?: number | null
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_hidden?: boolean | null
          last_login?: string | null
          otp_bot_token?: string | null
          otp_webhook_set?: boolean | null
          panel_name?: string
          referral_applied?: boolean
          requires_otp?: boolean | null
          status?: Database["public"]["Enums"]["user_status"] | null
          telegram_chat_id?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          assigned_role: string | null
          code: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          initial_balance: number | null
          is_active: boolean | null
          max_uses: number | null
          times_used: number | null
        }
        Insert: {
          assigned_role?: string | null
          code: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          max_uses?: number | null
          times_used?: number | null
        }
        Update: {
          assigned_role?: string | null
          code?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          max_uses?: number | null
          times_used?: number | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Relationships: []
      }
      server_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      songs: {
        Row: {
          created_at: string
          created_by: string | null
          file_url: string
          id: string
          is_active: boolean | null
          is_owner_song: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_url: string
          id?: string
          is_active?: boolean | null
          is_owner_song?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          is_owner_song?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_bot_users: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          telegram_id: number
          username: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          telegram_id: number
          username?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          telegram_id?: number
          username?: string | null
        }
        Relationships: []
      }
      telegram_bots: {
        Row: {
          admin_chat_id: number
          bot_token: string
          contact_url: string | null
          created_at: string | null
          created_by: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          upi_id: string
          upi_name: string
          webhook_url: string | null
        }
        Insert: {
          admin_chat_id: number
          bot_token: string
          contact_url?: string | null
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          upi_id: string
          upi_name: string
          webhook_url?: string | null
        }
        Update: {
          admin_chat_id?: number
          bot_token?: string
          contact_url?: string | null
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          upi_id?: string
          upi_name?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      two_factor_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      key_activations_safe: {
        Row: {
          activated_at: string | null
          device_fingerprint: string | null
          device_info: Json | null
          id: string | null
          ip_address: string | null
          key_id: string | null
          last_seen: string | null
        }
        Insert: {
          activated_at?: string | null
          device_fingerprint?: never
          device_info?: never
          id?: string | null
          ip_address?: never
          key_id?: string | null
          last_seen?: string | null
        }
        Update: {
          activated_at?: string | null
          device_fingerprint?: never
          device_info?: never
          id?: string | null
          ip_address?: never
          key_id?: string | null
          last_seen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_activations_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "license_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_activations_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "license_keys_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      license_keys_safe: {
        Row: {
          activated_at: string | null
          bot_id: string | null
          created_at: string | null
          created_by: string | null
          duration_hours: number | null
          expires_at: string | null
          game_id: string | null
          id: string | null
          key_code: string | null
          max_devices: number | null
          notified_1h: boolean | null
          notified_24h: boolean | null
          notified_6h: boolean | null
          price: number | null
          status: Database["public"]["Enums"]["key_status"] | null
          telegram_id: number | null
          telegram_username: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          bot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          game_id?: string | null
          id?: string | null
          key_code?: string | null
          max_devices?: number | null
          notified_1h?: boolean | null
          notified_24h?: boolean | null
          notified_6h?: boolean | null
          price?: number | null
          status?: Database["public"]["Enums"]["key_status"] | null
          telegram_id?: never
          telegram_username?: never
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          bot_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          game_id?: string | null
          id?: string | null
          key_code?: string | null
          max_devices?: number | null
          notified_1h?: boolean | null
          notified_24h?: boolean | null
          notified_6h?: boolean | null
          price?: number | null
          status?: Database["public"]["Enums"]["key_status"] | null
          telegram_id?: never
          telegram_username?: never
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_keys_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_keys_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "telegram_bots_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_keys_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_safe: {
        Row: {
          account_expires_at: string | null
          balance: number | null
          created_at: string | null
          id: string | null
          invited_by: string | null
          is_hidden: boolean | null
          last_login: string | null
          panel_name: string | null
          referral_applied: boolean | null
          requires_otp: boolean | null
          status: Database["public"]["Enums"]["user_status"] | null
          telegram_chat_id: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          account_expires_at?: never
          balance?: never
          created_at?: string | null
          id?: string | null
          invited_by?: string | null
          is_hidden?: boolean | null
          last_login?: string | null
          panel_name?: string | null
          referral_applied?: boolean | null
          requires_otp?: boolean | null
          status?: Database["public"]["Enums"]["user_status"] | null
          telegram_chat_id?: never
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          account_expires_at?: never
          balance?: never
          created_at?: string | null
          id?: string | null
          invited_by?: string | null
          is_hidden?: boolean | null
          last_login?: string | null
          panel_name?: string | null
          referral_applied?: boolean | null
          requires_otp?: boolean | null
          status?: Database["public"]["Enums"]["user_status"] | null
          telegram_chat_id?: never
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_bots_safe: {
        Row: {
          admin_chat_id: number | null
          contact_url: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          updated_at: string | null
          upi_id: string | null
          upi_name: string | null
          webhook_url: string | null
        }
        Insert: {
          admin_chat_id?: number | null
          contact_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
          upi_id?: string | null
          upi_name?: string | null
          webhook_url?: string | null
        }
        Update: {
          admin_chat_id?: number | null
          contact_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          updated_at?: string | null
          upi_id?: string | null
          upi_name?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_frontend_access: {
        Args: { client_ip: unknown; max_requests?: number }
        Returns: Json
      }
      check_ip_lockdown: { Args: { client_ip: unknown }; Returns: Json }
      check_maintenance_access: { Args: { _user_id: string }; Returns: boolean }
      cleanup_frontend_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_key_activations: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      get_game_prices: { Args: { p_game_id: string }; Returns: Json }
      get_key_price: {
        Args: { p_duration_hours: number; p_game_id: string }
        Returns: number
      }
      get_maintenance_settings: { Args: never; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_referral_usage: {
        Args: { code_id: string }
        Returns: undefined
      }
      is_ghost_owner: { Args: { _user_id: string }; Returns: boolean }
      is_ghost_user: { Args: { _user_id: string }; Returns: boolean }
      log_security_event: {
        Args: {
          _details?: Json
          _event_type: string
          _ip_address?: unknown
          _user_id?: string
        }
        Returns: undefined
      }
      mask_device_fingerprint: {
        Args: { fp: string; viewer_id: string }
        Returns: string
      }
      mask_ip_address: {
        Args: { ip: unknown; viewer_id: string }
        Returns: string
      }
      mask_session_token: {
        Args: {
          token: string
          viewer_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      mask_telegram_id: {
        Args: { chat_id: string; profile_id: string; viewer_id: string }
        Returns: string
      }
      mask_telegram_numeric_id: {
        Args: { key_creator: string; tg_id: number; viewer_id: string }
        Returns: number
      }
      mask_telegram_username: {
        Args: { key_creator: string; username: string; viewer_id: string }
        Returns: string
      }
      register_user_ip: {
        Args: { _user_id: string; client_ip: unknown }
        Returns: undefined
      }
      validate_referral_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role: "owner" | "admin" | "user" | "co_owner" | "reseller"
      game_status: "active" | "inactive" | "maintenance"
      key_status: "active" | "paused" | "expired" | "revoked"
      user_status: "active" | "banned" | "suspended"
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
      app_role: ["owner", "admin", "user", "co_owner", "reseller"],
      game_status: ["active", "inactive", "maintenance"],
      key_status: ["active", "paused", "expired", "revoked"],
      user_status: ["active", "banned", "suspended"],
    },
  },
} as const
