export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          preferred_weight_unit: string
          daily_calorie_goal: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          avatar_url?: string | null
          preferred_weight_unit?: string
          daily_calorie_goal?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          avatar_url?: string | null
          preferred_weight_unit?: string
          daily_calorie_goal?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      partnerships: {
        Row: {
          id: string
          user_one_id: string
          user_two_id: string
          status: Database["public"]["Enums"]["partnership_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_one_id: string
          user_two_id: string
          status?: Database["public"]["Enums"]["partnership_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_one_id?: string
          user_two_id?: string
          status?: Database["public"]["Enums"]["partnership_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      partnership_invites: {
        Row: {
          id: string
          sender_id: string
          recipient_email: string
          status: Database["public"]["Enums"]["partnership_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_email: string
          status?: Database["public"]["Enums"]["partnership_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_email?: string
          status?: Database["public"]["Enums"]["partnership_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          title: string
          workout_date: string
          duration_minutes: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          workout_date?: string
          duration_minutes?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          workout_date?: string
          duration_minutes?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_name: string
          muscle_group: string | null
          exercise_order: number
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_name: string
          muscle_group?: string | null
          exercise_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_name?: string
          muscle_group?: string | null
          exercise_order?: number
          created_at?: string
        }
        Relationships: []
      }
      exercise_sets: {
        Row: {
          id: string
          workout_exercise_id: string
          set_order: number
          reps: number | null
          weight: number | null
          unit: string
          created_at: string
        }
        Insert: {
          id?: string
          workout_exercise_id: string
          set_order?: number
          reps?: number | null
          weight?: number | null
          unit?: string
          created_at?: string
        }
        Update: {
          id?: string
          workout_exercise_id?: string
          set_order?: number
          reps?: number | null
          weight?: number | null
          unit?: string
          created_at?: string
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          id: string
          user_id: string
          entry_date: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          food_name: string
          brand: string | null
          external_food_id: string | null
          source: string
          serving_amount: number
          serving_unit: string
          calories: number
          protein: number
          carbs: number
          fat: number
          fiber: number | null
          sugar: number | null
          sodium: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entry_date?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          food_name: string
          brand?: string | null
          external_food_id?: string | null
          source?: string
          serving_amount?: number
          serving_unit?: string
          calories?: number
          protein?: number
          carbs?: number
          fat?: number
          fiber?: number | null
          sugar?: number | null
          sodium?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entry_date?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          food_name?: string
          brand?: string | null
          external_food_id?: string | null
          source?: string
          serving_amount?: number
          serving_unit?: string
          calories?: number
          protein?: number
          carbs?: number
          fat?: number
          fiber?: number | null
          sugar?: number | null
          sodium?: number | null
          created_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          owner_user_id: string
          title: string
          description: string | null
          goal_type: string | null
          target_value: number
          current_value: number
          unit: string
          deadline: string | null
          is_shared: boolean
          status: Database["public"]["Enums"]["goal_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          title: string
          description?: string | null
          goal_type?: string | null
          target_value: number
          current_value?: number
          unit: string
          deadline?: string | null
          is_shared?: boolean
          status?: Database["public"]["Enums"]["goal_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          title?: string
          description?: string | null
          goal_type?: string | null
          target_value?: number
          current_value?: number
          unit?: string
          deadline?: string | null
          is_shared?: boolean
          status?: Database["public"]["Enums"]["goal_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      nudges: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          message: string
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          message: string
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          message?: string
          created_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_active_partner: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
    }
    Enums: {
      partnership_status: 'pending' | 'active' | 'declined' | 'revoked'
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
      goal_status: 'active' | 'completed' | 'archived'
    }
    CompositeTypes: Record<string, never>
  }
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
