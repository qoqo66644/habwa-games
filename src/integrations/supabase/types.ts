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
  public: {
    Tables: {
      activation_keys: {
        Row: {
          created_at: string
          help_call_used: boolean
          help_pit_used: boolean
          help_two_answers_used: boolean
          id: string
          is_active: boolean
          key: string
          remaining_uses: number
          used_question_ids: string[]
        }
        Insert: {
          created_at?: string
          help_call_used?: boolean
          help_pit_used?: boolean
          help_two_answers_used?: boolean
          id?: string
          is_active?: boolean
          key: string
          remaining_uses?: number
          used_question_ids?: string[]
        }
        Update: {
          created_at?: string
          help_call_used?: boolean
          help_pit_used?: boolean
          help_two_answers_used?: boolean
          id?: string
          is_active?: boolean
          key?: string
          remaining_uses?: number
          used_question_ids?: string[]
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: boolean
          pin: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          pin: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          pin?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon_key: string | null
          icon_url: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_key?: string | null
          icon_url?: string | null
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_key?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          activation_key: string
          active_board: Json
          created_at: string
          game_name: string
          id: string
          replay_count: number
          selected_categories: string[]
          starting_team_index: number
          team_names: string[]
          updated_at: string
        }
        Insert: {
          activation_key: string
          active_board?: Json
          created_at?: string
          game_name?: string
          id?: string
          replay_count?: number
          selected_categories?: string[]
          starting_team_index?: number
          team_names?: string[]
          updated_at?: string
        }
        Update: {
          activation_key?: string
          active_board?: Json
          created_at?: string
          game_name?: string
          id?: string
          replay_count?: number
          selected_categories?: string[]
          starting_team_index?: number
          team_names?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_activation_key_fkey"
            columns: ["activation_key"]
            isOneToOne: false
            referencedRelation: "activation_keys"
            referencedColumns: ["key"]
          },
        ]
      }
      played_questions: {
        Row: {
          id: string
          played_at: string
          question_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          played_at?: string
          question_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          played_at?: string
          question_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      played_questions_backup_20260930: {
        Row: {
          id: string | null
          played_at: string | null
          question_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string | null
          played_at?: string | null
          question_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string | null
          played_at?: string | null
          question_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string
          answer_image_url: string | null
          answer_video_url: string | null
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          level: number
          qr_enabled: boolean
          qr_expires_at: string | null
          qr_token: string
          question: string
          video_url: string | null
        }
        Insert: {
          answer: string
          answer_image_url?: string | null
          answer_video_url?: string | null
          category_id?: string | null
          created_at?: string
          id: string
          image_url?: string | null
          level: number
          qr_enabled?: boolean
          qr_expires_at?: string | null
          qr_token?: string
          question: string
          video_url?: string | null
        }
        Update: {
          answer?: string
          answer_image_url?: string | null
          answer_video_url?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          level?: number
          qr_enabled?: boolean
          qr_expires_at?: string | null
          qr_token?: string
          question?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_habwa_games: {
        Args: { p_key: string }
        Returns: {
          activation_key: string
          active_board: Json
          created_at: string
          game_name: string
          id: string
          replay_count: number
          selected_categories: string[]
          starting_team_index: number
          team_names: string[]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "game_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_habwa_qr_content: {
        Args: { p_token: string }
        Returns: {
          answer: string
          answer_image_url: string
          answer_video_url: string
        }[]
      }
      replay_habwa_game: {
        Args: { p_game_id: string; p_key: string }
        Returns: {
          activation_key: string
          active_board: Json
          created_at: string
          game_name: string
          id: string
          replay_count: number
          selected_categories: string[]
          starting_team_index: number
          team_names: string[]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "game_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      start_habwa_game: {
        Args: {
          p_active_board: Json
          p_game_name: string
          p_key: string
          p_selected_categories: string[]
          p_starting_team_index: number
          p_team_names: string[]
        }
        Returns: {
          game_id: string
          remaining_uses: number
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
