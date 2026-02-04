import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Types
export type UserRole = 'admin' | 'user'
export type UserStatus = 'pending' | 'approved' | 'rejected'
export type RowStatus = 'pending' | 'working' | 'completed' | 'blocked'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  user_color: string
  role: UserRole
  status: UserStatus
  created_at: string
  updated_at: string
}

export interface CSVFile {
  id: string
  name: string
  original_filename: string
  uploaded_by: string | null
  total_rows: number
  completed_rows: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CSVRow {
  id: string
  file_id: string
  row_index: number
  data: Record<string, any>
  status: RowStatus
  assigned_to: string | null
  locked_by: string | null
  locked_at: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  details: Record<string, any> | null
  created_at: string
}

export interface UserStatistics {
  id: string
  user_id: string
  total_completed: number
  total_working: number
  total_blocked: number
  avg_completion_time: string | null
  last_active: string | null
  created_at: string
  updated_at: string
}
