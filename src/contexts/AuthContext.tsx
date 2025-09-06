import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  role: 'admin' | 'agent';
  agent_id: string | null;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Mock auth state for public access
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>({
    id: 'mock-profile-id',
    user_id: 'mock-user-id',
    full_name: 'Demo Admin',
    phone: '+91 98765 43210',
    role: 'admin',
    agent_id: 'ADMIN-001',
    is_active: true
  });
  const [loading, setLoading] = useState(false); // No loading for public access

  useEffect(() => {
    // Mock initialization - no real auth needed
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    // Mock sign in - always return success for demo
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    // Mock sign up - always return success for demo
    return { error: null };
  };

  const signOut = async () => {
    // Mock sign out - no action needed
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}