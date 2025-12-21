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
      contest_questions: {
        Row: {
          contest_id: string
          created_at: string
          id: string
          order_index: number
          question_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          id?: string
          order_index?: number
          question_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          id?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_questions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_registrations: {
        Row: {
          contest_id: string
          id: string
          registered_at: string
          user_id: string
        }
        Insert: {
          contest_id: string
          id?: string
          registered_at?: string
          user_id: string
        }
        Update: {
          contest_id?: string
          id?: string
          registered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_registrations_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_results: {
        Row: {
          completed_at: string | null
          contest_id: string
          created_at: string
          id: string
          score: number | null
          started_at: string | null
          time_taken_seconds: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contest_id: string
          created_at?: string
          id?: string
          score?: number | null
          started_at?: string | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contest_id?: string
          created_at?: string
          id?: string
          score?: number | null
          started_at?: string | null
          time_taken_seconds?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_results_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          contest_code: string
          contest_type: Database["public"]["Enums"]["contest_type"]
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_published: boolean | null
          name: string
          start_time: string
          status: Database["public"]["Enums"]["contest_status"]
          updated_at: string
        }
        Insert: {
          contest_code: string
          contest_type?: Database["public"]["Enums"]["contest_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean | null
          name: string
          start_time: string
          status?: Database["public"]["Enums"]["contest_status"]
          updated_at?: string
        }
        Update: {
          contest_code?: string
          contest_type?: Database["public"]["Enums"]["contest_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean | null
          name?: string
          start_time?: string
          status?: Database["public"]["Enums"]["contest_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          code_block: string | null
          correct_answer: number
          created_at: string
          created_by: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          options: Json
          question_text: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          code_block?: string | null
          correct_answer: number
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          question_text: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          code_block?: string | null
          correct_answer?: number
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          question_text?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          contest_id: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          contest_id: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_answer: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          contest_id?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      contest_status: "upcoming" | "live" | "ended"
      contest_type: "daily" | "weekly" | "special"
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
      app_role: ["admin", "user"],
      contest_status: ["upcoming", "live", "ended"],
      contest_type: ["daily", "weekly", "special"],
    },
  },
} as const
