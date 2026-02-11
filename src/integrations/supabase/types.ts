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
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          answer: Json
          answered_at: string
          id: string
          is_correct: boolean | null
          participant_id: string
          question_index: number
          room_id: string
          score: number
          session_number: number
          time_taken_ms: number | null
        }
        Insert: {
          answer?: Json
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          participant_id: string
          question_index: number
          room_id: string
          score?: number
          session_number?: number
          time_taken_ms?: number | null
        }
        Update: {
          answer?: Json
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          participant_id?: string
          question_index?: number
          room_id?: string
          score?: number
          session_number?: number
          time_taken_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          grade_level: string | null
          id: string
          is_published: boolean
          published_at: string | null
          questions: Json
          subject: string | null
          teacher_id: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade_level?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          questions?: Json
          subject?: string | null
          teacher_id: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grade_level?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          questions?: Json
          subject?: string | null
          teacher_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          room_id: string
          student_name: string
          student_session_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          room_id: string
          student_name: string
          student_session_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          room_id?: string
          student_name?: string
          student_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          class_name: string | null
          code: string
          control_mode: string
          created_at: string
          current_question_index: number | null
          ended_at: string | null
          grade: string | null
          id: string
          notes: string | null
          quiz_id: string
          session_number: number
          show_results_to_students: boolean
          started_at: string | null
          status: string
          teacher_id: string
          time_limit_seconds: number | null
        }
        Insert: {
          class_name?: string | null
          code: string
          control_mode?: string
          created_at?: string
          current_question_index?: number | null
          ended_at?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          quiz_id: string
          session_number?: number
          show_results_to_students?: boolean
          started_at?: string | null
          status?: string
          teacher_id: string
          time_limit_seconds?: number | null
        }
        Update: {
          class_name?: string | null
          code?: string
          control_mode?: string
          created_at?: string
          current_question_index?: number | null
          ended_at?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          quiz_id?: string
          session_number?: number
          show_results_to_students?: boolean
          started_at?: string | null
          status?: string
          teacher_id?: string
          time_limit_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_room_code: { Args: never; Returns: string }
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
