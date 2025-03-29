export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          membership: "free" | "basic" | "pro"
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          membership?: "free" | "basic" | "pro"
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          membership?: "free" | "basic" | "pro"
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      membership: "free" | "basic" | "pro"
    }
  }
} 