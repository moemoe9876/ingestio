export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      documents: {
        Row: {
          created_at: string
          file_size: number
          id: string
          mime_type: string
          original_filename: string
          page_count: number
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size: number
          id?: string
          mime_type: string
          original_filename: string
          page_count: number
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_filename?: string
          page_count?: number
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_profiles_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      exports: {
        Row: {
          created_at: string
          document_ids: string[]
          file_path: string | null
          format: Database["public"]["Enums"]["export_format"]
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_ids: string[]
          file_path?: string | null
          format: Database["public"]["Enums"]["export_format"]
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_ids?: string[]
          file_path?: string | null
          format?: Database["public"]["Enums"]["export_format"]
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_user_id_profiles_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      extracted_data: {
        Row: {
          created_at: string
          data: Json
          document_id: string
          document_type: string | null
          extraction_job_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          document_id: string
          document_type?: string | null
          extraction_job_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          document_id?: string
          document_type?: string | null
          extraction_job_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_data_document_id_documents_id_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_data_extraction_job_id_extraction_jobs_id_fk"
            columns: ["extraction_job_id"]
            isOneToOne: false
            referencedRelation: "extraction_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_data_user_id_profiles_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      extraction_batches: {
        Row: {
          completed_count: number
          created_at: string
          document_count: number
          failed_count: number
          id: string
          name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_count?: number
          created_at?: string
          document_count?: number
          failed_count?: number
          id?: string
          name?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_count?: number
          created_at?: string
          document_count?: number
          failed_count?: number
          id?: string
          name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_batches_user_id_profiles_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      extraction_jobs: {
        Row: {
          batch_id: string | null
          created_at: string
          document_id: string
          error_message: string | null
          extraction_options: Json
          extraction_prompt: string | null
          id: string
          status: Database["public"]["Enums"]["extraction_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          document_id: string
          error_message?: string | null
          extraction_options?: Json
          extraction_prompt?: string | null
          id?: string
          status?: Database["public"]["Enums"]["extraction_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          document_id?: string
          error_message?: string | null
          extraction_options?: Json
          extraction_prompt?: string | null
          id?: string
          status?: Database["public"]["Enums"]["extraction_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_jobs_batch_id_extraction_batches_id_fk"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "extraction_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_jobs_document_id_documents_id_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_jobs_user_id_profiles_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          membership: Database["public"]["Enums"]["membership"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          membership?: Database["public"]["Enums"]["membership"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          membership?: Database["public"]["Enums"]["membership"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_user_id_users_user_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_usage: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          pages_limit: number
          pages_processed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          pages_limit: number
          pages_processed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          pages_limit?: number
          pages_processed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_usage_user_id_profiles_user_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      debug_storage_rls_check: {
        Args: { user_id: string; path: string }
        Returns: boolean
      }
      get_my_auth_uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_storage_foldername: {
        Args: { path: string }
        Returns: string
      }
    }
    Enums: {
      batch_status:
        | "created"
        | "processing"
        | "completed"
        | "failed"
        | "partially_completed"
      document_status: "uploaded" | "processing" | "completed" | "failed"
      export_format: "json" | "csv" | "excel"
      export_status: "processing" | "completed" | "failed"
      extraction_status: "queued" | "processing" | "completed" | "failed"
      membership: "free" | "pro" | "starter" | "plus" | "growth"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      batch_status: [
        "created",
        "processing",
        "completed",
        "failed",
        "partially_completed",
      ],
      document_status: ["uploaded", "processing", "completed", "failed"],
      export_format: ["json", "csv", "excel"],
      export_status: ["processing", "completed", "failed"],
      extraction_status: ["queued", "processing", "completed", "failed"],
      membership: ["free", "pro", "starter", "plus", "growth"],
    },
  },
} as const
