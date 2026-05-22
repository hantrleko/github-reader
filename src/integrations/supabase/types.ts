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
      calc_favorites: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          label: string
          tool_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          label: string
          tool_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          label?: string
          tool_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calc_history: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          outputs: Json
          tool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          outputs?: Json
          tool_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          outputs?: Json
          tool_id?: string
          user_id?: string
        }
        Relationships: []
      }
      github_file_notes: {
        Row: {
          branch: string
          created_at: string
          id: string
          note: string
          owner: string
          path: string
          repo: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          branch: string
          created_at?: string
          id?: string
          note?: string
          owner: string
          path: string
          repo: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          note?: string
          owner?: string
          path?: string
          repo?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      github_history: {
        Row: {
          branch: string
          created_at: string
          id: string
          last_opened_at: string
          open_count: number
          owner: string
          repo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch: string
          created_at?: string
          id?: string
          last_opened_at?: string
          open_count?: number
          owner: string
          repo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          last_opened_at?: string
          open_count?: number
          owner?: string
          repo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      github_starred: {
        Row: {
          created_at: string
          default_branch: string | null
          description: string | null
          id: string
          owner: string
          repo: string
          starred_at: string
          stars: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_branch?: string | null
          description?: string | null
          id?: string
          owner: string
          repo: string
          starred_at?: string
          stars?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_branch?: string | null
          description?: string | null
          id?: string
          owner?: string
          repo?: string
          starred_at?: string
          stars?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      glossary_bookmarks: {
        Row: {
          created_at: string
          id: string
          slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_progress: {
        Row: {
          created_at: string
          id: string
          score: number | null
          section_id: string
          status: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score?: number | null
          section_id: string
          status?: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number | null
          section_id?: string
          status?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notebooks: {
        Row: {
          cells: Json
          created_at: string
          forked_from: string | null
          id: string
          is_public: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cells?: Json
          created_at?: string
          forked_from?: string | null
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cells?: Json
          created_at?: string
          forked_from?: string | null
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notebooks_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "user_notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
