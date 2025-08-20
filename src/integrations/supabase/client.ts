import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = "https://jijdxhealttxmugrefte.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppamR4aGVhbHR0eG11Z3JlZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Mzc1ODQsImV4cCI6MjA2NzIxMzU4NH0.IB-Sq5B4ciyaM8C1KHYtKf9A2oFUlTYXIqzHqUNxCbg"

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
})