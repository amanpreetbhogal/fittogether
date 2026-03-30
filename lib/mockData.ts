export const mockWorkoutHistory = [
  { date: 'Mon', calories: 420, duration: 52 },
  { date: 'Tue', calories: 0, duration: 0 },
  { date: 'Wed', calories: 380, duration: 45 },
  { date: 'Thu', calories: 510, duration: 61 },
  { date: 'Fri', calories: 290, duration: 38 },
  { date: 'Sat', calories: 640, duration: 75 },
  { date: 'Sun', calories: 0, duration: 0 },
]

export const mockNutritionHistory = [
  { date: 'Mon', calories: 1840, protein: 142, carbs: 180, fat: 62 },
  { date: 'Tue', calories: 2100, protein: 158, carbs: 210, fat: 71 },
  { date: 'Wed', calories: 1920, protein: 148, carbs: 195, fat: 65 },
  { date: 'Thu', calories: 2050, protein: 162, carbs: 205, fat: 68 },
  { date: 'Fri', calories: 1780, protein: 135, carbs: 172, fat: 59 },
  { date: 'Sat', calories: 2200, protein: 170, carbs: 220, fat: 74 },
  { date: 'Sun', calories: 1950, protein: 150, carbs: 198, fat: 66 },
]

export const mockRecentWorkouts = [
  {
    id: '1',
    name: 'Push Day',
    date: '2026-03-28',
    duration_minutes: 52,
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 8, weight: '185 lbs' },
      { name: 'Shoulder Press', sets: 3, reps: 10, weight: '135 lbs' },
      { name: 'Tricep Dips', sets: 3, reps: 12, weight: 'Bodyweight' },
    ]
  },
  {
    id: '2',
    name: 'Leg Day',
    date: '2026-03-26',
    duration_minutes: 61,
    exercises: [
      { name: 'Squats', sets: 4, reps: 6, weight: '225 lbs' },
      { name: 'Romanian Deadlift', sets: 3, reps: 10, weight: '185 lbs' },
      { name: 'Leg Press', sets: 3, reps: 12, weight: '360 lbs' },
    ]
  },
]

export const mockPartner = {
  name: 'Alex Rivera',
  avatar: 'AR',
  streak: 12,
  lastWorkout: '2026-03-28',
  weeklyWorkouts: 5,
  todayCalories: 1920,
}

export const mockGoals = [
  { id: '1', title: 'Bench Press 225 lbs', current: 185, target: 225, unit: 'lbs', shared: true },
  { id: '2', title: 'Run 5K under 25 min', current: 27, target: 25, unit: 'min', shared: true },
  { id: '3', title: 'Lose 10 lbs', current: 4, target: 10, unit: 'lbs', shared: false },
]
