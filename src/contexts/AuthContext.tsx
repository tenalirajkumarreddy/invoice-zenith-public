import { createContext, useContext, useState } from 'react';

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'agent' | 'customer';
}
}

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  // Dummy credentials for open source
  const dummyUsers = [
    {
      email: 'admin@demo.com',
      password: 'admin123',
      full_name: 'Demo Admin',
      role: 'admin',
      id: 'admin-1',
    },
    {
      email: 'agent@demo.com',
      password: 'agent123',
      full_name: 'Demo Agent',
      role: 'agent',
      id: 'agent-1',
    },
    {
      email: 'customer@demo.com',
      password: 'customer123',
      full_name: 'Demo Customer',
      role: 'customer',
      id: 'customer-1',
    },
  ];

  const signIn = async (email: string, password: string) => {
    const user = dummyUsers.find(
      (u) => u.email === email && u.password === password
    );
    if (user) {
      setProfile({ id: user.id, full_name: user.full_name, role: user.role as Profile['role'] });
      return { error: null };
    } else {
      setProfile(null);
      return { error: 'Invalid credentials' };
    }
  };

  const signOut = async () => {
    setProfile(null);
  };

  const value = {
    profile,
    loading,
    signIn,
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