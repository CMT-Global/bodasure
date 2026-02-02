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
      audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          county_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          county_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          county_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      counties: {
        Row: {
          address: string | null
          code: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          status: Database["public"]["Enums"]["county_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["county_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          status?: Database["public"]["Enums"]["county_status"]
          updated_at?: string
        }
        Relationships: []
      }
      motorbikes: {
        Row: {
          chassis_number: string | null
          color: string | null
          county_id: string
          created_at: string
          engine_number: string | null
          id: string
          make: string | null
          model: string | null
          owner_id: string
          photo_url: string | null
          qr_code: string | null
          registration_number: string
          rider_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          year: number | null
        }
        Insert: {
          chassis_number?: string | null
          color?: string | null
          county_id: string
          created_at?: string
          engine_number?: string | null
          id?: string
          make?: string | null
          model?: string | null
          owner_id: string
          photo_url?: string | null
          qr_code?: string | null
          registration_number: string
          rider_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          year?: number | null
        }
        Update: {
          chassis_number?: string | null
          color?: string | null
          county_id?: string
          created_at?: string
          engine_number?: string | null
          id?: string
          make?: string | null
          model?: string | null
          owner_id?: string
          photo_url?: string | null
          qr_code?: string | null
          registration_number?: string
          rider_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "motorbikes_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motorbikes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motorbikes_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          address: string | null
          county_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_number: string
          phone: string
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          county_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          id_number: string
          phone: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          county_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string
          phone?: string
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owners_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          county_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          permit_id: string | null
          provider: string | null
          provider_reference: string | null
          rider_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          county_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          permit_id?: string | null
          provider?: string | null
          provider_reference?: string | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          county_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          permit_id?: string | null
          provider?: string | null
          provider_reference?: string | null
          rider_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      penalties: {
        Row: {
          amount: number
          county_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_paid: boolean
          issued_by: string | null
          paid_at: string | null
          payment_id: string | null
          penalty_type: string
          rider_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          county_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean
          issued_by?: string | null
          paid_at?: string | null
          payment_id?: string | null
          penalty_type: string
          rider_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          county_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_paid?: boolean
          issued_by?: string | null
          paid_at?: string | null
          payment_id?: string | null
          penalty_type?: string
          rider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalties_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_types: {
        Row: {
          amount: number
          county_id: string
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount: number
          county_id: string
          created_at?: string
          description?: string | null
          duration_days: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          county_id?: string
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_types_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      permits: {
        Row: {
          amount_paid: number | null
          county_id: string
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string | null
          motorbike_id: string
          permit_number: string
          permit_type_id: string
          rider_id: string
          status: Database["public"]["Enums"]["permit_status"]
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          county_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          motorbike_id: string
          permit_number: string
          permit_type_id: string
          rider_id: string
          status?: Database["public"]["Enums"]["permit_status"]
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          county_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          motorbike_id?: string
          permit_number?: string
          permit_type_id?: string
          rider_id?: string
          status?: Database["public"]["Enums"]["permit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permits_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_motorbike_id_fkey"
            columns: ["motorbike_id"]
            isOneToOne: false
            referencedRelation: "motorbikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_permit_type_id_fkey"
            columns: ["permit_type_id"]
            isOneToOne: false
            referencedRelation: "permit_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          county_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          county_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          county_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          address: string | null
          compliance_status: Database["public"]["Enums"]["compliance_status"]
          county_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          id_number: string
          license_expiry: string | null
          license_number: string | null
          owner_id: string | null
          phone: string
          photo_url: string | null
          qr_code: string | null
          sacco_id: string | null
          stage_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          user_id: string | null
          welfare_group_id: string | null
        }
        Insert: {
          address?: string | null
          compliance_status?: Database["public"]["Enums"]["compliance_status"]
          county_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_number: string
          license_expiry?: string | null
          license_number?: string | null
          owner_id?: string | null
          phone: string
          photo_url?: string | null
          qr_code?: string | null
          sacco_id?: string | null
          stage_id?: string | null
          welfare_group_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          compliance_status?: Database["public"]["Enums"]["compliance_status"]
          county_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string
          license_expiry?: string | null
          license_number?: string | null
          owner_id?: string | null
          phone?: string
          photo_url?: string | null
          qr_code?: string | null
          sacco_id?: string | null
          stage_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id?: string | null
          welfare_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_sacco_id_fkey"
            columns: ["sacco_id"]
            isOneToOne: false
            referencedRelation: "saccos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_welfare_group_id_fkey"
            columns: ["welfare_group_id"]
            isOneToOne: false
            referencedRelation: "welfare_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      welfare_groups: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          county_id: string
          created_at: string
          id: string
          name: string
          registration_number: string | null
          settings: Json | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          county_id: string
          created_at?: string
          id?: string
          name: string
          registration_number?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          county_id?: string
          created_at?: string
          id?: string
          name?: string
          registration_number?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "welfare_groups_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      saccos: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          county_id: string
          created_at: string
          id: string
          name: string
          registration_number: string | null
          settings: Json | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          county_id: string
          created_at?: string
          id?: string
          name: string
          registration_number?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          county_id?: string
          created_at?: string
          id?: string
          name?: string
          registration_number?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saccos_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          capacity: number | null
          county_id: string
          created_at: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          sacco_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          welfare_group_id: string | null
        }
        Insert: {
          capacity?: number | null
          county_id: string
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          sacco_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          welfare_group_id?: string | null
        }
        Update: {
          capacity?: number | null
          county_id?: string
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          sacco_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          welfare_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stages_sacco_id_fkey"
            columns: ["sacco_id"]
            isOneToOne: false
            referencedRelation: "saccos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stages_welfare_group_id_fkey"
            columns: ["welfare_group_id"]
            isOneToOne: false
            referencedRelation: "welfare_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          county_id: string | null
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          sacco_id: string | null
          user_id: string
          welfare_group_id: string | null
        }
        Insert: {
          county_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          sacco_id?: string | null
          user_id: string
          welfare_group_id?: string | null
        }
        Update: {
          county_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          sacco_id?: string | null
          user_id?: string
          welfare_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_sacco_id_fkey"
            columns: ["sacco_id"]
            isOneToOne: false
            referencedRelation: "saccos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_welfare_group_id_fkey"
            columns: ["welfare_group_id"]
            isOneToOne: false
            referencedRelation: "welfare_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          body?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sacco_sent_messages: {
        Row: {
          id: string
          county_id: string
          sacco_id: string
          sender_id: string
          subject: string
          body: string | null
          recipient_type: string
          stage_id: string | null
          recipient_count: number
          created_at: string
        }
        Insert: {
          id?: string
          county_id: string
          sacco_id: string
          sender_id: string
          subject: string
          body?: string | null
          recipient_type: string
          stage_id?: string | null
          recipient_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          county_id?: string
          sacco_id?: string
          sender_id?: string
          subject?: string
          body?: string | null
          recipient_type?: string
          stage_id?: string | null
          recipient_count?: number
          created_at?: string
        }
        Relationships: []
      }
      system_role_templates: {
        Row: {
          id: string
          role_key: string
          name: string
          category: string
          locked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          role_key: string
          name: string
          category: string
          locked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role_key?: string
          name?: string
          category?: string
          locked?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_rider_by_plate: { Args: { plate_number: string }; Returns: Json }
      get_public_rider_by_qr: { Args: { qr: string }; Returns: Json }
      get_user_county_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_county: {
        Args: {
          _county_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_county_admin: {
        Args: { _county_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "platform_super_admin"
        | "platform_admin"
        | "county_super_admin"
        | "county_admin"
        | "county_finance_officer"
        | "county_enforcement_officer"
        | "county_registration_agent"
        | "county_analyst"
        | "sacco_admin"
        | "sacco_officer"
        | "welfare_admin"
        | "welfare_officer"
        | "chairman"
        | "vice_chairman"
        | "secretary"
        | "vice_secretary"
        | "treasurer"
        | "vice_treasurer"
        | "general_official"
        | "stage_chairman"
        | "stage_secretary"
        | "stage_treasurer"
        | "stage_assistant"
        | "rider"
        | "owner"
      compliance_status:
        | "compliant"
        | "non_compliant"
        | "pending_review"
        | "blacklisted"
      county_status: "active" | "inactive" | "pending" | "suspended"
      payment_status:
        | "pending"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      permit_status:
        | "active"
        | "expired"
        | "pending"
        | "suspended"
        | "cancelled"
      registration_status: "pending" | "approved" | "rejected" | "suspended"
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
      app_role: [
        "platform_super_admin",
        "platform_admin",
        "county_super_admin",
        "county_admin",
        "county_finance_officer",
        "county_enforcement_officer",
        "county_registration_agent",
        "county_analyst",
        "sacco_admin",
        "sacco_officer",
        "welfare_admin",
        "welfare_officer",
        "chairman",
        "vice_chairman",
        "secretary",
        "vice_secretary",
        "treasurer",
        "vice_treasurer",
        "general_official",
        "stage_chairman",
        "stage_secretary",
        "stage_treasurer",
        "stage_assistant",
        "rider",
        "owner",
      ],
      compliance_status: [
        "compliant",
        "non_compliant",
        "pending_review",
        "blacklisted",
      ],
      county_status: ["active", "inactive", "pending", "suspended"],
      payment_status: [
        "pending",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      permit_status: ["active", "expired", "pending", "suspended", "cancelled"],
      registration_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
