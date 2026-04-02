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
      airtime_payouts: {
        Row: {
          amount: number
          created_at: string | null
          error: string | null
          id: string
          network: string | null
          phone: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          error?: string | null
          id?: string
          network?: string | null
          phone: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          error?: string | null
          id?: string
          network?: string | null
          phone?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          payment_ref: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_ref?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_ref?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      credits_wallet: {
        Row: {
          ads_free_until: string | null
          balance: number
          created_at: string | null
          id: string
          last_daily_credit: string | null
          reward_balance: number
          reward_expires_at: string | null
          total_purchased: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ads_free_until?: string | null
          balance?: number
          created_at?: string | null
          id?: string
          last_daily_credit?: string | null
          reward_balance?: number
          reward_expires_at?: string | null
          total_purchased?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ads_free_until?: string | null
          balance?: number
          created_at?: string | null
          id?: string
          last_daily_credit?: string | null
          reward_balance?: number
          reward_expires_at?: string | null
          total_purchased?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          credits: number
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          flw_ref: string | null
          flw_tx_id: string | null
          grants_hub_access: boolean | null
          id: string
          package_name: string
          payment_method: string | null
          status: string
          tx_ref: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          credits: number
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          flw_ref?: string | null
          flw_tx_id?: string | null
          grants_hub_access?: boolean | null
          id?: string
          package_name: string
          payment_method?: string | null
          status?: string
          tx_ref: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credits?: number
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          flw_ref?: string | null
          flw_tx_id?: string | null
          grants_hub_access?: boolean | null
          id?: string
          package_name?: string
          payment_method?: string | null
          status?: string
          tx_ref?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          total_score: number | null
          total_tests_taken: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          total_score?: number | null
          total_tests_taken?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          total_score?: number | null
          total_tests_taken?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_banks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_cache: {
        Row: {
          content_hash: string
          created_at: string | null
          generation_count: number
          id: string
          last_used_at: string | null
          questions: Json
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          generation_count?: number
          id?: string
          last_used_at?: string | null
          questions?: Json
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          generation_count?: number
          id?: string
          last_used_at?: string | null
          questions?: Json
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_number: number
          question_text: string
          test_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_number: number
          question_text: string
          test_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_number?: number
          question_text?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          correct_answers: number
          guest_name: string | null
          id: string
          score: number
          share_code: string
          total_questions: number
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          correct_answers?: number
          guest_name?: string | null
          id?: string
          score?: number
          share_code: string
          total_questions?: number
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          correct_answers?: number
          guest_name?: string | null
          id?: string
          score?: number
          share_code?: string
          total_questions?: number
          user_id?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          total_airtime_earned: number
          total_referrals: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          total_airtime_earned?: number
          total_referrals?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          total_airtime_earned?: number
          total_referrals?: number
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          airtime_amount: number | null
          airtime_sent_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_tier: number | null
          status: string
        }
        Insert: {
          airtime_amount?: number | null
          airtime_sent_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          reward_tier?: number | null
          status?: string
        }
        Update: {
          airtime_amount?: number | null
          airtime_sent_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          reward_tier?: number | null
          status?: string
        }
        Relationships: []
      }
      resource_bank: {
        Row: {
          ai_category: string | null
          ai_summary: string | null
          country: string | null
          created_at: string | null
          description: string | null
          exam: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_flagged: boolean
          subject: string | null
          test_gen_count: number
          title: string
          topic: string | null
          upload_count: number
          user_id: string
        }
        Insert: {
          ai_category?: string | null
          ai_summary?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          exam?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_flagged?: boolean
          subject?: string | null
          test_gen_count?: number
          title: string
          topic?: string | null
          upload_count?: number
          user_id: string
        }
        Update: {
          ai_category?: string | null
          ai_summary?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          exam?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_flagged?: boolean
          subject?: string | null
          test_gen_count?: number
          title?: string
          topic?: string | null
          upload_count?: number
          user_id?: string
        }
        Relationships: []
      }
      saved_questions: {
        Row: {
          bank_id: string
          correct_answer: string
          created_at: string | null
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
        }
        Insert: {
          bank_id: string
          correct_answer: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_text: string
        }
        Update: {
          bank_id?: string
          correct_answer?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_questions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "question_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          answers: Json | null
          completed_at: string | null
          correct_answers: number
          id: string
          score: number
          test_id: string
          time_taken_seconds: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          correct_answers?: number
          id?: string
          score?: number
          test_id: string
          time_taken_seconds?: number | null
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          correct_answers?: number
          id?: string
          score?: number
          test_id?: string
          time_taken_seconds?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          content_hash: string | null
          created_at: string | null
          duration_minutes: number
          id: string
          is_public: boolean
          num_questions: number
          question_format: string
          share_code: string | null
          source_content: string | null
          source_resource_id: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string | null
          duration_minutes?: number
          id?: string
          is_public?: boolean
          num_questions?: number
          question_format?: string
          share_code?: string | null
          source_content?: string | null
          source_resource_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string | null
          duration_minutes?: number
          id?: string
          is_public?: boolean
          num_questions?: number
          question_format?: string
          share_code?: string | null
          source_content?: string | null
          source_resource_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          provider: string
          status: string | null
          tx_ref: string | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          status?: string | null
          tx_ref?: string | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          status?: string | null
          tx_ref?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits:
        | { Args: { p_credits: number; p_user_id: string }; Returns: undefined }
        | {
            Args: {
              p_credits: number
              p_description?: string
              p_payment_ref?: string
              p_type?: string
              p_user_id: string
            }
            Returns: undefined
          }
      add_reward_credits: {
        Args: { p_credits: number; p_type?: string; p_user_id: string }
        Returns: undefined
      }
      create_referral_code: { Args: { p_user_id: string }; Returns: string }
      deduct_credit: { Args: { p_user_id: string }; Returns: undefined }
      fulfil_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_flw_ref: string
          p_flw_tx_id: string
          p_method: string
          p_status: string
          p_tx_ref: string
        }
        Returns: Json
      }
      generate_share_code: { Args: never; Returns: string }
      get_leaderboard: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          avg_score: number
          display_name: string
          total_tests: number
          user_id: string
        }[]
      }
      get_test_questions: {
        Args: { p_test_id: string }
        Returns: {
          explanation: string
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_number: number
          question_text: string
          test_id: string
        }[]
      }
      grant_hub_access: {
        Args: { p_credits: number; p_user_id: string }
        Returns: undefined
      }
      qualify_referral: { Args: { p_referred_id: string }; Returns: undefined }
      submit_test_answers: {
        Args: { p_test_id: string; p_user_answers: Json }
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
    Enums: {},
  },
} as const
