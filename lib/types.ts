export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  partner_id?: string
}

export interface Workout {
  id: string
  user_id: string
  name: string
  date: string
  duration_minutes: number
  exercises: WorkoutExercise[]
}

export interface WorkoutExercise {
  id: string
  name: string
  muscle_group: string
  sets: ExerciseSet[]
}

export interface ExerciseSet {
  reps: number
  weight: number
  unit: 'kg' | 'lbs'
}

export interface FoodEntry {
  id: string
  user_id: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_size: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string
  target_value: number
  current_value: number
  unit: string
  deadline: string
  shared_with_partner: boolean
}

export interface Nudge {
  id: string
  from_user_id: string
  to_user_id: string
  message: string
  created_at: string
  read: boolean
}

export interface Exercise {
  name: string
  type: string
  muscle: string
  equipment: string
  difficulty: string
  instructions: string
}

export interface FoodProduct {
  product_name: string
  brands?: string
  nutriments: {
    'energy-kcal_100g'?: number
    'energy-kcal_serving'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
  serving_size?: string
  image_url?: string
}
