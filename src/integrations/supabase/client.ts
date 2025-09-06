import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { mockSupabase, mockData } from '../../services/mockData'

// Original Supabase configuration (deprecated)
const supabaseUrl = "https://jijdxhealttxmugrefte.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppamR4aGVhbHR0eG11Z3JlZnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Mzc1ODQsImV4cCI6MjA2NzIxMzU4NH0.IB-Sq5B4ciyaM8C1KHYtKf9A2oFUlTYXIqzHqUNxCbg"

// Create a mock client that mimics Supabase API
export const supabase = {
  // Mock database operations
  from: (table: string) => ({
    select: (columns: string = '*') => {
      const data = mockData[table as keyof typeof mockData] || [];
      return {
        eq: (column: string, value: any) => Promise.resolve({
          data: data.filter((item: any) => item[column] === value),
          error: null
        }),
        gte: (column: string, value: any) => Promise.resolve({
          data: data.filter((item: any) => new Date(item[column]) >= new Date(value)),
          error: null
        }),
        order: (column: string, options?: { ascending: boolean }) => {
          const sortedData = [...data].sort((a: any, b: any) => {
            const aVal = a[column];
            const bVal = b[column];
            if (options?.ascending === false) {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
          return Promise.resolve({
            data: sortedData,
            error: null
          });
        },
        limit: (count: number) => Promise.resolve({
          data: data.slice(0, count),
          error: null
        }),
        maybeSingle: () => Promise.resolve({
          data: data[0] || null,
          error: null
        }),
        then: (callback: (result: any) => void) => {
          callback({ data, error: null });
        }
      };
    },
    insert: (data: any) => Promise.resolve({
      data: [{ ...data, id: Date.now().toString() }],
      error: null
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({
        data: [data],
        error: null
      })
    }),
    delete: () => ({
      eq: (column: string, value: any) => Promise.resolve({
        data: null,
        error: null
      })
    })
  }),

  // Mock auth operations
  auth: {
    getSession: () => Promise.resolve({
      data: { session: null },
      error: null
    }),
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Mock auth state - no user logged in
      setTimeout(() => callback('SIGNED_OUT', null), 100);
      return {
        data: { subscription: { unsubscribe: () => {} } }
      };
    },
    signInWithPassword: (credentials: any) => Promise.resolve({
      data: { user: null, session: null },
      error: { message: 'Authentication disabled for public access' }
    }),
    signUp: (credentials: any) => Promise.resolve({
      data: { user: null, session: null },
      error: { message: 'Authentication disabled for public access' }
    }),
    signOut: () => Promise.resolve({ error: null })
  }
}