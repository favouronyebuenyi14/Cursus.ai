export type UserRole = 'university_student' | 'secondary_student' | 'teacher'
export type StudentLevel = '100L' | '200L' | '300L' | '400L' | '500L' | '600L' | '700L'

export interface Profile {
  id: string
  user_id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  university: string | null
  faculty: string | null
  department: string | null
  level: StudentLevel | null
  is_pro: boolean
  pro_expires_at: string | null
  created_at: string
}

export interface Course {
  id: string
  user_id: string
  course_code: string
  course_name: string
  semester: string
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  course_id: string | null
  title: string
  raw_content: string
  ai_expanded_content: string | null
  created_at: string
  updated_at: string
  course?: Course
}

export interface Recording {
  id: string
  user_id: string
  course_id: string | null
  title: string
  audio_url: string
  transcript: string | null
  ai_notes: string | null
  duration_seconds: number
  created_at: string
  course?: Course
}

export interface Document {
  id: string
  user_id: string
  course_id: string | null
  title: string
  file_url: string
  file_type: string
  summary: string | null
  extracted_text?: string | null
  created_at: string
  course?: Course
}

export interface ExamPrep {
  id: string
  user_id: string
  course_id: string | null
  title: string
  materials_urls: string[]
  ai_concentration_areas: string | null
  ai_reading_plan: string | null
  ai_notes: string | null
  exam_date: string | null
  created_at: string
  course?: Course
}

export interface Essay {
  id: string
  user_id: string
  course_id: string | null
  title: string
  topic: string
  outline: string | null
  content: string | null
  citations: string | null
  created_at: string
  updated_at: string
  course?: Course
}

export interface SnapQuery {
  id: string
  user_id: string
  image_url: string
  question: string
  ai_response: string
  course_id: string | null
  created_at: string
}

export interface WaitlistEntry {
  id: string
  email: string
  role: string
  created_at: string
}

// Free tier limits
export const FREE_LIMITS = {
  snapsPerDay: 5,
  pdfsPerDay: 1,
  recordingMinutesPerMonth: 300,
  examPrepPerWeek: 1,
} as const
